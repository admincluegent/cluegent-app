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

export interface ActivatePlanResponse {
  monthKey: string;
  planStatus: PlanStatus;
}

export interface CreateRazorpayTestSubscriptionResponse {
  providerMode: "test";
  keyId: string;
  subscriptionId: string;
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

export interface VerifyRazorpayTestPaymentResponse {
  verified: boolean;
  subscriptionId: string;
  paymentId: string;
}

export interface CancelRazorpayTestSubscriptionResponse {
  cancelled: boolean;
  subscriptionId: string;
  planId: UserPlan;
}

export interface ResetTestSubscriptionResponse {
  reset: boolean;
  planId: UserPlan;
}
