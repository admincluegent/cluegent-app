const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function fixture() {
  let now = 0, tick, nextId = 0;
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('electron/services/HourlyUsageMeter.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code, {exports,require:()=>({randomUUID:()=>`report-${++nextId}`}),Date,
    setInterval:fn=>(tick=fn,1),clearInterval:()=>{},setTimeout:()=>({unref(){}}),console:{warn(){}}});
  return {meter:new exports.HourlyUsageMeter(()=>now),advance:seconds=>{now+=seconds*1000},tick:()=>tick()};
}
test('hourly session charges elapsed time including stopped listening, but not after End session', async () => {
  const f=fixture(), reports=[];
  f.meter.start(async(seconds,id)=>reports.push({seconds,id}));
  f.advance(60); f.tick(); await f.meter.flush();
  // Stop listening changes capture only, not the session meter.
  f.advance(60); f.tick(); await f.meter.flush();
  f.advance(5); f.meter.stop(); await f.meter.flush();
  assert.equal(reports.reduce((sum,r)=>sum+r.seconds,0),125);
  f.advance(100); await f.meter.flush();
  assert.equal(reports.reduce((sum,r)=>sum+r.seconds,0),125);
  f.meter.start(async(seconds,id)=>reports.push({seconds,id}));
  f.advance(10); f.meter.stop(); await f.meter.flush();
  assert.equal(reports.reduce((sum,r)=>sum+r.seconds,0),135);
});
test('failed usage reports retry with the same id; repeated overlay opening does not restart time', async () => {
  const f=fixture(), attempts=[]; let fail=true;
  const report=async(seconds,id)=>{attempts.push({seconds,id});if(fail)throw Error('offline');};
  f.meter.start(report); f.advance(10); f.meter.start(report); f.tick();
  await new Promise(resolve=>setImmediate(resolve));
  fail=false; await f.meter.flush();
  assert.equal(attempts[0].seconds,10);
  assert.equal(attempts[0].id,attempts[1].id);
  f.meter.stop();
});
