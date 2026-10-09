import { performance } from 'perf_hooks';
import { randomUUID } from 'crypto';

// Enabled in development; opt in for production with CLUEGENT_STT_TIMING=1.
// CLUEGENT_STT_TIMING=0 disables profiling. No audio, text, tokens or keys are logged.
export class SttTiming {
  readonly enabled = process.env.CLUEGENT_STT_TIMING === '1' ||
    (process.env.NODE_ENV === 'development' && process.env.CLUEGENT_STT_TIMING !== '0');
  readonly streamId = randomUUID();
  private pending: Array<{ bytes: number; at: number }> = [];
  private previousCapture: number | null = null;
  private previousTranscript: number | null = null;
  private firstSend: number | null = null;
  private lastSend: number | null = null;
  private captureBytes: number[] = [];
  private packetBytes: number[] = [];
  private captures: number[] = [];
  private gaps: number[] = [];
  private queueWaits: number[] = [];
  private packets: number[] = [];
  private writes: number[] = [];
  private lastSummary = performance.now();
  private sequence = 0;
  constructor() {
    if (this.enabled) this.log('profiling_enabled', {});
  }
  private log(stage: string, fields: Record<string, unknown>) {
    console.log('[SttTiming] ' + JSON.stringify({ stage, streamId: this.streamId, atMs: Date.now(), ...fields }));
  }
  capture(bytes: number, audioMs: number) {
    if (!this.enabled) return;
    const now = performance.now();
    this.pending.push({ bytes, at: now });
    this.captures.push(audioMs);
    this.captureBytes.push(bytes);
    if (this.previousCapture !== null) this.gaps.push(now - this.previousCapture);
    this.previousCapture = now;
  }
  discard(bytes: number) { this.consume(bytes); }
  private consume(bytes: number) {
    while (bytes > 0 && this.pending.length) {
      const head = this.pending[0];
      const taken = Math.min(bytes, head.bytes);
      bytes -= taken; head.bytes -= taken;
      if (!head.bytes) this.pending.shift();
    }
  }
  send(bytes: number, audioMs: number, bufferedBytes: number) {
    if (!this.enabled) return () => {};
    const now = performance.now();
    const oldest = this.pending[0]?.at;
    if (oldest !== undefined) this.queueWaits.push(now - oldest);
    this.consume(bytes);
    this.packets.push(audioMs);
    this.packetBytes.push(bytes);
    this.firstSend ??= now;
    this.lastSend = now;
    return (error?: Error) => {
      this.writes.push(performance.now() - now);
      if (error) this.log('send_error', { message: error.message });
      if (performance.now() - this.lastSummary >= 2000) this.summary(bufferedBytes);
    };
  }
  transcript(model: string, final: boolean, characters: number) {
    if (!this.enabled) return undefined;
    const now = performance.now();
    const receivedAtMs = Date.now();
    const trace = { streamId: this.streamId, eventId: ++this.sequence, receivedAtMs };
    this.log('transcript', { ...trace, model, final, characters,
      sinceFirstSendMs: this.firstSend === null ? null : now - this.firstSend,
      sinceLastSendMs: this.lastSend === null ? null : now - this.lastSend,
      updateGapMs: this.previousTranscript === null ? null : now - this.previousTranscript });
    this.previousTranscript = now;
    return trace;
  }
  summary(bufferedBytes = 0) {
    if (!this.enabled) return;
    const stats = (values: number[]) => {
      const sorted = [...values].sort((a,b) => a-b);
      return { count: sorted.length, p50: sorted[Math.floor((sorted.length-1)*.5)] ?? null,
        p95: sorted[Math.floor((sorted.length-1)*.95)] ?? null, max: sorted[sorted.length - 1] ?? null };
    };
    this.log('audio_summary', { captureBytes: stats(this.captureBytes), packetBytes: stats(this.packetBytes), captureAudioMs: stats(this.captures), captureGapMs: stats(this.gaps),
      packetAudioMs: stats(this.packets), queueWaitMs: stats(this.queueWaits), localSocketWriteMs: stats(this.writes), bufferedBytes });
    this.captureBytes = []; this.packetBytes = []; this.captures = []; this.gaps = []; this.packets = []; this.queueWaits = []; this.writes = [];
    this.lastSummary = performance.now();
  }
  reset() { this.summary(); this.pending = []; this.previousCapture = null;
    this.previousTranscript = null; this.firstSend = null; this.lastSend = null; }
}
