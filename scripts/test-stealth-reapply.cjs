const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = ts.createSourceFile('main.ts', fs.readFileSync('electron/main.ts','utf8'), ts.ScriptTarget.Latest,true);
let method;
function visit(node) {
  if(ts.isMethodDeclaration(node) && node.name.getText(source)==='setUndetectable') method=node;
  ts.forEachChild(node,visit);
}
visit(source);
function fixture(focused=true) {
  const calls=[], timers=new Map(); let id=0;
  const protect={setContentProtection:()=>{}};
  const window={isDestroyed:()=>false,isFocused:()=>focused,focus:()=>calls.push('focus')};
  const state={isUndetectable:true,_disguiseTimers:[],_dockDebounceTimer:null,
    windowHelper:{...protect,getMainWindow:()=>window},settingsWindowHelper:{...protect,getSettingsWindow:()=>null},
    modelSelectorWindowHelper:{...protect,getWindow:()=>null},cropperWindowHelper:protect,
    _broadcastToAllWindows:()=>{},hideTray:()=>calls.push('hideTray'),showTray:()=>calls.push('showTray')};
  const code=ts.transpileModule(`globalThis.apply = function(${method.parameters.map(p=>p.getText(source)).join(',')}) ${method.body.getText(source)}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const context={console:{log(){}},process:{platform:'darwin'},SettingsManager:{getInstance:()=>({set(){}})},
    app:{dock:{hide:()=>calls.push('hide'),show:()=>calls.push('show')}},
    setTimeout:fn=>{timers.set(++id,fn);return id},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(code,context);
  return {calls,apply:(...args)=>context.apply.call(state,...args),settle:()=>{const work=[...timers.values()];timers.clear();work.forEach(fn=>fn());}};
}
test('overlay reapply hides Dock even when undetectable was already enabled',()=>{
  const f=fixture();f.apply(true);f.settle();assert.deepEqual(f.calls,[]);
  f.apply(true,true);f.settle();assert.deepEqual(f.calls,['hide','hideTray','focus']);
});
test('reapply does not steal focus and rapid toggles honor final state',()=>{
  const f=fixture(false);f.apply(true,true);f.settle();assert.deepEqual(f.calls,['hide','hideTray']);
  f.calls.length=0;f.apply(true,true);f.apply(false);f.settle();assert.deepEqual(f.calls,['show','showTray']);
});
test('both overlay opening paths reapply native state after showing',()=>{
  const ast=ts.createSourceFile('WindowHelper.ts',fs.readFileSync('electron/WindowHelper.ts','utf8'),ts.ScriptTarget.Latest,true);
  const methods=[];const visit=node=>{if(ts.isMethodDeclaration(node)&&['showOverlay','switchToOverlay'].includes(node.name.getText(ast)))methods.push(node.body.getText(ast));ts.forEachChild(node,visit)};visit(ast);
  assert.equal(methods.length,2);
  for(const body of methods)assert.ok(body.lastIndexOf('setUndetectable(true, true)')>body.lastIndexOf('showInactive()'));
});
test('macOS workspace setup preserves hidden process type across auxiliary windows',()=>{
  for(const name of ['WindowHelper','SettingsWindowHelper','ModelSelectorWindowHelper','CropperWindowHelper']) {
    const code=fs.readFileSync(`electron/${name}.ts`,'utf8');
    const calls=code.split('\n').filter(line=>line.includes('.setVisibleOnAllWorkspaces('));
    assert.ok(calls.length>0);
    for(const call of calls)assert.ok(call.includes('skipTransformProcessType: !app.dock.isVisible()'),name);
  }
  const code=fs.readFileSync('electron/WindowHelper.ts','utf8');
  assert.ok(code.includes("inactive || (process.platform === 'darwin' && this.appState.getUndetectable())"));
});
