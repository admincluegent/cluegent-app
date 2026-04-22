const DEFAULT_DEEPGRAM_MODEL = "nova-3";
const DEFAULT_DEEPGRAM_LANGUAGE = "en";
const DEFAULT_DEEPGRAM_TOKEN_TTL_SECONDS = 60;

export interface TranscribeDeepgramInput {
  apiKey: string;
  audioBase64: string;
  mimeType?: string;
  model?: string;
  language?: string;
}

interface DeepgramGrantTokenResponse {
  access_token?: string;
  expires_in?: number;
  err_msg?: string;
}

interface DeepgramResponse {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
      }>;
    }>;
  };
  err_msg?: string;
}

export class DeepgramServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeepgramServiceError";
  }
}

export async function createDeepgramAccessToken(input: {
  apiKey: string;
  ttlSeconds?: number;
}) {
  const ttlSeconds = Math.min(
    Math.max(Math.floor(input.ttlSeconds ?? DEFAULT_DEEPGRAM_TOKEN_TTL_SECONDS), 1),
    3600
  );

  let response: Response;

  try {
    response = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ttl_seconds: ttlSeconds,
      }),
    });
  } catch (error) {
    throw new DeepgramServiceError(
      `Failed to reach Deepgram token service: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  let json: DeepgramGrantTokenResponse;

  try {
    json = (await response.json()) as DeepgramGrantTokenResponse;
  } catch (error) {
    throw new DeepgramServiceError(
      `Deepgram token service returned invalid JSON: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  if (!response.ok || !json.access_token) {
    throw new DeepgramServiceError(
      json.err_msg ||
        `Deepgram token grant failed with status ${response.status}.`
    );
  }

  return {
    accessToken: json.access_token,
    expiresInSeconds:
      typeof json.expires_in === "number" ? json.expires_in : ttlSeconds,
  };
}

function normalizeAudioBase64(rawBase64: string) {
  const trimmed = rawBase64.trim();
  const dataUrlMatch = trimmed.match(/^data:(.+?);base64,(.+)$/);

  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1] || "audio/wav",
      data: dataUrlMatch[2] || "",
    };
  }

  return {
    mimeType: "audio/wav",
    data: trimmed,
  };
}

function extractTranscript(response: DeepgramResponse) {
  const transcript = response.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();

  if (!transcript) {
    throw new DeepgramServiceError("Deepgram returned an empty transcript.");
  }

  return transcript;
}

export async function transcribeWithDeepgram(
  input: TranscribeDeepgramInput
) {
  const normalizedAudio = normalizeAudioBase64(input.audioBase64);
  const mimeType = input.mimeType?.trim() || normalizedAudio.mimeType || "audio/wav";
  const model = input.model?.trim() || DEFAULT_DEEPGRAM_MODEL;
  const language = input.language?.trim() || DEFAULT_DEEPGRAM_LANGUAGE;
  const url = new URL("https://api.deepgram.com/v1/listen");
  url.searchParams.set("model", model);
  url.searchParams.set("language", language);

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${input.apiKey}`,
        "Content-Type": mimeType,
      },
      body: Buffer.from(normalizedAudio.data, "base64"),
    });
  } catch (error) {
    throw new DeepgramServiceError(
      `Failed to reach Deepgram: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  let json: DeepgramResponse;

  try {
    json = (await response.json()) as DeepgramResponse;
  } catch (error) {
    throw new DeepgramServiceError(
      `Deepgram returned an invalid response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  if (!response.ok) {
    throw new DeepgramServiceError(
      json.err_msg || `Deepgram request failed with status ${response.status}.`
    );
  }

  return {
    transcript: extractTranscript(json),
    model,
    language,
  };
}
