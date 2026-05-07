import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase";
import type {
  ActivatePlanResponse,
  BackendEnvelope,
  CancelRazorpayTestSubscriptionResponse,
  CreateRazorpayTestSubscriptionResponse,
  GetOrCreateUserProfileResponse,
  GetPlanStatusResponse,
  ResetTestSubscriptionResponse,
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

export async function getPlanStatus() {
  const callable = httpsCallable<
    Record<string, never>,
    BackendEnvelope<GetPlanStatusResponse>
  >(functions, "getPlanStatus");
  const result = await callable({});
  return result.data.data;
}

export async function activatePlan(planId: UserPlan) {
  const callable = httpsCallable<
    { planId: UserPlan },
    BackendEnvelope<ActivatePlanResponse>
  >(functions, "activatePlan");
  const result = await callable({ planId });
  return result.data.data;
}

export async function createRazorpayTestSubscription(
  planId: Extract<UserPlan, "pro" | "power">,
  interval: BillingInterval
) {
  const callable = httpsCallable<
    { planId: Extract<UserPlan, "pro" | "power">; interval: BillingInterval },
    BackendEnvelope<CreateRazorpayTestSubscriptionResponse>
  >(functions, "createRazorpayTestSubscription");
  const result = await callable({ planId, interval });
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

export async function cancelRazorpayTestSubscription() {
  const callable = httpsCallable<
    Record<string, never>,
    BackendEnvelope<CancelRazorpayTestSubscriptionResponse>
  >(functions, "cancelRazorpayTestSubscription");
  const result = await callable({});
  return result.data.data;
}

export async function resetTestSubscription() {
  const callable = httpsCallable<
    Record<string, never>,
    BackendEnvelope<ResetTestSubscriptionResponse>
  >(functions, "resetTestSubscription");
  const result = await callable({});
  return result.data.data;
}
