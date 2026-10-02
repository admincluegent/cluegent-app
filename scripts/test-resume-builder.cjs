const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildSync, build } = require('esbuild');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cluegent-resume-test-'));
const sample = { name: 'Asha Kumar', headline: 'Software Engineer', contact: 'asha@example.com | Bengaluru', summary: 'Engineer building accessible tools and reliable systems.', sections: [{ title: 'Experience', items: ['Engineer · Example Ltd · 2022–2026\nBuilt customer-facing tools and maintained production services.'] }, { title: 'Education', items: ['B.Tech · Example University · 2022'] }, { title: 'Skills', items: ['TypeScript, React, Node.js'] }] };

(async () => {
  buildSync({ entryPoints: [path.join(root, 'shared/resume.ts')], outfile: path.join(temp, 'resume.cjs'), platform: 'node', format: 'cjs' });
  const { validateResume, parseResumeReply, renderResumeHtml, RESUME_TEMPLATES } = require(path.join(temp, 'resume.cjs'));
  assert.deepEqual(parseResumeReply('```json\n' + JSON.stringify(sample) + '\n```'), sample);
  assert.throws(() => parseResumeReply('{"name":'));
  assert.throws(() => validateResume({ ...sample, sections: [{ title: 'Bad', items: [123] }] }));
  assert.throws(() => validateResume({ ...sample, summary: 'x'.repeat(2501) }));
  assert.throws(() => renderResumeHtml(sample, 'unknown', '#2563eb'));
  assert.throws(() => renderResumeHtml(sample, 'classic', 'red; background:url(https://example.com)'));
  const escaped = renderResumeHtml({ ...sample, name: '<script>alert(1)</script>' }, 'classic', '#2563eb');
  assert(!escaped.includes('<script>')); assert(escaped.includes('&lt;script&gt;'));
  const browser = await chromium.launch({ headless: true, ...(process.env.RESUME_TEST_BROWSER ? { executablePath: process.env.RESUME_TEST_BROWSER } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 850, height: 1200 } });
    const csp = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/<meta http-equiv="Content-Security-Policy"[\s\S]*?>/)[0];
    const endpoint = 'https://asia-south1-cluegent-2514d.cloudfunctions.net/generateResumeAsia';
    let reachedEndpoint = false;
    await page.route(endpoint, route => { reachedEndpoint = true; return route.fulfill({ status: 401, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: JSON.stringify({ error: { status: 'UNAUTHENTICATED', message: 'Sign in required.' } }) }); });
    await page.setContent(`<html><head>${csp}</head><body></body></html>`);
    const status = await page.evaluate(async endpoint => (await fetch(endpoint, { method: 'POST', body: JSON.stringify({ data: { source: 'Test source' } }) })).status, endpoint);
    assert.equal(status, 401); assert(reachedEndpoint, 'Production CSP must allow the resume endpoint.');
    await page.unroute(endpoint);
    await page.goto('about:blank');
    console.log('PASS: production Content Security Policy permits the resume callable.');
    const { PDFParse } = require('pdf-parse');
    for (const template of RESUME_TEMPLATES) {
      await page.setContent(renderResumeHtml(sample, template, '#2563eb'));
      const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
      const parser = new PDFParse({ data: pdf });
      try { const text = await parser.getText(); assert(text.text.includes(sample.name)); assert(text.text.includes('asha@example.com')); assert.equal(text.total, 1); const screenshot = await parser.getScreenshot({ desiredWidth: 850, imageBuffer: true, imageDataUrl: false }); fs.writeFileSync(path.join(temp, `${template}-pdf.png`), screenshot.pages[0].data); }
      finally { await parser.destroy(); }
      await page.screenshot({ path: path.join(temp, `${template}.png`), fullPage: true });
    }
    // Load the actual packaged Electron module so missing-module regressions are caught.
    const Module = require('node:module');
    const originalLoad = Module._load;
    let selectedImport;
    let selectedExport;
    let destroyed = false;
    const nativePage = await browser.newPage();
    const electronMock = {
      dialog: {
        showOpenDialog: async () => selectedImport ? { canceled: false, filePaths: [selectedImport] } : { canceled: true, filePaths: [] },
        showSaveDialog: async () => selectedExport ? { canceled: false, filePath: selectedExport } : { canceled: true },
      },
      BrowserWindow: class {
        constructor() {
          this.webContents = { setWindowOpenHandler() {}, session: { webRequest: { onBeforeRequest() {} } }, printToPDF: async () => nativePage.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true }) };
        }
        loadURL(url) { return nativePage.goto(url); }
        isDestroyed() { return destroyed; }
        destroy() { destroyed = true; }
      },
    };
    Module._load = function(name, ...args) { return name === 'electron' ? electronMock : originalLoad.call(this, name, ...args); };
    let native;
    try { native = require(path.join(root, 'dist-electron/electron/services/ResumeBuilder.js')); }
    finally { Module._load = originalLoad; }
    assert((await native.importResumeDocument()).cancelled);
    await page.setContent(renderResumeHtml(sample, 'classic', '#2563eb'));
    selectedImport = path.join(temp, 'import.pdf');
    await page.pdf({ path: selectedImport, format: 'A4', printBackground: true, preferCSSPageSize: true });
    const imported = await native.importResumeDocument();
    assert(imported.success, imported.error); assert(imported.document.content.includes(sample.name));
    assert((await native.exportResumePdf({ resume: sample, template: 'modern', color: '#2563eb' })).cancelled);
    selectedExport = path.join(temp, 'native-export.pdf');
    const exported = await native.exportResumePdf({ resume: sample, template: 'modern', color: '#2563eb' });
    assert(exported.success, exported.error); assert(fs.statSync(selectedExport).size > 1000); assert(destroyed);
    await nativePage.close();
    console.log('PASS: compiled desktop module loads, actual PDF import, export save/cancel flow, and print-window cleanup.');
    const long = { ...sample, sections: [{ title: 'Experience', items: Array.from({ length: 30 }, (_, i) => `Role ${i + 1}\n` + 'Built accessible tools and maintained reliable customer systems. '.repeat(6)) }] };
    for (const template of RESUME_TEMPLATES) {
      await page.goto('about:blank');
      await page.setContent(renderResumeHtml(long, template, '#ffffff'));
      const parser = new PDFParse({ data: await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true }) });
      try { const text = await parser.getText(); assert(text.total > 1, `${template} should paginate long content`); for (let i = 1; i <= 30; i++) assert(text.text.includes(`Role ${i}`), `${template} must retain Role ${i}`); }
      finally { await parser.destroy(); }
    }
    const ui = await build({
      stdin: { contents: "import React from 'react'; import {createRoot} from 'react-dom/client'; import {AIResumeBuilder} from './src/components/settings/AIResumeBuilder'; createRoot(document.getElementById('root')).render(<AIResumeBuilder />);", resolveDir: root, loader: 'tsx' }, bundle: true, write: false, format: 'iife',
      plugins: [{ name: 'mock-cloud', setup(builder) {
        builder.onResolve({ filter: /^firebase\/functions$/ }, () => ({ path: 'functions', namespace: 'mock' }));
        builder.onResolve({ filter: /\/contexts\/auth\.context$/ }, () => ({ path: 'context', namespace: 'mock' }));
        builder.onResolve({ filter: /\/firebase$/ }, () => ({ path: 'auth', namespace: 'mock' }));
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: args.path === 'context' ? "export const useAuth=()=>({user:{uid:'test'},subscription:{plan:'monthly200',status:'active'}});" : args.path === 'auth' ? "export const app={}; export const auth={currentUser:{uid:'test'}};" : "export const getFunctions=()=>({}); export const httpsCallable=()=>async (data)=>{ if(data.action==='status') return {data:{success:true,access:window.__resumeAccess||{allowed:true,limit:null,used:0,remaining:null,message:''}}}; window.__source=data.source; return {data:window.__aiResponse}; };", loader: 'js' }));
      } }],
    });
    await page.goto('about:blank');
    await page.setContent('<html><body style="background:#18181b"><div id="root" style="max-width:800px;padding:24px;margin:auto"></div></body></html>');
    const assets = path.join(root, 'dist/assets');
    if (fs.existsSync(assets)) for (const file of fs.readdirSync(assets).filter(f => f.endsWith('.css'))) await page.addStyleTag({ content: fs.readFileSync(path.join(assets, file), 'utf8') });
    await page.evaluate(({ sample }) => {
      window.__aiResponse = { success: true, reply: JSON.stringify(sample) };
      window.electronAPI = {
        resumeBuilderImport: async () => ({ success: true, document: { name: 'Imported.docx', content: 'Asha Kumar, software engineer, B.Tech, React and TypeScript experience.' } }),
        resumeBuilderExport: async input => { window.__export = input; return { success: true }; },
      };
    }, { sample });
    await page.addScriptTag({ content: ui.outputFiles[0].text });
    assert(await page.getByRole('button', { name: 'Generate resume', exact: true }).isDisabled());
    await page.getByRole('button', { name: 'Preview modern template', exact: true }).click();
    await page.getByRole('dialog', { name: 'modern preview' }).waitFor();
    assert(await page.getByText(/Sample content/).isVisible());
    assert.equal(await page.getByRole('dialog').getByRole('button', { name: 'Download PDF', exact: true }).count(), 0);
    assert.equal(await page.frameLocator('iframe[title="Template preview document"]').getByRole('heading', { name: 'Alex Morgan' }).count(), 1);
    await page.getByRole('button', { name: 'Use this template', exact: true }).click();
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'modern', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Upload PDF / DOCX' }).click();
    await page.getByText('Imported.docx').waitFor();
    await page.getByRole('button', { name: 'Generate resume', exact: true }).click();
    await page.getByRole('button', { name: 'Download PDF', exact: true }).waitFor();
    await page.getByRole('button', { name: 'modern', exact: true }).click();
    await page.getByLabel('Custom accent color').fill('#0f766e');
    await page.getByLabel(/^name$/i).fill('Asha Updated');
    await page.getByRole('button', { name: 'Preview professional template', exact: true }).click();
    await page.getByRole('dialog', { name: 'professional preview' }).waitFor();
    assert.equal(await page.frameLocator('iframe[title="Template preview document"]').getByRole('heading', { name: 'Asha Updated' }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'professional', exact: true }).getAttribute('aria-pressed'), 'false');
    await page.getByRole('dialog').getByRole('button', { name: 'Download PDF', exact: true }).click();
    await page.getByRole('dialog').getByRole('status').filter({ hasText: 'PDF saved successfully.' }).waitFor();
    assert.deepEqual(await page.evaluate(() => ({ template: window.__export.template, color: window.__export.color, name: window.__export.resume.name })), { template: 'professional', color: '#0f766e', name: 'Asha Updated' });
    await page.screenshot({ path: path.join(temp, 'preview-modal.png') });
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    await page.getByText('PDF saved successfully.').waitFor();
    assert.deepEqual(await page.evaluate(() => ({ template: window.__export.template, color: window.__export.color, name: window.__export.resume.name })), { template: 'modern', color: '#0f766e', name: 'Asha Updated' });
    assert((await page.evaluate(() => window.__source)).includes('Asha Kumar'));
    assert(await page.locator('iframe[title="Resume preview"]').getAttribute('sandbox') === '');
    await page.screenshot({ path: path.join(temp, 'builder.png'), fullPage: true });
    await page.evaluate(() => { window.__aiResponse = { success: false, message: 'Plan limit reached.' }; });
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Generate resume', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Plan limit reached.' }).waitFor();
    assert.equal(await page.getByLabel(/^name$/i).inputValue(), 'Asha Updated');
    await page.getByRole('button', { name: 'Remove uploaded resume', exact: true }).click();
    const description = 'Asha Kumar, software engineer with React and TypeScript experience. B.Tech, 2022.';
    await page.getByLabel('Describe your experience or add instructions').fill(description);
    await page.evaluate(({ sample }) => { window.__aiResponse = { success: true, reply: JSON.stringify(sample) }; }, { sample });
    await page.getByRole('button', { name: 'Generate resume', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Resume generated.' }).waitFor();
    assert.equal(await page.evaluate(() => window.__source), description);
    await page.evaluate(() => { window.__resumeAccess = { allowed: false, limit: 30, used: 30, remaining: 0, message: 'Your AI resume generation limit has been reached. Please subscribe.' }; window.dispatchEvent(new Event('focus')); });
    await page.getByText(/30 of 30 AI resumes used/).waitFor();
    assert(await page.getByRole('button', { name: 'Generate resume', exact: true }).isDisabled());
    assert(await page.getByRole('button', { name: 'Download PDF', exact: true }).isEnabled());
    await page.evaluate(() => { window.__resumeAccess = { allowed: false, limit: null, used: 0, remaining: null, message: 'Your plan has expired. Please subscribe to use AI Resume Builder.' }; window.dispatchEvent(new Event('focus')); });
    await page.getByText(/Your plan has expired/).waitFor();
    assert(await page.getByRole('button', { name: 'Generate resume', exact: true }).isDisabled());
    await page.evaluate(() => { window.__resumeAccess = { allowed: false, limit: null, used: 0, remaining: null, message: 'Subscribe to use AI Resume Builder. Resume generation is not available on the free trial.' }; window.dispatchEvent(new Event('focus')); });
    await page.getByText(/Subscribe to use AI Resume Builder. Resume generation is not available on the free trial./).waitFor();
    assert(await page.getByRole('button', { name: 'Generate resume', exact: true }).isDisabled());
    console.log('PASS: exhausted/expired access disables generation, shows subscription guidance, and keeps existing PDFs downloadable.');
    console.log('PASS: eye previews work before and after generation; selection is explicit; Escape closes the modal.');
    console.log('PASS: upload, mocked cloud generation, editing, template/color selection, export payload, and failure preserves edits.');
    console.log(`PASS: schema validation, safe HTML, all ${RESUME_TEMPLATES.length} PDF templates, selectable text, and multi-page content.`);
    console.log('Visual QA images:', temp);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
