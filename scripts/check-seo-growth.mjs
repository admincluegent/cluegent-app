import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { growthPosts } from "./seo-growth-posts.mjs";
import { growthPostsBatch2 } from "./seo-growth-posts-batch-2.mjs";

const website = fileURLToPath(new URL("../website/", import.meta.url));
const read = (path) => readFileSync(`${website}${path}`, "utf8");
const index = read("blog/index.html");
const sitemap = read("sitemap.xml");
const allGrowthPosts = [...growthPosts, ...growthPostsBatch2];
assert.equal(growthPostsBatch2.length, 11);
assert.equal(new Set(allGrowthPosts.map((post) => post.slug)).size, 21);
assert.equal(new Set(allGrowthPosts.map((post) => post.title)).size, 21);

for (const post of allGrowthPosts) {
  const path = `/blog/${post.slug}/`;
  const html = read(`blog/${post.slug}/index.html`);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${post.slug}: single H1`);
  assert.ok(html.includes(`rel="canonical" href="https://www.cluegent.com${path}"`), `${post.slug}: canonical`);
  assert.ok(!/noindex/i.test(html), `${post.slug}: indexable`);
  assert.ok(index.includes(`href="${path}"`), `${post.slug}: index link`);
  assert.ok(sitemap.includes(`<loc>https://www.cluegent.com${path}</loc><lastmod>${post.modifiedDate}</lastmod>`), `${post.slug}: sitemap`);
  const heroPosition = html.indexOf("Invisible During Screen");
  assert.ok(heroPosition >= 0 && heroPosition < html.indexOf('<article class="seo-article'), `${post.slug}: approved hero first`);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((match) => JSON.parse(match[1]));
  const article = schemas.find((schema) => schema["@type"] === "Article");
  assert.ok(article, `${post.slug}: Article schema`);
  assert.equal(article.headline, post.h1);
  assert.equal(article.datePublished, post.publishedDate);
  assert.equal(article.mainEntityOfPage, `https://www.cluegent.com${path}`);
  const faq = schemas.find((schema) => schema["@type"] === "FAQPage");
  assert.equal(faq.mainEntity.length, post.faqs.length);
  for (const match of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const target = match[1];
    assert.ok(existsSync(`${website}${target.slice(1)}${target.endsWith("/") ? "index.html" : ""}`), `${post.slug}: missing ${target}`);
  }
  console.log(`PASS ${post.slug}`);
}
console.log("All growth articles passed metadata, schema, hero, sitemap, and internal-link checks.");
