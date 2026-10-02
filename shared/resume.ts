export interface ResumeSection { title: string; items: string[] }
export interface ResumeData { name: string; headline: string; contact: string; summary: string; sections: ResumeSection[] }
export const RESUME_TEMPLATES = ['classic', 'modern', 'elegant', 'compact', 'executive', 'minimal', 'professional', 'academic', 'technical', 'editorial', 'timeline', 'banner', 'portfolio', 'ribbon', 'cards', 'ledger', 'spotlight', 'horizon'] as const;
export type ResumeTemplate = typeof RESUME_TEMPLATES[number];
export function validateResume(value: unknown): ResumeData {
  if (!value || typeof value !== 'object') throw new Error('AI returned an invalid resume. Please try again.');
  const data = value as Record<string, unknown>;
  const field = (v: unknown, limit: number) => {
    if (typeof v !== 'string' || v.length > limit) throw new Error('Resume text is invalid or too long.');
    return v.trim();
  };
  if (!Array.isArray(data.sections) || data.sections.length > 12) throw new Error('Resume sections are invalid.');
  const resume = {
    name: field(data.name, 150), headline: field(data.headline, 250), contact: field(data.contact, 600), summary: field(data.summary, 2500),
    sections: data.sections.map((section: unknown) => {
      if (!section || typeof section !== 'object') throw new Error('Invalid resume section.');
      const s = section as Record<string, unknown>;
      if (!Array.isArray(s.items) || s.items.length > 40) throw new Error('Invalid resume entries.');
      return { title: field(s.title, 100), items: s.items.map(item => field(item, 3000)) };
    }),
  };
  if (!resume.name && !resume.summary && !resume.sections.some(s => s.items.some(Boolean))) throw new Error('Resume is empty.');
  if (JSON.stringify(resume).length > 50000) throw new Error('Resume is too long.');
  return resume;
}
export function parseResumeReply(reply: string): ResumeData {
  const text = reply.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return validateResume(JSON.parse(text)); }
  catch { throw new Error('Could not read the generated resume. Please try again or shorten your description.'); }
}
export const RESUME_TEMPLATE_DESCRIPTIONS: Record<ResumeTemplate, string> = {
  classic: 'Traditional single column', modern: 'Dark sidebar with main column', elegant: 'Centered serif layout', compact: 'Dense two-column layout',
  executive: 'Split header and section labels', minimal: 'Airy, understated typography', professional: 'Light sidebar with main column', academic: 'Formal curriculum vitae',
  portfolio: 'Main column with right sidebar', ribbon: 'Full-width section ribbons', cards: 'Two-column boxed sections', ledger: 'Numbered section-label layout', spotlight: 'Initials badge and split masthead', horizon: 'Contact strip and credentials band',
  technical: 'Skills strip and project columns', editorial: 'Magazine-style split layout', timeline: 'Experience along a vertical rail', banner: 'Color masthead and two columns',
};

export function renderResumeHtml(value: ResumeData, template: ResumeTemplate, color: string): string {
  const resume = validateResume(value);
  if (!RESUME_TEMPLATES.includes(template) || !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Invalid template or color.');
  const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  const ink = '#' + [1, 3, 5].map(i => Math.round(parseInt(color.slice(i, i + 2), 16) * 0.58).toString(16).padStart(2, '0')).join('');
  const identity = `${resume.name ? `<h1>${escape(resume.name)}</h1>` : ''}${resume.headline ? `<p class="headline">${escape(resume.headline)}</p>` : ''}`;
  const contact = resume.contact ? `<p class="contact">${escape(resume.contact)}</p>` : '';
  const section = (s: ResumeSection) => `<section><h2>${escape(s.title)}</h2><div class="section-body">${s.items.map(item => `<p class="entry">${escape(item)}</p>`).join('')}</div></section>`;
  const summary = resume.summary ? section({ title: 'Profile', items: [resume.summary] }) : '';
  const supportTitles = /skill|education|language|certif|interest|tool|contact/i;
  const support = resume.sections.filter(s => supportTitles.test(s.title));
  const primary = resume.sections.filter(s => !supportTitles.test(s.title));
  const all = resume.sections.map(section).join('');
  let body = `<header>${identity}${contact}</header>${summary}${all}`;
  if (template === 'modern' || template === 'professional') {
    body = `<div class="sidebar-layout"><aside>${contact ? `<section><h2>Contact</h2>${contact}</section>` : ''}${support.map(section).join('')}</aside><article><header>${identity}</header>${summary}${primary.map(section).join('')}</article></div>`;
  } else if (template === 'compact' || template === 'banner') {
    body = `<header>${identity}${contact}</header>${summary}<div class="columns">${all}</div>`;
  } else if (template === 'technical') {
    const skills = resume.sections.filter(s => /skill|tool|technolog/i.test(s.title));
    const rest = resume.sections.filter(s => !skills.includes(s));
    body = `<header>${identity}${contact}</header>${skills.length ? `<div class="skills-strip">${skills.map(section).join('')}</div>` : ''}${summary}<div class="columns">${rest.map(section).join('')}</div>`;
  } else if (template === 'executive' || template === 'editorial') {
    body = `<header class="split-header"><div>${identity}</div><div>${contact}</div></header>${summary}${all}`;
  }
  if (template === 'portfolio') {
    body = `<header>${identity}${contact}</header><div class="portfolio-layout"><article>${summary}${primary.map(section).join('')}</article><aside>${support.map(section).join('')}</aside></div>`;
  } else if (template === 'ribbon') {
    body = `<header>${identity}</header>${contact ? `<div class="contact-strip">${contact}</div>` : ''}${summary}${all}`;
  } else if (template === 'cards') {
    body = `<header>${identity}${contact}</header>${summary}<div class="card-grid">${all}</div>`;
  } else if (template === 'ledger') {
    const numbered = (s: ResumeSection, i: number) => section(s).replace('<h2>', `<h2><span class="section-number">${String(i + 1).padStart(2, '0')}</span>`);
    const sections = [...(resume.summary ? [{ title: 'Profile', items: [resume.summary] }] : []), ...resume.sections];
    body = `<header>${identity}${contact}</header>${sections.map(numbered).join('')}`;
  } else if (template === 'spotlight') {
    const initials = resume.name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0] || '').join('').toUpperCase();
    body = `<header class="spotlight-header">${initials ? `<div class="initials">${escape(initials)}</div>` : ''}<div>${identity}${contact}</div></header>${summary}${all}`;
  } else if (template === 'horizon') {
    body = `<header>${identity}</header>${contact ? `<div class="contact-strip">${contact}</div>` : ''}${summary}${primary.map(section).join('')}${support.length ? `<div class="credentials-band">${support.map(section).join('')}</div>` : ''}`;
  }
  const variants: Record<ResumeTemplate, string> = {
    portfolio: `header { border-bottom: 6px solid ${color}; } h1 { font-size: 35pt; color: #20252b; } .portfolio-layout { display: grid; grid-template-columns: minmax(0, 1fr) 28%; gap: 26px; } aside { border-left: 2px solid ${color}; padding-left: 16px; } aside h2 { font-size: 9pt; } aside p { font-size: 9pt; } article h2 { font-size: 12pt; text-transform: none; letter-spacing: 0; } article .entry { border-left: 3px solid #e2e8f0; padding-left: 12px; margin-bottom: 14px; }`,
    ribbon: `header { border: 0; padding-bottom: 6px; } h1 { font-size: 33pt; letter-spacing: 1px; } .contact-strip { border-top: 1px solid ${color}; border-bottom: 1px solid ${color}; padding: 9px 0; margin-bottom: 22px; } .contact-strip p { margin: 0; } h2 { color: white; background: ${ink}; padding: 7px 12px; font-size: 9pt; letter-spacing: 2px; } .section-body { padding: 4px 12px; }`,
    cards: `header { text-align: center; border: 0; padding-bottom: 22px; } h1 { font-size: 33pt; font-weight: 400; } .card-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; } .card-grid section { border: 1px solid #d8dee6; border-top: 4px solid ${color}; padding: 14px; } .card-grid h2 { font-size: 10pt; margin: 0 0 10px; } .card-grid p { font-size: 10pt; }`,
    ledger: `header { border-top: 7px solid ${color}; border-bottom: 1px solid #20252b; padding: 20px 0; } h1 { font-family: Georgia, serif; font-size: 30pt; color: #20252b; } section { display: grid; grid-template-columns: 105px minmax(0, 1fr); gap: 22px; border-bottom: 1px solid #d8dee6; padding: 19px 0; } h2 { margin: 0; font-size: 9pt; letter-spacing: .5px; } .section-number { display: block; font-size: 28pt; font-weight: 400; line-height: 1.2; margin-bottom: 8px; color: ${ink}; }`,
    spotlight: `.spotlight-header { display: flex; align-items: center; gap: 25px; border-bottom: 3px solid ${color}; padding-bottom: 25px; } .spotlight-header > div:last-child { min-width: 0; } .initials { flex: 0 0 95px; width: 95px; height: 95px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28pt; font-weight: bold; background: ${ink}; color: white; } h1 { font-size: 29pt; } h2 { text-transform: none; font-size: 14pt; letter-spacing: 0; border-bottom: 1px solid #d8dee6; padding-bottom: 7px; }`,
    horizon: `header { border: 0; text-align: center; padding-bottom: 4px; } h1 { font: bold 34pt Georgia, serif; } .contact-strip { text-align: center; background: ${ink}; color: white; padding: 10px 14px; margin-bottom: 24px; } .contact-strip p { margin: 0; } h2 { font-size: 10pt; border-bottom: 1px solid ${color}; padding-bottom: 5px; } .credentials-band { margin-top: 22px; background: ${color}12; border-top: 4px solid ${color}; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; padding: 16px; } .credentials-band h2 { margin-top: 0; font-size: 9pt; } .credentials-band p { font-size: 10pt; }`,
    classic: '',
    modern: `.sidebar-layout { display: grid; grid-template-columns: 30% minmax(0, 1fr); gap: 26px; } aside { background: ${ink}; color: white; padding: 24px 18px; } aside h2 { color: white; font-size: 9pt; border-bottom: 1px solid #ffffff55; padding-bottom: 6px; } aside p { font-size: 9pt; } article { min-width: 0; padding: 24px 24px 24px 0; } header { border: 0; } h1 { font-size: 29pt; } article h2 { border-bottom: 2px solid ${color}; padding-bottom: 5px; }`,
    elegant: `body { font-family: Georgia, serif; } header { text-align: center; border-bottom: 3px double ${ink}; padding-bottom: 22px; } h1 { font-size: 32pt; } h2 { text-align: center; font-size: 11pt; letter-spacing: 2px; margin-top: 24px; }`,
    compact: `body { font-size: 9.5pt; line-height: 1.45; } h1 { font-size: 25pt; } header { display: grid; grid-template-columns: 1fr 1fr; column-gap: 20px; } header h1, header .headline { grid-column: 1; } header .contact { grid-column: 2; grid-row: 1 / span 2; text-align: right; } .columns { column-count: 2; column-gap: 24px; column-rule: 1px solid #d8dee6; } h2 { font-size: 9pt; margin-top: 13px; }`,
    executive: `.split-header { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; border-bottom: 5px solid ${ink}; padding-bottom: 24px; } .contact { text-align: right; } section { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 18px; border-bottom: 1px solid #d8dee6; padding: 18px 0 10px; } h2 { margin: 0; font-size: 9pt; } h1 { color: #20252b; font-size: 29pt; }`,
    minimal: `header { border: 0; padding-bottom: 24px; } h1 { color: #20252b; font-weight: 400; font-size: 35pt; } .headline { color: ${ink}; } h2 { font-size: 9pt; letter-spacing: 2px; margin-top: 28px; } section { border-top: 1px solid #e2e8f0; padding-top: 4px; }`,
    professional: `.sidebar-layout { display: grid; grid-template-columns: 28% minmax(0, 1fr); gap: 28px; } aside { background: ${color}12; border-top: 7px solid ${color}; padding: 22px 16px; } aside h2 { font-size: 9pt; letter-spacing: .5px; } aside p { font-size: 9pt; } article { min-width: 0; padding: 24px 24px 24px 0; } header { border-bottom: 2px solid ${color}; } h1 { font-size: 28pt; } article h2 { background: #f1f5f9; padding: 6px 10px; }`,
    academic: `body { font-family: Georgia, serif; } header { text-align: center; border-bottom: 1px solid #20252b; } h1 { font-size: 25pt; color: #20252b; } h2 { text-transform: none; font-size: 13pt; letter-spacing: 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; } .entry { padding-left: 16px; text-indent: -16px; }`,
    technical: `body { font-size: 10pt; } header { border-bottom: 2px dashed ${color}; } h1, h2, .contact { font-family: 'Courier New', monospace; } h1 { font-size: 28pt; } h2 { font-size: 10pt; letter-spacing: 0; } h2::before { content: '> '; } .skills-strip { background: ${color}12; border-left: 4px solid ${color}; padding: 12px 16px; margin-bottom: 20px; } .skills-strip h2 { margin: 0 0 7px; } .columns { column-count: 2; column-gap: 28px; }`,
    editorial: `.split-header { display: grid; grid-template-columns: 3fr 2fr; gap: 30px; border-bottom: 7px solid ${color}; padding-bottom: 25px; } h1 { font: bold 38pt/1.05 Georgia, serif; color: #20252b; } .contact { padding-top: 8px; } section { display: grid; grid-template-columns: 135px minmax(0, 1fr); gap: 24px; padding: 20px 0 12px; border-bottom: 1px solid #e2e8f0; } h2 { text-transform: none; font: bold 13pt Georgia, serif; margin: 0; letter-spacing: 0; }`,
    timeline: `header { border: 0; border-left: 6px solid ${color}; padding-left: 18px; } section { padding-left: 24px; } .section-body { border-left: 2px solid ${color}; padding-left: 20px; } .entry { position: relative; padding-bottom: 14px; } .entry::before { content: ''; position: absolute; left: -26px; top: 5px; width: 10px; height: 10px; border-radius: 50%; background: ${ink}; } h2 { margin-top: 22px; }`,
    banner: `header { background: ${ink}; color: white; border: 0; padding: 26px; text-align: center; } h1 { color: white; font-size: 32pt; } .columns { column-count: 2; column-gap: 30px; } h2 { border-bottom: 1px solid ${color}; padding-bottom: 6px; font-size: 10pt; letter-spacing: 1.5px; }`,
  };
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; } body { margin: 0; color: #20252b; background: white; font: 11pt/1.5 Arial, sans-serif; overflow-wrap: anywhere; }
  main { padding: 60px; } header { margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid ${color}; }
  h1 { font-size: 30pt; line-height: 1.15; margin: 0 0 7px; color: ${ink}; } .headline { font-size: 13pt; margin: 0 0 5px; } .contact { font-size: 9pt; white-space: pre-line; } h2 { color: ${ink}; font-size: 11pt; margin: 19px 0 7px; text-transform: uppercase; letter-spacing: 1px; break-after: avoid; }
  p { margin: 0 0 8px; white-space: pre-line; } .entry { break-inside: avoid; } article, aside, .section-body { min-width: 0; }
  ${variants[template]}
  @media print { main { padding: 0; } }
  </style></head><body><main class="${template}">${body}</main></body></html>`;
}
