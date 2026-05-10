import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODELS,
  getGeminiGenerateContentUrl,
  getGeminiStreamGenerateContentUrl,
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

type GeminiStreamChunk = GeminiResponse;

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

async function buildGeminiRequest(input: GenerateGeminiReplyInput) {
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

  return {
    modelId,
    body,
  };
}

export async function generateGeminiReply(
  input: GenerateGeminiReplyInput
): Promise<GenerateGeminiReplyResult> {
  const { modelId, body } = await buildGeminiRequest(input);

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

export async function streamGeminiReply(
  input: GenerateGeminiReplyInput,
  onDelta: (delta: string) => void | Promise<void>
): Promise<GenerateGeminiReplyResult> {
  const { modelId, body } = await buildGeminiRequest(input);

  let response: Response;

  try {
    response = await fetch(getGeminiStreamGenerateContentUrl(modelId), {
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

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | GeminiResponse
      | null;
    throw new GeminiServiceError(
      errorPayload?.error?.message ||
        `Gemini request failed with status ${response.status}.`
    );
  }

  if (!response.body) {
    throw new GeminiServiceError("Gemini returned an empty stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let reply = "";
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let totalTokens: number | undefined;

  try {
    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) {
          continue;
        }

        const payload = trimmed.slice("data:".length).trim();
        if (!payload) {
          continue;
        }

        let chunk: GeminiStreamChunk;
        try {
          chunk = JSON.parse(payload) as GeminiStreamChunk;
        } catch {
          continue;
        }

        if (chunk.error?.message) {
          throw new GeminiServiceError(chunk.error.message);
        }

        const text = chunk.candidates
          ?.flatMap((candidate) => candidate.content?.parts ?? [])
          .map((part) => part.text ?? "")
          .join("");

        if (text) {
          reply += text;
          await onDelta(text);
        }

        inputTokens =
          parseNumericValue(chunk.usageMetadata?.promptTokenCount) ??
          inputTokens;
        outputTokens =
          parseNumericValue(chunk.usageMetadata?.candidatesTokenCount) ??
          outputTokens;
        totalTokens =
          parseNumericValue(chunk.usageMetadata?.totalTokenCount) ??
          totalTokens;
      }
    }
  } finally {
    try {
      reader.cancel();
    } catch {
      // Ignore cleanup failures after completion.
    }
  }

  const trimmedReply = reply.trim();
  if (!trimmedReply) {
    throw new GeminiServiceError("Gemini returned an empty response.");
  }

  return {
    reply: trimmedReply,
    modelId,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
    },
  };
}
