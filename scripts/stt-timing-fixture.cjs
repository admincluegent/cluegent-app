const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
exports.loadTiming = function(options = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('electron/audio/SttTiming.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require, process: { env: options.env || {} },
    console: options.console || { log() {} }, Date, ...options.globals });
  return exports;
};
