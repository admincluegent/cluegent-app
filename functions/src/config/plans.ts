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
    promptLimit: 50,
    screenshotLimit: 20,
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
    promptLimit: 10000,
    screenshotLimit: 5000,
  },
};

export const DEFAULT_PLAN_ID: PlanId = "free";
export const DEFAULT_PLAN = PLAN_CONFIGS[DEFAULT_PLAN_ID];
