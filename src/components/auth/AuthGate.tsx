import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/auth.context";
import { isMac } from "@/utils/platformUtils";
import WindowControls from "../WindowControls";
import demoVideoUrl from "../../../website/assets/demo_video.mp4";
import CluegentIcon from "../icon.png";

function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function AuthDemoPreview() {
  const shortcutModifier = isMac ? "Command" : "Ctrl";

  return (
    <div className="relative flex min-h-full flex-col justify-center overflow-hidden bg-[#eef2f8] px-8 py-8 text-[#292b37]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(17,24,39,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/80 to-transparent" />

      <div className="relative mx-auto w-full max-w-[720px]">
        <div className="relative mx-auto aspect-[16/10] max-h-[430px] overflow-hidden rounded-[28px] border border-black/10 bg-black shadow-[0_28px_80px_rgba(33,39,58,0.24)]">
          <video
            className="h-full w-full object-cover opacity-95"
            src={demoVideoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Cluegent desktop assistant demo"
          />

          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-[#181b25]/90 p-2 shadow-[0_12px_34px_rgba(10,12,18,0.42)] backdrop-blur-xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
              <img src={CluegentIcon} alt="" className="h-7 w-7 object-contain" />
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="pr-3 text-sm font-semibold text-white">Start listening</span>
            <button
              type="button"
              className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white"
              tabIndex={-1}
            >
              Hide
            </button>
            <span className="h-10 w-10 rounded-full bg-white/5" />
          </div>

          <div className="absolute left-1/2 top-[23%] w-[72%] max-w-[540px] -translate-x-1/2 rounded-[24px] border border-white/14 bg-[#24242f]/88 p-5 text-white shadow-[0_18px_60px_rgba(10,12,18,0.46)] backdrop-blur-xl">
            <div className="mb-5 flex justify-end">
              <span className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold shadow-[0_10px_30px_rgba(37,99,235,0.34)]">
                What should I answer?
              </span>
            </div>
            <p className="text-base font-semibold leading-7">
              Explain the tradeoff clearly, then give one practical next step.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Ask next question", "Give example", "Answer shortly"].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/18 bg-white/9 px-4 py-2 text-xs font-semibold text-white/90"
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/12 bg-black/24 px-4 py-3 text-sm font-semibold text-white/55">
              <span className="mr-auto">Ask anything...</span>
              <kbd className="rounded-lg border border-white/12 bg-white/10 px-2 py-1 text-xs text-white/80">
                {shortcutModifier}
              </kbd>
              <kbd className="rounded-lg border border-white/12 bg-white/10 px-2 py-1 text-xs text-white/80">
                Enter
              </kbd>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-[560px] text-center">
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-[-0.01em] text-[#303240]">
            Private Desktop AI for Meetings
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#6b7280]">
            Use transcripts, typed prompts, voice prompts, and screenshots from one private desktop overlay.
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthShell({
  title,
  body,
  actionLabel,
  actionDisabled,
  actionPending,
  error,
  onAction,
  children,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionDisabled?: boolean;
  actionPending?: boolean;
  error?: string | null;
  onAction?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative h-screen overflow-hidden bg-white text-[#1f2430]">
      <div className="fixed inset-x-0 top-0 z-40 h-10 drag-region" />
      <div className="fixed right-0 top-0 z-50 no-drag">
        <WindowControls />
      </div>

      <div className="grid h-screen min-h-0 lg:grid-cols-[0.94fr_1.06fr]">
        <section className="relative flex h-screen min-h-0 items-center justify-center overflow-y-auto px-6 py-10 sm:px-8 lg:py-8">
          <div className="w-full max-w-[430px]">
            <div className="mb-5 flex items-center justify-center gap-3">
              <img src={CluegentIcon} alt="Cluegent" className="h-8 w-8 object-contain" />
              <span className="text-[22px] font-semibold tracking-[-0.01em] text-[#202332]">
                Cluegent
              </span>
            </div>

            <div className="text-center">
              <h1 className="text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#2e3140] sm:text-4xl">
                Welcome to Cluegent
              </h1>
              {/* <p className="mx-auto mt-3 max-w-sm text-base font-medium leading-6 text-[#9ba0aa]">
                The private AI meeting assistant for live notes, answers, and screen-aware help.
              </p> */}
            </div>

            <div className="mt-5">
              <div className="mb-3 text-center">
                <h2 className="text-lg font-semibold text-[#2e3140]">{title}</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-[#7b8190]">
                  {body}
                </p>
              </div>

              {error ? (
                <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </div>
              ) : null}

              {children ? (
                children
              ) : onAction ? (
                <button
                  type="button"
                  onClick={onAction}
                  disabled={actionDisabled}
                  className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#6aa2ff] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(80,142,240,0.28)] transition hover:bg-[#5b95f3] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {actionPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {actionLabel}
                  {!actionPending ? <ArrowRight className="h-4 w-4" /> : null}
                </button>
              ) : (
                <div className="flex h-14 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 text-sm font-semibold text-slate-500">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Opening Cluegent
                </div>
              )}
            </div>

            {/* <p className="mt-4 text-center text-xs leading-5 text-[#a1a5ae]">
              Google sign-in opens in your system browser. Email/password stays inside the app and still uses Firebase Auth.
            </p> */}
          </div>
        </section>

        <section className="hidden h-screen min-h-0 lg:block">
          <AuthDemoPreview />
        </section>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const isOverlayWindow =
    new URLSearchParams(window.location.search).get("window") === "overlay";
  const {
    user,
    profile,
    isLoading,
    isAuthenticating,
    isSyncing,
    error,
    loginWithGoogle,
    loginWithEmailPassword,
    registerWithEmailPassword,
    sendPasswordReset,
    resendVerificationEmail,
    refreshAuthUser,
    logoutUser,
    clearError,
  } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const overlayVerificationRefreshUserRef = useRef<string | null>(null);

  const isPasswordUser = useMemo(
    () => Boolean(user?.providerData?.some((provider) => provider.providerId === "password")),
    [user]
  );

  useEffect(() => {
    if (!isOverlayWindow || !isPasswordUser || !user || user.emailVerified) {
      return;
    }

    if (overlayVerificationRefreshUserRef.current === user.uid) {
      return;
    }

    overlayVerificationRefreshUserRef.current = user.uid;
    void refreshAuthUser();
  }, [isOverlayWindow, isPasswordUser, refreshAuthUser, user]);

  const switchMode = (nextMode: "signin" | "signup" | "reset") => {
    setMode(nextMode);
    setNotice(null);
    clearError();
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleBackToSignIn = async () => {
    setNotice(null);
    clearError();
    setIsCheckingVerification(false);
    await logoutUser();
    switchMode("signin");
  };

  const handleEmailAuth = async () => {
    setNotice(null);
    clearError();

    if (!email.trim()) {
      setNotice("Enter your email address to continue.");
      return;
    }

    if (mode === "reset") {
      const success = await sendPasswordReset(email.trim());
      if (success) {
        setNotice("Password reset email sent. Check your inbox.");
      }
      return;
    }

    if (!password.trim()) {
      setNotice("Enter your password to continue.");
      return;
    }

    if (mode === "signup") {
      if (password.trim().length < 6) {
        setNotice("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setNotice("Passwords do not match.");
        return;
      }

      const result = await registerWithEmailPassword(email.trim(), password);
      if (result.success) {
        setNotice("Account created. Verification email sent to your inbox.");
      }
      return;
    }

    const success = await loginWithEmailPassword(email.trim(), password);
    if (success) {
      setNotice(null);
    }
  };

  if (isOverlayWindow) {
    if (user && (!isPasswordUser || user.emailVerified)) {
      return <>{children}</>;
    }

    return (
      <div
        className="min-h-screen bg-transparent"
        aria-label={
          user ? "Refreshing Cluegent email verification" : "Restoring Cluegent session"
        }
      />
    );
  }

  const isRestoringSession = isLoading || (user && !profile && !error);

  if (isLoading || (user && !profile)) {
    return (
      <AuthShell
        title="Please wait"
        body="Opening Cluegent."
        error={error}
      />
    );
  }

  if (!user) {
    return (
      <AuthShell
        title={mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : "Sign in to continue"}
        body={
          mode === "signup"
            ? "Create a Cluegent account with email and password."
            : mode === "reset"
              ? "Enter your email and we will send password reset instructions."
              : ""
        }
        error={error}
      >
        <div className="space-y-3">
          {notice ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {notice}
            </div>
          ) : null}

          {mode !== "signup" && mode !== "reset" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setNotice(null);
                  clearError();
                  void loginWithGoogle();
                }}
                disabled={isAuthenticating || isSyncing}
                className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isAuthenticating ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                {isAuthenticating ? "Connecting to Google" : "Continue with Google"}
              </button>

              <div className="relative py-0.5">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-200" />
                <div className="relative mx-auto w-fit rounded-full bg-white px-3 text-xs lowercase tracking-[0.2em] text-slate-400">
                  Or sign in with email
                </div>
              </div>
            </>
          ) : null}

          <div className="space-y-2.5">
            <label className="block text-sm text-slate-600">
              <span className="mb-1.5 block font-semibold text-slate-900">Email address</span>
              <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                  placeholder="Enter your email address"
                />
              </div>
            </label>

            {mode !== "reset" ? (
              <label className="block text-sm text-slate-600">
                <span className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900">Password</span>
                  {mode === "signin" ? (
                    <button
                      type="button"
                      onClick={() => switchMode("reset")}
                      className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                    >
                      Forgot password?
                    </button>
                  ) : null}
                </span>
                <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                    placeholder={mode === "signup" ? "Create a password" : "Enter your password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            ) : null}

            {mode === "signup" ? (
              <label className="block text-sm text-slate-600">
                <span className="mb-1.5 block font-semibold text-slate-900">Confirm password</span>
                <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                    placeholder="Repeat your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              void handleEmailAuth();
            }}
            disabled={isAuthenticating || isSyncing}
            className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#6aa2ff] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(80,142,240,0.28)] transition hover:bg-[#5b95f3] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isAuthenticating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {mode === "signup"
              ? "Create account"
              : mode === "reset"
                ? "Send reset email"
                : "Continue"}
            {!isAuthenticating ? <ArrowRight className="h-4 w-4" /> : null}
          </button>

          {mode !== "reset" ? (
            <p className="px-2 text-center text-xs leading-5 text-slate-400">
              By signing up, you agree to our{" "}
              <a
                href="https://www.cluegent.com/terms.html"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 transition hover:text-blue-600"
              >
                Terms and Conditions
              </a>{" "}
              and{" "}
              <a
                href="https://www.cluegent.com/privacy.html"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 transition hover:text-blue-600"
              >
                Privacy Policy
              </a>
              .
            </p>
          ) : null}

          {mode === "signin" ? (
            <p className="text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="font-semibold text-blue-600 transition hover:text-blue-700"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="font-semibold text-blue-600 transition hover:text-blue-700"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </AuthShell>
    );
  }

  if (isPasswordUser && !user.emailVerified) {
    return (
      <AuthShell
        title="Verify your email"
        body="Your Cluegent account is created and signed in. To keep the account recoverable and secure, verify your email address from the inbox link we sent you."
        error={error}
      >
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              void handleBackToSignIn();
            }}
            disabled={isAuthenticating || isSyncing || isCheckingVerification}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </button>

          {notice ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {notice}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
            Signed in as <span className="font-semibold text-slate-950">{user.email}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              void resendVerificationEmail();
            }}
            disabled={isAuthenticating || isSyncing || isCheckingVerification}
            className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#6aa2ff] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(80,142,240,0.28)] transition hover:bg-[#5b95f3] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Mail className="h-4 w-4" />
            Resend verification email
          </button>

          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setIsCheckingVerification(true);
              void refreshAuthUser().then((refreshedUser) => {
                if (!refreshedUser?.emailVerified) {
                  setNotice("Email is not verified yet. Open the inbox link, then click this again.");
                  setIsCheckingVerification(false);
                }
              }).catch(() => {
                setIsCheckingVerification(false);
              });
            }}
            disabled={isCheckingVerification || isAuthenticating || isSyncing}
            className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCheckingVerification ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            {isCheckingVerification ? "Checking verification..." : "I already verified"}
          </button>
        </div>
      </AuthShell>
    );
  }

  return <>{children}</>;
}
