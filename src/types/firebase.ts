export type NewPaidPlan = "hour3" | "hour10" | "monthly200" | "quarterly200" | "annual200";
export type UserPlan = "free" | "livetest" | "plus" | "pro" | "power" | NewPaidPlan;
export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "canceled"
  | "pending"
  | "on_hold"
  | "failed"
  | "expired";
export type BillingInterval = "hour" | "month" | "quarter" | "year";
export type BillingProvider = "razorpay";
export type BillingProviderMode = "test" | "live";

export interface FirestoreUserProfile {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL: string;
  provider: "google";
  freeTrialPromptCount: number;
  freeTrialScreenshotCount: number;
  freeTrialSttSecondsUsed: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface UserSubscription {
  orderId?: string | null;
  prepaidSecondsGranted?: number;
  planSttSecondsUsed?: number;
  usageWindowStart?: string | null;
  plan: UserPlan;
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
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyUsage {
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
  createdAt: string;
  updatedAt: string;
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

export interface PlanStatus {
  plan: UserPlan;
  status: SubscriptionStatus;
  limits: {
    promptLimit: number;
    screenshotLimit: number;
    sttSecondsLimit: number;
  };
  usage: MonthlyUsage;
  totalUsage?: MonthlyUsage;
  freeTrialUsage: {
    promptCount: number;
    screenshotCount: number;
    sttSecondsUsed: number;
  };
  remaining: {
    prompts: number;
    screenshots: number;
    sttSeconds: number;
  };
}
