const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
const {EventEmitter}=require('events');
function load(file, overrides={}) {
 const exports={};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,console,process:{platform:'darwin'},setTimeout,clearTimeout,require:n=>overrides[n]||require(n)});return exports;
}
test('concurrent permission requests share prompts and retry after denial',async()=>{
 let mic='not-determined',screen='not-determined',micRequests=0,screenRequests=0;let respond;
 const p=load('electron/services/OverlayPermissions.ts',{electron:{systemPreferences:{getMediaAccessStatus:n=>n==='microphone'?mic:screen,askForMediaAccess:()=>{micRequests++;return new Promise(r=>respond=r);}},desktopCapturer:{getSources:async()=>{screenRequests++;screen='denied';return [];}}}});
 const a=p.prepareOverlayPermissions(),b=p.prepareOverlayPermissions();assert.equal(a,b);assert.equal(micRequests,1);mic='granted';respond(true);
 const denied=await a;assert.equal(denied.screen,'denied');assert.equal(screenRequests,1);
 screen='granted';const approved=await p.prepareOverlayPermissions();assert.equal(approved.microphone,'granted');assert.equal(approved.screen,'granted');assert.equal(micRequests,1);
});
test('capture readiness waits for native acknowledgment',async()=>{
 const {startCaptureReady}=load('electron/audio/captureReady.ts');const c=new EventEmitter();c.start=()=>{};
 let ready=false;const p=startCaptureReady(c).then(()=>ready=true);await Promise.resolve();assert.equal(ready,false);c.emit('start');await p;assert.equal(ready,true);assert.equal(c.listenerCount('error'),0);
});
test('startup error, cancellation and timeout cannot report ready',async()=>{
 const {startCaptureReady}=load('electron/audio/captureReady.ts');
 for(const event of ['error','stop','timeout']){const c=new EventEmitter();c.start=()=>{};const p=startCaptureReady(c,10);const rejection=assert.rejects(p);if(event!=='timeout')c.emit(event,new Error('Denied'));await rejection;assert.equal(c.listenerCount('start'),0);}
});
