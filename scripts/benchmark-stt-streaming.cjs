// Controlled synthetic speech, streamed in real time. Does not capture user audio.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const {spawnSync} = require('node:child_process');
const WebSocket = require('ws');
const {createAssemblyStreamingAccessToken} = require('../functions/lib/services/assemblyService.js');
const taskDir = fs.mkdtempSync(path.join(os.tmpdir(),'cluegent-stt-latency-'));
function command(name,args) {
  const result=spawnSync(name,args,{encoding:'utf8'});
  if(result.status!==0) throw Error(`${name} failed`);
  return result.stdout;
}
function makeCurrentUrl(token) {
  const source=fs.readFileSync(path.join(__dirname,'../electron/audio/FirebaseManagedSTT.ts'),'utf8');
  const ast=ts.createSourceFile('stt.ts',source,ts.ScriptTarget.Latest,true);
  const constants=ast.statements.filter(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>['ASSEMBLY_STREAMING_BASE_URL','TURN_MIN_SILENCE_MS','TURN_MAX_SILENCE_MS','TURN_END_CONFIDENCE_THRESHOLD'].includes(d.name.getText(ast)))).map(n=>n.getText(ast)).join('\n');
  const cls=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='FirebaseManagedSTT');
  const method=cls.members.find(n=>n.name?.getText(ast)==='buildStreamingUrl').getText(ast);
  const ctx={URL};
  vm.runInNewContext(ts.transpileModule(constants+`\nclass Harness {sampleRate=16000;languageCode='en';resolveSpeechModel(){return 'universal-3-6-pro';}${method}}\nglobalThis.makeUrl=(token)=>new Harness().buildStreamingUrl(token);`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
  return new URL(ctx.makeUrl(token));
}
async function benchmark(apiKey,audio,firstVoice,lastVoice,profile) {
  const token=await createAssemblyStreamingAccessToken({apiKey});
  const url=makeCurrentUrl(token.accessToken);
  if(profile==='previous') {url.searchParams.set('mode','balanced');url.searchParams.set('min_turn_silence','240');url.searchParams.set('max_turn_silence','900');}
  return new Promise((resolve,reject)=>{
    const ws=new WebSocket(url),events=[];
    let started=0,interval,done=false,finishTimer;
    const cleanup=()=>{clearInterval(interval);clearTimeout(timeout);clearTimeout(finishTimer);};
    const fail=message=>{if(done)return;done=true;cleanup();ws.close();reject(Error(message));};
    const finish=()=>{
      if(done)return;done=true;cleanup();ws.send(JSON.stringify({type:'Terminate'}));ws.close();
      const partials=events.filter(e=>!e.final),finals=events.filter(e=>e.final),last=finals.at(-1);
      if(!partials.length||!last) {reject(Error('No partial/final transcripts received'));return;}
      const gaps=partials.slice(1).map((e,i)=>e.at-partials[i].at).sort((a,b)=>a-b);
      resolve({profile,speechDurationMs:Math.round(lastVoice-firstVoice),firstPartialAfterSpeechMs:Math.round(partials[0].at-firstVoice),partialCount:partials.length,medianPartialIntervalMs:Math.round(gaps[Math.floor(gaps.length/2)]||0),finalAfterSpeechMs:Math.round(last.at-lastVoice),confirmedModel:'universal-3-6-pro'});
    };
    const timeout=setTimeout(()=>fail('Streaming sample timed out'),30000);
    ws.on('error',()=>fail('Provider WebSocket failed'));
    ws.on('message',buf=>{
      const msg=JSON.parse(buf.toString());
      if(msg.type==='Begin') {
        if(msg.configuration?.model!=='universal-3-6-pro') {fail('Provider returned the wrong model');return;}
        started=Date.now();let offset=0;
        interval=setInterval(()=>{
          if(offset>=audio.length) {clearInterval(interval);finishTimer=setTimeout(finish,1000);return;}
          let chunk=audio.subarray(offset,offset+1920);
          if(chunk.length<1600)chunk=Buffer.concat([chunk,Buffer.alloc(1600-chunk.length)]);
          ws.send(chunk);offset+=1920;
        },60);
      } else if(msg.type==='Turn'&&msg.transcript?.trim()) events.push({at:Date.now()-started,final:!!msg.end_of_turn});
      else if(msg.error) fail('Provider rejected streaming configuration');
    });
  });
}
(async()=>{
  command('say',['-r','170','-o',path.join(taskDir,'sample.aiff'),'Hello. We are testing live transcription speed. The words should appear while I am speaking, before the sentence finishes.']);
  command('afconvert',['-f','WAVE','-d','LEI16','-r','16000',path.join(taskDir,'sample.aiff'),path.join(taskDir,'sample.wav')]);
  const wav=fs.readFileSync(path.join(taskDir,'sample.wav'));let pcm;
  for(let i=12;i+8<=wav.length;){const n=wav.readUInt32LE(i+4);if(wav.toString('ascii',i,i+4)==='data'){pcm=wav.subarray(i+8,i+8+n);break;}i+=8+n+(n%2);}
  if(!pcm)throw Error('No PCM audio');
  let firstVoice=null,lastVoice=0;
  for(let i=0;i<pcm.length;i+=640){let peak=0;for(let j=i;j+1<Math.min(i+640,pcm.length);j+=2)peak=Math.max(peak,Math.abs(pcm.readInt16LE(j)));if(peak>300){if(firstVoice===null)firstVoice=i/32;lastVoice=Math.min(i+640,pcm.length)/32;}}
  if(firstVoice===null)throw Error('No speech in synthesized audio');
  const audio=Buffer.concat([Buffer.alloc(16000),pcm,Buffer.alloc(64000)]);
  const apiKey=command('firebase',['functions:secrets:access','ASSEMBLY_AI_API_KEY','--project','cluegent-2514d']).trim();
  const results=[];
  for(const profile of ['previous','optimized']){const result=await benchmark(apiKey,audio,firstVoice+500,lastVoice+500,profile);results.push(result);console.log(JSON.stringify(result));}
  const output=process.argv[2];if(output)fs.writeFileSync(output,JSON.stringify({note:'One synthetic sample per profile; timings exclude token/connection startup and are not a production latency guarantee.',results},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>fs.rmSync(taskDir,{recursive:true,force:true}));
