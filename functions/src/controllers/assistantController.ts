import { FieldValue } from "firebase-admin/firestore";
import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { type AuthenticatedUser, db, requireAuth } from "../utils/auth.js";
import { ensureUsageDocuments } from "./usageController.js";
import {
  buildPlanStatus,
  getUserRefs,
  materializeSubscription,
  materializeUsage,
} from "../utils/usage.js";
import {
  generateGeminiReply,
  type AssistantHistoryEntry,
  GeminiServiceError,
} from "../services/geminiService.js";
import {
  createDeepgramAccessToken,
  DeepgramServiceError,
  transcribeWithDeepgram,
} from "../services/deepgramService.js";
import { estimateGeminiRequestCost } from "../utils/geminiCost.js";

interface ProcessAssistantReplyData {
  prompt: string;
  screenshotBase64?: string;
  screenshotUrl?: string;
  systemPrompt?: string;
  history?: AssistantHistoryEntry[];
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

type CreateTokenErrorCode = "UNAUTHENTICATED" | "STT_LIMIT_EXCEEDED" | "DEEPGRAM_REQUEST_FAILED";

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
  | "GEMINI_REQUEST_FAILED";

type TranscriptionErrorCode =
  | "UNAUTHENTICATED"
  | "STT_LIMIT_EXCEEDED"
  | "DEEPGRAM_REQUEST_FAILED";

interface AssistantFailureResponse {
  success: false;
  code: AssistantErrorCode;
  message: string;
}

interface AssistantSuccessResponse {
  success: true;
  reply: string;
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

export async function processAssistantReplyController(
  request: CallableRequest<ProcessAssistantReplyData>,
  input: {
    geminiApiKey: string;
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

    if (!input.geminiApiKey.trim()) {
      return assistantFailure(
        "GEMINI_REQUEST_FAILED",
        "GEMINI_API_KEY secret is not configured in Firebase Functions."
      );
    }

    const { monthKey, subscription, usage } = await ensureUsageDocuments(
      authUser.uid,
      authUser
    );
    const planStatus = buildPlanStatus(subscription, usage);

    if (planStatus.remaining.prompts <= 0) {
      return assistantFailure(
        "PROMPT_LIMIT_EXCEEDED",
        "Monthly prompt limit exceeded for the current plan."
      );
    }

    if (hasScreenshot && planStatus.remaining.screenshots <= 0) {
      return assistantFailure(
        "SCREENSHOT_LIMIT_EXCEEDED",
        "Monthly screenshot limit exceeded for the current plan."
      );
    }

    const geminiResult = await generateGeminiReply({
      apiKey: input.geminiApiKey,
      prompt,
      screenshotBase64: request.data?.screenshotBase64,
      screenshotUrl: request.data?.screenshotUrl,
      systemPrompt: request.data?.systemPrompt,
      history: request.data?.history,
    });

    const costEstimate = estimateGeminiRequestCost({
      modelId: geminiResult.modelId,
      inputTokens: geminiResult.usage.inputTokens,
      outputTokens: geminiResult.usage.outputTokens,
      screenshotCount: hasScreenshot ? 1 : 0,
      fallbackInputText: [
        request.data?.systemPrompt,
        ...(request.data?.history?.map((entry) => entry.content) ?? []),
        prompt,
      ]
        .filter(Boolean)
        .join("\n"),
      fallbackOutputText: geminiResult.reply,
    });
    const refs = getUserRefs(authUser.uid, monthKey);
    const subscriptionRef = db.doc(refs.subscriptionPath);
    const usageRef = db.doc(refs.usagePath);
    const updatedRemaining = await db.runTransaction(async (transaction) => {
      const [subscriptionSnap, usageSnap] = await Promise.all([
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
      const latestPlanStatus = buildPlanStatus(latestSubscription, latestUsage);

      if (latestPlanStatus.remaining.prompts <= 0) {
        throw new Error("PROMPT_LIMIT_EXCEEDED");
      }

      if (hasScreenshot && latestPlanStatus.remaining.screenshots <= 0) {
        throw new Error("SCREENSHOT_LIMIT_EXCEEDED");
      }

      transaction.set(
        usageRef,
        {
          monthKey,
          promptCount: FieldValue.increment(1),
          screenshotCount: FieldValue.increment(hasScreenshot ? 1 : 0),
          inputTokens: FieldValue.increment(costEstimate.inputTokens),
          outputTokens: FieldValue.increment(costEstimate.outputTokens),
          estimatedCostUsd: FieldValue.increment(costEstimate.estimatedCostUsd),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        promptsRemaining: Math.max(latestPlanStatus.remaining.prompts - 1, 0),
        screenshotsRemaining: Math.max(
          latestPlanStatus.remaining.screenshots - (hasScreenshot ? 1 : 0),
          0
        ),
      };
    });

    return {
      success: true,
      reply: geminiResult.reply,
      usage: {
        inputTokens: costEstimate.inputTokens,
        outputTokens: costEstimate.outputTokens,
        screenshotCountAdded: hasScreenshot ? 1 : 0,
        estimatedCostUsdAdded: costEstimate.estimatedCostUsd,
      },
      remaining: updatedRemaining,
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

    if (
      error instanceof Error &&
      error.message === "SCREENSHOT_LIMIT_EXCEEDED"
    ) {
      return assistantFailure(
        "SCREENSHOT_LIMIT_EXCEEDED",
        "Monthly screenshot limit exceeded for the current plan."
      );
    }

    if (error instanceof GeminiServiceError) {
      return assistantFailure("GEMINI_REQUEST_FAILED", error.message);
    }

    throw error;
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
    const { monthKey, subscription, usage } = await ensureUsageDocuments(
      authUser.uid,
      authUser
    );
    const planStatus = buildPlanStatus(subscription, usage);

    if (planStatus.remaining.sttSeconds <= 0) {
      return trackUsageFailure(
        "STT_LIMIT_EXCEEDED",
        "Monthly STT limit exceeded for the current plan."
      );
    }

    const refs = getUserRefs(authUser.uid, monthKey);
    const subscriptionRef = db.doc(refs.subscriptionPath);
    const usageRef = db.doc(refs.usagePath);
    const estimatedCostUsdAdded = 0;

    const updatedRemaining = await db.runTransaction(async (transaction) => {
      const [subscriptionSnap, usageSnap] = await Promise.all([
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
      const latestPlanStatus = buildPlanStatus(latestSubscription, latestUsage);

      if (latestPlanStatus.remaining.sttSeconds <= 0) {
        throw new Error("STT_LIMIT_EXCEEDED");
      }

      if (durationSeconds > latestPlanStatus.remaining.sttSeconds) {
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
        "Monthly STT limit exceeded for the current plan."
      );
    }

    throw error;
  }
}

export async function createDeepgramTokenController(
  request: CallableRequest<CreateDeepgramTokenData>,
  input: {
    deepgramApiKey: string;
  }
): Promise<CreateTokenFailureResponse | CreateTokenSuccessResponse> {
  const authUser = requireAuth(request);
  return createDeepgramTokenForAuthenticatedUser(authUser, request.data, input);
}

export async function createDeepgramTokenForAuthenticatedUser(
  authUser: AuthenticatedUser,
  data: CreateDeepgramTokenData | undefined,
  input: {
    deepgramApiKey: string;
  }
): Promise<CreateTokenFailureResponse | CreateTokenSuccessResponse> {
  try {
    if (!input.deepgramApiKey.trim()) {
      return createTokenFailure(
        "DEEPGRAM_REQUEST_FAILED",
        "DEEPGRAM_API_KEY secret is not configured in Firebase Functions."
      );
    }

    const { subscription, usage } = await ensureUsageDocuments(
      authUser.uid,
      authUser
    );
    const planStatus = buildPlanStatus(subscription, usage);

    if (planStatus.remaining.sttSeconds <= 0) {
      return createTokenFailure(
        "STT_LIMIT_EXCEEDED",
        "Monthly STT limit exceeded for the current plan."
      );
    }

    const token = await createDeepgramAccessToken({
      apiKey: input.deepgramApiKey,
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

    if (error instanceof DeepgramServiceError) {
      return createTokenFailure("DEEPGRAM_REQUEST_FAILED", error.message);
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
    case "DEEPGRAM_REQUEST_FAILED":
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
  input: {
    deepgramApiKey: string;
  }
): Promise<TranscriptionFailureResponse | TranscriptionSuccessResponse> {
  const authUser = requireAuth(request);
  return transcribeAudioForAuthenticatedUser(authUser, request.data, input);
}

export async function transcribeAudioForAuthenticatedUser(
  authUser: AuthenticatedUser,
  data: TranscribeAudioData | undefined,
  input: {
    deepgramApiKey: string;
  }
): Promise<TranscriptionFailureResponse | TranscriptionSuccessResponse> {
  try {
    const audioBase64 = data?.audioBase64?.trim();
    const durationSeconds = Math.max(
      1,
      Math.ceil(data?.durationSeconds ?? 0)
    );
    console.info("[legacy-chunk-stt] transcribeAudio callable invoked", {
      uid: authUser.uid,
      durationSeconds,
      mimeType: data?.mimeType ?? "audio/wav",
      language: data?.language ?? "default",
    });

    if (!audioBase64) {
      throw new HttpsError("invalid-argument", "audioBase64 is required.");
    }

    if (!input.deepgramApiKey.trim()) {
      return transcriptionFailure(
        "DEEPGRAM_REQUEST_FAILED",
        "DEEPGRAM_API_KEY secret is not configured in Firebase Functions."
      );
    }

    const { monthKey, subscription, usage } = await ensureUsageDocuments(
      authUser.uid,
      authUser
    );
    const planStatus = buildPlanStatus(subscription, usage);

    if (planStatus.remaining.sttSeconds <= 0) {
      return transcriptionFailure(
        "STT_LIMIT_EXCEEDED",
        "Monthly STT limit exceeded for the current plan."
      );
    }

    if (durationSeconds > planStatus.remaining.sttSeconds) {
      return transcriptionFailure(
        "STT_LIMIT_EXCEEDED",
        "Not enough STT time remaining for this transcription."
      );
    }

    const deepgramResult = await transcribeWithDeepgram({
      apiKey: input.deepgramApiKey,
      audioBase64,
      mimeType: data?.mimeType,
      language: data?.language,
    });

    const estimatedCostUsdAdded = 0;
    const refs = getUserRefs(authUser.uid, monthKey);
    const subscriptionRef = db.doc(refs.subscriptionPath);
    const usageRef = db.doc(refs.usagePath);

    const updatedRemaining = await db.runTransaction(async (transaction) => {
      const [subscriptionSnap, usageSnap] = await Promise.all([
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
      const latestPlanStatus = buildPlanStatus(latestSubscription, latestUsage);

      if (latestPlanStatus.remaining.sttSeconds <= 0) {
        throw new Error("STT_LIMIT_EXCEEDED");
      }

      if (durationSeconds > latestPlanStatus.remaining.sttSeconds) {
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

      return {
        sttSecondsRemaining: Math.max(
          latestPlanStatus.remaining.sttSeconds - durationSeconds,
          0
        ),
      };
    });

    return {
      success: true,
      transcript: deepgramResult.transcript,
      usage: {
        sttSecondsAdded: durationSeconds,
        estimatedCostUsdAdded,
      },
      remaining: updatedRemaining,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "STT_LIMIT_EXCEEDED") {
      return transcriptionFailure(
        "STT_LIMIT_EXCEEDED",
        "Monthly STT limit exceeded for the current plan."
      );
    }

    if (error instanceof HttpsError && error.code === "unauthenticated") {
      return transcriptionFailure(
        "UNAUTHENTICATED",
        "Sign in with Google before transcribing audio."
      );
    }

    if (error instanceof DeepgramServiceError) {
      return transcriptionFailure("DEEPGRAM_REQUEST_FAILED", error.message);
    }

    throw error;
  }
}
