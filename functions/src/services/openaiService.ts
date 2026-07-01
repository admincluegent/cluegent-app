import {
  DEFAULT_OPENAI_CHAT_MODEL,
  OPENAI_CHAT_MODELS,
  getOpenAiChatCompletionsUrl,
  type OpenAiChatModelId,
} from "../config/openai.js";
import type { AssistantHistoryEntry } from "./groqService.js";

export interface GenerateOpenAiReplyInput {
  apiKey: string;
  prompt: string;
  screenshotBase64?: string;
  screenshotUrl?: string;
  systemPrompt?: string;
  history?: AssistantHistoryEntry[];
  modelId?: string;
}

export interface GenerateOpenAiReplyResult {
  reply: string;
  modelId: string;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

interface OpenAiChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
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

interface OpenAiStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string;
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

type OpenAiMessage =
  | {
      role: "system" | "assistant";
      content: string;
    }
  | {
      role: "user";
      content:
        | string
        | Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string } }
          >;
    };

export class OpenAiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAiServiceError";
  }
}

function isOpenAiChatModelId(modelId: string): modelId is OpenAiChatModelId {
  return modelId in OPENAI_CHAT_MODELS;
}

function resolveChatModel(modelId?: string) {
  if (modelId && isOpenAiChatModelId(modelId)) {
    return OPENAI_CHAT_MODELS[modelId];
  }

  return DEFAULT_OPENAI_CHAT_MODEL;
}

function parseNumericValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function normalizeHistory(history: AssistantHistoryEntry[] = []): OpenAiMessage[] {
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

function normalizeImageUrl(rawBase64?: string, screenshotUrl?: string) {
  if (screenshotUrl?.trim()) {
    return screenshotUrl.trim();
  }

  if (!rawBase64?.trim()) {
    return null;
  }

  const trimmed = rawBase64.trim();
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }

  return `data:image/png;base64,${trimmed}`;
}

function buildMessages(input: GenerateOpenAiReplyInput): OpenAiMessage[] {
  const messages: OpenAiMessage[] = [];

  if (input.systemPrompt?.trim()) {
    messages.push({
      role: "system",
      content: input.systemPrompt.trim(),
    });
  }

  messages.push(...normalizeHistory(input.history));

  const imageUrl = normalizeImageUrl(input.screenshotBase64, input.screenshotUrl);
  if (imageUrl) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: input.prompt.trim() },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    });
  } else {
    messages.push({
      role: "user",
      content: input.prompt.trim(),
    });
  }

  return messages;
}

function extractReplyText(response: OpenAiChatResponse) {
  const text = response.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new OpenAiServiceError("OpenAI returned an empty response.");
  }

  return text;
}

export async function generateOpenAiReply(
  input: GenerateOpenAiReplyInput
): Promise<GenerateOpenAiReplyResult> {
  const model = resolveChatModel(input.modelId?.trim());

  let response: Response;

  try {
    response = await fetch(getOpenAiChatCompletionsUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.id,
        messages: buildMessages(input),
        temperature: model.temperature,
        max_completion_tokens: model.maxCompletionTokens,
        stream: false,
      }),
    });
  } catch (error) {
    throw new OpenAiServiceError(
      `Failed to reach OpenAI: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  let json: OpenAiChatResponse;

  try {
    json = (await response.json()) as OpenAiChatResponse;
  } catch (error) {
    throw new OpenAiServiceError(
      `OpenAI returned an invalid response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  if (!response.ok) {
    throw new OpenAiServiceError(
      json.error?.message ||
        `OpenAI request failed with status ${response.status}.`
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

export async function streamOpenAiReply(
  input: GenerateOpenAiReplyInput,
  onDelta: (delta: string) => void | Promise<void>
): Promise<GenerateOpenAiReplyResult> {
  const model = resolveChatModel(input.modelId?.trim());

  let response: Response;

  try {
    response = await fetch(getOpenAiChatCompletionsUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.id,
        messages: buildMessages(input),
        temperature: model.temperature,
        max_completion_tokens: model.maxCompletionTokens,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      }),
    });
  } catch (error) {
    throw new OpenAiServiceError(
      `Failed to reach OpenAI: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | OpenAiChatResponse
      | null;
    throw new OpenAiServiceError(
      errorPayload?.error?.message ||
        `OpenAI request failed with status ${response.status}.`
    );
  }

  if (!response.body) {
    throw new OpenAiServiceError("OpenAI returned an empty stream.");
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

        if (payload === "[DONE]") {
          break outer;
        }

        let chunk: OpenAiStreamChunk;
        try {
          chunk = JSON.parse(payload) as OpenAiStreamChunk;
        } catch {
          continue;
        }

        if (chunk.error?.message) {
          throw new OpenAiServiceError(chunk.error.message);
        }

        inputTokens = parseNumericValue(chunk.usage?.prompt_tokens) ?? inputTokens;
        outputTokens =
          parseNumericValue(chunk.usage?.completion_tokens) ?? outputTokens;
        totalTokens = parseNumericValue(chunk.usage?.total_tokens) ?? totalTokens;

        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          reply += delta;
          await onDelta(delta);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const trimmedReply = reply.trim();
  if (!trimmedReply) {
    throw new OpenAiServiceError("OpenAI returned an empty response.");
  }

  return {
    reply: trimmedReply,
    modelId: model.id,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
    },
  };
}
