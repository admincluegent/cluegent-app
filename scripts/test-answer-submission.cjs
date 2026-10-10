const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('src/components/NativelyInterface.tsx', 'utf8');
const handler = source.slice(source.indexOf('    const handleWhatToSay = async'), source.indexOf('    const handleQuickActionPrompt'));
const pagesExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/responsePages.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: pagesExports });
const bufferExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/answerTranscriptBuffer.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: bufferExports });
const followUpExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/screenshotFollowUp.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports:followUpExports});
function harness(api, attachments = []) {
  const buffer = new bufferExports.AnswerTranscriptBuffer();
  buffer.receive('interviewer', 'Explain idempotency for retries', false);
  const ctx = {
    blockHourlyAssistantAction: () => false, isProcessing: false, chatSubmissionInProgress: { current: false },
    lastAnswerRequestRef: {current:null}, lastScreenshotContextRef: {current:null}, refersToScreenshot:followUpExports.refersToScreenshot, setInputValue() {},
    getLatestRollingTranscript: () => 'Interviewer: OLD question\nYou: OLD reply',
    answerTranscriptBufferRef: { current: buffer },
    transcript: 'Interviewer: Explain idempotency for retries',
    createMessageId: () => 'new-answer',
    selected: 0, messages: [{ id: 'old', role: 'system', text: 'Previous answer' }],
    setSelectedResponsePage: value => { ctx.selected = value; },
    streamingResponseTextRef: { current: 'Previous answer' },
    setMessages: update => { ctx.messages = update(ctx.messages); },
    setIsExpanded() {}, setIsProcessing() {}, analytics: { trackCommandExecuted() {} },
    pendingCaptureRef: { current: null }, attachedContextRef: { current: attachments },
    setAttachedContext() {}, appendLocalMeetingEvent() {}, localMeetingIdRef: { current: null },
    getAiSubmitFlow() {}, combineInstructions: (...v) => v.filter(Boolean).join('\n'),
    buildAiBehaviorInstruction: () => '', buildQuickActionInstruction: () => '', debugAiSubmitFlow() {},
    window: { electronAPI: { generateWhatToSay: (...args) => api(ctx, ...args) } },
  };
  vm.createContext(ctx); vm.runInContext(ts.transpileModule(handler + '\nglobalThis.submit = handleWhatToSay;', {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText, ctx);
  return ctx;
}
test('Answer sends the latest partial without requiring a screenshot; switches before API response', async () => {
  const ctx = harness(async (state, question, images) => {
    assert.equal(question, state.answerTranscriptBufferRef.current.snapshot().request); assert.equal(images, undefined);
    assert.equal(state.selected, null);
    const pages = pagesExports.buildResponsePages(state.messages);
    assert.equal(pages.length, 2); assert.equal(pages[1][0].text, '');
    assert.equal(pages[1][0].isStreaming, true); assert.equal(pages[0][0].text, 'Previous answer');
    return { answer: 'Use an idempotency key' };
  });
  await ctx.submit(); assert.equal(ctx.messages[1].text, 'Use an idempotency key');
  assert.equal(ctx.messages[1].isStreaming, false);
});
test('snapshot stays fixed while speech continues; duplicate clicks submit only once', async () => {
  let finish, calls = 0, question;
  const ctx = harness((_state, q) => { calls++; question = q; return new Promise(resolve => { finish = resolve; }); });
  const first = ctx.submit(); ctx.transcript = 'Next question'; await ctx.submit();
  assert.equal(calls, 1); assert.match(question, /idempotency/);
  finish({ answer: 'Answer' }); await first; assert.equal(ctx.chatSubmissionInProgress.current, false);
});
test('screenshot requests also include current speech', async () => {
  const ctx = harness(async (state, q, images) => { assert.equal(q, state.answerTranscriptBufferRef.current.snapshot().request); assert.equal(images[0], '/shot.png'); return { answer: 'Combined answer' }; }, [{ path: '/shot.png', preview: '' }]);
  await ctx.submit(); assert.equal(ctx.messages.length, 2);
});
test('IPC failure replaces loading on the new page and preserves previous answer', async () => {
  const ctx = harness(async () => { throw Error('offline'); }); await ctx.submit();
  assert.equal(ctx.messages.length, 2); assert.equal(ctx.messages[0].text, 'Previous answer');
  assert.match(ctx.messages[1].text, /offline/); assert.equal(ctx.messages[1].isStreaming, false);
});
test('streamed tokens update the pre-created answer page rather than append another page', async () => {
  const ctx = harness(async () => ({ answer: 'Final' }));
  const start = source.indexOf('        cleanups.push(window.electronAPI.onIntelligenceSuggestedAnswerToken');
  const end = source.indexOf('        cleanups.push(window.electronAPI.onIntelligenceSuggestedAnswer(', start);
  ctx.cleanups = [];
  ctx.window.electronAPI.onIntelligenceSuggestedAnswerToken = fn => { ctx.token = fn; return () => {}; };
  vm.runInContext(ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, ctx);
  ctx.window.electronAPI.generateWhatToSay = async () => { ctx.token({ token: 'Live ' }); ctx.token({ token: 'answer' }); assert.equal(ctx.messages.length, 2); assert.equal(ctx.messages[1].text, 'Live answer'); return { answer: 'Final' }; };
  await ctx.submit(); assert.equal(pagesExports.buildResponsePages(ctx.messages).length, 2);
});

test('a new mic question supersedes old system audio and old assistant context', async () => {
  let requested;
  const ctx = harness(async (_state, q) => { requested = q; return { answer: 'New answer' }; });
  ctx.answerTranscriptBufferRef.current.clear(); ctx.answerTranscriptBufferRef.current.receive('user', 'Explain database transactions', false);
  await ctx.submit(); assert.equal(requested, 'You: Explain database transactions');
  assert.equal(ctx.messages[1].text, 'New answer');
});
test('a new system partial supersedes an old microphone question before React commits', async () => {
  let requested;
  const ctx = harness(async (_state, q) => { requested = q; return { answer: 'New answer' }; });
  ctx.answerTranscriptBufferRef.current.clear(); ctx.answerTranscriptBufferRef.current.receive('interviewer', 'How do you prevent duplicate payments', false);
  await ctx.submit(); assert.equal(requested, 'Interviewer: How do you prevent duplicate payments');
  assert.ok(!requested.includes('OLD'));
});

test('Answer includes both questions and retains speech arriving during generation', async () => {
  let finish, requested;
  const ctx = harness((_state, q) => { requested = q; return new Promise(resolve => { finish = resolve; }); });
  const buffer = ctx.answerTranscriptBufferRef.current;
  buffer.receive('interviewer', 'Explain idempotency for retries', true);
  buffer.receive('interviewer', 'How do transactions work?', true);
  const pending = ctx.submit();
  assert.match(requested, /idempotency/); assert.match(requested, /transactions/);
  buffer.receive('user', 'What about isolation?', false);
  finish({ answer: 'Answers to both questions' }); await pending;
  const next = buffer.snapshot(); assert.equal(next.request, 'You: What about isolation?');
  assert.match(next.context, /idempotency/); assert.match(next.context, /transactions/);
});
test('unsuccessful API result retains unanswered speech for retry', async () => {
  const ctx = harness(async () => ({ answer: null, error: 'offline' }));
  await ctx.submit(); assert.match(ctx.answerTranscriptBufferRef.current.snapshot().request, /idempotency/);
});

test('new screenshot takes priority over an older attached image', async () => {
  let images;
  const ctx = harness(async (_state, q, paths) => { images = paths; return { answer: 'New screenshot answer' }; }, [{ path: '/old.png' }]);
  ctx.pendingCaptureRef.current = { path: '/new.png' }; await ctx.submit();
  assert.equal(images[0], '/new.png');
});
test('screenshot without pending speech still submits an image request', async () => {
  let request;
  const ctx = harness(async (_state, q, images) => { request = { q, images }; return { answer: 'Screenshot answer' }; });
  ctx.answerTranscriptBufferRef.current.clear(); ctx.pendingCaptureRef.current = { path: '/new.png' }; await ctx.submit();
  assert.equal(request.q, undefined); assert.equal(request.images[0], '/new.png');
});

test('spoken screenshot follow-up resends image and previous answer', async () => {
 let sent;
 const ctx=harness(async (_state,q,images,instructions)=>{sent={q,images,instructions};return {answer:'Follow-up answer'};});
 ctx.lastScreenshotContextRef.current={image:{path:'/previous.png'},answer:'Original screenshot solution',recent:true};
 ctx.answerTranscriptBufferRef.current.clear(); ctx.answerTranscriptBufferRef.current.receive('user','Explain the second function',true);
 await ctx.submit(); assert.equal(sent.images[0],'/previous.png'); assert.match(sent.q,/second function/); assert.match(sent.instructions,/Original screenshot solution/);
});
test('typed screenshot follow-up resends image; unrelated question stays text only', async () => {
 let sent;
 const ctx=harness(async (_state,q,images)=>{sent={q,images};return {answer:'Answer'};});
 ctx.lastScreenshotContextRef.current={image:{path:'/previous.png'},answer:'Old answer',recent:true}; ctx.answerTranscriptBufferRef.current.clear();
 await ctx.submit('Explain this code'); assert.equal(sent.images[0],'/previous.png'); assert.equal(sent.q,'Explain this code');
 ctx.answerTranscriptBufferRef.current.receive('user','What is database normalization?',true);
 await ctx.submit(); assert.equal(sent.images,undefined); assert.equal(ctx.lastScreenshotContextRef.current.recent,false);
});
test('failed screenshot follow-up preserves prior image and answer', async () => {
 const ctx=harness(async ()=>({answer:null,error:'offline'})); ctx.lastScreenshotContextRef.current={image:{path:'/previous.png'},answer:'Old answer',recent:true};
 ctx.answerTranscriptBufferRef.current.clear(); await ctx.submit('Explain this code'); assert.equal(ctx.lastScreenshotContextRef.current.answer,'Old answer');
});
test('new successful screenshot replaces old screenshot memory', async () => {
 const ctx=harness(async ()=>({answer:'New screenshot answer'})); ctx.lastScreenshotContextRef.current={image:{path:'/old.png'},answer:'Old answer',recent:true};
 ctx.pendingCaptureRef.current={path:'/new.png'}; await ctx.submit(); assert.equal(ctx.lastScreenshotContextRef.current.image.path,'/new.png');
});

test('exhausted hourly plan blocks requests before creating a response or consuming speech', async () => {
 let calls=0; const ctx=harness(async()=>{calls++;return {answer:'must not generate'};}); ctx.blockHourlyAssistantAction=()=>true;
 await ctx.submit(); assert.equal(calls,0); assert.equal(ctx.messages.length,1); assert.match(ctx.answerTranscriptBufferRef.current.snapshot().request,/idempotency/);
});

test('Answer shortcut matches toolbar transcript submission and retains typed/dictation handling', () => {
 const start=source.indexOf('    const handleAnswerShortcut =');
 const end=source.indexOf('\n    const ',start+10);
 const code=ts.transpileModule(source.slice(start,end)+'\nglobalThis.shortcut = handleAnswerShortcut;', {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 for(const [recording,input,attached,expected] of [[false,'',false,'answer'],[false,'typed question',false,'manual'],[false,'',true,'manual'],[true,'',false,'dictation']]) {
  const calls=[];
  const ctx={isManualRecording:recording,inputValue:input,attachedContextRef:{current:attached?[{path:'/shot.png'}]:[]},
   handleAnswerNow:()=>calls.push('dictation'),handleManualSubmit:()=>calls.push('manual'),handleWhatToSay:()=>calls.push('answer')};
  vm.runInNewContext(code,ctx);ctx.shortcut();assert.deepEqual(calls,[expected]);
 }
});
