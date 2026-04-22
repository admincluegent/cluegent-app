import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/firebase";
import {
  consumeGoogleRedirectResult,
  getFirebaseAuthErrorMessage,
  initializeDesktopGoogleAuthBridge,
  loginWithGoogle,
  logout,
  subscribeToAuthChanges,
} from "@/lib/firebase";
import { getOrCreateUserProfile } from "@/services/backendApi";
import type {
  FirestoreUserProfile,
  MonthlyUsage,
  PlanStatus,
  UserSubscription,
} from "@/types/firebase";

type AuthContextValue = {
  user: User | null;
  profile: FirestoreUserProfile | null;
  subscription: UserSubscription | null;
  usage: MonthlyUsage | null;
  planStatus: PlanStatus | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  isSyncing: boolean;
  error: string | null;
  loginWithGoogle: () => Promise<void>;
  logoutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FirestoreUserProfile | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  );
  const [usage, setUsage] = useState<MonthlyUsage | null>(null);
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncUserState = useCallback(async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const synced = await getOrCreateUserProfile();
      setProfile(synced.profile);
      setSubscription(synced.subscription);
      setUsage(synced.usage);
      setPlanStatus(synced.planStatus);
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Failed to sync your Firebase profile."
      );
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      return;
    }

    await syncUserState();
  }, [syncUserState, user]);

  const handleGoogleLogin = useCallback(async () => {
    if (isAuthenticating) {
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const authUser = await loginWithGoogle();
      if (!authUser) {
        return;
      }

      setUser(authUser);
      await syncUserState();
    } catch (loginError) {
      setError(getFirebaseAuthErrorMessage(loginError));
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, syncUserState]);

  const logoutUser = useCallback(async () => {
    setError(null);

    try {
      await logout();
      setUser(null);
      setProfile(null);
      setSubscription(null);
      setUsage(null);
      setPlanStatus(null);
    } catch (logoutError) {
      setError(getFirebaseAuthErrorMessage(logoutError));
    }
  }, []);

  useEffect(() => {
    initializeDesktopGoogleAuthBridge();

    void consumeGoogleRedirectResult().catch((redirectError) => {
      setError(getFirebaseAuthErrorMessage(redirectError));
    });

    const unsubscribe = subscribeToAuthChanges(async (authUser) => {
      setUser(authUser);

      if (!authUser) {
        setProfile(null);
        setSubscription(null);
        setUsage(null);
        setPlanStatus(null);
        setIsLoading(false);
        return;
      }

      await syncUserState();
      setIsLoading(false);
    });

    return unsubscribe;
  }, [syncUserState]);

  useEffect(() => {
    if (!window.electronAPI?.setFirebaseAuthToken) {
      return;
    }

    return onIdTokenChanged(auth, (authUser) => {
      if (!authUser) {
        void window.electronAPI.setFirebaseAuthToken(null);
        return;
      }

      void authUser
        .getIdToken()
        .then((idToken) => window.electronAPI.setFirebaseAuthToken(idToken))
        .catch((tokenError) => {
          console.error("[AuthContext] Failed to sync Firebase ID token", tokenError);
        });
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      subscription,
      usage,
      planStatus,
      isLoading,
      isAuthenticating,
      isSyncing,
      error,
      loginWithGoogle: handleGoogleLogin,
      logoutUser,
      refreshProfile,
    }),
    [
      error,
      handleGoogleLogin,
      isAuthenticating,
      isLoading,
      isSyncing,
      logoutUser,
      planStatus,
      profile,
      refreshProfile,
      subscription,
      usage,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
