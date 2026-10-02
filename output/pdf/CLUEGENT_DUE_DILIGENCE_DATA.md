# Cluegent due diligence - aggregate evidence ledger

Snapshot: 2026-09-24T15:41:55.009Z

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


## Definitions and methods

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


## Raw aggregate numbers

All returned numbers, date bins, source coverage and validation flags follow. No individual records or credentials are exported.

```json
{
  "status": "FINAL_READ_ONLY_SNAPSHOT",
  "asOf": "2026-09-24T15:41:55.009Z",
  "last30Days": {
    "from": "2026-08-25T15:41:55.009Z",
    "to": "2026-09-24T15:41:55.009Z"
  },
  "sources": [
    {
      "system": "Firebase Authentication",
      "project": "cluegent-2514d",
      "endpoint": "accounts:batchGet",
      "complete": true
    },
    {
      "system": "Firestore",
      "project": "cluegent-2514d",
      "database": "cluegent",
      "collections": [
        "users",
        "users/*/subscriptions",
        "users/*/usage_monthly",
        "billing_razorpay_live_orders"
      ],
      "complete": true
    },
    {
      "system": "Razorpay Live API",
      "endpoints": [
        "payments",
        "refunds",
        "invoices"
      ],
      "complete": true,
      "pagination": "100 per page until terminal page"
    }
  ],
  "discrepancies": [
    "Auth totals count existing accounts; deleted historical sign-ups are not recoverable from this listing. Last-login counts are not DAU/WAU/MAU.",
    "Revenue is captured payment collections, not accrual revenue or bank settlements. Currency totals must not be added without a documented FX conversion. Refunds attached to last-30-day payments differ from refunds processed during the last 30 days. Card issuing country is not customer residence. Paying identities may use Firebase UID/customer ID/email fallback, not verified natural persons.",
    "GA4 reports zero revenue but Razorpay has captured payments: no reconciled purchase tracking. Website traffic is not app usage.",
    "Paying customer country data unavailable in Firebase profiles, Razorpay card records and invoice billing addresses.",
    "Five live-test payments totaling INR 25 are excluded from commercial collections.",
    "Six existing accounts have expired paid entitlements still stored as non-free; one other non-free entitlement has unverified payment provenance.",
    "Launch date is unverified; history starts with the earliest retained Auth account, not necessarily product launch."
  ],
  "firebase": {
    "totalExistingAuthAccounts": 248,
    "disabled": 0,
    "verifiedEmail": 240,
    "accountsWithSignIn": 248,
    "classification": {
      "free": 229,
      "expired_paid_entitlement": 6,
      "active_live_paid": 11,
      "other_nonfree": 1,
      "test_entitlement": 1
    },
    "signedInClassification": {
      "free": 229,
      "expired_paid_entitlement": 6,
      "active_live_paid": 11,
      "other_nonfree": 1,
      "test_entitlement": 1
    },
    "storedSubscriptionPlans": {
      "||none": 1,
      "free|active|none": 241,
      "free|active|live": 6,
      "plus|active|live": 14,
      "free|active|sandbox": 1,
      "power|active|live": 1,
      "plus|active|none": 1,
      "pro|active|test": 1,
      "pro|active|live": 2
    },
    "profileDocuments": 268,
    "authWithoutProfile": 0,
    "oldestExistingAuthCreation": "2026-04-16T16:40:24.496Z",
    "dailySignupsExistingAccounts": {
      "2026-09-04": 5,
      "2026-07-31": 3,
      "2026-07-27": 7,
      "2026-08-19": 8,
      "2026-08-31": 5,
      "2026-06-21": 6,
      "2026-08-21": 3,
      "2026-09-11": 2,
      "2026-07-30": 2,
      "2026-09-22": 2,
      "2026-09-08": 3,
      "2026-09-23": 7,
      "2026-09-16": 6,
      "2026-06-20": 4,
      "2026-04-16": 1,
      "2026-08-18": 6,
      "2026-06-23": 2,
      "2026-08-24": 3,
      "2026-08-07": 1,
      "2026-07-01": 3,
      "2026-07-17": 2,
      "2026-08-09": 3,
      "2026-06-02": 2,
      "2026-08-23": 2,
      "2026-09-18": 3,
      "2026-09-21": 7,
      "2026-08-29": 2,
      "2026-08-30": 5,
      "2026-08-26": 3,
      "2026-08-25": 6,
      "2026-08-22": 4,
      "2026-06-06": 1,
      "2026-08-16": 2,
      "2026-07-05": 1,
      "2026-06-04": 2,
      "2026-08-27": 6,
      "2026-06-09": 1,
      "2026-07-15": 1,
      "2026-09-07": 6,
      "2026-09-05": 2,
      "2026-08-28": 7,
      "2026-07-11": 2,
      "2026-09-01": 6,
      "2026-06-30": 3,
      "2026-09-03": 6,
      "2026-07-19": 2,
      "2026-08-08": 2,
      "2026-09-14": 4,
      "2026-09-09": 7,
      "2026-08-20": 5,
      "2026-07-07": 1,
      "2026-08-10": 2,
      "2026-09-24": 4,
      "2026-09-19": 2,
      "2026-09-06": 1,
      "2026-08-13": 1,
      "2026-06-10": 1,
      "2026-09-15": 7,
      "2026-09-10": 3,
      "2026-09-17": 3,
      "2026-08-11": 3,
      "2026-06-05": 2,
      "2026-06-25": 3,
      "2026-09-20": 2,
      "2026-04-22": 1,
      "2026-07-18": 1,
      "2026-09-13": 1,
      "2026-06-22": 2,
      "2026-06-24": 3,
      "2026-07-29": 1,
      "2026-07-13": 1,
      "2026-08-14": 3,
      "2026-08-15": 3,
      "2026-07-03": 2,
      "2026-07-21": 1,
      "2026-06-28": 1,
      "2026-07-08": 1,
      "2026-06-27": 1,
      "2026-08-17": 1,
      "2026-06-26": 1,
      "2026-09-02": 2,
      "2026-08-05": 1,
      "2026-07-22": 1,
      "2026-07-06": 1
    },
    "monthlySignupsExistingAccounts": {
      "2026-09": 91,
      "2026-07": 33,
      "2026-08": 87,
      "2026-06": 35,
      "2026-04": 2
    },
    "signupsLast30Days": 123,
    "lastLoginWithin1Day": 9,
    "lastLoginWithin7Days": 31,
    "lastLoginWithin30Days": 126,
    "countryCoverage": {
      "unavailable": 268
    },
    "profilesWithoutAuth": 20,
    "otherNonfreeStoredPlans": {
      "plus|active|none": 1
    },
    "activeLivePaidByPlan": {
      "power": 1,
      "plus": 8,
      "pro": 2
    },
    "effectiveFreeIncludingExpiredLivePaid": 235,
    "weeklySignupsExistingAccounts": {
      "2026-08-31": 27,
      "2026-07-27": 13,
      "2026-08-17": 29,
      "2026-06-15": 10,
      "2026-09-07": 22,
      "2026-09-21": 20,
      "2026-09-14": 27,
      "2026-04-13": 1,
      "2026-06-22": 13,
      "2026-08-24": 32,
      "2026-08-03": 7,
      "2026-06-29": 9,
      "2026-07-13": 7,
      "2026-06-01": 7,
      "2026-08-10": 14,
      "2026-06-08": 2,
      "2026-07-06": 5,
      "2026-04-20": 1,
      "2026-07-20": 2
    }
  },
  "usage": {
    "source": "Firestore users/*/usage_monthly/*",
    "months": {
      "2026-09": {
        "documents": 104,
        "usersWithAnyUsage": 87,
        "prompts": 1198,
        "screenshots": 151,
        "sttSeconds": 80531
      },
      "2026-07": {
        "documents": 39,
        "usersWithAnyUsage": 36,
        "prompts": 1264,
        "screenshots": 273,
        "sttSeconds": 25167
      },
      "2026-08": {
        "documents": 98,
        "usersWithAnyUsage": 81,
        "prompts": 984,
        "screenshots": 114,
        "sttSeconds": 78401
      },
      "2026-06": {
        "documents": 40,
        "usersWithAnyUsage": 29,
        "prompts": 433,
        "screenshots": 84,
        "sttSeconds": 18163
      },
      "2026-05": {
        "documents": 15,
        "usersWithAnyUsage": 12,
        "prompts": 602,
        "screenshots": 198,
        "sttSeconds": 4680
      },
      "2026-04": {
        "documents": 3,
        "usersWithAnyUsage": 3,
        "prompts": 293,
        "screenshots": 39,
        "sttSeconds": 18751
      }
    },
    "totalDocuments": 300,
    "distinctUsersWithAnyRecordedUsage": 228,
    "usageUsersWithoutCurrentAuth": 13,
    "totals": {
      "prompts": 4774,
      "screenshots": 859,
      "sttSeconds": 225693
    },
    "monthToMonthReturn": [
      {
        "from": "2026-04",
        "to": "2026-05",
        "previousActiveUsers": 3,
        "returnedUsers": 3,
        "returnRate": 1
      },
      {
        "from": "2026-05",
        "to": "2026-06",
        "previousActiveUsers": 12,
        "returnedUsers": 2,
        "returnRate": 0.16666666666666666
      },
      {
        "from": "2026-06",
        "to": "2026-07",
        "previousActiveUsers": 29,
        "returnedUsers": 2,
        "returnRate": 0.06896551724137931
      },
      {
        "from": "2026-07",
        "to": "2026-08",
        "previousActiveUsers": 36,
        "returnedUsers": 5,
        "returnRate": 0.1388888888888889
      },
      {
        "from": "2026-08",
        "to": "2026-09",
        "previousActiveUsers": 81,
        "returnedUsers": 6,
        "returnRate": 0.07407407407407407
      }
    ],
    "caveat": "Usage counters include legacy, test and orphaned records unless separately identified; not validated interview/session counts. Current month incomplete.",
    "excludedInvalidPeriodDocuments": 1
  },
  "firestoreOrders": {
    "total": 118,
    "statuses": {
      "paid": 26,
      "created": 92
    },
    "paidByPlan": {
      "livetest": 3,
      "plus": 18,
      "pro": 4,
      "power": 1
    }
  },
  "razorpay": {
    "mode": "live",
    "paymentsScanned": 35,
    "paymentStatuses": {
      "captured": 28,
      "failed": 7
    },
    "capturedPaymentCount": 28,
    "allTime": {
      "USD": {
        "payments": 9,
        "grossSubunits": 19900,
        "refundSubunits": 0,
        "netAfterRefundSubunits": 19900
      },
      "INR": {
        "payments": 19,
        "grossSubunits": 1701100,
        "refundSubunits": 0,
        "netAfterRefundSubunits": 1701100
      }
    },
    "last30DaysByPaymentCreation": {
      "USD": {
        "payments": 6,
        "grossSubunits": 16300,
        "refundSubunits": 0,
        "netAfterRefundSubunits": 16300
      },
      "INR": {
        "payments": 6,
        "grossSubunits": 749400,
        "refundSubunits": 0,
        "netAfterRefundSubunits": 749400
      }
    },
    "allTimeUniquePayingIdentities": 24,
    "commercialUniquePayingIdentities": 22,
    "last30UniquePayingIdentities": 12,
    "unidentifiedCapturedPayments": 0,
    "matchedToFirestorePaidOrders": 26,
    "commercialExcludingLiveTest": {
      "USD": {
        "payments": 9,
        "grossSubunits": 19900,
        "refundSubunits": 0,
        "netAfterRefundSubunits": 19900
      },
      "INR": {
        "payments": 14,
        "grossSubunits": 1698600,
        "refundSubunits": 0,
        "netAfterRefundSubunits": 1698600
      }
    },
    "liveTestPayments": {
      "INR": {
        "payments": 5,
        "grossSubunits": 2500,
        "refundSubunits": 0,
        "netAfterRefundSubunits": 2500
      }
    },
    "monthlyByPaymentCreation": {
      "2026-09": {
        "USD": {
          "payments": 5,
          "grossSubunits": 13400,
          "refundSubunits": 0,
          "netAfterRefundSubunits": 13400
        },
        "INR": {
          "payments": 5,
          "grossSubunits": 649500,
          "refundSubunits": 0,
          "netAfterRefundSubunits": 649500
        }
      },
      "2026-08": {
        "USD": {
          "payments": 3,
          "grossSubunits": 5300,
          "refundSubunits": 0,
          "netAfterRefundSubunits": 5300
        },
        "INR": {
          "payments": 5,
          "grossSubunits": 649500,
          "refundSubunits": 0,
          "netAfterRefundSubunits": 649500
        }
      },
      "2026-07": {
        "INR": {
          "payments": 3,
          "grossSubunits": 299700,
          "refundSubunits": 0,
          "netAfterRefundSubunits": 299700
        },
        "USD": {
          "payments": 1,
          "grossSubunits": 1200,
          "refundSubunits": 0,
          "netAfterRefundSubunits": 1200
        }
      },
      "2026-06": {
        "INR": {
          "payments": 1,
          "grossSubunits": 99900,
          "refundSubunits": 0,
          "netAfterRefundSubunits": 99900
        }
      },
      "2026-05": {
        "INR": {
          "payments": 5,
          "grossSubunits": 2500,
          "refundSubunits": 0,
          "netAfterRefundSubunits": 2500
        }
      }
    },
    "byPlan": {
      "plus": {
        "USD": {
          "payments": 6,
          "grossSubunits": 7200,
          "refundSubunits": 0,
          "netAfterRefundSubunits": 7200
        },
        "INR": {
          "payments": 12,
          "grossSubunits": 1198800,
          "refundSubunits": 0,
          "netAfterRefundSubunits": 1198800
        }
      },
      "power": {
        "USD": {
          "payments": 1,
          "grossSubunits": 6900,
          "refundSubunits": 0,
          "netAfterRefundSubunits": 6900
        }
      },
      "pro": {
        "INR": {
          "payments": 2,
          "grossSubunits": 499800,
          "refundSubunits": 0,
          "netAfterRefundSubunits": 499800
        },
        "USD": {
          "payments": 2,
          "grossSubunits": 5800,
          "refundSubunits": 0,
          "netAfterRefundSubunits": 5800
        }
      },
      "livetest": {
        "INR": {
          "payments": 5,
          "grossSubunits": 2500,
          "refundSubunits": 0,
          "netAfterRefundSubunits": 2500
        }
      }
    },
    "oldestPayment": "2026-05-20T09:17:51.000Z",
    "cardIssuingCountryBuyerCounts": {},
    "buyersWithoutCardCountry": 24,
    "buyersWithMultipleCardCountries": 0,
    "customerResidenceCountry": "Data unavailable or requires access",
    "refundLedger": {
      "count": 0,
      "statuses": {},
      "byCurrency": {},
      "last30Count": 0
    },
    "fieldCoverage": {
      "paymentFields": [
        "acquirer_data",
        "amount",
        "amount_refunded",
        "bank",
        "base_amount",
        "base_currency",
        "captured",
        "card",
        "card_id",
        "contact",
        "created_at",
        "currency",
        "description",
        "email",
        "entity",
        "error_code",
        "error_description",
        "error_reason",
        "error_source",
        "error_step",
        "fee",
        "id",
        "international",
        "invoice_id",
        "method",
        "notes",
        "order_id",
        "refund_status",
        "status",
        "tax",
        "vpa",
        "wallet",
        "upi",
        "token_id",
        "customer_id"
      ],
      "cardFields": [
        "emi",
        "entity",
        "id",
        "international",
        "last4",
        "name",
        "network",
        "sub_type",
        "token_iin",
        "type",
        "issuer"
      ],
      "notesFields": [
        "cluegent_billing_interval",
        "cluegent_currency",
        "cluegent_plan_id",
        "cluegent_provider_mode",
        "cluegent_source",
        "firebase_email",
        "firebase_uid"
      ]
    },
    "baseCurrencyAllTime": {
      "INR": {
        "payments": 28,
        "grossSubunits": 3567267
      }
    },
    "baseCurrencyLast30": {
      "INR": {
        "payments": 12,
        "grossSubunits": 2276755
      }
    },
    "baseCurrencyCommercial": {
      "INR": {
        "payments": 23,
        "grossSubunits": 3564767
      }
    },
    "baseCurrencyMonthly": {
      "2026-09": {
        "INR": {
          "payments": 10,
          "grossSubunits": 1906215
        }
      },
      "2026-08": {
        "INR": {
          "payments": 8,
          "grossSubunits": 1145303
        }
      },
      "2026-07": {
        "INR": {
          "payments": 4,
          "grossSubunits": 413349
        }
      },
      "2026-06": {
        "INR": {
          "payments": 1,
          "grossSubunits": 99900
        }
      },
      "2026-05": {
        "INR": {
          "payments": 5,
          "grossSubunits": 2500
        }
      }
    },
    "baseCurrencyByPlan": {
      "plus": {
        "INR": {
          "payments": 18,
          "grossSubunits": 1876042
        }
      },
      "power": {
        "INR": {
          "payments": 1,
          "grossSubunits": 649103
        }
      },
      "pro": {
        "INR": {
          "payments": 4,
          "grossSubunits": 1039622
        }
      },
      "livetest": {
        "INR": {
          "payments": 5,
          "grossSubunits": 2500
        }
      }
    },
    "currencyMethod": "INR payments use amount; USD payments use Razorpay-reported base_amount/base_currency. Fees are not interpreted as transaction-currency fees.",
    "commercialPayersMatchingExistingAuth": 21,
    "commercialPayersByFirebaseState": {
      "active_live_paid": 11,
      "free": 4,
      "expired_paid_entitlement": 6,
      "no_current_auth_match": 1
    },
    "internationalFlagPaymentCounts": {
      "true": 11,
      "false": 17
    },
    "invoiceLinkedPayments": 2,
    "distinctNonemptyCustomerIds": 1,
    "billingCountryAudit": {
      "invoicesScanned": 2,
      "commercialPaymentsWithBillingCountry": 0,
      "uniquePayingIdentitiesByBillingCountry": {}
    }
  },
  "productAnalytics": {
    "desktop": "Disabled by code",
    "dau": "Data unavailable or requires access",
    "mau": "Data unavailable or requires access",
    "sessions": "Data unavailable or requires access",
    "websiteMeasurementId": "G-CCH0Y2SN4G"
  },
  "validation": {
    "authClassesSumToTotal": true,
    "dailySignupsSumToTotal": true,
    "monthlySignupsSumToTotal": true,
    "capturedCountEqualsCurrencies": true,
    "baseCurrencyCoversAllCaptured": true,
    "monthlyBaseGrossReconciles": true
  },
  "approval": "User requested continuation and full PDF after evidence summary.",
  "websiteAnalytics": {
    "source": "GA4 Cluegent Website; Demographic details UI",
    "propertyId": "542401409",
    "from": "2026-08-25",
    "to": "2026-09-23",
    "period": "30 complete calendar days; GA property timezone unverified",
    "activeUsers": 1341,
    "newUsers": 1337,
    "engagedSessions": 447,
    "engagementRate": 0.3091,
    "averageEngagementSeconds": 14,
    "eventCount": 6074,
    "keyEvents": 0,
    "reportedRevenueINR": 0,
    "topCountries": {
      "Singapore": 446,
      "India": 254,
      "United States": 143,
      "China": 76,
      "Türkiye": 31,
      "Saudi Arabia": 18,
      "Brazil": 17,
      "Pakistan": 14,
      "Philippines": 14,
      "Canada": 13
    },
    "countryRows": 86,
    "countryCaveat": "86 displayed rows; unknown/not-set handling not fully reconciled. Do not claim 86 customer countries.",
    "trafficSources": "Data unavailable or requires access",
    "dailyActiveSeries": "Data unavailable or requires access",
    "organicGrowth": "Data unavailable or requires access",
    "scope": "Website visitors only; not signed-in or paying customer geography."
  }
}
```
