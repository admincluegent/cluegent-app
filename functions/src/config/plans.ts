export type PlanId = "free" | "livetest" | "pro" | "power";
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

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    label: "Free",
    sttSecondsLimit: 1800,
    promptLimit: 20,
    screenshotLimit: 20,
  },
  livetest: {
    id: "livetest",
    label: "Live Test",
    sttSecondsLimit: 1800,
    promptLimit: 200,
    screenshotLimit: 200,
  },
  pro: {
    id: "pro",
    label: "Pro",
    sttSecondsLimit: 108000,
    promptLimit: 5000,
    screenshotLimit: 2500,
  },
  power: {
    id: "power",
    label: "Power",
    sttSecondsLimit: 180000,
    promptLimit: UNLIMITED_USAGE_LIMIT,
    screenshotLimit: UNLIMITED_USAGE_LIMIT,
  },
};

export const DEFAULT_PLAN_ID: PlanId = "free";
export const DEFAULT_PLAN = PLAN_CONFIGS[DEFAULT_PLAN_ID];
