import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { competitorPostsBatch3 } from "./seo-competitor-posts-batch-3.mjs";

const website = fileURLToPath(new URL("../website/", import.meta.url));
const read = (path) => readFileSync(`${website}${path}`, "utf8");
const index = read("blog/index.html");
const sitemap = read("sitemap.xml");

assert.equal(competitorPostsBatch3.length, 10);
assert.equal(new Set(competitorPostsBatch3.map((post) => post.slug)).size, 10);
assert.equal(new Set(competitorPostsBatch3.map((post) => post.title)).size, 10);

for (const post of competitorPostsBatch3) {
  const path = `/blog/${post.slug}/`;
  const html = read(`blog/${post.slug}/index.html`);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${post.slug}: single H1`);
  assert.ok(html.includes(`rel="canonical" href="https://www.cluegent.com${path}"`), `${post.slug}: canonical`);
  assert.ok(!/noindex/i.test(html), `${post.slug}: indexable`);
  assert.ok(index.includes(`href="${path}"`), `${post.slug}: blog index link`);
  assert.ok(sitemap.includes(`<loc>https://www.cluegent.com${path}</loc><lastmod>${post.modifiedDate}</lastmod>`), `${post.slug}: sitemap`);
  assert.ok(html.indexOf("Invisible During Screen") < html.indexOf('<article class="seo-article'), `${post.slug}: hero before article`);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((match) => JSON.parse(match[1]));
  const article = schemas.find((schema) => schema["@type"] === "Article");
  const faq = schemas.find((schema) => schema["@type"] === "FAQPage");
  assert.equal(article?.headline, post.h1, `${post.slug}: Article schema`);
  assert.equal(article?.dateModified, post.modifiedDate, `${post.slug}: modified date`);
  assert.equal(faq?.mainEntity?.length, post.faqs.length, `${post.slug}: FAQ schema`);
  for (const match of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const target = match[1];
    assert.ok(existsSync(`${website}${target.slice(1)}${target.endsWith("/") ? "index.html" : ""}`), `${post.slug}: missing ${target}`);
  }
  console.log(`PASS ${post.slug}`);
}

console.log("All ten competitor-intent articles passed metadata, schema, hero, sitemap, and internal-link checks.");
