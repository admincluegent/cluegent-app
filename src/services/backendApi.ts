import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase";
import type {
  ActivatePlanResponse,
  BackendEnvelope,
  GetOrCreateUserProfileResponse,
  GetPlanStatusResponse,
} from "@/types/backend";
import type { UserPlan } from "@/types/firebase";

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
