export type PlanId = "free" | "pro" | "power";
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

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    label: "Free",
    sttSecondsLimit: 1800,
    promptLimit: 200,
    screenshotLimit: 20,
  },
  pro: {
    id: "pro",
    label: "Pro",
    sttSecondsLimit: 72000,
    promptLimit: 5000,
    screenshotLimit: 500,
  },
  power: {
    id: "power",
    label: "Power",
    sttSecondsLimit: 144000,
    promptLimit: 10000,
    screenshotLimit: 1000,
  },
};

export const DEFAULT_PLAN_ID: PlanId = "free";
export const DEFAULT_PLAN = PLAN_CONFIGS[DEFAULT_PLAN_ID];
