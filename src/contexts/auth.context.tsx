import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/firebase";
import {
  consumeGoogleRedirectResult,
  getFirebaseAuthErrorMessage,
  initializeDesktopGoogleAuthBridge,
  loginWithEmailPassword,
  loginWithGoogle,
  refreshCurrentUser,
  registerWithEmailPassword,
  resendVerificationEmail,
  sendPasswordReset,
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
  loginWithEmailPassword: (email: string, password: string) => Promise<boolean>;
  registerWithEmailPassword: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; verificationSent: boolean }>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  resendVerificationEmail: () => Promise<boolean>;
  refreshAuthUser: () => Promise<void>;
  clearError: () => void;
  logoutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PROFILE_SYNC_MIN_INTERVAL_MS = 5_000;
const PROFILE_BACKGROUND_REFRESH_MS = 60_000;
const TOKEN_SYNC_MIN_INTERVAL_MS = 5_000;
const TOKEN_BACKGROUND_REFRESH_MS = 30 * 60 * 1000;

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
  const lastProfileSyncAtRef = useRef(0);
  const syncUserStatePromiseRef = useRef<Promise<void> | null>(null);
  const lastTokenSyncAtRef = useRef(0);
  const syncTokenPromiseRef = useRef<Promise<void> | null>(null);

  const syncUserState = useCallback(async (force = false) => {
    if (!force && Date.now() - lastProfileSyncAtRef.current < PROFILE_SYNC_MIN_INTERVAL_MS) {
      return;
    }

    if (syncUserStatePromiseRef.current) {
      return syncUserStatePromiseRef.current;
    }

    const syncPromise = (async () => {
      setIsSyncing(true);
      setError(null);

      try {
        const synced = await getOrCreateUserProfile();
        setProfile(synced.profile);
        setSubscription(synced.subscription);
        setUsage(synced.usage);
        setPlanStatus(synced.planStatus);
        lastProfileSyncAtRef.current = Date.now();
      } catch (syncError) {
        setError(
          syncError instanceof Error
            ? syncError.message
            : "Failed to sync your Firebase profile."
        );
      } finally {
        setIsSyncing(false);
      }
    })();

    syncUserStatePromiseRef.current = syncPromise;
    try {
      await syncPromise;
    } finally {
      syncUserStatePromiseRef.current = null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      return;
    }

    await syncUserState(true);
  }, [syncUserState, user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

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
      await syncUserState(true);
    } catch (loginError) {
      setError(getFirebaseAuthErrorMessage(loginError));
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, syncUserState]);

  const handleEmailLogin = useCallback(
    async (email: string, password: string) => {
      if (isAuthenticating) {
        return false;
      }

      setIsAuthenticating(true);
      setError(null);

      try {
        const authUser = await loginWithEmailPassword(email, password);
        setUser(authUser);
        await syncUserState(true);
        return true;
      } catch (loginError) {
        setError(getFirebaseAuthErrorMessage(loginError));
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [isAuthenticating, syncUserState]
  );

  const handleEmailRegistration = useCallback(
    async (email: string, password: string) => {
      if (isAuthenticating) {
        return { success: false, verificationSent: false };
      }

      setIsAuthenticating(true);
      setError(null);

      try {
        const authUser = await registerWithEmailPassword(email, password);
        setUser(authUser);
        await syncUserState(true);
        return { success: true, verificationSent: true };
      } catch (registerError) {
        setError(getFirebaseAuthErrorMessage(registerError));
        return { success: false, verificationSent: false };
      } finally {
        setIsAuthenticating(false);
      }
    },
    [isAuthenticating, syncUserState]
  );

  const handlePasswordReset = useCallback(async (email: string) => {
    setError(null);

    try {
      await sendPasswordReset(email);
      return true;
    } catch (resetError) {
      setError(getFirebaseAuthErrorMessage(resetError));
      return false;
    }
  }, []);

  const handleResendVerificationEmail = useCallback(async () => {
    setError(null);

    try {
      await resendVerificationEmail();
      return true;
    } catch (verificationError) {
      setError(getFirebaseAuthErrorMessage(verificationError));
      return false;
    }
  }, []);

  const handleRefreshAuthUser = useCallback(async () => {
    const refreshedUser = await refreshCurrentUser();
    setUser(refreshedUser);
  }, []);

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

  const syncElectronAuthToken = useCallback(
    async (authUser: User | null, forceRefresh = false) => {
      if (!window.electronAPI?.setFirebaseAuthToken) {
        return;
      }

      if (!authUser) {
        await window.electronAPI.setFirebaseAuthToken(null);
        return;
      }

      if (
        !forceRefresh &&
        Date.now() - lastTokenSyncAtRef.current < TOKEN_SYNC_MIN_INTERVAL_MS
      ) {
        return;
      }

      if (syncTokenPromiseRef.current) {
        await syncTokenPromiseRef.current;
        return;
      }

      const syncPromise = (async () => {
        try {
          const idToken = await authUser.getIdToken(forceRefresh);
          await window.electronAPI.setFirebaseAuthToken(idToken);
          lastTokenSyncAtRef.current = Date.now();
        } catch (tokenError) {
          console.error(
            "[AuthContext] Failed to sync Firebase ID token",
            tokenError
          );
        }
      })();

      syncTokenPromiseRef.current = syncPromise;
      try {
        await syncPromise;
      } finally {
        syncTokenPromiseRef.current = null;
      }
    },
    []
  );

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

      await syncUserState(true);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [syncUserState]);

  useEffect(() => {
    if (!window.electronAPI?.setFirebaseAuthToken) {
      return;
    }

    return onIdTokenChanged(auth, (authUser) => {
      void syncElectronAuthToken(authUser, false);
    });
  }, [syncElectronAuthToken]);

  useEffect(() => {
    if (!window.electronAPI?.setFirebaseAuthToken) {
      return;
    }

    let disposed = false;

    const refreshToken = () => {
      if (disposed) {
        return;
      }

      void syncElectronAuthToken(auth.currentUser, false);
    };

    refreshToken();

    const intervalId = window.setInterval(
      refreshToken,
      TOKEN_BACKGROUND_REFRESH_MS
    );
    window.addEventListener("focus", refreshToken);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshToken();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshToken);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncElectronAuthToken]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void syncUserState();
    }, PROFILE_BACKGROUND_REFRESH_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [syncUserState, user]);

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
      loginWithEmailPassword: handleEmailLogin,
      registerWithEmailPassword: handleEmailRegistration,
      sendPasswordReset: handlePasswordReset,
      resendVerificationEmail: handleResendVerificationEmail,
      refreshAuthUser: handleRefreshAuthUser,
      clearError,
      logoutUser,
      refreshProfile,
    }),
    [
      clearError,
      error,
      handleEmailLogin,
      handleEmailRegistration,
      handleGoogleLogin,
      handlePasswordReset,
      handleRefreshAuthUser,
      handleResendVerificationEmail,
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
