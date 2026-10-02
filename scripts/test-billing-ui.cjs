// Headless integration smoke using the actual billing component and mocked payment APIs.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const esbuild = require('esbuild');
const { chromium } = require('@playwright/test');
test('billing tabs display server prices and checkout verifies its own order', async () => {
  const catalog = [
    ['hour3','hour',49900,'₹499','₹499'], ['hour10','hour',149900,'₹1,499','₹1,499'],
    ['monthly200','month',349900,'₹3,499','₹3,499'], ['quarterly200','quarter',799900,'₹7,999','₹2,666.33'],
    ['annual200','year',1949900,'₹19,499','₹1,624.92'],
  ].map(([planId,interval,amountSubunits,displayPrice,displayMonthlyPrice]) => ({planId,interval,amountSubunits,displayPrice,displayMonthlyPrice,currency:'INR'}));
  catalog.push(...[
    ['hour3','hour',599,'$5.99','$5.99'], ['hour10','hour',1699,'$16.99','$16.99'],
    ['monthly200','month',3999,'$39.99','$39.99'], ['quarterly200','quarter',8999,'$89.99','$30.00'],
    ['annual200','year',21999,'$219.99','$18.33'],
  ].map(([planId,interval,amountSubunits,displayPrice,displayMonthlyPrice]) => ({planId,interval,amountSubunits,displayPrice,displayMonthlyPrice,currency:'USD'})));
  const build = await esbuild.build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import {BillingSettings} from './src/components/settings/BillingSettings'; createRoot(document.getElementById('root')).render(<BillingSettings/>);`, resolveDir:path.resolve(__dirname,'..'), loader:'tsx'}, bundle:true, write:false, format:'iife', plugins:[{
    name:'mock-billing-apis', setup(build) {
      build.onLoad({filter:/\.css$/}, () => ({contents:'',loader:'empty'}));
      build.onResolve({filter:/^@\/(contexts\/auth.context|services\/backendApi)$/}, args => ({path:args.path, namespace:'mocks'}));
      build.onLoad({filter:/.*/,namespace:'mocks'}, args => ({loader:'js', contents:args.path.includes('auth.context')
        ? `const refreshProfile = async () => {}; export const useAuth = () => ({subscription:window.exhaustedHourly ? {plan:'hour3',status:'active',billingInterval:'hour'} : window.legacyPro ? {plan:'pro',status:'active',billingInterval:'month'} : null, planStatus:window.exhaustedHourly ? {plan:'hour3',remaining:{sttSeconds:0}} : window.legacyPro ? {plan:'pro',remaining:{sttSeconds:Number.MAX_SAFE_INTEGER}} : null, refreshProfile});`
        : `const prices = ${JSON.stringify(catalog)};
          export const getLiveBillingPlans = async () => { if(window.failPrices) throw Error('offline'); return {prices}; };
          export const createRazorpayLiveOrder = async (id, interval, currency) => { window.checkoutRequest = {id,interval,currency}; const price = prices.find(p=>p.planId===id && p.currency===currency); return {keyId:'test',orderId:'order-test',amount:price.amountSubunits,currency,name:'Cluegent',description:'test',prefill:{name:'Tester',email:'test@example.com'},notes:{}}; };
          export const verifyRazorpayLiveOrderPayment = async payment => {window.verifiedPayment = payment;};` }));
    }
  }]});
  const cssDir = path.resolve(__dirname,'../dist/assets');
  const cssFile = fs.readdirSync(cssDir).find(name => name.endsWith('.css') && name.startsWith('index-'));
  const css = fs.readFileSync(path.join(cssDir,cssFile));
  const server = http.createServer((req,res) => {
    if (req.url === '/app.js') {res.setHeader('Content-Type','application/javascript'); res.end(build.outputFiles[0].text);}
    else if(req.url === '/app.css') {res.setHeader('Content-Type','text/css');res.end(css);}
    else res.end('<html><head><link rel="stylesheet" href="/app.css"></head><body style="padding:24px"><div id="root"></div><script src="/app.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch({channel:'chrome', headless:true});
  try {
    const page = await browser.newPage({viewport:{width:900,height:900}});
    await page.addInitScript(() => {window.Razorpay = class {
      constructor(options) {this.options=options;window.checkoutOptions=options;}
      open() {this.options.handler({razorpay_order_id:this.options.order_id,razorpay_payment_id:'pay-test',razorpay_signature:'valid'});}
      on() {}
    };});
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByText('₹3,499',{exact:true}).waitFor();
    assert.equal(await page.getByRole('article').count(),2);
    await page.getByText('₹7,999',{exact:true}).waitFor();
    assert.deepEqual(await page.locator('del').allTextContents(), ['₹6,499','₹10,499']);
    await page.getByRole('tab',{name:'Hourly'}).click();
    await page.getByText('₹499',{exact:true}).waitFor();
    await page.getByText('₹1,499',{exact:true}).waitFor();
    assert.deepEqual(await page.locator('del').allTextContents(), ['₹999','₹2,499']);
    assert.equal(await page.getByText('3 hours of live interview help',{exact:true}).count(),1);
    assert.equal(await page.getByText('10 hours of live interview help',{exact:true}).count(),1);
    assert.equal(await page.getByText('30 AI Resume Builder (all templates)',{exact:true}).count(),1);
    assert.equal(await page.getByText('75 AI Resume Builder (all templates)',{exact:true}).count(),1);
    assert.equal(await page.getByText('Watermark-free resumes.',{exact:true}).count(),2);
    await page.getByRole('button',{name:'Upgrade',exact:true}).first().click();
    await page.getByText('Payment verified. Your plan is active.').waitFor();
    const request = await page.evaluate(()=>window.checkoutRequest);
    assert.deepEqual(request,{id:'hour3',interval:'hour',currency:'INR'});
    assert.equal(await page.evaluate(()=>window.checkoutOptions.amount),49900);
    assert.equal(await page.evaluate(()=>window.verifiedPayment.razorpay_order_id),'order-test');
    await page.getByRole('tab',{name:'Yearly',exact:true}).click();
    await page.getByText('₹19,499',{exact:true}).waitFor();
    assert.deepEqual(await page.locator('del').allTextContents(), ['₹42,499']);
    assert.equal(await page.getByRole('article').count(),1);
    assert.equal(await page.getByText('Unlimited AI Resume Builder (all templates)',{exact:true}).count(),1);
    assert.equal(await page.getByText('Unlimited AI requests',{exact:true}).count(),1);
    assert.equal(await page.getByText(/₹1,624.92\/month equivalent/).count(),1);
    assert.equal(await page.getByText('50% off').count(),1);
    assert.equal(await page.getByText('Most Popular',{exact:true}).count(),1);
    const compact = await browser.newPage({viewport:{width:760,height:620}});
    await compact.addInitScript(()=>{window.legacyPro=true;});
    await compact.goto(`http://127.0.0.1:${server.address().port}`);
    await compact.getByText('₹3,499',{exact:true}).waitFor();
    assert.equal(await compact.getByText('Most Popular',{exact:true}).count(),1);
    assert.deepEqual(await compact.getByRole('button',{name:'Upgrade',exact:true}).evaluateAll(buttons=>buttons.map(button=>getComputedStyle(button).backgroundColor)), ['rgb(4, 120, 87)','rgb(37, 99, 235)']);
    await compact.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await compact.locator('.billing-price-sparkle').first().evaluate(el=>getComputedStyle(el,'::after').animationName),'none');
    await compact.emulateMedia({reducedMotion:'no-preference'});
    assert.equal(await compact.locator('.billing-price-sparkle').first().evaluate(el=>getComputedStyle(el,'::after').animationName),'billing-sparkle-sweep');
    assert.equal(await compact.getByText('pro plan',{exact:true}).count(),0);
    assert.equal(await compact.getByText(/listening hours remaining/).count(),0);
    const bounds = await compact.getByRole('article').evaluateAll(cards=>cards.map(card=>{const r=card.getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom};}));
    assert.ok(bounds.every(r=>r.left>=0 && r.right<=760 && r.bottom<=620),`Monthly cards and buttons fit the billing section: ${JSON.stringify(bounds)}`);
    await compact.screenshot({path:'/tmp/cluegent-billing-compact.png',fullPage:true});
    await page.getByRole('button',{name:'USD',exact:true}).click();
    await page.getByText('$219.99',{exact:true}).waitFor();
    assert.deepEqual(await page.locator('del').allTextContents(), ['$480']);
    assert.equal(await page.getByText(/\$18.33\/month equivalent/).count(),1);
    await page.getByRole('tab',{name:'Monthly',exact:true}).click();
    await page.getByText('$39.99',{exact:true}).waitFor();
    await page.getByText('$89.99',{exact:true}).waitFor();
    assert.deepEqual(await page.locator('del').allTextContents(), ['$69','$120']);
    await page.getByRole('tab',{name:'Hourly',exact:true}).click();
    await page.getByText('$5.99',{exact:true}).waitFor();
    await page.getByText('$16.99',{exact:true}).waitFor();
    assert.deepEqual(await page.locator('del').allTextContents(), ['$12','$29']);
    await page.getByRole('button',{name:'Upgrade',exact:true}).first().click();
    await page.waitForFunction(()=>window.checkoutRequest.currency==='USD' && window.verifiedPayment);
    assert.equal(await page.evaluate(()=>window.checkoutOptions.amount),599);
    assert.equal(await page.evaluate(()=>window.checkoutOptions.currency),'USD');
    await page.screenshot({path:'/tmp/cluegent-billing-usd.png',fullPage:true});
    await page.evaluate(()=>{window.failPrices=true;});
    await page.getByRole('tab',{name:'Monthly',exact:true}).click();
    await page.reload(); // fresh state must not enable checkout if catalog fails
    await page.evaluate(()=>{window.failPrices=true;});
    // A separate context sets the failure before React effects run.
    const exhausted = await browser.newPage();
    await exhausted.addInitScript(()=>{
      window.exhaustedHourly=true;
      window.Razorpay = class {
        constructor(options) {this.options=options;window.checkoutOptions=options;}
        open() {this.options.handler({razorpay_order_id:this.options.order_id,razorpay_payment_id:'pay-test',razorpay_signature:'valid'});}
        on() {}
      };
    });
    await exhausted.goto(`http://127.0.0.1:${server.address().port}`);
    await exhausted.getByText('Hours exhausted',{exact:true}).waitFor();
    assert.equal(await exhausted.getByRole('button',{name:'Add hours',exact:true}).first().isEnabled(),true);
    await exhausted.getByRole('button',{name:'Switch to monthly',exact:true}).click();
    await exhausted.getByText('₹3,499',{exact:true}).waitFor();
    assert.equal(await exhausted.getByRole('button',{name:'Upgrade',exact:true}).first().isEnabled(),true);
    await exhausted.getByRole('button',{name:'Buy hourly pack',exact:true}).click();
    await exhausted.getByRole('button',{name:'Add hours',exact:true}).first().click();
    await exhausted.getByText('Payment verified. Your plan is active.').waitFor();
    const offline = await browser.newPage();
    await offline.addInitScript(()=>{window.failPrices=true;});
    await offline.goto(`http://127.0.0.1:${server.address().port}`);
    await offline.getByText('Could not load current prices. Retry before purchasing.').waitFor();
    assert.equal(await offline.getByRole('button',{name:'Upgrade',exact:true}).first().isDisabled(),true);
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
});
