const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

test('development and production acquire separate locks; duplicate production is rejected', { timeout: 30000 }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cluegent-profile-test-'));
  const entry = path.join(root, 'main.cjs');
  const profile = path.resolve('dist-electron/electron/startupProfile.js');
  fs.mkdirSync(path.join(root, 'Cluegent'));
  fs.writeFileSync(entry, `const {app}=require('electron');app.setPath('appData',${JSON.stringify(root)});app.setPath('userData',${JSON.stringify(path.join(root,'Cluegent'))});require(${JSON.stringify(profile)});const locked=app.requestSingleInstanceLock();console.log('PROFILE_RESULT '+JSON.stringify({locked,userData:app.getPath('userData')}));if(!locked)app.quit();else{app.whenReady().then(()=>app.dock?.hide());setInterval(()=>{},1000);}`);
  const children=[];
  const launch = mode => new Promise((resolve,reject)=>{
    const env={...process.env,NODE_ENV:mode};delete env.ELECTRON_RUN_AS_NODE;
    const child=spawn(require('electron'),[entry],{env});children.push(child);
    let text='';child.stdout.on('data',data=>{text+=data;const match=text.match(/PROFILE_RESULT (\{[^\n]+\})/);if(match)resolve(JSON.parse(match[1]));});
    child.on('error',reject);child.on('exit',code=>{if(!text.includes('PROFILE_RESULT'))reject(new Error('Electron exited '+code));});
  });
  try {
    const dev=await launch('development');assert.equal(dev.locked,true);assert.equal(dev.userData,path.join(root,'Cluegent-development'));
    const prod=await launch('production');assert.equal(prod.locked,true);assert.equal(prod.userData,path.join(root,'Cluegent'));
    const duplicate=await launch('production');assert.equal(duplicate.locked,false);
  } finally {
    await Promise.all(children.map(child=>new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);child.kill();})));
    fs.rmSync(root,{recursive:true,force:true});
  }
});
