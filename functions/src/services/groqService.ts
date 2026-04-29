import {
  DEFAULT_GROQ_CHAT_MODEL,
  DEFAULT_GROQ_TRANSCRIPTION_MODEL,
  GROQ_CHAT_MODELS,
  type GroqChatModelId,
} from "../config/groq.js";
import { getGroqChatCompletionsUrl, getGroqTranscriptionsUrl } from "../config/groq.js";

export interface AssistantHistoryEntry {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GenerateGroqReplyInput {
  apiKey: string;
  prompt: string;
  screenshotBase64?: string;
  screenshotUrl?: string;
  systemPrompt?: string;
  history?: AssistantHistoryEntry[];
  modelId?: string;
}

export interface GenerateGroqReplyResult {
  reply: string;
  modelId: string;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface TranscribeGroqInput {
  apiKey: string;
  audioBase64: string;
  mimeType?: string;
  model?: string;
  language?: string;
}

interface InlineImage {
  mimeType: string;
  data: string;
}

interface GroqChatResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
}

interface GroqTranscriptionResponse {
  text?: string;
  error?: {
    message?: string;
  };
}

export class GroqServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GroqServiceError";
  }
}

function isGroqChatModelId(modelId: string): modelId is GroqChatModelId {
  return modelId in GROQ_CHAT_MODELS;
}

function resolveChatModel(modelId?: string) {
  if (modelId && isGroqChatModelId(modelId)) {
    return GROQ_CHAT_MODELS[modelId];
  }

  return DEFAULT_GROQ_CHAT_MODEL;
}

function parseNumericValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function normalizeHistory(history: AssistantHistoryEntry[] = []) {
  return history
    .filter((entry) => entry.content.trim())
    .map((entry) => ({
      role: (
        entry.role === "assistant"
          ? "assistant"
          : entry.role === "system"
            ? "system"
            : "user"
      ) as "assistant" | "system" | "user",
      content: entry.content.trim(),
    }));
}

function normalizeInlineBase64(rawBase64: string): InlineImage {
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

async function fetchImageAsBase64(url: string): Promise<InlineImage> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new GroqServiceError(
      `Failed to fetch screenshot URL: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  if (!response.ok) {
    throw new GroqServiceError(
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
): Promise<InlineImage | null> {
  if (screenshotBase64?.trim()) {
    return normalizeInlineBase64(screenshotBase64);
  }

  if (screenshotUrl?.trim()) {
    return fetchImageAsBase64(screenshotUrl);
  }

  return null;
}

function extractReplyText(response: GroqChatResponse) {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => (part.type === "text" ? part.text ?? "" : ""))
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  throw new GroqServiceError("Groq returned an empty response.");
}

function normalizeAudioBase64(rawBase64: string) {
  const trimmed = rawBase64.trim();
  const dataUrlMatch = trimmed.match(/^data:(.+?);base64,(.+)$/);

  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1] || "audio/wav",
      data: dataUrlMatch[2] || "",
    };
  }

  return {
    mimeType: "audio/wav",
    data: trimmed,
  };
}

export async function generateGroqReply(
  input: GenerateGroqReplyInput
): Promise<GenerateGroqReplyResult> {
  const model = resolveChatModel(input.modelId?.trim());
  const screenshot = await resolveScreenshot(
    input.screenshotBase64,
    input.screenshotUrl
  );
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content:
      | string
      | Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string } }
        >;
  }> = [];

  if (input.systemPrompt?.trim()) {
    messages.push({
      role: "system",
      content: input.systemPrompt.trim(),
    });
  }

  messages.push(...normalizeHistory(input.history));

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [{ type: "text", text: input.prompt.trim() }];

  if (screenshot) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:${screenshot.mimeType};base64,${screenshot.data}`,
      },
    });
  }

  messages.push({
    role: "user",
    content: screenshot ? userContent : input.prompt.trim(),
  });

  let response: Response;

  try {
    response = await fetch(getGroqChatCompletionsUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.id,
        messages,
        temperature: model.temperature,
        max_completion_tokens: model.maxCompletionTokens,
      }),
    });
  } catch (error) {
    throw new GroqServiceError(
      `Failed to reach Groq: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  let json: GroqChatResponse;

  try {
    json = (await response.json()) as GroqChatResponse;
  } catch (error) {
    throw new GroqServiceError(
      `Groq returned an invalid response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  if (!response.ok) {
    throw new GroqServiceError(
      json.error?.message || `Groq request failed with status ${response.status}.`
    );
  }

  return {
    reply: extractReplyText(json),
    modelId: model.id,
    usage: {
      inputTokens: parseNumericValue(json.usage?.prompt_tokens),
      outputTokens: parseNumericValue(json.usage?.completion_tokens),
      totalTokens: parseNumericValue(json.usage?.total_tokens),
    },
  };
}

export async function transcribeWithGroq(input: TranscribeGroqInput) {
  const normalizedAudio = normalizeAudioBase64(input.audioBase64);
  const mimeType = input.mimeType?.trim() || normalizedAudio.mimeType || "audio/wav";
  const model = input.model?.trim() || DEFAULT_GROQ_TRANSCRIPTION_MODEL.id;
  const language = input.language?.trim();
  const form = new FormData();
  const audioBlob = new Blob([Buffer.from(normalizedAudio.data, "base64")], {
    type: mimeType,
  });

  form.append("file", audioBlob, "audio.wav");
  form.append("model", model);
  form.append("temperature", "0");
  form.append("response_format", "json");

  if (language && language !== "auto") {
    form.append("language", language);
  }

  let response: Response;

  try {
    response = await fetch(getGroqTranscriptionsUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: form,
    });
  } catch (error) {
    throw new GroqServiceError(
      `Failed to reach Groq transcription: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  let json: GroqTranscriptionResponse;

  try {
    json = (await response.json()) as GroqTranscriptionResponse;
  } catch (error) {
    throw new GroqServiceError(
      `Groq transcription returned an invalid response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  if (!response.ok) {
    throw new GroqServiceError(
      json.error?.message ||
        `Groq transcription failed with status ${response.status}.`
    );
  }

  const transcript = json.text?.trim();

  if (!transcript) {
    throw new GroqServiceError("Groq returned an empty transcript.");
  }

  return {
    transcript,
    model,
    language: language || "auto",
  };
}
