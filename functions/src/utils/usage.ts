import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  DEFAULT_PLAN,
  PLAN_CONFIGS,
  type PlanConfig,
  type PlanId,
  type SubscriptionStatus,
} from "../config/plans.js";
import { getMonthKey } from "./monthKey.js";

export type UsageActionType = "stt" | "prompt" | "screenshot";

export interface UserProfileDoc {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL: string;
  provider: "google";
  createdAt: FieldValue;
  updatedAt: FieldValue;
  lastLoginAt: FieldValue;
}

export interface SubscriptionDoc {
  plan: PlanId;
  status: SubscriptionStatus;
  promptLimit: number;
  screenshotLimit: number;
  sttSecondsLimit: number;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface UsageDoc {
  monthKey: string;
  promptCount: number;
  screenshotCount: number;
  sttSecondsUsed: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface MaterializedSubscription {
  plan: PlanId;
  status: SubscriptionStatus;
  promptLimit: number;
  screenshotLimit: number;
  sttSecondsLimit: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MaterializedUsage {
  monthKey: string;
  promptCount: number;
  screenshotCount: number;
  sttSecondsUsed: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export function getUserRefs(uid: string, monthKey = getMonthKey()) {
  return {
    userPath: `users/${uid}`,
    subscriptionPath: `users/${uid}/subscriptions/current`,
    usagePath: `users/${uid}/usage_monthly/${monthKey}`,
  };
}

export function buildUserProfileDoc(input: {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL: string;
}): UserProfileDoc {
  return {
    uid: input.uid,
    email: input.email,
    emailVerified: input.emailVerified,
    displayName: input.displayName,
    photoURL: input.photoURL,
    provider: "google",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastLoginAt: FieldValue.serverTimestamp(),
  };
}

export function buildSubscriptionDoc(
  planId: PlanId = DEFAULT_PLAN.id,
  status: SubscriptionStatus = "active"
): SubscriptionDoc {
  const plan = PLAN_CONFIGS[planId];

  return {
    plan: plan.id,
    status,
    promptLimit: plan.promptLimit,
    screenshotLimit: plan.screenshotLimit,
    sttSecondsLimit: plan.sttSecondsLimit,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export function buildUsageDoc(monthKey = getMonthKey()): UsageDoc {
  return {
    monthKey,
    promptCount: 0,
    screenshotCount: 0,
    sttSecondsUsed: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export function materializeSubscription(
  raw?: Partial<MaterializedSubscription>
): MaterializedSubscription {
  const fallbackPlan: PlanConfig = PLAN_CONFIGS[raw?.plan ?? DEFAULT_PLAN.id];

  return {
    plan: raw?.plan ?? fallbackPlan.id,
    status: raw?.status ?? "active",
    promptLimit: raw?.promptLimit ?? fallbackPlan.promptLimit,
    screenshotLimit: raw?.screenshotLimit ?? fallbackPlan.screenshotLimit,
    sttSecondsLimit: raw?.sttSecondsLimit ?? fallbackPlan.sttSecondsLimit,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

export function materializeUsage(
  raw?: Partial<MaterializedUsage>,
  monthKey = getMonthKey()
): MaterializedUsage {
  return {
    monthKey: raw?.monthKey ?? monthKey,
    promptCount: raw?.promptCount ?? 0,
    screenshotCount: raw?.screenshotCount ?? 0,
    sttSecondsUsed: raw?.sttSecondsUsed ?? 0,
    inputTokens: raw?.inputTokens ?? 0,
    outputTokens: raw?.outputTokens ?? 0,
    estimatedCostUsd: raw?.estimatedCostUsd ?? 0,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

export function buildPlanStatus(
  subscription: MaterializedSubscription,
  usage: MaterializedUsage
) {
  return {
    plan: subscription.plan,
    status: subscription.status,
    limits: {
      promptLimit: subscription.promptLimit,
      screenshotLimit: subscription.screenshotLimit,
      sttSecondsLimit: subscription.sttSecondsLimit,
    },
    usage,
    remaining: {
      prompts: Math.max(subscription.promptLimit - usage.promptCount, 0),
      screenshots: Math.max(
        subscription.screenshotLimit - usage.screenshotCount,
        0
      ),
      sttSeconds: Math.max(
        subscription.sttSecondsLimit - usage.sttSecondsUsed,
        0
      ),
    },
  };
}

export function assertUsageAvailable(
  actionType: UsageActionType,
  status: ReturnType<typeof buildPlanStatus>
) {
  if (actionType === "prompt" && status.remaining.prompts <= 0) {
    throw new HttpsError(
      "resource-exhausted",
      "Monthly prompt limit exceeded for the current plan."
    );
  }

  if (actionType === "screenshot" && status.remaining.screenshots <= 0) {
    throw new HttpsError(
      "resource-exhausted",
      "Monthly screenshot limit exceeded for the current plan."
    );
  }

  if (actionType === "stt" && status.remaining.sttSeconds <= 0) {
    throw new HttpsError(
      "resource-exhausted",
      "Monthly STT limit exceeded for the current plan."
    );
  }

  return {
    allowed: true,
    actionType,
    remaining: status.remaining,
    limits: status.limits,
    usage: status.usage,
  };
}
