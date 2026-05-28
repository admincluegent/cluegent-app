import React from 'react';
import { ExternalLink, Github, Globe, Info, LockKeyhole, Mail, MessageSquare, Scale, ShieldCheck, Sparkles } from 'lucide-react';
import CluegentIcon from './icon.png';

type InfoRowProps = {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
};

const InfoRow = ({ icon, title, children }: InfoRowProps) => {
    return (
        <section className="rounded-2xl border border-border-subtle bg-bg-card px-5 py-4 shadow-sm">
            <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-input text-text-primary">
                    {icon}
                </span>
                <div className="min-w-0">
                    <h5 className="text-[13px] font-bold text-text-primary">{title}</h5>
                    {children}
                </div>
            </div>
        </section>
    );
};

type LinkPillProps = {
    href: string;
    icon: React.ReactNode;
    label: string;
    onOpen: (e: React.MouseEvent<HTMLAnchorElement>, url: string) => void;
};

const LinkPill = ({ href, icon, label, onOpen }: LinkPillProps) => (
    <a
        href={href}
        onClick={(e) => onOpen(e, href)}
        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-border-subtle bg-bg-input px-3 py-1.5 text-xs font-bold text-text-primary transition-colors hover:bg-bg-item-active"
    >
        {icon}
        <span>{label}</span>
        <ExternalLink size={13} className="text-text-secondary" />
    </a>
);

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
                <h3 className="text-base font-bold text-text-primary mb-1">About</h3>
                <p className="text-xs text-text-secondary">
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
                            <h4 className="text-xl font-black tracking-tight text-text-primary">Cluegent</h4>
                            <p className="text-xs text-text-secondary">Version {appVersion}</p>
                        </div>
                    </div>

                    <a
                        href="https://www.cluegent.com"
                        onClick={(e) => handleOpenLink(e, 'https://www.cluegent.com')}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-text-primary px-3.5 py-2 text-xs font-bold text-bg-main transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                        <Globe size={16} />
                        Visit Website
                        <ExternalLink size={14} />
                    </a>
                </div>
            </section>

            <div className="space-y-3">
                <InfoRow icon={<Sparkles size={18} className="text-blue-500" />} title="What Cluegent does">
                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                        Cluegent is a real-time AI assistant for meetings, coding conversations, and
                        screen-based questions. It can listen when you start listening, answer typed prompts,
                        and analyze screenshots to produce useful responses.
                    </p>
                </InfoRow>

                <InfoRow icon={<ShieldCheck size={18} className="text-emerald-500" />} title="Privacy statement">
                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                        Cluegent does not start listening until you choose to start listening. Screenshots are sent
                        only when you explicitly attach a screenshot. Local meeting history and customization data
                        stay on this device unless a backend feature needs usage or entitlement sync.
                    </p>
                </InfoRow>

                <section className="rounded-2xl border border-border-subtle bg-bg-card px-5 py-4 shadow-sm">
                    <div className="flex gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-input text-amber-500">
                            <Scale size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h5 className="text-[13px] font-bold text-text-primary">Legal links</h5>
                            <p className="mt-1 text-xs leading-5 text-text-secondary">
                                Cluegent is distributed under AGPL-3.0 and includes open-source attribution.
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <LinkPill
                                    href="https://www.cluegent.com/privacy.html"
                                    icon={<ShieldCheck size={15} />}
                                    label="Privacy"
                                    onOpen={handleOpenLink}
                                />
                                <LinkPill
                                    href="https://www.cluegent.com/terms.html"
                                    icon={<Scale size={15} />}
                                    label="Terms"
                                    onOpen={handleOpenLink}
                                />
                                <LinkPill
                                    href="https://github.com/admincluegent/cluegent-app/blob/development/LICENSE"
                                    icon={<Info size={15} />}
                                    label="License"
                                    onOpen={handleOpenLink}
                                />
                                <LinkPill
                                    href="https://github.com/admincluegent/cluegent-app"
                                    icon={<Github size={15} />}
                                    label="Source"
                                    onOpen={handleOpenLink}
                                />
                                <LinkPill
                                    href="https://github.com/admincluegent/cluegent-app/blob/development/ATTRIBUTION.md"
                                    icon={<Scale size={15} />}
                                    label="Attribution"
                                    onOpen={handleOpenLink}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <InfoRow icon={<LockKeyhole size={18} />} title="Contact and support">
                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                        For support, privacy, or billing questions, contact admincluegent@gmail.com or visit the
                        official Cluegent website.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <a
                            href="mailto:admincluegent@gmail.com"
                            onClick={(e) => handleOpenLink(e, 'mailto:admincluegent@gmail.com')}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border-subtle bg-bg-input px-3 py-1.5 text-xs font-bold text-text-primary transition-colors hover:bg-bg-item-active"
                        >
                            <Mail size={16} />
                            admincluegent@gmail.com
                        </a>
                        <a
                            href="https://www.cluegent.com"
                            onClick={(e) => handleOpenLink(e, 'https://www.cluegent.com')}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border-subtle bg-bg-input px-3 py-1.5 text-xs font-bold text-text-primary transition-colors hover:bg-bg-item-active"
                        >
                            <Globe size={16} />
                            cluegent.com
                            <ExternalLink size={14} />
                        </a>
                    </div>
                </InfoRow>

                <InfoRow icon={<MessageSquare size={18} className="text-blue-500" />} title="Report bug or suggestions">
                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                        Send bug reports, UI issues, or feature suggestions to admincluegent@gmail.com.
                    </p>
                    <a
                        href="mailto:admincluegent@gmail.com"
                        onClick={(e) => handleOpenLink(e, 'mailto:admincluegent@gmail.com')}
                        className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border-subtle bg-bg-input px-3 py-1.5 text-xs font-bold text-text-primary transition-colors hover:bg-bg-item-active"
                    >
                        <Mail size={16} />
                        admincluegent@gmail.com
                    </a>
                </InfoRow>
            </div>
        </div>
    );
};
