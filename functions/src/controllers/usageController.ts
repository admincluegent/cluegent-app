import { FieldValue } from "firebase-admin/firestore";
import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { PLAN_CONFIGS, type PlanId } from "../config/plans.js";
import { db, requireAuth } from "../utils/auth.js";
import { getMonthKey } from "../utils/monthKey.js";
import {
  assertUsageAvailable,
  buildPlanStatus,
  buildSubscriptionDoc,
  buildUsageDoc,
  buildUserProfileDoc,
  getUserRefs,
  materializeSubscription,
  materializeUsage,
  serializeForClient,
  type UsageActionType,
} from "../utils/usage.js";

interface CheckUsageBeforeActionData {
  actionType: UsageActionType;
}

interface ActivatePlanData {
  planId: PlanId;
}

export async function ensureUsageDocuments(
  uid: string,
  identity: ReturnType<typeof requireAuth>
) {
  const monthKey = getMonthKey();
  const refs = getUserRefs(uid, monthKey);
  const userRef = db.doc(refs.userPath);
  const subscriptionRef = db.doc(refs.subscriptionPath);
  const usageRef = db.doc(refs.usagePath);

  await db.runTransaction(async (transaction) => {
    const [userSnap, subscriptionSnap, usageSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(subscriptionRef),
      transaction.get(usageRef),
    ]);

    if (!userSnap.exists) {
      transaction.set(
        userRef,
        buildUserProfileDoc({
          uid,
          email: identity.email,
          emailVerified: identity.emailVerified,
          displayName: identity.displayName,
          photoURL: identity.photoURL,
          authTime: identity.authTime,
        }),
        { merge: true }
      );
    }

    if (!subscriptionSnap.exists) {
      transaction.set(subscriptionRef, buildSubscriptionDoc());
    } else {
      const subscriptionData = subscriptionSnap.data();
      if (
        subscriptionData?.plan === "free" &&
        (subscriptionData.promptLimit !== PLAN_CONFIGS.free.promptLimit ||
          subscriptionData.screenshotLimit !== PLAN_CONFIGS.free.screenshotLimit ||
          subscriptionData.sttSecondsLimit !== PLAN_CONFIGS.free.sttSecondsLimit)
      ) {
        transaction.set(
          subscriptionRef,
          {
            promptLimit: PLAN_CONFIGS.free.promptLimit,
            screenshotLimit: PLAN_CONFIGS.free.screenshotLimit,
            sttSecondsLimit: PLAN_CONFIGS.free.sttSecondsLimit,
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

  const [subscriptionSnap, usageSnap] = await Promise.all([
    subscriptionRef.get(),
    usageRef.get(),
  ]);

  return {
    monthKey,
    subscription: materializeSubscription(
      subscriptionSnap.data() as ReturnType<typeof materializeSubscription>
    ),
    usage: materializeUsage(
      usageSnap.data() as ReturnType<typeof materializeUsage>,
      monthKey
    ),
  };
}

export async function getPlanStatusController(
  request: CallableRequest<unknown>
) {
  const authUser = requireAuth(request);
  const { monthKey, subscription, usage } = await ensureUsageDocuments(
    authUser.uid,
    authUser
  );

  return {
    success: true,
    data: {
      monthKey,
      planStatus: serializeForClient(buildPlanStatus(subscription, usage)),
    },
  };
}

export async function checkUsageBeforeActionController(
  request: CallableRequest<CheckUsageBeforeActionData>
) {
  const authUser = requireAuth(request);
  const actionType = request.data?.actionType;

  if (
    actionType !== "prompt" &&
    actionType !== "screenshot" &&
    actionType !== "stt"
  ) {
    throw new HttpsError(
      "invalid-argument",
      "actionType must be one of: stt, prompt, screenshot."
    );
  }

  const { monthKey, subscription, usage } = await ensureUsageDocuments(
    authUser.uid,
    authUser
  );
  const planStatus = buildPlanStatus(subscription, usage);
  const check = assertUsageAvailable(actionType, planStatus);

  return {
    success: true,
    data: {
      monthKey,
      ...check,
    },
  };
}

export async function activatePlanController(
  request: CallableRequest<ActivatePlanData>
) {
  requireAuth(request);
  throw new HttpsError(
    "failed-precondition",
    "Manual plan activation is disabled. Use the Razorpay test checkout flow or resetTestSubscription instead."
  );
}
