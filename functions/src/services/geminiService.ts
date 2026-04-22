import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODELS,
  getGeminiGenerateContentUrl,
  type GeminiModelId,
} from "../config/gemini.js";

export interface AssistantHistoryEntry {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GenerateGeminiReplyInput {
  apiKey: string;
  prompt: string;
  screenshotBase64?: string;
  screenshotUrl?: string;
  systemPrompt?: string;
  history?: AssistantHistoryEntry[];
  modelId?: string;
}

export interface GenerateGeminiReplyResult {
  reply: string;
  modelId: string;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

interface GeminiInlineImage {
  mimeType: string;
  data: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    message?: string;
  };
}

export class GeminiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiServiceError";
  }
}

function resolveModel(modelId?: string) {
  if (modelId && isGeminiModelId(modelId)) {
    return GEMINI_MODELS[modelId];
  }

  return DEFAULT_GEMINI_MODEL;
}

function isGeminiModelId(modelId: string): modelId is GeminiModelId {
  return modelId in GEMINI_MODELS;
}

function parseNumericValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function extractTextReply(response: GeminiResponse) {
  const text = response.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new GeminiServiceError("Gemini returned an empty response.");
  }

  return text;
}

function normalizeHistory(history: AssistantHistoryEntry[] = []) {
  return history
    .filter(
      (entry) =>
        (entry.role === "user" || entry.role === "assistant") &&
        entry.content.trim()
    )
    .map((entry) => ({
      role: entry.role === "assistant" ? "model" : "user",
      parts: [{ text: entry.content.trim() }],
    }));
}

function normalizeInlineBase64(rawBase64: string): GeminiInlineImage {
  const trimmed = rawBase64.trim();
  const dataUrlMatch = trimmed.match(/^data:(.+?);base64,(.+)$/);

  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1] || "image/png",
      data: dataUrlMatch[2] || "",
    };
  }

  return {
    mimeType: "image/png",
    data: trimmed,
  };
}

async function fetchImageAsBase64(url: string): Promise<GeminiInlineImage> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new GeminiServiceError(
      `Failed to fetch screenshot URL: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  if (!response.ok) {
    throw new GeminiServiceError(
      `Failed to fetch screenshot URL: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const mimeType =
    response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";

  return {
    mimeType,
    data: Buffer.from(arrayBuffer).toString("base64"),
  };
}

async function resolveScreenshot(
  screenshotBase64?: string,
  screenshotUrl?: string
): Promise<GeminiInlineImage | null> {
  if (screenshotBase64?.trim()) {
    return normalizeInlineBase64(screenshotBase64);
  }

  if (screenshotUrl?.trim()) {
    return fetchImageAsBase64(screenshotUrl);
  }

  return null;
}

export async function generateGeminiReply(
  input: GenerateGeminiReplyInput
): Promise<GenerateGeminiReplyResult> {
  const model = resolveModel(input.modelId?.trim());
  const modelId = model.id;
  const screenshot = await resolveScreenshot(
    input.screenshotBase64,
    input.screenshotUrl
  );
  const userParts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [{ text: input.prompt.trim() }];

  if (screenshot) {
    userParts.push({
      inlineData: {
        mimeType: screenshot.mimeType,
        data: screenshot.data,
      },
    });
  }

  const body = {
    systemInstruction: input.systemPrompt?.trim()
      ? {
          parts: [{ text: input.systemPrompt.trim() }],
        }
      : undefined,
    contents: [
      ...normalizeHistory(input.history),
      {
        role: "user",
        parts: userParts,
      },
    ],
    generationConfig: {
      temperature: model.temperature,
      maxOutputTokens: model.maxOutputTokens,
    },
  };

  let response: Response;

  try {
    response = await fetch(getGeminiGenerateContentUrl(modelId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": input.apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new GeminiServiceError(
      `Failed to reach Gemini: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  let json: GeminiResponse;

  try {
    json = (await response.json()) as GeminiResponse;
  } catch (error) {
    throw new GeminiServiceError(
      `Gemini returned an invalid response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  if (!response.ok) {
    throw new GeminiServiceError(
      json.error?.message ||
        `Gemini request failed with status ${response.status}.`
    );
  }

  const reply = extractTextReply(json);

  return {
    reply,
    modelId,
    usage: {
      inputTokens: parseNumericValue(json.usageMetadata?.promptTokenCount),
      outputTokens: parseNumericValue(json.usageMetadata?.candidatesTokenCount),
      totalTokens: parseNumericValue(json.usageMetadata?.totalTokenCount),
    },
  };
}
