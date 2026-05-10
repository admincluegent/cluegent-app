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
  createRazorpayTestSubscriptionController,
  razorpayTestWebhookController,
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
  minInstances: 1,
  memory: "1GiB" as const,
  timeoutSeconds: 120,
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
const assemblyAiApiKey = defineSecret("ASSEMBLY_AI_API_KEY");
const razorpayTestKeyId = defineSecret("RAZORPAY_TEST_KEY_ID");
const razorpayTestKeySecret = defineSecret("RAZORPAY_TEST_KEY_SECRET");
const razorpayTestWebhookSecret = defineSecret("RAZORPAY_TEST_WEBHOOK_SECRET");
const razorpayTestAllowedEmails = defineSecret("RAZORPAY_TEST_ALLOWED_EMAILS");
const razorpayTestPlanProMonthly = defineSecret("RAZORPAY_TEST_PLAN_PRO_MONTHLY");
const razorpayTestPlanProYearly = defineSecret("RAZORPAY_TEST_PLAN_PRO_YEARLY");
const razorpayTestPlanPowerMonthly = defineSecret("RAZORPAY_TEST_PLAN_POWER_MONTHLY");
const razorpayTestPlanPowerYearly = defineSecret("RAZORPAY_TEST_PLAN_POWER_YEARLY");

export const getOrCreateUserProfile = onCall(
  callableOptions,
  getOrCreateUserProfileController
);

export const deleteAccount = onCall(
  {
    ...callableOptions,
    secrets: [razorpayTestKeyId, razorpayTestKeySecret],
  },
  (request) =>
    deleteAccountController(request, {
      razorpayTestKeyId: razorpayTestKeyId.value(),
      razorpayTestKeySecret: razorpayTestKeySecret.value(),
    })
);

export const getPlanStatus = onCall(
  callableOptions,
  getPlanStatusController
);

export const createRazorpayTestSubscription = onCall(
  {
    ...callableOptions,
    secrets: [
      razorpayTestKeyId,
      razorpayTestKeySecret,
      razorpayTestAllowedEmails,
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

export const checkUsageBeforeAction = onCall(
  callableOptions,
  checkUsageBeforeActionController
);

export const processAssistantReplyStream = onRequest(
  {
    ...warmAssistantRequestOptions,
    secrets: [geminiApiKey, deepseekApiKey],
  },
  async (request, response) =>
    processAssistantReplyStreamController(request, response, {
      geminiApiKey: geminiApiKey.value(),
      deepseekApiKey: deepseekApiKey.value(),
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
        proMonthly: razorpayTestPlanProMonthly.value(),
        proYearly: razorpayTestPlanProYearly.value(),
        powerMonthly: razorpayTestPlanPowerMonthly.value(),
        powerYearly: razorpayTestPlanPowerYearly.value(),
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
