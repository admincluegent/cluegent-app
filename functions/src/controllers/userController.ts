import { type CallableRequest } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { cancelRazorpayTestSubscription } from "../services/razorpayTestService.js";
import { adminAuth, db, requireAuth } from "../utils/auth.js";
import { getMonthKey } from "../utils/monthKey.js";
import {
  buildPlanStatus,
  buildSubscriptionDoc,
  buildUsageDoc,
  buildUserProfileDoc,
  buildUserProfileUpdate,
  getUserRefs,
  materializeSubscription,
  materializeUsage,
  serializeForClient,
} from "../utils/usage.js";

const RAZORPAY_TEST_CUSTOMERS_COLLECTION = "billing_razorpay_test_customers";
const RAZORPAY_TEST_SUBSCRIPTIONS_COLLECTION = "billing_razorpay_test_subscriptions";

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
      transaction.update(userRef, profileUpdate);
    }

    if (!subscriptionSnap.exists) {
      transaction.set(subscriptionRef, buildSubscriptionDoc());
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
  const planStatus = buildPlanStatus(subscription, usage);

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
  env: { razorpayTestKeyId?: string; razorpayTestKeySecret?: string }
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
    providerMode === "test" &&
    plan &&
    plan !== "free" &&
    subscriptionId
  ) {
    if (!env.razorpayTestKeyId || !env.razorpayTestKeySecret) {
      throw new HttpsError(
        "failed-precondition",
        "Razorpay credentials are not configured for account deletion."
      );
    }

    try {
      await cancelRazorpayTestSubscription({
        keyId: env.razorpayTestKeyId,
        keySecret: env.razorpayTestKeySecret,
        subscriptionId,
        cancelAtCycleEnd: false,
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

  await deleteRazorpayTestCustomerRecords(authUser.uid);
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

async function deleteRazorpayTestCustomerRecords(uid: string) {
  await db
    .collection(RAZORPAY_TEST_CUSTOMERS_COLLECTION)
    .doc(uid)
    .delete()
    .catch(() => undefined);

  const subscriptions = await db
    .collection(RAZORPAY_TEST_SUBSCRIPTIONS_COLLECTION)
    .where("uid", "==", uid)
    .get();

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

function isAuthUserNotFoundError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "auth/user-not-found"
  );
}
