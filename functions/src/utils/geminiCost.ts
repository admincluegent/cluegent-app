import { COST_CONFIG } from "../config/costs.js";
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_MODEL_ID,
  GEMINI_MODELS,
  type GeminiModelConfig,
  type GeminiModelId,
} from "../config/gemini.js";

export interface EstimateGeminiCostInput {
  modelId?: string;
  inputTokens?: number;
  outputTokens?: number;
  screenshotCount?: number;
  fallbackInputText?: string;
  fallbackOutputText?: string;
}

export interface GeminiCostEstimate {
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

function isGeminiModelId(modelId: string): modelId is GeminiModelId {
  return modelId in GEMINI_MODELS;
}

function resolveGeminiModel(modelId?: string): GeminiModelConfig {
  if (modelId && isGeminiModelId(modelId)) {
    return GEMINI_MODELS[modelId];
  }

  return DEFAULT_GEMINI_MODEL;
}

export function estimateGeminiRequestCost(
  input: EstimateGeminiCostInput
): GeminiCostEstimate {
  const model = resolveGeminiModel(input.modelId);
  const pricingKey: GeminiModelId = isGeminiModelId(model.id)
    ? model.id
    : DEFAULT_GEMINI_MODEL_ID;
  const pricing =
    COST_CONFIG.gemini[pricingKey] ?? COST_CONFIG.gemini[DEFAULT_GEMINI_MODEL_ID];
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
