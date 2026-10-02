// Stage only billing-related exports so unrelated test secrets cannot block release.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const selected = new Set([
  'getOrCreateUserProfile', 'getPlanStatus', 'getLiveBillingPlans',
  'createRazorpayLiveOrder', 'verifyRazorpayLiveOrderPayment',
  'verifyRazorpayLivePayment', 'cancelRazorpayLiveSubscription',
  'razorpayLiveWebhook', 'checkUsageBeforeAction', 'trackSttUsage',
  'trackSttUsageHttp', 'createDeepgramStreamToken', 'processAssistantReplyStreamAsia',
]);
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'cluegent-billing-deploy-'));
const target = path.join(stage, 'functions');
fs.mkdirSync(target);
for (const name of ['src', 'package.json', 'package-lock.json', 'tsconfig.json']) {
  fs.cpSync(path.join(root, 'functions', name), path.join(target, name), { recursive: true });
}
fs.symlinkSync(path.join(root, 'functions/node_modules'), path.join(target, 'node_modules'), 'dir');
const index = path.join(target, 'src/index.ts');
const source = ts.createSourceFile(index, fs.readFileSync(index, 'utf8'), ts.ScriptTarget.Latest, true);
const retained = source.statements.filter(statement => {
  if (!ts.isVariableStatement(statement)) return true;
  const exported = statement.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
  const names = statement.declarationList.declarations.map(decl => decl.name.getText(source));
  if (names.some(name => name.startsWith('razorpayTest'))) return false;
  return !exported || names.every(name => selected.has(name));
});
const found = retained.filter(statement => ts.isVariableStatement(statement) && statement.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword))
  .flatMap(statement => statement.declarationList.declarations.map(decl => decl.name.getText(source)));
if (found.length !== selected.size) throw new Error('Billing deployment export list does not match source.');
// Mechanical AST projection; the working tree's index.ts remains unchanged.
fs.writeFileSync(index, ts.createPrinter().printFile(ts.factory.updateSourceFile(source, retained)));
fs.writeFileSync(path.join(stage, 'firebase.json'), JSON.stringify({functions:[{source:'functions',codebase:'default',ignore:['node_modules','.git','*.local','.env','.env.*']}]}, null, 2));
console.log(`Billing-only deployment staged at ${stage}`);
const build = spawnSync(process.execPath, [path.join(root,'functions/node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'], {cwd:target,stdio:'inherit'});
if (build.status !== 0) process.exit(build.status ?? 1);
const deploy = spawnSync('firebase', ['deploy','--project','cluegent-2514d','--only', [...selected].map(name => `functions:${name}`).join(','),'--non-interactive'], {cwd:stage,stdio:'inherit'});
process.exit(deploy.status ?? 1);
