// Scoped hosting release: retain every production file outside this SEO change.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { Readable } from "node:stream";
import { discoveryClusters } from "./seo-discovery-improvements.mjs";
import { growthPostsBatch6, growthBacklinksBatch6 } from "./seo-growth-posts-batch-6.mjs";
import { growthPostsBatch7, growthBacklinksBatch7 } from "./seo-growth-posts-batch-7.mjs";
const cliRoot = process.env.FIREBASE_TOOLS_ROOT;
if (!cliRoot) throw new Error("Set FIREBASE_TOOLS_ROOT to the installed firebase-tools directory");
const require = createRequire(`${cliRoot}/package.json`);
const { requireAuth } = require(`${cliRoot}/lib/requireAuth.js`);
const { getGlobalDefaultAccount } = require(`${cliRoot}/lib/auth.js`);
const { Client } = require(`${cliRoot}/lib/apiv2.js`);
const hosting = require(`${cliRoot}/lib/hosting/api.js`);
await requireAuth({ ...getGlobalDefaultAccount(), project: "cluegent-2514d", nonInteractive: true });
const client = new Client({ urlPrefix: "https://firebasehosting.googleapis.com", apiVersion: "v1beta1", auth: true });
const site = "cluegent-2514d";
const channel = await hosting.getChannel("-", site, "live");
const sourceVersion = channel.release.version;
const base = sourceVersion.name;
async function files(version) {
  const result = {}; let pageToken;
  do {
    const response = await client.get(`/${version}/files`, { queryParams: { pageSize: 1000, ...(pageToken ? { pageToken } : {}) } });
    for (const file of response.body.files || []) result[file.path] = file.hash;
    pageToken = response.body.nextPageToken;
  } while (pageToken);
  return result;
}
const productionFiles = await files(base);
const batch6 = process.argv.includes("--batch6");
const batch7 = process.argv.includes("--batch7");
const selectedPosts = batch7 ? growthPostsBatch7 : growthPostsBatch6;
const selectedBacklinks = batch7 ? growthBacklinksBatch7 : growthBacklinksBatch6;
const slugs = [...new Set(batch6 || batch7 ? [...selectedPosts.map(post => post.slug), ...selectedBacklinks.map(([slug]) => slug)] : [...discoveryClusters.flatMap(group => group.slugs), "parakeet-ai", "system-design-interview-questions-beginners", "how-to-prepare-for-coding-interview-in-7-days"])];
const paths = [...(batch6 || batch7 ? [] : ["/index.html", "/cluegent-indexnow-key.txt"]), "/blog/index.html", "/sitemap.xml", ...slugs.map(slug => `/blog/${slug}/index.html`)];
const replacements = {}; const bodies = new Map();
for (const path of paths) {
  const bytes = readFileSync(new URL(`../website${path}`, import.meta.url));
  const compressed = gzipSync(bytes);
  const hash = createHash("sha256").update(compressed).digest("hex");
  replacements[path] = hash; bodies.set(hash, compressed);
}
console.log(JSON.stringify({ sourceVersion: base, retainedFiles: Object.keys(productionFiles).length, replacements: paths.length, mode: process.argv.includes("--deploy") ? "deploy" : "preview" }));
if (!process.argv.includes("--deploy")) process.exit(0);
const version = await hosting.createVersion(site, { config: sourceVersion.config });
const manifest = { ...productionFiles, ...replacements };
const populated = await client.post(`/${version}:populateFiles`, { files: manifest });
const uploader = new Client({ urlPrefix: populated.body.uploadUrl, auth: true });
for (const hash of populated.body.uploadRequiredHashes || []) {
  if (!bodies.has(hash)) throw new Error("Production file unexpectedly requires upload; release stopped");
  const upload = await uploader.request({ method: "POST", path: `/${hash}`, body: Readable.from([bodies.get(hash)]), responseType: "stream", resolveOnHTTPError: true });
  if (upload.status !== 200) throw new Error(`Upload failed: ${upload.status} ${await upload.response.text()}`);
}
const actual = await files(version);
if (Object.keys(actual).length !== Object.keys(manifest).length || Object.entries(manifest).some(([path, hash]) => actual[path] !== hash)) throw new Error("Manifest verification failed; release stopped");
const current = await hosting.getChannel("-", site, "live");
if (current.release.version.name !== base) throw new Error("Production changed during preparation; release stopped");
await hosting.updateVersion(site, version.split("/").pop(), { status: "FINALIZED" });
const release = await hosting.createRelease(site, "live", version, { message: batch7 ? "20 technical interview guides, related links and sitemap: October 3" : batch6 ? "20 original interview practice guides, related links and sitemap: September 29" : "SEO discovery links, Parakeet guide and IndexNow verification; preserve other production files" });
console.log(JSON.stringify({ release: release.name, version, previousVersion: base, filesChanged: paths.length }));
