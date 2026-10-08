const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { getProSttSecondsRemaining, getSttRoute } = require('../functions/lib/config/sttPolicy.js');
const { buildPlanStatus, materializeSubscription, materializeUsage, getListeningWindowStart } = require('../functions/lib/utils/usage.js');

function status(plan, used = 0, start = '2026-10-08T06:00:00.000Z') {
  const sub = materializeSubscription({ plan, startedAt: start, billingInterval: plan.startsWith('hour') ? 'hour' : 'year' });
  sub.usageWindowStart = getListeningWindowStart(sub);
  sub.planSttSecondsUsed = used;
  return buildPlanStatus(sub, materializeUsage({sttSecondsUsed: used}), { sttSecondsUsed: used, promptCount: 0, screenshotCount: 0 });
}

test('trial, 3-hour, 10-hour and subscriptions route at their actual usage boundaries', () => {
  for (const [plan, allowance] of [['free',720],['hour3',10800],['hour10',18000],['monthly200',36000],['quarterly200',36000],['annual200',36000]]) {
    assert.equal(getProSttSecondsRemaining(status(plan)), allowance);
    assert.equal(getSttRoute('en', getProSttSecondsRemaining(status(plan, allowance - 1))).speechModel, 'universal-3-6-pro');
    assert.equal(getSttRoute('en', getProSttSecondsRemaining(status(plan, allowance))).speechModel, 'universal-streaming-english');
    assert.equal(getProSttSecondsRemaining(status(plan, allowance + 10)), 0);
  }
});
test('yearly and quarterly Pro allowance resets on the purchase-date monthly window', () => {
  for (const plan of ['annual200','quarterly200']) {
    const sub = materializeSubscription({ plan, startedAt: '2026-01-31T06:00:00.000Z', billingInterval: plan === 'annual200' ? 'year' : 'quarter', planSttSecondsUsed: 36000, usageWindowStart: 'stale-window' });
    assert.equal(getListeningWindowStart(sub, new Date('2026-02-28T05:59:59Z')), sub.startedAt);
    assert.equal(getListeningWindowStart(sub, new Date('2026-02-28T06:00:00Z')), '2026-02-28T06:00:00.000Z');
    // Stale monthly counter must not consume the current window's Pro allowance.
    assert.equal(getProSttSecondsRemaining(buildPlanStatus(sub, materializeUsage())), 36000);
  }
});
test('trial uses lifetime usage and language fallback preserves supported languages', () => {
  const trial = status('free', 700); trial.usage.sttSecondsUsed = 0;
  assert.equal(getProSttSecondsRemaining(trial), 20);
  assert.equal(getSttRoute('ja',100).speechModel, 'universal-3-6-pro');
  assert.equal(getSttRoute('es',0).speechModel, 'universal-streaming-multilingual');
  for (const lang of ['id','uk','multi']) assert.equal(getSttRoute(lang,100).speechModel, 'whisper-rt');
  assert.equal(getProSttSecondsRemaining(status('plus')),0);
});

function clientFixture() {
  const sockets = [], requests = [];
  let remaining = 20, failUsage = false, stopAtToken = null, stopAtUsage = null, idToken = 'test-token', tokenFailure = null;
  class Socket extends EventEmitter {
    static OPEN = 1;
    constructor(url) { super(); this.url = url; this.readyState = 0; this.sent = []; sockets.push(this); }
    open() { this.readyState = 1; this.emit('open'); }
    send(data) {
      this.sent.push(data);
      if (typeof data === 'string' && JSON.parse(data).type === 'Terminate') queueMicrotask(() => this.close());
    }
    close() { this.readyState = 3; this.emit('close',1000,Buffer.alloc(0)); }
  }
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('electron/audio/FirebaseManagedSTT.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code, {
    exports, require: name => name === 'events' ? { EventEmitter } : name === 'crypto' ? {randomUUID:()=> `receipt-${requests.length}`} : name === 'ws' ? Socket : name.includes('languages') ? {RECOGNITION_LANGUAGES:{'english-us':{iso639:'en'},spanish:{iso639:'es'}}} : {FirebaseSessionManager:{getInstance:()=>({getIdToken:()=> idToken})}},
    Buffer, URL, Date, Promise, process:{env:{}}, console:{log(){},warn(){},error(){}},
    setTimeout:(fn,ms) => ms === 5000 ? 0 : setTimeout(fn,ms), clearTimeout,
    fetch: async (url,opts) => {
      const body = JSON.parse(opts.body); requests.push({url,body});
      if (url === 'token') {
        if (stopAtToken) await stopAtToken;
        if (tokenFailure) return {ok:false,json:async()=>({success:false,code:'STT_LIMIT_EXCEEDED',message:tokenFailure})};
        return {ok:true,json:async()=>({success:true,token:{accessToken:'assembly-token',expiresInSeconds:60},sttRoute:getSttRoute(body.language,remaining),remaining:{sttSecondsRemaining:50000}})};
      }
      if (failUsage) throw Error('offline');
      if (stopAtUsage) await stopAtUsage;
      remaining = 0;
      return {ok:true,json:async()=>({result:{success:true,remaining:{sttSecondsRemaining:50000,proSttSecondsRemaining:0}}})};
    },
  });
  return { client:new exports.FirebaseManagedSTT('token','usage'), sockets, requests, setRemaining:n=>remaining=n, failUsage:()=>failUsage=true, gateToken:p=>stopAtToken=p, gateUsage:p=>stopAtUsage=p, setIdToken:t=>idToken=t, rejectToken:m=>tokenFailure=m };
}
const settle = () => new Promise(resolve=>setTimeout(resolve,20));

test('stop and disable drain captured usage after an in-flight receipt', async () => {
  for (const action of ['stop','disable']) {
    const f=clientFixture(); let release;
    f.gateUsage(new Promise(resolve=>release=resolve));
    f.client.start(); await settle(); f.sockets[0].open();
    f.client.write(Buffer.alloc(320000));
    f.client.write(Buffer.alloc(96000));
    if (action === 'stop') f.client.stop(); else f.client.setUsageReportingEnabled(false);
    release(); await settle();
    const reports=f.requests.filter(r=>r.url==='usage');
    assert.deepEqual(reports.map(r=>r.body.data.durationSeconds),[10,3]);
    assert.notEqual(reports[0].body.data.reportId,reports[1].body.data.reportId);
    assert.equal(f.client.reportedAudioSeconds,13); f.client.stop();
  }
});

test('missing authentication preserves unreported usage for retry', async () => {
  const f=clientFixture(); f.client.sentAudioSeconds=12; f.setIdToken(null);
  await assert.rejects(f.client.flushUsage(true),/Sign in/);
  assert.equal(f.client.reportedAudioSeconds,0);
  const receipt=f.client.pendingUsageReport.id;
  f.setIdToken('test-token'); await f.client.flushUsage(true);
  assert.equal(f.client.reportedAudioSeconds,12);
  assert.equal(f.requests[0].body.data.reportId,receipt);
});

test('a queued model switch cannot reopen a stopped stream', async () => {
  const f=clientFixture(); f.client.start(); await settle(); f.sockets[0].open();
  f.client.setProSecondsRemaining(0); f.client.stop(); await settle();
  assert.equal(f.sockets.length,1); assert.equal(f.client.isActive,false);
});

test('exhausted trial or listening balance stops token retries', async () => {
  for (const message of ['Free trial limit reached. Subscribe to continue using Cluegent.','Listening limit reached. Add hours or wait for your next monthly allowance.']) {
    const f=clientFixture(); f.rejectToken(message); f.client.on('error',()=>{});
    f.client.start(); await settle();
    assert.equal(f.client.isActive,false); assert.equal(f.client.shouldReconnect,false);
    assert.equal(f.client.reconnectTimer,null); assert.equal(f.sockets.length,0);
  }
});

test('backend model reaches socket, confirms on Begin, and final identical text is emitted', async () => {
  const f=clientFixture(), events=[]; f.client.on('transcript', e=>events.push(e)); f.client.start(); await settle();
  const ws=f.sockets[0]; assert.equal(new URL(ws.url).searchParams.get('speech_model'),'universal-3-6-pro');
  assert.equal(new URL(ws.url).searchParams.get('interruption_delay'),'0');
  assert.equal(new URL(ws.url).searchParams.get('mode'),'min_latency');
  assert.equal(new URL(ws.url).searchParams.get('min_turn_silence'),'128');
  assert.equal(new URL(ws.url).searchParams.get('max_turn_silence'),'640');
  assert.equal(new URL(ws.url).searchParams.get('include_partial_turns'),'true');
  ws.open();
  ws.emit('message',Buffer.from(JSON.stringify({type:'Begin',configuration:{model:'universal-3-6-pro'}})));
  for (const final of [false,true,true]) ws.emit('message',Buffer.from(JSON.stringify({type:'Turn',turn_order:0,transcript:'Hello',end_of_turn:final})));
  assert.equal(events.length,2); assert.equal(events[1].isFinal,true); f.client.stop();
});
test('usage exhaustion switches both streams, buffers new audio and never double charges', async () => {
  const billed=clientFixture(), mic=clientFixture(); mic.client.setUsageReportingEnabled(false);
  billed.client.on('stt-allowance',seconds=>{ mic.setRemaining(seconds); mic.client.setProSecondsRemaining(seconds); });
  billed.client.start(); mic.client.start(); await settle();
  billed.sockets[0].open(); mic.sockets[0].open();
  billed.client.write(Buffer.alloc(16000*2*10)); await settle();
  assert.equal(billed.sockets.length,2); assert.equal(mic.sockets.length,2);
  for (const f of [billed,mic]) {
    assert.equal(new URL(f.sockets[1].url).searchParams.get('speech_model'),'universal-streaming-english');
    f.client.write(Buffer.alloc(3200)); // Queued until the replacement socket opens.
    f.sockets[1].open(); assert.ok(f.sockets[1].sent.some(Buffer.isBuffer)); f.client.stop();
  }
  await settle();
  assert.equal(mic.requests.filter(r=>r.url==='usage').length,0);
  assert.equal(billed.requests.filter(r=>r.url==='usage').reduce((n,r)=>n+r.body.data.durationSeconds,0),10);
});
test('failed usage reports retain the premium route and retry the same receipt', async () => {
  const f=clientFixture(); f.client.start(); await settle(); f.sockets[0].open(); f.failUsage();
  f.client.write(Buffer.alloc(320000)); await settle();
  assert.equal(f.sockets.length,1); const first=f.requests.find(r=>r.url==='usage').body.data.reportId;
  await assert.rejects(f.client.flushUsage(true),/offline/);
  assert.equal(f.requests.filter(r=>r.url==='usage').at(-1).body.data.reportId,first); f.client.stop();
});
test('stopping while token request is in flight prevents a late socket from opening', async () => {
  const f=clientFixture(); let resolve; f.gateToken(new Promise(r=>resolve=r)); f.client.start(); f.client.stop(); resolve(); await settle(); assert.equal(f.sockets.length,0);
});
test('monthly refresh upgrades a live fallback stream and invalidates prefetched tokens', async () => {
  const f=clientFixture(); f.setRemaining(0); await f.client.prefetchAccessToken(); f.client.start(); await settle(); f.sockets[0].open();
  f.setRemaining(36000); f.client.setProSecondsRemaining(36000); await settle();
  assert.equal(new URL(f.sockets[1].url).searchParams.get('speech_model'),'universal-3-6-pro'); f.client.stop();
});
test('a mismatched provider model stops the stream rather than silently charging the wrong tier', async () => {
  const f=clientFixture(), errors=[]; f.client.on('error',e=>errors.push(e)); f.client.start(); await settle(); f.sockets[0].open();
  f.sockets[0].emit('message',Buffer.from(JSON.stringify({type:'Begin',configuration:{model:'wrong-model'}})));
  assert.equal(errors.length,1); assert.match(errors[0].message,/wrong-model/); assert.equal(f.client.isActive,false);
});
test('hourly allowance updates switch without reporting audio usage again', async () => {
  const f=clientFixture(); f.client.setUsageReportingEnabled(false); f.client.start(); await settle(); f.sockets[0].open();
  f.setRemaining(0); f.client.setProSecondsRemaining(0); await settle();
  assert.equal(new URL(f.sockets[1].url).searchParams.get('speech_model'),'universal-streaming-english');
  assert.equal(f.requests.filter(r=>r.url==='usage').length,0); f.client.stop();
});
