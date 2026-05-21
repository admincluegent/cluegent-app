import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  createRazorpayLiveOrder,
  createRazorpayLiveTestOrder,
  createRazorpayTestSubscription,
  verifyRazorpayLiveOrderPayment,
  verifyRazorpayLiveTestOrderPayment,
  verifyRazorpayTestPayment,
} from "@/services/backendApi";
import { useAuth } from "@/contexts/auth.context";
import type { BillingInterval } from "@/types/firebase";

const BILLING_CHECKOUT_SYNC_WINDOW_MS = 60_000;
const BILLING_PENDING_POLL_MS = 4_000;
const RAZORPAY_CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const LIVE_TEST_PLAN_DURATION_MINUTES = 30;

type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id?: string;
  razorpay_order_id?: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  subscription_id?: string;
  order_id?: string;
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
  id: "livetest" | "pro" | "power";
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

type BillingProviderMode = "test" | "live";

const LIVE_TEST_CARD: CheckoutCard = {
  id: "livetest",
  interval: "month",
  name: "Live Test",
  accent: "sky",
  eyebrow: "Live payment test",
  price: "₹5",
  priceSuffix: "/test",
  tagline: "Temporary live payment plan for verifying Razorpay success, expiry, and cancellation.",
  sttSecondsLimit: 1800,
  promptLimit: 200,
  screenshotLimit: 200,
  highlights: [
    "Live Razorpay payment",
    "Expires after 30 minutes",
    "Returns to free trial automatically",
    "Use for payment flow testing",
  ],
};

const CHECKOUT_CARDS: CheckoutCard[] = [
  {
    id: "pro",
    interval: "month",
    name: "Pro",
    accent: "sky",
    eyebrow: "Pro",
    price: "₹3,499",
    priceSuffix: "/month",
    tagline: "For regular meetings, technical conversations, and real-time assistant support.",
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
    price: "₹2,916",
    priceSuffix: "/month, billed yearly",
    savings: "Save ₹6,998",
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
    price: "₹6,499",
    priceSuffix: "/month",
    tagline: "For heavy users who need more assistant capacity and faster responses.",
    sttSecondsLimit: 180000,
    promptLimit: Number.MAX_SAFE_INTEGER,
    screenshotLimit: Number.MAX_SAFE_INTEGER,
    highlights: [
      "Undetectability - Cluegent stays invisible during screen sharing",
      "50 hours listening",
      "Unlimited AI requests",
      "Unlimited screenshot analyses",
      "Real-time assistant",
      "Coding + meeting support",
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
    price: "₹5,416",
    priceSuffix: "/month, billed yearly",
    savings: "Save ₹12,998",
    tagline: "Annual Power access for high-volume meetings, coding support, and screenshots.",
    sttSecondsLimit: 180000,
    promptLimit: Number.MAX_SAFE_INTEGER,
    screenshotLimit: Number.MAX_SAFE_INTEGER,
    highlights: [
      "Undetectability - Cluegent stays invisible during screen sharing",
      "50 hours/month listening",
      "Unlimited AI requests/month",
      "Unlimited screenshot analyses/month",
      "Real-time assistant",
      "Coding + meeting support",
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
  promptLimit: 20,
  screenshotLimit: 20,
  highlights: [
    "30 min listening",
    "20 AI requests",
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

export const BillingSettings: React.FC = () => {
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

  const handleOpenRazorpayCheckout = async (
    planId: "livetest" | "pro" | "power",
    interval: BillingInterval,
    providerMode: BillingProviderMode = "test"
  ) => {
    const requestKey = `${providerMode}-${planId}-${interval}`;
    setBusyKey(requestKey);
    setMessage(null);
    setError(null);

    try {
      await ensureRazorpayCheckoutLoaded();
      const result =
        providerMode === "live"
          ? planId === "livetest"
            ? await createRazorpayLiveTestOrder()
            : await createRazorpayLiveOrder(planId, interval, "INR")
          : await createRazorpayTestSubscription(planId as "pro" | "power", interval);
      setPendingCheckoutKey(requestKey);
      setCheckoutStartedAt(Date.now());

      const checkoutOptions: RazorpayCheckoutOptions = {
        key: result.keyId,
        name: result.name,
        description: result.description,
        prefill: result.prefill,
        notes: result.notes,
        theme: {
          color: "#2563eb",
        },
        handler: (paymentResponse) => {
          void handleRazorpayPaymentVerified(paymentResponse, requestKey, providerMode);
        },
        modal: {
          ondismiss: () => {
            setBusyKey(null);
            setMessage("Razorpay checkout was closed before payment completion.");
          },
        },
      };

      if ("orderId" in result) {
        checkoutOptions.order_id = result.orderId;
      } else {
        checkoutOptions.subscription_id = result.subscriptionId;
      }

      const checkout = new window.Razorpay!(checkoutOptions);

      checkout.open();
      setMessage(
        providerMode === "live"
          ? "Opened Razorpay live checkout. Complete payment to unlock your plan."
          : "Opened Razorpay test checkout. Complete payment to unlock your plan."
      );
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
    requestKey: string,
    providerMode: BillingProviderMode
  ) => {
    setBusyKey(requestKey);
    setMessage("Verifying Razorpay payment...");
    setError(null);

    try {
      if (providerMode === "live") {
        if (!paymentResponse.razorpay_order_id) {
          throw new Error("Razorpay order id was missing from the payment response.");
        }

        const verifyLiveOrder =
          requestKey === "live-livetest-month"
            ? verifyRazorpayLiveTestOrderPayment
            : verifyRazorpayLiveOrderPayment;

        await verifyLiveOrder({
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_signature: paymentResponse.razorpay_signature,
        });
      } else {
        if (!paymentResponse.razorpay_subscription_id) {
          throw new Error("Razorpay subscription id was missing from the payment response.");
        }

        await verifyRazorpayTestPayment({
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_subscription_id: paymentResponse.razorpay_subscription_id,
          razorpay_signature: paymentResponse.razorpay_signature,
        });
      }
      await refreshProfile();
      setMessage(
        requestKey === "live-livetest-month"
          ? `Payment verified. Live Test is active for ${LIVE_TEST_PLAN_DURATION_MINUTES} minutes.`
          : "Payment verified. Your Cluegent plan is active."
      );
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

    const [, planId, interval] = pendingCheckoutKey.split("-");
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
          <article className="mx-auto flex w-full max-w-[980px] flex-col overflow-hidden rounded-[28px] border border-emerald-400/30 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-6 text-white shadow-[0_28px_90px_-45px_rgba(15,118,110,0.75)]">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
                  {LIVE_TEST_CARD.eyebrow}
                </p>
                <h4 className="mt-2 text-[2.25rem] font-semibold leading-none tracking-[-0.05em] text-white">
                  {LIVE_TEST_CARD.name}
                </h4>
                <p className="mt-3 max-w-[520px] text-sm leading-6 text-white/80">
                  {LIVE_TEST_CARD.tagline}
                </p>
                <div className="mt-5 flex flex-wrap items-end gap-2">
                  <span className="text-[2.65rem] font-semibold leading-none tracking-[-0.06em] text-white">
                    {LIVE_TEST_CARD.price}
                  </span>
                  <span className="pb-1 text-base font-medium text-white/85">
                    {LIVE_TEST_CARD.priceSuffix}
                  </span>
                  <span className="mb-1 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
                    {LIVE_TEST_PLAN_DURATION_MINUTES} min access
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handleOpenRazorpayCheckout("livetest", "month", "live");
                }}
                disabled={busyKey === "live-livetest-month" || subscription?.plan === "livetest"}
                className={`inline-flex min-w-[220px] items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_-24px_rgba(255,255,255,0.9)] transition hover:bg-white/90 ${
                  busyKey === "live-livetest-month" ? "opacity-70" : ""
                }`}
              >
                {busyKey === "live-livetest-month" ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Opening
                  </>
                ) : subscription?.plan === "livetest" ? (
                  "Live Test Active"
                ) : (
                  "Test Live Payment"
                )}
              </button>
            </div>
          </article>

          <div className="mx-auto grid w-full max-w-[980px] gap-4 lg:grid-cols-2">
            {visiblePaidCards.map((plan) => {
              const accent = getAccentClasses(plan.accent);
              const cardKey = `${plan.id}-${plan.interval}`;
              const liveCardKey = `live-${cardKey}`;
              const isBusy = busyKey === cardKey || busyKey === liveCardKey;
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
                      <span className="text-[2.15rem] font-semibold leading-none tracking-[-0.04em] text-white sm:text-[2.35rem]">
                        {plan.interval === "year" ? (
                          <>
                            {plan.price}
                            <span className="ml-1 text-sm font-medium tracking-normal text-white/85">
                              /month
                            </span>
                          </>
                        ) : (
                          plan.price
                        )}
                      </span>
                      {plan.interval === "month" && (
                        <span className="whitespace-nowrap pb-0.5 text-sm font-medium leading-snug text-white/85">
                          {plan.priceSuffix}
                        </span>
                      )}
                      {plan.interval === "year" && (
                        <span className="mb-1 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
                          billed yearly
                        </span>
                      )}
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
                        void handleOpenRazorpayCheckout(plan.id, plan.interval, "live");
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
