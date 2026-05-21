import { createHmac, timingSafeEqual } from "node:crypto";
import type { PlanId } from "../config/plans.js";
import type { BillingInterval } from "../utils/usage.js";

const RAZORPAY_API_BASE_URL = "https://api.razorpay.com/v1";

export type PaidPlanId = Extract<PlanId, "livetest" | "pro" | "power">;
export type RazorpayProviderMode = "test" | "live";
export type RazorpayCurrency = "INR" | "USD";

export interface RazorpayTestPlanConfig {
  liveTestMonthly?: string;
  proMonthly: string;
  proYearly: string;
  powerMonthly: string;
  powerYearly: string;
}

export interface RazorpayLivePlanConfig {
  inr: RazorpayTestPlanConfig;
  usd?: RazorpayTestPlanConfig;
}

export interface CreateRazorpaySubscriptionInput {
  keyId: string;
  keySecret: string;
  planId: string;
  totalCount: number;
  uid: string;
  email: string;
  displayName: string;
  appPlanId: PaidPlanId;
  interval: BillingInterval;
  providerMode?: RazorpayProviderMode;
  currency?: RazorpayCurrency;
}

export interface RazorpaySubscriptionEntity {
  id?: string;
  entity?: "subscription";
  plan_id?: string;
  customer_id?: string | null;
  status?: string;
  current_start?: number | null;
  current_end?: number | null;
  ended_at?: number | null;
  charge_at?: number | null;
  start_at?: number | null;
  end_at?: number | null;
  notes?: Record<string, string>;
}

export interface RazorpayOrderEntity {
  id?: string;
  entity?: "order";
  amount?: number;
  amount_paid?: number;
  amount_due?: number;
  currency?: RazorpayCurrency;
  receipt?: string | null;
  status?: string;
  notes?: Record<string, string>;
}

export function parseAllowedEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function resolveRazorpayPlanId(
  planId: PaidPlanId,
  interval: BillingInterval,
  plans: RazorpayTestPlanConfig
) {
  if (planId === "pro" && interval === "month") {
    return plans.proMonthly;
  }

  if (planId === "livetest" && interval === "month") {
    return plans.liveTestMonthly ?? "";
  }

  if (planId === "pro" && interval === "year") {
    return plans.proYearly;
  }

  if (planId === "power" && interval === "month") {
    return plans.powerMonthly;
  }

  if (planId === "power" && interval === "year") {
    return plans.powerYearly;
  }

  return "";
}

export function resolvePlanFromRazorpayPlanId(
  planId: string,
  plans: RazorpayTestPlanConfig
): { planId: PaidPlanId; interval: BillingInterval } | null {
  if (planId === plans.proMonthly) {
    return { planId: "pro", interval: "month" };
  }

  if (plans.liveTestMonthly && planId === plans.liveTestMonthly) {
    return { planId: "livetest", interval: "month" };
  }

  if (planId === plans.proYearly) {
    return { planId: "pro", interval: "year" };
  }

  if (planId === plans.powerMonthly) {
    return { planId: "power", interval: "month" };
  }

  if (planId === plans.powerYearly) {
    return { planId: "power", interval: "year" };
  }

  return null;
}

export async function createRazorpayTestSubscription(
  input: CreateRazorpaySubscriptionInput
) {
  const providerMode = input.providerMode ?? "test";
  const response = await fetch(`${RAZORPAY_API_BASE_URL}/subscriptions`, {
    method: "POST",
    headers: {
      authorization: buildBasicAuthHeader(input.keyId, input.keySecret),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      plan_id: input.planId,
      total_count: input.totalCount,
      quantity: 1,
      customer_notify: 1,
      notes: {
        firebase_uid: input.uid,
        firebase_email: input.email,
        cluegent_plan_id: input.appPlanId,
        cluegent_billing_interval: input.interval,
        cluegent_provider_mode: providerMode,
        cluegent_currency: input.currency ?? "INR",
        cluegent_source: "desktop_app",
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as RazorpaySubscriptionEntity & {
    error?: { description?: string };
  };

  if (!response.ok) {
    throw new Error(
      `Razorpay ${providerMode} subscription creation failed with status ${response.status}: ${
        payload.error?.description ?? JSON.stringify(payload)
      }`
    );
  }

  if (!payload.id) {
    throw new Error(`Razorpay ${providerMode} subscription creation returned no subscription id.`);
  }

  return payload;
}

export async function createRazorpayOrder(input: {
  keyId: string;
  keySecret: string;
  amount: number;
  currency: RazorpayCurrency;
  receipt: string;
  notes: Record<string, string>;
  providerMode?: RazorpayProviderMode;
}) {
  const providerMode = input.providerMode ?? "live";
  const response = await fetch(`${RAZORPAY_API_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      authorization: buildBasicAuthHeader(input.keyId, input.keySecret),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: {
        ...input.notes,
        cluegent_provider_mode: providerMode,
        cluegent_source: "desktop_app",
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as RazorpayOrderEntity & {
    error?: { description?: string };
  };

  if (!response.ok) {
    throw new Error(
      `Razorpay ${providerMode} order creation failed with status ${response.status}: ${
        payload.error?.description ?? JSON.stringify(payload)
      }`
    );
  }

  if (!payload.id) {
    throw new Error(`Razorpay ${providerMode} order creation returned no order id.`);
  }

  return payload;
}

export async function fetchRazorpayTestSubscription(input: {
  keyId: string;
  keySecret: string;
  subscriptionId: string;
  providerMode?: RazorpayProviderMode;
}) {
  const providerMode = input.providerMode ?? "test";
  const response = await fetch(
    `${RAZORPAY_API_BASE_URL}/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
    {
      method: "GET",
      headers: {
        authorization: buildBasicAuthHeader(input.keyId, input.keySecret),
      },
    }
  );

  const payload = (await response.json().catch(() => ({}))) as RazorpaySubscriptionEntity & {
    error?: { description?: string };
  };

  if (!response.ok) {
    throw new Error(
      `Razorpay ${providerMode} subscription fetch failed with status ${response.status}: ${
        payload.error?.description ?? JSON.stringify(payload)
      }`
    );
  }

  return payload;
}

export async function cancelRazorpayTestSubscription(input: {
  keyId: string;
  keySecret: string;
  subscriptionId: string;
  cancelAtCycleEnd?: boolean;
  providerMode?: RazorpayProviderMode;
}) {
  const providerMode = input.providerMode ?? "test";
  const response = await fetch(
    `${RAZORPAY_API_BASE_URL}/subscriptions/${encodeURIComponent(
      input.subscriptionId
    )}/cancel`,
    {
      method: "POST",
      headers: {
        authorization: buildBasicAuthHeader(input.keyId, input.keySecret),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        cancel_at_cycle_end: input.cancelAtCycleEnd ?? false,
      }),
    }
  );

  const payload = (await response.json().catch(() => ({}))) as RazorpaySubscriptionEntity & {
    error?: { description?: string };
  };

  if (!response.ok) {
    throw new Error(
      `Razorpay ${providerMode} subscription cancellation failed with status ${response.status}: ${
        payload.error?.description ?? JSON.stringify(payload)
      }`
    );
  }

  return payload;
}

export function verifyRazorpayCheckoutSignature(input: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
  keySecret: string;
}) {
  const signedPayload = `${input.paymentId}|${input.subscriptionId}`;
  const expectedSignature = createHmac("sha256", input.keySecret)
    .update(signedPayload)
    .digest("hex");

  return safeCompare(input.signature, expectedSignature);
}

export function verifyRazorpayOrderSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}) {
  const signedPayload = `${input.orderId}|${input.paymentId}`;
  const expectedSignature = createHmac("sha256", input.keySecret)
    .update(signedPayload)
    .digest("hex");

  return safeCompare(input.signature, expectedSignature);
}

export function verifyRazorpayWebhookSignature(input: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}) {
  const expectedSignature = createHmac("sha256", input.webhookSecret)
    .update(input.rawBody)
    .digest("hex");

  return safeCompare(input.signature, expectedSignature);
}

function buildBasicAuthHeader(keyId: string, keySecret: string) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
