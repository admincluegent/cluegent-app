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
  materializeFreeTrialUsage,
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

  const [userSnap, subscriptionSnap, usageSnap] = await Promise.all([
    userRef.get(),
    subscriptionRef.get(),
    usageRef.get(),
  ]);
  const userData = userSnap.data();
  const subscriptionData = subscriptionSnap.data();
  const freeLimitsNeedRefresh =
    subscriptionData?.plan === "free" &&
    (subscriptionData.promptLimit !== PLAN_CONFIGS.free.promptLimit ||
      subscriptionData.screenshotLimit !== PLAN_CONFIGS.free.screenshotLimit ||
      subscriptionData.sttSecondsLimit !== PLAN_CONFIGS.free.sttSecondsLimit);
  const freeTrialFieldsNeedRefresh =
    userSnap.exists &&
    (typeof userData?.freeTrialPromptCount !== "number" ||
      typeof userData?.freeTrialScreenshotCount !== "number");

  if (
    subscriptionSnap.exists &&
    usageSnap.exists &&
    !freeLimitsNeedRefresh &&
    !freeTrialFieldsNeedRefresh
  ) {
    return {
      monthKey,
      subscription: materializeSubscription(
        subscriptionData as ReturnType<typeof materializeSubscription>
      ),
      usage: materializeUsage(
        usageSnap.data() as ReturnType<typeof materializeUsage>,
        monthKey
      ),
      freeTrialUsage: materializeFreeTrialUsage(userData),
    };
  }

  await db.runTransaction(async (transaction) => {
    const [userSnap, latestSubscriptionSnap, latestUsageSnap] = await Promise.all([
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
    } else if (freeTrialFieldsNeedRefresh) {
      transaction.set(
        userRef,
        {
          ...(typeof userSnap.data()?.freeTrialPromptCount !== "number"
            ? { freeTrialPromptCount: 0 }
            : {}),
          ...(typeof userSnap.data()?.freeTrialScreenshotCount !== "number"
            ? { freeTrialScreenshotCount: 0 }
            : {}),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    if (!latestSubscriptionSnap.exists) {
      transaction.set(subscriptionRef, buildSubscriptionDoc());
    } else {
      const latestSubscriptionData = latestSubscriptionSnap.data();
      if (latestSubscriptionData?.plan === "free" && freeLimitsNeedRefresh) {
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

    if (!latestUsageSnap.exists) {
      transaction.set(usageRef, buildUsageDoc(monthKey));
    }
  });

  const [finalUserSnap, finalSubscriptionSnap, finalUsageSnap] = await Promise.all([
    userRef.get(),
    subscriptionRef.get(),
    usageRef.get(),
  ]);

  return {
    monthKey,
    subscription: materializeSubscription(
      finalSubscriptionSnap.data() as ReturnType<typeof materializeSubscription>
    ),
    usage: materializeUsage(
      finalUsageSnap.data() as ReturnType<typeof materializeUsage>,
      monthKey
    ),
    freeTrialUsage: materializeFreeTrialUsage(finalUserSnap.data()),
  };
}

export async function getPlanStatusController(
  request: CallableRequest<unknown>
) {
  const authUser = requireAuth(request);
  const { monthKey, subscription, usage, freeTrialUsage } = await ensureUsageDocuments(
    authUser.uid,
    authUser
  );

  return {
    success: true,
    data: {
      monthKey,
      planStatus: serializeForClient(buildPlanStatus(subscription, usage, freeTrialUsage)),
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

  const { monthKey, subscription, usage, freeTrialUsage } = await ensureUsageDocuments(
    authUser.uid,
    authUser
  );
  const planStatus = buildPlanStatus(subscription, usage, freeTrialUsage);
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
