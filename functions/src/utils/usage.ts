import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  DEFAULT_PLAN_ID,
  DEFAULT_PLAN,
  PLAN_CONFIGS,
  isNewPaidPlan,
  type PlanConfig,
  type PlanId,
  type SubscriptionStatus,
} from "../config/plans.js";
import { getMonthKey } from "./monthKey.js";

export type UsageActionType = "stt" | "prompt" | "screenshot";
export type BillingInterval = "hour" | "month" | "quarter" | "year";
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
  freeTrialSttSecondsUsed: number;
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
  usageBaseline: UsageBaseline | null;
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
  orderId?: string | null;
  prepaidSecondsGranted?: number;
  planSttSecondsUsed?: number;
  usageWindowStart?: string | null;
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
  usageBaseline: UsageBaseline | null;
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
  sttSecondsUsed: number;
}

export interface UsageBaseline {
  monthKey: string;
  promptCount: number;
  screenshotCount: number;
  sttSecondsUsed: number;
  deepseekProPromptCount: number;
  openAiPromptCount: number;
  openAiScreenshotCount: number;
}

export function buildPlanLimitRefresh(
  raw?: Record<string, unknown>
): Pick<
  SubscriptionDoc,
  "promptLimit" | "screenshotLimit" | "sttSecondsLimit"
> | null {
  if (!raw) {
    return null;
  }

  const planId = raw?.plan;
  if (typeof planId !== "string" || !(planId in PLAN_CONFIGS)) {
    return null;
  }

  const plan = PLAN_CONFIGS[planId as PlanId];
  if (isNewPaidPlan(planId) && planId.startsWith('hour')) {
    return null; // Purchased credits are cumulative, not a static per-month limit.
  }
  if (
    raw.promptLimit === plan.promptLimit &&
    raw.screenshotLimit === plan.screenshotLimit &&
    raw.sttSecondsLimit === plan.sttSecondsLimit
  ) {
    return null;
  }

  return {
    promptLimit: plan.promptLimit,
    screenshotLimit: plan.screenshotLimit,
    sttSecondsLimit: plan.sttSecondsLimit,
  };
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
    freeTrialSttSecondsUsed: 0,
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
    usageBaseline: null,
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
    sttSecondsLimit: isNewPaidPlan(planId) && planId.startsWith('hour')
      ? Math.max(fallbackPlan.sttSecondsLimit, raw?.prepaidSecondsGranted ?? 0)
      : fallbackPlan.sttSecondsLimit,
    prepaidSecondsGranted: raw?.prepaidSecondsGranted ?? 0,
    planSttSecondsUsed: raw?.planSttSecondsUsed ?? 0,
    usageWindowStart: raw?.usageWindowStart ?? null,
    provider: raw?.provider ?? null,
    orderId: raw?.orderId ?? null,
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
    usageBaseline: materializeUsageBaseline(raw?.usageBaseline),
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
    sttSecondsUsed: clampFreeTrialSttSecondsUsed(raw?.freeTrialSttSecondsUsed),
  };
}

export function clampFreeTrialSttSecondsUsed(value: unknown) {
  const seconds =
    typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : 0;

  return Math.min(Math.max(seconds, 0), DEFAULT_PLAN.sttSecondsLimit);
}

export function buildUsageBaseline(usage: MaterializedUsage): UsageBaseline {
  return {
    monthKey: usage.monthKey,
    promptCount: usage.promptCount,
    screenshotCount: usage.screenshotCount,
    sttSecondsUsed: usage.sttSecondsUsed,
    deepseekProPromptCount: usage.deepseekProPromptCount,
    openAiPromptCount: usage.openAiPromptCount,
    openAiScreenshotCount: usage.openAiScreenshotCount,
  };
}

export function needsPaidUsageBaseline(
  subscription: MaterializedSubscription,
  usage: MaterializedUsage
) {
  return (
    !isNewPaidPlan(subscription.plan) &&
    subscription.plan !== "free" &&
    subscription.status === "active" &&
    subscription.usageBaseline?.monthKey !== usage.monthKey
  );
}

export function isExpiredLiveOrderEntitlement(
  subscriptionData?: Record<string, unknown>
) {
  if (
    subscriptionData?.plan === DEFAULT_PLAN_ID ||
    subscriptionData?.status !== "active" ||
    subscriptionData?.provider !== "razorpay" ||
    subscriptionData?.providerMode !== "live" ||
    typeof subscriptionData?.orderId !== "string" ||
    !subscriptionData.orderId.trim()
  ) {
    return false;
  }

  const expiresAt = readDate(subscriptionData.expiresAt);
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

export function getPlanPeriodUsage(
  subscription: MaterializedSubscription,
  usage: MaterializedUsage
): MaterializedUsage {
  if (isNewPaidPlan(subscription.plan)) {
    const periodStart = getListeningWindowStart(subscription);
    return { ...usage, sttSecondsUsed: subscription.usageWindowStart === periodStart
      ? Math.max(0, subscription.planSttSecondsUsed ?? 0) : 0 };
  }
  const baseline =
    subscription.plan !== "free" &&
    subscription.usageBaseline?.monthKey === usage.monthKey
      ? subscription.usageBaseline
      : null;

  if (!baseline) {
    return usage;
  }

  return {
    ...usage,
    promptCount: Math.max(usage.promptCount - baseline.promptCount, 0),
    screenshotCount: Math.max(
      usage.screenshotCount - baseline.screenshotCount,
      0
    ),
    sttSecondsUsed: Math.max(usage.sttSecondsUsed - baseline.sttSecondsUsed, 0),
    deepseekProPromptCount: Math.max(
      usage.deepseekProPromptCount - baseline.deepseekProPromptCount,
      0
    ),
    openAiPromptCount: Math.max(
      usage.openAiPromptCount - baseline.openAiPromptCount,
      0
    ),
    openAiScreenshotCount: Math.max(
      usage.openAiScreenshotCount - baseline.openAiScreenshotCount,
      0
    ),
  };
}

// Anchor resets to the purchase date, clamping month-end anniversaries (Jan 31 → Feb 28).
export function addBillingMonths(start: Date, months: number): Date {
  const date = new Date(start);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date;
}

export function getListeningWindowStart(subscription: MaterializedSubscription, now = new Date()): string | null {
  if (!isNewPaidPlan(subscription.plan) || !subscription.startedAt) return null;
  if (subscription.billingInterval === 'hour') return subscription.startedAt;
  const start = new Date(subscription.startedAt);
  if (Number.isNaN(start.getTime())) return null;
  let months = Math.max(0, (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + now.getUTCMonth() - start.getUTCMonth());
  if (addBillingMonths(start, months).getTime() > now.getTime()) months = Math.max(0, months - 1);
  return addBillingMonths(start, months).toISOString();
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

export function buildPlanStatus(
  subscription: MaterializedSubscription,
  usage: MaterializedUsage,
  freeTrialUsage: FreeTrialUsage = {
    promptCount: 0,
    screenshotCount: 0,
    sttSecondsUsed: 0,
  }
) {
  const planPeriodUsage = getPlanPeriodUsage(subscription, usage);
  const promptRemaining =
    subscription.plan === "free"
      ? Math.max(subscription.promptLimit - freeTrialUsage.promptCount, 0)
      : Math.max(subscription.promptLimit - planPeriodUsage.promptCount, 0);
  const screenshotRemaining =
    subscription.plan === "free"
      ? Math.max(subscription.screenshotLimit - freeTrialUsage.screenshotCount, 0)
      : Math.max(subscription.screenshotLimit - planPeriodUsage.screenshotCount, 0);
  const sttSecondsRemaining =
    subscription.plan === "free"
      ? Math.max(subscription.sttSecondsLimit - freeTrialUsage.sttSecondsUsed, 0)
      : Math.max(subscription.sttSecondsLimit - planPeriodUsage.sttSecondsUsed, 0);

  return {
    plan: subscription.plan,
    status: subscription.status,
    limits: {
      promptLimit: subscription.promptLimit,
      screenshotLimit: subscription.screenshotLimit,
      sttSecondsLimit: subscription.sttSecondsLimit,
    },
    usage: planPeriodUsage,
    totalUsage: usage,
    freeTrialUsage,
    remaining: {
      prompts: promptRemaining,
      screenshots: screenshotRemaining,
      sttSeconds: sttSecondsRemaining,
    },
  };
}

function materializeUsageBaseline(raw?: UsageBaseline | null): UsageBaseline | null {
  if (!raw || typeof raw !== "object" || typeof raw.monthKey !== "string") {
    return null;
  }

  return {
    monthKey: raw.monthKey,
    promptCount: typeof raw.promptCount === "number" ? raw.promptCount : 0,
    screenshotCount:
      typeof raw.screenshotCount === "number" ? raw.screenshotCount : 0,
    sttSecondsUsed:
      typeof raw.sttSecondsUsed === "number" ? raw.sttSecondsUsed : 0,
    deepseekProPromptCount:
      typeof raw.deepseekProPromptCount === "number"
        ? raw.deepseekProPromptCount
        : 0,
    openAiPromptCount:
      typeof raw.openAiPromptCount === "number" ? raw.openAiPromptCount : 0,
    openAiScreenshotCount:
      typeof raw.openAiScreenshotCount === "number"
        ? raw.openAiScreenshotCount
        : 0,
  };
}

export function isFreeTrialExhausted(status: ReturnType<typeof buildPlanStatus>) {
  return (
    status.plan === "free" &&
    status.remaining.sttSeconds <= 0
  );
}

export function isHourlyPlanExhausted(status: ReturnType<typeof buildPlanStatus>) {
  return (status.plan === "hour3" || status.plan === "hour10") && status.remaining.sttSeconds <= 0;
}

export function assertUsageAvailable(
  actionType: UsageActionType,
  status: ReturnType<typeof buildPlanStatus>
) {
  if (isHourlyPlanExhausted(status)) {
    throw new HttpsError("resource-exhausted", "Hourly plan limit reached. Add hours or upgrade to continue using listening, chat, and screenshot analysis.");
  }
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
      "Listening limit reached. Add hours or wait for your next monthly allowance."
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
