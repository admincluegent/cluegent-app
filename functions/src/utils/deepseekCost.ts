import { COST_CONFIG } from "../config/costs.js";
import type { DeepSeekChatModelId } from "../config/deepseek.js";

interface EstimateDeepSeekRequestCostInput {
  modelId?: string;
  inputTokens?: number;
  outputTokens?: number;
  fallbackInputText?: string;
  fallbackOutputText?: string;
}

function isDeepSeekChatModelId(value?: string): value is DeepSeekChatModelId {
  return Boolean(value && value in COST_CONFIG.deepseek);
}

function estimateTextTokens(text?: string) {
  if (!text?.trim()) {
    return 0;
  }

  return Math.max(1, Math.ceil(text.trim().length / 4));
}

export function estimateDeepSeekRequestCost(
  input: EstimateDeepSeekRequestCostInput
) {
  const modelId = isDeepSeekChatModelId(input.modelId)
    ? input.modelId
    : "deepseek-v4-flash";
  const pricing = COST_CONFIG.deepseek[modelId];
  const inputTokens =
    input.inputTokens ?? estimateTextTokens(input.fallbackInputText);
  const outputTokens =
    input.outputTokens ?? estimateTextTokens(input.fallbackOutputText);
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * pricing.inputUsdPerMillionTokens +
    (outputTokens / 1_000_000) * pricing.outputUsdPerMillionTokens;

  return {
    inputTokens,
    outputTokens,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(8)),
  };
}
