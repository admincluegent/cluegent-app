export type PlanId = "free" | "livetest" | "plus" | "pro" | "power" | "hour3" | "hour10" | "monthly200" | "quarterly200" | "annual200";
export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "canceled"
  | "pending"
  | "on_hold"
  | "failed"
  | "expired";

export interface PlanConfig {
  id: PlanId;
  label: string;
  sttSecondsLimit: number;
  promptLimit: number;
  screenshotLimit: number;
}

export const UNLIMITED_USAGE_LIMIT = Number.MAX_SAFE_INTEGER;

export const NEW_PAID_PLANS = {
  hour3: { label: "3 Hour Pack", interval: "hour", amount: 49_900, usdAmount: 599, hours: 3, months: 0, validityDays: 7 },
  hour10: { label: "10 Hour Pack", interval: "hour", amount: 149_900, usdAmount: 1699, hours: 10, months: 0, validityDays: 15 },
  monthly200: { label: "Monthly", interval: "month", amount: 349_900, usdAmount: 3999, hours: 200, months: 1 },
  quarterly200: { label: "3 Months", interval: "quarter", amount: 799_900, usdAmount: 8999, hours: 200, months: 3 },
  annual200: { label: "Yearly", interval: "year", amount: 1_949_900, usdAmount: 20200, hours: 200, months: 12 },
} as const;
export type NewPaidPlanId = keyof typeof NEW_PAID_PLANS;
export function isNewPaidPlan(id: unknown): id is NewPaidPlanId {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(NEW_PAID_PLANS, id);
}

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  ...Object.fromEntries(Object.entries(NEW_PAID_PLANS).map(([id, plan]) => [id, {
    id, label: plan.label, sttSecondsLimit: plan.hours * 3600,
    promptLimit: UNLIMITED_USAGE_LIMIT, screenshotLimit: UNLIMITED_USAGE_LIMIT,
  }])) as Record<NewPaidPlanId, PlanConfig>,
  free: {
    id: "free",
    label: "Free",
    sttSecondsLimit: 720,
    promptLimit: UNLIMITED_USAGE_LIMIT,
    screenshotLimit: UNLIMITED_USAGE_LIMIT,
  },
  livetest: {
    id: "livetest",
    label: "Live Test",
    sttSecondsLimit: 1800,
    promptLimit: 200,
    screenshotLimit: 200,
  },
  plus: {
    id: "plus",
    label: "Plus",
    sttSecondsLimit: 36000,
    promptLimit: 1000,
    screenshotLimit: 1000,
  },
  pro: {
    id: "pro",
    label: "Pro",
    sttSecondsLimit: UNLIMITED_USAGE_LIMIT,
    promptLimit: UNLIMITED_USAGE_LIMIT,
    screenshotLimit: UNLIMITED_USAGE_LIMIT,
  },
  power: {
    id: "power",
    label: "Power",
    sttSecondsLimit: UNLIMITED_USAGE_LIMIT,
    promptLimit: UNLIMITED_USAGE_LIMIT,
    screenshotLimit: UNLIMITED_USAGE_LIMIT,
  },
};

export const DEFAULT_PLAN_ID: PlanId = "free";
export const DEFAULT_PLAN = PLAN_CONFIGS[DEFAULT_PLAN_ID];
