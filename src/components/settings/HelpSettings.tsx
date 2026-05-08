import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    Camera,
    Eye,
    EyeOff,
    Monitor,
    MousePointerClick,
    Settings,
    SlidersHorizontal
} from 'lucide-react';
import CluegentIcon from '../icon.png';

type HelpSettingsProps = {
    onNavigate?: (tab: string) => void;
};

type HelpCardProps = {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
};

const HelpCard = ({ icon, title, children }: HelpCardProps) => (
    <section className="rounded-xl border border-border-subtle bg-bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-item-active text-accent-primary">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-text-primary">{title}</h4>
                <div className="mt-3 text-sm leading-relaxed text-text-secondary">{children}</div>
            </div>
        </div>
    </section>
);

const guideSteps = {
    permissions: [
        { label: 'Open Privacy settings', x: 44, y: 48 },
        { label: 'Enable Screen Recording', x: 214, y: 112 },
        { label: 'Enable Accessibility', x: 236, y: 172 }
    ],
    interface: [
        { label: 'Start listening', x: 244, y: 38 },
        { label: 'Use a quick action', x: 174, y: 142 },
        { label: 'Submit with Ctrl + Enter', x: 516, y: 218 }
    ],
    screenshot: [
        { label: 'Capture screenshot with Ctrl + [', x: 520, y: 226 },
        { label: 'Screenshot attached', x: 452, y: 112 },
        { label: 'AI analyzes the same overlay', x: 138, y: 164 }
    ]
};

const GuidedCursor = ({ x, y }: { x: number; y: number }) => (
    <motion.div
        className="pointer-events-none absolute z-20"
        animate={{ x, y }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
    >
        <motion.div
            animate={{ scale: [1, 0.92, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
        >
            <MousePointerClick className="h-6 w-6 fill-white text-slate-950 drop-shadow-[0_8px_16px_rgba(15,23,42,0.28)]" />
            <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full border border-white/70 bg-emerald-400 shadow-sm" />
        </motion.div>
    </motion.div>
);

const MockPermissionsWalkthrough = () => {
    const [step, setStep] = useState(0);
    const activeStep = guideSteps.permissions[step];

    useEffect(() => {
        const timer = window.setInterval(() => {
            setStep((current) => (current + 1) % guideSteps.permissions.length);
        }, 1800);

        return () => window.clearInterval(timer);
    }, []);

    return (
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-border-subtle bg-bg-input p-4 shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_82%_80%,rgba(16,185,129,0.12),transparent_30%)]" />
            <div className="relative mx-auto h-[240px] max-w-[520px]">
                <div className="absolute left-4 top-4 w-[190px] rounded-2xl border border-border-subtle bg-bg-card p-3 shadow-lg">
                    <div className="mb-3 flex items-center gap-2 border-b border-border-subtle pb-3">
                        <Settings className="h-4 w-4 text-accent-primary" />
                        <span className="text-xs font-bold text-text-primary">Privacy & Security</span>
                    </div>
                    {['Microphone', 'Screen Recording', 'Accessibility'].map((item, index) => (
                        <motion.div
                            key={item}
                            animate={{
                                backgroundColor: step === index ? 'rgba(59, 130, 246, 0.12)' : 'rgba(0, 0, 0, 0)'
                            }}
                            className="mb-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-text-secondary"
                        >
                            <span className={`h-2 w-2 rounded-full ${step >= index ? 'bg-emerald-400' : 'bg-border-muted'}`} />
                            {item}
                        </motion.div>
                    ))}
                </div>

                <div className="absolute right-4 top-8 w-[260px] rounded-2xl border border-border-subtle bg-bg-card p-4 shadow-xl">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
                            <img src={CluegentIcon} alt="Cluegent" className="h-6 w-6 object-contain" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-text-primary">Cluegent</div>
                            <div className="text-[11px] text-text-tertiary">Allow app access</div>
                        </div>
                    </div>
                    {[
                        { label: 'Screen Recording', enabled: step >= 1 },
                        { label: 'Accessibility', enabled: step >= 2 }
                    ].map((item) => (
                        <div key={item.label} className="mb-3 flex items-center justify-between rounded-xl border border-border-subtle bg-bg-input px-3 py-2">
                            <span className="text-xs font-semibold text-text-secondary">{item.label}</span>
                            <motion.div
                                animate={{ backgroundColor: item.enabled ? '#10b981' : '#cbd5e1' }}
                                className="relative h-6 w-11 rounded-full"
                            >
                                <motion.span
                                    animate={{ x: item.enabled ? 20 : 3 }}
                                    transition={{ type: 'spring', stiffness: 160, damping: 16 }}
                                    className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
                                />
                            </motion.div>
                        </div>
                    ))}
                </div>

                <motion.div
                    key={activeStep.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border-subtle bg-bg-card px-4 py-2 text-xs font-semibold text-text-primary shadow-lg"
                >
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    {activeStep.label}
                </motion.div>

                <GuidedCursor x={activeStep.x} y={activeStep.y} />
            </div>
        </div>
    );
};

export const MockInterfaceWalkthrough = () => {
    const [step, setStep] = useState(0);
    const [collapsed, setCollapsed] = useState(false);
    const activeStep = guideSteps.interface[step];

    useEffect(() => {
        const timer = window.setInterval(() => {
            setStep((current) => {
                const next = (current + 1) % guideSteps.interface.length;
                setCollapsed(next === 0 ? false : next === 2);
                return next;
            });
        }, 1900);

        return () => window.clearInterval(timer);
    }, []);

    return (
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-border-subtle bg-bg-input p-4 shadow-inner">
            <div className="relative mx-auto h-[290px] max-w-[640px]">
                <div className="absolute left-1/2 top-0 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border-subtle bg-bg-card px-2 py-1.5 shadow-xl">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                        <img src={CluegentIcon} alt="Cluegent" className="h-6 w-6 object-contain" />
                    </div>
                    <motion.button
                        animate={{
                            backgroundColor: step === 0 ? 'rgba(16,185,129,0.18)' : 'var(--bg-item-surface)'
                        }}
                        className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-xs font-bold text-text-primary"
                    >
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        Start listening
                    </motion.button>
                    <button className="flex items-center gap-2 rounded-full bg-bg-item-active px-4 py-2 text-xs font-bold text-text-primary">
                        <EyeOff className="h-3.5 w-3.5" /> Hide
                    </button>
                    <button className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-item-active text-text-primary">
                        <SlidersHorizontal className="h-4 w-4" />
                    </button>
                    <button className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-item-active text-text-primary">
                        <span className="h-3.5 w-3.5 rounded-[3px] bg-current" />
                    </button>
                </div>

                <motion.div
                    animate={{ opacity: collapsed ? 0.4 : 1, y: collapsed ? 18 : 0 }}
                    transition={{ type: 'spring', stiffness: 130, damping: 18 }}
                    className="absolute left-0 right-0 top-[70px] rounded-[26px] border border-border-subtle bg-bg-card p-4 shadow-2xl"
                >
                    <div className="mb-3 overflow-hidden whitespace-nowrap text-right text-[13px] italic text-text-secondary">
                        <motion.span
                            animate={{ x: [-18, 0, -18] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                            className="inline-block"
                        >
                            ...compare ScrollView and FlatList, then explain useEffect clearly
                        </motion.span>
                    </div>

                    <div className="mb-3 flex gap-2 overflow-hidden">
                        {['Ask next question', 'Give Example', 'Brainstorm', 'Mic'].map((label, index) => (
                            <motion.button
                                key={label}
                                animate={{
                                    backgroundColor: step === 1 && index === 1 ? 'rgba(59,130,246,0.16)' : 'var(--bg-item-active)'
                                }}
                                className="shrink-0 rounded-full border border-border-subtle px-4 py-2 text-xs font-bold text-text-primary"
                            >
                                {label}
                            </motion.button>
                        ))}
                    </div>

                    <div className="mb-3 rounded-2xl border border-border-subtle bg-bg-input p-4 text-sm leading-relaxed text-text-primary">
                        <div className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-text-tertiary">Cluegent response</div>
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {step === 0 && 'Listening begins only when you press Start listening.'}
                            {step === 1 && 'Quick actions reuse the current transcript, typed prompt, or screenshot context.'}
                            {step === 2 && 'Submit sends the prompt to the backend and streams the answer back into the overlay.'}
                        </motion.div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex-1 rounded-2xl border border-border-subtle bg-bg-input px-4 py-3 text-sm text-text-secondary">
                            Ask anything... <span className="mx-2 text-text-tertiary">Ctrl + Enter</span> to submit
                        </div>
                        <button className="flex h-11 w-11 items-center justify-center rounded-full bg-bg-item-active text-text-primary">
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </motion.div>

                <motion.div
                    key={activeStep.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border-subtle bg-bg-card px-4 py-2 text-xs font-semibold text-text-primary shadow-lg"
                >
                    <Eye className="h-3.5 w-3.5 text-accent-primary" />
                    {activeStep.label}
                </motion.div>

                <GuidedCursor x={activeStep.x} y={activeStep.y} />
            </div>
        </div>
    );
};

export const MockScreenshotWalkthrough = () => {
    const [step, setStep] = useState(0);
    const [answerReady, setAnswerReady] = useState(false);
    const activeStep = guideSteps.screenshot[step];

    useEffect(() => {
        const timer = window.setInterval(() => {
            setStep((current) => {
                const next = (current + 1) % guideSteps.screenshot.length;
                setAnswerReady(next === 2);
                return next;
            });
        }, 1900);

        return () => window.clearInterval(timer);
    }, []);

    return (
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-border-subtle bg-bg-input p-4 shadow-inner">
            <div className="relative mx-auto h-[290px] max-w-[640px]">
                <div className="absolute left-1/2 top-0 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border-subtle bg-bg-card px-2 py-1.5 shadow-xl">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                        <img src={CluegentIcon} alt="Cluegent" className="h-6 w-6 object-contain" />
                    </div>
                    <motion.button
                        animate={{
                            backgroundColor: step === 0 ? 'rgba(245,158,11,0.18)' : 'var(--bg-item-surface)'
                        }}
                        className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-xs font-bold text-text-primary"
                    >
                        <Camera className="h-3.5 w-3.5 text-amber-500" />
                        Ctrl + [
                    </motion.button>
                    <button className="flex items-center gap-2 rounded-full bg-bg-item-active px-4 py-2 text-xs font-bold text-text-primary">
                        <EyeOff className="h-3.5 w-3.5" /> Hide
                    </button>
                    <button className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-item-active text-text-primary">
                        <SlidersHorizontal className="h-4 w-4" />
                    </button>
                    <button className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-item-active text-text-primary">
                        <span className="h-3.5 w-3.5 rounded-[3px] bg-current" />
                    </button>
                </div>

                <motion.div
                    animate={{ opacity: answerReady ? 1 : 0.94, y: answerReady ? 0 : 8 }}
                    transition={{ type: 'spring', stiffness: 130, damping: 18 }}
                    className="absolute left-0 right-0 top-[70px] rounded-[26px] border border-border-subtle bg-bg-card p-4 shadow-2xl"
                >
                    <div className="mb-3 overflow-hidden whitespace-nowrap text-right text-[13px] italic text-text-secondary">
                        <motion.span
                            animate={{ x: [-18, 0, -18] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                            className="inline-block"
                        >
                            ...transcript hint: explain the visible React hook question clearly
                        </motion.span>
                    </div>

                    <div className="mb-3 flex items-center gap-2 overflow-hidden">
                        {['Ask next question', 'Give Example', 'Brainstorm', 'Mic'].map((label) => (
                            <button
                                key={label}
                                className="shrink-0 rounded-full border border-border-subtle bg-bg-item-active px-4 py-2 text-xs font-bold text-text-primary"
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="mb-3 flex justify-end">
                        <motion.div
                            animate={{ opacity: step >= 1 ? 1 : 0.4, scale: step >= 1 ? 1 : 0.96 }}
                            className="rounded-[20px] rounded-tr-[6px] border border-blue-500/25 bg-blue-500/10 px-4 py-3 text-xs font-bold text-blue-500 shadow-sm"
                        >
                            <div className="flex items-center gap-2">
                                <Camera className="h-3.5 w-3.5" />
                                Screenshot attached
                            </div>
                            <div className="mt-2 h-px w-full bg-blue-500/20" />
                        </motion.div>
                    </div>

                    <div className="mb-3 rounded-2xl border border-border-subtle bg-bg-input p-4 text-sm leading-relaxed text-text-primary">
                        <div className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-text-tertiary">Cluegent response</div>
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {step === 0 && 'Press Ctrl + [ to attach the current screen from inside the same overlay.'}
                            {step === 1 && 'Screenshot attached. Cluegent keeps the UI quiet and sends the image with your behavior rules.'}
                            {step === 2 && 'AI reads the screenshot, combines any rolling transcript context, and answers the visible question directly.'}
                        </motion.div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex-1 rounded-2xl border border-border-subtle bg-bg-input px-4 py-3 text-sm text-text-secondary">
                            Ask anything... <span className="mx-2 text-text-tertiary">Ctrl + [</span> for screenshot
                        </div>
                        <motion.button
                            animate={{ backgroundColor: step === 0 ? 'rgba(245,158,11,0.18)' : 'var(--bg-item-active)' }}
                            className="flex h-11 w-11 items-center justify-center rounded-full text-text-primary"
                        >
                            <Camera className="h-4 w-4" />
                        </motion.button>
                    </div>
                </motion.div>

                <motion.div
                    key={activeStep.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border-subtle bg-bg-card px-4 py-2 text-xs font-semibold text-text-primary shadow-lg"
                >
                    <Camera className="h-3.5 w-3.5 text-amber-500" />
                    {activeStep.label}
                </motion.div>

                <GuidedCursor x={activeStep.x} y={activeStep.y} />
            </div>
        </div>
    );
};

export const HelpSettings: React.FC<HelpSettingsProps> = () => {
    return (
        <div className="w-full h-full animated fadeIn pb-8">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-text-primary mb-1">Setup & Help</h3>
                <p className="text-xs text-text-secondary">
                    Visual walkthroughs for setup and the Cluegent interface.
                </p>
            </div>

            <div className="grid gap-4">
                <HelpCard icon={<Monitor size={18} />} title="App Permissions Setup">
                    <MockPermissionsWalkthrough />
                </HelpCard>

                <HelpCard icon={<Monitor size={18} />} title="Cluegent Interface Operations">
                    <MockInterfaceWalkthrough />
                </HelpCard>

                <HelpCard icon={<Camera size={18} />} title="Screenshot Response">
                    <MockScreenshotWalkthrough />
                </HelpCard>
            </div>
        </div>
    );
};
