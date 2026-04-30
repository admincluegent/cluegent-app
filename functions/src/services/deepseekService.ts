import {
  DEFAULT_DEEPSEEK_CHAT_MODEL,
  DEEPSEEK_CHAT_MODELS,
  type DeepSeekChatModelId,
  getDeepSeekChatCompletionsUrl,
} from "../config/deepseek.js";
import type { AssistantHistoryEntry } from "./groqService.js";

export interface GenerateDeepSeekReplyInput {
  apiKey: string;
  prompt: string;
  systemPrompt?: string;
  history?: AssistantHistoryEntry[];
  modelId?: string;
}

export interface GenerateDeepSeekReplyResult {
  reply: string;
  modelId: string;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

interface DeepSeekChatResponse {
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

interface DeepSeekStreamChunk {
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

export class DeepSeekServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeepSeekServiceError";
  }
}

function isDeepSeekChatModelId(modelId: string): modelId is DeepSeekChatModelId {
  return modelId in DEEPSEEK_CHAT_MODELS;
}

function resolveChatModel(modelId?: string) {
  if (modelId && isDeepSeekChatModelId(modelId)) {
    return DEEPSEEK_CHAT_MODELS[modelId];
  }

  return DEFAULT_DEEPSEEK_CHAT_MODEL;
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

function extractReplyText(response: DeepSeekChatResponse) {
  const text = response.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new DeepSeekServiceError("DeepSeek returned an empty response.");
  }

  return text;
}

export async function generateDeepSeekReply(
  input: GenerateDeepSeekReplyInput
): Promise<GenerateDeepSeekReplyResult> {
  const model = resolveChatModel(input.modelId?.trim());
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [];

  if (input.systemPrompt?.trim()) {
    messages.push({
      role: "system",
      content: input.systemPrompt.trim(),
    });
  }

  messages.push(...normalizeHistory(input.history));
  messages.push({
    role: "user",
    content: input.prompt.trim(),
  });

  let response: Response;

  try {
    response = await fetch(getDeepSeekChatCompletionsUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.id,
        messages,
        temperature: model.temperature,
        max_tokens: model.maxCompletionTokens,
        stream: false,
      }),
    });
  } catch (error) {
    throw new DeepSeekServiceError(
      `Failed to reach DeepSeek: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  let json: DeepSeekChatResponse;

  try {
    json = (await response.json()) as DeepSeekChatResponse;
  } catch (error) {
    throw new DeepSeekServiceError(
      `DeepSeek returned an invalid response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  if (!response.ok) {
    throw new DeepSeekServiceError(
      json.error?.message ||
        `DeepSeek request failed with status ${response.status}.`
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

export async function streamDeepSeekReply(
  input: GenerateDeepSeekReplyInput,
  onDelta: (delta: string) => void | Promise<void>
): Promise<GenerateDeepSeekReplyResult> {
  const model = resolveChatModel(input.modelId?.trim());
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [];

  if (input.systemPrompt?.trim()) {
    messages.push({
      role: "system",
      content: input.systemPrompt.trim(),
    });
  }

  messages.push(...normalizeHistory(input.history));
  messages.push({
    role: "user",
    content: input.prompt.trim(),
  });

  let response: Response;

  try {
    response = await fetch(getDeepSeekChatCompletionsUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.id,
        messages,
        temperature: model.temperature,
        max_tokens: model.maxCompletionTokens,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      }),
    });
  } catch (error) {
    throw new DeepSeekServiceError(
      `Failed to reach DeepSeek: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | DeepSeekChatResponse
      | null;
    throw new DeepSeekServiceError(
      errorPayload?.error?.message ||
        `DeepSeek request failed with status ${response.status}.`
    );
  }

  if (!response.body) {
    throw new DeepSeekServiceError("DeepSeek returned an empty stream.");
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

        let chunk: DeepSeekStreamChunk;
        try {
          chunk = JSON.parse(payload) as DeepSeekStreamChunk;
        } catch {
          continue;
        }

        if (chunk.error?.message) {
          throw new DeepSeekServiceError(chunk.error.message);
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
    throw new DeepSeekServiceError("DeepSeek returned an empty response.");
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
