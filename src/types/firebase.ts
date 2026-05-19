export type UserPlan = "free" | "pro" | "power";
export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "canceled"
  | "pending"
  | "on_hold"
  | "failed"
  | "expired";
export type BillingInterval = "month" | "year";
export type BillingProvider = "razorpay";
export type BillingProviderMode = "test" | "live";

export interface FirestoreUserProfile {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL: string;
  provider: "google";
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface UserSubscription {
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

export interface PlanStatus {
  plan: UserPlan;
  status: SubscriptionStatus;
  limits: {
    promptLimit: number;
    screenshotLimit: number;
    sttSecondsLimit: number;
  };
  usage: MonthlyUsage;
  remaining: {
    prompts: number;
    screenshots: number;
    sttSeconds: number;
  };
}
