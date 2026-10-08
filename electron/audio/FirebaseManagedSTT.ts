import { EventEmitter } from "events";
import { randomUUID } from 'crypto';
import WebSocket from "ws";
import { RECOGNITION_LANGUAGES } from "../config/languages";
import { FirebaseSessionManager } from "../services/FirebaseSessionManager";

const FIREBASE_FUNCTIONS_BASE_URL =
  process.env.FIREBASE_FUNCTIONS_BASE_URL ||
  "https://us-central1-cluegent-2514d.cloudfunctions.net";
const TOKEN_ENDPOINT =
  `${FIREBASE_FUNCTIONS_BASE_URL}/createDeepgramStreamToken`;
const TRACK_USAGE_ENDPOINT =
  `${FIREBASE_FUNCTIONS_BASE_URL}/trackSttUsage`;
const ASSEMBLY_STREAMING_BASE_URL = "wss://streaming.assemblyai.com/v3/ws";

const TOKEN_TTL_SECONDS = 60;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const RECONNECT_MAX_ATTEMPTS = 10;
const REPORT_USAGE_INTERVAL_SECONDS = 10;
const ASSEMBLY_MIN_AUDIO_MS = 50;
const ASSEMBLY_TARGET_AUDIO_MS = 60;
const ASSEMBLY_MAX_AUDIO_MS = 1000;
const TURN_MIN_SILENCE_MS = 240;
const TURN_MAX_SILENCE_MS = 900;
const TURN_END_CONFIDENCE_THRESHOLD = 0.4;

interface SttRoute {
  speechModel: string;
  proSpeechModel: string | null;
  fallbackSpeechModel: string;
  proSecondsRemaining: number;
}

interface TokenResponse {
  sttRoute?: SttRoute;
  success: true;
  token: {
    accessToken: string;
    expiresInSeconds: number;
  };
  remaining: {
    sttSecondsRemaining: number;
    proSttSecondsRemaining?: number;
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
    proSttSecondsRemaining?: number;
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

interface AssemblyBeginMessage {
  type: "Begin";
  id?: string;
  expires_at?: number;
  configuration?: { model?: string };
}

interface AssemblyTurnMessage {
  type: "Turn";
  turn_order?: number;
  transcript?: string;
  end_of_turn?: boolean;
}

interface AssemblyTerminationMessage {
  type: "Termination";
  audio_duration_seconds?: number;
  session_duration_seconds?: number;
}

type AssemblyServerMessage =
  | AssemblyBeginMessage
  | AssemblyTurnMessage
  | AssemblyTerminationMessage
  | Record<string, unknown>;

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
  private buffer: Buffer[] = [];
  private outboundAudioQueue: Buffer[] = [];
  private outboundAudioBytes = 0;
  private sentAudioSeconds = 0;
  private reportedAudioSeconds = 0;
  private usageReportInFlight: Promise<void> | null = null;
  private pendingUsageReport: { id: string; seconds: number } | null = null;
  private usageReportingEnabled = true;
  private lastTurnOrder: number | null = null;
  private lastTurnTranscript = "";
  private lastTurnFinal = false;
  private sttRoute: SttRoute | null = null;
  private switchingModel = false;
  private connectionGeneration = 0;
  private readonly tokenEndpoint: string;
  private prefetchedAccessToken: { token: Promise<TokenResponse>; validUntil: number } | null = null;
  private readonly trackUsageEndpoint: string;

  constructor(
    tokenEndpoint =
      process.env.FIREBASE_ASSEMBLY_TOKEN_ENDPOINT ||
      process.env.FIREBASE_DEEPGRAM_TOKEN_ENDPOINT ||
      TOKEN_ENDPOINT,
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
    const nextLanguage =
      key === "auto"
        ? "multi"
        : (RECOGNITION_LANGUAGES[key]?.iso639 ?? this.languageCode);
    if (this.languageCode === nextLanguage) return;
    this.languageCode = nextLanguage;
    this.prefetchedAccessToken = null;
    this.sttRoute = null;
    console.log(`[FirebaseManagedSTT] Language set to ${this.languageCode}`);
    if (this.isActive) this.restartStream();
  }

  public setCredentials(_path: string): void {}

  public setUsageReportingEnabled(enabled: boolean): void {
    if (this.usageReportingEnabled && !enabled) void this.flushUsage(true).catch(console.error);
    this.usageReportingEnabled = enabled;
  }

  public start(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    // Keep accounting cumulative across restarts: a final report may still be
    // in flight when listening resumes, and must not consume the new session twice.
    this.lastTurnOrder = null;
    this.lastTurnTranscript = "";
    void this.connect();
  }

  public stop(): void {
    this.connectionGeneration += 1;
    this.switchingModel = false;
    this.prefetchedAccessToken = null;
    this.shouldReconnect = false;
    this.clearTimers();
    void this.flushUsage(true).catch(console.error);

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "Terminate" }));
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
    this.outboundAudioQueue = [];
    this.outboundAudioBytes = 0;
    this.lastTurnOrder = null;
    this.lastTurnTranscript = "";
    console.log("[FirebaseManagedSTT] Stopped realtime stream");
  }

  public write(chunk: Buffer): void {
    if (!this.isActive) return;

    if (this.usageReportingEnabled) {
      this.sentAudioSeconds +=
        chunk.length / Math.max(this.sampleRate * this.numChannels * 2, 1);
      void this.flushUsage(false).catch(console.error);
    }

    if (!this.isOpen) {
      this.buffer.push(chunk);
      if (this.buffer.length > 500) this.buffer.shift();

      if (!this.isConnecting && !this.switchingModel && this.shouldReconnect && !this.reconnectTimer) {
        void this.connect();
      }
      return;
    }

    this.enqueueOutboundAudio(chunk);
    this.flushOutboundAudio();
  }

  public notifySpeechEnded(): void {
    // Flush a trailing partial packet with silence padding if needed so
    // AssemblyAI still receives the end of the utterance in a valid frame.
    this.flushOutboundAudio(true);
  }

  private restartStream(): void {
    console.log("[FirebaseManagedSTT] Restarting realtime stream");
    this.stop();
    this.start();
  }

  /** The shared, backend-metered allowance updates both capture streams. */
  public setProSecondsRemaining(seconds: number): void {
    this.prefetchedAccessToken = null;
    if (!this.sttRoute || !Number.isFinite(seconds)) return;
    const previous = this.sttRoute.speechModel;
    this.sttRoute.proSecondsRemaining = Math.max(0, seconds);
    this.sttRoute.speechModel = seconds > 0 && this.sttRoute.proSpeechModel
      ? this.sttRoute.proSpeechModel : this.sttRoute.fallbackSpeechModel;
    if (previous !== this.sttRoute.speechModel && this.isActive && !this.switchingModel) {
      // Finish the current usage receipt before requesting the next token.
      this.switchingModel = true;
      setTimeout(() => { void this.switchModel(); }, 0);
    }
  }

  private async switchModel(): Promise<void> {
    if (!this.isActive || !this.switchingModel) return;
    const generation = ++this.connectionGeneration;
    const oldSocket = this.ws;
    this.clearTimers();
    this.flushOutboundAudio(true);
    this.isOpen = false; // Capture now queues audio while the old turn drains.
    this.isConnecting = false;
    this.ws = null;
    if (oldSocket?.readyState === WebSocket.OPEN) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => { oldSocket.close(); resolve(); }, 1000);
        oldSocket.once('close', () => { clearTimeout(timer); resolve(); });
        try {
          oldSocket.send(JSON.stringify({ type: 'ForceEndpoint' }));
          oldSocket.send(JSON.stringify({ type: 'Terminate' }));
        } catch { clearTimeout(timer); resolve(); }
      });
    } else { oldSocket?.close(); }
    if (generation !== this.connectionGeneration) return;
    this.switchingModel = false;
    if (this.isActive && this.shouldReconnect) {
      console.log('[FirebaseManagedSTT] Refreshing stream for updated Pro allowance');
      await this.connect();
    }
  }

  private resolveSpeechModel() {
    if (this.sttRoute) return this.sttRoute.speechModel;
    // Compatible with an older backend until the routing functions are deployed.
    return this.languageCode === "en"
      ? "universal-streaming-english"
      : "whisper-rt";
  }

  private buildStreamingUrl(token: string) {
    const url = new URL(ASSEMBLY_STREAMING_BASE_URL);
    url.searchParams.set("token", token);
    url.searchParams.set("sample_rate", String(this.sampleRate));
    // Keep partial turns raw for maximum "live" feel; formatting can wait until final.
    url.searchParams.set("format_turns", "false");
    url.searchParams.set("include_partial_turns", "true");
    // Lower endpointing silence thresholds to reduce lag before final turn emission.
    url.searchParams.set("min_turn_silence", String(TURN_MIN_SILENCE_MS));
    url.searchParams.set("max_turn_silence", String(TURN_MAX_SILENCE_MS));
    url.searchParams.set(
      "end_of_turn_confidence_threshold",
      String(TURN_END_CONFIDENCE_THRESHOLD)
    );
    const model = this.resolveSpeechModel();
    url.searchParams.set("speech_model", model);
    if (model === "universal-3-6-pro") {
      url.searchParams.set("mode", "min_latency");
      url.searchParams.set("min_turn_silence", "128");
      url.searchParams.set("max_turn_silence", "640");
      url.searchParams.set("interruption_delay", "0");
      url.searchParams.set("continuous_partials", "true");
      if (this.languageCode !== "multi") {
        url.searchParams.set("language_codes", JSON.stringify([this.languageCode]));
      }
    }
    return url.toString();
  }

  private async connect(): Promise<void> {
    if (this.isConnecting || !this.isActive || this.switchingModel) return;
    const generation = this.connectionGeneration;
    const connectionStartedAt = Date.now();
    this.isConnecting = true;

    try {
      const authorization = await this.fetchAssemblyAccessToken();
      if (!this.isActive || generation !== this.connectionGeneration) return;
      this.sttRoute = authorization.sttRoute ?? null;
      const accessToken = authorization.token.accessToken;
      this.lastTurnOrder = null;
      this.lastTurnTranscript = "";
      this.lastTurnFinal = false;
      console.log(`[ListeningTiming] Token ready after ${Date.now() - connectionStartedAt}ms`);
      const requestedModel = this.resolveSpeechModel();
      const ws = new WebSocket(this.buildStreamingUrl(accessToken));
      this.ws = ws;
      console.log(`[FirebaseManagedSTT] Requested speech model: ${this.resolveSpeechModel()}`);

      ws.on("open", () => {
        if (this.ws !== ws) return;
        this.isConnecting = false;
        this.isOpen = true;
        console.log("[FirebaseManagedSTT] Connected to AssemblyAI realtime");
        console.log(`[ListeningTiming] WebSocket ready after ${Date.now() - connectionStartedAt}ms`);
        this.emit("connected");

        const buffered = this.buffer.splice(0);
        for (const chunk of buffered) {
          this.enqueueOutboundAudio(chunk);
        }
        this.flushOutboundAudio();

        setTimeout(() => {
          if (this.isOpen) this.reconnectAttempts = 0;
        }, 5000);
      });

      ws.on("message", (payload: WebSocket.RawData) => {
        if (this.ws !== ws && !this.switchingModel) return;
        this.handleMessage(payload, requestedModel);
      });

      ws.on("error", (error: Error) => {
        if (this.ws !== ws) return;
        console.error("[FirebaseManagedSTT] Assembly realtime socket error", error);
        this.emit("error", this.normalizeError(error));
      });

      ws.on("close", (code: number, reasonBuffer: Buffer) => {
        if (this.ws !== ws) return;
        const reason = reasonBuffer?.toString() || "(empty)";
        console.log(
          `[FirebaseManagedSTT] Realtime connection closed (code=${code}, reason=${reason})`
        );

        this.ws = null;
        this.isOpen = false;
        this.isConnecting = false;
        this.clearTimers();

        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      });
    } catch (error) {
      if (generation !== this.connectionGeneration) return;
      console.error("[FirebaseManagedSTT] Failed to connect realtime stream", error);
      this.isConnecting = false;
      if (this.shouldReconnect) {
        const message = error instanceof Error ? error.message : String(error);
        if (/stt limit exceeded|listening limit reached|free trial.*(?:limit reached|exhausted|ended)/i.test(message)) {
          this.shouldReconnect = false;
          this.emit("error", this.normalizeError(error));
          this.stop();
          return;
        }
        this.scheduleReconnect();
      }
      this.emit("error", this.normalizeError(error));
    }
  }

  private handleMessage(payload: WebSocket.RawData, requestedModel = this.resolveSpeechModel()): void {
    try {
      const textPayload =
        typeof payload === "string" ? payload : payload.toString("utf8");
      const message = JSON.parse(textPayload) as AssemblyServerMessage;
      const type = (message as { type?: string }).type;

      if (type === "Begin") {
        const actualModel = (message as AssemblyBeginMessage).configuration?.model;
        console.log(actualModel
          ? `[FirebaseManagedSTT] Confirmed speech model: ${actualModel}`
          : `[FirebaseManagedSTT] Begin received without model confirmation; requested: ${requestedModel}`);
        if (actualModel && actualModel !== requestedModel) {
          this.emit("error", new Error(`AssemblyAI returned ${actualModel}; requested ${requestedModel}`));
          this.stop();
        }
        return;
      }

      if (type === "Turn") {
        const turn = message as AssemblyTurnMessage;
        const transcript = (turn.transcript ?? "").trim();
        const turnOrder = typeof turn.turn_order === "number" ? turn.turn_order : -1;

        if (!transcript) {
          return;
        }

        if (
          this.lastTurnOrder === turnOrder &&
          this.lastTurnTranscript === transcript &&
          this.lastTurnFinal === Boolean(turn.end_of_turn)
        ) {
          return;
        }

        this.lastTurnOrder = turnOrder;
        this.lastTurnTranscript = transcript;
        this.lastTurnFinal = Boolean(turn.end_of_turn);

        this.emit("transcript", {
          text: transcript,
          isFinal: Boolean(turn.end_of_turn),
          confidence: 1,
        });
        return;
      }

      if (type === "Termination") {
        return;
      }

      if (
        typeof (message as { error?: unknown }).error === "string" ||
        typeof (message as { message?: unknown }).message === "string"
      ) {
        this.emit("error", this.normalizeError(message));
      }
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
        }
      | undefined;

    const messageParts = [
      typeof payload?.code === "string" || typeof payload?.code === "number"
        ? String(payload.code)
        : "",
      typeof payload?.message === "string" ? payload.message : "",
      typeof payload?.reason === "string" ? payload.reason : "",
      typeof payload?.error === "string" ? payload.error : "",
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

  private bytesForDurationMs(durationMs: number) {
    const bytesPerSecond = Math.max(this.sampleRate * this.numChannels * 2, 1);
    return Math.max(2, Math.ceil((bytesPerSecond * durationMs) / 1000));
  }

  private enqueueOutboundAudio(chunk: Buffer) {
    if (chunk.length <= 0) return;
    this.outboundAudioQueue.push(chunk);
    this.outboundAudioBytes += chunk.length;
  }

  private consumeOutboundAudio(byteCount: number) {
    if (byteCount <= 0 || this.outboundAudioBytes <= 0) {
      return Buffer.alloc(0);
    }

    let remaining = Math.min(byteCount, this.outboundAudioBytes);
    const consumed: Buffer[] = [];

    while (remaining > 0 && this.outboundAudioQueue.length > 0) {
      const next = this.outboundAudioQueue[0];
      if (next.length <= remaining) {
        consumed.push(next);
        this.outboundAudioQueue.shift();
        this.outboundAudioBytes -= next.length;
        remaining -= next.length;
        continue;
      }

      consumed.push(next.subarray(0, remaining));
      this.outboundAudioQueue[0] = next.subarray(remaining);
      this.outboundAudioBytes -= remaining;
      remaining = 0;
    }

    return consumed.length === 1 ? consumed[0] : Buffer.concat(consumed);
  }

  private sendAudioPacket(packet: Buffer) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || packet.length <= 0) {
      return;
    }

    try {
      this.ws.send(packet);
    } catch (error) {
      console.error("[FirebaseManagedSTT] Send error", error);
    }
  }

  private flushOutboundAudio(force = false) {
    if (!this.isOpen || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const minPacketBytes = this.bytesForDurationMs(ASSEMBLY_MIN_AUDIO_MS);
    const targetPacketBytes = this.bytesForDurationMs(ASSEMBLY_TARGET_AUDIO_MS);
    const maxPacketBytes = this.bytesForDurationMs(ASSEMBLY_MAX_AUDIO_MS);

    while (this.outboundAudioBytes >= targetPacketBytes) {
      this.sendAudioPacket(this.consumeOutboundAudio(targetPacketBytes));
    }

    if (!force || this.outboundAudioBytes <= 0) {
      return;
    }

    if (this.outboundAudioBytes > maxPacketBytes) {
      while (this.outboundAudioBytes > maxPacketBytes) {
        this.sendAudioPacket(this.consumeOutboundAudio(maxPacketBytes));
      }
    }

    if (this.outboundAudioBytes >= minPacketBytes) {
      this.sendAudioPacket(this.consumeOutboundAudio(this.outboundAudioBytes));
      return;
    }

    const remainder = this.consumeOutboundAudio(this.outboundAudioBytes);
    if (remainder.length <= 0) {
      return;
    }

    const paddedPacket = Buffer.alloc(minPacketBytes);
    remainder.copy(paddedPacket, 0, 0, remainder.length);
    this.sendAudioPacket(paddedPacket);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public async prefetchAccessToken(): Promise<void> {
    if (this.prefetchedAccessToken && this.prefetchedAccessToken.validUntil > Date.now()) return;
    const entry = { token: this.requestAssemblyAccessToken(), validUntil: Date.now() + (TOKEN_TTL_SECONDS - 10) * 1000 };
    this.prefetchedAccessToken = entry;
    try { await entry.token; }
    catch (error) { if (this.prefetchedAccessToken === entry) this.prefetchedAccessToken = null; throw error; }
  }

  private async fetchAssemblyAccessToken() {
    const cached = this.prefetchedAccessToken;
    this.prefetchedAccessToken = null; // Consume once; never share a token between streams.
    if (cached && cached.validUntil > Date.now()) return cached.token;
    return this.requestAssemblyAccessToken();
  }

  private async requestAssemblyAccessToken() {
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
        ttlSeconds: TOKEN_TTL_SECONDS,
        language: this.languageCode,
      }),
    });

    const json = (await response.json()) as TokenResponse | TokenFailureResponse;

    if (!response.ok || json.success === false) {
      throw new Error(
        json.success === false
          ? json.message
          : "Failed to create AssemblyAI access token."
      );
    }

    return json;
  }

  private async flushUsage(force: boolean): Promise<void> {
    if (!this.usageReportingEnabled && !force) {
      return;
    }

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
      // Stop/disable may arrive while an earlier receipt is being submitted.
      // Drain the captured tail after that receipt settles, even if metering
      // has since been disabled. New capture is no longer counted in that case.
      if (force) await this.flushUsage(true);
      return;
    }

    const report = this.pendingUsageReport ?? { id: randomUUID(), seconds: secondsToReport };
    this.pendingUsageReport = report;
    this.usageReportInFlight = this.reportUsage(report.seconds, report.id)
      .then(() => {
        this.reportedAudioSeconds += report.seconds;
        if (this.pendingUsageReport === report) this.pendingUsageReport = null;
      })
      .finally(() => {
        this.usageReportInFlight = null;
      });

    await this.usageReportInFlight;
  }

  private async reportUsage(durationSeconds: number, reportId: string) {
    const idToken = FirebaseSessionManager.getInstance().getIdToken();

    if (!idToken) {
      throw new Error("Sign in before reporting listening usage.");
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
          reportId,
        },
      }),
    });

    const json = (await response.json()) as
      | CallableSuccessEnvelope<TrackUsageResponse | TrackUsageFailureResponse>
      | CallableErrorEnvelope;

    const result = "result" in json && json.result ? json.result : null;
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

      throw new Error(errorMessage);
    }
    if (result?.success === true && result.remaining.sttSecondsRemaining > 0 &&
        typeof result.remaining.proSttSecondsRemaining === "number") {
      this.setProSecondsRemaining(result.remaining.proSttSecondsRemaining);
      this.emit("stt-allowance", result.remaining.proSttSecondsRemaining);
    }
    if (result?.success === true && result.remaining.sttSecondsRemaining <= 0) {
      this.shouldReconnect = false;
      this.emit('error', new Error('Listening limit reached. Add hours or wait for your next allowance.'));
      this.stop();
    }
  }
}
