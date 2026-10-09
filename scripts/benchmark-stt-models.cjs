// Real-time API comparison using controlled synthetic speech. No microphone capture.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const WebSocket = require('ws');
const { createAssemblyStreamingAccessToken } = require('../functions/lib/services/assemblyService.js');
const models = ['universal-3-5-pro', 'universal-3-6-pro'];
const cases = [
  { id: 'meeting', reference: 'The release is planned for Friday. Please confirm that the microphone permissions are ready. We should test screen sharing before the meeting and send the action items to the engineering team.' },
  { id: 'interview', reference: 'Can you explain how you prevent duplicate payments in a distributed system? Describe how transactions and retries work together. What would happen if the server stopped after charging the customer but before saving the response?' },
  { id: 'followup', reference: 'Yes, that makes sense. No, I meant the monthly subscription, not the annual plan. Could you give a concrete example? Please explain the tradeoffs between latency and accuracy for live meeting captions.' },
];
function command(name,args) {
  const r=spawnSync(name,args,{encoding:'utf8'});
  if(r.status!==0) throw Error(`${name} failed; no credentials logged`);
  return r.stdout;
}
function words(s) { return s.toLowerCase().replace(/(?<=\p{L})[-’'](?=\p{L})/gu,'').replace(/[^\p{L}\p{N}\s]/gu,' ').trim().split(/\s+/).filter(Boolean); }
function score(reference,hypothesis) {
  const a=words(reference), b=words(hypothesis);
  const matrix=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++)matrix[i][0]=i;
  for(let j=0;j<=b.length;j++)matrix[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)matrix[i][j]=Math.min(matrix[i-1][j]+1,matrix[i][j-1]+1,matrix[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  const errors=matrix[a.length][b.length];
  return {referenceWords:a.length,wordErrors:errors,werPercent:100*errors/a.length};
}
assert.equal(score('the cat sat','the dog sat').wordErrors,1);
assert.equal(score('the cat sat','the sat').wordErrors,1);
assert.equal(score('the cat sat','the small cat sat').wordErrors,1);
assert.equal(score('Hello, WORLD!','hello world').wordErrors,0);
assert.equal(score('tradeoffs','trade-offs').wordErrors,0);
function median(values) {const s=[...values].sort((a,b)=>a-b);return s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2;}
function currentUrl(token,model) {
  const source=fs.readFileSync(path.join(__dirname,'../electron/audio/FirebaseManagedSTT.ts'),'utf8');
  const ast=ts.createSourceFile('stt.ts',source,ts.ScriptTarget.Latest,true);
  const constants=ast.statements.filter(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>['ASSEMBLY_STREAMING_BASE_URL','TURN_MIN_SILENCE_MS','TURN_MAX_SILENCE_MS','TURN_END_CONFIDENCE_THRESHOLD'].includes(d.name.getText(ast)))).map(n=>n.getText(ast)).join('\n');
  const cls=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='FirebaseManagedSTT');
  const method=cls.members.find(n=>n.name?.getText(ast)==='buildStreamingUrl').getText(ast);
  const ctx={URL};
  vm.runInNewContext(ts.transpileModule(constants+`\nclass Harness {sampleRate=16000;languageCode='en';resolveSpeechModel(){return 'universal-3-6-pro';}${method}}\nglobalThis.makeUrl=token=>new Harness().buildStreamingUrl(token);`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
  const url=new URL(ctx.makeUrl(token));
  url.searchParams.set('speech_model',model); // All other parameters are identical.
  return url;
}
function sample(dir,item) {
  const aiff=path.join(dir,item.id+'.aiff'),wav=path.join(dir,item.id+'.wav');
  command('say',['-r','185','-o',aiff,item.reference]);
  command('afconvert',['-f','WAVE','-d','LEI16','-r','16000',aiff,wav]);
  const bytes=fs.readFileSync(wav);let pcm;
  for(let i=12;i+8<=bytes.length;){const n=bytes.readUInt32LE(i+4);if(bytes.toString('ascii',i,i+4)==='data'){pcm=bytes.subarray(i+8,i+8+n);break;}i+=8+n+(n%2);}
  if(!pcm)throw Error('No PCM data');
  let first=null,last=0;
  for(let i=0;i<pcm.length;i+=640){let peak=0;for(let j=i;j+1<Math.min(i+640,pcm.length);j+=2)peak=Math.max(peak,Math.abs(pcm.readInt16LE(j)));if(peak>300){first??=i;last=Math.min(i+640,pcm.length);}}
  if(first===null)throw Error('No speech detected');
  return {...item,audio:Buffer.concat([Buffer.alloc(16000),pcm,Buffer.alloc(64000)]),firstByte:first+16000,lastByte:last+16000,speechDurationMs:(last-first)/32};
}
function withNoise(item,snrDb) {
  const audio=Buffer.from(item.audio),signal=[],noise=[];
  let seed=98217,signalPower=0,noisePower=0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed+1)/4294967297;};
  for(let i=item.firstByte;i+1<item.lastByte;i+=2){
    const sample=audio.readInt16LE(i),n=Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());
    signal.push(sample);noise.push(n);signalPower+=sample*sample;noisePower+=n*n;
  }
  const gain=Math.sqrt(signalPower/noisePower/Math.pow(10,snrDb/10));
  const mixed=signal.map((v,i)=>v+noise[i]*gain),peak=mixed.reduce((peak,v)=>Math.max(peak,Math.abs(v)),0);
  const scale=Math.min(1,32000/peak);
  for(let i=0;i<mixed.length;i++)audio.writeInt16LE(Math.round(mixed[i]*scale),item.firstByte+i*2);
  return {...item,id:`interview-noise-${snrDb}db`,audio,snrDb};
}
async function run(apiKey,item,model,repeat) {
  const authorization=await createAssemblyStreamingAccessToken({apiKey});
  const url=currentUrl(authorization.accessToken,model);
  const requestedAt=performance.now();
  return new Promise((resolve,reject)=>{
    const ws=new WebSocket(url),events=[];let timer,finishTimer,done=false,beginAt,firstSpeechSentAt,lastSpeechSentAt,confirmedModel;
    const cleanup=()=>{clearInterval(timer);clearTimeout(finishTimer);clearTimeout(timeout);};
    const fail=message=>{if(done)return;done=true;cleanup();ws.close();reject(Error(message));};
    const finish=()=>{
      if(done)return;
      const finals=new Map();for(const e of events)if(e.final)finals.set(e.turnOrder,e);
      const ordered=[...finals.entries()].sort((a,b)=>a[0]-b[0]).map(e=>e[1]);
      const partials=events.filter(e=>!e.final);
      if(!ordered.length||!partials.length)return fail(`${model}: missing partial or final text`);
      const transcript=ordered.map(e=>e.text).join(' ');
      const gaps=partials.slice(1).map((e,i)=>e.receivedAtMs-partials[i].receivedAtMs);
      const tail=events.filter(e=>e.final&&e.receivedAtMs>=lastSpeechSentAt).at(-1);
      if(!tail)return fail(`${model}: no final turn after speech ended`);
      done=true;cleanup();ws.send(JSON.stringify({type:'Terminate'}));ws.close();
      const metrics={...score(item.reference,transcript),firstPartialMs:partials[0].receivedAtMs-firstSpeechSentAt,medianPartialGapMs:median(gaps),finalAfterSpeechMs:tail.receivedAtMs-lastSpeechSentAt,connectionReadyMs:beginAt-requestedAt,partialCount:partials.length};
      resolve({case:item.id,repeat,requestedModel:model,confirmedModel,reference:item.reference,transcript,speechDurationMs:item.speechDurationMs,metrics,events:events.map(e=>({...e,receivedAtMs:e.receivedAtMs-firstSpeechSentAt}))});
    };
    const timeout=setTimeout(()=>fail(`${model}: timed out`),60000);
    ws.on('error',()=>fail(`${model}: WebSocket connection failed`));
    ws.on('unexpected-response',(_request,response)=>fail(`${model}: upgrade rejected (${response.statusCode})`));
    ws.on('close',()=>{if(!done)fail(`${model}: stream closed before completion`);});
    ws.on('message',buf=>{
      let msg;try{msg=JSON.parse(buf.toString());}catch{return fail(`${model}: invalid message`);}
      if(msg.type==='Begin'){
        confirmedModel=msg.configuration?.model;
        if(confirmedModel!==model)return fail(`${model}: requested model was not confirmed (${confirmedModel??'missing'})`);
        beginAt=performance.now();let offset=0;
        timer=setInterval(()=>{
          if(offset>=item.audio.length){clearInterval(timer);finishTimer=setTimeout(finish,1200);return;}
          const at=performance.now(),end=Math.min(offset+1920,item.audio.length);
          if(firstSpeechSentAt===undefined&&end>item.firstByte)firstSpeechSentAt=at+Math.max(0,item.firstByte-offset)/32;
          if(offset<item.lastByte&&end>=item.lastByte)lastSpeechSentAt=at+(item.lastByte-offset)/32;
          let chunk=item.audio.subarray(offset,end);if(chunk.length<1600)chunk=Buffer.concat([chunk,Buffer.alloc(1600-chunk.length)]);
          ws.send(chunk);offset=end;
        },60);
      }else if(msg.type==='Turn'&&msg.transcript?.trim())events.push({receivedAtMs:performance.now(),final:!!msg.end_of_turn,turnOrder:msg.turn_order,text:msg.transcript.trim()});
      else if(msg.error)fail(`${model}: provider rejected parameters`);
    });
  });
}
module.exports = { score, median, currentUrl };
if (require.main === module) (async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cluegent-stt-comparison-'));
  try {
    const noisy=process.argv.includes('--noise');
    const samples=noisy?[10,0].map(snr=>withNoise(sample(dir,cases[1]),snr)):cases.map(item=>sample(dir,item));
    const apiKey=command('firebase',['functions:secrets:access','ASSEMBLY_AI_API_KEY','--project','cluegent-2514d']).trim();
    const results=[];
    const output=process.argv[2]||'docs/benchmarks/assemblyai-streaming-2026-10-09.json';
    const metadata={createdAt:new Date().toISOString(),method:'Three synthetic English clips, two repetitions per model; identical audio and settings, paired simultaneous real-time streams. WER ignores punctuation/case and joins internally hyphenated or apostrophized words. Speech timestamps use actual packet-send times. Latency excludes token/startup unless labeled connectionReadyMs.',limitations:'Small clean synthetic sample, one local network path. Does not establish real meeting/accent/noise accuracy or microphone-to-screen latency.',settings:{endpoint:'streaming.assemblyai.com',mode:'min_latency',sampleRate:16000,chunkMs:60,minTurnSilence:128,maxTurnSilence:640,continuousPartials:true}};
    if(noisy)metadata.method='Two synthetic English interview clips with deterministic Gaussian noise at 10 dB and 0 dB signal-to-noise ratios; one run per model per condition. Other settings and audio pacing identical to clean runs.';
    for(let repeat=1;repeat<=(noisy?1:2);repeat++)for(const item of samples){
      const paired=await Promise.all(models.map(model=>run(apiKey,item,model,repeat)));
      results.push(...paired);
      for(const r of paired)console.log(JSON.stringify({case:r.case,repeat,model:r.confirmedModel,...r.metrics,transcript:r.transcript}));
      fs.writeFileSync(output,JSON.stringify({...metadata,results},null,2));
    }
    const summary=models.map(model=>{
      const runs=results.filter(r=>r.confirmedModel===model);
      return {model,runs:runs.length,firstPartialMs:median(runs.map(r=>r.metrics.firstPartialMs)),medianPartialGapMs:median(runs.map(r=>r.metrics.medianPartialGapMs)),finalAfterSpeechMs:median(runs.map(r=>r.metrics.finalAfterSpeechMs)),connectionReadyMs:median(runs.map(r=>r.metrics.connectionReadyMs)),wordErrors:runs.reduce((n,r)=>n+r.metrics.wordErrors,0),referenceWords:runs.reduce((n,r)=>n+r.metrics.referenceWords,0)};
    }).map(s=>({...s,werPercent:100*s.wordErrors/s.referenceWords}));
    fs.writeFileSync(output,JSON.stringify({...metadata,summary,results},null,2));
    console.log('SUMMARY '+JSON.stringify(summary));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
