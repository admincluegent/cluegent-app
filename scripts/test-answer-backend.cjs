const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('electron/IntelligenceEngine.ts', 'utf8');
const start = source.indexOf('    async runWhatShouldISay(');
const end = source.indexOf('    /**\n     * MODE 3', start);
function harness(generator) {
  const observed = [];
  const context = { console: { log() {} }, Date,
    prepareTranscriptForWhatToAnswer: () => 'Old finalized question',
    buildTemporalContext: () => ({ previousResponses: [], toneSignals: [] }),
    classifyIntent: async (question, transcript) => { observed.push({ question, transcript }); return { intent: 'question' }; },
    isPlanLimitError: () => false, FREE_PLAN_LIMIT_REACHED_MESSAGE: 'Limit reached' };
  vm.createContext(context);
  vm.runInContext(ts.transpileModule('class Engine {\n' + source.slice(start, end) + '\n}\nglobalThis.Engine = Engine;', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
  const engine = new context.Engine();
  Object.assign(engine, { lastTriggerTime: Date.now(), triggerCooldown: 3000, manualAnswerInProgress: false,
    currentGenerationId: 0, assistCancellationToken: null,
    setMode() {}, emit() {},
    session: { getContext: () => [], getLastInterimInterviewer: () => null, getAssistantResponseHistory: () => [], getLastInterviewerTurn: () => 'Old finalized question', addAssistantMessage() {}, pushUsage() {} },
    whatToAnswerLLM: { generateStream: generator || (async function* (text) { observed.push({ generatedFrom: text }); yield 'Current answer'; }) },
  });
  return { engine, observed };
}
test('manual click bypasses automatic 3-second cooldown and generates from latest partial', async () => {
  const { engine, observed } = harness();
  assert.equal(await engine.runWhatShouldISay('Newest partial question', .8, undefined, undefined, true), 'Current answer');
  assert.equal(observed[0].question, 'Newest partial question');
  assert.equal(observed[0].transcript, 'Newest partial question');
  assert.equal(observed[1].generatedFrom, 'Newest partial question');
  assert.equal(engine.manualAnswerInProgress, false); assert.equal(engine.lastAnswerSucceeded, true);
});
test('automatic triggers retain cooldown', async () => {
  const { engine, observed } = harness();
  assert.equal(await engine.runWhatShouldISay('Automatic question'), null); assert.equal(observed.length, 0);
});
test('transcript auto-trigger cannot replace an in-progress manual request', async () => {
  let release;
  const { engine } = harness(async function* () { await new Promise(r => { release = r; }); yield 'Manual answer'; });
  const pending = engine.runWhatShouldISay('Current partial', .8, undefined, undefined, true);
  await new Promise(r => setImmediate(r)); const id = engine.currentGenerationId;
  engine.lastTriggerTime = 0;
  assert.equal(await engine.runWhatShouldISay('Auto trigger'), null);
  assert.equal(engine.currentGenerationId, id); release(); assert.equal(await pending, 'Manual answer');
});
test('manual request lock is released after provider error', async () => {
  const { engine } = harness(async function* () { throw Error('provider failed'); });
  const result = await engine.runWhatShouldISay('Current partial', .8, undefined, undefined, true);
  assert.ok(result); assert.equal(engine.manualAnswerInProgress, false); assert.equal(engine.lastAnswerSucceeded, false);
});

test('Answer global shortcut targets only the current app window', () => {
  const main = fs.readFileSync('electron/main.ts', 'utf8');
  const a = main.indexOf("} else if (actionId === 'general:process-screenshots') {");
  const b = main.indexOf("} else if (actionId === 'general:reset-cancel')", a);
  const body = main.slice(a + "} else if (actionId === 'general:process-screenshots') {".length, b);
  const sent = [];
  const active = { isDestroyed: () => false, webContents: { send: (event, payload) => sent.push([event, payload.action]) } };
  const hidden = { isDestroyed: () => false, webContents: { send: () => assert.fail('Hidden window must not receive Answer') } };
  const context = { getMainWindow: () => active, BrowserWindow: { getAllWindows: () => [active, hidden] } };
  vm.runInNewContext(body, context); assert.deepEqual(sent, [['global-shortcut', 'processScreenshots']]);
});

test('screenshot-only request cannot infer the old transcript or follow-up intent', async () => {
  let input;
  const { engine, observed } = harness(async function* (text, context, intent, images) {
    input = { text, intent, images }; yield 'Screenshot answer';
  });
  await engine.runWhatShouldISay(undefined, .8, ['/new.png'], undefined, true);
  assert.match(input.text, /Analyze the attached screenshot/);
  assert.ok(!input.text.includes('Old finalized question'));
  assert.equal(input.intent.intent, 'general'); assert.equal(input.images[0], '/new.png');
  assert.equal(observed.length, 0);
});
test('screenshot and pending speech both reach the generation request', async () => {
  let input;
  const { engine } = harness(async function* (text, context, intent, images) { input = { text, images }; yield 'Combined answer'; });
  await engine.runWhatShouldISay('Interviewer: Explain transactions', .8, ['/new.png'], undefined, true);
  assert.equal(input.text, 'Interviewer: Explain transactions'); assert.equal(input.images[0], '/new.png');
});
