const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const usage=require('../functions/lib/utils/usage.js');
function subscription(plan,used,granted) {
 const s=usage.materializeSubscription({plan,status:'active',startedAt:'2026-10-01T00:00:00Z',billingInterval:plan.startsWith('hour')?'hour':'month',...(granted?{sttSecondsLimit:granted,prepaidSecondsGranted:granted}:{})});
 s.usageWindowStart=usage.getListeningWindowStart(s);s.planSttSecondsUsed=used;return s;
}
function status(plan,used,granted) {return usage.buildPlanStatus(subscription(plan,used,granted),usage.materializeUsage({sttSecondsUsed:used}),{sttSecondsUsed:0,promptCount:0,screenshotCount:0});}
for(const [plan,limit] of [['hour3',10800],['hour10',36000]]){
 test(`${plan}: zero balance blocks listening, chat and screenshots even with remaining prompt credits`,()=>{
  const s=status(plan,limit);assert.equal(s.remaining.sttSeconds,0);assert.ok(s.remaining.prompts>0);
  for(const action of ['stt','prompt','screenshot'])assert.throws(()=>usage.assertUsageAvailable(action,s),/Hourly plan limit reached/);
 });
 test(`${plan}: one remaining second permits chat and screenshots`,()=>{
  const s=status(plan,limit-1);for(const action of ['prompt','screenshot'])assert.equal(usage.assertUsageAvailable(action,s).allowed,true);
 });
}
test('top-up restores all hourly actions without resetting already consumed time',()=>{
 const s=status('hour3',10800,21600);assert.equal(s.remaining.sttSeconds,10800);assert.equal(usage.assertUsageAvailable('screenshot',s).allowed,true);
});
test('monthly listening exhaustion does not silently change monthly chat allowance policy',()=>{
 const s=status('monthly200',9999999);assert.equal(s.remaining.sttSeconds,0);assert.equal(usage.isHourlyPlanExhausted(s),false);assert.equal(usage.assertUsageAvailable('prompt',s).allowed,true);
});
const source=fs.readFileSync('functions/src/controllers/assistantController.ts','utf8');
const parsed=ts.createSourceFile('controller.ts',source,ts.ScriptTarget.Latest,true);
const reserve=parsed.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text==='reserveAssistantUsage');
function fixture(plan,used){
 let writes=0,routes=0;const rawSub=subscription(plan,used);
 const context={...usage, Error,Promise,assertSubscriptionActive(){},selectAssistantModelRoute(){routes++;return {provider:'gemini'};},
  FieldValue:{increment:v=>v,serverTimestamp:()=>0},
  db:{doc:path=>path,runTransaction:fn=>fn({get:async path=>({data:()=>path==='subscription'?rawSub:path==='usage'?{sttSecondsUsed:used}:{}}),set:()=>writes++})},
  getUserRefs:()=>({userPath:'user',subscriptionPath:'subscription',usagePath:'usage'})};
 vm.createContext(context);vm.runInContext(ts.transpileModule(reserve.getText(parsed)+'\nglobalThis.reserve = reserveAssistantUsage;',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,context);
 return {reserve:screenshot=>context.reserve({uid:'test',monthKey:'2026-10',hasScreenshot:screenshot,hasGeminiApiKey:true}),counts:()=>({writes,routes})};
}
test('shared backend transaction rejects exhausted text and image requests before routing or charging',async()=>{
 for(const screenshot of [false,true]){const f=fixture('hour3',10800);await assert.rejects(f.reserve(screenshot),/HOURLY_PLAN_LIMIT_EXCEEDED/);assert.deepEqual(f.counts(),{writes:0,routes:0});}
});
test('shared backend transaction permits an hourly request with balance',async()=>{
 const f=fixture('hour3',10799);await f.reserve(true);assert.deepEqual(f.counts(),{writes:1,routes:1});
});
test('local elapsed time blocks actions before a delayed server balance refresh',()=>{
 const ui=fs.readFileSync('src/components/NativelyInterface.tsx','utf8');
 const a=ui.indexOf('    const blockHourlyAssistantAction = () => {'),b=ui.indexOf('    const formatDuration',a);
 const lib={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/listeningBalance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:lib});
 let opened=0;const context={...lib,isHourlyPlan:true,isCluegentSessionActive:true,hourlyBalanceRef:{current:{seconds:10,at:0}},Date:{now:()=>10000},setIsExpanded(){},window:{electronAPI:{openSettingsTab:()=>opened++}}};
 vm.createContext(context);vm.runInContext(ui.slice(a,b)+'\nglobalThis.block = blockHourlyAssistantAction;',context);assert.equal(context.block(),true);assert.equal(opened,1);
 context.hourlyBalanceRef.current.seconds=11;assert.equal(context.block(),false);
});
