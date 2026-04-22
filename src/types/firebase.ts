export type UserPlan = "free" | "pro" | "power";
export type SubscriptionStatus = "active" | "inactive" | "canceled";

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
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyUsage {
  monthKey: string;
  promptCount: number;
  screenshotCount: number;
  sttSecondsUsed: number;
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
