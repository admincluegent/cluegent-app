import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  createRazorpayTestSubscription,
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
  price: string;
  priceSuffix: string;
  savings?: string;
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
    eyebrow: "Pro",
    price: "$39",
    priceSuffix: "/month",
    tagline: "For regular meetings, coding interviews, and real-time assistant support.",
    sttSecondsLimit: 108000,
    promptLimit: 5000,
    screenshotLimit: 2500,
    highlights: [
      "Undetectability - Cluegent stays invisible during screen sharing",
      "30 hours listening",
      "5,000 AI requests",
      "2,500 screenshot analyses",
      "Real-time assistant",
      "Coding + meeting support",
    ],
  },
  {
    id: "pro",
    interval: "year",
    name: "Pro",
    accent: "sky",
    eyebrow: "Pro",
    price: "$349",
    priceSuffix: "/year",
    savings: "Save $119",
    tagline: "Annual Pro access with the same core assistant limits at a lower yearly price.",
    sttSecondsLimit: 108000,
    promptLimit: 5000,
    screenshotLimit: 2500,
    highlights: [
      "Undetectability - Cluegent stays invisible during screen sharing",
      "30 hours/month listening",
      "5,000 AI requests/month",
      "2,500 screenshot analyses/month",
      "Real-time assistant",
      "Coding + meeting support",
    ],
  },
  {
    id: "power",
    interval: "month",
    name: "Power",
    accent: "violet",
    eyebrow: "Most Popular",
    price: "$69",
    priceSuffix: "/month",
    tagline: "For heavy users who need more assistant capacity and faster responses.",
    sttSecondsLimit: 180000,
    promptLimit: 10000,
    screenshotLimit: 5000,
    highlights: [
      "Undetectability - Cluegent stays invisible during screen sharing",
      "50 hours listening",
      "10,000 AI requests",
      "5,000 screenshot analyses",
      "Faster responses",
      "Priority processing",
    ],
  },
  {
    id: "power",
    interval: "year",
    name: "Power",
    accent: "violet",
    eyebrow: "Most Popular",
    price: "$649",
    priceSuffix: "/year",
    savings: "Save $179",
    tagline: "Annual Power access for high-volume meetings, coding support, and screenshots.",
    sttSecondsLimit: 180000,
    promptLimit: 10000,
    screenshotLimit: 5000,
    highlights: [
      "Undetectability - Cluegent stays invisible during screen sharing",
      "50 hours/month listening",
      "10,000 AI requests/month",
      "5,000 screenshot analyses/month",
      "Faster responses",
      "Priority processing",
    ],
  },
];

const FREE_PLAN_CARD = {
  id: "free" as const,
  name: "Free",
  eyebrow: "Free Trial",
  tagline: "Limited usage.",
  sttSecondsLimit: 1800,
  promptLimit: 50,
  screenshotLimit: 20,
  highlights: [
    "30 min listening",
    "50 AI requests",
    "20 screenshot analyses",
    "Limited usage",
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
        "border-white/25 bg-white/[0.18] text-white shadow-[0_18px_55px_-35px_rgba(255,255,255,0.9)]",
      button:
        "border border-white/25 bg-white text-slate-950 shadow-[0_18px_45px_-24px_rgba(255,255,255,0.9)] hover:bg-white/90",
      card: "bg-gradient-to-br from-amber-300 via-orange-500 to-red-600",
      glow: "from-white/[0.24] via-white/[0.08] to-transparent",
      bullet: "text-emerald-300",
    };
  }

  return {
    border: "border-violet-400/30",
    badge:
      "border-white/25 bg-white/[0.18] text-white shadow-[0_18px_55px_-35px_rgba(255,255,255,0.9)]",
    button:
      "border border-white/25 bg-white text-slate-950 shadow-[0_18px_45px_-24px_rgba(255,255,255,0.9)] hover:bg-white/90",
    card: "bg-gradient-to-br from-slate-800 via-slate-700 to-zinc-600",
    glow: "from-white/[0.24] via-white/[0.08] to-transparent",
    bullet: "text-emerald-300",
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

  const handleOpenRazorpayCheckout = async (planId: "pro" | "power", interval: BillingInterval) => {
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

  const visiblePaidCards = useMemo(
    () =>
      CHECKOUT_CARDS.filter(
        (plan) => plan.interval === selectedInterval && (plan.id === "pro" || plan.id === "power")
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
    <div className="-m-6 min-h-full bg-white p-6 text-slate-950 animated fadeIn">
      <section className="space-y-5">
        <div className="flex flex-col items-center gap-4 text-center">
          <div>
            <h2 className="text-[2.75rem] font-semibold leading-none tracking-[-0.06em] text-slate-950">
              Choose your plan
            </h2>
            <p className="mt-3 text-base font-medium text-slate-500">
              Choose a plan to unlock Cluegent
            </p>
          </div>

          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.35)]">
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
                      ? interval === "month"
                        ? "bg-gradient-to-r from-amber-300 via-orange-500 to-red-600 text-white shadow-[0_14px_30px_-18px_rgba(249,115,22,0.65)]"
                        : "bg-gradient-to-r from-slate-800 via-slate-700 to-zinc-600 text-white shadow-[0_14px_30px_-18px_rgba(24,24,27,0.65)]"
                      : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  {interval === "month" ? "Monthly" : "Yearly (Save 20%)"}
                </button>
              );
            })}
          </div>

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
                  className={`relative flex min-h-[520px] flex-col overflow-hidden rounded-[28px] border p-6 text-white shadow-[0_28px_90px_-45px_rgba(15,23,42,0.95)] ${accent.card} ${accent.border}`}
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.glow}`} />

                  <div className="relative">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="text-[2.25rem] font-semibold leading-none tracking-[-0.05em] text-white">
                        {plan.name}
                      </h4>
                      {plan.id === "power" && (
                        <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                          Popular
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-end gap-2">
                      <span className="text-[2.65rem] font-semibold leading-none tracking-[-0.06em] text-white">
                        {plan.price}
                      </span>
                      <span className="pb-1 text-base font-medium text-white/85">
                        {plan.priceSuffix}
                      </span>
                      {plan.savings && (
                        <span className="mb-1 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
                          {plan.savings}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative mt-6 space-y-3 text-sm text-text-primary">
                    {plan.highlights.map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <Check size={16} className={`mt-0.5 shrink-0 ${accent.bullet}`} />
                        <span className="text-slate-100">{item}</span>
                      </div>
                    ))}
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
                          ? "border border-white/80 bg-white/10 text-white"
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
                        "Upgrade"
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <article className="mx-auto flex w-full max-w-[980px] flex-col rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-58px_rgba(15,23,42,0.45)]">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="max-w-[280px]">
                <p className="text-sm font-semibold text-slate-500">{FREE_PLAN_CARD.eyebrow}</p>
                <h4 className="mt-2 text-[2.85rem] font-semibold leading-none tracking-[-0.05em] text-slate-950">
                  {FREE_PLAN_CARD.name}
                </h4>
                <p className="mt-3 text-sm leading-6 text-slate-500">{FREE_PLAN_CARD.tagline}</p>
                <div
                  className={`mt-4 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    subscription?.plan === "free"
                      ? "border border-emerald-500/30 bg-emerald-500/12 text-emerald-300"
                      : "border border-border-subtle bg-black/25 text-text-secondary"
                  }`}
                >
                  {subscription?.plan === "free" ? "Current Plan" : "Trial Access"}
                </div>
              </div>

              <div className="mt-2 grid max-w-[440px] grid-cols-1 gap-x-8 gap-y-3 text-sm text-slate-800 sm:grid-cols-2 md:mt-6">
                {FREE_PLAN_CARD.highlights.map((item) => (
                  <div key={item} className="flex items-start gap-3 font-medium">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
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
