import { randomUUID } from 'crypto';

/** Wall-clock accounting, independent of audio capture or renderer visibility. */
export class HourlyUsageMeter {
  private startedAt: number | null = null;
  private queuedSeconds = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private pending: { seconds: number; id: string; report: (seconds: number, id: string) => Promise<void> }[] = [];
  private flushing = false;
  private report: ((seconds: number, id: string) => Promise<void>) | null = null;

  constructor(private now = Date.now) {}

  start(report: (seconds: number, id: string) => Promise<void>) {
    if (this.startedAt !== null) return;
    this.startedAt = this.now();
    this.queuedSeconds = 0;
    this.report = report;
    this.timer = setInterval(() => { this.enqueue(false); void this.flush(); }, 10000);
  }

  stop() {
    this.enqueue(true);
    this.startedAt = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    void this.flush();
  }

  private enqueue(final: boolean) {
    if (this.startedAt === null || !this.report) return;
    const elapsed = (this.now() - this.startedAt) / 1000;
    const total = final ? Math.ceil(elapsed) : Math.floor(elapsed);
    const seconds = Math.max(0, total - this.queuedSeconds);
    if (!seconds) return;
    this.pending.push({ seconds, id: randomUUID(), report: this.report });
    this.queuedSeconds = total;
  }

  async flush() {
    if (this.flushing) return;
    this.flushing = true;
    try {
      while (this.pending.length) {
        const item = this.pending[0];
        await item.report(item.seconds, item.id);
        this.pending.shift();
      }
    } catch (error) {
      // Retain the same identifier for retry: the backend deduplicates reports.
      console.warn('[HourlyUsageMeter] Usage sync will retry', error);
      setTimeout(() => { void this.flush(); }, 5000).unref?.();
    } finally { this.flushing = false; }
  }
}
