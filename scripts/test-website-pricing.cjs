const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

test('website pricing matches billing in both currencies and at mobile widths', async () => {
  const root = path.resolve(__dirname, '../website');
  const server = http.createServer((req, res) => {
    let file = path.join(root, new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1') ? route.continue() : route.abort());
    for (const route of ['/', '/pricing/']) {
      await page.goto(`http://127.0.0.1:${server.address().port}${route}`);
      const section = page.locator('#pricing');
      const cards = section.locator('[data-pricing-category]:visible');
      for (const [currency, expected] of [
        ['INR', [['₹499','₹1,499'],['₹3,499','₹7,999'],['₹19,499']]],
        ['USD', [['$5.99','$16.99'],['$39.99','$89.99'],['$219.99']]],
      ]) {
        await section.getByRole('button', {name: currency, exact: true}).click();
        for (const [i, name] of ['Hourly','Monthly','Yearly'].entries()) {
          await section.getByRole('tab', {name, exact: true}).click();
          assert.deepEqual(await cards.locator('.pricing-price > [data-pricing-price]').allTextContents(), expected[i]);
          assert.equal(await cards.getByRole('link', {name:'Upgrade', exact:true}).count(), expected[i].length);
          assert.equal(await cards.locator('del').count(), expected[i].length);
        }
      }
      await section.getByRole('tab', {name:'Hourly', exact:true}).click();
      await section.getByRole('tab', {name:'Hourly', exact:true}).press('ArrowRight');
      assert.equal(await section.getByRole('tab', {name:'Monthly', exact:true}).getAttribute('aria-selected'), 'true');
      assert.match(await cards.first().innerText(), /200 listening hours per month/);
      await page.setViewportSize({width:390,height:844});
      await section.scrollIntoViewIfNeeded();
      assert.equal(await section.evaluate(el => el.scrollWidth <= el.clientWidth), true);
      await page.setViewportSize({width:1280,height:900});
      await section.screenshot({path:'/tmp/cluegent-website-pricing.png'});
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
