import { COST_CONFIG } from "../config/costs.js";
import {
  DEFAULT_GROQ_CHAT_MODEL,
  DEFAULT_GROQ_CHAT_MODEL_ID,
  GROQ_CHAT_MODELS,
  type GroqChatModelConfig,
  type GroqChatModelId,
} from "../config/groq.js";

export interface EstimateGroqCostInput {
  modelId?: string;
  inputTokens?: number;
  outputTokens?: number;
  screenshotCount?: number;
  fallbackInputText?: string;
  fallbackOutputText?: string;
}

export interface GroqCostEstimate {
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

function estimateTextTokens(text?: string) {
  if (!text?.trim()) {
    return 0;
  }

  return Math.max(1, Math.ceil(text.trim().length / 4));
}

function isGroqChatModelId(modelId: string): modelId is GroqChatModelId {
  return modelId in GROQ_CHAT_MODELS;
}

function resolveGroqModel(modelId?: string): GroqChatModelConfig {
  if (modelId && isGroqChatModelId(modelId)) {
    return GROQ_CHAT_MODELS[modelId];
  }

  return DEFAULT_GROQ_CHAT_MODEL;
}

export function estimateGroqRequestCost(
  input: EstimateGroqCostInput
): GroqCostEstimate {
  const model = resolveGroqModel(input.modelId);
  const pricingKey: GroqChatModelId = isGroqChatModelId(model.id)
    ? model.id
    : DEFAULT_GROQ_CHAT_MODEL_ID;
  const pricing =
    COST_CONFIG.groq[pricingKey] ?? COST_CONFIG.groq[DEFAULT_GROQ_CHAT_MODEL_ID];
  const screenshotCount = input.screenshotCount ?? 0;
  const inputTokens =
    input.inputTokens ??
    estimateTextTokens(input.fallbackInputText) + screenshotCount * 1200;
  const outputTokens =
    input.outputTokens ?? estimateTextTokens(input.fallbackOutputText);
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * pricing.inputUsdPerMillionTokens +
    (outputTokens / 1_000_000) * pricing.outputUsdPerMillionTokens;

  return {
    modelId: model.id,
    inputTokens,
    outputTokens,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(8)),
  };
}
