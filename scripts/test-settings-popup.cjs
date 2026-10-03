const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const esbuild=require('esbuild');
const {chromium}=require('@playwright/test');
test('options popup renders visible controls and Windows shortcuts without clipping',async()=>{
  const bundle=await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import SettingsPopup from './src/components/SettingsPopup';createRoot(document.getElementById('root')).render(<SettingsPopup/>);`,resolveDir:path.resolve(__dirname,'..'),loader:'tsx'},bundle:true,write:false,format:'iife',plugins:[{
    name:'shortcuts',setup(build){build.onResolve({filter:/hooks\/useShortcuts/},()=>({path:'mock',namespace:'mock'}));build.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`export const useShortcuts=()=>({shortcuts:{toggleVisibility:window.testPlatform==='win32'?['Ctrl','\\\\']:['⌘','\\\\'],takeScreenshot:window.testPlatform==='win32'?['Ctrl','Shift','Enter']:['⌘','⇧','Enter']}});`,loader:'js'}));}
  }]});
  const assets=path.resolve(__dirname,'../dist/assets');
  const css=fs.readFileSync(path.join(assets,fs.readdirSync(assets).find(f=>f.startsWith('index-')&&f.endsWith('.css'))));
  const server=http.createServer((req,res)=>{if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text)}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css)}else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/app.js"></script>')}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({channel:'chrome',headless:true}).catch(async error=>{await new Promise(resolve=>server.close(resolve));throw error;});
  try{
    for(const platform of ['darwin','win32']){
      const page=await browser.newPage({viewport:{width:270,height:300}});
      page.setDefaultTimeout(7000);
      page.on('pageerror',error=>console.error('Popup renderer:',error.message));
      await page.addInitScript(platform=>{window.testPlatform=platform;document.addEventListener('DOMContentLoaded',()=>document.documentElement.setAttribute('data-platform',platform));window.electronAPI={profileGetStatus:async()=>({hasProfile:true,profileMode:true}),getUndetectable:async()=>true,setUndetectable:async()=>{},profileSetMode:async()=>{},updateContentDimensions:dimensions=>window.dimensions=dimensions};},platform);
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      const toggle=page.getByRole('button',{name:'Undetectable mode',exact:true});
      await toggle.waitFor();await page.waitForFunction(()=>window.dimensions?.width===270);
      assert.equal(await toggle.getAttribute('aria-pressed'),'true');
      const fits=await page.getByRole('button').evaluateAll(buttons=>buttons.every(button=>{const r=button.getBoundingClientRect();return r.width>=30&&r.left>=0&&r.right<=270&&r.bottom<=300}));
      assert.ok(fits,`${platform} switches fit`);
      const colors=await toggle.evaluate(el=>[getComputedStyle(el).backgroundColor,getComputedStyle(el.firstElementChild).backgroundColor]);
      assert.notEqual(colors[0],colors[1],'on knob contrasts with track');
      await toggle.click();assert.equal(await toggle.getAttribute('aria-pressed'),'false');
      assert.equal(await page.getByRole('button',{name:'Resume context',exact:true}).isVisible(),true);
      assert.ok(await page.getByText('Screenshot',{exact:true}).isVisible());
      await page.close();
    }
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
test('startup reasserts stealth; hidden preloaded popup accepts sizing; auxiliary popup bypasses login layout',()=>{
  const wh=fs.readFileSync('electron/WindowHelper.ts','utf8');
  assert.match(wh,/skipTaskbar: this.contentProtection/);
  assert.match(wh,/setSkipTaskbar\(enable \|\| win === this.overlayWindow\)/);
  assert.match(wh,/this\.switchToLauncher\(\)\s+if \(this\.appState\.getUndetectable\(\)\) this\.appState\.setUndetectable\(true, true\)/);
  const helper=fs.readFileSync('electron/SettingsWindowHelper.ts','utf8');
  const sizing=helper.slice(helper.indexOf('public setWindowDimensions'),helper.indexOf('// Store offsets'));
  assert.ok(!sizing.includes('!win.isVisible()'));
  const main=fs.readFileSync('src/main.tsx','utf8');
  assert.match(main,/isAuxiliaryWindow \? <App \/> : <AuthGate>/);
});
