const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function loadMethod(path, name, globals) {
 const source = ts.createSourceFile(path, fs.readFileSync(path,'utf8'), ts.ScriptTarget.Latest, true);
 const cls = source.statements.find(ts.isClassDeclaration);
 const method = cls.members.find(m => m.name?.getText(source) === name);
 const ctx = { console: { log() {}, warn() {}, error() {} }, ...globals }; vm.createContext(ctx);
 vm.runInContext(ts.transpileModule(`class Harness { ${method.getText(source)} }\nglobalThis.Harness = Harness;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, ctx);
 return new ctx.Harness();
}
test('screenshot prompt passes image and current questions without previous answer contamination', async () => {
 let payload;
 const helper = loadMethod('electron/llm/WhatToAnswerLLM.ts','generateStream', {
  FAST_LIVE_COPILOT_SYSTEM_PROMPT:'system',
  LocalProfileManager: { getInstance: () => ({buildContextForRequest:()=>({shouldInject:false})}) },
 });
 helper.llmHelper={streamChat:async function* (message,images) { payload={message,images}; yield 'Image answer'; }};
 for await(const _ of helper.generateStream('Analyze the screenshot', {hasRecentResponses:true,previousResponses:['OLD REACT ANSWER']}, {intent:'general',answerShape:'Read image'}, ['/new.png'])) {}
 assert.equal(payload.images[0],'/new.png'); assert.match(payload.message,/Analyze the screenshot/); assert.ok(!payload.message.includes('OLD REACT ANSWER'));
});
test('image read failure stops before network submission instead of downgrading to text', async () => {
 let requests=0;
 const helper=loadMethod('electron/LLMHelper.ts','streamWithFirebaseAssistantRequest', {fetch:()=>{requests++;throw Error('must not submit');}});
 helper.getFirebaseSessionToken=()=> 'test-token'; helper.encodeImageForFirebase=async()=>{throw Error('missing image');};
 const stream=helper.streamWithFirebaseAssistantRequest({message:'Analyze screenshot',imagePaths:['/missing.png']});
 await assert.rejects(stream.next(),/Could not read the attached screenshot/); assert.equal(requests,0);
});
