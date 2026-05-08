import type { GeminiModelId } from "./gemini.js";
import type { DeepSeekChatModelId } from "./deepseek.js";
import type { GroqChatModelId } from "./groq.js";

export interface ChatModelPricing {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}

export const COST_CONFIG = {
  gemini: {
    "gemini-2.5-flash-lite": {
      inputUsdPerMillionTokens: 0.1,
      outputUsdPerMillionTokens: 0.4,
    },
    "gemini-2.5-flash": {
      inputUsdPerMillionTokens: 0.3,
      outputUsdPerMillionTokens: 2.5,
    },
    "gemini-2.0-flash": {
      inputUsdPerMillionTokens: 0.1,
      outputUsdPerMillionTokens: 0.4,
    },
  } satisfies Record<GeminiModelId, ChatModelPricing>,
  groq: {
    "meta-llama/llama-4-scout-17b-16e-instruct": {
      inputUsdPerMillionTokens: 0.11,
      outputUsdPerMillionTokens: 0.34,
    },
  } satisfies Record<GroqChatModelId, ChatModelPricing>,
  deepseek: {
    // Premium onboarding model. Keep a separate entry so usage/cost reporting
    // can distinguish it even while public v4-pro pricing is not finalized here.
    "deepseek-v4-pro": {
      inputUsdPerMillionTokens: 0.28,
      outputUsdPerMillionTokens: 0.42,
    },
    // DeepSeek's current docs confirm `deepseek-v4-flash` is available,
    // but the pricing page has not published v4-flash-specific rates yet.
    // Reuse the published non-thinking chat rate until DeepSeek ships
    // model-specific pricing guidance.
    "deepseek-v4-flash": {
      inputUsdPerMillionTokens: 0.28,
      outputUsdPerMillionTokens: 0.42,
    },
  } satisfies Record<DeepSeekChatModelId, ChatModelPricing>,
  // deepgram: {
  //   usdPerMinute: 0,
  // },
  groqStt: {
    usdPerMinute: 0,
  },
} as const;
