import type React from "react";
import {
  ArrowRight,
  Cloud,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/auth.context";

function AuthShell({
  title,
  body,
  actionLabel,
  actionDisabled,
  actionPending,
  error,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionDisabled?: boolean;
  actionPending?: boolean;
  error?: string | null;
  onAction?: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),transparent_30%)]" />
      <div className="relative flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[#07101f]/90 shadow-[0_30px_120px_rgba(2,6,23,0.65)] backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="border-b border-white/10 p-8 lg:border-b-0 lg:border-r lg:p-12">
              <div className="mb-10 inline-flex items-center gap-3 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
                <Cloud className="h-4 w-4" />
                Cluegent Firebase workspace
              </div>
              <h1 className="max-w-xl text-4xl font-semibold leading-tight text-white lg:text-5xl">
                Bring your existing Google sign-in and backend into Natively.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 lg:text-lg">
                {body}
              </p>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  <p className="mt-4 text-sm font-medium text-white">
                    Firebase Auth carried over
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Google sign-in now uses the same Firebase project and
                    profile bootstrap you configured in Cluegent.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <Cloud className="h-5 w-5 text-sky-300" />
                  <p className="mt-4 text-sm font-medium text-white">
                    Backend ready for iteration
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Cloud Functions, Firestore rules, and the Firebase client
                    surface are wired in so development can continue here.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center p-8 lg:p-12">
              <div className="w-full rounded-[28px] border border-white/10 bg-black/25 p-7">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                  Firebase Login
                </p>
                <h2 className="mt-4 text-2xl font-semibold text-white">
                  {title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Use the same Google account you already use with Cluegent.
                </p>

                {error ? (
                  <div className="mt-6 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                ) : null}

                {onAction ? (
                  <button
                    type="button"
                    onClick={onAction}
                    disabled={actionDisabled}
                    className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {actionPending ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    {actionLabel}
                    {!actionPending ? <ArrowRight className="h-4 w-4" /> : null}
                  </button>
                ) : (
                  <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-300">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Restoring your Firebase session
                  </div>
                )}

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  The desktop app opens Google in your system browser and then
                  securely hands the Firebase token back to Natively.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const {
    user,
    profile,
    isLoading,
    isAuthenticating,
    isSyncing,
    error,
    loginWithGoogle,
  } = useAuth();

  if (isLoading || (user && !profile)) {
    return (
      <AuthShell
        title="Restoring your workspace"
        body="Natively is waiting for your Firebase session and profile bootstrap to finish before it loads the main app."
        error={error}
      />
    );
  }

  if (!user) {
    return (
      <AuthShell
        title="Sign in to continue"
        body="This build is now backed by your Cluegent Firebase project. Sign in once with Google and the Natively app will continue with the same authenticated backend foundation."
        actionLabel={isAuthenticating ? "Connecting to Google" : "Continue with Google"}
        actionDisabled={isAuthenticating || isSyncing}
        actionPending={isAuthenticating}
        error={error}
        onAction={() => {
          void loginWithGoogle();
        }}
      />
    );
  }

  return <>{children}</>;
}
