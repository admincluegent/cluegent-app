const {app}=require('electron');
const fs=require('fs'),path=require('path'),{spawn,spawnSync}=require('child_process'),{performance}=require('perf_hooks');
const lab=__dirname,root='/Users/prithivi/cluegent/cluegent-app',devices=JSON.parse(fs.readFileSync(path.join(lab,'devices.json'))),sleep=ms=>new Promise(r=>setTimeout(r,ms)),at=()=>performance.timeOrigin+performance.now();
const output=[],original=devices.defaultOutput;
function wav(p,pcm,rate){let b=Buffer.alloc(44);b.write('RIFF');b.writeUInt32LE(pcm.length+36,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(pcm.length,40);fs.writeFileSync(p,Buffer.concat([b,pcm]));}
function pcm(p){let b=fs.readFileSync(p);for(let i=12;i+8<=b.length;){let n=b.readUInt32LE(i+4);if(b.toString('ascii',i,i+4)==='data')return b.subarray(i+8,i+8+n);i+=8+n+n%2;}}
function cmd(c,a){let r=spawnSync(c,a,{encoding:'utf8'});if(r.status)throw Error(c+' failed');return r.stdout;}
app.whenReady().then(async()=>{try{
 cmd('say',['-r','180','-o',path.join(lab,'phrase.aiff'),'Can you explain how database transactions prevent duplicate payments?']);cmd('afconvert',['-f','WAVE','-d','LEI16',path.join(lab,'phrase.aiff'),path.join(lab,'phrase.wav')]);
 cmd('python3',['-c',`import wave,audioop
p='${lab}/phrase.wav'
with wave.open(p,'rb') as f:r=f.getframerate();a=f.readframes(f.getnframes())
a,_=audioop.ratecv(a,2,1,r,48000,None)
with wave.open(p,'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(48000);f.writeframes(a)`]);
 let tone=Buffer.alloc(48000*2);for(let i=0;i<48000;i++)tone.writeInt16LE(Math.round(8000*Math.sin(2*Math.PI*750*i/48000)),i*2);
 let reference=Buffer.concat([Buffer.alloc(24000),tone,Buffer.alloc(24000),pcm(path.join(lab,'phrase.wav')),Buffer.alloc(48000)]);wav(path.join(lab,'reference.wav'),reference,48000);
 for(const device of devices.devices.filter(d=>d.id===original||d.uid==='BuiltInSpeakerDevice')){
  cmd(path.join(lab,'devices'),['set',String(device.id)]);await sleep(800);
  for(const variant of ['candidate','candidate-bypass']){
   process.env.CLUEGENT_LAB_CHANNEL_POLICY=variant.startsWith('reported')?'reported':'original';process.env.CLUEGENT_LAB_SUPPRESSION=variant.endsWith('bypass')?'bypass':'normal';
   const addon=require(path.join(lab,'candidate.node'));
   const cap=new addon.SystemAudioCapture(device.uid),frames=[],packets=[];let recording=false,error=null,queued=Buffer.alloc(0),packetBytes=0;
   cap.start((err,b)=>{if(err){error=err.message;return;}if(recording&&b?.length){frames.push({atMs:at(),b:Buffer.from(b)});queued=Buffer.concat([queued,b]);while(packetBytes && queued.length>=packetBytes){const packet=queued.subarray(0,packetBytes);let power=0;for(let i=0;i<packet.length;i+=2)power+=packet.readInt16LE(i)**2;packets.push({atMs:at(),bytes:packet.length,rms:Math.sqrt(power/(packet.length/2))});queued=queued.subarray(packetBytes);}}});await sleep(1400);const rate=cap.getSampleRate();packetBytes=Math.round(rate*.060)*2;recording=true;const start=at();
   const player=spawn('afplay',[path.join(lab,'reference.wav')]);let stderr='';player.stderr.on('data',b=>stderr+=b.toString());let code=await new Promise(resolve=>player.on('exit',resolve));const playedMs=at()-start;await sleep(700);recording=false;cap.stop();
   let data=Buffer.concat(frames.map(f=>f.b));let name=device.id+'-'+variant;wav(path.join(lab,name+'.wav'),data,rate);
   const row={device:device.name,deviceId:device.id,variant,rate,frames:frames.length,deliveredAudioMs:data.length/(rate*2)*1000,playedMs,captureWallMs:frames.length?frames.at(-1).atMs-frames[0].atMs:null,playbackExit:code,playbackError:stderr,error,file:path.join(lab,name+'.wav'),packets,frameLog:frames.map(f=>({atMs:f.atMs,bytes:f.b.length}))};output.push(row);fs.writeFileSync(path.join(lab,'candidate-capture-results.json'),JSON.stringify({reference:path.join(lab,'reference.wav'),referenceAudioMs:reference.length/96,output},null,2));console.log(JSON.stringify({...row,frameLog:undefined,packets:undefined}));await sleep(300);
  }
 }
 }catch(e){console.error(e.message);}finally{cmd(path.join(lab,'devices'),['set',String(original)]);app.quit();}});
