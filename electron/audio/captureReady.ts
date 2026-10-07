import type { EventEmitter } from 'events';

/** Resolve only when capture acknowledges startup; reject on failure or cancellation. */
export function startCaptureReady(capture: EventEmitter & { start(): void }, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      capture.removeListener('start', ready);
      capture.removeListener('error', failed);
      capture.removeListener('stop', cancelled);
    };
    const ready = () => { cleanup(); resolve(); };
    const failed = (error: Error) => { cleanup(); reject(error); };
    const cancelled = () => failed(new Error('Audio startup was stopped. Try listening again.'));
    const timer = setTimeout(() => failed(new Error('Audio startup timed out. Check permissions and retry.')), timeoutMs);
    capture.once('start', ready);
    capture.once('error', failed);
    capture.once('stop', cancelled);
    try { capture.start(); } catch (error) { failed(error as Error); }
  });
}
