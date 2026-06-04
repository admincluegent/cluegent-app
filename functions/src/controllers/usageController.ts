import { FieldValue } from "firebase-admin/firestore";
import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { type PlanId } from "../config/plans.js";
import { db, requireAuth } from "../utils/auth.js";
import { getMonthKey } from "../utils/monthKey.js";
import {
  assertUsageAvailable,
  buildPlanLimitRefresh,
  buildPlanStatus,
  buildSubscriptionDoc,
  buildUsageBaseline,
  buildUsageDoc,
  buildUserProfileDoc,
  getUserRefs,
  isExpiredLiveOrderEntitlement,
  materializeFreeTrialUsage,
  materializeSubscription,
  materializeUsage,
  needsPaidUsageBaseline,
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
  const planLimitRefresh = buildPlanLimitRefresh(subscriptionData);
  const liveOrderExpired = isExpiredLiveOrderEntitlement(subscriptionData);
  const paidBaselineNeedRefresh =
    subscriptionSnap.exists &&
    usageSnap.exists &&
    needsPaidUsageBaseline(
      materializeSubscription(
        subscriptionData as ReturnType<typeof materializeSubscription>
      ),
      materializeUsage(
        usageSnap.data() as ReturnType<typeof materializeUsage>,
        monthKey
      )
    );
  const freeTrialFieldsNeedRefresh =
    userSnap.exists &&
    (typeof userData?.freeTrialPromptCount !== "number" ||
      typeof userData?.freeTrialScreenshotCount !== "number" ||
      typeof userData?.freeTrialSttSecondsUsed !== "number");

  if (
    subscriptionSnap.exists &&
    usageSnap.exists &&
    !planLimitRefresh &&
    !liveOrderExpired &&
    !paidBaselineNeedRefresh &&
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
          ...(typeof userSnap.data()?.freeTrialSttSecondsUsed !== "number"
            ? {
                freeTrialSttSecondsUsed:
                  latestSubscriptionSnap.data()?.plan === "free" &&
                  typeof latestUsageSnap.data()?.sttSecondsUsed === "number"
                    ? Math.max(
                        latestUsageSnap.data()?.sttSecondsUsed as number,
                        0
                      )
                    : 0,
              }
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
      if (isExpiredLiveOrderEntitlement(latestSubscriptionData)) {
        transaction.set(
          subscriptionRef,
          {
            ...buildSubscriptionDoc(),
            provider: "razorpay",
            providerMode: "live",
            billingInterval: null,
            customerId: latestSubscriptionData?.customerId ?? null,
            subscriptionId: latestSubscriptionData?.subscriptionId ?? null,
            startedAt: latestSubscriptionData?.startedAt ?? null,
            renewsAt: null,
            expiresAt: latestSubscriptionData?.expiresAt ?? null,
            cancelAtPeriodEnd: false,
            lastWebhookEventId: "live_order_local_expired",
            isTestEntitlement: false,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        const latestSubscription = materializeSubscription(
          latestSubscriptionData as ReturnType<typeof materializeSubscription>
        );
        const latestUsage = materializeUsage(
          latestUsageSnap.data() as ReturnType<typeof materializeUsage>,
          monthKey
        );
        const latestPlanLimitRefresh =
          buildPlanLimitRefresh(latestSubscriptionData);
        const shouldRefreshPaidBaseline = needsPaidUsageBaseline(
          latestSubscription,
          latestUsage
        );

        if (latestPlanLimitRefresh || shouldRefreshPaidBaseline) {
          transaction.set(
            subscriptionRef,
            {
              ...(latestPlanLimitRefresh ?? {}),
              ...(shouldRefreshPaidBaseline
                ? { usageBaseline: buildUsageBaseline(latestUsage) }
                : {}),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
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
