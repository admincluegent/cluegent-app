const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTiming } = require('./stt-timing-fixture.cjs');
test('profiling is disabled unless explicitly enabled', () => {
  let logs = 0;
  const { SttTiming } = loadTiming({console:{log(){logs++;}}});
  const timing = new SttTiming();
  timing.capture(1920,60); timing.send(1920,60,0)(); timing.summary();
  assert.equal(timing.transcript('test',false,12),undefined);
  assert.equal(logs,0);
});
test('split packets track oldest capture wait, local write completion and transcript intervals', () => {
  let now = 0; const logs = [];
  const { SttTiming } = loadTiming({env:{CLUEGENT_STT_TIMING:'1'},console:{log(line){logs.push(JSON.parse(line.slice('[SttTiming] '.length)));}},
    globals:{require(name){if(name==='perf_hooks')return {performance:{now:()=>now}};return require(name);}}});
  const timing = new SttTiming();
  timing.capture(3200,100); now=60;
  const sent=timing.send(1920,60,9); now=63; sent();
  now=100; timing.capture(1280,40); now=120; timing.send(1920,60,0)();
  now=460; const trace=timing.transcript('universal-3-6-pro',false,25);
  now=900; timing.transcript('universal-3-6-pro',true,30); timing.summary();
  const audio=logs.find(x=>x.stage==='audio_summary');
  const turns=logs.filter(x=>x.stage==='transcript');
  assert.equal(audio.queueWaitMs.max,120); assert.equal(audio.localSocketWriteMs.max,3);
  assert.equal(audio.captureGapMs.max,100); assert.equal(audio.packetAudioMs.max,60);
  assert.equal(turns[0].sinceFirstSendMs,400); assert.equal(turns[1].updateGapMs,440);
  assert.equal(trace.eventId,1); assert.ok(!JSON.stringify(logs).includes('transcriptText'));
  timing.reset(); now=950; timing.capture(1920,60); now=1000; timing.send(1920,60,0)();
  now=1400; timing.transcript('test',false,1); assert.equal(logs.at(-1).sinceFirstSendMs,400);
});

test('development launches enable profiling and explicit zero disables it', () => {
 for (const [env,expected] of [[{NODE_ENV:'development'},true],[{NODE_ENV:'development',CLUEGENT_STT_TIMING:'0'},false],[{NODE_ENV:'production'},false]]) {
  const { SttTiming }=loadTiming({env}); assert.equal(new SttTiming().enabled,expected);
 }
});
