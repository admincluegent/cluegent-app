import { onCall, onRequest, type HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import {
  deleteAccountController,
  getOrCreateUserProfileController,
} from "./controllers/userController.js";
import {
  checkUsageBeforeActionController,
  getPlanStatusController,
} from "./controllers/usageController.js";
import {
  cancelRazorpayTestSubscriptionController,
  cancelRazorpayLiveSubscriptionController,
  createRazorpayLiveOrderController,
  createRazorpayLiveSubscriptionController,
  createRazorpayTestSubscriptionController,
  getLiveBillingPlansController,
  razorpayLiveWebhookController,
  razorpayTestWebhookController,
  verifyRazorpayLiveOrderPaymentController,
  verifyRazorpayLivePaymentController,
  verifyRazorpayTestPaymentController,
} from "./controllers/billingController.js";
import {
  createDeepgramTokenForAuthenticatedUser,
  getCreateTokenHttpStatus,
  getTrackUsageHttpStatus,
  isCreateDeepgramTokenData,
  isTrackSttUsageData,
  processAssistantReplyStreamController,
  trackSttUsageForAuthenticatedUser,
  trackSttUsageController,
} from "./controllers/assistantController.js";
import { requireBearerAuth } from "./utils/auth.js";

const callableOptions = {
  region: "us-central1" as const,
  cors: true,
};
const warmAssistantRequestOptions = {
  region: "us-central1" as const,
  cors: true,
  invoker: "public" as const,
  minInstances: 0,
  memory: "1GiB" as const,
  timeoutSeconds: 120,
};
const warmAssistantAsiaRequestOptions = {
  ...warmAssistantRequestOptions,
  region: "asia-south1" as const,
  minInstances: 1,
};
const warmSttTokenRequestOptions = {
  region: "us-central1" as const,
  cors: true,
  invoker: "public" as const,
  minInstances: 1,
  memory: "512MiB" as const,
  timeoutSeconds: 60,
};
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const deepseekApiKey = defineSecret("DEEPSEEK_AI_API_KEY");
const openAiApiKey = defineSecret("OPENAI_API_KEY");
const assemblyAiApiKey = defineSecret("ASSEMBLY_AI_API_KEY");
const razorpayTestKeyId = defineSecret("RAZORPAY_TEST_KEY_ID");
const razorpayTestKeySecret = defineSecret("RAZORPAY_TEST_KEY_SECRET");
const razorpayTestWebhookSecret = defineSecret("RAZORPAY_TEST_WEBHOOK_SECRET");
const razorpayTestAllowedEmails = defineSecret("RAZORPAY_TEST_ALLOWED_EMAILS");
const razorpayTestPlanPlusMonthly = defineSecret("RAZORPAY_TEST_PLAN_PLUS_MONTHLY");
const razorpayTestPlanPlusYearly = defineSecret("RAZORPAY_TEST_PLAN_PLUS_YEARLY");
const razorpayTestPlanProMonthly = defineSecret("RAZORPAY_TEST_PLAN_PRO_MONTHLY");
const razorpayTestPlanProYearly = defineSecret("RAZORPAY_TEST_PLAN_PRO_YEARLY");
const razorpayTestPlanPowerMonthly = defineSecret("RAZORPAY_TEST_PLAN_POWER_MONTHLY");
const razorpayTestPlanPowerYearly = defineSecret("RAZORPAY_TEST_PLAN_POWER_YEARLY");
const razorpayLiveKeyId = defineSecret("RAZORPAY_LIVE_KEY_ID");
const razorpayLiveKeySecret = defineSecret("RAZORPAY_LIVE_KEY_SECRET");
const razorpayLiveWebhookSecret = defineSecret("RAZORPAY_LIVE_WEBHOOK_SECRET");

export const getOrCreateUserProfile = onCall(
  callableOptions,
  getOrCreateUserProfileController
);

export const deleteAccount = onCall(
  {
    ...callableOptions,
    secrets: [
      razorpayTestKeyId,
      razorpayTestKeySecret,
      razorpayLiveKeyId,
      razorpayLiveKeySecret,
    ],
  },
  (request) =>
    deleteAccountController(request, {
      razorpayTestKeyId: razorpayTestKeyId.value(),
      razorpayTestKeySecret: razorpayTestKeySecret.value(),
      razorpayLiveKeyId: razorpayLiveKeyId.value(),
      razorpayLiveKeySecret: razorpayLiveKeySecret.value(),
    })
);

export const getPlanStatus = onCall(
  callableOptions,
  getPlanStatusController
);

export const getLiveBillingPlans = onCall(
  callableOptions,
  getLiveBillingPlansController
);

export const createRazorpayTestSubscription = onCall(
  {
    ...callableOptions,
    secrets: [
      razorpayTestKeyId,
      razorpayTestKeySecret,
      razorpayTestAllowedEmails,
      razorpayTestPlanPlusMonthly,
      razorpayTestPlanPlusYearly,
      razorpayTestPlanProMonthly,
      razorpayTestPlanProYearly,
      razorpayTestPlanPowerMonthly,
      razorpayTestPlanPowerYearly,
    ],
  },
  (request) =>
    createRazorpayTestSubscriptionController(request, {
      keyId: razorpayTestKeyId.value(),
      keySecret: razorpayTestKeySecret.value(),
      allowedEmails: razorpayTestAllowedEmails.value(),
      plans: {
        plusMonthly: razorpayTestPlanPlusMonthly.value(),
        plusYearly: razorpayTestPlanPlusYearly.value(),
        proMonthly: razorpayTestPlanProMonthly.value(),
        proYearly: razorpayTestPlanProYearly.value(),
        powerMonthly: razorpayTestPlanPowerMonthly.value(),
        powerYearly: razorpayTestPlanPowerYearly.value(),
      },
    })
);

export const verifyRazorpayTestPayment = onCall(
  {
    ...callableOptions,
    secrets: [razorpayTestKeySecret],
  },
  (request) =>
    verifyRazorpayTestPaymentController(request, {
      keySecret: razorpayTestKeySecret.value(),
    })
);

export const cancelRazorpayTestSubscription = onCall(
  {
    ...callableOptions,
    secrets: [razorpayTestKeyId, razorpayTestKeySecret],
  },
  (request) =>
    cancelRazorpayTestSubscriptionController(request, {
      keyId: razorpayTestKeyId.value(),
      keySecret: razorpayTestKeySecret.value(),
    })
);

export const createRazorpayLiveSubscription = onCall(
  {
    ...callableOptions,
    secrets: [
      razorpayLiveKeyId,
      razorpayLiveKeySecret,
    ],
  },
  (request) =>
    createRazorpayLiveSubscriptionController(request, {
      keyId: razorpayLiveKeyId.value(),
      keySecret: razorpayLiveKeySecret.value(),
      plans: {
        inr: {
          proMonthly: "",
          proYearly: "",
          powerMonthly: "",
          powerYearly: "",
        },
      },
    })
);

export const createRazorpayLiveOrder = onCall(
  {
    ...callableOptions,
    secrets: [razorpayLiveKeyId, razorpayLiveKeySecret],
  },
  (request) =>
    createRazorpayLiveOrderController(request, {
      keyId: razorpayLiveKeyId.value(),
      keySecret: razorpayLiveKeySecret.value(),
    })
);

export const verifyRazorpayLiveOrderPayment = onCall(
  {
    ...callableOptions,
    secrets: [razorpayLiveKeyId, razorpayLiveKeySecret],
  },
  (request) =>
    verifyRazorpayLiveOrderPaymentController(request, {
      keyId: razorpayLiveKeyId.value(),
      keySecret: razorpayLiveKeySecret.value(),
    })
);

export const verifyRazorpayLivePayment = onCall(
  {
    ...callableOptions,
    secrets: [razorpayLiveKeySecret],
  },
  (request) =>
    verifyRazorpayLivePaymentController(request, {
      keySecret: razorpayLiveKeySecret.value(),
    })
);

export const cancelRazorpayLiveSubscription = onCall(
  {
    ...callableOptions,
    secrets: [razorpayLiveKeyId, razorpayLiveKeySecret],
  },
  (request) =>
    cancelRazorpayLiveSubscriptionController(request, {
      keyId: razorpayLiveKeyId.value(),
      keySecret: razorpayLiveKeySecret.value(),
    })
);

export const checkUsageBeforeAction = onCall(
  {
    ...callableOptions,
    maxInstances: 10,
  },
  checkUsageBeforeActionController
);

export const processAssistantReplyStream = onRequest(
  {
    ...warmAssistantRequestOptions,
    secrets: [geminiApiKey, deepseekApiKey, openAiApiKey],
  },
  async (request, response) =>
    processAssistantReplyStreamController(request, response, {
      geminiApiKey: geminiApiKey.value(),
      deepseekApiKey: deepseekApiKey.value(),
      openAiApiKey: openAiApiKey.value(),
    })
);

export const processAssistantReplyStreamAsia = onRequest(
  {
    ...warmAssistantAsiaRequestOptions,
    secrets: [geminiApiKey, deepseekApiKey, openAiApiKey],
  },
  async (request, response) =>
    processAssistantReplyStreamController(request, response, {
      geminiApiKey: geminiApiKey.value(),
      deepseekApiKey: deepseekApiKey.value(),
      openAiApiKey: openAiApiKey.value(),
    })
);

export const trackSttUsage = onCall(
  callableOptions,
  trackSttUsageController
);

export const razorpayTestWebhook = onRequest(
  {
    region: "us-central1",
    cors: true,
    invoker: "public",
    secrets: [
      razorpayTestWebhookSecret,
      razorpayTestPlanPlusMonthly,
      razorpayTestPlanPlusYearly,
      razorpayTestPlanProMonthly,
      razorpayTestPlanProYearly,
      razorpayTestPlanPowerMonthly,
      razorpayTestPlanPowerYearly,
    ],
  },
  async (request, response) =>
    razorpayTestWebhookController(request, response, {
      webhookSecret: razorpayTestWebhookSecret.value(),
      plans: {
        plusMonthly: razorpayTestPlanPlusMonthly.value(),
        plusYearly: razorpayTestPlanPlusYearly.value(),
        proMonthly: razorpayTestPlanProMonthly.value(),
        proYearly: razorpayTestPlanProYearly.value(),
        powerMonthly: razorpayTestPlanPowerMonthly.value(),
        powerYearly: razorpayTestPlanPowerYearly.value(),
      },
    })
);

export const razorpayLiveWebhook = onRequest(
  {
    region: "us-central1",
    cors: true,
    invoker: "public",
    secrets: [
      razorpayLiveWebhookSecret,
    ],
  },
  async (request, response) =>
    razorpayLiveWebhookController(request, response, {
      webhookSecret: razorpayLiveWebhookSecret.value(),
      plans: {
        inr: {
          plusMonthly: "",
          plusYearly: "",
          proMonthly: "",
          proYearly: "",
          powerMonthly: "",
          powerYearly: "",
        },
      },
    })
);

export const createDeepgramStreamToken = onRequest(
  {
    ...warmSttTokenRequestOptions,
    secrets: [assemblyAiApiKey],
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).json({
        success: false,
        code: "METHOD_NOT_ALLOWED",
        message: "Use POST for createDeepgramStreamToken.",
      });
      return;
    }

    try {
      const authUser = await requireBearerAuth(request.header("authorization"));
      const result = await createDeepgramTokenForAuthenticatedUser(
        authUser,
        isCreateDeepgramTokenData(request.body) ? request.body : undefined,
        {
          assemblyAiApiKey: assemblyAiApiKey.value(),
        }
      );

      if (!result.success) {
        response.status(getCreateTokenHttpStatus(result.code)).json(result);
        return;
      }

      response.status(200).json(result);
    } catch (error) {
      if (isHttpsError(error)) {
        response.status(401).json({
          success: false,
          code: "UNAUTHENTICATED",
          message: error.message,
        });
        return;
      }

      console.error("[createDeepgramStreamToken] Unexpected error", error);
      response.status(500).json({
        success: false,
        code: "INTERNAL",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export const trackSttUsageHttp = onRequest(
  {
    region: "us-central1",
    cors: true,
    invoker: "public",
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).json({
        success: false,
        code: "METHOD_NOT_ALLOWED",
        message: "Use POST for trackSttUsageHttp.",
      });
      return;
    }

    try {
      const authUser = await requireBearerAuth(request.header("authorization"));
      const result = await trackSttUsageForAuthenticatedUser(
        authUser,
        isTrackSttUsageData(request.body) ? request.body : undefined
      );

      if (!result.success) {
        response.status(getTrackUsageHttpStatus(result.code)).json(result);
        return;
      }

      response.status(200).json(result);
    } catch (error) {
      if (isHttpsError(error)) {
        response.status(401).json({
          success: false,
          code: "UNAUTHENTICATED",
          message: error.message,
        });
        return;
      }

      console.error("[trackSttUsageHttp] Unexpected error", error);
      response.status(500).json({
        success: false,
        code: "INTERNAL",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

function isHttpsError(error: unknown): error is HttpsError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  );
}
