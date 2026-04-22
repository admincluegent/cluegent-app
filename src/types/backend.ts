import type {
  FirestoreUserProfile,
  MonthlyUsage,
  PlanStatus,
  UserSubscription,
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

export interface GetPlanStatusResponse {
  monthKey: string;
  planStatus: PlanStatus;
}

export interface ActivatePlanResponse {
  monthKey: string;
  planStatus: PlanStatus;
}
