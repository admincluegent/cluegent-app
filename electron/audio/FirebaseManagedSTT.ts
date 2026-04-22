import { EventEmitter } from "events";
import WebSocket from "ws";
import { RECOGNITION_LANGUAGES } from "../config/languages";
import { FirebaseSessionManager } from "../services/FirebaseSessionManager";

const TOKEN_ENDPOINT =
  "https://us-central1-cluegent-2514d.cloudfunctions.net/createDeepgramStreamToken";
const TRACK_USAGE_ENDPOINT =
  "https://us-central1-cluegent-2514d.cloudfunctions.net/trackSttUsage";
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const RECONNECT_MAX_ATTEMPTS = 10;
const KEEPALIVE_INTERVAL_MS = 8000;
const REPORT_USAGE_INTERVAL_SECONDS = 15;

interface TokenResponse {
  success: true;
  token: {
    accessToken: string;
    expiresInSeconds: number;
  };
  remaining: {
    sttSecondsRemaining: number;
  };
}

interface TokenFailureResponse {
  success: false;
  code: string;
  message: string;
}

interface TrackUsageResponse {
  success: true;
  usage: {
    sttSecondsAdded: number;
    estimatedCostUsdAdded: number;
  };
  remaining: {
    sttSecondsRemaining: number;
  };
}

interface TrackUsageFailureResponse {
  success: false;
  code: string;
  message: string;
}

interface CallableSuccessEnvelope<T> {
  result: T;
}

interface CallableErrorEnvelope {
  error?: {
    status?: string;
    message?: string;
  };
}

export class FirebaseManagedSTT extends EventEmitter {
  private ws: WebSocket | null = null;
  private isActive = false;
  private shouldReconnect = false;
  private isOpen = false;
  private isConnecting = false;
  private sampleRate = 16000;
  private numChannels = 1;
  private languageCode = "en";
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private buffer: Buffer[] = [];
  private sentAudioSeconds = 0;
  private reportedAudioSeconds = 0;
  private usageReportInFlight: Promise<void> | null = null;
  private readonly tokenEndpoint: string;
  private readonly trackUsageEndpoint: string;

  constructor(
    tokenEndpoint = process.env.FIREBASE_DEEPGRAM_TOKEN_ENDPOINT || TOKEN_ENDPOINT,
    trackUsageEndpoint =
      process.env.FIREBASE_STT_USAGE_ENDPOINT || TRACK_USAGE_ENDPOINT
  ) {
    super();
    this.tokenEndpoint = tokenEndpoint;
    this.trackUsageEndpoint = trackUsageEndpoint;
  }

  public setSampleRate(rate: number): void {
    if (this.sampleRate === rate) return;
    this.sampleRate = rate;
    console.log(`[FirebaseManagedSTT] Sample rate set to ${rate}`);
    if (this.isActive) this.restartStream();
  }

  public setAudioChannelCount(count: number): void {
    if (this.numChannels === count) return;
    this.numChannels = count;
    console.log(`[FirebaseManagedSTT] Channel count set to ${count}`);
    if (this.isActive) this.restartStream();
  }

  public setRecognitionLanguage(key: string): void {
    if (key === "auto") {
      if (this.languageCode === "multi") return;
      this.languageCode = "multi";
      console.log("[FirebaseManagedSTT] Language set to multilingual mode");
      if (this.isActive) this.restartStream();
      return;
    }

    const config = RECOGNITION_LANGUAGES[key];
    if (config && this.languageCode !== config.iso639) {
      this.languageCode = config.iso639;
      console.log(`[FirebaseManagedSTT] Language set to ${this.languageCode}`);
      if (this.isActive) this.restartStream();
    }
  }

  public setCredentials(_path: string): void {}

  public start(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.sentAudioSeconds = 0;
    this.reportedAudioSeconds = 0;
    void this.connect();
  }

  public stop(): void {
    this.shouldReconnect = false;
    this.clearTimers();
    void this.flushUsage(true);

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "CloseStream" }));
        }
        this.ws.close();
      } catch {
        // ignore shutdown errors
      }
      this.ws = null;
    }

    this.isActive = false;
    this.isConnecting = false;
    this.isOpen = false;
    this.buffer = [];
    console.log("[FirebaseManagedSTT] Stopped realtime stream");
  }

  public write(chunk: Buffer): void {
    if (!this.isActive) return;

    this.sentAudioSeconds +=
      chunk.length /
      Math.max(this.sampleRate * this.numChannels * 2, 1);
    void this.flushUsage(false);

    if (!this.isOpen) {
      this.buffer.push(chunk);
      if (this.buffer.length > 500) this.buffer.shift();

      if (!this.isConnecting && this.shouldReconnect && !this.reconnectTimer) {
        void this.connect();
      }
      return;
    }

    try {
      this.ws?.send(chunk);
    } catch (error) {
      console.error("[FirebaseManagedSTT] Send error", error);
    }
  }

  public notifySpeechEnded(): void {
    // Deepgram endpointing handles finalization for realtime mode.
  }

  private restartStream(): void {
    console.log("[FirebaseManagedSTT] Restarting realtime stream");
    this.stop();
    this.start();
  }

  private async connect(): Promise<void> {
    if (this.isConnecting || !this.isActive) return;
    this.isConnecting = true;

    try {
      const accessToken = await this.fetchDeepgramAccessToken();
      this.ws = new WebSocket(this.buildListenUrl(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      this.ws.on("open", () => {
        this.isConnecting = false;
        this.isOpen = true;
        console.log("[FirebaseManagedSTT] Connected to Deepgram realtime");

        const buffered = this.buffer.splice(0);
        for (const chunk of buffered) {
          try {
            this.ws?.send(chunk);
          } catch {
            // ignore single buffered chunk failure
          }
        }

        this.keepAliveInterval = setInterval(() => {
          if (this.isOpen) {
            try {
              this.ws?.send(JSON.stringify({ type: "KeepAlive" }));
            } catch {
              // ignore
            }
          }
        }, KEEPALIVE_INTERVAL_MS);

        setTimeout(() => {
          if (this.isOpen) this.reconnectAttempts = 0;
        }, 5000);
      });

      this.ws.on("message", (payload: WebSocket.RawData) => {
        this.handleMessage(payload);
      });

      this.ws.on("error", (error: Error) => {
        console.error("[FirebaseManagedSTT] Deepgram realtime socket error", error);
        this.emit("error", this.normalizeError(error));
      });

      this.ws.on("close", (code: number, reasonBuffer: Buffer) => {
        const reason = reasonBuffer?.toString() || "(empty)";
        console.log(
          `[FirebaseManagedSTT] Realtime connection closed (code=${code}, reason=${reason})`
        );

        this.ws = null;
        this.isOpen = false;
        this.isConnecting = false;
        this.clearTimers();

        if (this.shouldReconnect && code !== 1000) {
          this.scheduleReconnect();
        }
      });

      this.ws.on("unexpected-response", (_request, response) => {
        const statusCode = response.statusCode ?? "unknown";
        const statusMessage = response.statusMessage ?? "";
        const details = [String(statusCode), statusMessage].filter(Boolean).join(" ");
        let body = "";

        response.on("data", (chunk: Buffer | string) => {
          body += chunk.toString();
        });

        response.on("end", () => {
          const suffix = body.trim() ? ` | ${body.trim()}` : "";
          console.error(
            `[FirebaseManagedSTT] Deepgram unexpected response during handshake: ${details}${suffix}`
          );
          this.emit(
            "error",
            new Error(`Deepgram websocket handshake failed: ${details}${suffix}`)
          );
        });
      });
    } catch (error) {
      console.error("[FirebaseManagedSTT] Failed to connect realtime stream", error);
      this.isConnecting = false;
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
      this.emit(
        "error",
        this.normalizeError(error)
      );
    }
  }

  private buildListenUrl(): string {
    const url = new URL("wss://api.deepgram.com/v1/listen");
    url.searchParams.set("model", "nova-3");
    url.searchParams.set("smart_format", "true");
    url.searchParams.set("interim_results", "true");
    url.searchParams.set("encoding", "linear16");
    url.searchParams.set("sample_rate", String(this.sampleRate));
    url.searchParams.set("channels", String(this.numChannels));
    url.searchParams.set("endpointing", "200");
    url.searchParams.set("utterance_end_ms", "1000");
    url.searchParams.set("vad_events", "true");

    if (this.languageCode && this.languageCode !== "multi") {
      url.searchParams.set("language", this.languageCode);
    }

    return url.toString();
  }

  private handleMessage(payload: WebSocket.RawData): void {
    try {
      const message = JSON.parse(payload.toString());

      if (message.type === "Results") {
        const alt = message.channel?.alternatives?.[0];
        const transcript = alt?.transcript?.trim();
        const isFinal = message.is_final ?? false;

        if (!transcript) {
          return;
        }

        this.emit("transcript", {
          text: transcript,
          isFinal,
          confidence: alt?.confidence ?? 1.0,
        });
        return;
      }

      if (message.type === "Metadata") {
        return;
      }

      if (message.type === "UtteranceEnd" || message.type === "SpeechStarted") {
        return;
      }

      if (message.type === "Error" || message.error || message.message) {
        console.error("[FirebaseManagedSTT] Deepgram realtime message error", message);
        this.emit("error", this.normalizeError(message));
        return;
      }

      console.warn("[FirebaseManagedSTT] Unhandled realtime event", message);
    } catch (error) {
      console.error("[FirebaseManagedSTT] Failed to parse realtime message", error);
      this.emit("error", this.normalizeError(error));
    }
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    const payload = error as
      | {
          message?: unknown;
          reason?: unknown;
          code?: unknown;
          error?: unknown;
          event?: { message?: unknown; error?: unknown };
        }
      | undefined;

    const messageParts = [
      typeof payload?.code === "string" || typeof payload?.code === "number"
        ? String(payload.code)
        : "",
      typeof payload?.message === "string" ? payload.message : "",
      typeof payload?.reason === "string" ? payload.reason : "",
      typeof payload?.event?.message === "string" ? payload.event.message : "",
      typeof payload?.error === "string" ? payload.error : "",
      typeof payload?.event?.error === "string" ? payload.event.error : "",
    ].filter(Boolean);

    if (messageParts.length > 0) {
      return new Error(messageParts.join(": "));
    }

    try {
      return new Error(JSON.stringify(error));
    } catch {
      return new Error(String(error));
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;

    if (this.reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
      this.emit(
        "error",
        new Error("FirebaseManagedSTT: max reconnect attempts exceeded")
      );
      return;
    }

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY_MS
    );
    this.reconnectAttempts += 1;
    console.log(
      `[FirebaseManagedSTT] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${RECONNECT_MAX_ATTEMPTS})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect) {
        void this.connect();
      }
    }, delay);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  private async fetchDeepgramAccessToken() {
    const idToken = FirebaseSessionManager.getInstance().getIdToken();

    if (!idToken) {
      throw new Error("Sign in with Google before using Firebase Managed STT.");
    }

    const response = await fetch(this.tokenEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ttlSeconds: 60,
      }),
    });

    const json = (await response.json()) as TokenResponse | TokenFailureResponse;

    if (!response.ok || json.success === false) {
      throw new Error(
        json.success === false
          ? json.message
          : "Failed to create Deepgram access token."
      );
    }

    return json.token.accessToken;
  }

  private async flushUsage(force: boolean): Promise<void> {
    const unreportedSeconds = this.sentAudioSeconds - this.reportedAudioSeconds;
    if (unreportedSeconds < REPORT_USAGE_INTERVAL_SECONDS && !force) {
      return;
    }

    const secondsToReport = Math.floor(unreportedSeconds);
    if (secondsToReport <= 0) {
      return;
    }

    if (this.usageReportInFlight) {
      await this.usageReportInFlight;
      return;
    }

    this.usageReportInFlight = this.reportUsage(secondsToReport)
      .then(() => {
        this.reportedAudioSeconds += secondsToReport;
      })
      .finally(() => {
        this.usageReportInFlight = null;
      });

    await this.usageReportInFlight;
  }

  private async reportUsage(durationSeconds: number) {
    const idToken = FirebaseSessionManager.getInstance().getIdToken();

    if (!idToken) {
      return;
    }

    const response = await fetch(this.trackUsageEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          durationSeconds,
        },
      }),
    });

    const json = (await response.json()) as
      | CallableSuccessEnvelope<TrackUsageResponse | TrackUsageFailureResponse>
      | CallableErrorEnvelope;

    const result =
      "result" in json && json.result ? json.result : null;
    const errorEnvelope = "error" in json ? json.error : undefined;

    if (!response.ok || result?.success === false) {
      const errorMessage =
        result?.success === false
          ? result.message
          : errorEnvelope?.message ||
            "Failed to report Firebase Managed STT usage.";
      if (
        (result?.success === false && result.code === "STT_LIMIT_EXCEEDED") ||
        errorEnvelope?.status === "RESOURCE_EXHAUSTED" ||
        response.status === 429
      ) {
        this.shouldReconnect = false;
        this.emit("error", new Error(errorMessage));
        this.stop();
        return;
      }

      console.warn("[FirebaseManagedSTT] Usage report failed", errorMessage);
    }
  }
}
