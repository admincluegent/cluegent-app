/**
 * Centralized billing route hints.
 *
 * During test billing we intentionally do not ship raw checkout links in the
 * desktop bundle. Razorpay subscriptions are created server-side from Firebase
 * after the user is authenticated.
 */

export const BILLING_SETTINGS_TAB = "natively-api" as const;

export const CHECKOUT_URLS = {
  sandboxManaged: null,
  liveManaged: null,
} as const;
