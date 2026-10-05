const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { EventEmitter } = require('node:events');

function fixture() {
  const children = [], timers = new Map(); let timerId = 0;
  const utilityProcess = { fork() {
    const child = new EventEmitter();
    child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
    child.postMessage = message => { child.command = message; };
    child.kill = () => { child.killed = true; child.emit('exit', 0); };
    children.push(child); return child;
  }};
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('electron/audio/MicrophoneCapture.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, Buffer, __dirname: '/app/electron/audio', console,
    process: { resourcesPath: '/resources' },
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id),
    require: name => name === 'electron' ? { app: { getAppPath: () => '/app' }, utilityProcess }
      : name === 'fs' ? { existsSync: () => true }
      : name === './nativeModuleLoader' ? { getNativeBinaryName: () => 'index.darwin-arm64.node' }
      : require(name),
  });
  const capture = new exports.MicrophoneCapture('selected-device');
  const errors = []; capture.on('error', error => errors.push(error.message));
  return { capture, children, timers, errors };
}

test('each restart uses a fresh process and ignores events from previous sessions', () => {
  const f = fixture(), chunks = [], rates = [];
  f.capture.on('data', chunk => chunks.push(chunk.toString()));
  f.capture.on('sample_rate_changed', rate => rates.push(rate));
  for (let i = 0; i < 3; i++) {
    f.capture.start(); f.capture.start();
    assert.equal(f.children.length, i + 1);
    const child = f.children[i]; child.emit('spawn');
    assert.equal(child.command.deviceId, 'selected-device');
    child.emit('message', { type: 'rate', rate: 44100 });
    assert.equal(f.capture.getSampleRate(), 44100);
    child.emit('message', { type: 'started' }); assert.equal(f.timers.size, 0);
    child.emit('message', { type: 'data', data: Buffer.from('audio') });
    f.capture.stop(); assert.equal(child.killed, true);
    child.emit('message', { type: 'data', data: Buffer.from('stale') });
  }
  assert.deepEqual(chunks, ['audio', 'audio', 'audio']);
  assert.equal(rates.length, 3); assert.deepEqual(f.errors, []);
});

test('blocked native startup times out without blocking stop or subsequent restart', () => {
  const f = fixture(); f.capture.start();
  [...f.timers.values()][0]();
  assert.equal(f.children[0].killed, true);
  assert.match(f.errors[0], /startup timed out/);
  f.capture.start(); assert.equal(f.children.length, 2);
  f.capture.stop(); assert.equal(f.children[1].killed, true);
  assert.equal(f.timers.size, 0);
});

test('stopping before the process spawns never starts or leaves an orphan microphone', () => {
  const f = fixture(); f.capture.start();
  const child = f.children[0]; f.capture.stop();
  child.killed = false; child.emit('spawn');
  assert.equal(child.killed, true); assert.equal(child.command, undefined);
  assert.deepEqual(f.errors, []);
});

test('native errors and unexpected exits are recoverable; intentional shutdown is not an error', () => {
  const f = fixture(); f.capture.start();
  f.children[0].emit('message', { type: 'error', message: 'Device unavailable' });
  assert.equal(f.children[0].killed, true); assert.deepEqual(f.errors, ['Device unavailable']);
  f.capture.start(); f.children[1].emit('exit', 1);
  assert.match(f.errors[1], /stopped unexpectedly/);
  f.capture.start(); f.capture.destroy();
  assert.equal(f.children[2].killed, true); assert.equal(f.errors.length, 2);
});

test('worker forwards native sample rate, PCM and speech events', () => {
  const port = new EventEmitter(), messages = []; port.postMessage = message => messages.push(message);
  let selectedDevice;
  class NativeMicrophone {
    constructor(device) { selectedDevice = device; }
    getSampleRate() { return 44100; }
    start(audio, speech) { audio(null, Buffer.from('pcm')); speech(null); }
  }
  const code = ts.transpileModule(fs.readFileSync('electron/audio/microphoneWorker.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { process: { parentPort: port }, Buffer, require: () => ({ MicrophoneCapture: NativeMicrophone }) });
  port.emit('message', { data: { type: 'start', binaryPath: '/native.node', deviceId: 'mic' } });
  assert.equal(selectedDevice, 'mic');
  assert.deepEqual(messages.map(message => message.type), ['rate', 'data', 'speech_ended', 'started']);
  assert.equal(messages[1].data.toString(), 'pcm');
});
