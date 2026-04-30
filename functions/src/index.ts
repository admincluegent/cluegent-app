import { onCall, onRequest, type HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getOrCreateUserProfileController } from "./controllers/userController.js";
import {
  activatePlanController,
  checkUsageBeforeActionController,
  getPlanStatusController,
} from "./controllers/usageController.js";
import {
  createRazorpayTestSubscriptionController,
  razorpayTestWebhookController,
  resetTestSubscriptionController,
  verifyRazorpayTestPaymentController,
} from "./controllers/billingController.js";
import {
  createDeepgramTokenForAuthenticatedUser,
  getCreateTokenHttpStatus,
  getTrackUsageHttpStatus,
  isCreateDeepgramTokenData,
  isTrackSttUsageData,
  processAssistantReplyController,
  processAssistantReplyStreamController,
  transcribeAudioController,
  transcribeAudioForAuthenticatedUser,
  trackSttUsageForAuthenticatedUser,
  trackSttUsageController,
} from "./controllers/assistantController.js";
import { requireBearerAuth } from "./utils/auth.js";

const callableOptions = {
  region: "us-central1" as const,
  cors: true,
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

export const getOrCreateUserProfile = onCall(
  callableOptions,
  getOrCreateUserProfileController
);

export const getPlanStatus = onCall(
  callableOptions,
  getPlanStatusController
);

export const activatePlan = onCall(
  callableOptions,
  activatePlanController
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

export const resetTestSubscription = onCall(
  callableOptions,
  resetTestSubscriptionController
);

export const checkUsageBeforeAction = onCall(
  callableOptions,
  checkUsageBeforeActionController
);

export const processAssistantReply = onCall(
  {
    ...callableOptions,
    secrets: [geminiApiKey, deepseekApiKey],
  },
  (request) =>
    processAssistantReplyController(request, {
      geminiApiKey: geminiApiKey.value(),
      deepseekApiKey: deepseekApiKey.value(),
    })
);

export const processAssistantReplyStream = onRequest(
  {
    region: "us-central1",
    cors: true,
    invoker: "public",
    secrets: [deepseekApiKey],
  },
  async (request, response) =>
    processAssistantReplyStreamController(request, response, {
      deepseekApiKey: deepseekApiKey.value(),
    })
);

export const transcribeAudio = onCall(
  {
    ...callableOptions,
    secrets: [],
  },
  (request) =>
    transcribeAudioController(request, {
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
    ],
  },
  async (request, response) =>
    razorpayTestWebhookController(request, response, {
      webhookSecret: razorpayTestWebhookSecret.value(),
      plans: {
        proMonthly: razorpayTestPlanProMonthly.value(),
        proYearly: razorpayTestPlanProYearly.value(),
      },
    })
);

export const createDeepgramStreamToken = onRequest(
  {
    region: "us-central1",
    cors: true,
    invoker: "public",
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

function getHttpStatusFromTranscriptionFailure(code: string) {
  switch (code) {
    case "UNAUTHENTICATED":
      return 401;
    case "STT_LIMIT_EXCEEDED":
      return 429;
    case "GROQ_REQUEST_FAILED":
      return 502;
    default:
      return 400;
  }
}

function isHttpsError(error: unknown): error is HttpsError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  );
}

export const transcribeAudioHttp = onRequest(
  {
    region: "us-central1",
    cors: true,
    invoker: "public",
    secrets: [],
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).json({
        success: false,
        code: "METHOD_NOT_ALLOWED",
        message: "Use POST for transcribeAudioHttp.",
      });
      return;
    }

    try {
      const authUser = await requireBearerAuth(request.header("authorization"));
      const result = await transcribeAudioForAuthenticatedUser(
        authUser,
        request.body as {
          audioBase64?: string;
          mimeType?: string;
          durationSeconds?: number;
          language?: string;
        }
      );

      if (!result.success) {
        response.status(getHttpStatusFromTranscriptionFailure(result.code)).json(result);
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

      console.error("[transcribeAudioHttp] Unexpected error", error);
      response.status(500).json({
        success: false,
        code: "INTERNAL",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
