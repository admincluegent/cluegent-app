// Search Console: discovered, currently not indexed; report dated 2026-09-21.
export const discoveryClusters = [
  { title: "Cloud and platform engineering interviews", slugs: ["aws-solutions-architect-interview-questions", "devops-engineer-interview-questions", "sre-interview-questions", "cloud-security-engineer-interview-questions", "ci-cd-interview-questions", "microservices-interview-questions", "redis-interview-questions"] },
  { title: "Data, development and testing interviews", slugs: ["business-analyst-interview-questions", "data-engineer-interview-questions", "machine-learning-engineer-interview-questions", "nextjs-interview-questions-and-answers", "postman-interview-questions", "python-asyncio-interview-questions", "qa-engineer-interview-questions", "panel-interview-preparation"] },
  { title: "Compare interview assistants and setup options", slugs: ["chiku-ai-vs-cluely", "chiku-ai-vs-final-round-ai", "cluely-download", "cluely-pricing", "final-round-ai-vs-cluely", "interview-coder-download", "interview-coder-vs-cluely", "interview-coder-vs-final-round-ai", "parakeet-ai-vs-cluely", "parakeet-ai-vs-interview-coder"] },
];

export function improveDiscovery(posts) {
  const bySlug = new Map(posts.map(post => [post.slug, post]));
  const anchors = ["system-design-interview-questions-beginners", "how-to-prepare-for-coding-interview-in-7-days", "parakeet-ai"];
  discoveryClusters.forEach((cluster, index) => {
    for (const slug of cluster.slugs) {
      if (!bySlug.has(slug)) throw new Error(`Missing discovery article: ${slug}`);
    }
    const anchor = bySlug.get(anchors[index]);
    if (!anchor) throw new Error(`Missing discovery anchor: ${anchors[index]}`);
    const members = cluster.slugs.map(slug => bySlug.get(slug));
    for (const post of [anchor, ...members]) {
      const existing = new Map((post.links || []).map(link => [link[0], link]));
      const peers = post === anchor ? members : [anchor, ...members.filter(other => other !== post).slice(0, 3)];
      for (const peer of peers) existing.set(`/blog/${peer.slug}/`, [`/blog/${peer.slug}/`, peer.h1]);
      post.links = [...existing.values()];
      post.modifiedDate = "2026-09-25";
    }
  });
  const parakeet = bySlug.get("parakeet-ai");
  parakeet.title = "Parakeet AI: Features, Pricing Checks & Alternatives (2026)";
  parakeet.description = "Compare Parakeet AI's browser, desktop and phone workflows, pricing checks and mock interview options. A Cluegent-authored guide with official sources.";
  parakeet.summary = "Parakeet AI offers real-time call assistance through desktop, browser and phone workflows, alongside mock interview practice. This guide is written by Cluegent, an alternative product, and links to official sources so you can check features and plans yourself.";
  parakeet.sections = parakeet.sections.filter(([heading]) => heading !== "Current product scope and research disclosure");
  parakeet.sections.unshift(["Current product scope and research disclosure", "Checked September 25, 2026: Parakeet AI's official site describes desktop, browser and mobile-browser access for interviews and other calls. Its mock interview page describes spoken practice and saved transcripts. Confirm current plan allowances on the official site before buying. Cluegent publishes this comparison and competes in this category; we have not independently benchmarked Parakeet's answer quality or latency. A feature listed by the vendor is not a hands-on test result."]);
  parakeet.sources = [...(parakeet.sources || []), ["https://www.parakeet-ai.com/", "Parakeet AI official features and plans"], ["https://www.parakeet-ai.com/mock-interview", "Parakeet AI mock interview workflow"]];
  return discoveryClusters.map(cluster => ({ ...cluster, posts: cluster.slugs.map(slug => bySlug.get(slug)) }));
}
