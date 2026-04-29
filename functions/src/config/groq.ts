export interface GroqChatModelConfig {
  id: string;
  maxCompletionTokens: number;
  temperature: number;
}

export interface GroqTranscriptionModelConfig {
  id: string;
}

export const GROQ_CHAT_MODELS = {
  "meta-llama/llama-4-scout-17b-16e-instruct": {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    maxCompletionTokens: 2048,
    temperature: 0.4,
  },
} satisfies Record<string, GroqChatModelConfig>;

export const GROQ_TRANSCRIPTION_MODELS = {
  "whisper-large-v3-turbo": {
    id: "whisper-large-v3-turbo",
  },
} satisfies Record<string, GroqTranscriptionModelConfig>;

export type GroqChatModelId = keyof typeof GROQ_CHAT_MODELS;
export type GroqTranscriptionModelId = keyof typeof GROQ_TRANSCRIPTION_MODELS;

export const DEFAULT_GROQ_CHAT_MODEL_ID =
  "meta-llama/llama-4-scout-17b-16e-instruct";
export const DEFAULT_GROQ_CHAT_MODEL =
  GROQ_CHAT_MODELS[DEFAULT_GROQ_CHAT_MODEL_ID];

export const DEFAULT_GROQ_TRANSCRIPTION_MODEL_ID = "whisper-large-v3-turbo";
export const DEFAULT_GROQ_TRANSCRIPTION_MODEL =
  GROQ_TRANSCRIPTION_MODELS[DEFAULT_GROQ_TRANSCRIPTION_MODEL_ID];

export function getGroqChatCompletionsUrl() {
  return "https://api.groq.com/openai/v1/chat/completions";
}

export function getGroqTranscriptionsUrl() {
  return "https://api.groq.com/openai/v1/audio/transcriptions";
}
