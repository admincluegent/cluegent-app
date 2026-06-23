import { FieldValue } from "firebase-admin/firestore";
import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import {
  type AuthenticatedUser,
  db,
  requireAuth,
  requireBearerAuth,
} from "../utils/auth.js";
import { ensureUsageDocuments } from "./usageController.js";
import {
  buildPlanStatus,
  getUserRefs,
  getPlanPeriodUsage,
  isFreeTrialExhausted,
  materializeFreeTrialUsage,
  materializeSubscription,
  materializeUsage,
} from "../utils/usage.js";
import { getMonthKey } from "../utils/monthKey.js";
import {
  DEFAULT_DEEPSEEK_CHAT_MODEL_ID,
  type DeepSeekChatModelId,
} from "../config/deepseek.js";
import {
  DEFAULT_OPENAI_CHAT_MODEL_ID,
  type OpenAiChatModelId,
} from "../config/openai.js";
import {
  DeepSeekServiceError,
  generateDeepSeekReply,
  streamDeepSeekReply,
} from "../services/deepseekService.js";
import {
  AssemblyServiceError,
  createAssemblyStreamingAccessToken,
} from "../services/assemblyService.js";
import {
  GeminiServiceError,
  generateGeminiReply,
  streamGeminiReply,
} from "../services/geminiService.js";
import {
  OpenAiServiceError,
  generateOpenAiReply,
  streamOpenAiReply,
} from "../services/openaiService.js";
import { estimateDeepSeekRequestCost } from "../utils/deepseekCost.js";
import { estimateGeminiRequestCost } from "../utils/geminiCost.js";
import { estimateOpenAiRequestCost } from "../utils/openaiCost.js";

interface ProcessAssistantReplyData {
  prompt: string;
  screenshotBase64?: string;
  screenshotUrl?: string;
  systemPrompt?: string;
  history?: AssistantHistoryEntry[];
}

interface AssistantHistoryEntry {
  role: "user" | "assistant" | "system";
  content: string;
}

interface TrackSttUsageData {
  durationSeconds: number;
}

interface CreateDeepgramTokenData {
  ttlSeconds?: number;
}

interface TranscribeAudioData {
  audioBase64?: string;
  mimeType?: string;
  durationSeconds?: number;
  language?: string;
}

type TrackUsageErrorCode = "UNAUTHENTICATED" | "STT_LIMIT_EXCEEDED";

interface TrackUsageFailureResponse {
  success: false;
  code: TrackUsageErrorCode;
  message: string;
}

interface TrackUsageSuccessResponse {
  success: true;
  usage: {
    sttSecondsAdded: number;
    estimatedCostUsdAdded: number;
  };
  remaining: {
    sttSecondsRemaining: number;
  };
}

type CreateTokenErrorCode =
  | "UNAUTHENTICATED"
  | "STT_LIMIT_EXCEEDED"
  | "ASSEMBLY_REQUEST_FAILED";

interface CreateTokenFailureResponse {
  success: false;
  code: CreateTokenErrorCode;
  message: string;
}

interface CreateTokenSuccessResponse {
  success: true;
  token: {
    accessToken: string;
    expiresInSeconds: number;
  };
  remaining: {
    sttSecondsRemaining: number;
  };
}

type AssistantErrorCode =
  | "PROMPT_LIMIT_EXCEEDED"
  | "SCREENSHOT_LIMIT_EXCEEDED"
  | "UNAUTHENTICATED"
  | "GROQ_REQUEST_FAILED"
  | "SUBSCRIPTION_INACTIVE";

type TranscriptionErrorCode =
  | "UNAUTHENTICATED"
  | "STT_LIMIT_EXCEEDED"
  | "GROQ_REQUEST_FAILED";

interface AssistantFailureResponse {
  success: false;
  code: AssistantErrorCode;
  message: string;
}

interface AssistantSuccessResponse {
  success: true;
  reply: string;
  modelRoute?: {
    provider: AssistantProvider;
    model: string;
    premiumApplied?: boolean;
    premiumAllowance?: number;
    premiumUsedBefore?: number;
  };
  usage: {
    inputTokens: number;
    outputTokens: number;
    screenshotCountAdded: number;
    estimatedCostUsdAdded: number;
  };
  remaining: {
    promptsRemaining: number;
    screenshotsRemaining: number;
  };
}

type AssistantProvider = "gemini" | "deepseek" | "openai";

type AssistantModelRoute =
  | {
      provider: "openai";
      modelId: OpenAiChatModelId;
      premiumApplied: true;
      premiumAllowance: number;
      premiumUsedBefore: number;
      premiumCounter: "openAiPromptCount" | "openAiScreenshotCount";
    }
  | {
      provider: "gemini";
      modelId: "gemini-2.5-flash-lite";
      premiumApplied: false;
      premiumAllowance: number;
      premiumUsedBefore: number;
      premiumCounter: null;
    }
  | {
      provider: "deepseek";
      modelId: DeepSeekChatModelId;
      premiumApplied: false;
      premiumAllowance: number;
      premiumUsedBefore: number;
      premiumCounter: null;
    };

const OPENAI_FREE_MONTHLY_PROMPT_ALLOWANCE = 20;
const OPENAI_FREE_MONTHLY_SCREENSHOT_ALLOWANCE = 20;
const OPENAI_PRO_MONTHLY_PROMPT_ALLOWANCE = 200;
const OPENAI_PRO_MONTHLY_SCREENSHOT_ALLOWANCE = 200;
const OPENAI_POWER_MONTHLY_PROMPT_ALLOWANCE = 500;
const OPENAI_POWER_MONTHLY_SCREENSHOT_ALLOWANCE = 500;

function getOpenAiMonthlyAllowance(input: {
  subscription: ReturnType<typeof materializeSubscription>;
  hasScreenshot: boolean;
}) {
  if (input.subscription.status !== "active" && input.subscription.plan !== "free") {
    return 0;
  }

  if (input.subscription.plan === "free") {
    return input.hasScreenshot
      ? OPENAI_FREE_MONTHLY_SCREENSHOT_ALLOWANCE
      : OPENAI_FREE_MONTHLY_PROMPT_ALLOWANCE;
  }

  if (input.subscription.plan === "power") {
    return input.hasScreenshot
      ? OPENAI_POWER_MONTHLY_SCREENSHOT_ALLOWANCE
      : OPENAI_POWER_MONTHLY_PROMPT_ALLOWANCE;
  }

  if (input.subscription.plan === "pro") {
    return input.hasScreenshot
      ? OPENAI_PRO_MONTHLY_SCREENSHOT_ALLOWANCE
      : OPENAI_PRO_MONTHLY_PROMPT_ALLOWANCE;
  }

  return 0;
}

function assertSubscriptionActive(
  subscription: ReturnType<typeof materializeSubscription>
) {
  if (subscription.plan !== "free" && subscription.status !== "active") {
    throw new Error("SUBSCRIPTION_INACTIVE");
  }
}

function selectAssistantModelRoute(input: {
  subscription: ReturnType<typeof materializeSubscription>;
  usage: ReturnType<typeof materializeUsage>;
  hasScreenshot: boolean;
  hasOpenAiApiKey: boolean;
  hasGeminiApiKey: boolean;
  hasDeepSeekApiKey: boolean;
}): AssistantModelRoute {
  const premiumAllowance = getOpenAiMonthlyAllowance(input);
  const premiumCounter = input.hasScreenshot
    ? "openAiScreenshotCount"
    : "openAiPromptCount";
  const planPeriodUsage = getPlanPeriodUsage(input.subscription, input.usage);
  const premiumUsedBefore = planPeriodUsage[premiumCounter];

  if (
    input.hasOpenAiApiKey &&
    premiumAllowance > 0 &&
    premiumUsedBefore < premiumAllowance
  ) {
    return {
      provider: "openai",
      modelId: DEFAULT_OPENAI_CHAT_MODEL_ID,
      premiumApplied: true,
      premiumAllowance,
      premiumUsedBefore,
      premiumCounter,
    };
  }

  if (input.hasScreenshot) {
    if (!input.hasGeminiApiKey) {
      throw new Error("GEMINI_CONFIG_MISSING");
    }

    return {
      provider: "gemini",
      modelId: "gemini-2.5-flash-lite",
      premiumApplied: false,
      premiumAllowance,
      premiumUsedBefore,
      premiumCounter: null,
    };
  }

  if (!input.hasDeepSeekApiKey) {
    throw new Error("DEEPSEEK_CONFIG_MISSING");
  }

  return {
    provider: "deepseek",
    modelId: DEFAULT_DEEPSEEK_CHAT_MODEL_ID,
    premiumApplied: false,
    premiumAllowance,
    premiumUsedBefore,
    premiumCounter: null,
  };
}

interface TranscriptionFailureResponse {
  success: false;
  code: TranscriptionErrorCode;
  message: string;
}

interface TranscriptionSuccessResponse {
  success: true;
  transcript: string;
  usage: {
    sttSecondsAdded: number;
    estimatedCostUsdAdded: number;
  };
  remaining: {
    sttSecondsRemaining: number;
  };
}

function assistantFailure(
  code: AssistantErrorCode,
  message: string
): AssistantFailureResponse {
  return {
    success: false,
    code,
    message,
  };
}

function transcriptionFailure(
  code: TranscriptionErrorCode,
  message: string
): TranscriptionFailureResponse {
  return {
    success: false,
    code,
    message,
  };
}

function trackUsageFailure(
  code: TrackUsageErrorCode,
  message: string
): TrackUsageFailureResponse {
  return {
    success: false,
    code,
    message,
  };
}

function createTokenFailure(
  code: CreateTokenErrorCode,
  message: string
): CreateTokenFailureResponse {
  return {
    success: false,
    code,
    message,
  };
}

function getHttpAssistantData(request: {
  body?: unknown;
}): Partial<ProcessAssistantReplyData> {
  const body = request.body as Record<string, unknown> | undefined;

  if (body?.data && typeof body.data === "object") {
    return body.data as Partial<ProcessAssistantReplyData>;
  }

  return (body ?? {}) as Partial<ProcessAssistantReplyData>;
}

function getAuthorizationHeader(request: {
  get?: (name: string) => string | undefined;
  headers?: Record<string, string | string[] | undefined>;
}) {
  return (
    request.get?.("authorization") ??
    request.get?.("Authorization") ??
    request.headers?.authorization
  );
}

function writeSse(response: { write: (chunk: string) => void }, payload: unknown) {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function sendAssistantHttpFailure(
  response: {
    headersSent?: boolean;
    status: (code: number) => { json: (payload: unknown) => void };
    write: (chunk: string) => void;
    end: () => void;
  },
  status: number,
  code: AssistantErrorCode,
  message: string
) {
  if (response.headersSent) {
    writeSse(response, { error: { code, message } });
    response.end();
    return;
  }

  response.status(status).json({
    success: false,
    code,
    message,
  });
}

async function reserveAssistantUsage(input: {
  uid: string;
  monthKey: string;
  hasScreenshot: boolean;
  hasOpenAiApiKey: boolean;
  hasGeminiApiKey: boolean;
  hasDeepSeekApiKey: boolean;
}) {
  const refs = getUserRefs(input.uid, input.monthKey);
  const userRef = db.doc(refs.userPath);
  const subscriptionRef = db.doc(refs.subscriptionPath);
  const usageRef = db.doc(refs.usagePath);

  return db.runTransaction(async (transaction) => {
    const [userSnap, subscriptionSnap, usageSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(subscriptionRef),
      transaction.get(usageRef),
    ]);
    const latestSubscription = materializeSubscription(
      subscriptionSnap.data() as ReturnType<typeof materializeSubscription>
    );
    const latestUsage = materializeUsage(
      usageSnap.data() as ReturnType<typeof materializeUsage>,
      input.monthKey
    );
    const freeTrialUsage = materializeFreeTrialUsage(userSnap.data());
    const latestPlanStatus = buildPlanStatus(
      latestSubscription,
      latestUsage,
      freeTrialUsage
    );

    assertSubscriptionActive(latestSubscription);

    if (isFreeTrialExhausted(latestPlanStatus)) {
      throw new Error("FREE_TRIAL_LIMIT_EXCEEDED");
    }

    if (latestSubscription.plan !== "free" && latestPlanStatus.remaining.prompts <= 0) {
      throw new Error("PROMPT_LIMIT_EXCEEDED");
    }

    if (
      latestSubscription.plan !== "free" &&
      input.hasScreenshot &&
      latestPlanStatus.remaining.screenshots <= 0
    ) {
      throw new Error("SCREENSHOT_LIMIT_EXCEEDED");
    }

    const route = selectAssistantModelRoute({
      subscription: latestSubscription,
      usage: latestUsage,
      hasScreenshot: input.hasScreenshot,
      hasOpenAiApiKey: input.hasOpenAiApiKey,
      hasGeminiApiKey: input.hasGeminiApiKey,
      hasDeepSeekApiKey: input.hasDeepSeekApiKey,
    });

    transaction.set(
      usageRef,
      {
        monthKey: input.monthKey,
        promptCount: FieldValue.increment(1),
        screenshotCount: FieldValue.increment(input.hasScreenshot ? 1 : 0),
        ...(route.premiumCounter
          ? { [route.premiumCounter]: FieldValue.increment(1) }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      route,
      remaining: {
        promptsRemaining:
          latestSubscription.plan === "free"
            ? Number.MAX_SAFE_INTEGER
            : Math.max(latestPlanStatus.remaining.prompts - 1, 0),
        screenshotsRemaining:
          latestSubscription.plan === "free"
            ? Number.MAX_SAFE_INTEGER
            : Math.max(
                latestPlanStatus.remaining.screenshots -
                  (input.hasScreenshot ? 1 : 0),
                0
              ),
      },
    };
  });
}

function isPaidUnlimitedPlan(subscription: ReturnType<typeof materializeSubscription>) {
  return (
    subscription.status === "active" &&
    (subscription.plan === "pro" || subscription.plan === "power")
  );
}

function selectPaidUnlimitedFastRoute(input: {
  hasScreenshot: boolean;
  hasGeminiApiKey: boolean;
  hasDeepSeekApiKey: boolean;
}): AssistantModelRoute {
  if (input.hasScreenshot) {
    if (!input.hasGeminiApiKey) {
      throw new Error("GEMINI_CONFIG_MISSING");
    }

    return {
      provider: "gemini",
      modelId: "gemini-2.5-flash-lite",
      premiumApplied: false,
      premiumAllowance: 0,
      premiumUsedBefore: 0,
      premiumCounter: null,
    };
  }

  if (!input.hasDeepSeekApiKey) {
    throw new Error("DEEPSEEK_CONFIG_MISSING");
  }

  return {
    provider: "deepseek",
    modelId: DEFAULT_DEEPSEEK_CHAT_MODEL_ID,
    premiumApplied: false,
    premiumAllowance: 0,
    premiumUsedBefore: 0,
    premiumCounter: null,
  };
}

async function prepareAssistantUsage(input: {
  uid: string;
  identity: AuthenticatedUser;
  hasScreenshot: boolean;
  hasOpenAiApiKey: boolean;
  hasGeminiApiKey: boolean;
  hasDeepSeekApiKey: boolean;
}) {
  const monthKey = getMonthKey();
  const refs = getUserRefs(input.uid, monthKey);
  const subscriptionSnap = await db.doc(refs.subscriptionPath).get();

  if (subscriptionSnap.exists) {
    const subscription = materializeSubscription(
      subscriptionSnap.data() as ReturnType<typeof materializeSubscription>
    );

    if (isPaidUnlimitedPlan(subscription)) {
      return {
        monthKey,
        route: selectPaidUnlimitedFastRoute({
          hasScreenshot: input.hasScreenshot,
          hasGeminiApiKey: input.hasGeminiApiKey,
          hasDeepSeekApiKey: input.hasDeepSeekApiKey,
        }),
        remaining: {
          promptsRemaining: Number.MAX_SAFE_INTEGER,
          screenshotsRemaining: Number.MAX_SAFE_INTEGER,
        },
      };
    }
  }

  const ensured = await ensureUsageDocuments(input.uid, input.identity);
  const reservation = await reserveAssistantUsage({
    uid: input.uid,
    monthKey: ensured.monthKey,
    hasScreenshot: input.hasScreenshot,
    hasOpenAiApiKey: input.hasOpenAiApiKey,
    hasGeminiApiKey: input.hasGeminiApiKey,
    hasDeepSeekApiKey: input.hasDeepSeekApiKey,
  });

  return {
    monthKey: ensured.monthKey,
    route: reservation.route,
    remaining: reservation.remaining,
  };
}

async function recordAssistantCost(input: {
  uid: string;
  monthKey: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}) {
  const refs = getUserRefs(input.uid, input.monthKey);
  const usageRef = db.doc(refs.usagePath);

  await usageRef.set(
    {
      monthKey: input.monthKey,
      inputTokens: FieldValue.increment(input.inputTokens),
      outputTokens: FieldValue.increment(input.outputTokens),
      estimatedCostUsd: FieldValue.increment(input.estimatedCostUsd),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function processAssistantReplyController(
  request: CallableRequest<ProcessAssistantReplyData>,
  input: {
    geminiApiKey: string;
    deepseekApiKey: string;
    openAiApiKey: string;
  }
): Promise<AssistantFailureResponse | AssistantSuccessResponse> {
  try {
    const authUser = requireAuth(request);
    const prompt = request.data?.prompt?.trim();
    const hasScreenshot = Boolean(
      request.data?.screenshotBase64?.trim() || request.data?.screenshotUrl?.trim()
    );

    if (!prompt) {
      throw new HttpsError("invalid-argument", "prompt is required.");
    }

    const geminiApiKey = input.geminiApiKey.trim();
    const deepseekApiKey = input.deepseekApiKey.trim();
    const openAiApiKey = input.openAiApiKey.trim();

    if (!geminiApiKey && !deepseekApiKey && !openAiApiKey) {
      return assistantFailure(
        "GROQ_REQUEST_FAILED",
        "None of OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_AI_API_KEY is configured in Firebase Functions."
      );
    }

    const fallbackInputText = [
      request.data?.systemPrompt,
      ...(request.data?.history?.map((entry) => entry.content) ?? []),
      prompt,
    ]
      .filter(Boolean)
      .join("\n");

    const preparedUsage = await prepareAssistantUsage({
      uid: authUser.uid,
      identity: authUser,
      hasScreenshot,
      hasOpenAiApiKey: Boolean(openAiApiKey),
      hasGeminiApiKey: Boolean(geminiApiKey),
      hasDeepSeekApiKey: Boolean(deepseekApiKey),
    });
    const route = preparedUsage.route;

    let replyText = "";
    let costEstimate: {
      inputTokens: number;
      outputTokens: number;
      estimatedCostUsd: number;
    } | null = null;
    let lastLlmError: Error | null = null;
    let resolvedProvider: AssistantProvider | null = null;

    const tryGemini = async () => {
      if (!geminiApiKey || replyText) {
        return;
      }

      try {
        const geminiResult = await generateGeminiReply({
          apiKey: geminiApiKey,
          prompt,
          screenshotBase64: request.data?.screenshotBase64,
          screenshotUrl: request.data?.screenshotUrl,
          systemPrompt: request.data?.systemPrompt,
          history: request.data?.history,
          modelId: route.modelId,
        });

        replyText = geminiResult.reply;
        resolvedProvider = "gemini";
        costEstimate = estimateGeminiRequestCost({
          modelId: geminiResult.modelId,
          inputTokens: geminiResult.usage.inputTokens,
          outputTokens: geminiResult.usage.outputTokens,
          screenshotCount: hasScreenshot ? 1 : 0,
          fallbackInputText,
          fallbackOutputText: geminiResult.reply,
        });
      } catch (error) {
        if (error instanceof GeminiServiceError) {
          lastLlmError = error;
        } else {
          throw error;
        }
      }
    };

    const tryDeepSeek = async () => {
      if (!deepseekApiKey || replyText) {
        return;
      }

      try {
        const deepseekResult = await generateDeepSeekReply({
          apiKey: deepseekApiKey,
          prompt,
          systemPrompt: request.data?.systemPrompt,
          history: request.data?.history,
          modelId: route.modelId,
        });

        replyText = deepseekResult.reply;
        resolvedProvider = "deepseek";
        costEstimate = estimateDeepSeekRequestCost({
          modelId: deepseekResult.modelId,
          inputTokens: deepseekResult.usage.inputTokens,
          outputTokens: deepseekResult.usage.outputTokens,
          fallbackInputText,
          fallbackOutputText: deepseekResult.reply,
        });
      } catch (error) {
        if (error instanceof DeepSeekServiceError) {
          lastLlmError = error;
        } else {
          throw error;
        }
      }
    };

    const tryOpenAi = async () => {
      if (!openAiApiKey || replyText) {
        return;
      }

      try {
        const openAiResult = await generateOpenAiReply({
          apiKey: openAiApiKey,
          prompt,
          screenshotBase64: request.data?.screenshotBase64,
          screenshotUrl: request.data?.screenshotUrl,
          systemPrompt: request.data?.systemPrompt,
          history: request.data?.history,
          modelId: route.modelId,
        });

        replyText = openAiResult.reply;
        resolvedProvider = "openai";
        costEstimate = estimateOpenAiRequestCost({
          modelId: openAiResult.modelId,
          inputTokens: openAiResult.usage.inputTokens,
          outputTokens: openAiResult.usage.outputTokens,
          screenshotCount: hasScreenshot ? 1 : 0,
          fallbackInputText,
          fallbackOutputText: openAiResult.reply,
        });
      } catch (error) {
        if (error instanceof OpenAiServiceError) {
          lastLlmError = error;
        } else {
          throw error;
        }
      }
    };

    if (route.provider === "openai") {
      await tryOpenAi();
    } else if (route.provider === "gemini") {
      await tryGemini();
    } else {
      await tryDeepSeek();
    }

    if (!replyText || !costEstimate) {
      const fallbackMessage = lastLlmError
        ? String((lastLlmError as Error).message)
        : `The backend-managed ${route.provider} request failed.`;
      return assistantFailure(
        "GROQ_REQUEST_FAILED",
        fallbackMessage
      );
    }

    console.info("[processAssistantReplyController] LLM provider used", {
      uid: authUser.uid,
      hasScreenshot,
      provider: resolvedProvider,
      model: route.modelId,
      premiumApplied: route.premiumApplied,
      premiumAllowance: route.premiumAllowance,
      premiumUsedBefore: route.premiumUsedBefore,
    });

    const finalCostEstimate = costEstimate as {
      inputTokens: number;
      outputTokens: number;
      estimatedCostUsd: number;
    };

    await recordAssistantCost({
      uid: authUser.uid,
      monthKey: preparedUsage.monthKey,
      inputTokens: finalCostEstimate.inputTokens,
      outputTokens: finalCostEstimate.outputTokens,
      estimatedCostUsd: finalCostEstimate.estimatedCostUsd,
    });

    return {
      success: true,
      reply: replyText,
      modelRoute: {
        provider: resolvedProvider ?? route.provider,
        model: route.modelId,
        premiumApplied: route.premiumApplied,
        premiumAllowance: route.premiumAllowance,
        premiumUsedBefore: route.premiumUsedBefore,
      },
      usage: {
        inputTokens: finalCostEstimate.inputTokens,
        outputTokens: finalCostEstimate.outputTokens,
        screenshotCountAdded: hasScreenshot ? 1 : 0,
        estimatedCostUsdAdded: finalCostEstimate.estimatedCostUsd,
      },
      remaining: preparedUsage.remaining,
    };
  } catch (error) {
    if (error instanceof HttpsError && error.code === "unauthenticated") {
      return assistantFailure(
        "UNAUTHENTICATED",
        "Sign in with Google before sending assistant requests."
      );
    }

    if (error instanceof Error && error.message === "PROMPT_LIMIT_EXCEEDED") {
      return assistantFailure(
        "PROMPT_LIMIT_EXCEEDED",
        "Monthly prompt limit exceeded for the current plan."
      );
    }

    if (error instanceof Error && error.message === "SUBSCRIPTION_INACTIVE") {
      return assistantFailure(
        "SUBSCRIPTION_INACTIVE",
        "Your subscription is not active. Please subscribe again to continue using Cluegent."
      );
    }

    if (error instanceof Error && error.message === "GEMINI_CONFIG_MISSING") {
      return assistantFailure(
        "GROQ_REQUEST_FAILED",
        "GEMINI_API_KEY is required for screenshot-attached requests after the OpenAI premium allowance is used."
      );
    }

    if (error instanceof Error && error.message === "DEEPSEEK_CONFIG_MISSING") {
      return assistantFailure(
        "GROQ_REQUEST_FAILED",
        "DEEPSEEK_AI_API_KEY is required for text-only requests after the OpenAI premium allowance is used."
      );
    }

    if (error instanceof Error && error.message === "FREE_TRIAL_LIMIT_EXCEEDED") {
      return assistantFailure(
        "PROMPT_LIMIT_EXCEEDED",
        "Free trial limit reached. Subscribe to continue using Cluegent."
      );
    }

    if (
      error instanceof Error &&
      error.message === "SCREENSHOT_LIMIT_EXCEEDED"
    ) {
      return assistantFailure(
        "SCREENSHOT_LIMIT_EXCEEDED",
        "Monthly screenshot limit exceeded for the current plan."
      );
    }

    if (error instanceof DeepSeekServiceError) {
      return assistantFailure("GROQ_REQUEST_FAILED", error.message);
    }

    if (error instanceof GeminiServiceError) {
      return assistantFailure("GROQ_REQUEST_FAILED", error.message);
    }

    if (error instanceof OpenAiServiceError) {
      return assistantFailure("GROQ_REQUEST_FAILED", error.message);
    }

    throw error;
  }
}

export async function processAssistantReplyStreamController(
  request: {
    method?: string;
    body?: unknown;
    get?: (name: string) => string | undefined;
    headers?: Record<string, string | string[] | undefined>;
  },
  response: {
    headersSent?: boolean;
    writableEnded?: boolean;
    setHeader: (name: string, value: string) => void;
    status: (code: number) => {
      json: (payload: unknown) => void;
      send: (payload?: unknown) => void;
    };
    write: (chunk: string) => void;
    end: () => void;
    flushHeaders?: () => void;
  },
  input: {
    geminiApiKey: string;
    deepseekApiKey: string;
    openAiApiKey: string;
  }
) {
  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({
      success: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Use POST for assistant streaming.",
    });
    return;
  }

  try {
    const authHeader = getAuthorizationHeader(request);
    const authUser = await requireBearerAuth(
      Array.isArray(authHeader) ? authHeader[0] : authHeader
    );
    const data = getHttpAssistantData(request);
    const prompt = data.prompt?.trim();
    const hasScreenshot = Boolean(
      data.screenshotBase64?.trim() || data.screenshotUrl?.trim()
    );
    const geminiApiKey = input.geminiApiKey.trim();
    const deepseekApiKey = input.deepseekApiKey.trim();
    const openAiApiKey = input.openAiApiKey.trim();

    if (!prompt) {
      sendAssistantHttpFailure(
        response,
        400,
        "GROQ_REQUEST_FAILED",
        "prompt is required."
      );
      return;
    }

    if (!geminiApiKey && !deepseekApiKey && !openAiApiKey) {
      sendAssistantHttpFailure(
        response,
        500,
        "GROQ_REQUEST_FAILED",
        "None of OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_AI_API_KEY is configured in Firebase Functions."
      );
      return;
    }

    const preparedUsage = await prepareAssistantUsage({
      uid: authUser.uid,
      identity: authUser,
      hasScreenshot,
      hasOpenAiApiKey: Boolean(openAiApiKey),
      hasGeminiApiKey: Boolean(geminiApiKey),
      hasDeepSeekApiKey: Boolean(deepseekApiKey),
    });
    const route = preparedUsage.route;

    response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders?.();

    writeSse(response, {
      meta: {
        provider: route.provider,
        model: route.modelId,
        premiumApplied: route.premiumApplied,
        premiumAllowance: route.premiumAllowance,
        premiumUsedBefore: route.premiumUsedBefore,
      },
    });

    const fallbackInputText = [
      data.systemPrompt,
      ...(data.history?.map((entry) => entry.content) ?? []),
      prompt,
    ]
      .filter(Boolean)
      .join("\n");

    const streamDelta = (delta: string) => {
      if (!response.writableEnded) {
        writeSse(response, { delta });
      }
    };

    let resolvedRoute = route;
    let assistantResult: Awaited<ReturnType<typeof streamOpenAiReply>>;

    try {
      assistantResult =
        route.provider === "openai"
          ? await streamOpenAiReply(
              {
                apiKey: openAiApiKey,
                prompt,
                screenshotBase64: data.screenshotBase64,
                screenshotUrl: data.screenshotUrl,
                systemPrompt: data.systemPrompt,
                history: data.history,
                modelId: route.modelId,
              },
              streamDelta
            )
          : route.provider === "gemini"
            ? await streamGeminiReply(
                {
                  apiKey: geminiApiKey,
                  prompt,
                  screenshotBase64: data.screenshotBase64,
                  screenshotUrl: data.screenshotUrl,
                  systemPrompt: data.systemPrompt,
                  history: data.history,
                  modelId: route.modelId,
                },
                streamDelta
              )
            : await streamDeepSeekReply(
                {
                  apiKey: deepseekApiKey,
                  prompt,
                  systemPrompt: data.systemPrompt,
                  history: data.history,
                  modelId: route.modelId,
                },
                streamDelta
              );
    } catch (error) {
      if (route.provider !== "openai" || !(error instanceof OpenAiServiceError)) {
        throw error;
      }

      console.warn("[processAssistantReplyStream] OpenAI route failed; falling back", {
        hasScreenshot,
        model: route.modelId,
        error: error.message,
      });

      if (hasScreenshot && geminiApiKey) {
        resolvedRoute = {
          provider: "gemini",
          modelId: "gemini-2.5-flash-lite",
          premiumApplied: false,
          premiumAllowance: route.premiumAllowance,
          premiumUsedBefore: route.premiumUsedBefore,
          premiumCounter: null,
        };
        writeSse(response, {
          meta: {
            provider: resolvedRoute.provider,
            model: resolvedRoute.modelId,
            fallbackFrom: "openai",
          },
        });
        assistantResult = await streamGeminiReply(
          {
            apiKey: geminiApiKey,
            prompt,
            screenshotBase64: data.screenshotBase64,
            screenshotUrl: data.screenshotUrl,
            systemPrompt: data.systemPrompt,
            history: data.history,
            modelId: resolvedRoute.modelId,
          },
          streamDelta
        );
      } else if (!hasScreenshot && deepseekApiKey) {
        resolvedRoute = {
          provider: "deepseek",
          modelId: DEFAULT_DEEPSEEK_CHAT_MODEL_ID,
          premiumApplied: false,
          premiumAllowance: route.premiumAllowance,
          premiumUsedBefore: route.premiumUsedBefore,
          premiumCounter: null,
        };
        writeSse(response, {
          meta: {
            provider: resolvedRoute.provider,
            model: resolvedRoute.modelId,
            fallbackFrom: "openai",
          },
        });
        assistantResult = await streamDeepSeekReply(
          {
            apiKey: deepseekApiKey,
            prompt,
            systemPrompt: data.systemPrompt,
            history: data.history,
            modelId: resolvedRoute.modelId,
          },
          streamDelta
        );
      } else {
        throw error;
      }
    }

    const costEstimate =
      resolvedRoute.provider === "openai"
        ? estimateOpenAiRequestCost({
            modelId: assistantResult.modelId,
            inputTokens: assistantResult.usage.inputTokens,
            outputTokens: assistantResult.usage.outputTokens,
            screenshotCount: hasScreenshot ? 1 : 0,
            fallbackInputText,
            fallbackOutputText: assistantResult.reply,
          })
        : resolvedRoute.provider === "gemini"
          ? estimateGeminiRequestCost({
              modelId: assistantResult.modelId,
              inputTokens: assistantResult.usage.inputTokens,
              outputTokens: assistantResult.usage.outputTokens,
              screenshotCount: 1,
              fallbackInputText,
              fallbackOutputText: assistantResult.reply,
            })
          : estimateDeepSeekRequestCost({
              modelId: assistantResult.modelId,
              inputTokens: assistantResult.usage.inputTokens,
              outputTokens: assistantResult.usage.outputTokens,
              fallbackInputText,
              fallbackOutputText: assistantResult.reply,
            });

    await recordAssistantCost({
      uid: authUser.uid,
      monthKey: preparedUsage.monthKey,
      inputTokens: costEstimate.inputTokens,
      outputTokens: costEstimate.outputTokens,
      estimatedCostUsd: costEstimate.estimatedCostUsd,
    });

    writeSse(response, {
      done: true,
      usage: {
        inputTokens: costEstimate.inputTokens,
        outputTokens: costEstimate.outputTokens,
        screenshotCountAdded: hasScreenshot ? 1 : 0,
        estimatedCostUsdAdded: costEstimate.estimatedCostUsd,
      },
      remaining: preparedUsage.remaining,
    });
    response.end();
  } catch (error) {
    if (error instanceof HttpsError && error.code === "unauthenticated") {
      sendAssistantHttpFailure(
        response,
        401,
        "UNAUTHENTICATED",
        "Sign in with Google before sending assistant requests."
      );
      return;
    }

    if (error instanceof Error && error.message === "PROMPT_LIMIT_EXCEEDED") {
      sendAssistantHttpFailure(
        response,
        429,
        "PROMPT_LIMIT_EXCEEDED",
        "Monthly prompt limit exceeded for the current plan."
      );
      return;
    }

    if (error instanceof Error && error.message === "SUBSCRIPTION_INACTIVE") {
      sendAssistantHttpFailure(
        response,
        402,
        "SUBSCRIPTION_INACTIVE",
        "Your subscription is not active. Please subscribe again to continue using Cluegent."
      );
      return;
    }

    if (error instanceof Error && error.message === "GEMINI_CONFIG_MISSING") {
      sendAssistantHttpFailure(
        response,
        500,
        "GROQ_REQUEST_FAILED",
        "GEMINI_API_KEY is required for screenshot-attached requests after the OpenAI premium allowance is used."
      );
      return;
    }

    if (error instanceof Error && error.message === "DEEPSEEK_CONFIG_MISSING") {
      sendAssistantHttpFailure(
        response,
        500,
        "GROQ_REQUEST_FAILED",
        "DEEPSEEK_AI_API_KEY is required for text-only requests after the OpenAI premium allowance is used."
      );
      return;
    }

    if (error instanceof Error && error.message === "FREE_TRIAL_LIMIT_EXCEEDED") {
      sendAssistantHttpFailure(
        response,
        429,
        "PROMPT_LIMIT_EXCEEDED",
        "Free trial limit reached. Subscribe to continue using Cluegent."
      );
      return;
    }

    if (error instanceof DeepSeekServiceError) {
      sendAssistantHttpFailure(
        response,
        502,
        "GROQ_REQUEST_FAILED",
        error.message
      );
      return;
    }

    if (error instanceof GeminiServiceError) {
      sendAssistantHttpFailure(
        response,
        502,
        "GROQ_REQUEST_FAILED",
        error.message
      );
      return;
    }

    if (error instanceof OpenAiServiceError) {
      sendAssistantHttpFailure(
        response,
        502,
        "GROQ_REQUEST_FAILED",
        error.message
      );
      return;
    }

    if (
      error instanceof Error &&
      error.message === "SCREENSHOT_LIMIT_EXCEEDED"
    ) {
      sendAssistantHttpFailure(
        response,
        429,
        "SCREENSHOT_LIMIT_EXCEEDED",
        "Monthly screenshot limit exceeded for the current plan."
      );
      return;
    }

    sendAssistantHttpFailure(
      response,
      500,
      "GROQ_REQUEST_FAILED",
      error instanceof Error ? error.message : "Assistant streaming failed."
    );
  }
}

export async function trackSttUsageController(
  request: CallableRequest<TrackSttUsageData>
) {
  const authUser = requireAuth(request);
  return trackSttUsageForAuthenticatedUser(authUser, request.data);
}

export async function trackSttUsageForAuthenticatedUser(
  authUser: AuthenticatedUser,
  data: TrackSttUsageData | undefined
): Promise<TrackUsageFailureResponse | TrackUsageSuccessResponse> {
  try {
    if (
      typeof data?.durationSeconds !== "number" ||
      data.durationSeconds <= 0
    ) {
      throw new HttpsError(
        "invalid-argument",
        "durationSeconds must be a positive number."
      );
    }

    const durationSeconds = Math.max(1, Math.ceil(data.durationSeconds));
    const { monthKey, subscription, usage, freeTrialUsage } = await ensureUsageDocuments(
      authUser.uid,
      authUser
    );
    const planStatus = buildPlanStatus(subscription, usage, freeTrialUsage);

    if (isFreeTrialExhausted(planStatus)) {
      return trackUsageFailure(
        "STT_LIMIT_EXCEEDED",
        "Free trial limit reached. Subscribe to continue using Cluegent."
      );
    }

    if (planStatus.remaining.sttSeconds <= 0) {
      return trackUsageFailure(
        "STT_LIMIT_EXCEEDED",
        "You have reached your monthly listening limit. Limits will reset every month."
      );
    }

    const refs = getUserRefs(authUser.uid, monthKey);
    const userRef = db.doc(refs.userPath);
    const subscriptionRef = db.doc(refs.subscriptionPath);
    const usageRef = db.doc(refs.usagePath);
    const estimatedCostUsdAdded = 0;

    const updatedRemaining = await db.runTransaction(async (transaction) => {
      const [userSnap, subscriptionSnap, usageSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(subscriptionRef),
        transaction.get(usageRef),
      ]);
      const latestSubscription = materializeSubscription(
        subscriptionSnap.data() as ReturnType<typeof materializeSubscription>
      );
      const latestUsage = materializeUsage(
        usageSnap.data() as ReturnType<typeof materializeUsage>,
        monthKey
      );
      const latestFreeTrialUsage = materializeFreeTrialUsage(userSnap.data());
      const latestPlanStatus = buildPlanStatus(
        latestSubscription,
        latestUsage,
        latestFreeTrialUsage
      );

      if (isFreeTrialExhausted(latestPlanStatus)) {
        throw new Error("FREE_TRIAL_LIMIT_EXCEEDED");
      }

      if (latestPlanStatus.remaining.sttSeconds <= 0) {
        throw new Error("STT_LIMIT_EXCEEDED");
      }

      if (durationSeconds > latestPlanStatus.remaining.sttSeconds) {
        if (latestPlanStatus.plan === "free") {
          throw new Error("FREE_TRIAL_LIMIT_EXCEEDED");
        }

        throw new Error("STT_LIMIT_EXCEEDED");
      }

      transaction.set(
        usageRef,
        {
          monthKey,
          sttSecondsUsed: FieldValue.increment(durationSeconds),
          estimatedCostUsd: FieldValue.increment(estimatedCostUsdAdded),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      if (latestSubscription.plan === "free") {
        transaction.set(
          userRef,
          {
            freeTrialSttSecondsUsed: FieldValue.increment(durationSeconds),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      return {
        sttSecondsRemaining: Math.max(
          latestPlanStatus.remaining.sttSeconds - durationSeconds,
          0
        ),
      };
    });

    return {
      success: true,
      usage: {
        sttSecondsAdded: durationSeconds,
        estimatedCostUsdAdded,
      },
      remaining: updatedRemaining,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "STT_LIMIT_EXCEEDED") {
      return trackUsageFailure(
        "STT_LIMIT_EXCEEDED",
        "You have reached your monthly listening limit. Limits will reset every month."
      );
    }

    if (error instanceof Error && error.message === "FREE_TRIAL_LIMIT_EXCEEDED") {
      return trackUsageFailure(
        "STT_LIMIT_EXCEEDED",
        "Free trial limit reached. Subscribe to continue using Cluegent."
      );
    }

    throw error;
  }
}

export async function createDeepgramTokenController(
  request: CallableRequest<CreateDeepgramTokenData>,
  input: {
    assemblyAiApiKey: string;
  }
): Promise<CreateTokenFailureResponse | CreateTokenSuccessResponse> {
  const authUser = requireAuth(request);
  return createDeepgramTokenForAuthenticatedUser(authUser, request.data, input);
}

export async function createDeepgramTokenForAuthenticatedUser(
  authUser: AuthenticatedUser,
  data: CreateDeepgramTokenData | undefined,
  input: {
    assemblyAiApiKey: string;
  }
): Promise<CreateTokenFailureResponse | CreateTokenSuccessResponse> {
  try {
    if (!input.assemblyAiApiKey.trim()) {
      return createTokenFailure(
        "ASSEMBLY_REQUEST_FAILED",
        "ASSEMBLY_AI_API_KEY secret is not configured in Firebase Functions."
      );
    }

    const { subscription, usage, freeTrialUsage } = await ensureUsageDocuments(
      authUser.uid,
      authUser
    );
    const planStatus = buildPlanStatus(subscription, usage, freeTrialUsage);

    if (isFreeTrialExhausted(planStatus)) {
      return createTokenFailure(
        "STT_LIMIT_EXCEEDED",
        "Free trial limit reached. Subscribe to continue using Cluegent."
      );
    }

    if (planStatus.remaining.sttSeconds <= 0) {
      return createTokenFailure(
        "STT_LIMIT_EXCEEDED",
        "You have reached your monthly listening limit. Limits will reset every month."
      );
    }

    const token = await createAssemblyStreamingAccessToken({
      apiKey: input.assemblyAiApiKey,
      ttlSeconds: data?.ttlSeconds,
    });

    return {
      success: true,
      token,
      remaining: {
        sttSecondsRemaining: planStatus.remaining.sttSeconds,
      },
    };
  } catch (error) {
    if (error instanceof HttpsError && error.code === "unauthenticated") {
      return createTokenFailure(
        "UNAUTHENTICATED",
        "Sign in with Google before requesting a Deepgram token."
      );
    }

    if (error instanceof AssemblyServiceError) {
      return createTokenFailure("ASSEMBLY_REQUEST_FAILED", error.message);
    }

    throw error;
  }
}

export function getTrackUsageHttpStatus(code: string) {
  switch (code) {
    case "UNAUTHENTICATED":
      return 401;
    case "STT_LIMIT_EXCEEDED":
      return 429;
    default:
      return 400;
  }
}

export function getCreateTokenHttpStatus(code: string) {
  switch (code) {
    case "UNAUTHENTICATED":
      return 401;
    case "STT_LIMIT_EXCEEDED":
      return 429;
    case "ASSEMBLY_REQUEST_FAILED":
      return 502;
    default:
      return 400;
  }
}

export function isTrackSttUsageData(
  value: unknown
): value is TrackSttUsageData {
  return (
    typeof value === "object" &&
    value !== null &&
    "durationSeconds" in value &&
    typeof (value as { durationSeconds?: unknown }).durationSeconds === "number"
  );
}

export function isCreateDeepgramTokenData(
  value: unknown
): value is CreateDeepgramTokenData {
  return (
    typeof value === "object" &&
    value !== null &&
    (!("ttlSeconds" in value) ||
      typeof (value as { ttlSeconds?: unknown }).ttlSeconds === "number")
  );
}

export async function transcribeAudioController(
  request: CallableRequest<TranscribeAudioData>,
  _input: Record<string, never>
): Promise<TranscriptionFailureResponse | TranscriptionSuccessResponse> {
  const authUser = requireAuth(request);
  return transcribeAudioForAuthenticatedUser(authUser, request.data);
}

export async function transcribeAudioForAuthenticatedUser(
  authUser: AuthenticatedUser,
  data: TranscribeAudioData | undefined
): Promise<TranscriptionFailureResponse | TranscriptionSuccessResponse> {
  try {
    const durationSeconds = Math.max(1, Math.ceil(data?.durationSeconds ?? 0));
    console.warn("[legacy-chunk-stt] transcribeAudio callable is disabled", {
      uid: authUser.uid,
      durationSeconds,
      mimeType: data?.mimeType ?? "audio/wav",
      language: data?.language ?? "default",
    });

    return transcriptionFailure(
      "GROQ_REQUEST_FAILED",
      "Legacy chunk transcription is disabled. Use Firebase-managed AssemblyAI streaming STT."
    );
  } catch (error) {
    if (error instanceof HttpsError && error.code === "unauthenticated") {
      return transcriptionFailure(
        "UNAUTHENTICATED",
        "Sign in with Google before transcribing audio."
      );
    }

    throw error;
  }
}
