// Usage: node scripts/report-stt-latency.cjs ~/Documents/natively_debug.log [output.md]
const fs = require('node:fs');
const lines=fs.readFileSync(process.argv[2], 'utf8').split('\n');
const events=[];
for(const line of lines){const pos=line.indexOf('[SttTiming] ');if(pos<0)continue;try{events.push(JSON.parse(line.slice(pos+12)));}catch{}}
const distribution=values=>{const a=values.filter(Number.isFinite).sort((x,y)=>x-y);return a.length ? `${a[Math.floor((a.length-1)*.5)].toFixed(1)} / ${a[Math.floor((a.length-1)*.95)].toFixed(1)} / ${a.at(-1).toFixed(1)}` : 'No samples';};
const ui=events.filter(x=>x.stage==='ui'), turns=events.filter(x=>x.stage==='transcript');
const audio=events.filter(x=>x.stage==='audio_summary' && x.packetAudioMs?.count);
let out='# AssemblyAI app latency measurements\n\n';
out+=`Audio windows: ${audio.length}; transcript events: ${turns.length}; visible UI samples: ${ui.length}.\n\n`;
out+='| Stage | p50 / p95 / max (ms) |\n|---|---|\n';
for(const [label,key] of [['Audio chunk duration','captureAudioMs'],['Capture callback interval','captureGapMs'],['WebSocket packet duration','packetAudioMs'],['Oldest sample queue wait','queueWaitMs'],['Local socket write completion','localSocketWriteMs']]){
 out+=`| ${label} | ${distribution(audio.map(x=>x[key]?.p50))} |\n`;
}
for(const [label,key] of [['Main dispatch','mainDispatchMs'],['Main → renderer IPC','ipcMs'],['Renderer receive → React commit','commitMs'],['Commit → paint opportunity','paintOpportunityMs'],['Provider event → paint opportunity','providerToPaintMs']])out+=`| ${label} | ${distribution(ui.map(x=>x[key]))} |\n`;
out+=`| Non-final transcript update interval | ${distribution(turns.filter(x=>!x.final).map(x=>x.updateGapMs))} |\n`;
out+='\nAudio rows summarize the per-window medians; they are not pooled per-packet percentiles. See raw audio_summary p95/max for spikes. Transcript intervals include pauses/turn boundaries. Socket write completion is local, not server acknowledgment. Two animation frames mark a paint opportunity, not physical display output. Cross-process spans use wall clocks; UI spans use monotonic performance.now. No speech-start timestamp is captured: network vs provider inference cannot be isolated from these logs. Hidden UI has no paint samples.\n';
if(!ui.length)out+='\nNo complete live UI measurements yet; do not infer a bottleneck from missing samples.\n';
if(process.argv[3])fs.writeFileSync(process.argv[3],out);else process.stdout.write(out);
