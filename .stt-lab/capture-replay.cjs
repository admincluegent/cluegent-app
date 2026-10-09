// Local diagnostic app only: never changes routing, settings, usage or deployment.
const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');
const {performance}=require('node:perf_hooks');
const WS=require('ws');
const {currentUrl,score}=require('../scripts/benchmark-stt-models.cjs');
const {createAssemblyStreamingAccessToken}=require('../functions/lib/services/assemblyService.js');
const root=path.resolve(__dirname,'..'),output=path.join(root,'docs/benchmarks/assemblyai-capture-replay.json');
const nativeOnly=process.argv.includes('--native-only');
const results=nativeOnly&&fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')).results:[],paints=new Map();let win,key,runSeq=results.length;
const stamp=()=>performance.timeOrigin+performance.now();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const command=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8'});if(r.status!==0)throw Error(cmd+' failed (credentials withheld)');return r.stdout;};
const reference='We are reviewing the payment service and the database design today please explain how you prevent duplicate transactions when a request is retried and how the team should measure latency during a live customer meeting';
function pcm(file){const b=fs.readFileSync(file);for(let i=12;i+8<=b.length;){const n=b.readUInt32LE(i+4);if(b.toString('ascii',i,i+4)==='data')return b.subarray(i+8,i+8+n);i+=8+n+n%2;}throw Error('No WAV PCM');}
function makeSample(dir,paused){const wav=path.join(dir,paused?'paused.wav':'continuous.wav');const aiff=wav+'.aiff';command('say',['-r','210','-o',aiff,reference]);command('afconvert',['-f','WAVE','-d','LEI16','-r','16000',aiff,wav]);let audio=pcm(wav);if(paused){const middle=Math.floor(audio.length/4)*2;audio=Buffer.concat([audio.subarray(0,middle),Buffer.alloc(48000),audio.subarray(middle)]);}return {audio:Buffer.concat([Buffer.alloc(16000),audio,Buffer.alloc(64000)]),wav,style:paused?'paused':'continuous'};}
function quant(values){const a=values.filter(Number.isFinite).sort((x,y)=>x-y);return {n:a.length,p50:a.length?a[Math.floor((a.length-1)*.5)]:null,p95:a.length?a[Math.floor((a.length-1)*.95)]:null,max:a.at(-1)??null};}
ipcMain.on('lab-paint',(_,x)=>{const k=x.streamId+':'+x.eventId;paints.set(k,{...x,measuredAtMs:stamp()});});
async function session({model,chunkMs,sample,channel='injected',capture,playFile,repeat=1}){
 const id='lab-'+ ++runSeq;
 const token=await createAssemblyStreamingAccessToken({apiKey:key});
 const rate=capture?capture.getSampleRate():16000;
 const url=currentUrl(token.accessToken,model);url.searchParams.set('sample_rate',String(rate));
 if(model==='universal-streaming-english'){for(const k of ['mode','interruption_delay','continuous_partials','language_codes'])url.searchParams.delete(k);url.searchParams.set('min_turn_silence','240');url.searchParams.set('max_turn_silence','900');}
 const row={id,model,chunkMs,channel,style:sample?.style??'native-playback',repeat,rate,events:[],frames:[],errors:[],reference:sample?.reference??reference,caseId:sample?.id,accent:sample?.accent,source:sample?.source,wordTiming:sample?.wordTiming};results.push(row);
 let timer,timeout,finishTimer,ws,listener,ended=false,queue=Buffer.alloc(0),spans=[],sentBytes=0,eventSeq=0,speechOnset,firstPartial,confirmed=false,player;
 const bytesPerMs=rate*2/1000,target=Math.ceil(bytesPerMs*chunkMs/2)*2;
 function feed(b,firstSampleAt){queue=Buffer.concat([queue,b]);spans.push({first:sentBytes+queue.length-b.length,last:sentBytes+queue.length,at:firstSampleAt});while(queue.length>=target){const packet=queue.subarray(0,target);queue=queue.subarray(target);const at=stamp();let peak=0;for(let i=0;i+1<packet.length;i+=2)peak=Math.max(peak,Math.abs(packet.readInt16LE(i)));if(speechOnset===undefined&&peak>300){let offset=0;while(offset+1<packet.length&&Math.abs(packet.readInt16LE(offset))<=300)offset+=2;const pos=sentBytes+offset;const span=spans.find(x=>x.first<=pos&&x.last>pos);speechOnset=span?span.at+(pos-span.first)/bytesPerMs:at;}
 row.frames.push({atMs:at,bytes:packet.length,audioMs:packet.length/bytesPerMs,peak,queueWaitMs:at-(spans.find(x=>x.first<=sentBytes&&x.last>sentBytes)?.at??at)});ws.send(packet);sentBytes+=packet.length;}}
 function sourceTime(audioMs){const byte=audioMs*bytesPerMs;const s=spans.find(x=>x.first<=byte&&x.last>byte);return s?s.at+(byte-s.first)/bytesPerMs:null;}
 return await new Promise((resolve)=>{
 function finish(error){if(ended)return;ended=true;clearInterval(timer);clearTimeout(timeout);clearTimeout(finishTimer);if(listener)capture.removeListener('data',listener);if(player&&!player.killed)player.kill();if(error)row.errors.push(error);if(ws?.readyState===WS.OPEN){ws.send(JSON.stringify({type:'Terminate'}));ws.close();}else ws?.terminate();row.confirmed=confirmed;row.speechOnsetAtMs=speechOnset;row.firstPartialMs=firstPartial&&speechOnset?firstPartial-speechOnset:null;
 setTimeout(()=>{for(const e of row.events){const paint=paints.get(id+':'+e.eventId);e.paint=paint??null;e.firstSpeechToPaintMs=paint&&speechOnset?paint.measuredAtMs-speechOnset:null;}
 const gaps=row.events.filter(e=>!e.final).flatMap((e,i,a)=>i&&a[i-1].turnOrder===e.turnOrder?[e.receivedAtMs-a[i-1].receivedAtMs]:[]);row.partialGapMs=quant(gaps);row.firstSpeechToPaintMs=row.events.find(e=>!e.final&&e.paint)?.firstSpeechToPaintMs??null;const finals=new Map();row.events.filter(e=>e.final).forEach(e=>finals.set(e.turnOrder,e.text));row.accuracy=score(row.reference,[...finals.values()].join(' '));fs.writeFileSync(output,JSON.stringify({createdAt:new Date().toISOString(),method:'Controlled local Electron lab using actual RollingTranscript; monotonic epoch timestamps. Injected PCM and native speaker playback are distinct. Native timestamps estimate first sample as callback time minus frame duration, uncertainty includes unmeasured hardware buffering. Double rAF marks paint opportunity, not physical display.',results},null,2));console.log(JSON.stringify({id,model,chunkMs,channel,style:row.style,confirmed,firstPartialMs:row.firstPartialMs,partialGapMs:row.partialGapMs,firstSpeechToPaintMs:row.firstSpeechToPaintMs,wer:row.accuracy.werPercent,errors:row.errors}));resolve(row);},200);}
 ws=new WS(url);timeout=setTimeout(()=>finish('Timeout or missing capture'),capture?24000:45000);
 ws.on('error',()=>finish('WebSocket error'));ws.on('close',()=>{if(!ended)finish('Unexpected socket close');});
 ws.on('message',payload=>{let m;try{m=JSON.parse(payload.toString());}catch{return;}
 if(m.type==='Begin'){if(m.configuration?.model!==model)return finish('Model confirmation mismatch');confirmed=true;
 if(capture){listener=b=>feed(b,stamp()-b.length/bytesPerMs);capture.on('data',listener);player=spawn('afplay',[playFile]);player.on('exit',()=>{finishTimer=setTimeout(()=>finish(),4500);});}
 else{let offset=0,start=stamp();row.sourceClockAtMs=start;timer=setInterval(()=>{if(offset>=sample.audio.length){clearInterval(timer);finishTimer=setTimeout(()=>finish(),1600);return;}const end=Math.min(offset+target,sample.audio.length);let b=sample.audio.subarray(offset,end);if(b.length<target)b=Buffer.concat([b,Buffer.alloc(target-b.length)]);feed(b,start+offset/bytesPerMs);offset=end;},chunkMs);}
 }else if(m.type==='Turn'&&m.transcript?.trim()){const received=stamp(),eventId=++eventSeq;if(!m.end_of_turn)firstPartial??=received;row.events.push({eventId,receivedAtMs:received,text:m.transcript.trim(),final:!!m.end_of_turn,turnOrder:m.turn_order,words:m.words??[]});if(row.events.length<2||row.events.at(-2).text!==m.transcript.trim())win.webContents.send('lab-turn',{text:row.id+' '+m.transcript.trim(),timing:{streamId:id,eventId,receivedAtMs:received,ipcSentAtMs:stamp()}});}
 else if(m.error)finish('Provider rejected parameters');});
 });
}
app.whenReady().then(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cluegent-stt-lab-'));
 try{
 key=command('firebase',['functions:secrets:access','ASSEMBLY_AI_API_KEY','--project','cluegent-2514d']).trim();
 win=new BrowserWindow({width:1100,height:650,webPreferences:{preload:path.join(root,'.stt-lab/preload.cjs'),contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 await win.loadURL('http://127.0.0.1:5180/.stt-lab/index.html');await sleep(2000);
 const definitions=JSON.parse(fs.readFileSync('/tmp/cluegent-stt-native-investigation/capture-speech-samples.json','utf8'));
 const samples=definitions.map(item=>{let bytes=fs.readFileSync(item.file),audio;for(let i=12;i+8<=bytes.length;){let n=bytes.readUInt32LE(i+4);if(bytes.toString('ascii',i,i+4)==='data'){audio=bytes.subarray(i+8,i+8+n);break;}i+=8+n+n%2;}if(!audio)throw Error('Missing PCM');return {...item,style:item.id,audio:Buffer.concat([Buffer.alloc(16000),audio,Buffer.alloc(64000)]),wordTiming:item.wordTiming?.map(x=>({...x,startMs:x.startMs+500,endMs:x.endMs+500}))};});
 for(const sample of samples)await Promise.all(['universal-3-6-pro'].map(model=>session({model,chunkMs:60,sample})));
 }catch(e){console.error('Lab failed:',e.message);}finally{key='';fs.rmSync(dir,{recursive:true,force:true});app.quit();}
});
