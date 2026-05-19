import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  DEFAULT_PLAN_ID,
  DEFAULT_PLAN,
  PLAN_CONFIGS,
  type PlanConfig,
  type PlanId,
  type SubscriptionStatus,
} from "../config/plans.js";
import { getMonthKey } from "./monthKey.js";

export type UsageActionType = "stt" | "prompt" | "screenshot";
export type BillingInterval = "month" | "year";
export type BillingProvider = "razorpay";
export type BillingProviderMode = "test" | "live";

export interface UserProfileDoc {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL: string;
  provider: "google";
  freeTrialPromptCount: number;
  freeTrialScreenshotCount: number;
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
  provider: BillingProvider | null;
  providerMode: BillingProviderMode | null;
  billingInterval: BillingInterval | null;
  customerId: string | null;
  subscriptionId: string | null;
  startedAt: string | null;
  renewsAt: string | null;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  lastWebhookEventId: string | null;
  isTestEntitlement: boolean;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface UsageDoc {
  monthKey: string;
  promptCount: number;
  screenshotCount: number;
  sttSecondsUsed: number;
  deepseekProPromptCount: number;
  openAiPromptCount: number;
  openAiScreenshotCount: number;
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
  provider: BillingProvider | null;
  providerMode: BillingProviderMode | null;
  billingInterval: BillingInterval | null;
  customerId: string | null;
  subscriptionId: string | null;
  startedAt: string | null;
  renewsAt: string | null;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  lastWebhookEventId: string | null;
  isTestEntitlement: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MaterializedUsage {
  monthKey: string;
  promptCount: number;
  screenshotCount: number;
  sttSecondsUsed: number;
  deepseekProPromptCount: number;
  openAiPromptCount: number;
  openAiScreenshotCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FreeTrialUsage {
  promptCount: number;
  screenshotCount: number;
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
  authTime?: string | null;
}): UserProfileDoc {
  return {
    uid: input.uid,
    email: input.email,
    emailVerified: input.emailVerified,
    displayName: input.displayName,
    photoURL: input.photoURL,
    provider: "google",
    freeTrialPromptCount: 0,
    freeTrialScreenshotCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastLoginAt: toFirestoreTimestamp(input.authTime) ?? FieldValue.serverTimestamp(),
  };
}

export function buildUserProfileUpdate(input: {
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL: string;
  authTime?: string | null;
}) {
  return {
    email: input.email,
    emailVerified: input.emailVerified,
    displayName: input.displayName,
    photoURL: input.photoURL,
    provider: "google" as const,
    updatedAt: FieldValue.serverTimestamp(),
    ...(toFirestoreTimestamp(input.authTime)
      ? { lastLoginAt: toFirestoreTimestamp(input.authTime) }
      : {}),
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
    provider: null,
    providerMode: null,
    billingInterval: null,
    customerId: null,
    subscriptionId: null,
    startedAt: null,
    renewsAt: null,
    expiresAt: null,
    cancelAtPeriodEnd: false,
    lastWebhookEventId: null,
    isTestEntitlement: false,
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
    deepseekProPromptCount: 0,
    openAiPromptCount: 0,
    openAiScreenshotCount: 0,
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
  const planId =
    raw?.plan && raw.plan in PLAN_CONFIGS ? raw.plan : DEFAULT_PLAN.id;
  const fallbackPlan: PlanConfig = PLAN_CONFIGS[planId];

  return {
    plan: fallbackPlan.id,
    status: raw?.status ?? "active",
    promptLimit: fallbackPlan.promptLimit,
    screenshotLimit: fallbackPlan.screenshotLimit,
    sttSecondsLimit: fallbackPlan.sttSecondsLimit,
    provider: raw?.provider ?? null,
    providerMode: raw?.providerMode ?? null,
    billingInterval: raw?.billingInterval ?? null,
    customerId: raw?.customerId ?? null,
    subscriptionId: raw?.subscriptionId ?? null,
    startedAt: raw?.startedAt ?? null,
    renewsAt: raw?.renewsAt ?? null,
    expiresAt: raw?.expiresAt ?? null,
    cancelAtPeriodEnd: raw?.cancelAtPeriodEnd ?? false,
    lastWebhookEventId: raw?.lastWebhookEventId ?? null,
    isTestEntitlement: raw?.isTestEntitlement ?? false,
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
    deepseekProPromptCount: raw?.deepseekProPromptCount ?? 0,
    openAiPromptCount: raw?.openAiPromptCount ?? 0,
    openAiScreenshotCount: raw?.openAiScreenshotCount ?? 0,
    inputTokens: raw?.inputTokens ?? 0,
    outputTokens: raw?.outputTokens ?? 0,
    estimatedCostUsd: raw?.estimatedCostUsd ?? 0,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

export function materializeFreeTrialUsage(raw?: Record<string, unknown>): FreeTrialUsage {
  return {
    promptCount:
      typeof raw?.freeTrialPromptCount === "number"
        ? raw.freeTrialPromptCount
        : 0,
    screenshotCount:
      typeof raw?.freeTrialScreenshotCount === "number"
        ? raw.freeTrialScreenshotCount
        : 0,
  };
}

export function serializeForClient<T>(value: T): T {
  return serializeValue(value) as T;
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => serializeValue(entry));
  }

  if (value && typeof value === "object") {
    if (typeof (value as { toDate?: unknown }).toDate === "function") {
      try {
        const parsedDate = (value as { toDate: () => Date }).toDate();
        if (parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
      } catch {
        // Fall through to object serialization below.
      }
    }

    const timestampLike = value as {
      _seconds?: unknown;
      _nanoseconds?: unknown;
    };
    if (
      typeof timestampLike._seconds === "number" &&
      typeof timestampLike._nanoseconds === "number"
    ) {
      return new Date(
        timestampLike._seconds * 1000 +
          Math.floor(timestampLike._nanoseconds / 1_000_000)
      ).toISOString();
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeValue(entry)])
    );
  }

  return value;
}

function toFirestoreTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Timestamp.fromDate(parsed);
}

export function buildPlanStatus(
  subscription: MaterializedSubscription,
  usage: MaterializedUsage,
  freeTrialUsage: FreeTrialUsage = { promptCount: 0, screenshotCount: 0 }
) {
  const promptRemaining =
    subscription.plan === "free"
      ? Math.max(subscription.promptLimit - freeTrialUsage.promptCount, 0)
      : Math.max(subscription.promptLimit - usage.promptCount, 0);
  const screenshotRemaining =
    subscription.plan === "free"
      ? Math.max(subscription.screenshotLimit - freeTrialUsage.screenshotCount, 0)
      : Math.max(subscription.screenshotLimit - usage.screenshotCount, 0);

  return {
    plan: subscription.plan,
    status: subscription.status,
    limits: {
      promptLimit: subscription.promptLimit,
      screenshotLimit: subscription.screenshotLimit,
      sttSecondsLimit: subscription.sttSecondsLimit,
    },
    usage,
    freeTrialUsage,
    remaining: {
      prompts: promptRemaining,
      screenshots: screenshotRemaining,
      sttSeconds: Math.max(
        subscription.sttSecondsLimit - usage.sttSecondsUsed,
        0
      ),
    },
  };
}

export function isFreeTrialExhausted(status: ReturnType<typeof buildPlanStatus>) {
  return (
    status.plan === "free" &&
    (status.remaining.prompts <= 0 ||
      status.remaining.screenshots <= 0 ||
      status.remaining.sttSeconds <= 0)
  );
}

export function assertUsageAvailable(
  actionType: UsageActionType,
  status: ReturnType<typeof buildPlanStatus>
) {
  if (isFreeTrialExhausted(status)) {
    throw new HttpsError(
      "resource-exhausted",
      "Free trial limit reached. Subscribe to continue using Cluegent."
    );
  }

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
      "You have reached your monthly listening limit. Limits will reset every month."
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
