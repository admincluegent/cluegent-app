import { EventEmitter } from 'events';
import { app, utilityProcess, type UtilityProcess } from 'electron';
import { existsSync } from 'fs';
import path from 'path';
import { getNativeBinaryName } from './nativeModuleLoader';

/** Isolate native microphone startup, teardown and failures from the UI thread. */
export class MicrophoneCapture extends EventEmitter {
    private child: UtilityProcess | null = null;
    private startupTimer: ReturnType<typeof setTimeout> | null = null;
    private sampleRate = 48000;
    private binaryPath: string;
    constructor(private deviceId?: string | null) {
        super();
        const binary = getNativeBinaryName();
        const found = [
            path.join(process.resourcesPath, 'app.asar.unpacked', 'native-module', binary),
            path.join(app.getAppPath(), 'native-module', binary),
            path.join(app.getAppPath(), '..', 'native-module', binary),
        ].find(file => existsSync(file));
        if (!found) throw new Error('Microphone native module is missing. Reinstall Cluegent.');
        this.binaryPath = found;
    }
    public getSampleRate(): number { return this.sampleRate; }
    public start(): void {
        if (this.child) return;
        try {
            const child = utilityProcess.fork(path.join(__dirname, 'microphoneWorker.js'), [], {
                stdio: 'pipe', serviceName: 'Cluegent microphone', allowLoadingUnsignedLibraries: true,
            });
            this.child = child;
            const fail = (message: string) => {
                if (this.child !== child) return;
                this.stop();
                this.emit('error', new Error(message));
            };
            this.startupTimer = setTimeout(() => fail('Microphone startup timed out. Check your audio device and try listening again.'), 12000);
            child.on('spawn', () => {
                // Stop can arrive before spawn completes; never leave that process running.
                if (this.child !== child) { child.kill(); return; }
                child.postMessage({ type: 'start', binaryPath: this.binaryPath, deviceId: this.deviceId });
            });
            child.on('message', (message: { type: string; rate?: number; data?: Uint8Array; message?: string }) => {
                if (this.child !== child) return;
                if (message.type === 'rate' && message.rate && message.rate > 0) {
                    this.sampleRate = message.rate;
                    this.emit('sample_rate_changed', this.sampleRate);
                } else if (message.type === 'started') {
                    this.clearStartupTimer();
                    this.emit('start');
                } else if (message.type === 'data' && message.data) {
                    this.emit('data', Buffer.from(message.data));
                } else if (message.type === 'speech_ended') {
                    this.emit('speech_ended');
                } else if (message.type === 'error') fail(message.message || 'Microphone capture failed.');
            });
            child.on('exit', code => fail(`Microphone capture stopped unexpectedly (${code}). Try listening again.`));
            child.stdout?.on('data', (data: Buffer) => console.log('[MicrophoneWorker]', data.toString().trim()));
            child.stderr?.on('data', (data: Buffer) => console.warn('[MicrophoneWorker]', data.toString().trim()));
        } catch (error) { this.stop(); this.emit('error', error); }
    }
    private clearStartupTimer(): void {
        if (this.startupTimer) clearTimeout(this.startupTimer);
        this.startupTimer = null;
    }
    public stop(): void {
        const child = this.child;
        this.child = null;
        this.clearStartupTimer();
        if (!child) return;
        // No synchronous native stop/join on the application's main thread.
        child.kill();
        this.emit('stop');
    }
    public destroy(): void { this.stop(); this.removeAllListeners(); }
}
