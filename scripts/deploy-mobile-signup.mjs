// Deploy this flow only; retain unrelated production Hosting files and functions.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, symlinkSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { Readable } from 'node:stream';
const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const cli = spawnSync('which', ['firebase'], { encoding: 'utf8' });
if (cli.status !== 0) throw new Error('Firebase CLI is required');
const cliRoot = resolve(dirname(realpathSync(cli.stdout.trim())), '../..');
const require = createRequire(join(cliRoot, 'package.json'));
const { requireAuth } = require('./lib/requireAuth.js');
const { getGlobalDefaultAccount } = require('./lib/auth.js');
const { Client } = require('./lib/apiv2.js');
const hosting = require('./lib/hosting/api.js');
const site = 'cluegent-2514d';
await requireAuth({ ...getGlobalDefaultAccount(), project: site, nonInteractive: true });
const client = new Client({ urlPrefix: 'https://firebasehosting.googleapis.com', apiVersion: 'v1beta1', auth: true });
const source = (await hosting.getChannel('-', site, 'live')).release.version;
async function files(version) {
  const result = {}; let pageToken;
  do {
    const response = await client.get(`/${version}/files`, { queryParams: { pageSize: 1000, ...(pageToken ? { pageToken } : {}) } });
    for (const file of response.body.files || []) result[file.path] = file.hash;
    pageToken = response.body.nextPageToken;
  } while (pageToken);
  return result;
}
const production = await files(source.name);
const versionTag = createHash('sha256').update(readFileSync(join(root, 'website/mobile-signup.js'))).digest('hex').slice(0, 12);
const paths = ['/app.js', '/mobile-signup.js', '/mobile-signup.css', '/signup-auth.js'];
const replacements = {}, bodies = new Map();
function addFile(path, bytes) {
  const compressed = gzipSync(bytes), hash = createHash('sha256').update(compressed).digest('hex');
  replacements[path] = hash; bodies.set(hash, compressed);
}
for (const path of paths) {
  let bytes = readFileSync(join(root, 'website', path));
  if (path === '/app.js') {
    const response = await fetch(`https://www.cluegent.com/app.js?mobile-release=${Date.now()}`);
    if (!response.ok) throw new Error('Could not preserve production app.js');
    const existing = await response.text();
    bytes = Buffer.from(existing.replace(/import\('\/mobile-signup\.js'\)\.catch\(error => console\.error\('Mobile signup failed to load', error\)\);/g, ''));
  }
  addFile(path, bytes);
}
// Refresh script URLs in production pages without publishing unrelated local edits.
const htmlPaths = Object.keys(production).filter(path => path.endsWith('.html'));
let nextPage = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (nextPage < htmlPaths.length) {
    const path = htmlPaths[nextPage++];
    const response = await fetch(`https://www.cluegent.com${path}?mobile-release=${Date.now()}`);
    if (!response.ok) throw new Error(`Could not preserve production page: ${path}`);
    const html = await response.text();
    if (!/src=["']\/app\.js(?:\?[^"']*)?["']/.test(html)) continue;
    const updated = html.replace(/<script\b[^>]*src=["']\/mobile-signup\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>\s*/g, '')
      .replace(/(<script\b[^>]*src=["'])\/app\.js(?:\?[^"']*)?(["'][^>]*>)/g,
        `<script type="module" src="/mobile-signup.js?v=${versionTag}"></script>\n$1/app.js?v=mobile-${versionTag}$2`);
    if (updated !== html) { addFile(path, Buffer.from(updated)); paths.push(path); }
  }
}));
console.log(JSON.stringify({ previousVersion: source.name, retainedFiles: Object.keys(production).length, changedFiles: paths.length }));
if (!process.argv.includes('--deploy') && !process.argv.includes('--function-only') && !process.argv.includes('--hosting-only')) process.exit(0);
const secret = spawnSync('firebase', ['functions:secrets:get', 'RESEND_API_KEY', '--project', site, '--non-interactive'], { stdio: 'inherit' });
if (secret.status !== 0) throw new Error('Configure RESEND_API_KEY and a verified sender before deploying');
if (!process.argv.includes('--function-only')) {
  const access = spawnSync('firebase', ['functions:secrets:access', 'RESEND_API_KEY', '--project', site, '--non-interactive'], { encoding: 'utf8' });
  if (access.status !== 0) throw new Error('Could not access email provider credential');
  const response = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${access.stdout.trim()}` } });
  const domains = await response.json();
  if (!response.ok || !domains.data?.some(domain => domain.name === 'cluegent.com' && domain.status === 'verified')) throw new Error('Verify cluegent.com in Resend before publishing the popup');
}
if (!process.argv.includes('--hosting-only')) {
const stage = mkdtempSync(join(tmpdir(), 'cluegent-mobile-signup-'));
cpSync(join(root, 'functions'), join(stage, 'functions'), { recursive: true, filter: path => !path.includes('/node_modules') && !path.includes('/lib') && !path.includes('/.env') });
symlinkSync(join(root, 'functions/node_modules'), join(stage, 'functions/node_modules'), 'dir');
writeFileSync(join(stage, 'functions/src/index.ts'), `import { onCall } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { sendDesktopDownloadEmailController } from './controllers/downloadEmailController.js';
const key = defineSecret('RESEND_API_KEY');
const from = defineString('DOWNLOAD_EMAIL_FROM', { default: 'Cluegent <downloads@cluegent.com>' });
export const sendDesktopDownloadEmail = onCall({region:'us-central1',cors:true,secrets:[key],timeoutSeconds:60}, request => sendDesktopDownloadEmailController(request,key.value(),from.value()));\n`);
writeFileSync(join(stage, 'firebase.json'), JSON.stringify({ functions: [{ source: 'functions', codebase: 'default', predeploy: ['npm --prefix "$RESOURCE_DIR" run build'], ignore: ['node_modules', '.git', '*.local', '.env', '.env.*'] }] }));
writeFileSync(join(stage, 'functions/.env.cluegent-2514d'), 'DOWNLOAD_EMAIL_FROM=Cluegent <downloads@cluegent.com>\n');
const deployed = spawnSync('firebase', ['deploy', '--project', site, '--only', 'functions:sendDesktopDownloadEmail', '--non-interactive'], { cwd: stage, stdio: 'inherit' });
if (deployed.status !== 0) throw new Error('Function deployment failed; Hosting release stopped');
if (process.argv.includes('--function-only')) { console.log('Email backend deployed; Hosting unchanged'); process.exit(0); }
}
const version = await hosting.createVersion(site, { config: source.config });
const manifest = { ...production, ...replacements };
const populated = await client.post(`/${version}:populateFiles`, { files: manifest });
const uploader = new Client({ urlPrefix: populated.body.uploadUrl, auth: true });
const uploads = populated.body.uploadRequiredHashes || [];
let nextUpload = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (nextUpload < uploads.length) {
    const hash = uploads[nextUpload++];
    if (!bodies.has(hash)) throw new Error('Unexpected production upload requirement');
    const upload = await uploader.request({ method: 'POST', path: `/${hash}`, body: Readable.from([bodies.get(hash)]), responseType: 'stream', resolveOnHTTPError: true });
    if (upload.status !== 200) throw new Error(`Upload failed: ${upload.status}`);
  }
}));
const actual = await files(version);
if (Object.keys(actual).length !== Object.keys(manifest).length || Object.entries(manifest).some(([path,hash]) => actual[path] !== hash)) throw new Error('Manifest verification failed');
if ((await hosting.getChannel('-', site, 'live')).release.version.name !== source.name) throw new Error('Production changed; release stopped');
await hosting.updateVersion(site, version.split('/').pop(), { status: 'FINALIZED' });
const release = await hosting.createRelease(site, 'live', version, { message: 'Mobile signup and computer download email' });
console.log(JSON.stringify({ release: release.name, version, previousVersion: source.name }));
