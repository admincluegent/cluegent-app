import type { GeminiModelId } from "./gemini.js";

export interface GeminiModelPricing {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}

export const COST_CONFIG = {
  gemini: {
    "gemini-2.5-flash": {
      inputUsdPerMillionTokens: 0.3,
      outputUsdPerMillionTokens: 2.5,
    },
    "gemini-2.0-flash": {
      inputUsdPerMillionTokens: 0.1,
      outputUsdPerMillionTokens: 0.4,
    },
  } satisfies Record<GeminiModelId, GeminiModelPricing>,
  deepgram: {
    usdPerMinute: 0,
  },
} as const;
