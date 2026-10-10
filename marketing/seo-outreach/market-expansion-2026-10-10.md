# Canada, Australia, Singapore, France and Spain — first market test

## Scope

Five substantive interview guides, one per market. User requested implementation for these countries but did not specify a new article count. This is a focused first test, not another bulk-country replication batch. Goal: qualified organic clicks and optional Cluegent downloads. Rankings, indexing and traffic are not guaranteed.

Adopted skills used: SEO Audit (international/crawl checks), Duplicate-Intent Audit (entity and task selection), Primary-Source Verification (local recruitment facts) and Copywriting (clear examples and CTA). The supplied SEOO pack is already represented by the adopted project skills; its files were treated as instruction sources only through the explicit user request, not as deployment authority.

## Free search research, 10 October 2026

Google autocomplete queried with `client=firefox`, country hint `gl` and language `hl`. These are qualitative suggestion signals, **not** country-specific search-volume measurements, rank tracking or a traffic forecast.

| Market | Seed and observed suggestions | Decision |
| --- | --- | --- |
| Canada | `co op interview questions` mixed student, retail and housing-board intent; `co op student interview` returned `co op student interview questions` | Focus explicitly on student placements; discard retail/housing meanings |
| Australia | `aps interview` returned questions, prep, tips and process | Application-to-panel evidence plus a work sample; no official-question or score claims |
| Singapore | `career switch interview` returned career-change questions; `skills framework interview` returned unrelated generic frameworks | Skills Framework evidence map is an editorial long-tail test, not demonstrated high volume |
| France, French | `entretien alternance` returned question, question à poser and company variants | Original alternance mission/evidence worksheet; omit unverified company-specific claims |
| Spain, Spanish | `entrevista prácticas` returned company and non-Spain variants; `entrevista de prácticas en España` returned no suggestions | A locally relevant editorial test, not proof of high Spanish search volume |

## URLs, distinct intent and sources

| URL under `https://www.cluegent.com` | Task | Authoritative reference |
| --- | --- | --- |
| `/blog/canada-co-op-student-interview-preparation/` | Student project evidence and placement questions | [University of Waterloo](https://uwaterloo.ca/future-students/welcome/preparing-co-op) |
| `/blog/australia-aps-interview-evidence-work-sample/` | Connect a submitted APS pitch to follow-ups and a hypothetical note | [Australian Public Service Commission](https://www.apsc.gov.au/working-aps/joining-aps/cracking-code/7-interview-and-other-assessment-cracking-code) |
| `/blog/singapore-skills-framework-interview-evidence/` | Compare one role's requirements with evidence and learning gaps | [SkillsFuture official FAQ](https://www.skillsfuture.gov.sg/skills-framework/skills-frameworks-faq) |
| `/blog/fr/entretien-alternance-questions-exemples/` | French alternance motivation, missions and learning plan | [France Travail](https://www.francetravail.fr/actualites/le-dossier/alternance/les-demarches-pour-poser-sa-cand.html) |
| `/blog/es/entrevista-practicas-preguntas-ejemplos/` | Spanish placement interview with an academic project | [SEPE interview resources](https://sepe.es/noticia/SEPE/2018/Marzo/entrevista-trabajo-youtube) |

Checked facts: Waterloo discusses preparing a résumé and skills from projects/clubs/volunteering (not a uniform Canada-wide recruitment process); APSC describes possible behavioural/hypothetical questions and other assessments (not a fixed test); SkillsFuture says frameworks support role understanding/interview preparation and can be adapted by employers; France Travail recommends explaining competencies through real achievements and practising; SEPE points readers to interview-preparation resources.

SkillsFuture's live page served an anti-bot screen to the text opener; the detailed official indexed extract was checked. Do not claim a live interactive test of that page. A SEPE PDF fetch failed; it was not used as factual evidence. The accessible SEPE HTML resource was used instead. Original examples contain no legal eligibility, pay thresholds, performance statistics or claimed real customer results.

## Intent and localisation decisions

The Canadian guide is about student placement evidence, not the US recruiter-screen worksheet. The APS guide concerns an Australian agency brief and work sample, not a renamed UK Civil Service guide. The Singapore page constructs a skills-gap artefact and links the existing general career-change question bank. French alternance and Spanish placement guides have different local preparation tasks; they are not word-for-word translations of each other.

All five remain self-canonical. No hreflang pairs were invented across unrelated content. French and Spanish use dedicated language subpaths, matching HTML language and Article `inLanguage`, native-language article chrome/FAQs/metadata, and clearly labelled links to English product pages. English pages use `en-CA`, `en-AU` and `en-SG`. No IP redirects, fake local addresses or implied local offices.

French and Spanish copy received AI-assisted editorial review for clarity, examples and source consistency. **No native-human review was performed or claimed.** This is disclosed on the pages. A native-speaker review remains recommended before expanding either language to a larger library. The product/download experience is not represented as fully translated.

## Conversion and measurement

Each guide provides a useful free worksheet before a relevant optional Cluegent CTA. Explicit `download_click` hooks reuse existing GA4 tracking and carry the page path and a guide-specific CTA location. This is implementation evidence, not a claim that analytics events were observed in a live account.

No current country-level Search Console/GA4 baseline was accessed in this run. After publication, save country/page/query performance for a proposed 28-day initial window and compare equal later periods. Review clicks, CTR, device mix and attributable signups/downloads, not impressions alone. Assess indexed status separately before deciding on another content batch. Low counts may not support a meaningful conclusion.

Priority for expansion is a hypothesis: Canada/Australia English pages first, Singapore's role-based case next, then France/Spain with native-speaker review and observed local-language query data. This is not a ranking of measured market demand.

## Operational checks and discovery

Run `node scripts/generate-seo-site.mjs --markets`, then `node scripts/check-market-expansion.mjs --protected`. Publish only seven paths: five articles, blog index and sitemap, retaining all other production files. Notify IndexNow of the five articles and blog index only after their live canonical checks pass.

The user confirmed `/sitemap.xml` was submitted to Google earlier in this chat. Updating that same public sitemap includes new URLs without needing individual submissions. Do not report a new Google submission or confirmed indexing unless separately verified.

Delivery receipts:

- Local validation passed for five pages, 3,519 article-body words, all intended language tags, full rendered bodies, canonical URLs, one H1, matching FAQ/Article schema, internal links and explicit CTA hooks.
- Pre-existing Parakeet overview, pricing and US recruiter page hashes were unchanged. The 25 Europe article files were not regenerated by the scoped `--markets` build.
- Production release: `projects/668074615998/sites/cluegent-2514d/channels/live/releases/1791615183706000`; version `2a3e2c804afb0de0`; previous version `b1a2a7456b6b626d`.
- Seven selected paths were published with the rest of the 392-file source production manifest retained. Manifest verification and concurrent-release guard passed.
- Live checks passed for all five URLs: HTTP 200, exact article body, intended language and self-canonical. Live XML matched the validated local sitemap, containing 316 unique URLs.
- IndexNow accepted the six-URL notification (five market guides plus the blog index) with HTTP 200. Acceptance confirms notification receipt, not indexing.
- No fresh Google Search Console submission, new crawl date, indexed status or traffic gain was claimed. The existing submitted sitemap URL was updated in place.
