# Cluegent growth scenarios

PROJECTIONS ONLY - NOT GUARANTEES. Planning baseline: 24 September 2026. These are conditional, activity-driven scenarios, not observed results or statistically calibrated forecasts.

## Actual starting evidence

GA4 recorded 1,341 active website users for 25 August-23 September 2026. Firebase showed 11 active live paid entitlements at the financial snapshot. Sources: [verified aggregate metrics](CLUEGENT_METRICS.json). Website users are not signed-in users, and different observation windows prevent treating historical ratios as measured funnel conversion. Verified recurring billing/MRR remains unavailable.

## Planning assumptions

| Scenario | Visitor to signup | Signup to paid | Monthly paying-customer churn | Assumed monthly revenue per payer |
|---|---:|---:|---:|---:|
| Conservative | 6% | 5% | 15% | ₹1,200 |
| Base | 8% | 8% | 10% | ₹1,500 |
| High growth | 10% | 10% | 8% | ₹1,800 |

All rates above are assumptions, not current measured conversion or retention. They are held constant within each scenario from month 1. Traffic is interpolated between the stated targets. Stronger execution is represented by higher traffic and conversion, lower churn and a higher-value plan mix; it is not double-counted as a separate multiplier.

## Projections at months 2, 6 and 12

Traffic, signups and new payers are monthly flows at that horizon, not cumulative. Active payers are the end-of-month stock after churn. All displayed people are rounded; conditional MRR is rounded to the nearest INR 100 from unrounded expected payers.

| Scenario | Month | Monthly website users | Monthly signups | New payers/month | Active paying customers | Conditional MRR |
|---|---:|---:|---:|---:|---:|---:|
| Conservative | 2 | 1600 | 96 | 5 | 16 | ₹19,800 |
| Conservative | 6 | 2200 | 132 | 7 | 28 | ₹33,300 |
| Conservative | 12 | 3200 | 192 | 10 | 46 | ₹55,300 |
| Base | 2 | 2200 | 176 | 14 | 33 | ₹49,800 |
| Base | 6 | 4500 | 360 | 29 | 103 | ₹1,55,200 |
| Base | 12 | 9000 | 720 | 58 | 276 | ₹4,13,300 |
| High growth | 2 | 3000 | 300 | 30 | 59 | ₹1,06,700 |
| High growth | 6 | 8000 | 800 | 80 | 264 | ₹4,75,600 |
| High growth | 12 | 18000 | 1800 | 180 | 861 | ₹15,49,300 |

## How planned activities drive the outcomes

### Conservative

- seo: Publish or substantially improve 2 high-intent pages per month; fix indexing and internal links.
- marketing: Founder-led product demos and permission-based community distribution; no assumed paid-spend commitment.
- partnerships: Aim for 1 active career-coach or mock-interview partner by month 6; partner traffic is conditional on execution.
- product: Fix onboarding and update failures; clarify pricing and free-to-paid value. Only modest traffic and conversion improvements are assumed.

### Base

- seo: Publish or improve 4 high-intent pages per month, with practical examples, comparisons and search-performance iteration.
- marketing: Regular demos, opt-in nurture and bounded creative tests. Paid scaling requires a separately approved budget and measured acquisition cost.
- partnerships: Aim for 3 active career-coach, training or preparation-community partners by month 6; use tracked referral links.
- product: Streamline install-to-first-value, improve reliability and explain plan benefits. Assume stronger signup and upgrade conversion plus repeat use.

### High growth

- seo: Publish or improve 6 differentiated pages per month, with demonstrations, case studies and earned relevant links.
- marketing: Consistent creator/demo distribution and validated campaign scaling; requires capacity, measured demand and additional approved funding.
- partnerships: Aim for 6 active distribution partners by month 6, with co-marketing and referral support; no signed partnerships are assumed as fact.
- product: Remove onboarding friction, improve activation and renewal experience, and validate a higher-value plan mix. This is an upside execution case, not an expected outcome.

## Timing and causal assumptions

- Months 1-2: implement tracking/reconciliation, technical SEO, clearer pricing, onboarding fixes and demo distribution. Gains are assumed primarily from improving existing pages and direct distribution; new SEO pages may take longer to produce results.
- Months 3-6: let useful content accumulate, activate the scenario's partner target and test onboarding/upgrade experiments. SEO and partners affect traffic; onboarding affects visitor-to-signup and signup-to-paid rates.
- Months 7-12: expand only channels with verified downstream outcomes. Product reliability and ongoing value support the assumed renewal retention; plan mix supports assumed revenue per payer.
- The traffic targets are total net audience assumptions, not measured sums of organic, paid and partner audiences. Cross-channel overlaps must be deduplicated. SEO rankings, partner reach, ad CPC/CAC and channel-level traffic lifts are not known, so no fabricated channel attribution is provided.

## Formulas

- traffic: Linear interpolation between month 0 = 1341 and scenario traffic anchors at months 2, 6 and 12. Not a fitted growth curve.
- signups: monthly traffic × visitor-to-signup rate
- newPaying: monthly signups × signup-to-paid rate; same-month conversion assumed
- activePaying: prior-month active paying × (1 - monthly churn) + new paying; initial stock = 11
- mrr: active paying × assumed recurring revenue per paying customer
- rounding: Keep expected values unrounded in calculations; display people to nearest whole person and revenue to nearest INR 100.

## MRR caveat and downside risk

Conditional modeled MRR = end-of-month active paying customers × assumed monthly recurring revenue per customer. Requires monthly subscriptions/renewals and excludes fees, tax treatment, refunds, AI costs and marketing costs. Until recurrence is verified, treat this as a monthly revenue run-rate scenario, not reportable actual MRR.

The initial 11 paid entitlements are used as a planning stock, not verified recurring subscribers. All modeled paying customers are assumed to participate in a monthly renewal model. If purchases remain one-off, active entitlements cannot legitimately be called MRR. The same retention assumptions would need to be validated as repeat purchases, and monthly collections should be reported instead.

Conservative is not a minimum outcome. Traffic can fall, conversions can be lower and renewals can fail entirely. The monthly retention assumptions of 85%, 90% and 92% are unproven; the existing all-user monthly usage-overlap metric cannot validate paid retention. High growth particularly depends on improved retention and resourced execution. Existing Free-user reactivation is not separately added, avoiding an unsupported extra revenue source.

Budget, team capacity, signed partners, actual paid retention, revenue mix and unit costs are not supplied. Therefore this is not a budget-feasibility, profit, valuation or funding forecast. Costs and refunds would reduce realized cash and contribution; no profitability is implied. No ads, tracking, prices or production settings were changed.

## Validation and recalibration

After aligned acquisition and billing cohorts are available, replace assumed conversion, renewal retention and revenue per payer with observed cohort values. Evaluate landing-page traffic quality rather than raw visit growth; reconcile paid identities to receipts and recurring entitlements. Reforecast monthly and cut activities that do not improve activation, paid conversion or renewal economics. The full month-by-month expected-value calculations are in CLUEGENT_PROJECTIONS.json.

Model checks: all scenario anchor targets match; monthly paying-customer recurrence reconciles; all expected values are nonnegative. The source snapshot remains unchanged.

