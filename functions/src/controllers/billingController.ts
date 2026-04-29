import { FieldValue } from "firebase-admin/firestore";
import { type Request, type Response } from "express";
import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { DEFAULT_PLAN_ID, PLAN_CONFIGS, type PlanId } from "../config/plans.js";
import {
  createRazorpayTestSubscription,
  parseAllowedEmails,
  resolvePlanFromRazorpayPlanId,
  resolveRazorpayPlanId,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
  type PaidPlanId,
  type RazorpaySubscriptionEntity,
  type RazorpayTestPlanConfig,
} from "../services/razorpayTestService.js";
import { db, requireAuth, type AuthenticatedUser } from "../utils/auth.js";
import { buildSubscriptionDoc, getUserRefs, type BillingInterval } from "../utils/usage.js";
import { ensureUsageDocuments } from "./usageController.js";

interface CreateRazorpayTestSubscriptionData {
  planId?: PlanId;
  interval?: BillingInterval;
}

interface VerifyRazorpayTestPaymentData {
  razorpay_payment_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature?: string;
}

interface RazorpayTestEnv {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  allowedEmails: string;
  plans: RazorpayTestPlanConfig;
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

export async function createRazorpayTestSubscriptionController(
  request: CallableRequest<CreateRazorpayTestSubscriptionData>,
  env: Pick<RazorpayTestEnv, "keyId" | "keySecret" | "allowedEmails" | "plans">
) {
  const authUser = requireAuth(request);
  assertTestBillingUser(authUser, env.allowedEmails);

  const planId = request.data?.planId;
  const interval = request.data?.interval;

  if (planId !== "pro" || (interval !== "month" && interval !== "year")) {
    throw new HttpsError(
      "invalid-argument",
      "Razorpay test checkout currently supports Pro monthly and Pro yearly."
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
  });

  await writePendingRazorpaySubscription({
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

  if (mappedPlan.planId !== "pro" || !["month", "year"].includes(mappedPlan.interval)) {
    throw new HttpsError("failed-precondition", "Unknown pending Razorpay plan.");
  }

  await applyRazorpayEntitlement({
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
    const duplicate = await persistRazorpayWebhookEvent(payload, eventId, rawBody, env.plans);
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

async function persistRazorpayWebhookEvent(
  payload: RazorpayWebhookEnvelope,
  eventId: string,
  rawBody: string,
  plans: RazorpayTestPlanConfig
) {
  const eventRef = db.collection(TEST_EVENTS_COLLECTION).doc(eventId);
  const existingEvent = await eventRef.get();
  if (existingEvent.exists) {
    return true;
  }

  const eventType = typeof payload.event === "string" ? payload.event : "unknown";
  const subscription = payload.payload?.subscription?.entity ?? {};
  const subscriptionId = readString(subscription.id);
  const razorpayPlanId = readString(subscription.plan_id);
  const mappedPlan = razorpayPlanId
    ? resolvePlanFromRazorpayPlanId(razorpayPlanId, plans)
    : null;
  const priorSubscriptionSnap = subscriptionId
    ? await db.collection(TEST_SUBSCRIPTIONS_COLLECTION).doc(subscriptionId).get()
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
  uid: string;
  email: string;
  displayName: string;
  subscriptionId: string;
  razorpayPlanId: string;
  planId: PaidPlanId;
  interval: BillingInterval;
}) {
  const customerRef = db.collection(TEST_CUSTOMERS_COLLECTION).doc(input.uid);
  const subscriptionRef = db
    .collection(TEST_SUBSCRIPTIONS_COLLECTION)
    .doc(input.subscriptionId);

  await db.runTransaction(async (transaction) => {
    transaction.set(
      customerRef,
      {
        uid: input.uid,
        email: input.email,
        displayName: input.displayName,
        provider: "razorpay",
        providerMode: "test",
        isInternalTester: true,
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
        providerMode: "test",
        razorpayPlanId: input.razorpayPlanId,
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
  const userSubscriptionRef = db.doc(refs.subscriptionPath);
  const customerRef = db.collection(TEST_CUSTOMERS_COLLECTION).doc(input.uid);
  const subscriptionRef = db
    .collection(TEST_SUBSCRIPTIONS_COLLECTION)
    .doc(input.subscriptionId);
  const payload = input.providerPayload;

  await db.runTransaction(async (transaction) => {
    transaction.set(
      customerRef,
      {
        uid: input.uid,
        email: input.email,
        provider: "razorpay",
        providerMode: "test",
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
        providerMode: "test",
        planId: input.mappedPlan.planId,
        effectivePlanId: effectivePlan,
        billingInterval: input.mappedPlan.interval,
        razorpayStatus: input.razorpayStatus,
        subscriptionId: input.subscriptionId,
        customerId: input.customerId,
        cancelAtPeriodEnd: false,
        startedAt: timestampSecondsToIso(readNumber(payload.current_start ?? payload.start_at)),
        renewsAt: timestampSecondsToIso(readNumber(payload.current_end ?? payload.charge_at)),
        expiresAt: timestampSecondsToIso(readNumber(payload.end_at ?? payload.ended_at)),
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
        providerMode: "test",
        billingInterval: input.mappedPlan.interval,
        customerId: input.customerId,
        subscriptionId: input.subscriptionId,
        startedAt: timestampSecondsToIso(readNumber(payload.current_start ?? payload.start_at)),
        renewsAt: timestampSecondsToIso(readNumber(payload.current_end ?? payload.charge_at)),
        expiresAt: timestampSecondsToIso(readNumber(payload.end_at ?? payload.ended_at)),
        cancelAtPeriodEnd: false,
        lastWebhookEventId: input.eventId,
        isTestEntitlement: true,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
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
  razorpayPlanId: string
) {
  if (!razorpayPlanId.trim()) {
    throw new HttpsError(
      "failed-precondition",
      `Missing Razorpay test plan id for ${planId}_${interval}.`
    );
  }
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
    reasons.push("unknown Razorpay test plan_id");
  }

  return reasons.join(", ");
}
