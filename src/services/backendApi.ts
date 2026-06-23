import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase";
import type {
  BackendEnvelope,
  CancelRazorpayLiveSubscriptionResponse,
  CancelRazorpayTestSubscriptionResponse,
  CreateRazorpayLiveOrderResponse,
  CreateRazorpayLiveSubscriptionResponse,
  CreateRazorpayTestSubscriptionResponse,
  DeleteAccountResponse,
  GetLiveBillingPlansResponse,
  GetOrCreateUserProfileResponse,
  GetPlanStatusResponse,
  TrackSttUsageResponse,
  VerifyRazorpayLiveOrderPaymentResponse,
  VerifyRazorpayLivePaymentResponse,
  VerifyRazorpayTestPaymentResponse,
} from "@/types/backend";
import type { BillingInterval, UserPlan } from "@/types/firebase";

export async function getOrCreateUserProfile() {
  const callable = httpsCallable<
    Record<string, never>,
    BackendEnvelope<GetOrCreateUserProfileResponse>
  >(functions, "getOrCreateUserProfile");
  const result = await callable({});
  return result.data.data;
}

export async function deleteAccount() {
  const callable = httpsCallable<
    Record<string, never>,
    BackendEnvelope<DeleteAccountResponse>
  >(functions, "deleteAccount");
  const result = await callable({});
  return result.data.data;
}

export async function getPlanStatus() {
  const callable = httpsCallable<
    Record<string, never>,
    BackendEnvelope<GetPlanStatusResponse>
  >(functions, "getPlanStatus");
  const result = await callable({});
  return result.data.data;
}

export async function trackSttUsage(durationSeconds: number) {
  const callable = httpsCallable<
    { durationSeconds: number },
    TrackSttUsageResponse
  >(functions, "trackSttUsage");
  const result = await callable({ durationSeconds });
  if (!result.data.success) {
    throw new Error(result.data.message);
  }
  return result.data;
}

export async function getLiveBillingPlans() {
  const callable = httpsCallable<
    Record<string, never>,
    BackendEnvelope<GetLiveBillingPlansResponse>
  >(functions, "getLiveBillingPlans");
  const result = await callable({});
  return result.data.data;
}

export async function createRazorpayTestSubscription(
  planId: Extract<UserPlan, "plus" | "pro" | "power">,
  interval: BillingInterval
) {
  const callable = httpsCallable<
    { planId: Extract<UserPlan, "plus" | "pro" | "power">; interval: BillingInterval },
    BackendEnvelope<CreateRazorpayTestSubscriptionResponse>
  >(functions, "createRazorpayTestSubscription");
  const result = await callable({ planId, interval });
  return result.data.data;
}

export async function createRazorpayLiveSubscription(
  planId: Extract<UserPlan, "plus" | "pro" | "power">,
  interval: BillingInterval,
  currency: "INR" | "USD"
) {
  const callable = httpsCallable<
    {
      planId: Extract<UserPlan, "plus" | "pro" | "power">;
      interval: BillingInterval;
      currency: "INR" | "USD";
    },
    BackendEnvelope<CreateRazorpayLiveSubscriptionResponse>
  >(functions, "createRazorpayLiveSubscription");
  const result = await callable({ planId, interval, currency });
  return result.data.data;
}

export async function createRazorpayLiveOrder(
  planId: Extract<UserPlan, "plus" | "pro" | "power">,
  interval: BillingInterval,
  currency: "INR" | "USD" = "INR"
) {
  const callable = httpsCallable<
    {
      planId: Extract<UserPlan, "plus" | "pro" | "power">;
      interval: BillingInterval;
      currency: "INR" | "USD";
    },
    BackendEnvelope<CreateRazorpayLiveOrderResponse>
  >(functions, "createRazorpayLiveOrder");
  const result = await callable({ planId, interval, currency });
  return result.data.data;
}

export async function verifyRazorpayTestPayment(input: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}) {
  const callable = httpsCallable<
    typeof input,
    BackendEnvelope<VerifyRazorpayTestPaymentResponse>
  >(functions, "verifyRazorpayTestPayment");
  const result = await callable(input);
  return result.data.data;
}

export async function verifyRazorpayLivePayment(input: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}) {
  const callable = httpsCallable<
    typeof input,
    BackendEnvelope<VerifyRazorpayLivePaymentResponse>
  >(functions, "verifyRazorpayLivePayment");
  const result = await callable(input);
  return result.data.data;
}

export async function verifyRazorpayLiveOrderPayment(input: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}) {
  const callable = httpsCallable<
    typeof input,
    BackendEnvelope<VerifyRazorpayLiveOrderPaymentResponse>
  >(functions, "verifyRazorpayLiveOrderPayment");
  const result = await callable(input);
  return result.data.data;
}

export async function cancelRazorpayTestSubscription() {
  const callable = httpsCallable<
    Record<string, never>,
    BackendEnvelope<CancelRazorpayTestSubscriptionResponse>
  >(functions, "cancelRazorpayTestSubscription");
  const result = await callable({});
  return result.data.data;
}

export async function cancelRazorpayLiveSubscription() {
  const callable = httpsCallable<
    Record<string, never>,
    BackendEnvelope<CancelRazorpayLiveSubscriptionResponse>
  >(functions, "cancelRazorpayLiveSubscription");
  const result = await callable({});
  return result.data.data;
}
