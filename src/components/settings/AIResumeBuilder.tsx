import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Eye, FileText, Loader2, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../contexts/auth.context';
import { app, auth } from '../../firebase';
import { parseResumeReply, renderResumeHtml, RESUME_TEMPLATES, RESUME_TEMPLATE_DESCRIPTIONS, ResumeData, ResumeTemplate } from '../../../shared/resume';

interface ResumeAccess { allowed: boolean; limit: number | null; used: number; remaining: number | null; message: string }
async function fetchResumeAccess(): Promise<ResumeAccess> {
  if (!auth.currentUser) return { allowed: false, limit: null, used: 0, remaining: null, message: 'Please sign in and subscribe to use AI Resume Builder.' };
  const call = httpsCallable<{ action: 'status' }, { success: boolean; access: ResumeAccess }>(getFunctions(app, 'asia-south1'), 'generateResumeAsia', { timeout: 120000 });
  const response = await call({ action: 'status' });
  if (!response.data.success || !response.data.access) throw new Error('Could not check your resume allowance. Please try again.');
  return response.data.access;
}

const COLORS = ['#334155', '#2563eb', '#0f766e', '#7c3aed', '#9f1239', '#a16207'];
const TEMPLATE_SAMPLE: ResumeData = { name: 'Alex Morgan', headline: 'Product Designer', contact: 'alex@example.com · London', summary: 'Thoughtful design, clear communication, and a focus on building useful products.', sections: [{ title: 'Experience', items: ['Senior Designer · Studio North\n2022 – Present\nLed product design across web and mobile experiences.'] }, { title: 'Education', items: ['BA Design · University of Arts\n2018 – 2022'] }, { title: 'Skills', items: ['Research · Product strategy · Prototyping'] }] };
const EMPTY: ResumeData = { name: '', headline: '', contact: '', summary: '', sections: [] };
const inputClass = 'w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary hover:bg-bg-item-active disabled:opacity-50 disabled:cursor-not-allowed';

function TemplatePreviewDialog({ template, resume, color, sample, busy, error, notice, onDownload, onClose, onSelect }: { template: ResumeTemplate; resume: ResumeData; color: string; sample: boolean; busy: boolean; error: string; notice: string; onDownload: () => void; onClose: () => void; onSelect: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => { if (node.open) node.close(); };
  }, []);
  useEffect(() => {
    const node = paper.current!;
    const observer = new ResizeObserver(() => setScale(Math.min(1, node.clientWidth / 794)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return createPortal(<dialog ref={dialog} aria-labelledby="resume-template-preview-title" onCancel={onClose} onKeyDown={e => { if (e.key === 'Escape') e.stopPropagation(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }} className="w-[min(960px,94vw)] max-h-[92vh] rounded-2xl border border-border-subtle bg-bg-card p-0 text-text-primary shadow-2xl backdrop:bg-black/60">
    <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-4"><div><h3 id="resume-template-preview-title" className="text-lg font-semibold capitalize">{template} preview</h3><p className="text-xs text-text-secondary">{RESUME_TEMPLATE_DESCRIPTIONS[template]} · {sample ? 'Sample content' : 'Your resume'}</p></div><button autoFocus className={buttonClass} aria-label="Close template preview" onClick={onClose}><X size={18} /></button></div>
    <div className="max-h-[65vh] overflow-y-auto bg-bg-input px-4 py-5"><div ref={paper} className="mx-auto w-full max-w-[794px] overflow-hidden rounded-sm bg-white" style={{ height: 1123 * scale }}><iframe title="Template preview document" sandbox="" srcDoc={renderResumeHtml(resume, template, color)} style={{ width: 794, height: 1123, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left' }} /></div></div>
    <div className="border-t border-border-subtle px-5 py-4 space-y-3">
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {notice && <p role="status" className="text-xs text-text-secondary">{notice}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-text-secondary">Scroll inside the document for longer resumes.</p><div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={busy} onClick={onSelect}>Use this template</button>{!sample && <button className={`${buttonClass} bg-blue-600 !text-white hover:!bg-blue-700`} disabled={busy} onClick={onDownload}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}{busy ? 'Saving…' : 'Download PDF'}</button>}</div></div>
    </div>
  </dialog>, document.body);
}

export function AIResumeBuilder({ active = true, onSubscribe }: { active?: boolean; onSubscribe?: () => void }) {
  const { user, subscription } = useAuth();
  const [access, setAccess] = useState<ResumeAccess | null>(null);
  const [accessError, setAccessError] = useState('');
  useEffect(() => {
    if (!active) return;
    let mounted = true;
    let pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try { const next = await fetchResumeAccess(); if (mounted) { setAccess(next); setAccessError(''); } }
      catch (e) { if (mounted) { setAccess(null); setAccessError(e instanceof Error ? e.message : 'Could not check your plan.'); } }
      finally { pending = false; }
    };
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { mounted = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [active, user?.uid, subscription?.plan, subscription?.status, subscription?.startedAt, subscription?.orderId, subscription?.expiresAt, subscription?.planSttSecondsUsed]);
  const [description, setDescription] = useState('');
  const [document, setDocument] = useState<{ name: string; content: string } | null>(null);
  const [resume, setResume] = useState<ResumeData>(EMPTY);
  const [previewTemplate, setPreviewTemplate] = useState<ResumeTemplate | null>(null);
  const [template, setTemplate] = useState<ResumeTemplate>('classic');
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState<'import' | 'generate' | 'export' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [generated, setGenerated] = useState(false);
  const source = [document?.content, description].filter(Boolean).join('\n\n');
  const html = useMemo(() => {
    try { return renderResumeHtml(resume, template, color); } catch { return ''; }
  }, [resume, template, color]);
  const valid = Boolean(html && (resume.name || resume.summary || resume.sections.some(s => s.items.some(Boolean))));

  async function importDocument() {
    setBusy('import'); setError(''); setNotice('');
    try {
      if (!window.electronAPI?.resumeBuilderImport) throw new Error('Document import is available in the Cluegent desktop app.');
      const result = await window.electronAPI.resumeBuilderImport();
      if (result.cancelled) return;
      if (!result.success || !result.document) throw new Error(result.error || 'Could not import resume.');
      setDocument(result.document);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not import resume.'); }
    finally { setBusy(null); }
  }
  async function generate() {
    if (!access?.allowed) { setError(access?.message || 'Please subscribe to use AI Resume Builder.'); return; }
    if (generated && !window.confirm('Generating again will replace your edited resume. Continue?')) return;
    setBusy('generate'); setError(''); setNotice('');
    try {
      if (!auth.currentUser) throw new Error('Sign in to generate your resume.');
      const call = httpsCallable<{ source: string }, { success: boolean; reply?: string; message?: string; access?: ResumeAccess }>(getFunctions(app, 'asia-south1'), 'generateResumeAsia', { timeout: 120000 });
      const result = await call({ source });
      if (result.data.access) setAccess(result.data.access);
      if (!result.data.success || !result.data.reply) throw new Error(result.data.message || 'Could not generate resume.');
      setResume(parseResumeReply(result.data.reply)); setGenerated(true);
      setNotice('Resume generated. Review the details before downloading.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate resume.');
      try { setAccess(await fetchResumeAccess()); } catch { setAccess(null); }
    }
    finally { setBusy(null); }
  }
  async function download(exportTemplate: ResumeTemplate = template) {
    setBusy('export'); setError(''); setNotice('');
    try {
      if (!window.electronAPI?.resumeBuilderExport) throw new Error('PDF download is available in the Cluegent desktop app.');
      const result = await window.electronAPI.resumeBuilderExport({ resume, template: exportTemplate, color });
      if (result.cancelled) return;
      if (!result.success) throw new Error(result.error || 'Could not download PDF.');
      setNotice('PDF saved successfully.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not download PDF.'); }
    finally { setBusy(null); }
  }
  function changeSection(index: number, patch: Partial<ResumeData['sections'][number]>) {
    setResume(current => ({ ...current, sections: current.sections.map((section, i) => i === index ? { ...section, ...patch } : section) }));
  }

  return <div className="space-y-6">
    {previewTemplate && <TemplatePreviewDialog template={previewTemplate} resume={valid ? resume : TEMPLATE_SAMPLE} sample={!valid} color={color} busy={!!busy} error={error} notice={notice} onDownload={() => download(previewTemplate)} onClose={() => setPreviewTemplate(null)} onSelect={() => { setTemplate(previewTemplate); setPreviewTemplate(null); }} />}
    <div><h2 className="text-xl font-semibold text-text-primary">AI Resume Builder</h2><p className="mt-1 text-sm text-text-secondary">Turn your experience into a resume. Choose a style, refine the details, and download your PDF.</p></div>
    <div className="rounded-xl border border-border-subtle bg-bg-card p-4 text-sm text-text-secondary" role="status">
      {access ? <><p>{access.limit === null && access.allowed ? 'Unlimited AI resume generation on your active plan.' : access.limit !== null ? `${access.used} of ${access.limit} AI resumes used · ${access.remaining} remaining` : ''}</p>{!access.allowed && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-amber-500">{access.message}</p>{onSubscribe && <button className={buttonClass} onClick={onSubscribe}>Subscribe / manage plan</button>}</div>}</> : <p>{accessError || 'Checking your plan and resume allowance…'}</p>}
    </div>
    <div className="rounded-xl border border-border-subtle bg-bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium text-text-primary">Your experience</h3><button className={buttonClass} onClick={importDocument} disabled={!!busy}>{busy === 'import' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}Upload PDF / DOCX</button></div>
      {document && <div className="flex items-center gap-2 rounded-lg bg-bg-input p-3 text-sm text-text-secondary"><FileText size={16} /><span className="min-w-0 flex-1 truncate">{document.name}</span><button className={buttonClass} disabled={!!busy} onClick={() => setDocument(null)} aria-label="Remove uploaded resume"><Trash2 size={14} /></button></div>}
      <label className="block text-sm text-text-primary" htmlFor="resume-description">Describe your experience or add instructions</label>
      <textarea id="resume-description" className={inputClass} rows={6} value={description} disabled={!!busy} maxLength={24000} onChange={e => setDescription(e.target.value)} placeholder="Your name and contact details, work experience, education, skills, projects, and the role you’re applying for…" />
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-text-secondary">PDF/DOCX up to 10 MB. Text-based PDFs only.<br />Generation sends these details to cloud AI and uses your plan’s AI allowance.</p><button className={`${buttonClass} bg-blue-600 !text-white hover:!bg-blue-700`} disabled={!!busy || !access?.allowed || source.trim().length < 30 || source.length > 24000} onClick={generate}>{busy === 'generate' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{busy === 'generate' ? 'Generating…' : 'Generate resume'}</button></div>
      {source.length > 24000 && <p className="text-sm text-red-500">Shorten the combined document and description to 24,000 characters.</p>}
    </div>
    {error && <p role="alert" className="rounded-lg border border-red-500/30 p-3 text-sm text-red-500">{error}</p>}
    {notice && <p role="status" className="text-sm text-text-secondary">{notice}</p>}
    <div className="rounded-xl border border-border-subtle bg-bg-card p-5 space-y-4">
      <h3 className="font-medium text-text-primary">Template & color</h3>
      <p className="text-xs text-text-secondary">{RESUME_TEMPLATES.length} layouts · Switch styles without generating again.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="group" aria-label="Resume template">{RESUME_TEMPLATES.map(t => <div key={t} className={`relative rounded-xl border border-border-subtle ${template === t ? 'ring-2 ring-blue-500 bg-bg-item-active' : ''}`}>
        <button aria-label={t} aria-pressed={template === t} onClick={() => setTemplate(t)} className="flex w-full flex-col items-center gap-3 rounded-xl px-3 pb-4 pt-9 text-text-primary hover:bg-bg-item-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <span aria-hidden="true" className="relative block h-[150px] w-[106px] overflow-hidden rounded-sm bg-white shadow-sm pointer-events-none">
            <iframe title={`${t} template thumbnail`} tabIndex={-1} sandbox="" srcDoc={renderResumeHtml(TEMPLATE_SAMPLE, t, color)} style={{ width: 794, height: 1123, border: 0, transform: 'scale(0.1335)', transformOrigin: 'top left', pointerEvents: 'none' }} />
          </span>
          <span className="text-sm font-medium capitalize">{t}</span><span className="text-center text-[11px] leading-4 text-text-secondary">{RESUME_TEMPLATE_DESCRIPTIONS[t]}</span>
        </button>
        <button aria-label={`Preview ${t} template`} title="Preview template" onClick={() => setPreviewTemplate(t)} className="absolute right-2 top-2 rounded-md border border-border-subtle bg-bg-card p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-item-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Eye size={15} /></button>
      </div>)}</div>
      <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-text-primary">Accent color</span>{COLORS.map(c => <button key={c} aria-label={`Use ${c} accent`} aria-pressed={color === c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full border-2 ${color === c ? 'ring-2 ring-offset-2 ring-blue-500' : 'border-transparent'}`} style={{ background: c }} />)}<label className="flex items-center gap-2 text-sm text-text-secondary">Custom<input aria-label="Custom accent color" type="color" value={color} onChange={e => setColor(e.target.value)} className="h-8 w-9 cursor-pointer" /></label></div>
    </div>
    {generated && <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium text-text-primary">Review & download</h3><button onClick={() => download()} disabled={!!busy || !valid} className={`${buttonClass} bg-blue-600 !text-white hover:!bg-blue-700`}>{busy === 'export' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}{busy === 'export' ? 'Saving…' : 'Download PDF'}</button></div>
      <p className="text-sm text-text-secondary">You can edit or add details below and see your changes instantly in the preview.</p>
      <div className="grid gap-5 xl:grid-cols-2"><fieldset disabled={!!busy} className="min-w-0 space-y-3">
        {(['name', 'headline', 'contact', 'summary'] as const).map(key => <div key={key}><label htmlFor={`resume-${key}`} className="block text-sm capitalize text-text-secondary">{key}</label><textarea id={`resume-${key}`} className={`${inputClass} mt-1`} rows={key === 'summary' ? 4 : key === 'contact' ? 2 : 1} maxLength={{ name: 150, headline: 250, contact: 600, summary: 2500 }[key]} value={resume[key]} onChange={e => setResume({ ...resume, [key]: e.target.value })} /></div>)}
        {resume.sections.map((section, i) => <div key={i} className="rounded-lg border border-border-subtle p-3 space-y-2"><div className="flex gap-2"><input aria-label={`Section ${i + 1} title`} className={inputClass} value={section.title} maxLength={100} onChange={e => changeSection(i, { title: e.target.value })} /><button className={buttonClass} aria-label={`Remove ${section.title} section`} onClick={() => setResume({ ...resume, sections: resume.sections.filter((_, index) => index !== i) })}><Trash2 size={14} /></button></div>{section.items.map((item, j) => <div key={j} className="flex items-start gap-2"><textarea aria-label={`${section.title} entry ${j + 1}`} className={inputClass} rows={4} maxLength={3000} value={item} onChange={e => changeSection(i, { items: section.items.map((text, index) => index === j ? e.target.value : text) })} /><button className={buttonClass} aria-label={`Remove entry ${j + 1}`} onClick={() => changeSection(i, { items: section.items.filter((_, index) => index !== j) })}><Trash2 size={14} /></button></div>)}<button className={buttonClass} disabled={section.items.length >= 40} onClick={() => changeSection(i, { items: [...section.items, ''] })}><Plus size={14} />Add entry</button></div>)}
        <button className={buttonClass} disabled={resume.sections.length >= 12} onClick={() => setResume({ ...resume, sections: [...resume.sections, { title: 'New section', items: [''] }] })}><Plus size={14} />Add section</button>
      </fieldset><div className="min-w-0"><p className="mb-2 text-xs text-text-secondary">Live preview · A4 PDF automatically continues onto additional pages</p>{html ? <iframe title="Resume preview" sandbox="" srcDoc={html} className="h-[750px] w-full rounded-lg border border-border-subtle bg-white" /> : <p role="alert" className="text-sm text-red-500">The resume is empty or too long to export. Shorten the content.</p>}</div></div>
    </div>}
  </div>;
}
