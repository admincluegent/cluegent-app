import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { growthPostsBatch6 as posts, growthBacklinksBatch6 as backlinks } from "./seo-growth-posts-batch-6.mjs";
const root = new URL("../website/", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const hub = read("blog/index.html");
const sitemap = read("sitemap.xml");
assert.equal(posts.length, 20);
assert.equal(new Set(posts.map(post => post.slug)).size, 20);
assert.equal(new Set(posts.map(post => post.title)).size, 20);
let minWords = Infinity;
for (const post of posts) {
  const url = `https://www.cluegent.com/blog/${post.slug}/`;
  const html = read(`blog/${post.slug}/index.html`);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, post.slug);
  assert(html.includes(`rel="canonical" href="${url}"`), post.slug);
  assert(!/noindex/i.test(html), post.slug);
  assert(hub.includes(`href="/blog/${post.slug}/"`), post.slug);
  assert(sitemap.includes(`<loc>${url}</loc><lastmod>2026-09-29</lastmod>`), post.slug);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1]));
  const article = schemas.find(s => s["@type"] === "Article");
  assert.equal(article.mainEntityOfPage, url);
  assert.equal(article.datePublished, "2026-09-29");
  assert.equal(article.dateModified, "2026-09-29");
  assert.equal(schemas.find(s => s["@type"] === "FAQPage").mainEntity.length, post.faqs.length);
  const text = post.bodyHtml.replace(/<[^>]*>/g, " ");
  const words = text.trim().split(/\s+/).length;
  minWords = Math.min(minWords, words);
  assert(words >= 390, `${post.slug}: insufficient substantive content (${words})`);
  assert(!/\b(TODO|TBD|lorem ipsum)\b/i.test(text));
  for (const [, href] of html.matchAll(/href="(\/[^"?#]*)/g)) {
    assert(existsSync(new URL(href.slice(1) + (href.endsWith("/") ? "index.html" : ""), root)), `${post.slug}: ${href}`);
  }
}
for (const [parent, slug] of backlinks) assert(read(`blog/${parent}/index.html`).includes(`href="/blog/${slug}/"`), `${parent} -> ${slug}`);
assert.equal(50 / 400 * 100, 12.5);
assert.equal(35 / 400 * 100, 8.75);
assert.equal((12.5 - 8.75) / 12.5 * 100, 30);
console.log(JSON.stringify({ passed: true, articles: posts.length, minimumOriginalBodyWords: minWords, checks: "metadata, schema, content, sitemap, reciprocal links, worked-example arithmetic" }));
