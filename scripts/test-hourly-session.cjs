const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const ast = ts.createSourceFile('App.tsx', fs.readFileSync('src/App.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleStartMeeting') handler = node.initializer.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
const code = ts.transpileModule(`globalThis.startSession = ${handler}`, {compilerOptions: {target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.CommonJS}}).outputText;
function fixture(plan = 'hour3', failPermission = false, remaining = 100) {
  const calls = [];
  const api = Object.fromEntries(['setUndetectable','setRecognitionLanguage','profileSetMode','startMeeting','startListening','endMeeting'].map(name => [name, async () => { calls.push(name); return {success:true}; }]));
  api.setWindowMode = async mode => calls.push(mode);
  api.prepareOverlayPermissions = async () => {calls.push('permissions'); return {microphone: failPermission ? 'denied' : 'granted', screen: 'granted'};};
  const context = {window: {electronAPI:api}, console:{log() {},error() {},warn() {}}, localStorage:{setItem() {}, getItem:() => null, removeItem() {}},
    getPlanStatus:async () => ({planStatus:{plan, remaining:{sttSeconds:remaining}}}),
    buildSessionContext:() => '', SESSION_CONTEXT_KEY:'context', sessionSource:{}, beginLocalMeeting() {}, finishCurrentLocalMeeting() {},
    analytics:{trackMeetingStarted() {}}, setIsSessionSetupOpen() {}, Date};
  vm.runInNewContext(code, context);
  return {calls, start:() => context.startSession({sessionType:'interview', language:'en-US', useResume:false})};
}
test('both hourly products open overlay, prepare permissions then start listening', async () => {
  for (const plan of ['hour3','hour10']) {
    const f = fixture(plan); await f.start();
    assert.ok(f.calls.indexOf('overlay') < f.calls.indexOf('permissions'));
    assert.ok(f.calls.indexOf('permissions') < f.calls.indexOf('startListening'));
    assert.equal(f.calls.filter(call => call === 'startListening').length, 1);
  }
});
test('monthly/yearly and free sessions do not auto-start listening', async () => {
  for (const plan of ['free','monthly200','quarterly200','annual200']) {
    const f = fixture(plan); await f.start(); assert.equal(f.calls.includes('startListening'), false);
  }
});
test('permission denial keeps the overlay open without starting capture', async () => {
  const f = fixture('hour3', true); await f.start();
  assert.equal(f.calls.includes('startListening'), false);
  assert.equal(f.calls.includes('endMeeting'), false);
  assert.equal(f.calls.includes('launcher'), false);
});
test('empty hourly balance prevents opening a session', async () => {
  const f = fixture('hour10', false, 0); await assert.rejects(f.start(), /balance is empty/);
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0], 'launcher');
});
