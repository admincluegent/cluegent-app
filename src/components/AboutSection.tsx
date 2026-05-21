import React, { useState } from 'react';
import { ChevronDown, ExternalLink, Github, Globe, Info, LockKeyhole, Mail, MessageSquare, Scale, ShieldCheck, Sparkles } from 'lucide-react';
import CluegentIcon from './icon.png';

type AccordionItemProps = {
    icon: React.ReactNode;
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
};

const AccordionItem = ({ icon, title, defaultOpen = false, children }: AccordionItemProps) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <section className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-card shadow-sm">
            <button
                type="button"
                onClick={() => setOpen(current => !current)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-bg-item-active/50"
                aria-expanded={open}
            >
                <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-input text-text-primary">
                        {icon}
                    </span>
                    <span className="truncate text-sm font-bold text-text-primary">{title}</span>
                </span>
                <ChevronDown
                    size={18}
                    className={`shrink-0 text-text-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div className="border-t border-border-subtle px-5 py-4">
                    {children}
                </div>
            )}
        </section>
    );
};

export const AboutSection: React.FC = () => {
    const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';

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

            <div className="space-y-3">
                <AccordionItem icon={<Sparkles size={18} className="text-blue-500" />} title="What Cluegent does" defaultOpen>
                    <p className="text-sm leading-relaxed text-text-secondary">
                        Cluegent is a real-time AI assistant for meetings, coding conversations, and
                        screen-based questions. It can listen when you start listening, answer typed prompts,
                        and analyze screenshots to produce useful responses.
                    </p>
                </AccordionItem>

                <AccordionItem icon={<ShieldCheck size={18} className="text-emerald-500" />} title="Privacy statement">
                    <p className="text-sm leading-relaxed text-text-secondary">
                        Cluegent does not start listening until you choose to start listening. Screenshots are sent
                        only when you explicitly attach a screenshot. Local meeting history and customization data
                        stay on this device unless a backend feature needs usage or entitlement sync.
                    </p>
                </AccordionItem>

                <AccordionItem icon={<Scale size={18} className="text-amber-500" />} title="License and source">
                    <p className="text-sm leading-relaxed text-text-secondary">
                        Cluegent is distributed under AGPL-3.0. 
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                        Cluegent is based on the open-source Natively desktop assistant project and modified
                        for Cluegent branding, backend services, billing, and deployment.
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
                        <a
                            href="https://github.com/admincluegent/cluegent-app/blob/development/ATTRIBUTION.md"
                            onClick={(e) => handleOpenLink(e, 'https://github.com/admincluegent/cluegent-app/blob/development/ATTRIBUTION.md')}
                            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-input px-4 py-2 text-sm font-bold text-text-primary transition-colors hover:bg-bg-item-active"
                        >
                            <Scale size={16} />
                            Attribution
                            <ExternalLink size={14} />
                        </a>
                    </div>
                </AccordionItem>

                <AccordionItem icon={<LockKeyhole size={18} />} title="Contact and support">
                    <p className="text-sm leading-relaxed text-text-secondary">
                        For support, privacy, or billing questions, contact admincluegent@gmail.com or visit the
                        official Cluegent website.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <a
                            href="mailto:admincluegent@gmail.com"
                            onClick={(e) => handleOpenLink(e, 'mailto:admincluegent@gmail.com')}
                            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-input px-4 py-2 text-sm font-bold text-text-primary transition-colors hover:bg-bg-item-active"
                        >
                            <Mail size={16} />
                            admincluegent@gmail.com
                        </a>
                        <a
                            href="https://www.cluegent.com"
                            onClick={(e) => handleOpenLink(e, 'https://www.cluegent.com')}
                            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-input px-4 py-2 text-sm font-bold text-text-primary transition-colors hover:bg-bg-item-active"
                        >
                            <Globe size={16} />
                            cluegent.com
                            <ExternalLink size={14} />
                        </a>
                    </div>
                </AccordionItem>

                <AccordionItem icon={<MessageSquare size={18} className="text-blue-500" />} title="Report bug or suggestions">
                    <p className="text-sm leading-relaxed text-text-secondary">
                        Send bug reports, UI issues, or feature suggestions to admincluegent@gmail.com.
                    </p>
                    <a
                        href="mailto:admincluegent@gmail.com"
                        onClick={(e) => handleOpenLink(e, 'mailto:admincluegent@gmail.com')}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-input px-4 py-2 text-sm font-bold text-text-primary transition-colors hover:bg-bg-item-active"
                    >
                        <Mail size={16} />
                        admincluegent@gmail.com
                    </a>
                </AccordionItem>
            </div>
        </div>
    );
};
