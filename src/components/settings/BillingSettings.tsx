import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Check,
  Loader2,
} from "lucide-react";
import {
  createRazorpayLiveOrder,
  createRazorpayTestSubscription,
  getLiveBillingPlans,
  verifyRazorpayLiveOrderPayment,
  verifyRazorpayTestPayment,
} from "@/services/backendApi";
import { useAuth } from "@/contexts/auth.context";
import { FEATURES } from "@/lib/featureFlags";
import type { BillingCurrency, LiveBillingPlanPrice } from "@/types/backend";
import type { BillingInterval } from "@/types/firebase";

const BILLING_CHECKOUT_SYNC_WINDOW_MS = 60_000;
const BILLING_PENDING_POLL_MS = 4_000;
const RAZORPAY_CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const UNLIMITED_USAGE_LIMIT = Number.MAX_SAFE_INTEGER;

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
  id: "plus" | "pro" | "power";
  interval: BillingInterval;
  name: string;
  accent: "emerald" | "sky" | "violet";
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

const CHECKOUT_CARDS: CheckoutCard[] = [
  {
    id: "plus",
    interval: "month",
    name: "Plus",
    accent: "emerald",
    eyebrow: "Plus",
    price: "₹999",
    priceSuffix: "/month",
    tagline: "For focused interview preparation with more listening and screenshot capacity.",
    sttSecondsLimit: 36000,
    promptLimit: 1000,
    screenshotLimit: 1000,
    highlights: [
      "Undetectability - Cluegent stays invisible during screen sharing",
      "10 hours listening",
      "1,000 AI requests",
      "1,000 screenshot analyses",
      "Real-time assistant",
      "Coding + meeting support",
    ],
  },
  {
    id: "plus",
    interval: "year",
    name: "Plus",
    accent: "emerald",
    eyebrow: "Plus",
    price: "₹833",
    priceSuffix: "/month, billed yearly",
    savings: "Save ₹1,998",
    tagline: "Annual Plus access for steady interview prep at a lower yearly price.",
    sttSecondsLimit: 36000,
    promptLimit: 1000,
    screenshotLimit: 1000,
    highlights: [
      "Undetectability - Cluegent stays invisible during screen sharing",
      "10 hours/month listening",
      "1,000 AI requests/month",
      "1,000 screenshot analyses/month",
      "Real-time assistant",
      "Coding + meeting support",
    ],
  },
  {
    id: "pro",
    interval: "month",
    name: "Pro",
    accent: "sky",
    eyebrow: "Most Popular",
    price: "₹2,499",
    priceSuffix: "/month",
    tagline: "For regular meetings, technical conversations, and real-time assistant support.",
    sttSecondsLimit: UNLIMITED_USAGE_LIMIT,
    promptLimit: UNLIMITED_USAGE_LIMIT,
    screenshotLimit: UNLIMITED_USAGE_LIMIT,
    highlights: [
      "Undetectability - Cluegent stays invisible during screen sharing",
      "Unlimited listening",
      "Unlimited AI requests",
      "Unlimited screenshot analyses",
      "Real-time assistant",
      "Coding + meeting support",
    ],
  },
  {
    id: "pro",
    interval: "year",
    name: "Pro",
    accent: "sky",
    eyebrow: "Most Popular",
    price: "₹2,083",
    priceSuffix: "/month, billed yearly",
    savings: "Save ₹4,998",
    tagline: "Annual Pro access with the same core assistant limits at a lower yearly price.",
    sttSecondsLimit: UNLIMITED_USAGE_LIMIT,
    promptLimit: UNLIMITED_USAGE_LIMIT,
    screenshotLimit: UNLIMITED_USAGE_LIMIT,
    highlights: [
      "Undetectability - Cluegent stays invisible during screen sharing",
      "Unlimited listening",
      "Unlimited AI requests",
      "Unlimited screenshot analyses",
      "Real-time assistant",
      "Coding + meeting support",
    ],
  },
  {
    id: "power",
    interval: "month",
    name: "Power",
    accent: "violet",
    eyebrow: "Power",
    price: "₹6,499",
    priceSuffix: "/month",
    tagline: "For heavy users who need more assistant capacity and faster responses.",
    sttSecondsLimit: UNLIMITED_USAGE_LIMIT,
    promptLimit: UNLIMITED_USAGE_LIMIT,
    screenshotLimit: UNLIMITED_USAGE_LIMIT,
    highlights: [
      "Undetectability - Cluegent stays invisible during screen sharing",
      "Unlimited listening",
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
    eyebrow: "Power",
    price: "₹5,416",
    priceSuffix: "/month, billed yearly",
    savings: "Save ₹12,998",
    tagline: "Annual Power access for high-volume meetings, coding support, and screenshots.",
    sttSecondsLimit: UNLIMITED_USAGE_LIMIT,
    promptLimit: UNLIMITED_USAGE_LIMIT,
    screenshotLimit: UNLIMITED_USAGE_LIMIT,
    highlights: [
      "Undetectability - Cluegent stays invisible during screen sharing",
      "Unlimited listening/month",
      "Unlimited AI requests/month",
      "Unlimited screenshot analyses/month",
      "Real-time assistant",
      "Coding + meeting support",
      "Faster responses",
      "Priority processing",
    ],
  },
];

const USD_CHECKOUT_PRICING: Record<
  "plus" | "pro" | "power",
  Record<BillingInterval, { price: string; savings?: string }>
> = {
  plus: {
    month: {
      price: "$12",
    },
    year: {
      price: "$10",
      savings: "Save $24",
    },
  },
  pro: {
    month: {
      price: "$29",
    },
    year: {
      price: "$24.17",
      savings: "Save $58",
    },
  },
  power: {
    month: {
      price: "$69",
    },
    year: {
      price: "$57.50",
      savings: "Save $138",
    },
  },
};

const FREE_PLAN_CARD = {
  id: "free" as const,
  name: "Free",
  eyebrow: "Free Trial",
  tagline: "Limited usage.",
  sttSecondsLimit: 720,
  promptLimit: Number.MAX_SAFE_INTEGER,
  screenshotLimit: Number.MAX_SAFE_INTEGER,
  highlights: [
    "12 min total Cluegent usage",
    "Try live answers",
    "Try screenshot analysis",
    "Subscribe to continue",
  ],
};

function isCheckoutCardEnabled(plan: CheckoutCard) {
  return FEATURES.POWER_YEARLY_ENABLED || plan.id !== "power" || plan.interval !== "year";
}

function getCheckoutPricingKey(
  planId: "plus" | "pro" | "power",
  interval: BillingInterval,
  currency: BillingCurrency
) {
  return `${currency}-${planId}-${interval}`;
}

function indexLivePricing(prices: LiveBillingPlanPrice[]) {
  return prices.reduce<Record<string, LiveBillingPlanPrice>>((indexed, price) => {
    indexed[getCheckoutPricingKey(price.planId, price.interval, price.currency)] = price;
    return indexed;
  }, {});
}

function getFallbackCheckoutCardPricing(plan: CheckoutCard, currency: BillingCurrency) {
  if (currency === "INR") {
    return {
      price: plan.price,
      savings: plan.savings,
    };
  }

  return USD_CHECKOUT_PRICING[plan.id][plan.interval];
}

function getCheckoutCardPricing(
  plan: CheckoutCard,
  currency: BillingCurrency,
  livePricingByKey: Record<string, LiveBillingPlanPrice>
) {
  const livePricing = livePricingByKey[getCheckoutPricingKey(plan.id, plan.interval, currency)];

  if (livePricing) {
    return {
      price: livePricing.displayMonthlyPrice,
      savings: livePricing.savingsLabel,
    };
  }

  return getFallbackCheckoutCardPricing(plan, currency);
}

function getOfferOriginalPrice(displayPrice: string) {
  const parsed = displayPrice.match(/^([₹$])\s?([\d,]+)$/);

  if (!parsed) {
    return null;
  }

  const [, symbol, amountText] = parsed;
  const amount = Number(amountText.replace(/,/g, ""));

  if (!Number.isFinite(amount)) {
    return null;
  }

  return `${symbol}${Math.round(amount * 2).toLocaleString("en-US")}`;
}

function BillingCurrencyFlag({ currency }: { currency: BillingCurrency }) {
  if (currency === "INR") {
    return (
      <span
        aria-hidden="true"
        className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full border border-slate-300/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.18)]"
      >
        <span className="absolute inset-x-0 top-0 h-1/3 bg-orange-500" />
        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-emerald-600" />
        <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-700" />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full border border-slate-300/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.18)]"
    >
      <span className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,#b91c1c_0,#b91c1c_1.25px,#fff_1.25px,#fff_2.5px)]" />
      <span className="absolute left-0 top-0 h-[8px] w-[8px] bg-blue-900" />
    </span>
  );
}

function getAccentClasses(accent: CheckoutCard["accent"]) {
  if (accent === "emerald") {
    return {
      border: "border-emerald-400",
      badge:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
      button:
        "border border-slate-300 bg-white text-slate-950 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.35)] hover:border-emerald-500 hover:bg-emerald-50",
      card: "bg-white",
      glow: "from-transparent via-transparent to-transparent",
      bullet: "text-emerald-500",
    };
  }

  if (accent === "sky") {
    return {
      border: "border-orange-400",
      badge:
        "border-orange-200 bg-orange-50 text-orange-700",
      button:
        "border border-slate-300 bg-white text-slate-950 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.35)] hover:border-orange-500 hover:bg-orange-50",
      card: "bg-white",
      glow: "from-transparent via-transparent to-transparent",
      bullet: "text-orange-500",
    };
  }

  return {
    border: "border-slate-500",
    badge:
      "border-slate-300 bg-slate-100 text-slate-700",
    button:
      "border border-slate-300 bg-white text-slate-950 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.35)] hover:border-slate-700 hover:bg-slate-50",
    card: "bg-white",
    glow: "from-transparent via-transparent to-transparent",
    bullet: "text-slate-600",
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
  const [selectedCurrency, setSelectedCurrency] = useState<BillingCurrency>("INR");
  const [livePricingByKey, setLivePricingByKey] = useState<
    Record<string, LiveBillingPlanPrice>
  >({});

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
    let isMounted = true;

    getLiveBillingPlans()
      .then((pricing) => {
        if (isMounted) {
          setLivePricingByKey(indexLivePricing(pricing.prices));
        }
      })
      .catch((pricingError) => {
        console.warn("Failed to load live billing pricing; using bundled fallback.", pricingError);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
    planId: "plus" | "pro" | "power",
    interval: BillingInterval,
    providerMode: BillingProviderMode = "test"
  ) => {
    if (!FEATURES.POWER_YEARLY_ENABLED && planId === "power" && interval === "year") {
      setMessage(null);
      setError("Power yearly checkout is temporarily unavailable. Please choose Power monthly or contact support for manual yearly billing.");
      return;
    }

    const requestKey = `${providerMode}-${planId}-${interval}`;
    setBusyKey(requestKey);
    setMessage(null);
    setError(null);

    try {
      await ensureRazorpayCheckoutLoaded();
      const result =
        providerMode === "live"
          ? await createRazorpayLiveOrder(planId, interval, selectedCurrency)
          : await createRazorpayTestSubscription(planId, interval);
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

        await verifyRazorpayLiveOrderPayment({
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
        (plan) =>
          plan.interval === selectedInterval &&
          isCheckoutCardEnabled(plan)
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
      <section className="space-y-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-full max-w-[1120px]">
            <h2 className="text-[2.45rem] font-semibold leading-none tracking-[-0.055em] text-slate-950">
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
          <div className="mx-auto flex w-full max-w-[1120px] justify-end">
            <div className="inline-flex rounded-[18px] border border-slate-200 bg-slate-100/90 p-0.5 shadow-[0_14px_38px_-30px_rgba(15,23,42,0.35)]">
              {(["INR", "USD"] as BillingCurrency[]).map((currency) => {
                const isSelected = selectedCurrency === currency;

                return (
                  <button
                    key={currency}
                    type="button"
                    onClick={() => {
                      setSelectedCurrency(currency);
                    }}
                    className={`min-w-[82px] rounded-[14px] px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                      isSelected
                        ? "bg-white text-slate-950 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.42)]"
                        : "text-slate-500 hover:text-slate-950"
                    }`}
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <BillingCurrencyFlag currency={currency} />
                      {currency}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[1120px] snap-x gap-3 overflow-x-auto pb-4 [-webkit-overflow-scrolling:touch]">
            {visiblePaidCards.map((plan) => {
              const accent = getAccentClasses(plan.accent);
              const pricing = getCheckoutCardPricing(
                plan,
                selectedCurrency,
                livePricingByKey
              );
              const originalPrice = getOfferOriginalPrice(pricing.price);
              const cardKey = `${plan.id}-${plan.interval}`;
              const liveCardKey = `live-${cardKey}`;
              const isBusy = busyKey === cardKey || busyKey === liveCardKey;
              const isActive =
                subscription?.plan === plan.id && subscription?.billingInterval === plan.interval;
              const isPlusLimitReached =
                plan.id === "plus" &&
                planStatus?.plan === "plus" &&
                ((planStatus.remaining.prompts ?? 0) <= 0 ||
                  (planStatus.remaining.screenshots ?? 0) <= 0 ||
                  (planStatus.remaining.sttSeconds ?? 0) <= 0);
              const canBuyAgain = isActive && isPlusLimitReached;

              return (
                <article
                  key={cardKey}
                  className={`relative flex min-h-[430px] w-[252px] shrink-0 snap-start flex-col overflow-hidden rounded-[24px] border-2 p-5 text-slate-950 shadow-[0_22px_70px_-46px_rgba(15,23,42,0.45)] sm:w-[270px] ${accent.card} ${accent.border}`}
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.glow}`} />

                  <div className="relative">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-[1.45rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">
                        {plan.name}
                      </h4>
                      {(plan.id === "plus" || plan.id === "pro") && (
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${accent.badge}`}>
                          {plan.id === "pro" ? "Most Popular" : "Starter"}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {originalPrice && (
                        <span className="text-sm font-semibold leading-none text-slate-400 line-through decoration-slate-400 decoration-2">
                          {originalPrice}
                        </span>
                      )}
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.badge}`}>
                        50% off
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <span className="text-[1.5rem] font-semibold leading-none tracking-[-0.03em] text-slate-950 sm:text-[1.65rem]">
                        {plan.interval === "year" ? (
                          <>
                            {pricing.price}
                            <span className="ml-1 text-[11px] font-medium tracking-normal text-slate-500">
                              /month
                            </span>
                          </>
                        ) : (
                          pricing.price
                        )}
                      </span>
                      {plan.interval === "month" && (
                        <span className="whitespace-nowrap pb-0.5 text-[11px] font-medium leading-snug text-slate-500">
                          {plan.priceSuffix}
                        </span>
                      )}
                      {plan.interval === "year" && (
                        <span className={`mb-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${accent.badge}`}>
                          billed yearly
                        </span>
                      )}
                      {pricing.savings && (
                        <span className={`mb-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${accent.badge}`}>
                          {pricing.savings}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative mt-5 space-y-2.5 text-[13px] leading-5 text-slate-700">
                    {plan.highlights.map((item) => (
                      <div key={item} className="flex items-start gap-2.5">
                        <Check size={14} className={`mt-0.5 shrink-0 ${accent.bullet}`} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="relative mt-auto pt-6">
                    <button
                      type="button"
                      onClick={() => {
                        void handleOpenRazorpayCheckout(plan.id, plan.interval, "live");
                      }}
                      disabled={isBusy || (isActive && !canBuyAgain)}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-semibold transition ${
                        isActive && !canBuyAgain
                          ? "border border-slate-300 bg-slate-100 text-slate-600"
                          : accent.button
                      } ${isBusy ? "opacity-70" : ""}`}
                    >
                      {isBusy ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Opening
                        </>
                      ) : canBuyAgain ? (
                        "Buy again"
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
                <h4 className="mt-2 text-[2rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">
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
