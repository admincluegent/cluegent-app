import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { growthPostsBatch4 as posts, growthBacklinksBatch4 as backlinks } from "./seo-growth-posts-batch-4.mjs";

const website = fileURLToPath(new URL("../website/", import.meta.url));
const read = (path) => readFileSync(`${website}${path}`, "utf8");
const index = read("blog/index.html");
const sitemap = read("sitemap.xml");
const decode = (value) => value.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ({"&amp;":"&", "&lt;":"<", "&gt;":">", "&quot;":'"', "&#39;":"'"})[entity]);
const samples = (slug) => [...posts.find((post) => post.slug === slug).bodyHtml.matchAll(/<code>([\s\S]*?)<\/code>/g)].map((match) => decode(match[1]));
assert.equal(posts.length, 15);
for (const field of ["slug", "title", "description", "h1"]) {
  assert.equal(new Set(posts.map((post) => post[field])).size, 15, `unique ${field}`);
}
assert.equal(backlinks.length, 15);
const allBlogTitles = readdirSync(`${website}blog`, {withFileTypes:true}).filter((entry) => entry.isDirectory()).map((entry) => ({slug:entry.name,title:read(`blog/${entry.name}/index.html`).match(/<title>(.*?)<\/title>/)?.[1]}));

for (const post of posts) {
  const path = `/blog/${post.slug}/`;
  const html = read(`blog/${post.slug}/index.html`);
  const canonical = `https://www.cluegent.com${path}`;
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${post.slug}: H1`);
  assert.ok(html.includes(`rel="canonical" href="${canonical}"`), `${post.slug}: canonical`);
  assert.ok(!/noindex/i.test(html), `${post.slug}: indexable`);
  assert.ok(index.includes(`href="${path}"`), `${post.slug}: index link`);
  assert.equal(sitemap.split(`<loc>${canonical}</loc>`).length - 1, 1, `${post.slug}: sitemap uniqueness`);
  assert.ok(sitemap.includes(`<loc>${canonical}</loc><lastmod>${post.modifiedDate}</lastmod>`), `${post.slug}: lastmod`);
  assert.ok(html.indexOf("Invisible During Screen") < html.indexOf('<article class="seo-article'), `${post.slug}: requested hero`);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((match) => JSON.parse(match[1]));
  const article = schemas.find((schema) => schema["@type"] === "Article");
  assert.equal(article?.headline, post.h1);
  assert.equal(article?.mainEntityOfPage, canonical);
  assert.equal(article?.datePublished, post.publishedDate);
  assert.equal(schemas.find((schema) => schema["@type"] === "FAQPage")?.mainEntity.length, post.faqs.length);
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  assert.equal(allBlogTitles.filter((entry) => entry.title === title).length, 1, `${post.slug}: no existing duplicate title`);
  assert.ok(post.sources.length > 0);
  const prose = post.bodyHtml.replace(/<nav[\s\S]*?<\/nav>/, "").replace(/<pre[\s\S]*?<\/pre>/g, "").replace(/<[^>]+>/g, " ").trim();
  const words = prose.split(/\s+/).length;
  assert.ok(words >= 500, `${post.slug}: substantive original article (${words} words)`);
  for (const match of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const target = match[1];
    assert.ok(existsSync(`${website}${target.slice(1)}${target.endsWith("/") ? "index.html" : ""}`), `${post.slug}: missing ${target}`);
  }
  for (const match of post.bodyHtml.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(post.bodyHtml.includes(`id="${match[1]}"`), `${post.slug}: TOC target`);
  }
  const [parent] = backlinks.find(([, target]) => target === post.slug);
  const parentHtml = read(`blog/${parent}/index.html`);
  assert.ok(parentHtml.includes(`rel="canonical" href="https://www.cluegent.com/blog/${parent}/"`), `${post.slug}: canonical linking parent`);
  assert.ok(parentHtml.includes(`href="${path}"`), `${post.slug}: incoming contextual link`);
  console.log(`PASS ${post.slug}: ${words} prose words, metadata, links, schema, sitemap`);
}

const sql = samples("sql-joins-interview-questions");
const sqlRun = spawnSync("sqlite3", [":memory:"], {input:sql.join("\n"), encoding:"utf8"});
assert.equal(sqlRun.status, 0, sqlRun.stderr);
assert.equal(sqlRun.stdout.trim(), "Ada|2\nBen|0\nCy|0\nCy", "published SQL sample results");
const promiseSamples = samples("javascript-promises-interview-questions");
for (const [i, expected] of ["A\nB\nC", "6"].entries()) {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", promiseSamples[i]], {encoding:"utf8"});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), expected, "published promise output");
}
assert.equal((20 + 90) / (100 + 900), 0.11, "weighted margin exercise");
assert.equal(100 * 86400 * 500 / 1e9, 4.32, "system design storage exercise");
console.log("PASS published SQL, JavaScript, and arithmetic exercises. All fifteen articles validated.");
