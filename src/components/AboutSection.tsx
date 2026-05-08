import React from 'react';
import { ExternalLink, Github, Globe, Info, LockKeyhole, Scale, ShieldCheck, Sparkles } from 'lucide-react';
import CluegentIcon from './icon.png';

export const AboutSection: React.FC = () => {
    const appVersion = import.meta.env.VITE_APP_VERSION || '2.5.0';

    const handleOpenLink = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
        e.preventDefault();

        if (window.electronAPI?.openExternal) {
            window.electronAPI.openExternal(url);
        } else {
            window.open(url, '_blank');
        }
    };

    return (
        <div className="space-y-5 animated fadeIn pb-10">
            <div>
                <h3 className="text-lg font-bold text-text-primary mb-1">About</h3>
                <p className="text-sm text-text-secondary">
                    Product information, privacy, license, and support.
                </p>
            </div>

            <section className="rounded-2xl border border-border-subtle bg-bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                            <img src={CluegentIcon} alt="Cluegent" className="h-10 w-10 object-contain" />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black tracking-tight text-text-primary">Cluegent</h4>
                            <p className="text-sm text-text-secondary">Version {appVersion}</p>
                        </div>
                    </div>

                    <a
                        href="https://www.cluegent.com"
                        onClick={(e) => handleOpenLink(e, 'https://www.cluegent.com')}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-text-primary px-4 py-2.5 text-sm font-bold text-bg-main transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                        <Globe size={16} />
                        Visit Website
                        <ExternalLink size={14} />
                    </a>
                </div>
            </section>

            <section className="rounded-2xl border border-border-subtle bg-bg-card p-5 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-text-primary">What Cluegent Does</h4>
                        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                            Cluegent is a real-time AI assistant for meetings, interviews, coding conversations, and
                            screen-based questions. It can listen when you start listening, answer typed prompts,
                            analyze screenshots to produce useful responses.
                            </p>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-border-subtle bg-bg-card p-5 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-text-primary">Privacy Statement</h4>
                        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                            Cluegent does not start listening until you choose to start listening. Screenshots are sent
                            only when you explicitly attach a screenshot. API keys stay on the backend, and
                            local meeting history/customization data is stored on this device unless a backend feature
                            explicitly requires syncing usage or entitlement data.
                        </p>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-border-subtle bg-bg-card p-5 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                        <Scale size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-text-primary">License & Source</h4>
                        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                            Cluegent is distributed under AGPL-3.0. The license and source-code availability link are
                            provided here for transparency and compliance.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <a
                                href="https://github.com/admincluegent/cluegent-app/blob/development/LICENSE"
                                onClick={(e) => handleOpenLink(e, 'https://github.com/admincluegent/cluegent-app/blob/development/LICENSE')}
                                className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-input px-4 py-2 text-sm font-bold text-text-primary transition-colors hover:bg-bg-item-active"
                            >
                                <Info size={16} />
                                License
                                <ExternalLink size={14} />
                            </a>
                            <a
                                href="https://github.com/admincluegent/cluegent-app"
                                onClick={(e) => handleOpenLink(e, 'https://github.com/admincluegent/cluegent-app')}
                                aria-label="Open Cluegent source code on GitHub"
                                title="Source code"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle bg-bg-input text-text-primary transition-colors hover:bg-bg-item-active"
                            >
                                <Github size={18} />
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-border-subtle bg-bg-card p-5 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-text-primary">
                        <LockKeyhole size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-text-primary">Contact & Support</h4>
                        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                            For support, privacy, or billing questions, contact admincluegent@gmail.com or visit the official Cluegent website.
                        </p>
                        <a
                            href="https://www.cluegent.com"
                            onClick={(e) => handleOpenLink(e, 'https://www.cluegent.com')}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-input px-4 py-2 text-sm font-bold text-text-primary transition-colors hover:bg-bg-item-active"
                        >
                            <Globe size={16} />
                            cluegent.com
                            <ExternalLink size={14} />
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
};
