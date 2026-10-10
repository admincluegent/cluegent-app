const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = ts.createSourceFile('overlay.tsx', fs.readFileSync('src/components/NativelyInterface.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'handleWhatToSay') handler = node.initializer.getText(source);
  ts.forEachChild(node, visit);
}
visit(source);
assert(handler);
function fixture() {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/answerTranscriptBuffer.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports});
  const buffer = new exports.AnswerTranscriptBuffer();
  let id = 0;
  const calls = [];
  const context = {
    setAnswerNotice() {}, blockHourlyAssistantAction: () => false, isProcessing: false,
    chatSubmissionInProgress: {current:false}, answerTranscriptBufferRef: {current:buffer},
    lastAnswerRequestRef: {current:null}, attachedContextRef: {current:[]}, pendingCaptureRef:{current:null},
    lastScreenshotContextRef:{current:null}, localMeetingIdRef:{current:'meeting'}, streamingResponseTextRef:{current:''},
    createMessageId:()=>`answer-${++id}`, setSelectedResponsePage(){}, setInputValue(){}, setMessages(){}, setIsExpanded(){}, setIsProcessing(){},
    setAttachedContext:()=>{context.attachedContextRef.current=[];}, appendLocalMeetingEvent(){},
    analytics:{trackCommandExecuted(){}}, refersToScreenshot:()=>false,
    getAiSubmitFlow:()=>'', buildAiBehaviorInstruction:()=> 'behavior', buildQuickActionInstruction:()=> 'action',
    combineInstructions:(...args)=>args.filter(Boolean).join('\n'), debugAiSubmitFlow(){},
    window:{electronAPI:{generateWhatToSay:async (...args)=>{calls.push(args);return {answer:'Fresh answer'};}}}
  };
  vm.runInNewContext(ts.transpileModule(`globalThis.answer = ${handler}`, {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText, context);
  return {context, buffer, calls};
}
test('repeated Answer sends the original transcript and image with previous answer context', async()=>{
  const {context:c, buffer:b, calls} = fixture();
  b.receive('interviewer','Explain transactions?',true);
  c.attachedContextRef.current = [{path:'/original.png'}];
  await c.answer();
  assert.equal(b.snapshot().request,'');
  await c.answer();
  assert.equal(calls[1][0],calls[0][0]);
  assert.deepEqual(calls[1][1],calls[0][1]);
  assert.match(calls[1][2], /PREVIOUS ANSWER TO IMPROVE.*Fresh answer/s);
  assert.match(calls[1][2], /Correct mistakes/);
  assert.match(calls[1][2], /Do not merely paraphrase/);
  assert.match(calls[1][2], /complete, standalone improved answer/);
  c.lastAnswerRequestRef.current.answer = 'Latest improved answer';
  await c.answer();
  assert.equal(calls[2][0],calls[0][0]);
  assert.match(calls[2][2], /PREVIOUS ANSWER TO IMPROVE.*Latest improved answer/s);
  b.receive('interviewer','Explain isolation?',true);
  c.attachedContextRef.current = [{path:'/next.png'}];
  await c.answer();
  assert.equal(calls[3][0],'Interviewer: Explain isolation?');
  assert.equal(calls[3][1][0],'/next.png');
  assert.equal(b.snapshot().request,'');
});
test('repeated Answer preserves speech arriving during the request', async()=>{
  const {context:c,buffer:b}=fixture();
  b.receive('user','Explain React?',true); await c.answer();
  c.window.electronAPI.generateWhatToSay=async()=>{
    b.receive('user','Explain hooks?',true); return {answer:'New answer'};
  };
  await c.answer();
  assert.equal(b.snapshot().request,'You: Explain hooks?');
});
test('repeat Answer honors quota and in-flight guards and clears with the session', async()=>{
  const {context:c,buffer:b,calls}=fixture();
  b.receive('user','Explain React?',true); await c.answer();
  c.blockHourlyAssistantAction=()=>true; await c.answer();
  c.blockHourlyAssistantAction=()=>false; c.chatSubmissionInProgress.current=true; await c.answer();
  c.chatSubmissionInProgress.current=false; c.lastAnswerRequestRef.current=null; await c.answer();
  assert.equal(calls.length,1);
});

test('empty Answer displays guidance without calling the LLM; a later transcript clears it',async()=>{
 const {context:c,buffer:b,calls}=fixture();let notice='';c.setAnswerNotice=value=>notice=value;
 await c.answer();assert.equal(calls.length,0);assert.equal(c.chatSubmissionInProgress.current,false);
 assert.equal(notice,'No speech received yet. Speak, type a question, or attach a screenshot.');
 b.receive('user','Explain React?',true);await c.answer();assert.equal(notice,'');assert.equal(calls.length,1);
});
