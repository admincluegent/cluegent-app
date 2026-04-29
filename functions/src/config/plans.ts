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
    sttSecondsLimit: 60,
    promptLimit: 3,
    screenshotLimit: 3,
  },
  pro: {
    id: "pro",
    label: "Pro",
    sttSecondsLimit: 54000,
    promptLimit: 500,
    screenshotLimit: 200,
  },
  power: {
    id: "power",
    label: "Power",
    sttSecondsLimit: 144000,
    promptLimit: 1500,
    screenshotLimit: 600,
  },
};

export const DEFAULT_PLAN_ID: PlanId = "free";
export const DEFAULT_PLAN = PLAN_CONFIGS[DEFAULT_PLAN_ID];
