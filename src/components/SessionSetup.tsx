import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/auth.context';
import { AI_BEHAVIOR_CUSTOM_LIMIT, AI_BEHAVIOR_SCENARIOS, AiBehaviorSettings, getAiBehaviorSettings, getDefaultBehaviorPrompt, saveAiBehaviorSettings } from '../lib/aiBehaviorSettings';
import { SessionSetupDetails } from '../lib/sessionSetup';
import { getOverlayAppearance, getDefaultOverlayOpacity, clampOverlayOpacity } from '../lib/overlayAppearance';
import { useResolvedTheme } from '../hooks/useResolvedTheme';
import icon from './icon.png';
import './SessionSetup.css';
import { WHISPER_LANGUAGES } from '../lib/whisperLanguages';

interface Props {
    onCancel: () => void;
    onUpgrade: () => void;
    onComplete: (details: SessionSetupDetails) => Promise<void>;
}

const inputClass = 'w-full rounded-xl border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500';
const primaryClass = 'session-setup-primary rounded-full px-6 py-2.5 text-sm font-semibold active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

export default function SessionSetup({ onCancel, onUpgrade, onComplete }: Props) {
    const theme = useResolvedTheme();
    const [opacity, setOpacity] = useState(() => {
        const stored = localStorage.getItem('natively_overlay_opacity');
        const value = stored === null ? NaN : Number(stored);
        return Number.isFinite(value) ? clampOverlayOpacity(value) : getDefaultOverlayOpacity();
    });
    const appearance = getOverlayAppearance(opacity, theme);
    const { user, planStatus, refreshProfile, isSyncing } = useAuth();
    const [step, setStep] = useState<'access' | 'details' | 'preferences'>('access');
    const [details, setDetails] = useState<SessionSetupDetails>({ sessionType: 'interview', company: '', position: '', title: '', language: 'english-us', useResume: false, referenceDocs: [] });
    const [behavior, setBehavior] = useState<AiBehaviorSettings>(getAiBehaviorSettings);
    const [savedBehavior, setSavedBehavior] = useState<AiBehaviorSettings>(getAiBehaviorSettings);
    const [savedScenario, setSavedScenario] = useState<string | null>(null);
    const [profile, setProfile] = useState<{ hasProfile: boolean; name?: string }>({ hasProfile: false });
    const [languages, setLanguages] = useState<Record<string, { label: string; group?: string }>>({ 'english-us': { label: 'English (US)' } });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const heading = useRef<HTMLHeadingElement>(null);
    const initialized = useRef(false);
    const isFree = planStatus?.plan === 'free';
    const localUsed = user ? Number(localStorage.getItem(`cluegent_free_trial_local_used_seconds_${user.uid}`) || 0) : 0;
    const remaining = planStatus ? Math.max(0, isFree ? Math.min(planStatus.remaining.sttSeconds, 720 - (Number.isFinite(localUsed) ? localUsed : 0)) : planStatus.remaining.sttSeconds) : 0;
    const update = (patch: Partial<SessionSetupDetails>) => setDetails(current => ({ ...current, ...patch }));

    useEffect(() => {
        const unsubscribe = window.electronAPI?.onOverlayOpacityChanged?.(setOpacity);
        const updateOpacity = (event: StorageEvent) => {
            if (event.key === 'natively_overlay_opacity') {
                const value = Number(event.newValue);
                setOpacity(event.newValue !== null && Number.isFinite(value) ? clampOverlayOpacity(value) : getDefaultOverlayOpacity());
            }
        };
        window.addEventListener('storage', updateOpacity);
        return () => { unsubscribe?.(); window.removeEventListener('storage', updateOpacity); };
    }, []);

    useEffect(() => {
        void refreshProfile();
        let mounted = true;
        Promise.all([window.electronAPI.profileGetStatus(), window.electronAPI.getRecognitionLanguages(), window.electronAPI.getSttLanguage()]).then(([status, options, language]) => {
            if (!mounted) return;
            setProfile(status);
            update({ useResume: status.hasProfile && status.profileMode, language: language || 'english-us' });
            setLanguages(options);
        }).catch(e => { if (mounted) setError(e.message || 'Could not load session settings.'); });
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (planStatus && !initialized.current) {
            initialized.current = true;
            setStep(planStatus.plan === 'free' ? 'access' : 'details');
        }
        if (step === 'access' && planStatus?.plan !== 'free' && planStatus) setStep('details');
    }, [planStatus, step]);

    useEffect(() => { heading.current?.focus(); }, [step]);

    async function uploadResume() {
        setBusy(true); setError('');
        try {
            const file = await window.electronAPI.profileSelectFile();
            if (file.cancelled) return;
            if (!file.filePath) throw new Error(file.error || 'Could not select a resume.');
            const result = await window.electronAPI.profileUploadResume(file.filePath);
            if (!result.success) throw new Error(result.error || 'Resume upload failed.');
            const modeResult = await window.electronAPI.profileSetMode(true);
            if (!modeResult.success) throw new Error(modeResult.error || 'Could not enable Resume Context.');
            setProfile(await window.electronAPI.profileGetStatus());
            update({ useResume: true });
        } catch (e) { setError(e instanceof Error ? e.message : 'Resume upload failed.'); }
        finally { setBusy(false); }
    }

    async function uploadReference() {
        setBusy(true); setError('');
        try {
            const result = await window.electronAPI.sessionSelectReference();
            if (result.cancelled) return;
            if (!result.success || !result.document) throw new Error(result.error || 'Could not read document.');
            setDetails(current => ({ ...current, referenceDocs: [...current.referenceDocs, result.document!] }));
        } catch (e) { setError(e instanceof Error ? e.message : 'Document upload failed.'); }
        finally { setBusy(false); }
    }

    async function finish() {
        setBusy(true); setError('');
        try {
            if (!planStatus || remaining <= 0) throw new Error('Your listening allowance is exhausted. Upgrade to continue.');
            if ([behavior.rolling, behavior.screenshot].some(setting => setting.mode === 'custom' && !setting.customPrompt.trim())) throw new Error('Enter custom instructions or select Default behavior.');
            saveAiBehaviorSettings(behavior);
            await onComplete(details);
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not start Cluegent.'); }
        finally { setBusy(false); }
    }

    function saveBehavior(scenario: 'rolling' | 'screenshot') {
        const setting = behavior[scenario];
        if (setting.mode === 'custom' && !setting.customPrompt.trim()) {
            setError('Enter custom instructions before saving.');
            return;
        }
        try {
            const next = { ...getAiBehaviorSettings(), [scenario]: setting };
            saveAiBehaviorSettings(next);
            setSavedBehavior(current => ({ ...current, [scenario]: setting }));
            setSavedScenario(scenario);
            setError('');
        } catch {
            setError('Could not save behavior. Please try again.');
        }
    }

    return <div className="session-setup-backdrop absolute inset-0 z-20 flex items-center justify-center p-3 sm:p-5" onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape' && !busy) onCancel(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="session-setup-title" className="cluegent-session-setup cluegent-overlay-shell flex max-h-full w-full max-w-[740px] flex-col overflow-hidden font-sans" style={{
          ...appearance.shellStyle,
          '--session-input-bg': appearance.inputStyle.backgroundColor,
          '--session-control-bg': appearance.controlStyle.backgroundColor,
          '--session-subtle-bg': appearance.subtleStyle.backgroundColor,
          '--session-border': appearance.inputStyle.borderColor,
      } as React.CSSProperties}>
        <header className="m-3 flex shrink-0 items-center justify-between rounded-full border px-2 py-2" style={appearance.pillStyle}>
            <div className="flex items-center gap-2.5 pl-1"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white"><img src={icon} alt="" className="h-6 w-6 object-contain" draggable={false} /></span><span className="text-[13px] font-semibold text-white">Cluegent <span className="ml-2 font-normal text-white/55">New session</span></span></div>
            <div className="flex items-center gap-2">{isFree && <span className="rounded-full border px-3 py-1.5 font-mono text-[11px] text-white/80" style={appearance.chipStyle}>{Math.floor(remaining / 60)}:{Math.floor(remaining % 60).toString().padStart(2, '0')} left</span>}<button aria-label="Close session setup" disabled={busy} onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/15 text-xl text-red-300 transition-colors hover:bg-red-500/30">×</button></div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7">
            <div className="mx-auto max-w-2xl">
                <nav aria-label="Session setup progress" className="mb-5 flex gap-2 text-xs font-semibold text-text-tertiary">
                    {['access', 'details', 'preferences'].filter(item => isFree || item !== 'access').map(item => <span key={item} aria-current={item === step ? 'step' : undefined} className={`rounded-full border px-3 py-1.5 ${item === step ? 'border-white/20 bg-white/10 text-white' : 'border-transparent text-white/45'}`}>{item === 'access' ? 'Session' : item === 'details' ? 'Details' : 'Preferences'}</span>)}
                </nav>
                <h1 id="session-setup-title" ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">{step === 'access' ? 'Your free session' : step === 'details' ? 'Set up your session' : 'How should Cluegent answer?'}</h1>
                <p className="mt-2 mb-6 text-sm text-text-secondary">{step === 'access' ? 'Choose how you want to continue.' : step === 'details' ? 'Add context for answers tailored to this conversation.' : 'Use your saved Customize settings or adjust them for this session.'}</p>
                {!planStatus ? <div className="rounded-xl border border-border-subtle p-6"><p>Loading your session allowance…</p><button onClick={() => void refreshProfile()} disabled={isSyncing} className="mt-3 text-sm underline">Retry</button></div> : step === 'access' ? <div className="rounded-2xl border border-border-subtle bg-bg-item-surface p-6">
                    <p className="text-lg font-semibold">Free session <span className="ml-2 text-emerald-500">12 mins</span></p>
                    <p className="mt-2 text-sm text-text-secondary">{Math.floor(remaining / 60)}m {Math.floor(remaining % 60)}s remaining in your free trial.</p>
                    <div className="mt-6 flex flex-wrap gap-3"><button disabled={remaining <= 0 || busy} onClick={() => setStep('details')} className={primaryClass}>Continue with free session</button><button onClick={onUpgrade} className="rounded-full border border-border-subtle px-6 py-2.5 text-sm font-semibold hover:bg-bg-input">Upgrade</button></div>
                    {remaining <= 0 && <p className="mt-4 text-sm text-text-secondary">Your free trial is used up. Upgrade to start another session.</p>}
                </div> : step === 'details' ? <div className="space-y-5">
                    <fieldset><legend className="mb-2 text-sm font-medium">Session type</legend><div className="grid grid-cols-2 gap-2 rounded-xl bg-bg-input p-1">{(['interview', 'meeting'] as const).map(type => <button key={type} type="button" aria-pressed={details.sessionType === type} onClick={() => update({ sessionType: type })} className={`rounded-lg py-2 text-sm font-semibold ${details.sessionType === type ? 'bg-emerald-500/15 text-emerald-500' : 'text-text-secondary'}`}>{type === 'interview' ? 'Interview' : 'Meeting'}</button>)}</div></fieldset>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="space-y-2 text-sm">Company <span className="text-text-tertiary">(optional)</span><input className={`${inputClass} mt-2`} value={details.company} maxLength={120} onChange={e => update({ company: e.target.value })} placeholder="Company name" /></label>
                        <label className="space-y-2 text-sm">{details.sessionType === 'interview' ? 'Position' : 'Meeting goal'} <span className="text-text-tertiary">(optional)</span><input className={`${inputClass} mt-2`} value={details.sessionType === 'interview' ? details.position : details.title} maxLength={200} onChange={e => update(details.sessionType === 'interview' ? { position: e.target.value } : { title: e.target.value })} placeholder={details.sessionType === 'interview' ? 'Software engineer' : 'What are you discussing?'} /></label>
                        <div className="text-sm sm:col-span-2">
                            <label htmlFor="session-conversation-language">Conversation language</label>
                            <select id="session-conversation-language" className={`${inputClass} mt-2`} value={details.language} onChange={e => update({ language: e.target.value })}>{Object.entries(languages).map(([code, option]) => <option key={code} value={code}>{code === 'auto' ? 'Auto Detect (99+ languages)' : option.group === 'English' ? `English — ${option.label}` : option.label}</option>)}</select>
                            {details.language === 'auto' && <details className="mt-2 rounded-xl border border-border-subtle bg-bg-input px-3 py-2">
                                <summary className="cursor-pointer text-xs text-text-secondary">View languages (99+)</summary>
                                <p className="mt-2 text-xs text-text-secondary">detects the spoken language automatically. Accuracy varies by language.</p>
                                <ul aria-label="Auto-detect languages" className="mt-3 grid max-h-40 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto text-xs sm:grid-cols-3">{WHISPER_LANGUAGES.map(language => <li key={language}>{language}</li>)}</ul>
                            </details>}
                        </div>
                        <div><label htmlFor="session-resume" className="text-sm">Select resume <span className="text-text-tertiary">(optional)</span></label><select id="session-resume" className={`${inputClass} mt-2`} value={details.useResume ? 'yes' : 'no'} onChange={e => update({ useResume: e.target.value === 'yes' })}><option value="no">Continue without resume</option>{profile.hasProfile && <option value="yes">{profile.name ? `${profile.name}'s resume` : 'Saved resume'}</option>}</select><button disabled={busy} onClick={() => void uploadResume()} className="mt-2 text-xs font-semibold text-emerald-500">{profile.hasProfile ? 'Replace resume' : '+ Upload resume'}</button></div>
                        <div><p className="text-sm">Reference documents <span className="text-text-tertiary">(optional)</span></p><button disabled={busy || details.referenceDocs.length >= 3} onClick={() => void uploadReference()} className={`${inputClass} mt-2 text-left`}>+ Add document</button><p className="mt-1 text-xs text-text-tertiary">PDF, DOCX, TXT or Markdown · up to 3. Uses the first 3,000 characters of each document.</p></div>
                    </div>
                    {details.referenceDocs.map((doc, index) => <div key={`${doc.name}-${index}`} className="flex items-center justify-between rounded-xl border border-border-subtle px-3 py-2 text-sm"><span className="truncate">{doc.name}</span><button aria-label={`Remove ${doc.name}`} onClick={() => update({ referenceDocs: details.referenceDocs.filter((_, i) => i !== index) })} className="ml-3 text-text-secondary">Remove</button></div>)}
                </div> : <div className="space-y-4">{AI_BEHAVIOR_SCENARIOS.filter(scenario => scenario.id !== 'typed').map(scenario => {
                    const setting = behavior[scenario.id];
                    const dirty = JSON.stringify(setting) !== JSON.stringify(savedBehavior[scenario.id]);
                    return <section key={scenario.id} className="rounded-2xl border border-border-subtle bg-bg-item-surface p-5">
                        <h2 className="text-base font-semibold">{scenario.id === 'screenshot' ? 'Screen analysis response' : scenario.title}</h2><p className="mt-1 mb-4 text-xs text-text-secondary">{scenario.description}</p>
                        {(['default', 'custom'] as const).map(mode => <div key={mode} className={`mb-3 rounded-xl border p-3 ${setting.mode === mode ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border-subtle'}`}>
                            <label className="mb-2 flex items-center gap-2 text-sm font-medium"><input type="radio" name={scenario.id} checked={setting.mode === mode} onChange={() => setBehavior(current => ({ ...current, [scenario.id]: { ...current[scenario.id], mode } }))} className="accent-emerald-500" />{mode === 'default' ? 'Default behavior' : 'Your custom behavior'}</label>
                            <textarea aria-label={`${scenario.title} ${mode} instructions`} rows={3} maxLength={AI_BEHAVIOR_CUSTOM_LIMIT} className={`${inputClass} resize-y text-xs leading-relaxed`} value={mode === 'default' ? setting.defaultPrompt || getDefaultBehaviorPrompt(scenario.id) : setting.customPrompt} placeholder={scenario.placeholder} onChange={e => setBehavior(current => ({ ...current, [scenario.id]: { ...current[scenario.id], mode, [mode === 'default' ? 'defaultPrompt' : 'customPrompt']: e.target.value } }))} />
                            {mode === 'custom' && <p className="mt-1 text-right text-xs text-text-tertiary">{setting.customPrompt.length}/{AI_BEHAVIOR_CUSTOM_LIMIT}</p>}
                        </div>)}
                        <div className="flex items-center justify-end gap-3">
                            {savedScenario === scenario.id && !dirty && <span role="status" className="text-xs text-emerald-400">Saved</span>}
                            {dirty && <button type="button" disabled={busy || (setting.mode === 'custom' && !setting.customPrompt.trim())} aria-label={`Save ${scenario.id === 'rolling' ? 'listening' : 'screen analysis'} behavior`} onClick={() => saveBehavior(scenario.id as 'rolling' | 'screenshot')} className={primaryClass}>Save behavior</button>}
                        </div>
                    </section>;
                })}</div>}
                {busy && <p role="status" className="mt-4 text-sm text-text-secondary">Preparing your session…</p>}
                {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
            </div>
        </div>
        {step !== 'access' && <footer className="flex shrink-0 items-center justify-between border-t border-white/10 px-5 py-4 sm:px-7">
            <button disabled={busy} onClick={() => { setError(''); if (step === 'preferences') setStep('details'); else if (isFree) setStep('access'); else onCancel(); }} className="px-3 py-2 text-sm font-semibold text-text-secondary">Back</button>
            <button disabled={busy || !planStatus} onClick={() => step === 'details' ? setStep('preferences') : void finish()} className={primaryClass}>{busy ? 'Preparing…' : step === 'details' ? 'Continue' : 'Open Cluegent'}</button>
        </footer>}
      </div>
    </div>;
}
