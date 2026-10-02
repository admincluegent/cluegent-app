# Cluegent

TRACTION & ACQUISITION DUE DILIGENCE / 24 SEPTEMBER 2026

An evidence-led review of the product, retained user base, payment collections and measurable growth. Prepared for founder and prospective-buyer review; not an audited financial statement or valuation.

| Current traction | Verified result |
| --- | --- |
| Existing signed-in Firebase accounts | 248 |
| Explicit Free-plan signed-in accounts | 229 |
| Commercial paying identities, all time | 22 |
| Customer collections, excluding live tests | INR 35,647.67 |
| Last 30 days captured collections | INR 22,767.55 |
| Active live paid entitlements | 11 |
| Paying-customer countries | Data unavailable or requires access |

### The acquisition thesis

Cluegent has a functioning desktop AI product, measurable customer payments and an expanding retained signup base. The evidence supports early commercial traction, but does not yet establish repeatable acquisition economics, strong retention, recurring revenue or profitability.

The strongest buyer narrative is verified early demand plus a working technical asset. The principal diligence needs are measurement quality, renewal behavior, customer geography, operating costs and software ownership/licensing.

Scope: aggregate-only, read-only production analysis. No customer names, emails, account identifiers, payment identifiers or secrets are included. User instruction to continue with the full PDF is treated as approval to finalize with all caveats retained.

Primary snapshot: 2026-09-24T15:41:55.009Z UTC. Last 30 days: 2026-08-25T15:41:55.009Z to 2026-09-24T15:41:55.009Z. Analytics uses a different, explicitly labeled calendar window. [S1-S4]


# 01 / Product overview

WHAT THE ASSET DOES

Cluegent is an Electron desktop assistant for live conversations, interview preparation and permitted interview assistance, coding prompts, screenshot-aware answers and resume/context-aware workflows. The code includes a desktop overlay, audio capture and transcription, streaming AI responses, local meeting history and retrieval, Firebase identity and usage controls, paid plan entitlements and a public marketing website. [S5]

| Layer | Observed implementation |
| --- | --- |
| Desktop experience | Electron 42, React 18, TypeScript 5.6; Vite 8, Tailwind 3, Radix and Framer Motion |
| Native integration | Rust NAPI module; audio capture/resampling/VAD; platform-specific Windows and macOS integrations |
| AI services | Provider routing for OpenAI, DeepSeek, Gemini and Groq; transcription integration including Deepgram token service and AssemblyAI code |
| Cloud backend | Firebase Authentication, named Firestore database cluegent, Firebase Functions and Hosting |
| Commerce | Razorpay live/test payment integration, server-side verification and entitlement/usage enforcement |
| Local data | SQLite and vector-retrieval code paths for local history/context |
| Acquisition surface | Static/generated SEO website and GA4 website instrumentation |

### Customer value and limits

The integrated desktop workflow reduces switching between transcription, context and AI assistance. Screen-capture exclusion is platform-dependent; this review does not certify invisibility across every sharing application or OS. Position and sell the product for authorized use, with clear recording and disclosure expectations.

Product capabilities above are source-code observations, not a fresh end-to-end release test. Local package version is 1.0.8; the deployed binary/version was not independently attested. No broad security audit or performance benchmark was performed. [S5]


# 02 / User dashboard

FIREBASE AUTH + FIRESTORE RECONCILIATION

| Metric | Value / definition |
| --- | --- |
| Existing Auth accounts / with a recorded sign-in | 248 / 248 |
| Stored Free-plan signed-in users | 229 |
| Effective Free including expired paid entitlement | 235 = 229 + 6 |
| Active live paid plan split | Plus 8; Pro 2; Power 1 |
| Email-verified / disabled accounts | 240 / 0 |
| Signups in rolling last 30 days | 123 |
| Firestore profiles / profiles without current Auth | 268 / 20 |
| Current Auth accounts missing profile | 0 |

| Mutually exclusive current Auth classification | Accounts |
| --- | --- |
| Stored Free plan | 229 |
| Expired paid entitlement, effective Free | 6 |
| Active live paid entitlement | 11 |
| Other non-free entitlement, payment provenance unverified | 1 |
| Test entitlement | 1 |

### Conversion, carefully defined

21 of 248 currently retained Auth accounts match a commercial payer: 8.47%. This is a snapshot ever-paid share, not a historical signup-cohort conversion rate. There are 22 all-time commercial paying identities; one has no current Auth match. Active live paid entitlements are 11 of 248 accounts, or 4.44%. [S1-S3]

All-time commercial payer states: 11 active live paid, 4 currently Free, 6 expired paid entitlements and 1 without a current Auth match. Past purchasers are not necessarily current paying subscribers.

Auth counts include only accounts still present. Deleted signups are absent, so 248 is not a defensible lifetime-ever-signup total. Expired entitlements may remain stored as paid until a later application request normalizes them. No production normalization was triggered during this review.


# 03 / Growth history

RETAINED SIGNUP COHORTS; NOT A LAUNCH-DATE CLAIM

Chart: Monthly retained-account signups (accounts). Apr: 2.00, May: 0.00, Jun: 35.00, Jul: 33.00, Aug: 87.00, Sep*: 91.00

| Month | Signups | Cumulative | MoM |
| --- | --- | --- | --- |
| 2026-04 | 2 | 2 | N/A (no prior month) |
| 2026-05 | 0 | 2 | -100.00% |
| 2026-06 | 35 | 37 | N/A (prior month zero) |
| 2026-07 | 33 | 70 | -5.71% |
| 2026-08 | 87 | 157 | 163.64% |
| 2026-09 (partial) | 91 | 248 | 4.60% |

September is incomplete through 24 September; its comparison with a full August is not like-for-like. Month-on-month percentages are descriptive arithmetic, not forecasts. Daily and Monday-start weekly signup series are supplied in CLUEGENT_METRICS.json. Missing dates in those maps mean zero retained-account signups, not missing API pages. [S1]

### Observed milestones

16 April 2026: earliest retained Auth account. May: live-test payment activity only in the captured ledger. June: first month with non-test captured collections in the available ledger. August: retained monthly signups rise to 87 and gross collections reach INR 11,453.03. September to snapshot: 91 retained signups and INR 19,062.15 gross collections. [S1, S3]

Official launch date, pre-retention history and deleted-account events: Data unavailable or requires access. The report begins at the earliest retained evidence, not an asserted product launch.


# 04 / Revenue & collections

RAZORPAY LIVE LEDGER; NOT MRR OR PROFIT

| Measure | All time | Last 30 days |
| --- | --- | --- |
| Gross captured collections, INR base | INR 35,672.67 | INR 22,767.55 |
| Commercial collections, excluding live tests | INR 35,647.67 | INR 22,767.55 |
| Captured transactions | 28 | 12 |
| Commercial transactions | 23 | 12 |
| Unique commercial paying identities | 22 | 12 |
| Native INR payment amount | INR 17,011.00 | INR 7,494.00 |
| Native USD payment amount | USD 199.00 | USD 163.00 |
| Recorded refunds | 0 | 0 |

Five captured live-test transactions total INR 25.00. They are included in gross processor collections but excluded from commercial collections. Razorpay has 35 payment records: 28 captured and 7 failed. Failed attempts contribute no revenue. [S3]

### Currency and accounting method

INR payments use their native amount. USD payments use the actual Razorpay base_amount/base_currency: INR 18,661.67 all time and INR 15,273.55 in the last 30 days. These are recorded processor conversions, not an invented FX rate. Original USD and INR amounts are never simply added together.

Collections are grouped by payment creation timestamp, not bank settlement date. Captured cash is not accrual revenue, recurring revenue, net profit or cash received in the bank. Processor fees, taxes, chargebacks, settlements, operating costs and deferred-revenue accounting have not been reconciled; those measures are Data unavailable or requires access.

The refund endpoint returned zero records and captured payments show zero amount refunded. This does not constitute an independent bank or chargeback audit. Identity deduplication uses Firebase UID, with customer ID/email fallbacks in memory; a paying identity is not a verified natural person.


# 05 / Revenue growth & mix

ACTUAL CAPTURED AMOUNTS; SEPTEMBER IS PARTIAL

Chart: Monthly captured collections (INR). Apr: 0.00, May: 25.00, Jun: 999.00, Jul: 4,133.49, Aug: 11,453.03, Sep*: 19,062.15

| Month | Gross INR base | Scope |
| --- | --- | --- |
| 2026-04 | INR 0.00 | Captured ledger |
| 2026-05 | INR 25.00 | Live-test only |
| 2026-06 | INR 999.00 | Captured ledger |
| 2026-07 | INR 4,133.49 | Captured ledger |
| 2026-08 | INR 11,453.03 | Captured ledger |
| 2026-09 | INR 19,062.15 | Partial month |

| Plan | Payments | INR base collections |
| --- | --- | --- |
| Livetest | 5 | INR 25.00 |
| Plus | 18 | INR 18,760.42 |
| Power | 1 | INR 6,491.03 |
| Pro | 4 | INR 10,396.22 |

Plus generated INR 18,760.42 from 18 commercial payments, Pro INR 10,396.22 from 4 and Power INR 6,491.03 from 1. One customer identity may purchase more than once or across plans; payment counts are not plan-level customer counts. [S3]

Twenty-three commercial payments across 22 commercial identities indicate limited repeat-payment evidence. This is insufficient to establish renewal rate, revenue retention or lifetime value. Monthly collections must not be multiplied by 12 and presented as verified ARR.


# 06 / Global reach & acquisition

WEBSITE GEOGRAPHY IS NOT CUSTOMER GEOGRAPHY

| Website GA4 metric | 25 August - 23 September 2026 |
| --- | --- |
| Active users | 1,341 |
| New users | 1,337 |
| Engaged sessions | 447 |
| Engagement rate | 30.91% |
| Average engagement time | 14 seconds |
| Events / key events | 6,074 / 0 |
| GA4 reported revenue | INR 0.00 |

| Top observed website country | Active users |
| --- | --- |
| Singapore | 446 |
| India | 254 |
| United States | 143 |
| China | 76 |
| Türkiye | 31 |
| Saudi Arabia | 18 |
| Brazil | 17 |
| Pakistan | 14 |
| Philippines | 14 |
| Canada | 13 |

Source: GA4 Cluegent Website, property 542401409, Demographic details report. This is a 30-complete-calendar-day window, different from the rolling financial window. Property timezone was not verified. Country rows can be non-additive and include unknowns; the displayed 86 rows are not evidence of 86 customer countries. [S4]

Paying-customer country counts: Data unavailable or requires access. Firebase profiles provide no country coverage. No usable card-country value was returned, and the two invoices scanned supplied no billing country for commercial payments. Currency is not evidence of residency. Signup countries are also unavailable. [S1-S3]

Daily/monthly traffic series, confirmed top acquisition channels, keyword attribution and organic-growth trend: Data unavailable or requires access. No channel values from mixed-date dashboard cards are used. Website GA4 zero revenue must not override the payment ledger. Website users are not app users.


# 07 / Product usage & retention

SERVER COUNTERS; NOT INTERVIEW COUNTS

| Recorded usage | All available valid monthly periods |
| --- | --- |
| Prompts | 4,774 |
| Screenshot analyses | 859 |
| Transcription seconds / hours | 225,693 / 62.69 |
| Distinct identities with nonzero usage | 228 |
| Usage identities without current Auth | 13 |

| Month | Used IDs | Prompts | Screenshots | STT hours |
| --- | --- | --- | --- | --- |
| 2026-04 | 3 | 293 | 39 | 5.21 |
| 2026-05 | 12 | 602 | 198 | 1.30 |
| 2026-06 | 29 | 433 | 84 | 5.05 |
| 2026-07 | 36 | 1264 | 273 | 6.99 |
| 2026-08 | 81 | 984 | 114 | 21.78 |
| 2026-09 | 87 | 1198 | 151 | 22.37 |

Across 228 recorded usage identities, the arithmetic averages are 20.94 prompts, 3.77 screenshot analyses and 16.50 transcription minutes per identity. These are lifetime recorded-counter averages, not per-session or per-paying-user metrics. [S2]

| Monthly return proxy | Returned / prior used IDs | Rate |
| --- | --- | --- |
| 2026-04 to 2026-05 | 3 / 3 | 100.00% |
| 2026-05 to 2026-06 | 2 / 12 | 16.67% |
| 2026-06 to 2026-07 | 2 / 29 | 6.90% |
| 2026-07 to 2026-08 | 5 / 36 | 13.89% |
| 2026-08 to 2026-09 | 6 / 81 | 7.41% |

Return proxy = identity with nonzero monthly counters in both periods / identity with nonzero counters in the earlier period. It is not D7/D30 signup-cohort retention. September is incomplete. Monthly records include legacy/test/orphaned usage; one zero-valued invalid-period document is excluded. April usage identities exceed retained April signups, illustrating differing historical coverage.

True sessions/interviews, duration per session and app DAU/WAU/MAU: Data unavailable or requires access. Desktop analytics functions are disabled/no-op in source. Firebase last-sign-in timestamps cannot reconstruct daily activity. [S2, S5]


# 08 / Business & technology diligence

ASSET QUALITY, TRANSFERABILITY AND RISKS

| Area | Evidence / diligence implication |
| --- | --- |
| Monetization | Free, Plus, Pro and Power entitlements exist; live collections verified. Recurrence and bank settlement are unverified. |
| Cloud enforcement | Server-side identity, entitlement and usage logic exist. Rules, roles, abuse prevention and race conditions need a separate security audit. |
| Desktop/native operations | Cross-platform Rust/audio integrations and Electron packaging increase maintenance scope. Fresh release, updater and capture compatibility tests remain required. |
| Service dependence | Firebase, Razorpay and external AI/STT providers are operating dependencies. Ownership, transferability, costs, limits and contracts need confirmation. |
| Local retrieval | SQLite/vector code paths exist. Packaging/dependency consistency and migration/backup behavior were not runtime-tested. |
| Documentation drift | README plan limits differ from current server plan configuration; marketing, backend and support documentation need reconciliation. |
| Privacy & measurement | Desktop analytics is disabled; useful for data minimization, but weakens funnel and retention measurement. Website GA4 is separately enabled. |

### Ownership and license review is material

README identifies the repository as based on the Natively upstream project and distributed under AGPL-3.0. Do not represent the entire codebase as exclusively proprietary. A buyer should review upstream provenance, license compliance, contributor assignments and all third-party assets with counsel. This report records the codebase evidence; it is not a legal opinion. [S5]

No secrets or individual customer records are part of the deliverables. Production access was read-only. Existing unrelated source/website edits were preserved. This is targeted technical diligence of major subsystems, not line-by-line certification of every file.


# 09 / Growth roadmap

PROPOSED TARGETS ONLY - NOT ACTUALS OR FORECAST REVENUE

| Horizon | Proposed work | Evidence needed before advancing |
| --- | --- | --- |
| Next 2 months | Reconcile payment-to-entitlement states; separate live tests; instrument consent-aware funnel and purchase events; collect billing country only where appropriate; document licensing and releases. | A repeatable aggregate dashboard; source reconciliation; defined activation and retention cohorts; verified purchase tracking. |
| Next 6 months | Run bounded SEO/onboarding experiments; segment Free-to-paid and repeat purchases; improve first-session reliability; measure service costs and support effort. | Cohort retention and repeat-payment evidence; channel-level conversion with costs; measured gross contribution and support load. |
| Next 12 months | Scale only validated acquisition channels; improve cross-platform release operations; develop a consent-forward product positioning; prepare a transfer-ready buyer data room. | Repeatable acquisition economics; costed renewal behavior; ownership and vendor documentation; tested release and recovery processes. |

### Decision gates, not speculative promises

Do not scale ad spend based solely on traffic or signup growth. First connect acquisition source, activation, payment and repeat usage using privacy-respecting identifiers and explicit definitions. Do not treat this report as authorization to add tracking, change production data or increase advertising budgets.

No numeric revenue, user or valuation forecast is supplied because validated conversion cohorts, churn, cost structure and channel economics are missing. Numeric targets should be set only after those baselines and the operating budget are agreed. The 2/6/12-month horizons are planning horizons requested by the founder, not historical measurements.

### Buyer-readiness next steps

Resolve entitlement and orphan-profile discrepancies; reconcile Razorpay with settlements and accounting; establish customer-country coverage without exporting PII; verify license obligations and transfer rights; then update this evidence pack on a consistent cadence.


# 10 / Sources & discrepancies

EVIDENCE REGISTER AND EXPLICIT LIMITATIONS

| ID | Source and coverage |
| --- | --- |
| S1 | Firebase Authentication, project cluegent-2514d, accounts:batchGet; paginated existing-account listing, complete. |
| S2 | Firestore named database cluegent: users, subscriptions, usage_monthly and billing_razorpay_live_orders; read-only projected queries. |
| S3 | Razorpay live API payments/refunds/invoices; 100-record pagination until terminal page. Credentials stayed in memory. |
| S4 | Authenticated GA4 UI, Cluegent Website property 542401409; Demographic details, 25 Aug-23 Sep 2026. |
| S5 | Local code: package.json; native-module/Cargo.toml; functions/src/config/plans.ts; functions/src/utils/usage.ts; Firebase/billing services; src/lib/analytics/analytics.service.ts; website; README.md and LICENSE. |

| Discrepancy | Treatment in this report |
| --- | --- |
| 248 Auth accounts vs 268 profiles | Use Auth for retained signup count; disclose 20 profiles without current Auth. |
| 229 Free vs 235 effective Free | Report stored Free separately from six expired paid entitlements. |
| 22 commercial payers vs 11 active paid | Historical payment is not current entitlement; one payer lacks current Auth match. |
| 28 captures vs 26 paid Firestore matches | Two unmatched captures are live-test payments; do not substitute order count for processor revenue. |
| GA4 revenue zero vs live collections | Use Razorpay for collections; purchase-event reconciliation is incomplete. |
| Customer countries absent | Mark unavailable; do not substitute website geography or payment currency. |
| App activity instrumentation absent | Use clearly labeled monthly counter proxies; no invented DAU or interview totals. |
| Snapshot windows differ | Financial rolling window ends 24 Sep; GA complete-day window ends 23 Sep. |

Additional unavailable diligence items: actual launch date, deleted-account history, full organic/keyword history, bank settlements, processor-cost reconciliation, cloud/model costs, CAC, LTV, churn, MRR, ARR, profit, customer residence and a defensible valuation. All are Data unavailable or requires access.


# 11 / Methods & verification

REPRODUCIBILITY WITHOUT CUSTOMER DATA EXPORTS

### Counting and reconciliation

Auth records are grouped by creation timestamp in UTC. Weekly groups start Monday UTC. Account classifications are evaluated at the snapshot using the current subscription document and expiration timestamp. Commercial payment totals exclude plan ID livetest; captured/refunded status checks include only captured collections. Amounts are stored as integer currency subunits in the JSON.

Payment identity matching first uses the Firestore order UID and payment-note Firebase UID, then identity/customer fallbacks in memory. All exports are aggregate only. Sources were read sequentially rather than in a cross-service transaction; live activity during collection can produce small timing differences.

| Validation | Result |
| --- | --- |
| authClassesSumToTotal | PASS |
| dailySignupsSumToTotal | PASS |
| monthlySignupsSumToTotal | PASS |
| capturedCountEqualsCurrencies | PASS |
| baseCurrencyCoversAllCaptured | PASS |
| monthlyBaseGrossReconciles | PASS |

### Files included

CLUEGENT_DUE_DILIGENCE_DATA.md contains the raw aggregate ledger, source register, definitions and discrepancies. CLUEGENT_GROWTH_REPORT.md is the buyer-facing narrative. CLUEGENT_METRICS.json contains numerical series for charts. CLUEGENT_GROWTH_REPORT.html is the designed browser version. This PDF is the print-ready version.

### Interpretation of the evidence

The retained signup base and captured commercial collections are real, source-backed traction. What remains unproven is whether acquisition is economical, customers renew sustainably and the asset can be transferred with clear rights and dependable operations. Those should be the next diligence priorities, not unsupported growth projections.

Report finalized at the founder's request to continue and provide the full PDF. Data availability limitations remain visible rather than being replaced by estimates. No production data was modified.
