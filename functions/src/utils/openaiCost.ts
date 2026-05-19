import { COST_CONFIG } from "../config/costs.js";
import {
  DEFAULT_OPENAI_CHAT_MODEL,
  DEFAULT_OPENAI_CHAT_MODEL_ID,
  OPENAI_CHAT_MODELS,
  type OpenAiChatModelConfig,
  type OpenAiChatModelId,
} from "../config/openai.js";

export interface EstimateOpenAiCostInput {
  modelId?: string;
  inputTokens?: number;
  outputTokens?: number;
  screenshotCount?: number;
  fallbackInputText?: string;
  fallbackOutputText?: string;
}

export interface OpenAiCostEstimate {
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

function isOpenAiModelId(modelId: string): modelId is OpenAiChatModelId {
  return modelId in OPENAI_CHAT_MODELS;
}

function resolveOpenAiModel(modelId?: string): OpenAiChatModelConfig {
  if (modelId && isOpenAiModelId(modelId)) {
    return OPENAI_CHAT_MODELS[modelId];
  }

  return DEFAULT_OPENAI_CHAT_MODEL;
}

export function estimateOpenAiRequestCost(
  input: EstimateOpenAiCostInput
): OpenAiCostEstimate {
  const model = resolveOpenAiModel(input.modelId);
  const pricingKey: OpenAiChatModelId = isOpenAiModelId(model.id)
    ? model.id
    : DEFAULT_OPENAI_CHAT_MODEL_ID;
  const pricing =
    COST_CONFIG.openai[pricingKey] ??
    COST_CONFIG.openai[DEFAULT_OPENAI_CHAT_MODEL_ID];
  const screenshotCount = input.screenshotCount ?? 0;
  const inputTokens =
    input.inputTokens ??
    estimateTextTokens(input.fallbackInputText) +
      screenshotCount * model.fallbackImageTokens;
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
