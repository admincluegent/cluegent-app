// Native calls run in a disposable process, never Electron's main/UI thread.
const parentPort = process.parentPort;
let monitor: any = null;
parentPort.on('message', ({ data }: { data: { type: string; binaryPath: string; deviceId?: string | null } }) => {
    if (data.type !== 'start' || monitor) return;
    try {
        const native = require(data.binaryPath);
        monitor = new native.MicrophoneCapture(data.deviceId || null);
        const rate = monitor.getSampleRate?.() ?? monitor.get_sample_rate?.() ?? 48000;
        parentPort.postMessage({ type: 'rate', rate });
        monitor.start((error: Error | null, chunk: Buffer) => {
            if (error) parentPort.postMessage({ type: 'error', message: error.message });
            else if (chunk?.length) parentPort.postMessage({ type: 'data', data: chunk });
        }, (error: Error | null) => {
            if (!error) parentPort.postMessage({ type: 'speech_ended' });
        });
        parentPort.postMessage({ type: 'started' });
    } catch (error) {
        parentPort.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    }
});
