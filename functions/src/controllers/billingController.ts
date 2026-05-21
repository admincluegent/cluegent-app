import { FieldValue } from "firebase-admin/firestore";
import { type Request, type Response } from "express";
import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { DEFAULT_PLAN_ID, PLAN_CONFIGS, type PlanId } from "../config/plans.js";
import {
  cancelRazorpayTestSubscription,
  createRazorpayOrder,
  createRazorpayTestSubscription,
  parseAllowedEmails,
  resolvePlanFromRazorpayPlanId,
  resolveRazorpayPlanId,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayOrderSignature,
  verifyRazorpayWebhookSignature,
  type PaidPlanId,
  type RazorpayCurrency,
  type RazorpayOrderEntity,
  type RazorpaySubscriptionEntity,
  type RazorpayLivePlanConfig,
  type RazorpayProviderMode,
  type RazorpayTestPlanConfig,
} from "../services/razorpayTestService.js";
import { db, requireAuth, type AuthenticatedUser } from "../utils/auth.js";
import {
  buildSubscriptionDoc,
  buildUsageBaseline,
  getUserRefs,
  materializeSubscription,
  materializeUsage,
  type BillingInterval,
} from "../utils/usage.js";
import { ensureUsageDocuments } from "./usageController.js";

interface CreateRazorpayTestSubscriptionData {
  planId?: PlanId;
  interval?: BillingInterval;
}

interface CreateRazorpayLiveSubscriptionData extends CreateRazorpayTestSubscriptionData {
  currency?: RazorpayCurrency;
}

interface VerifyRazorpayTestPaymentData {
  razorpay_payment_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature?: string;
}

interface VerifyRazorpayLiveTestOrderPaymentData {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

interface RazorpayTestEnv {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  allowedEmails: string;
  plans: RazorpayTestPlanConfig;
}

interface RazorpayLiveEnv {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  plans: RazorpayLivePlanConfig;
}

interface RazorpayWebhookEnvelope {
  event?: string;
  payload?: {
    subscription?: {
      entity?: RazorpaySubscriptionEntity;
    };
    payment?: {
      entity?: Record<string, unknown>;
    };
  };
}

const TEST_EVENTS_COLLECTION = "billing_razorpay_test_events";
const TEST_CUSTOMERS_COLLECTION = "billing_razorpay_test_customers";
const TEST_SUBSCRIPTIONS_COLLECTION = "billing_razorpay_test_subscriptions";
const LIVE_EVENTS_COLLECTION = "billing_razorpay_live_events";
const LIVE_CUSTOMERS_COLLECTION = "billing_razorpay_live_customers";
const LIVE_SUBSCRIPTIONS_COLLECTION = "billing_razorpay_live_subscriptions";
const LIVE_ORDERS_COLLECTION = "billing_razorpay_live_orders";
const LIVE_TEST_PLAN_ID = "livetest";
const LIVE_TEST_DURATION_MS = 30 * 60 * 1000;
const LIVE_MONTH_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const LIVE_YEAR_DURATION_MS = 365 * 24 * 60 * 60 * 1000;
const LIVE_ORDER_CURRENCY: RazorpayCurrency = "INR";
const LIVE_ORDER_PRICES_INR_PAISE: Record<
  PaidPlanId,
  Partial<Record<BillingInterval, number>>
> = {
  livetest: {
    month: 500,
  },
  pro: {
    month: 349_900,
    year: 3_499_000,
  },
  power: {
    month: 649_900,
    year: 6_499_000,
  },
};

export async function createRazorpayTestSubscriptionController(
  request: CallableRequest<CreateRazorpayTestSubscriptionData>,
  env: Pick<RazorpayTestEnv, "keyId" | "keySecret" | "allowedEmails" | "plans">
) {
  const authUser = requireAuth(request);
  assertTestBillingUser(authUser, env.allowedEmails);

  const planId = request.data?.planId;
  const interval = request.data?.interval;

  const isSupportedPlan =
    (planId === "pro" && (interval === "month" || interval === "year")) ||
    (planId === "power" && (interval === "month" || interval === "year"));

  if (!isSupportedPlan) {
    throw new HttpsError(
      "invalid-argument",
      "Razorpay test checkout currently supports Pro and Power monthly/yearly plans."
    );
  }

  await ensureUsageDocuments(authUser.uid, authUser);

  const razorpayPlanId = resolveRazorpayPlanId(planId, interval, env.plans);
  assertConfiguredPlanId(planId, interval, razorpayPlanId);

  const subscription = await createRazorpayTestSubscription({
    keyId: env.keyId,
    keySecret: env.keySecret,
    planId: razorpayPlanId,
    totalCount: interval === "month" ? 120 : 10,
    uid: authUser.uid,
    email: authUser.email,
    displayName: authUser.displayName,
    appPlanId: planId,
    interval,
    providerMode: "test",
    currency: "INR",
  });

  await writePendingRazorpaySubscription({
    providerMode: "test",
    uid: authUser.uid,
    email: authUser.email,
    displayName: authUser.displayName,
    subscriptionId: subscription.id ?? "",
    razorpayPlanId,
    planId,
    interval,
  });

  return {
    success: true,
    data: {
      providerMode: "test" as const,
      keyId: env.keyId,
      subscriptionId: subscription.id,
      planId,
      interval,
      name: "Cluegent",
      description: `Cluegent ${PLAN_CONFIGS[planId].label} ${
        interval === "month" ? "Monthly" : "Yearly"
      }`,
      prefill: {
        name: authUser.displayName,
        email: authUser.email,
      },
      notes: {
        firebase_uid: authUser.uid,
        cluegent_plan_id: planId,
        cluegent_billing_interval: interval,
      },
    },
  };
}

export async function verifyRazorpayTestPaymentController(
  request: CallableRequest<VerifyRazorpayTestPaymentData>,
  env: Pick<RazorpayTestEnv, "keySecret">
) {
  const authUser = requireAuth(request);
  const paymentId = request.data?.razorpay_payment_id?.trim();
  const subscriptionId = request.data?.razorpay_subscription_id?.trim();
  const signature = request.data?.razorpay_signature?.trim();

  if (!paymentId || !subscriptionId || !signature) {
    throw new HttpsError(
      "invalid-argument",
      "Missing Razorpay payment verification fields."
    );
  }

  const isValid = verifyRazorpayCheckoutSignature({
    paymentId,
    subscriptionId,
    signature,
    keySecret: env.keySecret,
  });

  if (!isValid) {
    throw new HttpsError(
      "permission-denied",
      "Razorpay payment signature verification failed."
    );
  }

  const subscriptionRef = db
    .collection(TEST_SUBSCRIPTIONS_COLLECTION)
    .doc(subscriptionId);
  const subscriptionSnap = await subscriptionRef.get();
  const subscriptionData = subscriptionSnap.data();

  if (!subscriptionSnap.exists || subscriptionData?.uid !== authUser.uid) {
    throw new HttpsError(
      "permission-denied",
      "This Razorpay subscription is not linked to the signed-in user."
    );
  }

  const mappedPlan = {
    planId: subscriptionData.planId as PaidPlanId,
    interval: subscriptionData.billingInterval as BillingInterval,
  };

  if (!isSupportedPaidPlan(mappedPlan.planId, mappedPlan.interval)) {
    throw new HttpsError("failed-precondition", "Unknown pending Razorpay plan.");
  }

  await applyRazorpayEntitlement({
    providerMode: "test",
    uid: authUser.uid,
    email: authUser.email,
    eventId: paymentId,
    eventType: "checkout.verified",
    subscriptionId,
    customerId: readString(subscriptionData.customerId),
    mappedPlan,
    razorpayStatus: "active",
    providerPayload: {
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId,
    },
  });

  return {
    success: true,
    data: {
      verified: true,
      subscriptionId,
      paymentId,
    },
  };
}

export async function cancelRazorpayTestSubscriptionController(
  request: CallableRequest<unknown>,
  env: Pick<RazorpayTestEnv, "keyId" | "keySecret">
) {
  const authUser = requireAuth(request);
  const refs = getUserRefs(authUser.uid);
  const userSubscriptionRef = db.doc(refs.subscriptionPath);
  const currentSubscriptionSnap = await userSubscriptionRef.get();
  const currentSubscription = currentSubscriptionSnap.data();
  const subscriptionId = readString(currentSubscription?.subscriptionId);
  const provider = readString(currentSubscription?.provider);
  const providerMode = readString(currentSubscription?.providerMode);
  const currentPlan = readString(currentSubscription?.plan);
  const billingInterval = readString(currentSubscription?.billingInterval);

  if (
    provider !== "razorpay" ||
    providerMode !== "test" ||
    currentPlan === DEFAULT_PLAN_ID ||
    !subscriptionId
  ) {
    throw new HttpsError(
      "failed-precondition",
      "There is no active Razorpay test subscription to cancel."
    );
  }

  const mappedPlan = {
    planId: currentPlan as PaidPlanId,
    interval: billingInterval as BillingInterval,
  };

  if (!isSupportedPaidPlan(mappedPlan.planId, mappedPlan.interval)) {
    throw new HttpsError("failed-precondition", "Unknown Razorpay subscription plan.");
  }

  const cancelledSubscription = await cancelRazorpayTestSubscription({
    keyId: env.keyId,
    keySecret: env.keySecret,
    subscriptionId,
    cancelAtCycleEnd: false,
    providerMode: "test",
  });

  const eventId = `manual_cancel:${subscriptionId}`;

  await applyRazorpayEntitlement({
    providerMode: "test",
    uid: authUser.uid,
    email: authUser.email,
    eventId,
    eventType: "subscription.cancelled",
    subscriptionId,
    customerId:
      readString(cancelledSubscription.customer_id) ??
      readString(currentSubscription?.customerId),
    mappedPlan,
    razorpayStatus: cancelledSubscription.status ?? "cancelled",
    effectivePlan: DEFAULT_PLAN_ID,
    localStatus: "canceled",
    providerPayload: cancelledSubscription,
  });

  await db.collection(TEST_EVENTS_COLLECTION).doc(eventId).set(
    {
      eventId,
      eventType: "subscription.cancelled",
      source: "manual_app_cancel",
      uid: authUser.uid,
      subscriptionId,
      customerId:
        readString(cancelledSubscription.customer_id) ??
        readString(currentSubscription?.customerId),
      mappedPlanId: mappedPlan.planId,
      mappedInterval: mappedPlan.interval,
      effectivePlanId: DEFAULT_PLAN_ID,
      processed: true,
      processedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    success: true,
    data: {
      cancelled: true,
      subscriptionId,
      planId: DEFAULT_PLAN_ID,
    },
  };
}

export async function createRazorpayLiveTestOrderController(
  request: CallableRequest<unknown>,
  env: Pick<RazorpayLiveEnv, "keyId" | "keySecret">
) {
  const authUser = requireAuth(request);
  return createRazorpayLiveOrderForPlan({
    authUser,
    env,
    planId: LIVE_TEST_PLAN_ID,
    interval: "month",
    currency: LIVE_ORDER_CURRENCY,
  });
}

export async function createRazorpayLiveOrderController(
  request: CallableRequest<CreateRazorpayLiveSubscriptionData>,
  env: Pick<RazorpayLiveEnv, "keyId" | "keySecret">
) {
  const authUser = requireAuth(request);
  const planId = request.data?.planId;
  const interval = request.data?.interval;
  const currency = request.data?.currency ?? LIVE_ORDER_CURRENCY;

  if (!isSupportedPaidPlan(planId as PaidPlanId, interval as BillingInterval)) {
    throw new HttpsError(
      "invalid-argument",
      "Choose a valid Pro or Power monthly/yearly plan."
    );
  }

  if (planId === LIVE_TEST_PLAN_ID) {
    throw new HttpsError(
      "invalid-argument",
      "Use the Live Test checkout for the Live Test plan."
    );
  }

  if (currency !== LIVE_ORDER_CURRENCY) {
    throw new HttpsError(
      "failed-precondition",
      "USD checkout is disabled until Razorpay approves international payments."
    );
  }

  return createRazorpayLiveOrderForPlan({
    authUser,
    env,
    planId: planId as PaidPlanId,
    interval: interval as BillingInterval,
    currency,
  });
}

async function createRazorpayLiveOrderForPlan(input: {
  authUser: AuthenticatedUser;
  env: Pick<RazorpayLiveEnv, "keyId" | "keySecret">;
  planId: PaidPlanId;
  interval: BillingInterval;
  currency: RazorpayCurrency;
}) {
  const pricing = getLiveOrderPricing(input.planId, input.interval, input.currency);
  if (!pricing) {
    throw new HttpsError(
      "failed-precondition",
      "This live Razorpay plan is not configured."
    );
  }

  const authUser = input.authUser;
  await ensureUsageDocuments(authUser.uid, authUser);

  const receipt = `${input.planId}_${input.interval}_${authUser.uid.slice(0, 12)}_${Date.now()}`;
  const order = await createRazorpayOrder({
    keyId: input.env.keyId,
    keySecret: input.env.keySecret,
    amount: pricing.amount,
    currency: pricing.currency,
    receipt,
    providerMode: "live",
    notes: {
      firebase_uid: authUser.uid,
      firebase_email: authUser.email,
      cluegent_plan_id: input.planId,
      cluegent_billing_interval: input.interval,
      cluegent_currency: pricing.currency,
    },
  });

  await db.collection(LIVE_ORDERS_COLLECTION).doc(order.id ?? "").set(
    {
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName,
      provider: "razorpay",
      providerMode: "live",
      orderId: order.id,
      amount: pricing.amount,
      currency: pricing.currency,
      receipt,
      planId: input.planId,
      billingInterval: input.interval,
      status: order.status ?? "created",
      paymentId: null,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    success: true,
    data: {
      providerMode: "live" as const,
      keyId: input.env.keyId,
      orderId: order.id,
      amount: pricing.amount,
      currency: pricing.currency,
      planId: input.planId,
      interval: input.interval,
      name: "Cluegent",
      description: pricing.description,
      prefill: {
        name: authUser.displayName,
        email: authUser.email,
      },
      notes: {
        firebase_uid: authUser.uid,
        cluegent_plan_id: input.planId,
        cluegent_billing_interval: input.interval,
        cluegent_currency: pricing.currency,
      },
    },
  };
}

export async function verifyRazorpayLiveTestOrderPaymentController(
  request: CallableRequest<VerifyRazorpayLiveTestOrderPaymentData>,
  env: Pick<RazorpayLiveEnv, "keySecret">
) {
  return verifyRazorpayLiveOrderPaymentForPlan(request, env);
}

export async function verifyRazorpayLiveOrderPaymentController(
  request: CallableRequest<VerifyRazorpayLiveTestOrderPaymentData>,
  env: Pick<RazorpayLiveEnv, "keySecret">
) {
  return verifyRazorpayLiveOrderPaymentForPlan(request, env);
}

async function verifyRazorpayLiveOrderPaymentForPlan(
  request: CallableRequest<VerifyRazorpayLiveTestOrderPaymentData>,
  env: Pick<RazorpayLiveEnv, "keySecret">
) {
  const authUser = requireAuth(request);
  const paymentId = request.data?.razorpay_payment_id?.trim();
  const orderId = request.data?.razorpay_order_id?.trim();
  const signature = request.data?.razorpay_signature?.trim();

  if (!paymentId || !orderId || !signature) {
    throw new HttpsError(
      "invalid-argument",
      "Missing Razorpay order payment verification fields."
    );
  }

  const isValid = verifyRazorpayOrderSignature({
    orderId,
    paymentId,
    signature,
    keySecret: env.keySecret,
  });

  if (!isValid) {
    throw new HttpsError(
      "permission-denied",
      "Razorpay live test order signature verification failed."
    );
  }

  const orderRef = db.collection(LIVE_ORDERS_COLLECTION).doc(orderId);
  const orderSnap = await orderRef.get();
  const orderData = orderSnap.data();

  if (!orderSnap.exists || orderData?.uid !== authUser.uid) {
    throw new HttpsError(
      "permission-denied",
      "This Razorpay order is not linked to the signed-in user."
    );
  }

  const mappedPlan = {
    planId: orderData.planId as PaidPlanId,
    interval: orderData.billingInterval as BillingInterval,
  };
  const expectedPricing = getLiveOrderPricing(
    mappedPlan.planId,
    mappedPlan.interval,
    readRazorpayCurrency(orderData.currency)
  );

  if (!expectedPricing || orderData.amount !== expectedPricing.amount) {
    throw new HttpsError(
      "failed-precondition",
      "This Razorpay order does not match a supported Cluegent plan."
    );
  }

  if (orderData.status === "paid") {
    if (orderData.paymentId !== paymentId) {
      throw new HttpsError(
        "permission-denied",
        "This Razorpay order was already paid with a different payment."
      );
    }

    return {
      success: true,
      data: {
        verified: true,
        orderId,
        paymentId,
      },
    };
  }

  await applyRazorpayOrderEntitlement({
    uid: authUser.uid,
    email: authUser.email,
    orderId,
    paymentId,
    mappedPlan,
    amount: expectedPricing.amount,
    currency: expectedPricing.currency,
    providerPayload: {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
    },
  });

  return {
    success: true,
    data: {
      verified: true,
      orderId,
      paymentId,
    },
  };
}

export async function createRazorpayLiveSubscriptionController(
  request: CallableRequest<CreateRazorpayLiveSubscriptionData>,
  env: Pick<RazorpayLiveEnv, "keyId" | "keySecret" | "plans">
) {
  const authUser = requireAuth(request);
  const planId = request.data?.planId;
  const interval = request.data?.interval;
  const currency = request.data?.currency === "USD" ? "USD" : "INR";

  const isSupportedPlan =
    (planId === "pro" && (interval === "month" || interval === "year")) ||
    (planId === "power" && (interval === "month" || interval === "year"));

  if (!isSupportedPlan) {
    throw new HttpsError(
      "invalid-argument",
      "Razorpay live subscription checkout supports Pro and Power monthly/yearly plans."
    );
  }

  await ensureUsageDocuments(authUser.uid, authUser);

  if (currency === "USD" && !env.plans.usd) {
    throw new HttpsError(
      "failed-precondition",
      "Razorpay live USD plans are not configured."
    );
  }

  const plansForCurrency = currency === "USD" ? env.plans.usd! : env.plans.inr;
  const razorpayPlanId = resolveRazorpayPlanId(planId, interval, plansForCurrency);
  assertConfiguredPlanId(planId, interval, razorpayPlanId, "live", currency);

  const subscription = await createRazorpayTestSubscription({
    keyId: env.keyId,
    keySecret: env.keySecret,
    planId: razorpayPlanId,
    totalCount: interval === "month" ? 120 : 10,
    uid: authUser.uid,
    email: authUser.email,
    displayName: authUser.displayName,
    appPlanId: planId,
    interval,
    providerMode: "live",
    currency,
  });

  await writePendingRazorpaySubscription({
    providerMode: "live",
    uid: authUser.uid,
    email: authUser.email,
    displayName: authUser.displayName,
    subscriptionId: subscription.id ?? "",
    razorpayPlanId,
    planId,
    interval,
    currency,
  });

  return {
    success: true,
    data: {
      providerMode: "live" as const,
      keyId: env.keyId,
      subscriptionId: subscription.id,
      planId,
      interval,
      currency,
      name: "Cluegent",
      description: `Cluegent ${PLAN_CONFIGS[planId].label} ${
        interval === "month" ? "Monthly" : "Yearly"
      }`,
      prefill: {
        name: authUser.displayName,
        email: authUser.email,
      },
      notes: {
        firebase_uid: authUser.uid,
        cluegent_plan_id: planId,
        cluegent_billing_interval: interval,
        cluegent_currency: currency,
      },
    },
  };
}

export async function verifyRazorpayLivePaymentController(
  request: CallableRequest<VerifyRazorpayTestPaymentData>,
  env: Pick<RazorpayLiveEnv, "keySecret">
) {
  const authUser = requireAuth(request);
  const paymentId = request.data?.razorpay_payment_id?.trim();
  const subscriptionId = request.data?.razorpay_subscription_id?.trim();
  const signature = request.data?.razorpay_signature?.trim();

  if (!paymentId || !subscriptionId || !signature) {
    throw new HttpsError(
      "invalid-argument",
      "Missing Razorpay payment verification fields."
    );
  }

  const isValid = verifyRazorpayCheckoutSignature({
    paymentId,
    subscriptionId,
    signature,
    keySecret: env.keySecret,
  });

  if (!isValid) {
    throw new HttpsError(
      "permission-denied",
      "Razorpay live payment signature verification failed."
    );
  }

  const subscriptionRef = db
    .collection(LIVE_SUBSCRIPTIONS_COLLECTION)
    .doc(subscriptionId);
  const subscriptionSnap = await subscriptionRef.get();
  const subscriptionData = subscriptionSnap.data();

  if (!subscriptionSnap.exists || subscriptionData?.uid !== authUser.uid) {
    throw new HttpsError(
      "permission-denied",
      "This Razorpay subscription is not linked to the signed-in user."
    );
  }

  const mappedPlan = {
    planId: subscriptionData.planId as PaidPlanId,
    interval: subscriptionData.billingInterval as BillingInterval,
  };

  if (!isSupportedPaidPlan(mappedPlan.planId, mappedPlan.interval)) {
    throw new HttpsError("failed-precondition", "Unknown pending Razorpay plan.");
  }

  await applyRazorpayEntitlement({
    providerMode: "live",
    uid: authUser.uid,
    email: authUser.email,
    eventId: paymentId,
    eventType: "checkout.verified",
    subscriptionId,
    customerId: readString(subscriptionData.customerId),
    mappedPlan,
    razorpayStatus: "active",
    providerPayload: {
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId,
    },
  });

  return {
    success: true,
    data: {
      verified: true,
      subscriptionId,
      paymentId,
    },
  };
}

export async function cancelRazorpayLiveSubscriptionController(
  request: CallableRequest<unknown>,
  env: Pick<RazorpayLiveEnv, "keyId" | "keySecret">
) {
  const authUser = requireAuth(request);
  const refs = getUserRefs(authUser.uid);
  const userSubscriptionRef = db.doc(refs.subscriptionPath);
  const currentSubscriptionSnap = await userSubscriptionRef.get();
  const currentSubscription = currentSubscriptionSnap.data();
  const subscriptionId = readString(currentSubscription?.subscriptionId);
  const provider = readString(currentSubscription?.provider);
  const providerMode = readString(currentSubscription?.providerMode);
  const currentPlan = readString(currentSubscription?.plan);
  const billingInterval = readString(currentSubscription?.billingInterval);

  if (
    provider !== "razorpay" ||
    providerMode !== "live" ||
    currentPlan === DEFAULT_PLAN_ID
  ) {
    throw new HttpsError(
      "failed-precondition",
      "There is no active Razorpay live subscription to cancel."
    );
  }

  if (currentPlan === LIVE_TEST_PLAN_ID) {
    await moveUserToFreePlan({
      uid: authUser.uid,
      providerMode: "live",
      customerId: readString(currentSubscription?.customerId),
      subscriptionId,
      startedAt: readString(currentSubscription?.startedAt),
      expiresAt: readString(currentSubscription?.expiresAt),
      lastEventId: "manual_live_test_cancel",
    });

    return {
      success: true,
      data: {
        cancelled: true,
        subscriptionId: subscriptionId ?? LIVE_TEST_PLAN_ID,
        planId: DEFAULT_PLAN_ID,
      },
    };
  }

  if (!subscriptionId && readString(currentSubscription?.orderId)) {
    await moveUserToFreePlan({
      uid: authUser.uid,
      providerMode: "live",
      customerId: readString(currentSubscription?.customerId),
      subscriptionId: null,
      startedAt: readString(currentSubscription?.startedAt),
      expiresAt: readString(currentSubscription?.expiresAt),
      lastEventId: "manual_live_order_cancel",
    });

    return {
      success: true,
      data: {
        cancelled: true,
        subscriptionId: readString(currentSubscription?.orderId) ?? currentPlan,
        planId: DEFAULT_PLAN_ID,
      },
    };
  }

  if (!subscriptionId) {
    throw new HttpsError(
      "failed-precondition",
      "There is no active Razorpay live subscription to cancel."
    );
  }

  const mappedPlan = {
    planId: currentPlan as PaidPlanId,
    interval: billingInterval as BillingInterval,
  };

  if (!isSupportedPaidPlan(mappedPlan.planId, mappedPlan.interval)) {
    throw new HttpsError("failed-precondition", "Unknown Razorpay subscription plan.");
  }

  const cancelledSubscription = await cancelRazorpayTestSubscription({
    keyId: env.keyId,
    keySecret: env.keySecret,
    subscriptionId,
    cancelAtCycleEnd: false,
    providerMode: "live",
  });

  const eventId = `manual_live_cancel:${subscriptionId}`;

  await applyRazorpayEntitlement({
    providerMode: "live",
    uid: authUser.uid,
    email: authUser.email,
    eventId,
    eventType: "subscription.cancelled",
    subscriptionId,
    customerId:
      readString(cancelledSubscription.customer_id) ??
      readString(currentSubscription?.customerId),
    mappedPlan,
    razorpayStatus: cancelledSubscription.status ?? "cancelled",
    effectivePlan: DEFAULT_PLAN_ID,
    localStatus: "canceled",
    providerPayload: cancelledSubscription,
  });

  await db.collection(LIVE_EVENTS_COLLECTION).doc(eventId).set(
    {
      eventId,
      eventType: "subscription.cancelled",
      source: "manual_app_cancel",
      uid: authUser.uid,
      subscriptionId,
      customerId:
        readString(cancelledSubscription.customer_id) ??
        readString(currentSubscription?.customerId),
      mappedPlanId: mappedPlan.planId,
      mappedInterval: mappedPlan.interval,
      effectivePlanId: DEFAULT_PLAN_ID,
      processed: true,
      processedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    success: true,
    data: {
      cancelled: true,
      subscriptionId,
      planId: DEFAULT_PLAN_ID,
    },
  };
}

export async function resetTestSubscriptionController(
  request: CallableRequest<unknown>
) {
  const authUser = requireAuth(request);
  const { monthKey } = await ensureUsageDocuments(authUser.uid, authUser);
  const refs = getUserRefs(authUser.uid, monthKey);
  const subscriptionRef = db.doc(refs.subscriptionPath);
  const freeSubscription = buildSubscriptionDoc(DEFAULT_PLAN_ID, "active");

  await subscriptionRef.set(
    {
      ...freeSubscription,
      provider: "razorpay",
      providerMode: "test",
      billingInterval: null,
      customerId: null,
      subscriptionId: null,
      startedAt: null,
      renewsAt: null,
      expiresAt: null,
      cancelAtPeriodEnd: false,
      lastWebhookEventId: "manual_reset",
      isTestEntitlement: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    success: true,
    data: {
      reset: true,
      planId: DEFAULT_PLAN_ID,
    },
  };
}

export async function razorpayTestWebhookController(
  request: Request,
  response: Response,
  env: Pick<RazorpayTestEnv, "webhookSecret" | "plans">
) {
  if (request.method !== "POST") {
    response.status(405).json({
      success: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Use POST for the Razorpay test webhook.",
    });
    return;
  }

  const rawBody = getRawRequestBody(request);
  const signature = request.header("x-razorpay-signature")?.trim() ?? "";
  const eventId = request.header("x-razorpay-event-id")?.trim() ?? "";

  if (!rawBody || !signature || !eventId) {
    response.status(400).json({
      success: false,
      code: "MISSING_WEBHOOK_DATA",
      message: "Razorpay webhook body, signature, or event id is missing.",
    });
    return;
  }

  const isValidSignature = verifyRazorpayWebhookSignature({
    rawBody,
    signature,
    webhookSecret: env.webhookSecret,
  });

  if (!isValidSignature) {
    response.status(401).json({
      success: false,
      code: "INVALID_SIGNATURE",
      message: "Razorpay webhook signature verification failed.",
    });
    return;
  }

  let payload: RazorpayWebhookEnvelope;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookEnvelope;
  } catch (error) {
    response.status(400).json({
      success: false,
      code: "INVALID_JSON",
      message: error instanceof Error ? error.message : "Invalid JSON payload.",
    });
    return;
  }

  try {
    const duplicate = await persistRazorpayWebhookEvent(
      payload,
      eventId,
      rawBody,
      env.plans,
      "test"
    );
    response.status(200).json({ success: true, duplicate });
  } catch (error) {
    console.error("[razorpayTestWebhook] Unexpected error", error);
    response.status(500).json({
      success: false,
      code: "INTERNAL",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function razorpayLiveWebhookController(
  request: Request,
  response: Response,
  env: Pick<RazorpayLiveEnv, "webhookSecret" | "plans">
) {
  if (request.method !== "POST") {
    response.status(405).json({
      success: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Use POST for the Razorpay live webhook.",
    });
    return;
  }

  const rawBody = getRawRequestBody(request);
  const signature = request.header("x-razorpay-signature")?.trim() ?? "";
  const eventId = request.header("x-razorpay-event-id")?.trim() ?? "";

  if (!rawBody || !signature || !eventId) {
    response.status(400).json({
      success: false,
      code: "MISSING_WEBHOOK_DATA",
      message: "Razorpay webhook body, signature, or event id is missing.",
    });
    return;
  }

  const isValidSignature = verifyRazorpayWebhookSignature({
    rawBody,
    signature,
    webhookSecret: env.webhookSecret,
  });

  if (!isValidSignature) {
    response.status(401).json({
      success: false,
      code: "INVALID_SIGNATURE",
      message: "Razorpay webhook signature verification failed.",
    });
    return;
  }

  let payload: RazorpayWebhookEnvelope;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookEnvelope;
  } catch (error) {
    response.status(400).json({
      success: false,
      code: "INVALID_JSON",
      message: error instanceof Error ? error.message : "Invalid JSON payload.",
    });
    return;
  }

  try {
    const duplicate = await persistRazorpayWebhookEvent(
      payload,
      eventId,
      rawBody,
      env.plans.inr,
      "live",
      env.plans.usd
    );
    response.status(200).json({ success: true, duplicate });
  } catch (error) {
    console.error("[razorpayLiveWebhook] Unexpected error", error);
    response.status(500).json({
      success: false,
      code: "INTERNAL",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function persistRazorpayWebhookEvent(
  payload: RazorpayWebhookEnvelope,
  eventId: string,
  rawBody: string,
  plans: RazorpayTestPlanConfig,
  providerMode: RazorpayProviderMode,
  alternatePlans?: RazorpayTestPlanConfig
) {
  const collections = getRazorpayCollections(providerMode);
  const eventRef = db.collection(collections.events).doc(eventId);
  const existingEvent = await eventRef.get();
  if (existingEvent.exists) {
    return true;
  }

  const eventType = typeof payload.event === "string" ? payload.event : "unknown";
  const subscription = payload.payload?.subscription?.entity ?? {};
  const subscriptionId = readString(subscription.id);
  const razorpayPlanId = readString(subscription.plan_id);
  const mappedPlan = razorpayPlanId
    ? resolvePlanFromRazorpayPlanId(razorpayPlanId, plans) ??
      (alternatePlans
        ? resolvePlanFromRazorpayPlanId(razorpayPlanId, alternatePlans)
        : null)
    : null;
  const priorSubscriptionSnap = subscriptionId
    ? await db.collection(collections.subscriptions).doc(subscriptionId).get()
    : null;
  const priorSubscription = priorSubscriptionSnap?.data();
  const notes = subscription.notes ?? {};
  const uid =
    readString(notes.firebase_uid) ??
    readString(priorSubscription?.uid);
  const customerId =
    readString(subscription.customer_id) ??
    readString(priorSubscription?.customerId);
  const email =
    readString(notes.firebase_email) ??
    readString(priorSubscription?.email);

  await eventRef.set({
    eventId,
    eventType,
    rawBody,
    payload,
    uid: uid ?? null,
    subscriptionId: subscriptionId ?? null,
    customerId: customerId ?? null,
    razorpayPlanId: razorpayPlanId ?? null,
    mappedPlanId: mappedPlan?.planId ?? null,
    mappedInterval: mappedPlan?.interval ?? null,
    processed: false,
    processedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (!subscriptionId || !uid || !mappedPlan) {
    await eventRef.set(
      {
        rejectionReason: buildRejectionReason({
          hasSubscriptionId: Boolean(subscriptionId),
          hasUid: Boolean(uid),
          hasMappedPlan: Boolean(mappedPlan),
        }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return false;
  }

  const effectivePlan = shouldGrantPaidEntitlement(eventType, subscription.status)
    ? mappedPlan.planId
    : DEFAULT_PLAN_ID;
  const localStatus = mapRazorpayStatusToLocalStatus(subscription.status, effectivePlan);

  await applyRazorpayEntitlement({
    providerMode,
    uid,
    email,
    eventId,
    eventType,
    subscriptionId,
    customerId,
    mappedPlan,
    razorpayStatus: subscription.status ?? "unknown",
    effectivePlan,
    localStatus,
    providerPayload: subscription,
  });

  await eventRef.set(
    {
      processed: true,
      rejectionReason: null,
      effectivePlanId: effectivePlan,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return false;
}

async function writePendingRazorpaySubscription(input: {
  providerMode: RazorpayProviderMode;
  uid: string;
  email: string;
  displayName: string;
  subscriptionId: string;
  razorpayPlanId: string;
  planId: PaidPlanId;
  interval: BillingInterval;
  currency?: RazorpayCurrency;
}) {
  const collections = getRazorpayCollections(input.providerMode);
  const customerRef = db.collection(collections.customers).doc(input.uid);
  const subscriptionRef = db
    .collection(collections.subscriptions)
    .doc(input.subscriptionId);

  await db.runTransaction(async (transaction) => {
    transaction.set(
      customerRef,
      {
        uid: input.uid,
        email: input.email,
        displayName: input.displayName,
        provider: "razorpay",
        providerMode: input.providerMode,
        isInternalTester: input.providerMode === "test",
        lastSubscriptionId: input.subscriptionId,
        lastRequestedPlanId: input.planId,
        lastRequestedInterval: input.interval,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      subscriptionRef,
      {
        uid: input.uid,
        email: input.email,
        provider: "razorpay",
        providerMode: input.providerMode,
        razorpayPlanId: input.razorpayPlanId,
        currency: input.currency ?? "INR",
        planId: input.planId,
        effectivePlanId: DEFAULT_PLAN_ID,
        billingInterval: input.interval,
        razorpayStatus: "created",
        subscriptionId: input.subscriptionId,
        customerId: null,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

async function applyRazorpayEntitlement(input: {
  providerMode: RazorpayProviderMode;
  uid: string;
  email: string | null;
  eventId: string;
  eventType: string;
  subscriptionId: string;
  customerId: string | null;
  mappedPlan: { planId: PaidPlanId; interval: BillingInterval };
  razorpayStatus: string;
  effectivePlan?: PlanId;
  localStatus?: ReturnType<typeof mapRazorpayStatusToLocalStatus>;
  providerPayload: Record<string, unknown> | RazorpaySubscriptionEntity;
}) {
  const effectivePlan = input.effectivePlan ?? input.mappedPlan.planId;
  const localStatus =
    input.localStatus ?? mapRazorpayStatusToLocalStatus(input.razorpayStatus, effectivePlan);
  const planConfig = PLAN_CONFIGS[effectivePlan];
  const refs = getUserRefs(input.uid);
  const collections = getRazorpayCollections(input.providerMode);
  const userSubscriptionRef = db.doc(refs.subscriptionPath);
  const usageRef = db.doc(refs.usagePath);
  const customerRef = db.collection(collections.customers).doc(input.uid);
  const subscriptionRef = db
    .collection(collections.subscriptions)
    .doc(input.subscriptionId);
  const payload = input.providerPayload;
  const liveTestExpiry = getLiveTestExpiry(input.mappedPlan.planId, effectivePlan);
  const startedAt =
    liveTestExpiry?.startedAt ??
    timestampSecondsToIso(readNumber(payload.current_start ?? payload.start_at));
  const renewsAt = liveTestExpiry
    ? null
    : timestampSecondsToIso(readNumber(payload.current_end ?? payload.charge_at));
  const expiresAt =
    liveTestExpiry?.expiresAt ??
    timestampSecondsToIso(readNumber(payload.end_at ?? payload.ended_at));
  const currentMonthKey = refs.usagePath.split("/").pop();

  await db.runTransaction(async (transaction) => {
    const [currentSubscriptionSnap, currentUsageSnap] = await Promise.all([
      transaction.get(userSubscriptionRef),
      transaction.get(usageRef),
    ]);
    const currentSubscription = materializeSubscription(
      currentSubscriptionSnap.data() as ReturnType<typeof materializeSubscription>
    );
    const currentUsage = materializeUsage(
      currentUsageSnap.data() as ReturnType<typeof materializeUsage>,
      currentMonthKey
    );
    const shouldResetUsageBaseline =
      effectivePlan !== DEFAULT_PLAN_ID &&
      localStatus === "active" &&
      (currentSubscription.plan !== effectivePlan ||
        currentSubscription.status !== localStatus ||
        currentSubscription.subscriptionId !== input.subscriptionId ||
        currentSubscription.billingInterval !== input.mappedPlan.interval ||
        currentSubscription.startedAt !== startedAt ||
        currentSubscription.renewsAt !== renewsAt ||
        currentSubscription.expiresAt !== expiresAt ||
        currentSubscription.usageBaseline?.monthKey !== currentUsage.monthKey);
    const usageBaseline =
      shouldResetUsageBaseline && effectivePlan !== DEFAULT_PLAN_ID
        ? buildUsageBaseline(currentUsage)
        : effectivePlan === DEFAULT_PLAN_ID
          ? null
          : currentSubscription.usageBaseline;

    transaction.set(
      customerRef,
      {
        uid: input.uid,
        email: input.email,
        provider: "razorpay",
        providerMode: input.providerMode,
        razorpayCustomerId: input.customerId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      subscriptionRef,
      {
        uid: input.uid,
        email: input.email,
        provider: "razorpay",
        providerMode: input.providerMode,
        planId: input.mappedPlan.planId,
        effectivePlanId: effectivePlan,
        billingInterval: input.mappedPlan.interval,
        razorpayStatus: input.razorpayStatus,
        subscriptionId: input.subscriptionId,
        customerId: input.customerId,
        cancelAtPeriodEnd: false,
        startedAt,
        renewsAt,
        expiresAt,
        testEntitlementExpiresAt: null,
        lastWebhookEventId: input.eventId,
        payload,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      userSubscriptionRef,
      {
        plan: planConfig.id,
        status: localStatus,
        promptLimit: planConfig.promptLimit,
        screenshotLimit: planConfig.screenshotLimit,
        sttSecondsLimit: planConfig.sttSecondsLimit,
        provider: "razorpay",
        providerMode: input.providerMode,
        billingInterval: input.mappedPlan.interval,
        customerId: input.customerId,
        subscriptionId: input.subscriptionId,
        startedAt,
        renewsAt,
        expiresAt,
        cancelAtPeriodEnd: false,
        lastWebhookEventId: input.eventId,
        isTestEntitlement: input.providerMode === "test",
        usageBaseline,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

async function applyRazorpayOrderEntitlement(input: {
  uid: string;
  email: string | null;
  orderId: string;
  paymentId: string;
  mappedPlan: { planId: PaidPlanId; interval: BillingInterval };
  amount: number;
  currency: RazorpayCurrency;
  providerPayload: Record<string, unknown> | RazorpayOrderEntity;
}) {
  const planConfig = PLAN_CONFIGS[input.mappedPlan.planId];
  const pricing = getLiveOrderPricing(
    input.mappedPlan.planId,
    input.mappedPlan.interval,
    input.currency
  );
  if (!pricing || pricing.amount !== input.amount) {
    throw new HttpsError(
      "failed-precondition",
      "This Razorpay order does not match a supported Cluegent plan."
    );
  }

  const refs = getUserRefs(input.uid);
  const userSubscriptionRef = db.doc(refs.subscriptionPath);
  const usageRef = db.doc(refs.usagePath);
  const orderRef = db.collection(LIVE_ORDERS_COLLECTION).doc(input.orderId);
  const customerRef = db.collection(LIVE_CUSTOMERS_COLLECTION).doc(input.uid);
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + pricing.durationMs);
  const currentMonthKey = refs.usagePath.split("/").pop();

  await db.runTransaction(async (transaction) => {
    const usageSnap = await transaction.get(usageRef);
    const usageBaseline = buildUsageBaseline(
      materializeUsage(
        usageSnap.data() as ReturnType<typeof materializeUsage>,
        currentMonthKey
      )
    );

    transaction.set(
      customerRef,
      {
        uid: input.uid,
        email: input.email,
        provider: "razorpay",
        providerMode: "live",
        lastOrderId: input.orderId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      orderRef,
      {
        uid: input.uid,
        email: input.email,
        provider: "razorpay",
        providerMode: "live",
        orderId: input.orderId,
        paymentId: input.paymentId,
        planId: input.mappedPlan.planId,
        billingInterval: input.mappedPlan.interval,
        amount: input.amount,
        currency: input.currency,
        status: "paid",
        paidAt: FieldValue.serverTimestamp(),
        payload: input.providerPayload,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      userSubscriptionRef,
      {
        plan: planConfig.id,
        status: "active",
        promptLimit: planConfig.promptLimit,
        screenshotLimit: planConfig.screenshotLimit,
        sttSecondsLimit: planConfig.sttSecondsLimit,
        provider: "razorpay",
        providerMode: "live",
        billingInterval: input.mappedPlan.interval,
        customerId: null,
        subscriptionId: null,
        orderId: input.orderId,
        paymentId: input.paymentId,
        startedAt: startedAt.toISOString(),
        renewsAt: null,
        expiresAt: expiresAt.toISOString(),
        cancelAtPeriodEnd: false,
        lastWebhookEventId: input.paymentId,
        isTestEntitlement: false,
        usageBaseline,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

async function moveUserToFreePlan(input: {
  uid: string;
  providerMode: RazorpayProviderMode;
  customerId: string | null;
  subscriptionId: string | null;
  startedAt: string | null;
  expiresAt: string | null;
  lastEventId: string;
}) {
  const refs = getUserRefs(input.uid);
  const subscriptionRef = db.doc(refs.subscriptionPath);

  await subscriptionRef.set(
    {
      ...buildSubscriptionDoc(DEFAULT_PLAN_ID, "active"),
      provider: "razorpay",
      providerMode: input.providerMode,
      billingInterval: null,
      customerId: input.customerId,
      subscriptionId: input.subscriptionId,
      startedAt: input.startedAt,
      renewsAt: null,
      expiresAt: input.expiresAt,
      cancelAtPeriodEnd: false,
      lastWebhookEventId: input.lastEventId,
      isTestEntitlement: input.providerMode === "test",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

function assertTestBillingUser(user: AuthenticatedUser, allowedEmailsRaw: string) {
  const allowedEmails = parseAllowedEmails(allowedEmailsRaw);
  const normalizedEmail = user.email.trim().toLowerCase();

  if (!normalizedEmail || !allowedEmails.has(normalizedEmail)) {
    throw new HttpsError(
      "permission-denied",
      "Razorpay test billing is restricted to internal tester accounts."
    );
  }
}

function assertConfiguredPlanId(
  planId: PaidPlanId,
  interval: BillingInterval,
  razorpayPlanId: string,
  providerMode: RazorpayProviderMode = "test",
  currency: RazorpayCurrency = "INR"
) {
  if (!razorpayPlanId.trim()) {
    throw new HttpsError(
      "failed-precondition",
      `Missing Razorpay ${providerMode} ${currency} plan id for ${planId}_${interval}.`
    );
  }
}

function getRazorpayCollections(providerMode: RazorpayProviderMode) {
  if (providerMode === "live") {
    return {
      events: LIVE_EVENTS_COLLECTION,
      customers: LIVE_CUSTOMERS_COLLECTION,
      subscriptions: LIVE_SUBSCRIPTIONS_COLLECTION,
    };
  }

  return {
    events: TEST_EVENTS_COLLECTION,
    customers: TEST_CUSTOMERS_COLLECTION,
    subscriptions: TEST_SUBSCRIPTIONS_COLLECTION,
  };
}

function isSupportedPaidPlan(planId: PaidPlanId, interval: BillingInterval) {
  return (
    (planId === "pro" && (interval === "month" || interval === "year")) ||
    (planId === "power" && (interval === "month" || interval === "year")) ||
    (planId === LIVE_TEST_PLAN_ID && interval === "month")
  );
}

function getLiveOrderPricing(
  planId: PaidPlanId,
  interval: BillingInterval,
  currency: RazorpayCurrency | null
) {
  if (currency !== LIVE_ORDER_CURRENCY || !isSupportedPaidPlan(planId, interval)) {
    return null;
  }

  const amount = LIVE_ORDER_PRICES_INR_PAISE[planId]?.[interval];
  if (!amount) {
    return null;
  }

  const durationMs =
    planId === LIVE_TEST_PLAN_ID
      ? LIVE_TEST_DURATION_MS
      : interval === "year"
        ? LIVE_YEAR_DURATION_MS
        : LIVE_MONTH_DURATION_MS;
  const intervalLabel =
    planId === LIVE_TEST_PLAN_ID
      ? "30 minute access"
      : interval === "year"
        ? "Yearly"
        : "Monthly";

  return {
    amount,
    currency,
    durationMs,
    description: `Cluegent ${PLAN_CONFIGS[planId].label} - ${intervalLabel}`,
  };
}

function readRazorpayCurrency(value: unknown): RazorpayCurrency | null {
  return value === "INR" || value === "USD" ? value : null;
}

function getRawRequestBody(request: Request) {
  const firebaseRequest = request as Request & { rawBody?: Buffer };

  if (Buffer.isBuffer(firebaseRequest.rawBody)) {
    return firebaseRequest.rawBody.toString("utf8");
  }

  if (typeof request.body === "string") {
    return request.body;
  }

  if (request.body && typeof request.body === "object") {
    return JSON.stringify(request.body);
  }

  return "";
}

function shouldGrantPaidEntitlement(eventType: string, status: unknown) {
  const normalizedStatus = readString(status);
  if (normalizedStatus !== "active" && normalizedStatus !== "authenticated") {
    return false;
  }

  return (
    eventType === "subscription.activated" ||
    eventType === "subscription.charged" ||
    eventType === "subscription.resumed"
  );
}

function mapRazorpayStatusToLocalStatus(status: unknown, effectivePlanId: PlanId) {
  const normalizedStatus = readString(status);
  if (effectivePlanId !== DEFAULT_PLAN_ID) {
    return "active" as const;
  }

  switch (normalizedStatus) {
    case "cancelled":
      return "canceled" as const;
    case "halted":
      return "on_hold" as const;
    case "pending":
    case "authenticated":
    case "created":
      return "pending" as const;
    case "completed":
      return "expired" as const;
    case "expired":
      return "expired" as const;
    default:
      return "active" as const;
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function timestampSecondsToIso(value: number | null) {
  if (!value) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function getLiveTestExpiry(planId: PaidPlanId, effectivePlan: PlanId) {
  if (planId !== LIVE_TEST_PLAN_ID || effectivePlan === DEFAULT_PLAN_ID) {
    return null;
  }

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + LIVE_TEST_DURATION_MS);

  return {
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

function buildRejectionReason(input: {
  hasSubscriptionId: boolean;
  hasUid: boolean;
  hasMappedPlan: boolean;
}) {
  const reasons: string[] = [];

  if (!input.hasSubscriptionId) {
    reasons.push("missing subscription_id");
  }
  if (!input.hasUid) {
    reasons.push("missing firebase_uid notes");
  }
  if (!input.hasMappedPlan) {
    reasons.push("unknown Razorpay plan_id");
  }

  return reasons.join(", ");
}
