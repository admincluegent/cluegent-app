const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const exportsObject = {};
const code = ts.transpileModule(fs.readFileSync('src/lib/listeningBalance.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
vm.runInNewContext(code,{exports:exportsObject});
test('hourly countdown starts at purchased balance, decreases and clamps at exhaustion', () => {
  const {remainingListeningSeconds:remaining,formatListeningDuration:format} = exportsObject;
  assert.equal(format(remaining(10800,0)),'3:00:00');
  assert.equal(format(remaining(36000,0)),'10:00:00');
  assert.equal(format(remaining(10800,1)),'2:59:59');
  assert.equal(format(remaining(10800,7200)),'1:00:00');
  assert.equal(format(remaining(10800,10801)),'00:00');
  assert.equal(format(720),'12:00');
});
