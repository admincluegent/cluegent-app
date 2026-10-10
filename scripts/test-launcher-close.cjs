const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript'),vm=require('node:vm');
const source=ts.createSourceFile('WindowHelper.ts',fs.readFileSync('electron/WindowHelper.ts','utf8'),ts.ScriptTarget.Latest,true);
const handlers={};
function visit(node){
 if(ts.isCallExpression(node)&&node.expression.getText(source).endsWith('.on')&&node.arguments[0]?.text==='close'){
  const target=node.expression.getText(source);if(target==='this.launcherWindow.on'||target==='this.overlayWindow.on')handlers[target]=node.arguments[1].getText(source);
 }
 ts.forEachChild(node,visit);
}
visit(source);
function fixture(platform,active,quitting=false){
 let quits=0,hides=0,prevented=0;
 const state={appState:{isQuitting:()=>quitting,setQuitting:value=>quitting=value,getIsMeetingActive:()=>active},launcherWindow:{hide:()=>hides++},overlayWindow:{isVisible:()=>true},isWindowVisible:true};
 const context={process:{platform},app:{quit:()=>quits++}};
 vm.runInNewContext(ts.transpileModule(`globalThis.launcher=function(){return ${handlers['this.launcherWindow.on']}};globalThis.overlay=function(){return ${handlers['this.overlayWindow.on']}};`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,context);
 const event={preventDefault:()=>prevented++};
 return {close:()=>context.launcher.call(state)(event),closeOverlay:()=>context.overlay.call(state)(event),counts:()=>({quits,hides,prevented,quitting})};
}
test('macOS launcher close exits whether idle or a meeting is active; repeated close does not recurse',()=>{
 for(const active of [false,true]){const f=fixture('darwin',active);f.close();f.close();assert.deepEqual(f.counts(),{quits:1,hides:0,prevented:0,quitting:true});}
});
test('visible overlay cannot block app shutdown',()=>{const f=fixture('darwin',true,true);f.closeOverlay();assert.equal(f.counts().prevented,0);});
test('Windows active meeting still hides launcher, while idle close exits',()=>{const active=fixture('win32',true);active.close();assert.equal(active.counts().hides,1);assert.equal(active.counts().quits,0);const idle=fixture('win32',false);idle.close();assert.equal(idle.counts().quits,1);});
