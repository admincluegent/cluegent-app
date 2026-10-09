const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/answerTranscriptBuffer.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {exports: exportsObject});
const {AnswerTranscriptBuffer: Buffer} = exportsObject;
test('all unanswered turns are included in chronological order, independent of speaker', () => {
 const b=new Buffer(); b.receive('user','First question?',true); b.receive('interviewer','Second question?',false);
 assert.equal(b.snapshot().request,'You: First question?\nInterviewer: Second question?');
});
test('repeated partials and final replace one turn without duplicates',()=>{
 const b=new Buffer(); b.receive('interviewer','How',false); b.receive('interviewer','How do transactions work',false); b.receive('interviewer','How do transactions work?',true);
 assert.equal(b.snapshot().request,'Interviewer: How do transactions work?');
});
test('speech appended to a submitted partial remains pending after commit',()=>{
 const b=new Buffer(); b.receive('interviewer','Explain transactions',false); const s=b.snapshot();
 b.receive('interviewer','Explain transactions and isolation?',true); b.commit(s);
 assert.equal(b.snapshot().request,'Interviewer: and isolation?'); assert.match(b.snapshot().context,/Explain transactions/);
});
test('late final punctuation does not resend an already answered partial',()=>{
 const b=new Buffer(); b.receive('user','Explain React',false); const s=b.snapshot(); b.receive('user','Explain React?',true); b.commit(s); assert.equal(b.snapshot().request,'');
});
test('substantive provider correction is kept for the next request',()=>{
 const b=new Buffer(); b.receive('user','Explain Redis',false); const s=b.snapshot(); b.receive('user','Explain React',true); b.commit(s); assert.equal(b.snapshot().request,'You: Explain React');
});
test('long unanswered speech is not limited to one turn or discarded by history pruning',()=>{
 const b=new Buffer(); for(let i=0;i<100;i++)b.receive('user',`Question ${i}?`,true);
 const s=b.snapshot(); assert.equal(s.receipts.length,100); b.commit(s); assert.equal(b.snapshot().request,'');
});
test('failed requests leave the snapshot available, and clear resets request/context',()=>{
 const b=new Buffer(); b.receive('user','Question?',true); const failed=b.snapshot(); assert.equal(b.snapshot().request,failed.request); b.clear(); assert.equal(b.snapshot().request,''); assert.equal(b.snapshot().context,'');
});
