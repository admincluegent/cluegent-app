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
