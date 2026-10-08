const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const output = {};
let id = 0;
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/liveTranscript.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports: output,require:()=>({createMessageId:()=>String(++id)})});
const {updateLiveTranscript:update,formatLiveTranscript:format}=output;
test('each streaming partial becomes visible immediately and final replaces it without duplication',()=>{
  let turns=update([], 'interviewer', 'Can you',false);
  assert.equal(format(turns),'Interviewer: Can you'); const pendingId=turns[0].id;
  turns=update(turns,'interviewer','Can you explain React',false);
  assert.equal(format(turns),'Interviewer: Can you explain React'); assert.equal(turns[0].id,pendingId);
  turns=update(turns,'interviewer','Can you explain React?',true);
  assert.equal(turns.length,1); assert.equal(turns[0].id,pendingId); assert.equal(format(turns),'Interviewer: Can you explain React?');
});
test('interleaved microphone/system partials remain in their own rows',()=>{
  let turns=update([], 'interviewer','Question',false);
  turns=update(turns,'user','Answer',false); turns=update(turns,'interviewer','Question complete',true);
  turns=update(turns,'user','Answer complete',true);
  assert.equal(turns.length,2); assert.equal(format(turns),'Interviewer: Question complete  |  You: Answer complete');
});
