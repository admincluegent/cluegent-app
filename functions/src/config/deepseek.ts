export interface DeepSeekChatModelConfig {
  id: string;
  maxCompletionTokens: number;
  temperature: number;
}

export const DEEPSEEK_CHAT_MODELS = {
  "deepseek-v4-flash": {
    id: "deepseek-v4-flash",
    maxCompletionTokens: 2048,
    temperature: 0.4,
  },
} satisfies Record<string, DeepSeekChatModelConfig>;

export type DeepSeekChatModelId = keyof typeof DEEPSEEK_CHAT_MODELS;

export const DEFAULT_DEEPSEEK_CHAT_MODEL_ID = "deepseek-v4-flash";
export const DEFAULT_DEEPSEEK_CHAT_MODEL =
  DEEPSEEK_CHAT_MODELS[DEFAULT_DEEPSEEK_CHAT_MODEL_ID];

export function getDeepSeekChatCompletionsUrl() {
  return "https://api.deepseek.com/chat/completions";
}
