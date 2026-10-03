# Billing plans (October 2026)

| Tab | Product ID | INR payment | USD payment | Listening allowance | Access term |
| --- | --- | --- | --- | --- | --- |
| Hourly | hour3 | ₹499 | $5.99 | 3 hours total | 7 days |
| Hourly | hour10 | ₹1,499 | $16.99 | 10 hours total | 15 days |
| Monthly | monthly200 | ₹3,499 | $39.99 | 200 hours per month | 1 calendar month |
| Monthly | quarterly200 | ₹7,999 | $89.99 | 200 hours per month | 3 calendar months |
| Yearly | annual200 | ₹19,499 | $219.99 | 200 hours per month | 12 calendar months |

Three-month equivalent: ₹2,666.33 or $30.00/month (rounded). Yearly equivalent: ₹1,624.92 or $18.33/month. Payments are upfront using the existing Razorpay Orders flow, not auto-renewing subscriptions. The INR/USD selector uses fixed server-defined prices, not live currency conversion. Razorpay international payments must be enabled for USD checkout. Old subscribers retain their legacy limits; legacy pending orders still verify at their original prices.

## Allowance behavior

New hourly purchases expire after 7 days (3-hour pack) or 15 days (10-hour pack) from payment activation, or when their listening allowance is exhausted, whichever comes first. There is no monthly reset. Existing purchases with no expiry retain their original terms until another purchase. The backend displayPrice includes the validity label for both INR and USD; numeric payment amounts are unchanged. Purchasing another hourly pack before expiry preserves remaining credits and restarts validity from the new purchase; expired unused credits are discarded. When opening an hourly Cluegent session, fetch the authoritative entitlement, open the overlay, prepare permissions, and start both listening sources automatically. The listening timer starts with capture. Permission/start failure closes the incomplete session. Listening time, not silent time spent in setup, is charged. Manual stopping/muting remains available.

Monthly allowances reset at each purchase-date anniversary, not at the calendar month boundary. Month-end anniversaries clamp to the last day (January 31 → February 28/29 → March 31). The three-month and yearly products grant 200 hours in each monthly window, never 600/2,400 upfront. Unused hours do not roll over. Usage/status reads compute the active window even if the user hasn't opened the app for months; the next metering transaction persists its new counter. Expiration uses calendar months and the existing server entitlement expiration path.

Buying a different non-hourly plan replaces the current entitlement/allowance. The UI explicitly asks for confirmation; there is no prorating or refund computation. Hourly top-ups are the exception and accumulate. These product-policy defaults should be confirmed before deployment.

## Backend enforcement

Prices originate in `functions/src/config/plans.ts`. The catalog is fetched before enabling purchase buttons; clients never decide payment amounts. The backend validates product/interval/currency and grants entitlement only after signed payment verification plus a paid provider order, or a verified captured-payment webhook. Entitlement writes and marking the order paid are transactional and idempotent.

New listening counters are stored in the server-only subscription document (`planSttSecondsUsed`, `usageWindowStart`, `prepaidSecondsGranted`). Existing calendar-month usage still records provider statistics, but is not used to replenish hourly packs. Both audio sources share one billed stream. Usage report IDs deduplicate retrying clients; the last partial reporting interval consumes only the remaining balance. Both sources stop on exhaustion. Firestore client writes remain prohibited.

## Verification and rollout

Run `node --test scripts/test-billing.cjs scripts/test-hourly-session.cjs`, `npm run build --prefix functions`, `npx tsc --noEmit`, and `npm run typecheck:electron`. After `npx vite build`, run `node --test scripts/test-billing-ui.cjs` with Chrome installed for the billing-tab/checkout browser smoke.

Deploy the backend catalog/order/verification/webhook/usage/token/profile functions together before releasing the desktop UI. Verify real captured payments and webhook delivery using Razorpay test credentials in an isolated project before production rollout. Local tests mock Firestore/Razorpay; they do not charge real cards or prove deployed webhook configuration. Existing users must update the desktop app to see the new catalog and auto-start behavior. Update website pricing separately before publicly announcing these plans.
