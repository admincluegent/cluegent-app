import React, { useMemo, useState } from "react";
import {
  Activity,
  AudioLines,
  Bot,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { activatePlan } from "@/services/backendApi";
import { useAuth } from "@/contexts/auth.context";
import type { UserPlan } from "@/types/firebase";

const PLAN_CARDS: Array<{
  id: UserPlan;
  label: string;
  accent: string;
  sttSecondsLimit: number;
  promptLimit: number;
  screenshotLimit: number;
  summary: string;
}> = [
  {
    id: "free",
    label: "Free",
    accent: "emerald",
    sttSecondsLimit: 1800,
    promptLimit: 30,
    screenshotLimit: 10,
    summary: "Good for smoke-testing your Firebase-managed assistant flow.",
  },
  {
    id: "pro",
    label: "Pro",
    accent: "sky",
    sttSecondsLimit: 54000,
    promptLimit: 500,
    screenshotLimit: 200,
    summary: "Balanced monthly quota for regular interviews and meetings.",
  },
  {
    id: "power",
    label: "Power",
    accent: "violet",
    sttSecondsLimit: 144000,
    promptLimit: 1500,
    screenshotLimit: 600,
    summary: "Highest quota for heavy rolling STT and Gemini-backed usage.",
  },
];

function formatDuration(seconds: number) {
  if (seconds >= 3600) {
    return `${Math.round((seconds / 3600) * 10) / 10}h`;
  }

  return `${Math.round(seconds / 60)}m`;
}

function getAccentClasses(accent: string) {
  switch (accent) {
    case "emerald":
      return {
        border: "border-emerald-500/25",
        badge: "bg-emerald-500/10 text-emerald-400",
        button: "bg-emerald-500 hover:bg-emerald-400 text-black",
      };
    case "sky":
      return {
        border: "border-sky-500/25",
        badge: "bg-sky-500/10 text-sky-400",
        button: "bg-sky-500 hover:bg-sky-400 text-black",
      };
    default:
      return {
        border: "border-violet-500/25",
        badge: "bg-violet-500/10 text-violet-400",
        button: "bg-violet-500 hover:bg-violet-400 text-black",
      };
  }
}

export const NativelyApiSettings: React.FC = () => {
  const { profile, planStatus, refreshProfile } = useAuth();
  const [activatingPlanId, setActivatingPlanId] = useState<UserPlan | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const planUsageRows = useMemo(() => {
    if (!planStatus) {
      return [];
    }

    return [
      {
        label: "Rolling STT",
        used: formatDuration(planStatus.usage.sttSecondsUsed),
        remaining: formatDuration(planStatus.remaining.sttSeconds),
      },
      {
        label: "Gemini prompts",
        used: `${planStatus.usage.promptCount}`,
        remaining: `${planStatus.remaining.prompts}`,
      },
      {
        label: "Screenshots",
        used: `${planStatus.usage.screenshotCount}`,
        remaining: `${planStatus.remaining.screenshots}`,
      },
    ];
  }, [planStatus]);

  const handleActivatePlan = async (planId: UserPlan) => {
    setActivatingPlanId(planId);
    setMessage(null);
    setError(null);

    try {
      await activatePlan(planId);
      await window.electronAPI?.setSttProvider?.("firebase");
      await refreshProfile();
      setMessage(
        `${planId.charAt(0).toUpperCase() + planId.slice(1)} is now active for ${profile?.email || "this user"}, and Speech Provider has been switched to Firebase Managed.`
      );
    } catch (activationError) {
      setError(
        activationError instanceof Error
          ? activationError.message
          : "Failed to activate the Firebase plan."
      );
    } finally {
      setActivatingPlanId(null);
    }
  };

  return (
    <div className="space-y-5 animated fadeIn">
      <div className="rounded-2xl border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(6,12,26,0.96),rgba(10,24,20,0.92))] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-[620px]">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              <ShieldCheck size={13} />
              Firebase Backend
            </div>
            <h3 className="text-2xl font-semibold text-white">
              Managed STT and Gemini now run through your Firebase project.
            </h3>
            <p className="mt-3 max-w-[560px] text-sm leading-7 text-slate-300">
              This tab replaces the old hosted Natively billing flow. Clicking a plan
              below activates it directly in Firestore for the signed-in user, and the
              app now uses your backend-managed Gemini and Deepgram setup instead of
              exposing local provider keys or model pickers to end users.
            </p>
          </div>
          <div className="grid min-w-[220px] gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-sm text-white">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Google sign-in already authenticates backend access
            </div>
            <div className="flex items-center gap-2 text-sm text-white">
              <AudioLines size={16} className="text-sky-400" />
              Deepgram stays in Firebase Functions
            </div>
            <div className="flex items-center gap-2 text-sm text-white">
              <Bot size={16} className="text-violet-400" />
              Gemini responses are served from Firebase
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-2xl border border-border-subtle bg-bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                Active Subscription
              </p>
              <h4 className="mt-2 text-lg font-semibold text-text-primary">
                {planStatus
                  ? `${planStatus.plan.charAt(0).toUpperCase() + planStatus.plan.slice(1)} plan`
                  : "Loading backend plan"}
              </h4>
              <p className="mt-1 text-sm text-text-secondary">
                Signed in as {profile?.email ?? "your Firebase user"}.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Status
              </p>
              <p className="mt-1 text-sm font-medium text-emerald-200">
                {planStatus?.status ?? "active"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {planUsageRows.map((row) => (
              <div
                key={row.label}
                className="rounded-2xl border border-border-subtle bg-bg-input p-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                  {row.label}
                </p>
                <p className="mt-3 text-lg font-semibold text-text-primary">
                  {row.remaining} left
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {row.used} used this month
                </p>
              </div>
            ))}
          </div>

          {message && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              <CheckCircle2 size={16} />
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <Activity size={16} />
              {error}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border-subtle bg-bg-card p-5">
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              Activate Plan
            </p>
            <h4 className="mt-2 text-lg font-semibold text-text-primary">
              No payment for now
            </h4>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              For this phase, the button below simply writes the selected plan into
              Firebase for the current user. That lets us test backend-managed STT and
              later Gemini quota enforcement before wiring payments.
            </p>
          </div>

          <div className="space-y-3">
            {PLAN_CARDS.map((plan) => {
              const accent = getAccentClasses(plan.accent);
              const isActive = planStatus?.plan === plan.id;
              const isBusy = activatingPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border bg-bg-input p-4 ${accent.border}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div
                        className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${accent.badge}`}
                      >
                        <Sparkles size={12} />
                        {plan.label}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-text-primary">
                        {plan.summary}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                        <span className="rounded-full border border-border-subtle px-2.5 py-1">
                          {formatDuration(plan.sttSecondsLimit)} STT
                        </span>
                        <span className="rounded-full border border-border-subtle px-2.5 py-1">
                          {plan.promptLimit} prompts
                        </span>
                        <span className="rounded-full border border-border-subtle px-2.5 py-1">
                          {plan.screenshotLimit} screenshots
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void handleActivatePlan(plan.id);
                      }}
                      disabled={isBusy}
                      className={`inline-flex min-w-[126px] items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${isActive && !isBusy ? "border border-white/10 bg-white/5 text-white" : accent.button} ${isBusy ? "opacity-70" : ""}`}
                    >
                      {isBusy ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Activating
                        </>
                      ) : isActive ? (
                        "Active"
                      ) : (
                        "Activate"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-border-subtle bg-black/20 p-4 text-sm leading-6 text-text-secondary">
            After activating a plan, go to `Settings -&gt; Audio`, pick
            `Firebase Managed`, and start a meeting. The rolling transcript will use
            your Firebase-authenticated backend path instead of a client-side Deepgram
            key.
          </div>
        </div>
      </div>
    </div>
  );
};
