// Explicit live test: sends one download email to the project owner's Gmail alias.
if (!process.argv.includes('--send-test')) throw new Error('Use --send-test to send the owner a live download email');
const fs = require('node:fs'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const key = env.VITE_FIREBASE_API_KEY;
const email = `admincluegent+mobile-test-${Date.now()}@gmail.com`;
const endpoint = 'https://us-central1-cluegent-2514d.cloudfunctions.net/sendDesktopDownloadEmail';
async function jsonPost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json(); if (!r.ok) throw new Error(`Request failed (${r.status}): ${data.error?.status || ''} ${data.error?.message || 'unknown error'}`); return data;
}
(async () => {
  let account, firestore, docPath;
  try {
    account = await jsonPost(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`, { email, password: crypto.randomBytes(24).toString('hex'), returnSecureToken: true });
    const first = await jsonPost(endpoint, { data: {}, }); // Must reject anonymous calls.
    throw new Error('Anonymous callable unexpectedly succeeded');
  } catch (error) {
    if (!account || !error.message.includes('UNAUTHENTICATED')) {
      if (account) await jsonPost(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${key}`, { idToken: account.idToken });
      throw error;
    }
  }
  try {
    async function send() {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${account.idToken}` }, body: JSON.stringify({ data: {} }) });
      const data = await r.json(); if (!r.ok || data.result?.sent !== true) throw new Error(`Callable failed (${r.status}): ${data.error?.message || 'unexpected response'}`);
    }
    await send(); await send();
    const cliRoot = '/Users/prithivi/.local/nodejs/node-v24.16.0-darwin-arm64/lib/node_modules/firebase-tools';
    const { requireAuth } = require(cliRoot + '/lib/requireAuth.js'), { getGlobalDefaultAccount } = require(cliRoot + '/lib/auth.js'), { Client } = require(cliRoot + '/lib/apiv2.js');
    await requireAuth({ ...getGlobalDefaultAccount(), project: 'cluegent-2514d', nonInteractive: true });
    firestore = new Client({ urlPrefix: 'https://firestore.googleapis.com', apiVersion: 'v1', auth: true });
    const hash = crypto.createHash('sha256').update(`${account.localId}:${email}`).digest('hex');
    docPath = `/projects/cluegent-2514d/databases/cluegent/documents/desktop_download_emails/${hash}`;
    const record = await firestore.get(docPath);
    const id = record.body.fields.providerId.stringValue;
    const secret = spawnSync('firebase', ['functions:secrets:access', 'RESEND_API_KEY', '--project', 'cluegent-2514d', '--non-interactive'], { encoding: 'utf8' });
    if (secret.status !== 0) throw new Error('Could not inspect email delivery');
    let lastEvent;
    for (let i = 0; i < 6; i++) {
      const response = await fetch(`https://api.resend.com/emails/${id}`, { headers: { Authorization: `Bearer ${secret.stdout.trim()}` } });
      if (!response.ok) throw new Error('Could not inspect provider delivery record');
      const message = await response.json(); if (message.subject !== 'Your Cluegent download links + quick start guide' || !message.html?.includes('4. Make answers relevant to you')) throw new Error('Live email template does not match approved copy'); lastEvent = message.last_event;
      if (['delivered', 'bounced', 'failed'].includes(lastEvent)) break;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log(JSON.stringify({ signup: 'passed', authenticatedEmail: 'passed', duplicateRequest: 'passed', recipient: email, emailId: id, delivery: lastEvent }));
    if (['bounced', 'failed'].includes(lastEvent)) process.exitCode = 1;
  } finally {
    await jsonPost(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${key}`, { idToken: account.idToken });
    if (firestore && docPath) await firestore.delete(docPath);
    console.log('Temporary Firebase test account and email record removed');
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
