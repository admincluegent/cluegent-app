import type {
  BillingInterval,
  FirestoreUserProfile,
  MonthlyUsage,
  PlanStatus,
  UserSubscription,
  UserPlan,
} from "@/types/firebase";

export interface BackendEnvelope<T> {
  success: boolean;
  data: T;
}

export interface GetOrCreateUserProfileResponse {
  profile: FirestoreUserProfile;
  subscription: UserSubscription;
  usage: MonthlyUsage;
  monthKey: string;
  planStatus: PlanStatus;
}

export interface DeleteAccountResponse {
  deleted: boolean;
  uid: string;
  cancelledSubscriptionId: string | null;
}

export interface GetPlanStatusResponse {
  monthKey: string;
  planStatus: PlanStatus;
}

export type TrackSttUsageResponse =
  | {
      success: true;
      usage: {
        sttSecondsAdded: number;
        estimatedCostUsdAdded: number;
      };
      remaining: {
        sttSecondsRemaining: number;
      };
    }
  | {
      success: false;
      code: string;
      message: string;
    };

export type BillingCurrency = "INR" | "USD";

export interface LiveBillingPlanPrice {
  providerMode: "live";
  planId: Extract<UserPlan, "plus" | "pro" | "power">;
  interval: BillingInterval;
  currency: BillingCurrency;
  amountSubunits: number;
  displayPrice: string;
  displayMonthlyPrice: string;
  savingsLabel?: string;
  description: string;
}

export interface GetLiveBillingPlansResponse {
  providerMode: "live";
  currencies: BillingCurrency[];
  prices: LiveBillingPlanPrice[];
  generatedAt: string;
}

export interface CreateRazorpayTestSubscriptionResponse {
  providerMode: "test" | "live";
  keyId: string;
  subscriptionId: string;
  planId: UserPlan;
  interval: BillingInterval;
  currency?: "INR" | "USD";
  name: string;
  description: string;
  prefill: {
    name: string;
    email: string;
  };
  notes: Record<string, string>;
}

export interface VerifyRazorpayTestPaymentResponse {
  verified: boolean;
  subscriptionId: string;
  paymentId: string;
}

export interface CreateRazorpayLiveOrderResponse {
  providerMode: "live";
  keyId: string;
  orderId: string;
  amount: number;
  currency: "INR" | "USD";
  planId: UserPlan;
  interval: BillingInterval;
  name: string;
  description: string;
  prefill: {
    name: string;
    email: string;
  };
  notes: Record<string, string>;
}

export interface VerifyRazorpayLiveOrderPaymentResponse {
  verified: boolean;
  orderId: string;
  paymentId: string;
}

export interface CancelRazorpayTestSubscriptionResponse {
  cancelled: boolean;
  subscriptionId: string;
  planId: UserPlan;
}

export type CreateRazorpayLiveSubscriptionResponse = CreateRazorpayTestSubscriptionResponse;
export type VerifyRazorpayLivePaymentResponse = VerifyRazorpayTestPaymentResponse;
export type CancelRazorpayLiveSubscriptionResponse = CancelRazorpayTestSubscriptionResponse;
