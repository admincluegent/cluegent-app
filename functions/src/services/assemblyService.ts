const DEFAULT_ASSEMBLY_TOKEN_TTL_SECONDS = 60;
const MIN_ASSEMBLY_TOKEN_TTL_SECONDS = 1;
const MAX_ASSEMBLY_TOKEN_TTL_SECONDS = 600;

interface AssemblyTokenResponse {
  token?: string;
  expires_in_seconds?: number;
  error?: string;
  message?: string;
}

export class AssemblyServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssemblyServiceError";
  }
}

function normalizeTtlSeconds(ttlSeconds?: number) {
  return Math.min(
    Math.max(
      Math.floor(ttlSeconds ?? DEFAULT_ASSEMBLY_TOKEN_TTL_SECONDS),
      MIN_ASSEMBLY_TOKEN_TTL_SECONDS
    ),
    MAX_ASSEMBLY_TOKEN_TTL_SECONDS
  );
}

export async function createAssemblyStreamingAccessToken(input: {
  apiKey: string;
  ttlSeconds?: number;
}) {
  const apiKey = input.apiKey.trim();
  const ttlSeconds = normalizeTtlSeconds(input.ttlSeconds);
  const url = new URL("https://streaming.assemblyai.com/v3/token");
  url.searchParams.set("expires_in_seconds", String(ttlSeconds));

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
    });
  } catch (error) {
    throw new AssemblyServiceError(
      `Failed to reach AssemblyAI token service: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  let json: AssemblyTokenResponse;
  try {
    json = (await response.json()) as AssemblyTokenResponse;
  } catch (error) {
    throw new AssemblyServiceError(
      `AssemblyAI token service returned invalid JSON: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  if (!response.ok || !json.token) {
    throw new AssemblyServiceError(
      json.error ||
        json.message ||
        `AssemblyAI token request failed with status ${response.status}.`
    );
  }

  return {
    accessToken: json.token,
    expiresInSeconds:
      typeof json.expires_in_seconds === "number"
        ? json.expires_in_seconds
        : ttlSeconds,
  };
}
