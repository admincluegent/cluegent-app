const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('@playwright/test');
const { buildSync } = require('esbuild');
const vm = require('node:vm');

test('mobile timing, dismissal, email/Google signup, retry, redirect and desktop exclusion', async () => {
  const root = path.resolve(__dirname, '../website');
  const server = http.createServer((req, res) => {
    const file = path.join(root, new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'text/css');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const stub = `export const auth={currentUser:{uid:'user'},authStateReady:async()=>{}}; export const functions={};
    export async function loginWithGoogle(){window.flow='google';return auth.currentUser;}
    export async function registerWithEmailPassword(e,p){window.flow=['signup',e,p];return auth.currentUser;}
    export async function loginWithEmailPassword(e,p){window.flow=['signin',e,p];return auth.currentUser;}
    export async function consumeGoogleRedirectResult(){window.flow='redirect';return auth.currentUser;}
    export function getFirebaseAuthErrorMessage(){return 'Invalid credentials';}
    export function httpsCallable(){return async()=>{window.mailCalls=(window.mailCalls||0)+1;if(window.failMail)throw Error('mail');return {data:{sent:true}}};}`;
  async function page(mobile = true, pending = false) {
    const p = await browser.newPage({ viewport:{width:mobile?390:1200,height:844}, userAgent:mobile?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)':'Desktop', isMobile:mobile });
    await p.route('**/signup-auth.js', r => r.fulfill({contentType:'text/javascript',body:stub}));
    await p.route(`${origin}/fixture`, r => r.fulfill({contentType:'text/html',body:`<button id="previous">Previous</button><a href="https://apps.microsoft.com/detail/9NXWZPN07THN">Try free</a><script type="module" src="/mobile-signup.js"></script>`}));
    if (pending) await p.addInitScript(()=>sessionStorage.setItem('cluegent-signup-pending','1'));
    await p.clock.install(); await p.clock.pauseAt(new Date()); await p.goto(`${origin}/fixture`);
    if (mobile) await p.locator('.mobile-signup-cta').waitFor({state:'attached'});
    return p;
  }
  try {
    const p = await page();
    await p.clock.runFor(4999); assert.equal(await p.locator('dialog').evaluate(d=>d.open),false);
    await p.clock.runFor(1); assert.equal(await p.locator('dialog').evaluate(d=>d.open),true);
    assert.equal(await p.locator('dialog').evaluate(d=>d.scrollWidth<=d.clientWidth),true);
    await p.getByRole('button',{name:'Close signup'}).click();
    await p.clock.runFor(10000); assert.equal(await p.locator('dialog').evaluate(d=>d.open),false);
    await p.getByRole('button',{name:'Try Cluegent Free',exact:true}).click();
    await p.getByLabel('Email address').fill('test@example.com'); await p.getByLabel('Password',{exact:true}).fill('secret123');
    await p.evaluate(()=>window.failMail=true);
    await p.locator('form button').click();
    await p.getByRole('button',{name:'Retry sending download email'}).waitFor();
    assert.deepEqual(await p.evaluate(()=>window.flow),['signup','test@example.com','secret123']);
    assert.match(await p.locator('[role=status]').innerText(), /couldn’t send/);
    await p.evaluate(()=>window.failMail=false); await p.getByRole('button',{name:'Retry sending download email'}).click();
    await p.getByText('Check your email to download Cluegent free on your computer.',{exact:true}).waitFor();
    const g = await page(); await g.locator('.mobile-signup-cta').click(); await g.getByRole('button',{name:'Continue with Google'}).click();
    await g.getByText('Check your email to download Cluegent free on your computer.',{exact:true}).waitFor(); assert.equal(await g.evaluate(()=>window.flow),'google');
    const s = await page(); await s.locator('.mobile-signup-cta').click(); await s.getByRole('button',{name:'Already have an account? Sign in'}).click();
    await s.getByLabel('Email address').fill('old@example.com'); await s.getByLabel('Password',{exact:true}).fill('secret123'); await s.locator('form button').click();
    await s.getByText('Check your email to download Cluegent free on your computer.',{exact:true}).waitFor(); assert.equal((await s.evaluate(()=>window.flow))[0],'signin');
    const r = await page(true,true); await r.getByText('Check your email to download Cluegent free on your computer.',{exact:true}).waitFor(); assert.equal(await r.evaluate(()=>window.flow),'redirect');
    const d = await page(false); await d.clock.runFor(10000); assert.equal(await d.locator('dialog').count(),0);
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
});

test('download email uses trusted account, deduplicates and releases failed sends', async () => {
  const code = buildSync({entryPoints:[path.resolve(__dirname,'../functions/src/controllers/downloadEmailController.ts')],bundle:true,write:false,platform:'node',format:'cjs',external:['firebase-functions/v2/https','firebase-admin/firestore','../utils/auth.js']}).outputFiles[0].text;
  const records = new Map(); let sends=0, fail=false, payload;
  const ref={set:async data=>records.set('email',{...records.get('email'),...data})};
  const auth={requireAuth:r=>{if(!r.auth)throw Error('unauthenticated');return {uid:'trusted'}},adminAuth:{getUser:async()=>({uid:'trusted',email:'trusted@example.com'})},db:{collection:()=>({doc:()=>ref}),runTransaction:async cb=>cb({get:async()=>({data:()=>records.get('email')}),set:(_,d)=>records.set('email',{...records.get('email'),...d})})}};
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,console,AbortSignal,fetch:async(_,options)=>{sends++;payload=JSON.parse(options.body);return {ok:!fail,status:503,json:async()=>({id:'mail-id'})}},require:name=>name.includes('utils/auth')?auth:name==='firebase-admin/firestore'?{FieldValue:{serverTimestamp:()=>1}}:name==='firebase-functions/v2/https'?{HttpsError:class extends Error{constructor(c,m){super(m);this.code=c}}}:require(name)});
  const send=module.exports.sendDesktopDownloadEmailController;
  await assert.rejects(()=>send({},'key','sender'));
  await send({auth:{uid:'trusted'},data:{email:'attacker@example.com'}},'key','sender');
  assert.deepEqual(payload.to,['trusted@example.com']); assert.match(payload.text,/Windows: https:\/\/apps.microsoft.com/); assert.match(payload.text,/Mac \(Apple Silicon/); assert.equal(payload.subject,'Your Cluegent download links + quick start guide'); assert.match(payload.html,/cid:apple-download/); assert.match(payload.html,/4\. Make answers relevant to you/); assert.equal(payload.attachments.length,2); assert.match(payload.text,/Start Listening/);
  await send({auth:{}},'key','sender'); assert.equal(sends,1);
  records.clear();fail=true; await assert.rejects(()=>send({auth:{}},'key','sender'));assert.equal(records.get('email').leaseUntil,0);
  fail=false;await send({auth:{}},'key','sender');assert.equal(sends,3);
});
