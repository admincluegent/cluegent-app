import { readFileSync } from "node:fs";
import { discoveryClusters } from "./seo-discovery-improvements.mjs";
import { growthPostsBatch6, growthBacklinksBatch6 } from "./seo-growth-posts-batch-6.mjs";
import { growthPostsBatch7, growthBacklinksBatch7 } from "./seo-growth-posts-batch-7.mjs";
import { growthPostsBatch8, growthBacklinksBatch8 } from "./seo-growth-posts-batch-8.mjs";
import { competitorPostsBatch9, competitorBacklinksBatch9 } from "./seo-competitor-posts-batch-9.mjs";
import { parakeetCtrSlugs } from "./seo-parakeet-ctr.mjs";
import { usRecruiterSlug } from "./seo-us-recruiter.mjs";
import { europeSlugs } from "./seo-europe-posts.mjs";
import { marketSlugs } from "./seo-market-expansion.mjs";

const origin = "https://www.cluegent.com";
const key = readFileSync(new URL("../website/cluegent-indexnow-key.txt", import.meta.url), "utf8").trim();
const keyLocation = `${origin}/cluegent-indexnow-key.txt`;
const selectedPosts = process.argv.includes("--batch9") ? competitorPostsBatch9 : process.argv.includes("--batch8") ? growthPostsBatch8 : process.argv.includes("--batch7") ? growthPostsBatch7 : growthPostsBatch6;
const selectedBacklinks = process.argv.includes("--batch9") ? competitorBacklinksBatch9 : process.argv.includes("--batch8") ? growthBacklinksBatch8 : process.argv.includes("--batch7") ? growthBacklinksBatch7 : growthBacklinksBatch6;
const paths = process.argv.includes("--batch6") || process.argv.includes("--batch7") || process.argv.includes("--batch8") || process.argv.includes("--batch9") ? ["/blog/", ...selectedPosts.map(post => `/blog/${post.slug}/`), ...selectedBacklinks.map(([slug]) => `/blog/${slug}/`)] : ["/blog/", "/blog/parakeet-ai/", "/blog/system-design-interview-questions-beginners/", "/blog/how-to-prepare-for-coding-interview-in-7-days/", ...discoveryClusters.flatMap(group => group.slugs.map(slug => `/blog/${slug}/`))];
const defaultUrls = [...new Set(process.argv.includes("--parakeet-ctr") ? ["/blog/", ...parakeetCtrSlugs.map(slug=>`/blog/${slug}/`)] : paths)].map(path => origin + path);
const urls = process.argv.includes("--markets") ? [`${origin}/blog/`, ...marketSlugs.map(slug => `${origin}/blog/${slug}/`)] : process.argv.includes("--europe") ? [`${origin}/blog/`, ...europeSlugs.map(slug => `${origin}/blog/${slug}/`)] : process.argv.includes("--us-recruiter") ? [`${origin}/blog/`, `${origin}/blog/${usRecruiterSlug}/`] : defaultUrls;
if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error("Invalid IndexNow key format");
if (!process.argv.includes("--submit")) {
  console.log(JSON.stringify({ mode: "preview", urlCount: urls.length, urls }, null, 2));
} else {
  const verification = await fetch(keyLocation, { signal: AbortSignal.timeout(20000) });
  if (!verification.ok || (await verification.text()).trim() !== key) throw new Error("Deploy the matching public key before submitting");
  for (const url of urls) {
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20000) });
    const html = await response.text();
    if (response.status !== 200 || /noindex/i.test(html) || !html.includes(`rel="canonical" href="${url}"`)) throw new Error(`URL is not a live, indexable canonical: ${url}`);
  }
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(origin).host, key, keyLocation, urlList: urls }),
    signal: AbortSignal.timeout(30000),
  });
  console.log(JSON.stringify({ status: response.status, urlCount: urls.length, meaning: response.status === 200 ? "Received; indexing not guaranteed" : response.status === 202 ? "Received; key verification pending" : await response.text() }));
  if (![200, 202].includes(response.status)) process.exitCode = 1;
}
