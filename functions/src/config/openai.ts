export interface OpenAiChatModelConfig {
  id: string;
  maxCompletionTokens: number;
  temperature: number;
  fallbackImageTokens: number;
}

export const OPENAI_CHAT_MODELS = {
  "gpt-5.4-nano": {
    id: "gpt-5.4-nano",
    maxCompletionTokens: 2048,
    temperature: 0.4,
    fallbackImageTokens: 1200,
  },
} satisfies Record<string, OpenAiChatModelConfig>;

export type OpenAiChatModelId = keyof typeof OPENAI_CHAT_MODELS;

export const DEFAULT_OPENAI_CHAT_MODEL_ID = "gpt-5.4-nano";
export const DEFAULT_OPENAI_CHAT_MODEL =
  OPENAI_CHAT_MODELS[DEFAULT_OPENAI_CHAT_MODEL_ID];

export function getOpenAiChatCompletionsUrl() {
  return "https://api.openai.com/v1/chat/completions";
}
