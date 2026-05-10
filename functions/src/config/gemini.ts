export interface GeminiModelConfig {
  id: string;
  apiVersion: "v1beta";
  fallbackImageTokens: number;
  maxOutputTokens: number;
  temperature: number;
}

export const GEMINI_MODELS = {
  "gemini-2.5-flash-lite": {
    id: "gemini-2.5-flash-lite",
    apiVersion: "v1beta",
    fallbackImageTokens: 1200,
    maxOutputTokens: 2048,
    temperature: 0.4,
  },
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    apiVersion: "v1beta",
    fallbackImageTokens: 1200,
    maxOutputTokens: 2048,
    temperature: 0.4,
  },
  "gemini-2.0-flash": {
    id: "gemini-2.0-flash",
    apiVersion: "v1beta",
    fallbackImageTokens: 1200,
    maxOutputTokens: 2048,
    temperature: 0.4,
  },
} satisfies Record<string, GeminiModelConfig>;

export type GeminiModelId = keyof typeof GEMINI_MODELS;
export const DEFAULT_GEMINI_MODEL_ID = "gemini-2.5-flash";
export const DEFAULT_GEMINI_MODEL = GEMINI_MODELS[DEFAULT_GEMINI_MODEL_ID];

export function getGeminiGenerateContentUrl(
  modelId = DEFAULT_GEMINI_MODEL.id
) {
  const model = GEMINI_MODELS[modelId as GeminiModelId] || DEFAULT_GEMINI_MODEL;
  return `https://generativelanguage.googleapis.com/${model.apiVersion}/models/${model.id}:generateContent`;
}

export function getGeminiStreamGenerateContentUrl(
  modelId = DEFAULT_GEMINI_MODEL.id
) {
  const model = GEMINI_MODELS[modelId as GeminiModelId] || DEFAULT_GEMINI_MODEL;
  return `https://generativelanguage.googleapis.com/${model.apiVersion}/models/${model.id}:streamGenerateContent?alt=sse`;
}
