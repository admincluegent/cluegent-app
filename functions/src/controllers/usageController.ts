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
        }),
        { merge: true }
      );
    }

    if (!subscriptionSnap.exists) {
      transaction.set(subscriptionRef, buildSubscriptionDoc());
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
      planStatus: buildPlanStatus(subscription, usage),
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
  const authUser = requireAuth(request);
  const planId = request.data?.planId;

  if (!planId || !(planId in PLAN_CONFIGS)) {
    throw new HttpsError(
      "invalid-argument",
      "planId must be one of: free, pro, power."
    );
  }

  const { monthKey } = await ensureUsageDocuments(authUser.uid, authUser);
  const refs = getUserRefs(authUser.uid, monthKey);
  const subscriptionRef = db.doc(refs.subscriptionPath);
  const plan = PLAN_CONFIGS[planId];

  await subscriptionRef.set(
    {
      plan: plan.id,
      status: "active",
      promptLimit: plan.promptLimit,
      screenshotLimit: plan.screenshotLimit,
      sttSecondsLimit: plan.sttSecondsLimit,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const [updatedSubscriptionSnap, updatedUsageSnap] = await Promise.all([
    subscriptionRef.get(),
    db.doc(refs.usagePath).get(),
  ]);
  const subscription = materializeSubscription(
    updatedSubscriptionSnap.data() as ReturnType<typeof materializeSubscription>
  );
  const usage = materializeUsage(
    updatedUsageSnap.data() as ReturnType<typeof materializeUsage>,
    monthKey
  );

  return {
    success: true,
    data: {
      monthKey,
      planStatus: buildPlanStatus(subscription, usage),
    },
  };
}
