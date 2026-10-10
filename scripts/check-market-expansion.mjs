import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { marketPosts, marketDate } from "./seo-market-expansion.mjs";
const origin = "https://www.cluegent.com";
const read = path => readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const escape = value => String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
assert.equal(marketPosts.length,5);
for(const field of ["slug","country","h1","title","description","intent"]) assert.equal(new Set(marketPosts.map(p=>p[field])).size,5,`Duplicate ${field}`);
const index=read("website/blog/index.html");
const sitemap=read("website/sitemap.xml");
const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
assert.equal(urls.length,new Set(urls).size);
const stats=[];
for(const post of marketPosts) {
  const path=`/blog/${post.slug}/`;
  const html=read(`website${path}index.html`);
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,post.slug);
  assert(html.includes(`<title>${escape(post.title)}</title>`));
  assert(html.includes(`rel="canonical" href="${origin}${path}"`));
  assert(html.includes(`<html lang="${post.language}">`),`${post.slug}: incorrect language`);
  assert(html.includes(post.bodyHtml),`${post.slug}: body not rendered`);
  assert(!/<meta[^>]+noindex/i.test(html));
  assert(!/hreflang=/.test(html),"These are different topics, not translated alternates");
  assert(index.includes(path));
  assert(sitemap.includes(`<loc>${origin}${path}</loc><lastmod>${marketDate}</lastmod>`));
  const schema=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1]));
  const article=schema.find(s=>s["@type"]==="Article");
  assert.equal(article.inLanguage,post.language);
  assert.equal(article.datePublished,marketDate);
  assert.equal(article.dateModified,marketDate);
  assert.equal(schema.find(s=>s["@type"]==="FAQPage").mainEntity.length,post.faqs.length);
  for(const m of html.matchAll(/href="(\/[^"#?]*|#[^"]+)"/g)) {
    const href=m[1];
    if(href.startsWith("#")) assert(html.includes(`id="${href.slice(1)}"`),`${post.slug}: anchor ${href}`);
    else assert(existsSync(new URL(`../website${href.endsWith("/")?href+"index.html":href}`,import.meta.url)),`${post.slug}: broken ${href}`);
  }
  const words=post.bodyHtml.replace(/<[^>]*>/g," ").trim().split(/\s+/).length;
  assert(words>=600,`${post.slug}: incomplete guide (${words} words)`);
  assert(html.includes('data-analytics-event="download_click"'));
  assert(html.includes("G-CCH0Y2SN4G"));
  if(["FR","ES"].includes(post.country)) {
    assert(!/Where Cluegent helps|Frequently asked questions|Sources checked|Reviewed by/.test(html));
    assert(html.includes(`content="${post.country==="FR"?"fr_FR":"es_ES"}"`));
  }
  stats.push({country:post.country,language:post.language,slug:post.slug,words});
}
if(process.argv.includes("--protected")) {
 const old={"parakeet-ai":"13b5122aed40a508203c1f607ab11a38ebcb0bbc0c9a65b8520a26a806afcc8c","parakeet-ai-pricing":"9a017997a29f139f9b3d679833fc4e93f5c05839b7011bd21086c94a2a73b7e7","recruiter-phone-screen-checklist":"6a613ff0a5671c7c56e271205fb20303a698a2e1b25e18f13fdbbdd8447d469c"};
 for(const[slug,hash]of Object.entries(old)) assert.equal(createHash("sha256").update(read(`website/blog/${slug}/index.html`)).digest("hex"),hash,`Previous experiment changed: ${slug}`);
}
let live;
if(process.argv.includes("--live")) {
  const pages=await Promise.all(marketPosts.map(async post=>{
    const url=`${origin}/blog/${post.slug}/`;
    const response=await fetch(url,{redirect:"manual",signal:AbortSignal.timeout(25000)});
    const html=await response.text();
    assert.equal(response.status,200,`${url}: HTTP status`);
    assert(html.includes(post.bodyHtml),`${url}: deployed body differs`);
    assert(html.includes(`<html lang="${post.language}">`),`${url}: deployed language`);
    assert(html.includes(`rel="canonical" href="${url}"`),`${url}: deployed canonical`);
    assert(!/<meta[^>]+noindex/i.test(html),`${url}: noindex`);
    return{country:post.country,url,status:response.status};
  }));
  const response=await fetch(`${origin}/sitemap.xml`,{signal:AbortSignal.timeout(25000)});
  assert.equal(response.status,200);
  assert.equal(await response.text(),sitemap,"Live sitemap differs from validated local XML");
  live={passed:true,pages,sitemapMatchesLocal:true};
}
console.log(JSON.stringify({passed:true,newPages:5,sitemapUrls:urls.length,totalBodyWords:stats.reduce((n,p)=>n+p.words,0),checks:["rendered bodies","titles","canonicals","single H1","language tags","Article and FAQ schema","internal links","blog discovery","sitemap","CTA event hooks","prior experiment hashes"],stats,...(live?{live}:{})},null,2));
