import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { europePosts, europeSlugs, europeExercises, europeHubSlug, europePublishedDate } from "./seo-europe-posts.mjs";
const origin = "https://www.cluegent.com";
const escape = value => String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
assert.equal(europePosts.length, 25);
assert.equal(europeExercises.length, 24);
for (const field of ["slug", "title", "description", "h1", "intent"]) assert.equal(new Set(europePosts.map(p => p[field])).size, 25, `Duplicate ${field}`);
const index = read("website/blog/index.html");
const sitemap = read("website/sitemap.xml");
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
assert.equal(urls.length, new Set(urls).size);
const stats = [];
for (const post of europePosts) {
  const path = `/blog/${post.slug}/`;
  const html = read(`website${path}index.html`);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, post.slug);
  assert(html.includes(`<title>${escape(post.title)}</title>`), `Title: ${post.slug}`);
  assert(html.includes(post.bodyHtml), `Full body missing: ${post.slug}`);
  assert(html.includes(`rel="canonical" href="${origin}${path}"`), `Canonical: ${post.slug}`);
  assert(html.includes('lang="en"'));
  assert(!/hreflang="en-EU"|<meta[^>]+noindex/i.test(html));
  assert(html.includes('<div data-nosnippet>'));
  assert(index.includes(path), `Blog index missing ${path}`);
  assert(sitemap.includes(`<loc>${origin}${path}</loc><lastmod>${europePublishedDate}</lastmod>`));
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1]));
  const article = schemas.find(s=>s["@type"] === "Article");
  assert.equal(article.datePublished, europePublishedDate);
  assert.equal(article.dateModified, europePublishedDate);
  assert.equal(schemas.find(s=>s["@type"] === "FAQPage").mainEntity.length, post.faqs.length);
  for (const m of html.matchAll(/href="(\/[^"#?]*|#[^"]+)"/g)) {
    const href = m[1];
    if (href.startsWith("#")) assert(html.includes(`id="${href.slice(1)}"`), `${post.slug}: anchor ${href}`);
    else assert(existsSync(new URL(`../website${href.endsWith("/") ? href + "index.html" : href}`, import.meta.url)), `${post.slug}: link ${href}`);
  }
  if (post.slug !== europeHubSlug) assert(html.includes(`/blog/${europeHubSlug}/`));
  assert(html.includes("/download/"));
  const words = post.bodyHtml.replace(/<[^>]*>/g," ").trim().split(/\s+/).length;
  assert(words >= 400, `${post.slug}: incomplete exercise (${words} words)`);
  assert(!/guaranteed.*(rank|hire|traffic)|first.page guaranteed|In today's|game.changer/i.test(post.bodyHtml));
  stats.push({ slug: post.slug, words });
}
const hub = read(`website/blog/${europeHubSlug}/index.html`);
for (const slug of europeSlugs.slice(1)) assert(hub.includes(`/blog/${slug}/`), `Hub missing ${slug}`);
// These local pages were dirty before the campaign. Their exact pre-change bytes must survive.
const protectedHashes = {
  "parakeet-ai": "13b5122aed40a508203c1f607ab11a38ebcb0bbc0c9a65b8520a26a806afcc8c",
  "parakeet-ai-pricing": "9a017997a29f139f9b3d679833fc4e93f5c05839b7011bd21086c94a2a73b7e7",
  "recruiter-phone-screen-checklist": "6a613ff0a5671c7c56e271205fb20303a698a2e1b25e18f13fdbbdd8447d469c",
};
if (process.argv.includes("--check-protected")) for (const [slug, hash] of Object.entries(protectedHashes)) assert.equal(createHash("sha256").update(read(`website/blog/${slug}/index.html`)).digest("hex"), hash, `Protected page changed: ${slug}`);
// This is a text-similarity review aid, not evidence of ranking cannibalisation.
const tokens = html => html.replace(/<[^>]*>/g," ").toLowerCase().match(/[a-z]+/g) || [];
const shingles = html => { const t=tokens(html); return new Set(t.slice(0,-4).map((_,i)=>t.slice(i,i+5).join(" "))); };
const sets = europePosts.map(p=>shingles(p.bodyHtml));
let maxOverlap = 0; let closestPair;
for(let a=0;a<sets.length;a++) for(let b=a+1;b<sets.length;b++) {
  const shared=[...sets[a]].filter(s=>sets[b].has(s)).length;
  const overlap=shared/(sets[a].size+sets[b].size-shared);
  if(overlap>maxOverlap) { maxOverlap=overlap; closestPair=[europePosts[a].slug,europePosts[b].slug]; }
}
assert(maxOverlap < 0.3, `Review repeated text: ${closestPair}`);
const existingSlugs = readdirSync(new URL("../website/blog/",import.meta.url),{withFileTypes:true}).filter(d=>d.isDirectory()&&!europeSlugs.includes(d.name)).map(d=>d.name);
console.log(JSON.stringify({ passed:true, posts:stats.length, bodyWords:stats.reduce((n,p)=>n+p.words,0), shortestWords:Math.min(...stats.map(p=>p.words)), sitemapUrls:urls.length, existingBlogDirectories:existingSlugs.length, maximumTextOverlap:Number(maxOverlap.toFixed(3)), closestPair, protectedFilesChecked:process.argv.includes("--check-protected"), stats },null,2));
