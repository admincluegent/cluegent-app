// Exercise the actual AppState update methods without starting Electron or installing a release.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { EventEmitter } = require('node:events');
const source = ts.createSourceFile('main.ts', fs.readFileSync('electron/main.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const names = new Set(['getUpdateState', 'publishUpdate', 'setupAutoUpdater', 'isMicrosoftStoreBuild', 'notifyMicrosoftStoreManagedUpdates', 'quitAndInstallUpdate', 'checkForUpdates', 'performUpdateCheck', 'runStoreUpdate']);
const appClass = source.statements.find(n => ts.isClassDeclaration(n) && n.members.some(m => m.name?.getText(source) === 'setupAutoUpdater'));
const methods = appClass.members.filter(m => m.name && names.has(m.name.getText(source))).map(m => m.getText(source)).join('\n');
const code = ts.transpileModule(`class Updates {
 updateSnapshot = {status: 'idle'}; updateCheckInFlight = null;
 isMeetingActive = false; isListeningActive = false;
 broadcast(channel, info) { this.events.push([channel, info]); }
 events = []; getMainWindow() { return { isDestroyed: () => false, getNativeWindowHandle: () => Buffer.alloc(8) }; }
 async openMicrosoftStoreUpdates() { this.storeOpened = true; }
 ${methods}
}; globalThis.Updates = Updates;`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

function fixture({store = false, packaged = true, result = 'ready', missingNative = false} = {}) {
 const updater = new EventEmitter();
 let checks = 0, installs = 0, relaunches = 0;
 updater.checkForUpdates = async () => { checks++; };
 updater.quitAndInstall = () => { installs++; };
 const timers = [];
 const context = {console: {log() {}, error() {}}, Buffer, autoUpdater: updater,
  process: { platform: store ? 'win32' : 'darwin', windowsStore: store },
  app: {isPackaged: packaged, getVersion: () => '1.0.8', relaunch: () => relaunches++, quit() {}},
  BrowserWindow: {getAllWindows: () => []},
  loadNativeModule: () => missingNative ? {} : {updateFromStore: async (_handle, install) => {checks++; return install ? 'installed' : result;}},
  setTimeout: fn => {timers.push(fn); return {unref() {}};}
 };
 vm.runInNewContext(code, context);
 const state = new context.Updates(); state.setupAutoUpdater();
 return {state, updater, timers, counts: () => ({checks, installs, relaunches})};
}

test('macOS launch checks automatically and downloads quietly', async () => {
 const f = fixture(); assert.equal(f.updater.autoDownload, true); assert.equal(f.updater.autoInstallOnAppQuit, false);
 f.timers[0](); await f.state.updateCheckInFlight;
 assert.equal(f.counts().checks, 1);
 f.updater.emit('update-available', {version: '1.0.9'});
 assert.equal(f.state.getUpdateState().status, 'downloading');
 f.updater.emit('update-downloaded', {version: '1.0.9'});
 assert.equal(f.state.getUpdateState().status, 'ready');
 await f.state.quitAndInstallUpdate(); assert.equal(f.counts().installs, 1);
});
test('never installs before ready or during a live session', async () => {
 const f = fixture(); await assert.rejects(f.state.quitAndInstallUpdate(), /No downloaded/);
 f.updater.emit('update-downloaded', {version: '1.0.9'}); f.state.isMeetingActive = true;
 await assert.rejects(f.state.quitAndInstallUpdate(), /End your current session/);
 assert.equal(f.counts().installs, 0);
});
test('Store path stages packages then installs only on request', async () => {
 const f = fixture({store: true}); await f.state.checkForUpdates();
 assert.equal(f.state.getUpdateState().status, 'ready'); assert.equal(f.counts().relaunches, 0);
 await f.state.quitAndInstallUpdate(); assert.equal(f.counts().relaunches, 1); assert.equal(f.counts().installs, 0);
});
test('Store policy and stale binaries use Store fallback, not GitHub', async () => {
 for (const options of [{result: 'store-required'}, {missingNative: true}]) {
  const f = fixture({store: true, ...options}); await f.state.checkForUpdates();
  assert.equal(f.state.getUpdateState().status, 'store'); assert.equal(f.counts().installs, 0);
 }
 const f = fixture({store: true, result: 'current'}); await f.state.checkForUpdates();
 assert.equal(f.state.getUpdateState().status, 'current');
});
test('development builds do not check or download on launch', async () => {
 const f = fixture({packaged: false}); f.timers[0](); await f.state.checkForUpdates();
 assert.equal(f.counts().checks, 0);
});
test('concurrent checks are coalesced and ready updates are retained', async () => {
 const f = fixture(); let finish;
 f.updater.checkForUpdates = () => new Promise(resolve => {finish = resolve;});
 const first = f.state.checkForUpdates(); const second = f.state.checkForUpdates();
 finish(); await Promise.all([first, second]);
 f.updater.emit('update-downloaded', {version: '1.0.9'}); await f.state.checkForUpdates();
 assert.equal(f.state.getUpdateState().status, 'ready');
});
