import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  createRazorpayTestSubscription,
  resetTestSubscription,
  verifyRazorpayTestPayment,
} from "@/services/backendApi";
import { useAuth } from "@/contexts/auth.context";
import type { BillingInterval } from "@/types/firebase";

const BILLING_CHECKOUT_SYNC_WINDOW_MS = 60_000;
const BILLING_PENDING_POLL_MS = 4_000;
const RAZORPAY_CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill: {
    name: string;
    email: string;
  };
  notes: Record<string, string>;
  theme: {
    color: string;
  };
  handler: (response: RazorpayPaymentResponse) => void;
  modal: {
    ondismiss: () => void;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
    };
  }
}

type CheckoutCard = {
  id: "pro" | "power";
  interval: BillingInterval;
  name: string;
  accent: "sky" | "violet";
  eyebrow: string;
  tagline: string;
  sttSecondsLimit: number;
  promptLimit: number;
  screenshotLimit: number;
  highlights: string[];
};

const CHECKOUT_CARDS: CheckoutCard[] = [
  {
    id: "pro",
    interval: "month",
    name: "Pro",
    accent: "sky",
    eyebrow: "Recommended",
    tagline: "For regular interview prep, active practice, and weekly sessions.",
    sttSecondsLimit: 54000,
    promptLimit: 500,
    screenshotLimit: 200,
    highlights: [
      "Good fit for repeat personal use",
      "Keeps the same core assistant flow unlocked",
      "Monthly sandbox subscription path",
    ],
  },
  {
    id: "pro",
    interval: "year",
    name: "Pro",
    accent: "sky",
    eyebrow: "Recommended",
    tagline: "Same Cluegent Pro quota with a yearly billing test path.",
    sttSecondsLimit: 54000,
    promptLimit: 500,
    screenshotLimit: 200,
    highlights: [
      "Same quota as monthly Pro",
      "Useful for annual entitlement testing",
      "Yearly sandbox subscription path",
    ],
  },
  {
    id: "power",
    interval: "month",
    name: "Power",
    accent: "violet",
    eyebrow: "Heavy usage",
    tagline: "For longer sessions, more prompts, and heavier transcript volume.",
    sttSecondsLimit: 144000,
    promptLimit: 1500,
    screenshotLimit: 600,
    highlights: [
      "Best for frequent daily usage",
      "Higher prompt and screenshot room",
      "Monthly sandbox subscription path",
    ],
  },
  {
    id: "power",
    interval: "year",
    name: "Power",
    accent: "violet",
    eyebrow: "Heavy usage",
    tagline: "Highest quota path with yearly billing for internal launch testing.",
    sttSecondsLimit: 144000,
    promptLimit: 1500,
    screenshotLimit: 600,
    highlights: [
      "Same quota as monthly Power",
      "Useful for annual billing coverage",
      "Yearly sandbox subscription path",
    ],
  },
];

const FREE_PLAN_CARD = {
  id: "free" as const,
  name: "Free",
  eyebrow: "Try the product",
  tagline: "A small trial to prove the flow before the user upgrades.",
  sttSecondsLimit: 60,
  promptLimit: 3,
  screenshotLimit: 3,
  highlights: [
    "Three LLM responses",
    "One minute of rolling STT",
    "Enough to test the core Cluegent loop",
  ],
};

function formatDuration(seconds: number) {
  if (seconds >= 3600) {
    return `${Math.round((seconds / 3600) * 10) / 10}h`;
  }

  return `${Math.round(seconds / 60)}m`;
}

function formatIsoDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function getAccentClasses(accent: CheckoutCard["accent"]) {
  if (accent === "sky") {
    return {
      border: "border-sky-400/30",
      badge:
        "border-sky-400/25 bg-sky-400/[0.12] text-sky-200 shadow-[0_18px_55px_-35px_rgba(56,189,248,0.9)]",
      button:
        "border border-sky-400/20 bg-sky-400 text-slate-950 shadow-[0_18px_45px_-24px_rgba(56,189,248,0.9)] hover:bg-sky-300",
      glow: "from-sky-400/[0.14] via-sky-400/[0.05] to-transparent",
      bullet: "bg-sky-300",
    };
  }

  return {
    border: "border-violet-400/30",
    badge:
      "border-violet-400/25 bg-violet-400/[0.12] text-violet-200 shadow-[0_18px_55px_-35px_rgba(167,139,250,0.9)]",
    button:
      "border border-violet-400/20 bg-violet-500 text-white shadow-[0_18px_45px_-24px_rgba(139,92,246,0.9)] hover:bg-violet-400",
    glow: "from-violet-400/[0.14] via-violet-400/[0.05] to-transparent",
    bullet: "bg-violet-300",
  };
}

function ensureRazorpayCheckoutLoaded() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("Timed out loading Razorpay Checkout. Check network/CSP settings."));
    }, 15_000);
    const resolveOnce = () => {
      window.clearTimeout(timeoutId);
      resolve();
    };
    const rejectOnce = (error: Error) => {
      window.clearTimeout(timeoutId);
      reject(error);
    };
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_SCRIPT_URL}"]`
    );

    if (existingScript) {
      existingScript.addEventListener("load", resolveOnce, { once: true });
      existingScript.addEventListener(
        "error",
        () => rejectOnce(new Error("Failed to load Razorpay Checkout.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = resolveOnce;
    script.onerror = () => rejectOnce(new Error("Failed to load Razorpay Checkout."));
    document.head.appendChild(script);
  });
}

export const NativelyApiSettings: React.FC = () => {
  const { profile, subscription, planStatus, refreshProfile, isSyncing } = useAuth();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCheckoutKey, setPendingCheckoutKey] = useState<string | null>(null);
  const [checkoutStartedAt, setCheckoutStartedAt] = useState<number | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>("month");

  useEffect(() => {
    void refreshProfile();

    const refreshNow = () => {
      void refreshProfile();
    };

    window.addEventListener("focus", refreshNow);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshNow();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshNow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshProfile]);

  useEffect(() => {
    if (!pendingCheckoutKey || !checkoutStartedAt) {
      return;
    }

    const hasPendingWindowExpired =
      Date.now() - checkoutStartedAt > BILLING_CHECKOUT_SYNC_WINDOW_MS;
    if (hasPendingWindowExpired) {
      setPendingCheckoutKey(null);
      setCheckoutStartedAt(null);
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshProfile();
    }, BILLING_PENDING_POLL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [checkoutStartedAt, pendingCheckoutKey, refreshProfile]);

  const handleOpenRazorpayCheckout = async (planId: "pro", interval: BillingInterval) => {
    const requestKey = `${planId}-${interval}`;
    setBusyKey(requestKey);
    setMessage(null);
    setError(null);

    try {
      await ensureRazorpayCheckoutLoaded();
      const result = await createRazorpayTestSubscription(planId, interval);
      setPendingCheckoutKey(requestKey);
      setCheckoutStartedAt(Date.now());

      const checkout = new window.Razorpay!({
        key: result.keyId,
        subscription_id: result.subscriptionId,
        name: result.name,
        description: result.description,
        prefill: result.prefill,
        notes: result.notes,
        theme: {
          color: "#2563eb",
        },
        handler: (paymentResponse) => {
          void handleRazorpayPaymentVerified(paymentResponse, requestKey);
        },
        modal: {
          ondismiss: () => {
            setBusyKey(null);
            setMessage("Razorpay checkout was closed before payment completion.");
          },
        },
      });

      checkout.open();
      setMessage("Opened Razorpay test checkout. Complete payment to unlock your plan.");
      setBusyKey(null);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Failed to create the Razorpay checkout."
      );
      setPendingCheckoutKey(null);
      setCheckoutStartedAt(null);
      setBusyKey(null);
    }
  };

  const handleRazorpayPaymentVerified = async (
    paymentResponse: RazorpayPaymentResponse,
    requestKey: string
  ) => {
    setBusyKey(requestKey);
    setMessage("Verifying Razorpay payment...");
    setError(null);

    try {
      await verifyRazorpayTestPayment(paymentResponse);
      await refreshProfile();
      setMessage("Payment verified. Your Cluegent plan is active.");
      setPendingCheckoutKey(null);
      setCheckoutStartedAt(null);
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "Razorpay payment verification failed."
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleResetToFree = async () => {
    setBusyKey("reset");
    setMessage(null);
    setError(null);

    try {
      await resetTestSubscription();
      await refreshProfile();
      setMessage("Reset the current user back to the free entitlement.");
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Failed to reset the free entitlement."
      );
    } finally {
      setBusyKey(null);
    }
  };

  const isSandboxEntitlement =
    subscription?.providerMode === "test" || subscription?.isTestEntitlement === true;

  const visiblePaidCards = useMemo(
    () =>
      CHECKOUT_CARDS.filter(
        (plan): plan is CheckoutCard & { id: "pro" } =>
          plan.id === "pro" && plan.interval === selectedInterval
      ),
    [selectedInterval]
  );

  useEffect(() => {
    if (subscription?.billingInterval) {
      setSelectedInterval(subscription.billingInterval);
    }
  }, [subscription?.billingInterval]);

  useEffect(() => {
    if (!pendingCheckoutKey || !subscription) {
      return;
    }

    const [planId, interval] = pendingCheckoutKey.split("-");
    if (subscription.plan === planId && subscription.billingInterval === interval) {
      setPendingCheckoutKey(null);
      setCheckoutStartedAt(null);
    }
  }, [pendingCheckoutKey, subscription]);

  return (
    <div className="space-y-6 animated fadeIn">
      <section className="space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex rounded-2xl border border-white/10 bg-bg-card p-1 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.85)]">
            {(["month", "year"] as BillingInterval[]).map((interval) => {
              const isSelected = selectedInterval === interval;

              return (
                <button
                  key={interval}
                  type="button"
                  onClick={() => {
                    setSelectedInterval(interval);
                  }}
                  className={`min-w-[124px] rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                    isSelected
                      ? "bg-violet-500 text-white shadow-[0_14px_30px_-18px_rgba(139,92,246,0.95)]"
                      : "text-text-secondary hover:text-white"
                  }`}
                >
                  {interval === "month" ? "Monthly" : "Yearly"}
                </button>
              );
            })}
          </div>

          <p className="max-w-[74ch] text-sm leading-6 text-text-secondary">
            Choose a plan to unlock Cluegent. Checkout opens in Razorpay test mode and the app
            updates automatically after Firebase verifies the payment and receives webhooks.
          </p>
        </div>

        <div className="space-y-4">
          <div className="mx-auto grid w-full max-w-[980px] gap-4 lg:grid-cols-2">
            {visiblePaidCards.map((plan) => {
              const accent = getAccentClasses(plan.accent);
              const cardKey = `${plan.id}-${plan.interval}`;
              const isBusy = busyKey === cardKey;
              const isActive =
                subscription?.plan === plan.id && subscription?.billingInterval === plan.interval;

              return (
                <article
                  key={cardKey}
                  className={`relative flex min-h-[520px] flex-col overflow-hidden rounded-[28px] border bg-bg-card p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.85)] ${accent.border}`}
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.glow}`} />

                  <div className="relative">
                    <div
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${accent.badge}`}
                    >
                      <Sparkles size={12} />
                      {plan.eyebrow}
                    </div>

                    <h4 className="mt-4 text-[2.65rem] font-semibold leading-none tracking-[-0.05em] text-text-primary">
                      {plan.name}
                    </h4>
                    <p className="mt-2 text-sm font-medium uppercase tracking-[0.16em] text-text-tertiary">
                      {selectedInterval === "month" ? "Billed monthly" : "Billed yearly"}
                    </p>
                    <p className="mt-4 max-w-[28ch] text-sm leading-6 text-text-secondary">
                      {plan.tagline}
                    </p>
                  </div>

                  <div className="relative mt-6 space-y-3 text-sm text-text-primary">
                    {plan.highlights.map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <span className={`mt-[7px] h-1.5 w-1.5 rounded-full ${accent.bullet}`} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="relative mt-6 flex flex-wrap gap-2 text-xs text-text-secondary">
                    <span className="rounded-full border border-border-subtle px-3 py-1.5">
                      {formatDuration(plan.sttSecondsLimit)} STT
                    </span>
                    <span className="rounded-full border border-border-subtle px-3 py-1.5">
                      {plan.promptLimit} prompts
                    </span>
                    <span className="rounded-full border border-border-subtle px-3 py-1.5">
                      {plan.screenshotLimit} screenshots
                    </span>
                  </div>

                  <div className="relative mt-auto pt-8">
                    <button
                      type="button"
                      onClick={() => {
                        void handleOpenRazorpayCheckout(plan.id, plan.interval);
                      }}
                      disabled={isBusy || isActive}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        isActive
                          ? "border border-emerald-500/30 bg-emerald-500/12 text-emerald-300"
                          : accent.button
                      } ${isBusy ? "opacity-70" : ""}`}
                    >
                      {isBusy ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Opening
                        </>
                      ) : isActive ? (
                        "Current Plan"
                      ) : (
                        <>
                          Upgrade
                          <ExternalLink size={15} />
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <article className="mx-auto flex min-h-[420px] w-full max-w-[980px] flex-col rounded-[28px] border border-border-subtle bg-bg-card p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.85)]">
            <div>
              <p className="text-sm font-semibold text-text-secondary">{FREE_PLAN_CARD.eyebrow}</p>
              <h4 className="mt-3 text-[2.85rem] font-semibold leading-none tracking-[-0.05em] text-text-primary">
                {FREE_PLAN_CARD.name}
              </h4>
              <p className="mt-4 max-w-[42ch] text-sm leading-6 text-text-secondary">
                {FREE_PLAN_CARD.tagline}
              </p>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
              <div className="space-y-3 text-sm text-text-primary">
                {FREE_PLAN_CARD.highlights.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-text-secondary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-text-secondary md:justify-end">
                <span className="rounded-full border border-border-subtle px-3 py-1.5">
                  {formatDuration(FREE_PLAN_CARD.sttSecondsLimit)} STT
                </span>
                <span className="rounded-full border border-border-subtle px-3 py-1.5">
                  {FREE_PLAN_CARD.promptLimit} prompts
                </span>
                <span className="rounded-full border border-border-subtle px-3 py-1.5">
                  {FREE_PLAN_CARD.screenshotLimit} screenshots
                </span>
              </div>
            </div>

            <div className="mt-auto pt-8">
              <div
                className={`inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  subscription?.plan === "free"
                    ? "border border-emerald-500/30 bg-emerald-500/12 text-emerald-300"
                    : "border border-border-subtle bg-black/25 text-text-secondary"
                }`}
              >
                {subscription?.plan === "free" ? "Current Plan" : "Trial Access"}
              </div>
            </div>
          </article>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr,auto] xl:items-center">
          <div className="rounded-[24px] border border-border-subtle bg-bg-card p-4 text-sm leading-6 text-text-secondary">
            <span className="font-medium text-text-primary">Test billing flow:</span> Google
            sign-in identifies the user, Razorpay subscription checkout is created from Firebase,
            payment signatures are verified server-side, webhooks are deduplicated, and LLM/STT
            usage unlocks from Firestore billing state.
          </div>

          {isSandboxEntitlement && (
            <button
              type="button"
              onClick={() => {
                void handleResetToFree();
              }}
              disabled={busyKey === "reset"}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/15 disabled:opacity-70"
            >
              {busyKey === "reset" ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Resetting
                </>
              ) : (
                <>
                  <RotateCcw size={15} />
                  Reset to free
                </>
              )}
            </button>
          )}
        </div>

        {message && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 size={16} />
            {message}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <Activity size={16} />
            {error}
          </div>
        )}
      </section>
    </div>
  );
};
