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
const replacements = {}, bodies = new Map();
function addFile(path, bytes) {
  const compressed = gzipSync(bytes), hash = createHash('sha256').update(compressed).digest('hex');
  replacements[path] = hash; bodies.set(hash, compressed);
}
const response = await fetch(`https://www.cluegent.com/?videos-release=${Date.now()}`);
if (!response.ok) throw new Error('Could not read current live homepage');
let html = await response.text();
const local = readFileSync(join(root, 'website/index.html'), 'utf8');
const section = local.match(/        <section class="launch-videos-section"[\s\S]*?<\/section>\n\n/)[0];

const marker = '        <section class="company-marquee-section"';
if (!html.includes(marker)) throw new Error('Live homepage insertion point changed');
html = html.includes('id="watch-cluegent"') ? html.replace(/        <section class="launch-videos-section"[\s\S]*?<\/section>\n\n/, section) : html.replace(marker, section + marker);
html = html.replace(/    <link rel="stylesheet" href="\/launch-videos\.css\?[^"]*" \/>\n/g, '').replace('  </head>', '    <link rel="stylesheet" href="/launch-videos.css?v=20261008-scroll" />\n  </head>');
if (!html.includes('/launch-videos.css')) throw new Error('Stylesheet insertion failed');
addFile('/index.html', Buffer.from(html));
addFile('/launch-videos.css', readFileSync(join(root, 'website/launch-videos.css')));
console.log('Only homepage video section and its stylesheet will be published.');
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
const release = await hosting.createRelease(site, 'live', version, { message: 'Resize and align videos with horizontal scrolling' });
console.log(JSON.stringify({ release: release.name, version, previousVersion: source.name }));
