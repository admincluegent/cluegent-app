import { type CallableRequest } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { cancelRazorpayTestSubscription } from "../services/razorpayTestService.js";
import { adminAuth, db, requireAuth } from "../utils/auth.js";
import { getMonthKey } from "../utils/monthKey.js";
import {
  buildPlanStatus,
  buildSubscriptionDoc,
  buildUsageBaseline,
  buildUsageDoc,
  buildUserProfileDoc,
  buildUserProfileUpdate,
  getUserRefs,
  materializeFreeTrialUsage,
  materializeSubscription,
  materializeUsage,
  needsPaidUsageBaseline,
  serializeForClient,
} from "../utils/usage.js";

const RAZORPAY_TEST_CUSTOMERS_COLLECTION = "billing_razorpay_test_customers";
const RAZORPAY_TEST_SUBSCRIPTIONS_COLLECTION = "billing_razorpay_test_subscriptions";
const RAZORPAY_LIVE_CUSTOMERS_COLLECTION = "billing_razorpay_live_customers";
const RAZORPAY_LIVE_SUBSCRIPTIONS_COLLECTION = "billing_razorpay_live_subscriptions";

export async function getOrCreateUserProfileController(
  request: CallableRequest<unknown>
) {
  const authUser = requireAuth(request);
  const monthKey = getMonthKey();
  const refs = getUserRefs(authUser.uid, monthKey);
  const userRef = db.doc(refs.userPath);
  const subscriptionRef = db.doc(refs.subscriptionPath);
  const usageRef = db.doc(refs.usagePath);
  const profileDoc = buildUserProfileDoc({
    uid: authUser.uid,
    email: authUser.email,
    emailVerified: authUser.emailVerified,
    displayName: authUser.displayName,
    photoURL: authUser.photoURL,
    authTime: authUser.authTime,
  });
  const profileUpdate = buildUserProfileUpdate({
    email: authUser.email,
    emailVerified: authUser.emailVerified,
    displayName: authUser.displayName,
    photoURL: authUser.photoURL,
    authTime: authUser.authTime,
  });

  await db.runTransaction(async (transaction) => {
    const [userSnap, subscriptionSnap, usageSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(subscriptionRef),
      transaction.get(usageRef),
    ]);

    if (!userSnap.exists) {
      transaction.set(userRef, profileDoc);
    } else {
      const userData = userSnap.data();
      transaction.update(userRef, {
        ...profileUpdate,
        ...(typeof userData?.freeTrialPromptCount !== "number"
          ? { freeTrialPromptCount: 0 }
          : {}),
        ...(typeof userData?.freeTrialScreenshotCount !== "number"
          ? { freeTrialScreenshotCount: 0 }
          : {}),
        ...(typeof userData?.freeTrialSttSecondsUsed !== "number"
          ? {
              freeTrialSttSecondsUsed:
                subscriptionSnap.data()?.plan === "free" &&
                typeof usageSnap.data()?.sttSecondsUsed === "number"
                  ? Math.max(usageSnap.data()?.sttSecondsUsed as number, 0)
                  : 0,
            }
          : {}),
      });
    }

    if (!subscriptionSnap.exists) {
      transaction.set(subscriptionRef, buildSubscriptionDoc());
    } else if (isLiveTestSubscriptionExpired(subscriptionSnap.data())) {
      transaction.set(
        subscriptionRef,
        {
          ...buildSubscriptionDoc(),
          provider: "razorpay",
          providerMode: "live",
          billingInterval: null,
          customerId: subscriptionSnap.data()?.customerId ?? null,
          subscriptionId: subscriptionSnap.data()?.subscriptionId ?? null,
          startedAt: subscriptionSnap.data()?.startedAt ?? null,
          renewsAt: null,
          expiresAt: subscriptionSnap.data()?.expiresAt ?? null,
          cancelAtPeriodEnd: false,
          lastWebhookEventId: "livetest_local_expired",
          isTestEntitlement: false,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      const subscription = materializeSubscription(
        subscriptionSnap.data() as ReturnType<typeof materializeSubscription>
      );
      const usage = materializeUsage(
        usageSnap.data() as ReturnType<typeof materializeUsage>,
        monthKey
      );

      if (needsPaidUsageBaseline(subscription, usage)) {
        transaction.set(
          subscriptionRef,
          {
            usageBaseline: buildUsageBaseline(usage),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }

    if (!usageSnap.exists) {
      transaction.set(usageRef, buildUsageDoc(monthKey));
    }
  });

  const [userSnap, subscriptionSnap, usageSnap] = await Promise.all([
    userRef.get(),
    subscriptionRef.get(),
    usageRef.get(),
  ]);

  const subscription = materializeSubscription(
    subscriptionSnap.data() as ReturnType<typeof materializeSubscription>
  );
  const usage = materializeUsage(
    usageSnap.data() as ReturnType<typeof materializeUsage>,
    monthKey
  );
  const freeTrialUsage = materializeFreeTrialUsage(userSnap.data());
  const planStatus = buildPlanStatus(subscription, usage, freeTrialUsage);

  return {
    success: true,
    data: {
      profile: serializeForClient(userSnap.data()),
      subscription: serializeForClient(subscription),
      usage: serializeForClient(usage),
      monthKey,
      planStatus: serializeForClient(planStatus),
    },
  };
}

export async function deleteAccountController(
  request: CallableRequest<unknown>,
  env: {
    razorpayTestKeyId?: string;
    razorpayTestKeySecret?: string;
    razorpayLiveKeyId?: string;
    razorpayLiveKeySecret?: string;
  }
) {
  const authUser = requireAuth(request);
  const refs = getUserRefs(authUser.uid);
  const userRef = db.doc(refs.userPath);
  const subscriptionRef = db.doc(refs.subscriptionPath);
  const subscriptionSnap = await subscriptionRef.get();
  const subscription = subscriptionSnap.data();
  const provider = readString(subscription?.provider);
  const providerMode = readString(subscription?.providerMode);
  const plan = readString(subscription?.plan);
  const subscriptionId = readString(subscription?.subscriptionId);
  const cancellationErrors: string[] = [];

  if (
    provider === "razorpay" &&
    (providerMode === "test" || providerMode === "live") &&
    plan &&
    plan !== "free" &&
    subscriptionId
  ) {
    const keyId =
      providerMode === "live" ? env.razorpayLiveKeyId : env.razorpayTestKeyId;
    const keySecret =
      providerMode === "live" ? env.razorpayLiveKeySecret : env.razorpayTestKeySecret;

    if (!keyId || !keySecret) {
      throw new HttpsError(
        "failed-precondition",
        "Razorpay credentials are not configured for account deletion."
      );
    }

    try {
      await cancelRazorpayTestSubscription({
        keyId,
        keySecret,
        subscriptionId,
        cancelAtCycleEnd: false,
        providerMode,
      });
    } catch (error) {
      cancellationErrors.push(
        error instanceof Error ? error.message : "Unknown Razorpay cancellation error."
      );
    }
  }

  if (cancellationErrors.length > 0) {
    throw new HttpsError(
      "failed-precondition",
      `Could not cancel the active subscription before deleting the account: ${cancellationErrors.join(" ")}`
    );
  }

  await deleteRazorpayCustomerRecords(authUser.uid);
  await db.recursiveDelete(userRef);

  await db.collection("account_deletion_audit").doc(authUser.uid).set(
    {
      uid: authUser.uid,
      deletedAt: FieldValue.serverTimestamp(),
      subscriptionId: subscriptionId ?? null,
      provider: provider ?? null,
      providerMode: providerMode ?? null,
    },
    { merge: true }
  );

  try {
    await adminAuth.deleteUser(authUser.uid);
  } catch (error) {
    if (!isAuthUserNotFoundError(error)) {
      throw error;
    }
  }

  return {
    success: true,
    data: {
      deleted: true,
      uid: authUser.uid,
      cancelledSubscriptionId: subscriptionId,
    },
  };
}

async function deleteRazorpayCustomerRecords(uid: string) {
  await Promise.all([
    deleteRazorpayProviderCustomerRecords(
      uid,
      RAZORPAY_TEST_CUSTOMERS_COLLECTION,
      RAZORPAY_TEST_SUBSCRIPTIONS_COLLECTION
    ),
    deleteRazorpayProviderCustomerRecords(
      uid,
      RAZORPAY_LIVE_CUSTOMERS_COLLECTION,
      RAZORPAY_LIVE_SUBSCRIPTIONS_COLLECTION
    ),
  ]);
}

async function deleteRazorpayProviderCustomerRecords(
  uid: string,
  customersCollection: string,
  subscriptionsCollection: string
) {
  await db.collection(customersCollection).doc(uid).delete().catch(() => undefined);

  const subscriptions = await db.collection(subscriptionsCollection).where("uid", "==", uid).get();

  if (subscriptions.empty) {
    return;
  }

  const batch = db.batch();
  subscriptions.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isLiveTestSubscriptionExpired(subscriptionData?: Record<string, unknown>) {
  if (subscriptionData?.plan !== "livetest" || subscriptionData?.status !== "active") {
    return false;
  }

  const expiresAt = readDate(subscriptionData.expiresAt);
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

function readDate(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const parsed = (value as { toDate: () => Date }).toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }

  return null;
}

function isAuthUserNotFoundError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "auth/user-not-found"
  );
}
