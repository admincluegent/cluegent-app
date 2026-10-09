import React, { useState, useEffect, useMemo } from 'react';
import packageJson from '../../package.json';
import {
    X, Mic, Speaker, Monitor, Keyboard, User, LifeBuoy, LogOut, Upload,
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    Camera, RotateCcw, Eye, Layout, MessageSquare, Crop,
    ChevronDown, ChevronUp, Check, BadgeCheck, Power, Palette, Clock, Ghost, Sun, Moon, RefreshCw, Info, Globe, Terminal, Settings, Activity, ExternalLink, Trash2, FileText, FileType,
    Sparkles, Pencil, Edit3, Briefcase, Building2, Search, MapPin, CheckCircle, HelpCircle, Zap, SlidersHorizontal, PointerOff,
    Star, AlertCircle, Gift, Loader2
} from 'lucide-react';
import { analytics } from '../lib/analytics/analytics.service';
import { AboutSection } from './AboutSection';
import { HelpSettings } from './settings/HelpSettings';
import { AIResumeBuilder } from './settings/AIResumeBuilder';
import { BillingSettings } from './settings/BillingSettings';
import { RecentLocalMeetings } from './settings/RecentLocalMeetings';
import { motion, AnimatePresence } from 'framer-motion';
import { useShortcuts } from '../hooks/useShortcuts';
import { useResolvedTheme } from '../hooks/useResolvedTheme';
import { useAuth } from '../contexts/auth.context';
import {
    cancelRazorpayLiveSubscription,
    cancelRazorpayTestSubscription,
    deleteAccount,
} from '../services/backendApi';
import {
    clampOverlayOpacity,
    getOverlayAppearance,
    OVERLAY_OPACITY_DEFAULT,
    OVERLAY_OPACITY_MIN,
    getDefaultOverlayOpacity,
} from '../lib/overlayAppearance';
import { KeyRecorder } from './ui/KeyRecorder';
import { ProfileVisualizer, PremiumUpgradeModal } from '../premium';
import icon from './icon.png';
import {
    AI_BEHAVIOR_CUSTOM_LIMIT,
    AI_BEHAVIOR_SCENARIOS,
    AiBehaviorScenario,
    AiBehaviorSettings,
    compactAiBehaviorText,
    getDefaultBehaviorPrompt,
    getAiBehaviorSettings,
    saveAiBehaviorSettings,
} from '../lib/aiBehaviorSettings';
import {
    createEmptyCustomQuickAction,
    DEFAULT_QUICK_ACTIONS,
    getCustomQuickActions,
    getRemovedDefaultQuickActionIds,
    getQuickActionVisibility,
    getVisibleDefaultQuickActions,
    QUICK_ACTION_INSTRUCTION_LIMIT,
    QUICK_ACTION_LABEL_LIMIT,
    QuickActionId,
    QuickActionConfig,
    QuickActionSettings,
    getQuickActionSettings,
    saveCustomQuickActions,
    saveRemovedDefaultQuickActionIds,
    saveQuickActionSettings,
    saveQuickActionVisibility,
} from '../lib/quickActionSettings';

// ---------------------------------------------------------------------------
// StarRating — renders filled/empty stars for culture ratings
// ---------------------------------------------------------------------------
const StarRating = ({ value, size = 11 }: { value: number; size?: number }) => {
    const clamped = Math.min(5, Math.max(0, value ?? 0));
    // Round to nearest 0.5 so 3.7→3.5 stars, 3.8→4 stars, 4.75→5 stars
    const rounded = Math.round(clamped * 2) / 2;
    const full = Math.floor(rounded);
    const half = rounded - full === 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return (
        <span className="flex items-center gap-0.5">
            {Array.from({ length: full }).map((_, i) => (
                <Star key={`f${i}`} size={size} className="text-yellow-400 fill-yellow-400" />
            ))}
            {half && <Star size={size} className="text-yellow-400 fill-yellow-400/40" />}
            {Array.from({ length: empty }).map((_, i) => (
                <Star key={`e${i}`} size={size} className="text-text-tertiary/25 fill-transparent" />
            ))}
        </span>
    );
};

// ---------------------------------------------------------------------------
// MockupNativelyInterface — fake in-meeting widget for the opacity preview
// ---------------------------------------------------------------------------
const MockupNativelyInterface = ({ opacity }: { opacity: number }) => {
    const resolvedTheme = useResolvedTheme();
    const appearance = useMemo(
        () => getOverlayAppearance(opacity, resolvedTheme),
        [opacity, resolvedTheme]
    );

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none bg-transparent">
                {/* NativelyInterface Widget — opacity controlled by the slider */}
                <div
                    id="mockup-natively-interface"
                    className="flex flex-col items-center pointer-events-none -mt-56"
                >
                    {/* TopPill Replica */}
                    <div className="flex justify-center mb-2 select-none z-50">
                        <div className="flex items-center gap-2 rounded-full overlay-pill-surface backdrop-blur-md pl-1.5 pr-1.5 py-1.5" style={appearance.pillStyle}>
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden overlay-icon-surface"
                                style={{
                                    ...appearance.iconStyle,
                                    backgroundColor: "#ffffff",
                                    borderColor: "rgba(255, 255, 255, 0.96)",
                                }}
                            >
                                <img
                                    src={icon}
                                    alt="Cluegent"
                                    className="w-[24px] h-[24px] object-contain opacity-95 scale-105"
                                    draggable="false"
                                />
                            </div>
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-medium border overlay-chip-surface overlay-text-interactive" style={appearance.chipStyle}>
                                <ChevronUp className="w-3.5 h-3.5 opacity-70" />
                                <span className="opacity-80 tracking-wide">Hide</span>
                            </div>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center overlay-icon-surface overlay-text-primary" style={appearance.iconStyle}>
                                <div className="w-3.5 h-3.5 rounded-[3px] bg-red-400 opacity-80" />
                            </div>
                        </div>
                    </div>

                    {/* Main Interface Window Replica */}
                    <div className="relative w-[600px] max-w-full overlay-shell-surface overlay-text-primary backdrop-blur-2xl border rounded-[24px] overflow-hidden flex flex-col pt-2 pb-3" style={appearance.shellStyle}>

                        {/* Rolling Transcript Bar */}
                        <div className="w-full flex justify-center py-2 px-4 border-b mb-1 overlay-transcript-surface" style={appearance.transcriptStyle}>
                            <p className="text-[13px] truncate max-w-[90%] font-medium overlay-text-primary">
                                <span className={`${resolvedTheme === 'light' ? 'text-blue-700' : 'text-blue-400'} mr-2 font-semibold`}>Interviewer</span>
                                <span className="opacity-95">So how would you optimize the current algorithm?</span>
                            </p>
                        </div>

                        {/* Chat History Mock */}
                        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                            <div className="flex justify-start">
                                <div className="max-w-[85%] px-4 py-3 text-[14px] leading-relaxed font-normal overlay-text-primary">
                                    <span className="font-semibold text-emerald-500 block mb-1">Suggestion</span>
                                    A good approach would be to use a hash map to cache the intermediate results, which brings the time complexity down from O(n²) to O(n).
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-nowrap justify-center items-center gap-1.5 px-4 pb-3 pt-3">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border shrink-0 overlay-chip-surface overlay-text-interactive" style={appearance.chipStyle}>
                                <Pencil className="w-3 h-3 opacity-70" /> What to answer?
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border shrink-0 overlay-chip-surface overlay-text-interactive" style={appearance.chipStyle}>
                                <MessageSquare className="w-3 h-3 opacity-70" /> Clarify
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border shrink-0 overlay-chip-surface overlay-text-interactive" style={appearance.chipStyle}>
                                <RefreshCw className="w-3 h-3 opacity-70" /> Recap
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border shrink-0 overlay-chip-surface overlay-text-interactive" style={appearance.chipStyle}>
                                <HelpCircle className="w-3 h-3 opacity-70" /> Follow Up Question
                            </div>
                            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium min-w-[74px] shrink-0 border overlay-chip-surface overlay-text-interactive" style={appearance.chipStyle}>
                                <Mic className="w-3 h-3 opacity-70" /> Mic
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="px-3">
                            <div className="relative group">
                                <div className="w-full border rounded-xl pl-3 pr-10 py-2.5 h-[38px] flex items-center overlay-input-surface" style={appearance.inputStyle}>
                                    <span className="text-[13px] overlay-text-muted">Ask anything on screen or conversation</span>
                                </div>
                            </div>

                            {/* Bottom Row */}
                            <div className="flex items-center justify-between mt-3 px-0.5">
                                <div className="flex items-center gap-1.5">
                                    <div className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-medium w-[140px] overlay-control-surface overlay-text-interactive" style={appearance.controlStyle}>
                                        <span className="truncate min-w-0 flex-1">Gemini 3 Flash</span>
                                        <ChevronDown size={14} className="shrink-0" />
                                    </div>
                                    <div className="w-px h-3 mx-1" style={appearance.dividerStyle} />
                                    <div className="w-7 h-7 flex items-center justify-center rounded-lg overlay-icon-surface overlay-text-muted" style={appearance.iconStyle}>
                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
        </div>
    );
};

interface CustomSelectProps {
    label: string;
    icon: React.ReactNode;
    value: string;
    options: MediaDeviceInfo[];
    onChange: (value: string) => void;
    placeholder?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, icon, value, options, onChange, placeholder = "Select device" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find(o => o.deviceId === value)?.label || placeholder;

    return (
        <div className="bg-bg-card rounded-xl p-4 border border-border-subtle" ref={containerRef}>
            {label && (
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-text-secondary">{icon}</span>
                    <label className="text-xs font-medium text-text-primary uppercase tracking-wide">{label}</label>
                </div>
            )}

            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text-primary flex items-center justify-between hover:bg-bg-elevated transition-colors"
                >
                    <span className="truncate pr-4">{selectedLabel}</span>
                    <ChevronDown size={14} className={`text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-bg-elevated border border-border-subtle rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto animated fadeIn">
                        <div className="p-1 space-y-0.5">
                            {options.map((device, index) => (
                                <button
                                    key={`${device.deviceId || 'empty-device-id'}-${index}`}
                                    onClick={() => {
                                        onChange(device.deviceId);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between group transition-colors ${value === device.deviceId ? 'bg-bg-input hover:bg-bg-elevated text-text-primary' : 'text-text-secondary hover:bg-bg-input hover:text-text-primary'}`}
                                >
                                    <span className="truncate">{device.label || `Device ${device.deviceId.slice(0, 5)}...`}</span>
                                    {value === device.deviceId && <Check size={14} className="text-accent-primary" />}
                                </button>
                            ))}
                            {options.length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-500 italic">No devices found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface ProviderOption {
    id: string;
    label: string;
    badge?: string | null;
    recommended?: boolean;
    desc: string;
    color: string;
    icon: React.ReactNode;
}

interface ProviderSelectProps {
    value: string;
    options: ProviderOption[];
    onChange: (value: string) => void;
}

const ProviderSelect: React.FC<ProviderSelectProps> = ({ value, options, onChange }) => {
    const isLight = useResolvedTheme() === 'light';
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selected = options.find(o => o.id === value);

    const getBadgeStyle = (color?: string) => {
        switch (color) {
            case 'blue': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'orange': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'purple': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'teal': return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
            case 'cyan': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
            case 'indigo': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
            case 'green': return 'bg-green-500/10 text-green-500 border-green-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const getIconStyle = (color?: string, isSelectedItem: boolean = false) => {
        if (isSelectedItem) return 'bg-accent-primary text-white shadow-sm';
        // For unselected items in list or trigger
        switch (color) {
            case 'blue': return 'bg-blue-500/10 text-blue-600';
            case 'orange': return 'bg-orange-500/10 text-orange-600';
            case 'purple': return 'bg-purple-500/10 text-purple-600';
            case 'teal': return 'bg-teal-500/10 text-teal-600';
            case 'cyan': return 'bg-cyan-500/10 text-cyan-600';
            case 'indigo': return 'bg-indigo-500/10 text-indigo-600';
            case 'green': return 'bg-green-500/10 text-green-600';
            default: return 'bg-gray-500/10 text-gray-600';
        }
    };

    return (
        <div ref={containerRef} className="relative z-20 font-sans">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full group bg-bg-input border border-border-subtle hover:border-border-muted shadow-sm rounded-xl p-2.5 pr-3.5 flex items-center justify-between transition-all duration-200 outline-none focus:ring-2 focus:ring-accent-primary/20 ${isOpen ? 'ring-2 ring-accent-primary/20 border-accent-primary/50' : 'hover:shadow-md'}`}
            >
                {selected ? (
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-all duration-300 ${getIconStyle(selected.color)}`}>
                            {selected.icon}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-2">
                                <span className="text-[13px] font-semibold text-text-primary truncate leading-tight">{selected.label}</span>
                                {selected.badge && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ml-2 ${getBadgeStyle(selected.badge === 'Saved' ? 'green' : selected.color)}`}>{selected.badge}</span>}
                                {selected.recommended && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ml-2 ${getBadgeStyle(selected.color)}`}>Recommended</span>}
                            </div>
                            {/* Short description for trigger */}
                            <span className="text-[11px] text-text-tertiary truncate block leading-tight mt-0.5">{selected.desc}</span>
                        </div>
                    </div>
                ) : <span className="text-text-secondary px-2 text-sm">Select Provider</span>}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary transition-transform duration-300 group-hover:bg-bg-input ${isOpen ? 'rotate-180 bg-bg-input text-text-primary' : ''}`}>
                    <ChevronDown size={14} strokeWidth={2.5} />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={`absolute top-full left-0 w-full mt-2 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/5 ${isLight ? 'bg-bg-elevated border border-border-subtle' : 'bg-bg-elevated/90 border border-white/5'}`}
                    >
                        <div className="max-h-[320px] overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                            {options.map((option, index) => {
                                const isSelected = value === option.id;
                                return (
                                    <button
                                        key={`${option.id || 'empty-option-id'}-${index}`}
                                        onClick={() => { onChange(option.id); setIsOpen(false); }}
                                        className={`w-full rounded-[10px] p-2 flex items-center gap-3 transition-all duration-200 group relative ${isSelected ? (isLight ? 'bg-bg-item-active shadow-inner' : 'bg-white/10 shadow-inner') : (isLight ? 'hover:bg-bg-item-surface' : 'hover:bg-white/5')}`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${isSelected ? 'scale-100' : 'scale-95 group-hover:scale-100'} ${getIconStyle(option.color, false)}`}>
                                            {option.icon}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[13px] font-medium transition-colors ${isSelected && !isLight ? 'text-white' : 'text-text-primary'}`}>{option.label}</span>
                                                    {option.badge && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${getBadgeStyle(option.badge === 'Saved' ? 'green' : option.color)}`}>{option.badge}</span>}
                                                    {option.recommended && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${getBadgeStyle(option.color)}`}>Recommended</span>}
                                                </div>
                                                {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={14} className="text-accent-primary" strokeWidth={3} /></motion.div>}
                                            </div>
                                            <span className={`text-[11px] block truncate transition-colors ${isSelected && !isLight ? 'text-white/70' : 'text-text-tertiary'}`}>{option.desc}</span>
                                        </div>
                                        {/* Hover Indicator */}
                                        {!isSelected && <div className="absolute inset-0 rounded-[10px] ring-1 ring-inset ring-transparent group-hover:ring-border-subtle pointer-events-none" />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

interface SettingsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: string;
    isTrialActive?: boolean;
}

const normalizeSettingsTab = (tab: string) =>
    tab === 'ai-providers'
        ? 'billing'
        : tab === 'calendar'
            ? 'general'
            : tab;

const formatAccountDate = (value?: string | null) => {
    if (!value) {
        return 'Not scheduled';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
};

const getResumeFileIcon = (fileName?: string | null) => {
    const ext = (fileName?.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') {
        return <FileText size={15} className="shrink-0 text-red-500" />;
    }
    if (ext === 'doc' || ext === 'docx') {
        return <FileType size={15} className="shrink-0 text-blue-500" />;
    }
    return <FileText size={15} className="shrink-0 text-text-secondary" />;
};

const SettingsOverlay: React.FC<SettingsOverlayProps> = ({ isOpen, onClose, initialTab = 'general', isTrialActive = false }) => {
    const isLight = useResolvedTheme() === 'light';
    const [activeTab, setActiveTab] = useState(normalizeSettingsTab(initialTab));
    const { profile, subscription, planStatus, logoutUser, refreshProfile } = useAuth();
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
    const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
    const [cancelMessage, setCancelMessage] = useState<string | null>(null);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [isDeleteAccountConfirmOpen, setIsDeleteAccountConfirmOpen] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
    
    // Sync active tab when modal opens
    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(normalizeSettingsTab(initialTab));
        }
    }, [isOpen, initialTab]);

    const handleCancelSubscription = async () => {
        setIsCancellingSubscription(true);
        setCancelMessage(null);
        setCancelError(null);

        try {
            if (subscription?.providerMode === 'live') {
                await cancelRazorpayLiveSubscription();
            } else {
                await cancelRazorpayTestSubscription();
            }
            await refreshProfile();
            setCancelMessage('Subscription cancelled immediately. Your account is now on the free plan.');
            setIsCancelConfirmOpen(false);
        } catch (error) {
            setCancelError(
                error instanceof Error
                    ? error.message
                    : 'Failed to cancel the subscription.'
            );
        } finally {
            setIsCancellingSubscription(false);
        }
    };

    const handleDeleteAccountAndQuit = async () => {
        setIsDeletingAccount(true);
        setDeleteAccountError(null);

        try {
            await deleteAccount();
            localStorage.clear();
            await logoutUser().catch(() => undefined);
            await window.electronAPI?.setFirebaseAuthToken?.(null).catch(() => undefined);
            await window.electronAPI.quitApp();
        } catch (error) {
            setDeleteAccountError(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete your account.'
            );
        } finally {
            setIsDeletingAccount(false);
        }
    };
    
    const { shortcuts, updateShortcut } = useShortcuts();
    const [isUndetectable, setIsUndetectable] = useState(false);
    const [isMousePassthrough, setIsMousePassthrough] = useState(false);
    const [disguiseMode, setDisguiseMode] = useState<'terminal' | 'settings' | 'activity' | 'none'>('none');
    const [openOnLogin, setOpenOnLogin] = useState(false);
    const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
    const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
    const [isAiLangDropdownOpen, setIsAiLangDropdownOpen] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'downloading' | 'available' | 'uptodate' | 'store' | 'error'>('idle');
    const themeDropdownRef = React.useRef<HTMLDivElement>(null);
    const aiLangDropdownRef = React.useRef<HTMLDivElement>(null);

    // Profile Engine State
    const [profileStatus, setProfileStatus] = useState<{
        hasProfile: boolean;
        profileMode: boolean;
        name?: string;
        role?: string;
        totalExperienceYears?: number;
    }>({ hasProfile: false, profileMode: false });
    const [profileUploading, setProfileUploading] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileData, setProfileData] = useState<any>(null);
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const [premiumPlan, setPremiumPlan] = useState<string>('');
    // Trial users get the same profile access as premium users for the duration of the trial
    const hasProfileAccess = isPremium || isTrialActive;
    const [jdUploading, setJdUploading] = useState(false);
    const [jdError, setJdError] = useState('');
    const [companyResearching, setCompanyResearching] = useState(false);
    const [companyDossier, setCompanyDossier] = useState<any>(null);
    const [companySearchQuotaExhausted, setCompanySearchQuotaExhausted] = useState(false);
    const [tavilyApiKey, setTavilyApiKey] = useState('');
    const [hasStoredTavilyKey, setHasStoredTavilyKey] = useState(false);
    const [tavilySaving, setTavilySaving] = useState(false);
    const [tavilyError, setTavilyError] = useState('');
    const [negotiationScript, setNegotiationScript] = useState<any>(null);
    const [negotiationGenerating, setNegotiationGenerating] = useState(false);
    const [negotiationError, setNegotiationError] = useState('');
    const [customNotes, setCustomNotes] = useState('');
    const [customNotesSaved, setCustomNotesSaved] = useState(false);
    const [aiBehaviorSettings, setAiBehaviorSettings] = useState<AiBehaviorSettings>(() => getAiBehaviorSettings());
    const [savedAiBehaviorSettingsSnapshot, setSavedAiBehaviorSettingsSnapshot] = useState<AiBehaviorSettings>(() => getAiBehaviorSettings());
    const [savedBehaviorScenario, setSavedBehaviorScenario] = useState<AiBehaviorScenario | null>(null);
    const [quickActionSettings, setQuickActionSettings] = useState<QuickActionSettings>(() => getQuickActionSettings());
    const [customQuickActions, setCustomQuickActions] = useState<QuickActionConfig[]>(() => getCustomQuickActions());
    const [removedDefaultQuickActionIds, setRemovedDefaultQuickActionIds] = useState<QuickActionId[]>(() => getRemovedDefaultQuickActionIds());
    const [showQuickActionButtons, setShowQuickActionButtons] = useState(() => getQuickActionVisibility());
    const [editingQuickActionId, setEditingQuickActionId] = useState<string | null>(null);
    const [savedQuickActionId, setSavedQuickActionId] = useState<string | null>(null);
    const customNotesDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    // Close dropdown when clicking outside
    // Sync with global state changes
    useEffect(() => {
        if (isOpen) {
            if (window.electronAPI?.licenseGetDetails) {
                window.electronAPI.licenseGetDetails().then((details) => {
                    setIsPremium(details.isPremium);
                    if (details.plan) setPremiumPlan(details.plan);
                }).catch(() => { });
            } else {
                window.electronAPI?.licenseCheckPremium?.().then(setIsPremium).catch(() => { });
            }
            
            // Fetch true initial state from main process
            window.electronAPI?.getUndetectable?.().then(setIsUndetectable).catch(() => { });
            window.electronAPI?.getOverlayMousePassthrough?.().then(setIsMousePassthrough).catch(() => { });
            window.electronAPI?.getDisguise?.().then(setDisguiseMode).catch(() => { });
            window.electronAPI?.profileGetStatus?.().then((status) => {
                if (status) setProfileStatus(status);
            }).catch(() => { });
            window.electronAPI?.profileGetProfile?.().then((data) => {
                if (data) setProfileData(data);
            }).catch(() => { });
        }
    }, [isOpen]);

    useEffect(() => {
        if (window.electronAPI?.onLicenseStatusChanged) {
            return window.electronAPI.onLicenseStatusChanged((data) => {
                if (data.isPremium) {
                    if (window.electronAPI.licenseGetDetails) {
                        window.electronAPI.licenseGetDetails().then((details) => {
                            setIsPremium(details.isPremium);
                            if (details.plan) setPremiumPlan(details.plan);
                        }).catch(() => { });
                    } else {
                        setIsPremium(true);
                    }
                } else {
                    setIsPremium(false);
                    setPremiumPlan('');
                }
            });
        }
    }, []);

    useEffect(() => {
        if (!window.electronAPI?.onProfileStatusChanged) return;
        const unsubscribe = window.electronAPI.onProfileStatusChanged((status) => {
            setProfileStatus(status);
            if (status.hasProfile) {
                window.electronAPI?.profileGetProfile?.().then((data) => {
                    if (data) setProfileData(data);
                }).catch(() => { });
            } else {
                setProfileData(null);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (window.electronAPI?.onUndetectableChanged) {
            const unsubscribe = window.electronAPI.onUndetectableChanged((newState: boolean) => {
                setIsUndetectable(newState);
            });
            return () => unsubscribe();
        }
    }, []);

    useEffect(() => {
        if (window.electronAPI?.onDisguiseChanged) {
            const unsubscribe = window.electronAPI.onDisguiseChanged((newMode: any) => {
                setDisguiseMode(newMode);
            });
            return () => unsubscribe();
        }
    }, []);

    useEffect(() => {
        if (window.electronAPI?.onOverlayMousePassthroughChanged) {
            const unsubscribe = window.electronAPI.onOverlayMousePassthroughChanged((enabled: boolean) => {
                setIsMousePassthrough(enabled);
            });
            return () => unsubscribe();
        }
    }, []);

    useEffect(() => {
        if (window.electronAPI?.onSttLanguageAutoDetected) {
            const unsubscribe = window.electronAPI.onSttLanguageAutoDetected((bcp47: string) => {
                setAutoDetectedLanguage(bcp47);
            });
            return () => unsubscribe();
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
                setIsThemeDropdownOpen(false);
            }
            if (aiLangDropdownRef.current && !aiLangDropdownRef.current.contains(event.target as Node)) {
                setIsAiLangDropdownOpen(false);
            }
        };

        if (isThemeDropdownOpen || isAiLangDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isThemeDropdownOpen, isAiLangDropdownOpen]);

    const [showTranscript, setShowTranscript] = useState(() => {
        const stored = localStorage.getItem('natively_interviewer_transcript');
        return stored !== 'false';
    });

    // Recognition Language
    const [recognitionLanguage, setRecognitionLanguage] = useState('');
    const [selectedSttGroup, setSelectedSttGroup] = useState('');
    const [availableLanguages, setAvailableLanguages] = useState<Record<string, any>>({});
    const [autoDetectedLanguage, setAutoDetectedLanguage] = useState<string | null>(null);

    // AI Response Language
    const [aiResponseLanguage, setAiResponseLanguage] = useState('English');
    const [availableAiLanguages, setAvailableAiLanguages] = useState<any[]>([]);

    // Overlay Opacity state
    const [overlayOpacity, setOverlayOpacity] = useState<number>(() => {
        const stored = localStorage.getItem('natively_overlay_opacity');
        const parsed = stored ? parseFloat(stored) : NaN;
        // Treat missing value or the old default (0.65) as "not user-set"
        const isUserSet = Number.isFinite(parsed) && parsed !== OVERLAY_OPACITY_DEFAULT;
        return isUserSet ? clampOverlayOpacity(parsed) : getDefaultOverlayOpacity();
    });

    // When the theme changes and the user hasn't saved a custom value, reset to theme-aware default
    const resolvedTheme = useResolvedTheme();
    useEffect(() => {
        const stored = localStorage.getItem('natively_overlay_opacity');
        const parsed = stored ? parseFloat(stored) : NaN;
        const isUserSet = Number.isFinite(parsed) && parsed !== OVERLAY_OPACITY_DEFAULT;
        if (!isUserSet) {
            setOverlayOpacity(getDefaultOverlayOpacity());
        }
    }, [resolvedTheme]);


    // Live preview state — true while the user is holding down the slider
    const [isPreviewingOpacity, setIsPreviewingOpacity] = useState(false);
    const [previewOverlayOpacity, setPreviewOverlayOpacity] = useState(overlayOpacity);

    // Ref to hold the latest opacity value without triggering renders during drag
    const latestOpacityRef = React.useRef(overlayOpacity);

    const handleOpacityChange = (val: number) => {
        // DOM-direct updates for 0-lag 60fps drag (bypasses React reconciliation)
        const percentText = `${Math.round(val * 100)}%`;
        document.querySelectorAll('.opacity-percent-label').forEach(el => el.textContent = percentText);
        setPreviewOverlayOpacity(val);
        latestOpacityRef.current = val;
        
        // Broadcast IPC in real-time so actual meeting overlay tracks slider instantly
        // (safe to do at 60fps, does not trigger React renders)
        window.electronAPI?.setOverlayOpacity?.(val);
    };

    // Bug fix #3: keep latestOpacityRef in sync when overlayOpacity changes outside of a drag
    // (e.g. on first mount, or if another part of code updates it)
    useEffect(() => {
        latestOpacityRef.current = overlayOpacity;
        setPreviewOverlayOpacity(overlayOpacity);
    }, [overlayOpacity]);

    // Bug fix #3 (close-during-drag): if the overlay closes while the user is still dragging,
    // restore all DOM state so nothing is left in a broken state.
    useEffect(() => {
        if (!isOpen && isPreviewingOpacity) {
            stopPreviewingOpacity();
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const startPreviewingOpacity = () => {
        // Bug fix #5: guard against rapid repeated calls (double pointerDown / touch events)
        if (isPreviewingOpacity) return;

        // Direct DOM mutation for sub-millisecond instant hide (bypassing slow React tree diffs)
        document.body.classList.add('disable-transitions');
        
        const backdrop = document.getElementById('settings-backdrop');
        const wrapper = document.getElementById('settings-panel-wrapper');
        const panel = document.getElementById('settings-panel');
        const card = document.getElementById('opacity-slider-card');
        const mockup = document.getElementById('settings-mockup-wrapper');
        const launcher = document.getElementById('launcher-container');

        if (backdrop) {
            backdrop.style.backgroundColor = 'transparent';
            backdrop.style.backdropFilter = 'none';
            backdrop.style.transition = 'none';
        }
        if (wrapper) {
            wrapper.style.backgroundColor = 'transparent';
            wrapper.style.border = 'none';
            wrapper.style.boxShadow = 'none';
        }
        if (panel) {
            panel.style.visibility = 'hidden';
        }
        if (launcher) {
            launcher.style.visibility = 'hidden';
        }
        
        if (card) {
            card.style.visibility = 'visible';
            card.style.position = 'relative';
            card.style.zIndex = '9999';
        }
        if (mockup) {
            mockup.style.opacity = '1';
        }

        setPreviewOverlayOpacity(latestOpacityRef.current);
        setIsPreviewingOpacity(true);
    };

    const stopPreviewingOpacity = () => {
        // Direct DOM restoration
        document.body.classList.remove('disable-transitions');
        const backdrop = document.getElementById('settings-backdrop');
        const wrapper = document.getElementById('settings-panel-wrapper');
        const panel = document.getElementById('settings-panel');
        const card = document.getElementById('opacity-slider-card');
        const mockup = document.getElementById('settings-mockup-wrapper');
        const launcher = document.getElementById('launcher-container');

        if (backdrop) {
            backdrop.style.backgroundColor = '';
            backdrop.style.backdropFilter = '';
            backdrop.style.transition = '';
        }
        if (wrapper) {
            wrapper.style.backgroundColor = '';
            wrapper.style.border = '';
            wrapper.style.boxShadow = '';
        }
        if (panel) {
            panel.style.visibility = '';
        }
        if (launcher) {
            launcher.style.visibility = '';
        }

        if (card) {
            card.style.visibility = '';
            card.style.position = '';
            card.style.zIndex = '';
        }
        if (mockup) {
            // Bug fix #4: restore mockup to hidden (opacity 0) rather than leaving it visible
            mockup.style.opacity = '0';
        }

        setIsPreviewingOpacity(false);
        // Sync final dragged value back to React state (persists to localStorage + IPC via useEffect)
        setOverlayOpacity(latestOpacityRef.current);
        setPreviewOverlayOpacity(latestOpacityRef.current);
    };

    useEffect(() => {
        // Only persist to localStorage here. IPC is handled real-time in handleOpacityChange
        // to avoid a redundant extra call 150ms after every drag ends.
        const timeoutId = setTimeout(() => {
            localStorage.setItem('natively_overlay_opacity', String(overlayOpacity));
        }, 150);
        return () => clearTimeout(timeoutId);
    }, [overlayOpacity]);

    useEffect(() => {
        const loadLanguages = async () => {
            if (window.electronAPI?.getRecognitionLanguages) {
                const langs = await window.electronAPI.getRecognitionLanguages();
                setAvailableLanguages(langs);

                // Load stored preference or auto-detect
                const storedStt = await window.electronAPI.getSttLanguage();
                let currentLangKey = storedStt;

                if (!currentLangKey) {
                    const systemLocale = navigator.language;
                    // Try to find exact match or primary match
                    const match = Object.entries(langs).find(([_, config]: [string, any]) =>
                        config.bcp47 === systemLocale ||
                        config.iso639 === systemLocale ||
                        (config.alternates && config.alternates.includes(systemLocale))
                    );

                    currentLangKey = match ? match[0] : 'english-us';

                    // Save the auto-detected default
                    if (window.electronAPI?.setRecognitionLanguage) {
                        window.electronAPI.setRecognitionLanguage(currentLangKey);
                    }
                }

                setRecognitionLanguage(currentLangKey);

                // Initialize Group based on current language
                if (langs[currentLangKey]) {
                    setSelectedSttGroup(langs[currentLangKey].group);
                } else {
                    setSelectedSttGroup('English');
                }
            }

            if (window.electronAPI?.getAiResponseLanguages) {
                const aiLangs = await window.electronAPI.getAiResponseLanguages();
                // Sort: Auto first, English second, then alphabetical
                const sortedAiLangs = [...aiLangs].sort((a, b) => {
                    if (a.code === 'auto') return -1;
                    if (b.code === 'auto') return 1;
                    if (a.label === 'English') return -1;
                    if (b.label === 'English') return 1;
                    return a.label.localeCompare(b.label);
                });
                setAvailableAiLanguages(sortedAiLangs);

                const storedAi = await window.electronAPI.getAiResponseLanguage();
                setAiResponseLanguage(storedAi || 'auto');
            }
        };
        loadLanguages();
    }, []);

    const handleLanguageChange = async (key: string) => {
        setRecognitionLanguage(key);
        setAutoDetectedLanguage(null);  // always reset — new session may detect a different language
        if (availableLanguages[key]) {
            setSelectedSttGroup(availableLanguages[key].group);
        }
        if (window.electronAPI?.setRecognitionLanguage) {
            await window.electronAPI.setRecognitionLanguage(key);
        }
    };

    const handleGroupChange = (group: string) => {
        setSelectedSttGroup(group);
        // Find default variant for this group (first one)
        const firstVariant = Object.entries(availableLanguages).find(([_, lang]) => lang.group === group);
        if (firstVariant) {
            handleLanguageChange(firstVariant[0]);
        }
    };

    // Helper to get unique groups
    const languageGroups = Array.from(new Set(Object.values(availableLanguages).map((l: any) => l.group)))
        .sort((a, b) => {
            if (a === 'Auto') return -1;
            if (b === 'Auto') return 1;
            if (a === 'English') return -1;
            if (b === 'English') return 1;
            return a.localeCompare(b);
        });

    // Helper to get variants for current group
    const currentGroupVariants = Object.entries(availableLanguages)

        .filter(([_, lang]) => lang.group === selectedSttGroup)
        .map(([key, lang]) => ({
            deviceId: key,
            label: lang.label,
            kind: 'audioinput' as MediaDeviceKind,
            groupId: '',
            toJSON: () => ({})
        }));

    const handleAiLanguageChange = async (key: string) => {
        if (!key) return;
        const previous = aiResponseLanguage;
        setAiResponseLanguage(key); // Optimistic update
        try {
            if (window.electronAPI?.setAiResponseLanguage) {
                const result = await window.electronAPI.setAiResponseLanguage(key);
                if (result && !result.success) {
                    // Rollback on explicit failure
                    setAiResponseLanguage(previous);
                    console.error('[Settings] Failed to set AI response language:', result.error);
                }
            }
        } catch (err) {
            // Rollback on exception
            setAiResponseLanguage(previous);
            console.error('[Settings] Exception setting AI response language:', err);
        }
    };


    // Sync transcript setting
    useEffect(() => {
        const handleStorage = () => {
            const stored = localStorage.getItem('natively_interviewer_transcript');
            setShowTranscript(stored !== 'false');
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // Theme Handlers
    const handleSetTheme = async (mode: 'system' | 'light' | 'dark') => {
        setThemeMode(mode);
        if (window.electronAPI?.setThemeMode) {
            await window.electronAPI.setThemeMode(mode);
        }
    };

    // Audio Settings
    const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedInput, setSelectedInput] = useState('');
    const [selectedOutput, setSelectedOutput] = useState('');
    const [micLevel, setMicLevel] = useState(0);

    // Load backend-managed settings on mount.
    useEffect(() => {
        const loadSttSettings = async () => {
            try {
                // @ts-ignore
                const creds = await window.electronAPI?.getStoredCredentials?.();
                if (creds) {
                    setHasStoredTavilyKey(creds.hasTavilyKey || false);
                }
            } catch (e) {
                console.error('Failed to load STT settings:', e);
            }
        };
        if (isOpen) loadSttSettings();
    }, [isOpen]);

    // PR #173: Live-reload settings whenever the backend broadcasts a credentials change
    // (e.g., when the user saves an STT key in a different window, or main fires it after
    // a provider auto-reconfigure like Natively key clear).
    useEffect(() => {
        if (!window.electronAPI?.onCredentialsChanged) return;
        const unsubscribe = window.electronAPI.onCredentialsChanged(() => {
            if (isOpen) {
                // Re-fetch credentials silently — purely additive, no state reset
                window.electronAPI?.getStoredCredentials?.().then((creds: any) => {
                    if (!creds) return;
                    setHasStoredTavilyKey(creds.hasTavilyKey || false);
                }).catch(() => { /* silently ignore */ });
            }
        });
        return () => unsubscribe();
    }, []); // mount-once: isOpen is checked inside the callback

    const handleRemoveTavilyKey = async () => {
        if (!confirm('Are you sure you want to remove the Tavily API Key?')) return;

        try {
            await window.electronAPI?.setTavilyApiKey?.('');
            setTavilyApiKey('');
            setHasStoredTavilyKey(false);
        } catch (e) {
            console.error('Failed to remove Tavily API key:', e);
        }
    };

    // Load stored credentials on mount




    const handleCheckForUpdates = async () => {
        if (updateStatus === 'checking') return;
        setUpdateStatus('checking');
        try {
            await window.electronAPI.checkForUpdates();
        } catch (error) {
            console.error("Failed to check for updates:", error);
            setUpdateStatus('error');
            setTimeout(() => setUpdateStatus('idle'), 3000);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        const unsubs = [
            window.electronAPI.onUpdateChecking(() => {
                setUpdateStatus('checking');
            }),
            window.electronAPI.onUpdateAvailable(() => {
                setUpdateStatus('downloading');
            }),
            window.electronAPI.onUpdateDownloaded(() => {
                setUpdateStatus('available');
            }),
            window.electronAPI.onUpdateNotAvailable((info) => {
                if (info?.source === 'microsoft-store') {
                    setUpdateStatus('store');
                    return;
                }
                setUpdateStatus('uptodate');
                setTimeout(() => setUpdateStatus('idle'), 3000);
            }),
            window.electronAPI.onUpdateManagedByStore(() => {
                setUpdateStatus('store');
            }),
            window.electronAPI.onUpdateError((err) => {
                console.error('[Settings] Update error:', err);
                setUpdateStatus('error');
                setTimeout(() => setUpdateStatus('idle'), 3000);
            })
        ];

        return () => unsubs.forEach(unsub => unsub());
    }, [isOpen, onClose]);



    useEffect(() => {
        if (isOpen) {
            // Load detectable status
            if (window.electronAPI?.getUndetectable) {
                window.electronAPI.getUndetectable().then(setIsUndetectable);
            }
            if (window.electronAPI?.getOpenAtLogin) {
                window.electronAPI.getOpenAtLogin().then(setOpenOnLogin);
            }
            if (window.electronAPI?.getThemeMode) {
                window.electronAPI.getThemeMode().then(({ mode }) => setThemeMode(mode));
            }

            // Load settings
            const loadDevices = async () => {
                try {
                    const [inputs, outputs] = await Promise.all([
                        // @ts-ignore
                        window.electronAPI?.getInputDevices() || Promise.resolve([]),
                        // @ts-ignore
                        window.electronAPI?.getOutputDevices() || Promise.resolve([])
                    ]);

                    // Map to shape compatible with CustomSelect (which expects MediaDeviceInfo-like objects)
                    const formatDevices = (devs: any[]) => devs.map(d => ({
                        deviceId: d.id,
                        label: d.name,
                        kind: 'audioinput' as MediaDeviceKind,
                        groupId: '',
                        toJSON: () => d
                    }));

                    setInputDevices(formatDevices(inputs));
                    setOutputDevices(formatDevices(outputs));

                    // Load saved preferences
                    const savedInput = localStorage.getItem('preferredInputDeviceId');
                    const savedOutput = localStorage.getItem('preferredOutputDeviceId');

                    if (savedInput && inputs.find((d: any) => d.id === savedInput)) {
                        setSelectedInput(savedInput);
                    } else if (inputs.length > 0 && !selectedInput) {
                        setSelectedInput(inputs[0].id);
                    }

                    if (savedOutput && outputs.find((d: any) => d.id === savedOutput)) {
                        setSelectedOutput(savedOutput);
                    } else if (outputs.length > 0 && !selectedOutput) {
                        setSelectedOutput(outputs[0].id);
                    }
                } catch (e) {
                    console.error("Error loading native devices:", e);
                }
            };
            loadDevices();

        }
    }, [isOpen, selectedInput, selectedOutput]); // Re-run if isOpen changes, or if selected devices are cleared

    // Use the native mic test path so device IDs stay consistent with the meeting runtime.
    useEffect(() => {
        if (isOpen && activeTab === 'audio') {
            const unsubscribe = window.electronAPI?.onAudioTestLevel?.((level) => {
                setMicLevel(Math.max(0, Math.min(100, level * 100)));
            });

            window.electronAPI?.startAudioTest(selectedInput || undefined).catch((error) => {
                console.error("Error starting native microphone test:", error);
                setMicLevel(0);
            });

            return () => {
                unsubscribe?.();
                window.electronAPI?.stopAudioTest?.().catch((error) => {
                    console.error("Error stopping native microphone test:", error);
                });
                setMicLevel(0);
            };
        } else {
            setMicLevel(0);
            window.electronAPI?.stopAudioTest?.().catch((error) => {
                console.error("Error stopping native microphone test:", error);
            });
        }
    }, [isOpen, activeTab, selectedInput]);

    const updateAiBehaviorScenario = (
        scenario: AiBehaviorScenario,
        patch: Partial<AiBehaviorSettings[AiBehaviorScenario]>
    ) => {
        setSavedBehaviorScenario(null);
        setAiBehaviorSettings(prev => ({
            ...prev,
            [scenario]: {
                ...prev[scenario],
                ...patch,
                customPrompt: patch.customPrompt !== undefined
                    ? patch.customPrompt.slice(0, AI_BEHAVIOR_CUSTOM_LIMIT)
                    : prev[scenario].customPrompt,
            },
        }));
    };

    const handleSaveAiBehaviorScenario = (scenario: AiBehaviorScenario) => {
        saveAiBehaviorSettings(aiBehaviorSettings);
        setSavedAiBehaviorSettingsSnapshot(aiBehaviorSettings);
        setSavedBehaviorScenario(scenario);
        setTimeout(() => setSavedBehaviorScenario(null), 1600);
    };

    const hasUnsavedAiBehaviorScenarioChanges = (scenario: AiBehaviorScenario) => {
        const current = aiBehaviorSettings[scenario];
        const saved = savedAiBehaviorSettingsSnapshot[scenario];

        return current.mode !== saved.mode
            || (current.defaultPrompt ?? '') !== (saved.defaultPrompt ?? '')
            || current.customPrompt !== saved.customPrompt;
    };

    const handleResumeUpload = async () => {
        setProfileError('');
        try {
            const fileResult = await window.electronAPI?.profileSelectFile?.();
            if (fileResult?.cancelled || !fileResult?.filePath) return;

            setProfileUploading(true);
            const result = await window.electronAPI?.profileUploadResume?.(fileResult.filePath);
            if (result?.success) {
                const status = await window.electronAPI?.profileGetStatus?.();
                if (status) setProfileStatus(status);
                const data = await window.electronAPI?.profileGetProfile?.();
                if (data) setProfileData(data);
            } else {
                setProfileError(result?.error || 'Upload failed');
            }
        } catch (e: any) {
            setProfileError(e.message || 'Upload failed');
        } finally {
            setProfileUploading(false);
        }
    };

    const handleResumeModeToggle = async () => {
        if (!profileStatus.hasProfile) return;
        const next = !profileStatus.profileMode;
        try {
            const result = await window.electronAPI?.profileSetMode?.(next);
            if (result?.success !== false) {
                setProfileStatus(prev => ({ ...prev, profileMode: next }));
            } else {
                setProfileError(result?.error || 'Could not update resume context mode');
            }
        } catch (e: any) {
            setProfileError(e.message || 'Could not update resume context mode');
        }
    };

    const handleResumeDelete = async () => {
        try {
            await window.electronAPI?.profileDelete?.();
            setProfileStatus({ hasProfile: false, profileMode: false });
            setProfileData(null);
            setProfileError('');
        } catch (e: any) {
            setProfileError(e.message || 'Could not remove resume');
        }
    };

    const handleResumeOpen = async () => {
        try {
            const result = await window.electronAPI?.profileOpenResume?.();
            if (result?.success === false) {
                setProfileError(result.error || 'Could not open resume');
            }
        } catch (e: any) {
            setProfileError(e.message || 'Could not open resume');
        }
    };

    const updateQuickAction = (
        id: string,
        patch: Partial<Pick<QuickActionConfig, 'label' | 'instruction'>>
    ) => {
        setSavedQuickActionId(current => (current === id ? null : current));
        if (DEFAULT_QUICK_ACTIONS.some((action) => action.id === id)) {
            const quickActionId = id as QuickActionId;
            setQuickActionSettings(prev => ({
                ...prev,
                [quickActionId]: {
                    ...prev[quickActionId],
                    ...patch,
                    label: patch.label !== undefined
                        ? patch.label.slice(0, QUICK_ACTION_LABEL_LIMIT)
                        : prev[quickActionId].label,
                    instruction: patch.instruction !== undefined
                        ? patch.instruction.slice(0, QUICK_ACTION_INSTRUCTION_LIMIT)
                        : prev[quickActionId].instruction,
                },
            }));
            return;
        }

        setCustomQuickActions(prev => prev.map((action) => (
            action.id === id
                ? {
                    ...action,
                    ...patch,
                    label: patch.label !== undefined
                        ? patch.label.slice(0, QUICK_ACTION_LABEL_LIMIT)
                        : action.label,
                    instruction: patch.instruction !== undefined
                        ? patch.instruction.slice(0, QUICK_ACTION_INSTRUCTION_LIMIT)
                        : action.instruction,
                }
                : action
        )));
    };

    const handleSaveQuickAction = (id: string) => {
        saveQuickActionSettings(quickActionSettings);
        saveCustomQuickActions(customQuickActions);
        setEditingQuickActionId(null);
        setSavedQuickActionId(id);
        setTimeout(() => {
            setSavedQuickActionId(current => (current === id ? null : current));
        }, 1600);
    };

    const handleAddCustomQuickAction = () => {
        const newAction = createEmptyCustomQuickAction();
        setCustomQuickActions(prev => [...prev, newAction]);
        setEditingQuickActionId(newAction.id);
        setSavedQuickActionId(null);
    };

    const handleDeleteQuickAction = (action: QuickActionConfig) => {
        setSavedQuickActionId(null);
        setEditingQuickActionId(current => (current === action.id ? null : current));

        if (action.isCustom) {
            const nextCustomActions = customQuickActions.filter((item) => item.id !== action.id);
            setCustomQuickActions(nextCustomActions);
            saveCustomQuickActions(nextCustomActions);
            return;
        }

        const actionId = action.id as QuickActionId;
        const nextRemoved = Array.from(new Set([...removedDefaultQuickActionIds, actionId]));
        setRemovedDefaultQuickActionIds(nextRemoved);
        saveRemovedDefaultQuickActionIds(nextRemoved);
    };

    const isPaidSubscription =
        subscription?.provider === 'razorpay' &&
        subscription?.plan !== 'free' &&
        subscription?.status === 'active';
    const planRenewalLabel = subscription?.renewsAt
        ? `Your plan auto-renews on ${formatAccountDate(subscription.renewsAt)}`
        : subscription?.expiresAt
            ? `Your plan ends on ${formatAccountDate(subscription.expiresAt)}`
            : 'Renewal date is not available yet.';
    const currentPlanLabel = subscription?.plan
        ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
        : 'Free';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    id="settings-backdrop"
                    className={`fixed inset-0 z-50 flex items-center justify-center p-8 transition-colors duration-150 ${isPreviewingOpacity ? 'bg-transparent backdrop-blur-none' : 'bg-black/60 backdrop-blur-sm'}`}
                >
                    <motion.div
                        id="settings-panel-wrapper"
                        initial={{ scale: 0.94, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.94, opacity: 0, y: 20 }}
                        transition={{ 
                            type: "spring", 
                            stiffness: 400, 
                            damping: 32,
                            mass: 1
                        }}
                        className="bg-bg-elevated h-[88vh] w-[min(96vw,1320px)] rounded-2xl border border-border-subtle shadow-2xl overflow-hidden relative"
                    >
                        <button
                            onClick={onClose}
                            aria-label="Close settings"
                            title="Close settings"
                            className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-bg-item-surface text-text-secondary transition-colors hover:bg-bg-item-active hover:text-text-primary"
                        >
                            <X size={16} />
                        </button>
                        <div 
                            id="settings-panel" 
                            className="flex w-full h-full"
                            style={{ visibility: isPreviewingOpacity ? 'hidden' : 'visible' }}
                        >
                        {/* Sidebar */}
                        <div className="w-72 bg-bg-sidebar flex min-h-0 flex-col border-r border-border-subtle">
                            <div className="min-h-0 flex-1 overflow-y-auto p-6 pb-4">
                                <h2 className="font-semibold text-gray-400 text-xs uppercase tracking-wider mb-2">Settings</h2>
                                <nav className="space-y-1">
                                    <button
                                        onClick={() => setActiveTab('account')}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${activeTab === 'account' ? 'bg-bg-item-active text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-item-active/50'}`}
                                    >
                                        <User size={14} className="shrink-0" /> Profile
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('general')}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${activeTab === 'general' ? 'bg-bg-item-active text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-item-active/50'}`}
                                    >
                                        <Monitor size={16} /> General
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('billing')}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${activeTab === 'billing' ? 'bg-bg-item-active text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-item-active/50'}`}
                                    >
                                        <Zap size={16} className={activeTab === 'billing' ? 'text-blue-500' : 'text-blue-500/70'} />
                                        <span>Billing</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('profile')}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${activeTab === 'profile' ? 'bg-bg-item-active text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-item-active/50'}`}
                                    >
                                        <User size={16} /> Customize
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('resume-builder')}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${activeTab === 'resume-builder' ? 'bg-bg-item-active text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-item-active/50'}`}
                                    >
                                        <FileText size={16} className="shrink-0 text-blue-500" />
                                        <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-pink-600 bg-clip-text font-semibold text-transparent">AI Resume Builder</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('recent-meetings')}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${activeTab === 'recent-meetings' ? 'bg-bg-item-active text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-item-active/50'}`}
                                    >
                                        <Clock size={16} /> Recent Meetings
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('audio')}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${activeTab === 'audio' ? 'bg-bg-item-active text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-item-active/50'}`}
                                    >
                                        <Mic size={16} /> Audio
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('keybinds')}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${activeTab === 'keybinds' ? 'bg-bg-item-active text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-item-active/50'}`}
                                    >
                                        <Keyboard size={16} /> Keybinds
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('help')}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-3 ${activeTab === 'help' ? 'bg-bg-item-active text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-item-active/50'}`}
                                    >
                                        <HelpCircle size={16} /> Guide & Help
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('about')}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${activeTab === 'about' ? 'bg-bg-item-active text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-item-active/50'}`}
                                    >
                                        <Info size={16} /> About
                                    </button>
                                    <button
                                        onClick={() => {
                                            void logoutUser();
                                            onClose();
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 text-red-400 hover:bg-red-500/10"
                                    >
                                        <LogOut size={16} /> Sign out
                                    </button>
                                </nav>
                            </div>

                            <div className="shrink-0 p-4 border-t border-border-subtle">
                                <button
                                    onClick={() => {
                                        if (!profile) {
                                            void window.electronAPI.quitApp();
                                            return;
                                        }
                                        setDeleteAccountError(null);
                                        setIsDeleteAccountConfirmOpen(true);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                                >
                                    <LogOut size={16} /> Quit Cluegent
                                </button>
                                <button onClick={onClose} className="group mt-2 w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-item-active/50 transition-colors flex items-center gap-3">
                                    <X size={18} className="group-hover:text-red-500 transition-colors" /> Close
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className={`min-w-0 flex-1 bg-bg-main overflow-y-auto ${activeTab === 'billing' ? 'p-0' : 'p-9'}`}>
                            <div hidden={activeTab !== 'resume-builder'}><AIResumeBuilder active={activeTab === 'resume-builder' && isOpen} onSubscribe={() => setActiveTab('billing')} /></div>
                            {activeTab === 'account' && (
                                <div className="space-y-6 animated fadeIn">
                                    <div>
                                        <h3 className="text-lg font-bold text-text-primary mb-1">Account</h3>
                                        <p className="text-xs text-text-secondary">
                                            Your signed-in account, plan status, and billing controls.
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-border-subtle bg-bg-card p-6">
                                        <div className="divide-y divide-border-subtle">
                                            <div className="flex items-center justify-between gap-5 py-4 first:pt-0">
                                                <p className="text-sm font-semibold text-text-primary">Name</p>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-text-primary">
                                                        {profile?.displayName || 'Signed-in user'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between gap-5 py-4">
                                                <p className="text-sm font-semibold text-text-primary">Email</p>
                                                <p className="min-w-0 truncate text-right text-sm font-medium text-text-secondary">
                                                    {profile?.email || 'No email available'}
                                                </p>
                                            </div>

                                            <div className="py-5">
                                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold text-text-primary">
                                                            Cluegent {currentPlanLabel}
                                                            {subscription?.providerMode === 'test' ? (
                                                                <span className="ml-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">
                                                                    Test
                                                                </span>
                                                            ) : null}
                                                        </p>
                                                        <p className="mt-1 text-sm text-text-secondary">
                                                            {subscription?.plan === 'free' ? 'Free plan is active.' : planRenewalLabel}
                                                        </p>
                                                        {(planStatus?.plan === 'hour3' || planStatus?.plan === 'hour10') && (
                                                            <p className="mt-2 text-sm font-semibold tabular-nums text-text-primary">
                                                                {Math.floor(Math.max(0, planStatus.remaining.sttSeconds) / 3600)}h {Math.floor(Math.max(0, planStatus.remaining.sttSeconds) % 3600 / 60)}m left
                                                            </p>
                                                        )}
                                                    </div>

                                                    {isPaidSubscription && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsCancelConfirmOpen(true);
                                                                setCancelMessage(null);
                                                                setCancelError(null);
                                                            }}
                                                            disabled={isCancellingSubscription}
                                                            className="inline-flex items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/15 disabled:opacity-60"
                                                        >
                                                            Cancel Subscription
                                                        </button>
                                                    )}
                                                </div>

                                                {isCancelConfirmOpen && (
                                                    <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                                                        <p className="text-sm font-semibold text-red-200">
                                                            Cancel this subscription immediately?
                                                        </p>
                                                        <p className="mt-1 text-xs leading-5 text-red-100/75">
                                                            This will cancel the Razorpay subscription now and move this account back to the free plan.
                                                        </p>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    void handleCancelSubscription();
                                                                }}
                                                                disabled={isCancellingSubscription}
                                                                className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-60"
                                                            >
                                                                {isCancellingSubscription ? (
                                                                    <>
                                                                        <Loader2 size={14} className="animate-spin" />
                                                                        Cancelling
                                                                    </>
                                                                ) : (
                                                                    'Yes, cancel now'
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsCancelConfirmOpen(false)}
                                                                disabled={isCancellingSubscription}
                                                                className="rounded-full border border-border-subtle bg-bg-item-surface px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-bg-item-active disabled:opacity-60"
                                                            >
                                                                No, keep plan
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {cancelMessage && (
                                                    <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                                                        {cancelMessage}
                                                    </div>
                                                )}

                                                {cancelError && (
                                                    <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                                        {cancelError}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                            {activeTab === 'general' && (
                                <div className="space-y-6 animated fadeIn">
                                    <div className="space-y-3.5">
                                        {/* UndetectableToggle */}
                                        <div className={`${isLight ? 'bg-bg-card' : 'bg-bg-item-surface'} rounded-xl p-5 border border-border-subtle flex items-center justify-between transition-all ${isUndetectable ? 'shadow-lg shadow-blue-500/10' : ''}`}>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    {isUndetectable ? (
                                                        <svg
                                                            width="18"
                                                            height="18"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="text-text-primary"
                                                        >
                                                            <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" fill="currentColor" stroke="currentColor" />
                                                            <path d="M9 10h.01" stroke="var(--bg-item-surface)" strokeWidth="2.5" />
                                                            <path d="M15 10h.01" stroke="var(--bg-item-surface)" strokeWidth="2.5" />
                                                        </svg>
                                                    ) : (
                                                        <Ghost size={18} className="text-text-primary" />
                                                    )}
                                                    <h3 className="text-lg font-bold text-text-primary">{isUndetectable ? 'Undetectable' : 'Detectable'}</h3>
                                                </div>
                                                <p className="text-xs text-text-secondary">
                                                    Cluegent is currently {isUndetectable ? 'undetectable' : 'detectable'} by screen-sharing. <button className="text-blue-400 hover:underline">Supported apps here</button>
                                                </p>
                                            </div>
                                            <div
                                                onClick={() => {
                                                    const newState = !isUndetectable;
                                                    setIsUndetectable(newState);
                                                    window.electronAPI?.setUndetectable(newState);
                                                    // Analytics: Undetectable Mode Toggle
                                                    analytics.trackModeSelected(newState ? 'undetectable' : 'overlay');
                                                }}
                                                className={`w-11 h-6 rounded-full relative transition-colors ${isUndetectable ? 'bg-accent-primary' : 'bg-bg-toggle-switch border border-border-muted'}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isUndetectable ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </div>
                                        </div>

                                        {/* Mouse Passthrough Toggle — Adapted from public PR #113 */}
                                        <div className={`${isLight ? 'bg-bg-card' : 'bg-bg-item-surface'} rounded-xl p-5 border border-border-subtle flex items-center justify-between transition-all ${isMousePassthrough ? 'shadow-lg shadow-sky-500/10' : ''}`}>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <PointerOff size={18} className={isMousePassthrough ? 'text-sky-400' : 'text-text-primary'} />
                                                    <h3 className="text-lg font-bold text-text-primary">Mouse Passthrough</h3>
                                                </div>
                                                <p className="text-xs text-text-secondary">
                                                    Overlay stays visible but lets all mouse clicks pass through to the app beneath.
                                                </p>
                                            </div>
                                            <div
                                                onClick={() => {
                                                    const newState = !isMousePassthrough;
                                                    setIsMousePassthrough(newState);
                                                    window.electronAPI?.setOverlayMousePassthrough(newState);
                                                }}
                                                className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${isMousePassthrough ? 'bg-sky-500' : 'bg-bg-toggle-switch border border-border-muted'}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isMousePassthrough ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-bold text-text-primary mb-1">General settings</h3>
                                            <p className="text-xs text-text-secondary mb-2">Customize how Cluegent works for you</p>

                                            <div className={`rounded-xl border ${isLight ? 'bg-bg-card border-border-subtle divide-y divide-border-subtle' : 'bg-transparent border-transparent divide-y divide-border-subtle/20'}`}>
                                            <div className="space-y-0">
                                                {/* Open at Login */}
                                                <div className="flex items-center justify-between px-4 py-3">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-bg-item-surface rounded-lg border border-border-subtle flex items-center justify-center text-text-tertiary">
                                                            <Power size={20} />
                                                        </div>
                                                        <div>
                                                <h3 className="text-sm font-bold text-text-primary">Open Cluegent when you log in</h3>
                                                <p className="text-xs text-text-secondary mt-0.5">Cluegent will open automatically when you log in to your computer</p>
                                                        </div>
                                                    </div>
                                                    <div
                                                        onClick={() => {
                                                            const newState = !openOnLogin;
                                                            setOpenOnLogin(newState);
                                                            window.electronAPI?.setOpenAtLogin(newState);
                                                        }}
                                                        className={`w-11 h-6 rounded-full relative transition-colors ${openOnLogin ? 'bg-accent-primary' : 'bg-bg-toggle-switch border border-border-muted'}`}
                                                    >
                                                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${openOnLogin ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>


                                                {/* Interviewer Transcript */}
                                                <div className="flex items-center justify-between px-4 py-3">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-bg-item-surface rounded-lg border border-border-subtle flex items-center justify-center text-text-tertiary">
                                                            <MessageSquare size={20} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-bold text-text-primary">Interviewer Transcript</h3>
                                                            <p className="text-xs text-text-secondary mt-0.5">Show real-time transcription of the interviewer</p>
                                                        </div>
                                                    </div>
                                                    <div
                                                        onClick={() => {
                                                            const newState = !showTranscript;
                                                            setShowTranscript(newState);
                                                            localStorage.setItem('natively_interviewer_transcript', String(newState));
                                                            window.dispatchEvent(new Event('storage'));
                                                        }}
                                                        className={`w-11 h-6 rounded-full relative transition-colors ${showTranscript ? 'bg-accent-primary' : 'bg-bg-toggle-switch border border-border-muted'}`}
                                                    >
                                                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${showTranscript ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>


                                                {/* Theme */}
                                                <div className="flex items-center justify-between px-4 py-3">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-bg-item-surface rounded-lg border border-border-subtle flex items-center justify-center text-text-tertiary">
                                                            <Palette size={20} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-bold text-text-primary">Theme</h3>
                                                        <p className="text-xs text-text-secondary mt-0.5">Customize how Cluegent looks on your device</p>
                                                        </div>
                                                    </div>

                                                    <div className="relative" ref={themeDropdownRef}>
                                                        <button
                                                            onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                                                            className="bg-bg-component hover:bg-bg-elevated border border-border-subtle text-text-primary px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 min-w-[110px] justify-between"
                                                        >
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <span className="text-text-secondary shrink-0">
                                                                    {themeMode === 'system' && <Monitor size={14} />}
                                                                    {themeMode === 'light' && <Sun size={14} />}
                                                                    {themeMode === 'dark' && <Moon size={14} />}
                                                                </span>
                                                                <span className="capitalize text-ellipsis overflow-hidden whitespace-nowrap">{themeMode}</span>
                                                            </div>
                                                            <ChevronDown size={12} className={`shrink-0 transition-transform ${isThemeDropdownOpen ? 'rotate-180' : ''}`} />
                                                        </button>

                                                        {/* Dropdown Menu */}
                                                        {isThemeDropdownOpen && (
                                                            <div className="absolute right-0 top-full mt-1 min-w-full w-max bg-bg-elevated border border-border-subtle rounded-lg shadow-xl overflow-hidden z-20 p-1 animated fadeIn select-none">
                                                                {[
                                                                    { mode: 'system', label: 'System', icon: <Monitor size={14} /> },
                                                                    { mode: 'light', label: 'Light', icon: <Sun size={14} /> },
                                                                    { mode: 'dark', label: 'Dark', icon: <Moon size={14} /> }
                                                                ].map((option) => (
                                                                    <button
                                                                        key={option.mode}
                                                                        onClick={() => {
                                                                            handleSetTheme(option.mode as any);
                                                                            setIsThemeDropdownOpen(false);
                                                                        }}
                                                                        className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center gap-2 transition-colors ${themeMode === option.mode ? 'text-text-primary bg-bg-item-active/50' : 'text-text-secondary hover:bg-bg-input hover:text-text-primary'}`}
                                                                    >
                                                                        <span className={themeMode === option.mode ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}>{option.icon}</span>
                                                                        <span className="font-medium">{option.label}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                    {/* AI Response Language */}
                                                <div className="flex items-center justify-between px-4 py-3">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-bg-item-surface rounded-lg border border-border-subtle flex items-center justify-center text-text-tertiary">
                                                            <Globe size={20} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-bold text-text-primary">AI Response Language</h3>
                                                            <p className="text-xs text-text-secondary mt-0.5">
                                                                {aiResponseLanguage === 'auto'
                                                                    ? 'Mirrors user\'s language automatically'
                                                                    : 'Language for AI suggestions and notes'
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="relative" ref={aiLangDropdownRef}>
                                                        <button
                                                            onClick={() => setIsAiLangDropdownOpen(!isAiLangDropdownOpen)}
                                                            className="bg-bg-component hover:bg-bg-elevated border border-border-subtle text-text-primary px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 min-w-[110px] justify-between"
                                                        >
                                                            <span className="capitalize text-ellipsis overflow-hidden whitespace-nowrap flex items-center gap-1">
                                                                {aiResponseLanguage === 'auto' ? 'Auto' : aiResponseLanguage}
                                                            </span>
                                                            <ChevronDown size={12} className={`shrink-0 transition-transform ${isAiLangDropdownOpen ? 'rotate-180' : ''}`} />
                                                        </button>

                                                        {/* Dropdown Menu */}
                                                        {isAiLangDropdownOpen && (
                                                            <div className="absolute right-0 top-full mt-1 min-w-full w-max bg-bg-elevated border border-border-subtle rounded-lg shadow-xl overflow-hidden z-20 p-1 animated fadeIn select-none max-h-60 overflow-y-auto custom-scrollbar">
                                                                {availableAiLanguages.map((option) => (
                                                                    <button
                                                                        key={option.code}
                                                                        onClick={() => {
                                                                            handleAiLanguageChange(option.code);
                                                                            setIsAiLangDropdownOpen(false);
                                                                        }}
                                                                        className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center gap-2 transition-colors ${aiResponseLanguage === option.code ? 'text-text-primary bg-bg-item-active/50' : 'text-text-secondary hover:bg-bg-input hover:text-text-primary'}`}
                                                                    >
                                                                        {option.code === 'auto' ? (
                                                                            <span className="font-medium">Auto</span>
                                                                        ) : (
                                                                            <span className="font-medium">{option.label}</span>
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Version */}
                                                <div className="flex items-start justify-between gap-4 px-4 py-3">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-10 h-10 bg-bg-item-surface rounded-lg border border-border-subtle flex items-center justify-center text-text-tertiary shrink-0">
                                                            <BadgeCheck size={20} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-bold text-text-primary">Version</h3>
                                                            <p className="text-xs text-text-secondary mt-0.5">
                                        You are currently using Cluegent version {packageJson.version}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (updateStatus === 'store') {
                                                                await window.electronAPI.openExternal('ms-windows-store://downloadsandupdates');
                                                                return;
                                                            }
                                                            if (updateStatus === 'available') {
                                                                try {
                                                                    const result = await window.electronAPI.restartAndInstall();
                                                                    if (!result.success) throw new Error(result.error);
                                                                    onClose();
                                                                } catch (err) {
                                                                    console.error("Failed to start download:", err);
                                                                }
                                                            } else {
                                                                handleCheckForUpdates();
                                                            }
                                                        }}
                                                disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                                                        className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2 shrink-0 ${updateStatus === 'checking' ? 'bg-bg-input text-text-tertiary cursor-wait' :
                                                            updateStatus === 'available' ? 'bg-accent-primary text-white hover:bg-accent-secondary shadow-lg shadow-blue-500/20' :
                                                                updateStatus === 'uptodate' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                                    updateStatus === 'store' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                                        updateStatus === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                                            'bg-bg-component hover:bg-bg-input text-text-primary'
                                                            }`}
                                                    >
                                                        {updateStatus === 'checking' || updateStatus === 'downloading' ? (
                                                            <>
                                                                <RefreshCw size={14} className="animate-spin" />
                                                                {updateStatus === 'downloading' ? 'Downloading update…' : 'Checking…'}
                                                            </>
                                                        ) : updateStatus === 'available' ? (
                                                            <>
                                                                <ArrowDown size={14} />
                                                                Restart to update
                                                            </>
                                                        ) : updateStatus === 'uptodate' ? (
                                                            <>
                                                                <Check size={14} />
                                                                Up to date
                                                            </>
                                                        ) : updateStatus === 'store' ? (
                                                            <>
                                                                <RefreshCw size={14} />
                                                                Open Microsoft Store
                                                            </>
                                                        ) : updateStatus === 'error' ? (
                                                            <>
                                                                <X size={14} />
                                                                Error
                                                            </>
                                                        ) : (
                                                            <>
                                                                <RefreshCw size={14} />
                                                                Check for updates
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            </div>

                                                {/* ------------------------------------------------------------------ */}
                                                {/* Interface Opacity (Stealth Mode)                                   */}
                                                {/* ------------------------------------------------------------------ */}
                                                <div
                                                    id="opacity-slider-card"
                                                    style={isPreviewingOpacity ? { visibility: 'visible', position: 'relative', zIndex: 9999 } : {}}
                                                    className={`${isLight ? 'bg-bg-card' : 'bg-bg-item-surface'} rounded-xl p-5 border border-border-subtle mt-4`}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <label className="flex items-center gap-2 text-xs font-medium text-text-secondary uppercase tracking-wide">
                                                            <Eye size={13} className="text-text-secondary" />
                                                            Interface Opacity
                                                        </label>
                                                        <span className="opacity-percent-label text-xs font-semibold text-text-primary tabular-nums">
                                                            {Math.round(overlayOpacity * 100)}%
                                                        </span>
                                                    </div>

                                                    <input
                                                        type="range"
                                                        min={OVERLAY_OPACITY_MIN}
                                                        max={1.0}
                                                        step={0.01}
                                                        defaultValue={overlayOpacity}
                                                        onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                                                        onPointerDown={startPreviewingOpacity}
                                                        onPointerUp={stopPreviewingOpacity}
                                                        onPointerCancel={stopPreviewingOpacity}
                                                        onPointerLeave={stopPreviewingOpacity}
                                                        className="w-full h-1.5 rounded-full appearance-none bg-bg-input accent-accent-primary"
                                                        style={{ WebkitAppearance: 'none' } as React.CSSProperties}
                                                    />

                                                    <div className="flex justify-between mt-1.5">
                                                        <span className="text-[10px] text-text-tertiary">More Stealth</span>
                                                        <span className="text-[10px] text-text-tertiary">Fully Visible</span>
                                                    </div>

                                                    <p className="text-xs text-text-tertiary mt-2">
                                                        Controls the visibility of the in-meeting overlay.{' '}
                                                        <span className="text-text-secondary">Hold the slider to preview.</span>
                                                    </p>
                                                </div>

                                        </div>

                                    </div>

                                    {/* Process Disguise */}
                                    {/* Process Disguise */}
                                    <div className={`${isLight ? 'bg-bg-card' : 'bg-bg-item-surface'} rounded-xl p-5 border border-border-subtle`}>
                                        <div className="flex flex-col gap-1 mb-3">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-text-primary">Process Disguise</h3>
                                            </div>
                                            <p className="text-xs text-text-secondary">
                                                Disguise Cluegent as another application to prevent detection during screen sharing.
                                                <span className="block mt-1 text-text-tertiary">
                                                    Select a disguise to be automatically applied when Undetectable mode is on.
                                                </span>
                                            </p>
                                        </div>

                                        <div className={`grid grid-cols-2 gap-3 ${isUndetectable ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {isUndetectable && (
                                                <p className="col-span-2 text-xs text-yellow-500/80 -mt-1 mb-1">
                                                    ⚠️ Disable Undetectable mode first to change disguise.
                                                </p>
                                            )}
                                            {[
                                                { id: 'none', label: 'None (Default)', icon: <Layout size={14} /> },
                                                { id: 'terminal', label: 'Terminal', icon: <Terminal size={14} /> },
                                                { id: 'settings', label: 'System Settings', icon: <Settings size={14} /> },
                                                { id: 'activity', label: 'Activity Monitor', icon: <Activity size={14} /> }
                                            ].map((option) => (
                                                <button
                                                    key={option.id}
                                                    disabled={isUndetectable}
                                                    onClick={() => {
                                                        if (isUndetectable) return;
                                                        // @ts-ignore
                                                        setDisguiseMode(option.id);
                                                        // @ts-ignore
                                                        window.electronAPI?.setDisguise(option.id);
                                                        // Analytics
                                                        analytics.trackModeSelected(`disguise_${option.id}`);
                                                    }}
                                                    className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${disguiseMode === option.id
                                                        ? 'bg-accent-primary border-accent-primary text-white shadow-lg shadow-blue-500/20'
                                                        : 'bg-bg-input border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-subtle-hover'
                                                        } ${isUndetectable ? 'cursor-not-allowed' : ''}`}
                                                >
                                                    <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${disguiseMode === option.id ? 'bg-white/20 text-white' : 'bg-bg-item-surface text-text-secondary'
                                                        }`}>
                                                        {option.icon}
                                                    </div>
                                                    <span className="text-xs font-medium">{option.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            )}
                            {activeTab === 'profile' && (
                                <div className="space-y-5 animated fadeIn pb-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-text-primary tracking-tight">Customize AI behavior</h3>
                                            <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
                                                Choose how Cluegent should answer in each mode. Custom instructions are kept short on purpose so responses stay fast and the model has less prompt noise.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-border-subtle bg-bg-item-surface overflow-hidden">
                                        <div className="p-5">
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="flex min-w-0 gap-4">
                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-input text-accent-primary">
                                                        {profileUploading ? <RefreshCw size={19} className="animate-spin" /> : <Upload size={19} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="text-base font-bold text-text-primary">Resume context</h4>
                                                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${profileStatus.hasProfile ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500' : 'border-border-subtle bg-bg-input text-text-tertiary'}`}>
                                                                {profileStatus.hasProfile ? 'Ready' : 'Local'}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 max-w-xl text-xs leading-relaxed text-text-secondary">
                                                            Upload PDF, DOCX, or TXT. Cluegent keeps it local and uses it only when the question is relevant.
                                                        </p>
                                                        {profileStatus.hasProfile && (
                                                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-tertiary">
                                                                <button
                                                                    type="button"
                                                                    onClick={handleResumeOpen}
                                                                    className="inline-flex max-w-[280px] items-center gap-2 rounded-full bg-bg-input px-3 py-2 text-text-secondary transition-colors hover:text-text-primary"
                                                                    title="Open uploaded resume"
                                                                >
                                                                    {getResumeFileIcon(profileData?.fileName)}
                                                                    <span className="min-w-0 flex-1 truncate text-left leading-tight">
                                                                        {profileData?.fileName || profileStatus.name || 'Resume uploaded'}
                                                                    </span>
                                                                    <ExternalLink size={12} className="shrink-0" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={handleResumeUpload}
                                                        disabled={profileUploading}
                                                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${profileUploading ? 'cursor-wait border border-border-subtle bg-bg-input text-text-tertiary' : 'bg-slate-950 text-white shadow-sm hover:bg-slate-800 active:scale-[0.98]'}`}
                                                    >
                                                        {profileUploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                                                        {profileUploading ? 'Uploading' : profileStatus.hasProfile ? 'Replace' : 'Upload resume'}
                                                    </button>
                                                    {profileStatus.hasProfile && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={handleResumeModeToggle}
                                                                className={`inline-flex h-9 min-w-[82px] items-center justify-center gap-2 rounded-full border px-3 text-xs font-semibold transition-all ${profileStatus.profileMode ? 'border-emerald-500/25 bg-emerald-500/12 text-emerald-500' : 'border-border-subtle bg-bg-input text-text-secondary hover:text-text-primary'}`}
                                                            >
                                                                <span className={`relative h-4 w-8 shrink-0 rounded-full transition-colors ${profileStatus.profileMode ? 'bg-emerald-500' : 'bg-bg-toggle-switch border border-border-muted'}`}>
                                                                    <span className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${profileStatus.profileMode ? 'translate-x-4' : 'translate-x-0'}`} />
                                                                </span>
                                                                <span className="w-5 text-left leading-none">{profileStatus.profileMode ? 'On' : 'Off'}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleResumeDelete}
                                                                aria-label="Remove resume"
                                                                title="Remove resume"
                                                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-bg-input text-text-tertiary transition-colors hover:border-red-500/25 hover:bg-red-500/10 hover:text-red-500"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {profileError && (
                                                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500">
                                                    {profileError}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="hidden rounded-2xl border border-border-subtle bg-bg-item-surface p-5">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-bg-input border border-border-subtle flex items-center justify-center text-accent-primary shrink-0">
                                                <Pencil size={18} />
                                            </div>
                                            <div className="min-w-0 pt-0.5">
                                                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                                                    Add response style context like “keep it short”, “explain step by step”, or “always include code examples”.
                                                    Cluegent stores only a compact instruction per mode, then injects the selected behavior into the LLM request.
                                                </p>
                                                <p className="text-[11px] text-text-tertiary mt-2">
                                                    Recommended limit: {AI_BEHAVIOR_CUSTOM_LIMIT} characters. Shorter context usually means faster answers.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {AI_BEHAVIOR_SCENARIOS.map((scenario) => {
                                            const setting = aiBehaviorSettings[scenario.id];
                                            const isCustom = setting.mode === 'custom';
                                            const isSaved = savedBehaviorScenario === scenario.id;
                                            const hasUnsavedChanges = hasUnsavedAiBehaviorScenarioChanges(scenario.id);
                                            const defaultPrompt = setting.defaultPrompt || getDefaultBehaviorPrompt(scenario.id);

                                            return (
                                                <div key={scenario.id} className="rounded-2xl border border-border-subtle bg-bg-item-surface overflow-hidden">
                                                    <div className="p-5 border-b border-border-subtle/70">
                                                        <div>
                                                            <div>
                                                                <h4 className="text-base font-bold text-text-primary">{scenario.title}</h4>
                                                                <p className="text-xs text-text-secondary mt-1">{scenario.description}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-5 space-y-4">
                                                        <div className={`rounded-xl border p-4 transition-all ${!isCustom ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-bg-input border-border-subtle'}`}>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateAiBehaviorScenario(scenario.id, { mode: 'default' })}
                                                                className="flex items-center gap-2 mb-3 text-left"
                                                            >
                                                                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border transition-all ${!isCustom ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border-muted text-transparent'}`}>
                                                                    <Check size={12} />
                                                                </span>
                                                                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary">Default behavior</span>
                                                            </button>
                                                            <textarea
                                                                value={defaultPrompt}
                                                                onChange={(event) => updateAiBehaviorScenario(scenario.id, {
                                                                    defaultPrompt: event.target.value,
                                                                })}
                                                                onKeyDown={(event) => event.stopPropagation()}
                                                                onKeyUp={(event) => event.stopPropagation()}
                                                                rows={3}
                                                                className="w-full bg-bg-input border border-border-subtle rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20 transition-all resize-none leading-relaxed"
                                                            />
                                                        </div>

                                                        <div className={`rounded-xl border p-4 transition-all ${isCustom ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-bg-input border-border-subtle'}`}>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateAiBehaviorScenario(scenario.id, { mode: 'custom' })}
                                                                    className="flex items-center gap-2 text-left"
                                                                >
                                                                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border transition-all ${isCustom ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border-muted text-transparent'}`}>
                                                                        <Check size={12} />
                                                                    </span>
                                                                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary">Your custom behavior</span>
                                                                </button>
                                                                <span className={`text-[10px] tabular-nums ${setting.customPrompt.length > AI_BEHAVIOR_CUSTOM_LIMIT * 0.85 ? 'text-amber-500' : 'text-text-tertiary'}`}>
                                                                    {setting.customPrompt.length}/{AI_BEHAVIOR_CUSTOM_LIMIT}
                                                                </span>
                                                            </div>
                                                            <textarea
                                                                value={setting.customPrompt}
                                                                onChange={(event) => updateAiBehaviorScenario(scenario.id, {
                                                                    customPrompt: event.target.value,
                                                                })}
                                                                onKeyDown={(event) => event.stopPropagation()}
                                                                onKeyUp={(event) => event.stopPropagation()}
                                                                placeholder={scenario.placeholder}
                                                                rows={3}
                                                                className="w-full bg-bg-input border border-border-subtle rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20 transition-all resize-none leading-relaxed"
                                                            />
                                                        </div>

                                                        <div className="flex items-center justify-between gap-3">
                                                            <p className="text-[11px] text-text-tertiary">
                                                                Active mode: <span className="ml-1 inline-flex rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">{isCustom ? 'Custom' : 'Default'}</span>
                                                            </p>
                                                            {hasUnsavedChanges ? (
                                                                <button
                                                                    onClick={() => handleSaveAiBehaviorScenario(scenario.id)}
                                                                    className="px-4 py-2 rounded-full text-xs font-semibold transition-all bg-slate-950 text-white hover:bg-slate-800 shadow-sm"
                                                                >
                                                                    Save behavior
                                                                </button>
                                                            ) : isSaved ? (
                                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/15 px-3 py-2 text-[11px] font-semibold text-emerald-500">
                                                                    <Check size={12} />
                                                                    Saved
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="rounded-2xl border border-border-subtle bg-bg-item-surface overflow-hidden">
                                        <div className="flex items-start justify-between gap-4 border-b border-border-subtle/70 p-5">
                                            <div>
                                                <h4 className="text-base font-bold text-text-primary">Quick Action Buttons</h4>
                                                <p className="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
                                                    Rename the prompt buttons and tune what each button asks the AI to do.
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-3">
                                                <button
                                                    onClick={handleAddCustomQuickAction}
                                                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                                                >
                                                    <span className="text-sm leading-none">+</span>
                                                    Add
                                                </button>
                                                <div className="flex items-center gap-3 rounded-full border border-border-subtle bg-bg-input px-3 py-2">
                                                    <p className="text-[11px] text-text-secondary">{showQuickActionButtons ? 'On' : 'Off'}</p>
                                                    <button
                                                        onClick={() => {
                                                            const nextValue = !showQuickActionButtons;
                                                            setShowQuickActionButtons(nextValue);
                                                            saveQuickActionVisibility(nextValue);
                                                        }}
                                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${showQuickActionButtons ? 'bg-emerald-500/80' : 'bg-bg-item-active'}`}
                                                        aria-pressed={showQuickActionButtons}
                                                        title="Toggle quick action buttons in the app"
                                                    >
                                                        <span
                                                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${showQuickActionButtons ? 'translate-x-6' : 'translate-x-1'}`}
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-5 space-y-3">
                                            {[...getVisibleDefaultQuickActions().map((action) => quickActionSettings[action.id as QuickActionId]), ...customQuickActions].map((action) => {
                                                const current = action.isCustom ? null : quickActionSettings[action.id as QuickActionId];
                                                const isEditing = editingQuickActionId === action.id;
                                                const isSaved = savedQuickActionId === action.id;
                                                const item = action.isCustom ? action : (current || action);

                                                return (
                                                    <div key={action.id} className="rounded-xl border border-border-subtle bg-bg-input p-4">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary">
                                                                    {action.isCustom ? 'Custom Button' : `Default: ${action.label}`}
                                                                </p>
                                                                {!isEditing && (
                                                                    <p className="mt-1 truncate text-sm font-semibold text-text-primary">
                                                                        {item.label}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex shrink-0 flex-col items-end gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => setEditingQuickActionId(isEditing ? null : action.id)}
                                                                        className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-item-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:text-text-primary"
                                                                    >
                                                                        <Edit3 size={12} />
                                                                        {isEditing ? 'Close' : 'Edit'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteQuickAction(action)}
                                                                        className="inline-flex items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-red-400 transition hover:bg-red-500/15 hover:text-red-300"
                                                                        title="Delete quick action button"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                                {isEditing && (
                                                                    <button
                                                                        onClick={() => handleSaveQuickAction(action.id)}
                                                                        className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${isSaved ? 'border border-emerald-500/25 bg-emerald-500/15 text-emerald-500' : 'bg-slate-950 text-white shadow-sm hover:bg-slate-800'}`}
                                                                    >
                                                                        {isSaved ? 'Saved' : 'Save'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {isEditing ? (
                                                            <div className="mt-4 space-y-3">
                                                                <div>
                                                                    <div className="mb-1.5 flex items-center justify-between">
                                                                        <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">Button text</label>
                                                                        <span className="text-[10px] text-text-tertiary">{item.label.length}/{QUICK_ACTION_LABEL_LIMIT}</span>
                                                                    </div>
                                                                    <input
                                                                        value={item.label}
                                                                        onChange={(event) => updateQuickAction(action.id, { label: event.target.value })}
                                                                        onKeyDown={(event) => event.stopPropagation()}
                                                                        onKeyUp={(event) => event.stopPropagation()}
                                                                        className="w-full rounded-lg border border-border-subtle bg-bg-item-surface px-3 py-2 text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <div className="mb-1.5 flex items-center justify-between">
                                                                        <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">LLM behavior for this button</label>
                                                                        <span className="text-[10px] text-text-tertiary">{item.instruction.length}/{QUICK_ACTION_INSTRUCTION_LIMIT}</span>
                                                                    </div>
                                                                    <textarea
                                                                        value={item.instruction}
                                                                        onChange={(event) => updateQuickAction(action.id, { instruction: event.target.value })}
                                                                        onKeyDown={(event) => event.stopPropagation()}
                                                                        onKeyUp={(event) => event.stopPropagation()}
                                                                        rows={3}
                                                                        className="w-full resize-none rounded-lg border border-border-subtle bg-bg-item-surface px-3 py-2 text-xs leading-relaxed text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                                                                {item.instruction}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'recent-meetings' && (
                                <div className="space-y-5 animated fadeIn pb-6">
                                    <div>
                                        <div className="inline-flex items-center gap-2 rounded-full bg-bg-item-surface border border-border-subtle px-3 py-1 mb-3">
                                            <Clock size={13} className="text-accent-primary" />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary">Local history</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-text-primary tracking-tight">Recent Meetings</h3>
                                        <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
                                            View meetings saved on this device. Rolling transcript, prompts, screenshot markers, and Cluegent responses stay in local storage.
                                        </p>
                                    </div>
                                    <RecentLocalMeetings />
                                </div>
                            )}
                            {activeTab === '__legacy_profile' && (
                                <div className="space-y-6 animated fadeIn">
                                    {/* Introduction */}
                                    <div className="mb-5">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-text-primary">Professional Identity</h3>
                                                <span className="bg-yellow-500/10 text-yellow-500 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">BETA</span>
                                                {isPremium && premiumPlan && (
                                                    <span className="bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ml-1">
                                                        {premiumPlan.toUpperCase()} PLAN
                                                    </span>
                                                )}
                                                {isTrialActive && !isPremium && (
                                                    <span className="bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ml-1">
                                                        FREE TRIAL
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setIsPremiumModalOpen(true)}
                                                className={`text-[11px] font-semibold flex items-center gap-1.5 transition-all duration-200 px-2.5 py-1 rounded-full border shadow-[0_0_10px_rgba(250,204,21,0.2)] hover:shadow-[0_0_15px_rgba(250,204,21,0.3)] ${isPremium
                                                    ? (isLight ? 'bg-bg-component text-text-primary border-border-subtle hover:bg-bg-item-surface' : 'bg-zinc-800 text-white border-white/10 hover:bg-zinc-700')
                                                    : isTrialActive
                                                    ? 'bg-violet-500/15 text-violet-300 border-violet-500/30 hover:bg-violet-500/25 active:scale-[0.98]'
                                                    : 'bg-[#FACC15] text-black border-transparent hover:bg-[#FDE047] active:scale-[0.98]'
                                                    }`}
                                            >
                                                {isPremium ? <CheckCircle size={12} className="text-green-400" /> : isTrialActive ? <Sparkles size={12} className="text-violet-400" /> : <Sparkles size={12} className="text-black/80" />}
                                                {isPremium ? 'Manage Pro' : isTrialActive ? 'Upgrade' : 'Unlock Pro'}
                                            </button>
                                        </div>
                                        <p className="text-xs text-text-secondary mb-2">
                                            This engine constructs an intelligent representation of your career history.
                                        </p>
                                    </div>

                                    {/* Intelligence Graph Hero Card */}
                                    <div className="bg-bg-item-surface rounded-xl border border-border-subtle flex flex-col justify-between overflow-hidden">
                                        <div className="flex flex-col justify-between min-h-[160px]">

                                            {/* Header */}
                                            <div className="p-5 pb-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-bg-input border border-border-subtle flex items-center justify-center text-text-primary shadow-sm hover:scale-105 transition-transform duration-300">
                                                            <span className="font-bold text-sm tracking-tight">
                                                                {profileData?.identity?.name ? profileData.identity.name.charAt(0).toUpperCase() : 'U'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-text-primary tracking-tight">
                                                                {profileData?.identity?.name || 'Identity Node Inactive'}
                                                            </h4>
                                                            <p className="text-xs text-text-secondary mt-0.5 tracking-wide">
                                                                {profileData?.identity?.email || 'Upload a resume to begin mapping.'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {profileStatus.hasProfile && (
                                                            <button
                                                                onClick={async () => {
                                                                    if (!confirm('Are you sure you want to delete your mapped persona? This will destroy all structured timeline data.')) return;
                                                                    try {
                                                                        await window.electronAPI?.profileDelete?.();
                                                                        setProfileStatus({ hasProfile: false, profileMode: false });
                                                                        setProfileData(null);
                                                                    } catch (e) { console.error('Failed to delete profile:', e); }
                                                                }}
                                                                className="text-[12px] font-medium text-text-tertiary hover:text-red-500 transition-colors px-3 py-1.5 rounded-full hover:bg-red-500/10"
                                                            >
                                                                Disconnect
                                                            </button>
                                                        )}

                                                        {/* High-fidelity Toggle */}
                                                        <div className={`flex items-center gap-2 bg-bg-input px-3 py-1.5 rounded-full border border-border-subtle ${!profileStatus.hasProfile ? 'opacity-40 cursor-not-allowed' : ''}`} title={!profileStatus.hasProfile ? 'Upload a resume first' : ''}>
                                                            <span className="text-xs font-medium text-text-secondary">Persona Engine</span>
                                                            <div
                                                                onClick={async () => {
                                                                    if (!profileStatus.hasProfile) return;
                                                                    const newState = !profileStatus.profileMode;
                                                                    try {
                                                                        await window.electronAPI?.profileSetMode?.(newState);
                                                                        setProfileStatus(prev => ({ ...prev, profileMode: newState }));
                                                                    } catch (e) {
                                                                        console.error('Failed to toggle profile mode:', e);
                                                                    }
                                                                }}
                                                                className={`w-9 h-5 rounded-full relative transition-colors ${!profileStatus.hasProfile ? 'opacity-40 cursor-not-allowed bg-bg-toggle-switch' : profileStatus.profileMode ? 'bg-accent-primary' : 'bg-bg-toggle-switch border border-border-muted'}`}
                                                            >
                                                                <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${profileStatus.profileMode ? 'translate-x-4' : 'translate-x-0'}`} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Data Metrics & Extracted Skills */}
                                            <div className="p-5 pt-0 mt-auto">
                                                <div className="flex items-center justify-between bg-bg-input border border-border-subtle py-4 px-6 rounded-2xl shadow-sm">
                                                    <div className="flex flex-col items-center justify-center flex-1">
                                                        <span className="text-[20px] font-bold text-text-primary tracking-tight leading-none mb-1">{profileData?.experienceCount || 0}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                                            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Experience</span>
                                                        </div>
                                                    </div>

                                                    <div className="h-8 w-px bg-border-subtle/60" />

                                                    <div className="flex flex-col items-center justify-center flex-1">
                                                        <span className="text-[20px] font-bold text-text-primary tracking-tight leading-none mb-1">{profileData?.projectCount || 0}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                                                            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Projects</span>
                                                        </div>
                                                    </div>

                                                    <div className="h-8 w-px bg-border-subtle/60" />

                                                    <div className="flex flex-col items-center justify-center flex-1">
                                                        <span className="text-[20px] font-bold text-text-primary tracking-tight leading-none mb-1">{profileData?.nodeCount || 0}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                                                            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Nodes</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {profileData?.skills && profileData.skills.length > 0 && (
                                                    <div className="mt-5">
                                                        <div className="text-[10px] font-bold text-text-primary uppercase tracking-wide mb-2">
                                                            Top Skills
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {profileData.skills.slice(0, 15).map((skill: string, i: number) => (
                                                                <span key={i} className="text-[10px] font-medium text-text-secondary px-2 py-1 rounded-md border border-border-subtle bg-bg-input">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Upload Area */}
                                    <div className="mt-5">
                                        <div className={`bg-bg-item-surface rounded-xl border transition-all ${profileUploading ? 'border-accent-primary/50 ring-1 ring-accent-primary/20' : 'border-border-subtle'}`}>
                                            <div className="p-5 flex items-center justify-between">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-10 h-10 rounded-lg bg-bg-input border border-border-subtle flex items-center justify-center text-text-tertiary shrink-0">
                                                        {profileUploading ? <RefreshCw size={20} className="animate-spin text-accent-primary" /> : <Upload size={20} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-sm font-bold text-text-primary mb-0.5 truncate pr-4">
                                                            {profileStatus.hasProfile ? 'Overwrite Source Document' : 'Initialize Knowledge Base'}
                                                        </h4>
                                                        {profileUploading ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-[4px] w-[100px] bg-bg-input rounded-full overflow-hidden">
                                                                    <div className="h-full bg-accent-primary rounded-full animate-pulse" style={{ width: '50%' }} />
                                                                </div>
                                                                <span className="text-[10px] text-text-secondary tracking-wide">Processing structural semantics...</span>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-text-secondary truncate pr-4">
                                                                Provide a resume file to seed the intelligence engine.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={async () => {
                                                        setProfileError('');
                                                        try {
                                                            const fileResult = await window.electronAPI?.profileSelectFile?.();
                                                            if (fileResult?.cancelled || !fileResult?.filePath) return;

                                                            setProfileUploading(true);
                                                            const result = await window.electronAPI?.profileUploadResume?.(fileResult.filePath);
                                                            if (result?.success) {
                                                                const status = await window.electronAPI?.profileGetStatus?.();
                                                                if (status) setProfileStatus(status);
                                                                const data = await window.electronAPI?.profileGetProfile?.();
                                                                if (data) setProfileData(data);
                                                            } else {
                                                                setProfileError(result?.error || 'Upload failed');
                                                            }
                                                        } catch (e: any) {
                                                            setProfileError(e.message || 'Upload failed');
                                                        } finally {
                                                            setProfileUploading(false);
                                                        }
                                                    }}
                                                    disabled={profileUploading}
                                                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 ${profileUploading ? 'bg-bg-input text-text-tertiary cursor-wait border border-border-subtle' : 'bg-text-primary text-bg-main hover:opacity-90 shadow-sm'}`}
                                                >
                                                    {profileUploading ? 'Ingesting...' : 'Select File'}
                                                </button>
                                            </div>

                                            {profileError && (
                                                <div className="px-5 pb-4">
                                                    <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-[11px] text-red-500 font-medium">
                                                        <X size={12} /> {profileError}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* JD Upload Card */}
                                    <div className="mt-5">
                                        <div className={`rounded-xl transition-all border ${jdUploading ? 'border-blue-500/50 ring-1 ring-blue-500/20 bg-bg-item-surface' : profileData?.hasActiveJD ? 'border-blue-500/30 bg-blue-500/5' : 'border-border-subtle bg-bg-item-surface'}`}>
                                            <div className="p-5 flex items-center justify-between">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-10 h-10 rounded-lg bg-bg-input border border-border-subtle flex items-center justify-center text-text-tertiary shrink-0">
                                                        {jdUploading ? <RefreshCw size={20} className="animate-spin text-blue-500" /> : <Briefcase size={20} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-sm font-bold text-text-primary mb-0.5 truncate pr-4">
                                                            {profileData?.hasActiveJD ? `${profileData.activeJD?.title} @ ${profileData.activeJD?.company}` : 'Upload Job Description'}
                                                        </h4>
                                                        {jdUploading ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-[4px] w-[100px] bg-bg-input rounded-full overflow-hidden">
                                                                    <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '50%' }} />
                                                                </div>
                                                                <span className="text-[10px] text-text-secondary tracking-wide">Parsing JD structure...</span>
                                                            </div>
                                                        ) : profileData?.hasActiveJD ? (
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[9px] font-bold text-blue-500 px-1.5 py-0.5 bg-blue-500/10 rounded uppercase tracking-wide border border-blue-500/20">
                                                                    {profileData.activeJD?.level || 'mid'}-level
                                                                </span>
                                                                <div className="flex gap-1.5">
                                                                    {profileData.activeJD?.technologies?.slice(0, 3).map((t: string, i: number) => (
                                                                        <span key={i} className="text-[10px] text-text-secondary">{t}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-text-secondary">
                                                                Upload a JD to enable persona tuning and company research.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {profileData?.hasActiveJD && (
                                                        <button
                                                            onClick={async () => {
                                                                await window.electronAPI?.profileDeleteJD?.();
                                                                const data = await window.electronAPI?.profileGetProfile?.();
                                                                if (data) setProfileData(data);
                                                                setCompanyDossier(null);
                                                            }}
                                                            className="px-2.5 py-2 rounded-full text-xs text-text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={async () => {
                                                            setJdError('');
                                                            try {
                                                                const fileResult = await window.electronAPI?.profileSelectFile?.();
                                                                if (fileResult?.cancelled || !fileResult?.filePath) return;

                                                                setJdUploading(true);
                                                                const result = await window.electronAPI?.profileUploadJD?.(fileResult.filePath);
                                                                if (result?.success) {
                                                                    const data = await window.electronAPI?.profileGetProfile?.();
                                                                    if (data) setProfileData(data);
                                                                } else {
                                                                    setJdError(result?.error || 'JD upload failed');
                                                                }
                                                            } catch (e: any) {
                                                                setJdError(e.message || 'JD upload failed');
                                                            } finally {
                                                                setJdUploading(false);
                                                            }
                                                        }}
                                                        disabled={jdUploading}
                                                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 ${jdUploading ? 'bg-bg-input text-text-tertiary cursor-wait border border-border-subtle' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm'}`}
                                                    >
                                                        {jdUploading ? 'Parsing...' : profileData?.hasActiveJD ? 'Replace JD' : 'Upload JD'}
                                                    </button>
                                                </div>
                                            </div>

                                            {jdError && (
                                                <div className="px-5 pb-4">
                                                    <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-[11px] text-red-500 font-medium">
                                                        <X size={12} /> {jdError}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Custom Context Card */}
                                    <div className="mt-5">
                                        <div className="bg-bg-item-surface rounded-xl border border-border-subtle">
                                            <div className="p-5">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-10 h-10 rounded-lg bg-bg-input border border-border-subtle flex items-center justify-center text-text-tertiary shrink-0">
                                                        <Pencil size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-bold text-text-primary">Custom Context</h4>
                                                            {customNotesSaved && (
                                                                <span className="text-[9px] font-bold text-emerald-500 px-1.5 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase tracking-wide flex items-center gap-1">
                                                                    <Check size={8} /> Saved
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-text-secondary mt-0.5">
                                                            Add any context the AI should know about you — saved across all sessions.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <textarea
                                                        value={customNotes}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val.length > 4000) return;
                                                            setCustomNotes(val);
                                                            setCustomNotesSaved(false);
                                                            if (customNotesDebounceRef.current) clearTimeout(customNotesDebounceRef.current);
                                                            customNotesDebounceRef.current = setTimeout(async () => {
                                                                try {
                                                                    await window.electronAPI?.profileSaveNotes?.(val);
                                                                    setCustomNotesSaved(true);
                                                                    setTimeout(() => setCustomNotesSaved(false), 2000);
                                                                } catch (_) {}
                                                            }, 800);
                                                        }}
                                                        placeholder={`Examples:\n• Q4 ARR was $2.1M, grew 40% YoY — use when pitching growth story\n• Solved LRU Cache (LeetCode 146) with O(1) get/put using HashMap + doubly linked list\n• I prefer concise, direct answers without filler phrases\n• My target salary is $180k base — don't go below $160k`}
                                                        rows={6}
                                                        className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2.5 text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20 transition-all resize-none leading-relaxed"
                                                    />
                                                    <div className="flex items-center justify-between px-0.5">
                                                        <p className="text-[10px] text-text-tertiary">
                                                            Auto-saved · Works with all modes and providers
                                                        </p>
                                                        <span className={`text-[10px] tabular-nums ${customNotes.length > 3600 ? 'text-amber-500' : 'text-text-tertiary'}`}>
                                                            {customNotes.length}/4000
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Google Search API Card */}
                                    <div className="mt-5">
                                        <div className="bg-bg-item-surface rounded-xl border border-border-subtle">
                                            <div className="p-5">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-10 h-10 rounded-lg bg-bg-input border border-border-subtle flex items-center justify-center text-emerald-500 shrink-0">
                                                        <Globe size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-bold text-text-primary">Tavily Search API</h4>
                                                            {hasStoredTavilyKey && (
                                                                <span className="text-[9px] font-bold text-emerald-500 px-1.5 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase tracking-wide">Connected</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-text-secondary mt-0.5">
                                                            Powers live web search for company research.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div>
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide block">API Key</label>
                                                            {hasStoredTavilyKey && (
                                                                <button
                                                                    onClick={handleRemoveTavilyKey}
                                                                    className="text-[10px] flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors bg-red-500/10 hover:bg-red-500/20 px-1.5 py-0.5 rounded"
                                                                    title="Remove API Key"
                                                                >
                                                                    <Trash2 size={10} strokeWidth={2} /> Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="password"
                                                            value={tavilyApiKey}
                                                            onChange={(e) => { setTavilyApiKey(e.target.value); setTavilyError(''); }}
                                                            placeholder={hasStoredTavilyKey ? '••••••••••••' : 'Enter Tavily API key (tvly-...)'}
                                                            className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20 transition-all"
                                                        />
                                                    </div>
                                                    {tavilyError && (
                                                        <p className="text-[10px] text-red-400 px-1">{tavilyError}</p>
                                                    )}
                                                    <button
                                                        onClick={async () => {
                                                            if (!tavilyApiKey.trim()) return;
                                                            setTavilyError('');
                                                            setTavilySaving(true);
                                                            try {
                                                                const result = await window.electronAPI?.setTavilyApiKey?.(tavilyApiKey.trim());
                                                                if (result && !result.success) {
                                                                    setTavilyError(result.error ?? 'Failed to save API key.');
                                                                } else {
                                                                    setHasStoredTavilyKey(true);
                                                                    setTavilyApiKey('');
                                                                }
                                                            } catch (e: any) {
                                                                setTavilyError(e?.message ?? 'Unexpected error saving API key.');
                                                            } finally {
                                                                setTavilySaving(false);
                                                            }
                                                        }}
                                                        disabled={tavilySaving || !tavilyApiKey.trim()}
                                                        className={`w-full px-4 py-2 rounded-lg text-xs font-medium transition-all ${tavilySaving ? 'bg-bg-input text-text-tertiary cursor-wait' : !tavilyApiKey.trim() ? 'bg-bg-input text-text-tertiary cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'}`}
                                                    >
                                                        {tavilySaving ? 'Saving...' : 'Save API Key'}
                                                    </button>
                                                </div>

                                                <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-bg-input/50 rounded-lg">
                                                    <Info size={12} className="text-text-tertiary shrink-0 mt-0.5" />
                                                    <p className="text-[10px] text-text-tertiary leading-relaxed">
                                                        If not provided, LLM general knowledge is used for company research, which may be outdated. Get your free API key at <span className="text-emerald-500/80 hover:text-emerald-400 underline underline-offset-2 cursor-pointer" onClick={() => window.electronAPI?.openExternal?.('https://app.tavily.com/home')}>app.tavily.com</span>. Keys start with <code className="text-emerald-500/80">tvly-</code>.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Company Research Section */}
                                    {profileData?.hasActiveJD && profileData?.activeJD?.company && (
                                        <div className="mt-5">
                                            <div className="bg-bg-item-surface rounded-xl border border-border-subtle p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-lg bg-bg-input border border-border-subtle flex items-center justify-center text-purple-500">
                                                            <Building2 size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-sm font-bold text-text-primary">
                                                                    Company Intel: <span className="text-purple-400">{profileData.activeJD.company}</span>
                                                                </h4>
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-widest uppercase bg-purple-500/15 text-purple-400 border border-purple-500/25">Beta</span>
                                                            </div>
                                                            <p className="text-[11px] text-text-secondary mt-0.5">
                                                                {companyDossier ? 'Research complete' : 'Run research to get hiring strategy, salaries & competitors'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={async () => {
                                                            setCompanyResearching(true);
                                                            setCompanySearchQuotaExhausted(false);
                                                            try {
                                                                const result = await window.electronAPI?.profileResearchCompany?.(profileData.activeJD.company);
                                                                if (result?.success && result.dossier) {
                                                                    setCompanyDossier(result.dossier);
                                                                }
                                                                if (result?.searchQuotaExhausted) {
                                                                    setCompanySearchQuotaExhausted(true);
                                                                }
                                                            } catch (e) {
                                                                console.error('Research failed:', e);
                                                            } finally {
                                                                setCompanyResearching(false);
                                                            }
                                                        }}
                                                        disabled={companyResearching}
                                                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${companyResearching ? 'bg-bg-input text-text-tertiary cursor-wait border border-border-subtle' : 'bg-purple-600/10 text-purple-500 hover:bg-purple-600/20 border border-purple-500/20'}`}
                                                    >
                                                        {companyResearching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                                                        {companyResearching ? 'Researching...' : companyDossier ? 'Refresh' : 'Research Now'}
                                                    </button>
                                                </div>

                                                {/* Search quota exhausted notice */}
                                                {companySearchQuotaExhausted && (
                                                    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 text-[11px] text-amber-400 leading-relaxed">
                                                        <span className="shrink-0 mt-[1px]">⚠</span>
                                                        <span>
                                                            Web search credits exhausted for this month — showing AI-only research instead.
                                                            Resets next billing cycle or <span className="underline cursor-pointer" onClick={() => setActiveTab('billing')}>upgrade your plan</span>.
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Dossier Results */}
                                                {companyDossier && (
                                                    <div className="space-y-4 border-t border-border-subtle pt-4 mt-2">

                                                        {/* Hiring Strategy */}
                                                        {companyDossier.hiring_strategy && (
                                                            <div>
                                                                <div className="text-[10px] font-bold text-text-primary uppercase tracking-wide mb-1">Hiring Strategy</div>
                                                                <p className="text-xs text-text-secondary leading-relaxed bg-bg-input p-3 rounded-lg">{companyDossier.hiring_strategy}</p>
                                                            </div>
                                                        )}

                                                        {/* Interview Focus + Difficulty badge */}
                                                        {companyDossier.interview_focus && (
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <div className="text-[10px] font-bold text-text-primary uppercase tracking-wide">Interview Focus</div>
                                                                    {companyDossier.interview_difficulty && (
                                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                                                            companyDossier.interview_difficulty === 'easy' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                                            companyDossier.interview_difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                                            companyDossier.interview_difficulty === 'hard' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                                            'bg-red-500/10 text-red-400 border-red-500/20'
                                                                        }`}>
                                                                            {companyDossier.interview_difficulty.replace('_', ' ').toUpperCase()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-text-secondary leading-relaxed bg-bg-input p-3 rounded-lg">{companyDossier.interview_focus}</p>
                                                            </div>
                                                        )}

                                                        {/* Salary Estimates */}
                                                        {companyDossier.salary_estimates?.length > 0 && (
                                                            <div>
                                                                <div className="text-[10px] font-bold text-text-primary uppercase tracking-wide mb-1">Salary Estimates</div>
                                                                <div className="space-y-2 bg-bg-input p-3 rounded-lg">
                                                                    {companyDossier.salary_estimates.map((s: any, i: number) => (
                                                                        <div key={i} className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle last:border-0 last:pb-0 last:mb-0">
                                                                            <span className="text-xs text-text-primary font-medium">{s.title} <span className="text-text-tertiary">({s.location})</span></span>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-xs font-bold text-green-400">
                                                                                    {s.currency} {s.min?.toLocaleString()} – {s.max?.toLocaleString()}
                                                                                </span>
                                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${s.confidence === 'high' ? 'bg-green-500/10 text-green-500 border-green-500/20' : s.confidence === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                                                    {s.confidence?.toUpperCase()}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Work Culture — 5-star ratings */}
                                                        {companyDossier.culture_ratings && typeof companyDossier.culture_ratings === 'object' &&
                                                          Object.values(companyDossier.culture_ratings).some(v => typeof v === 'number' && (v as number) > 0) && (
                                                            <div>
                                                                <div className="text-[10px] font-bold text-text-primary uppercase tracking-wide mb-2">Work Culture</div>
                                                                <div className="bg-bg-input p-3 rounded-lg">
                                                                    {/* Overall score hero */}
                                                                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-border-subtle">
                                                                        <div>
                                                                            <span className="text-2xl font-bold text-text-primary">{companyDossier.culture_ratings.overall.toFixed(1)}</span>
                                                                            <span className="text-xs text-text-tertiary"> / 5</span>
                                                                            {companyDossier.culture_ratings.review_count && (
                                                                                <div className="text-[10px] text-text-tertiary mt-0.5">{companyDossier.culture_ratings.review_count}</div>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <StarRating value={companyDossier.culture_ratings.overall} size={14} />
                                                                            {companyDossier.culture_ratings.data_sources?.length > 0 && (
                                                                                <div className="flex gap-1 mt-1 justify-end">
                                                                                    {companyDossier.culture_ratings.data_sources.map((src: string, i: number) => (
                                                                                        <span key={i} className="text-[9px] text-text-tertiary bg-bg-input px-1.5 py-0.5 rounded">{src}</span>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {/* Sub-ratings grid */}
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                                        {[
                                                                            { label: 'Work-Life Balance', key: 'work_life_balance' },
                                                                            { label: 'Career Growth', key: 'career_growth' },
                                                                            { label: 'Compensation', key: 'compensation' },
                                                                            { label: 'Management', key: 'management' },
                                                                            { label: 'Diversity & Inclusion', key: 'diversity' },
                                                                        ].map(({ label, key }) => {
                                                                            const raw = (companyDossier.culture_ratings as any)[key];
                                                                            const val: number = typeof raw === 'number' ? raw : 0;
                                                                            return val > 0 ? (
                                                                                <div key={key} className="flex items-center justify-between gap-2">
                                                                                    <span className="text-[10px] text-text-tertiary truncate">{label}</span>
                                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                                        <StarRating value={val} size={9} />
                                                                                        <span className="text-[10px] text-text-secondary font-medium">{val.toFixed(1)}</span>
                                                                                    </div>
                                                                                </div>
                                                                            ) : null;
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Employee Reviews */}
                                                        {companyDossier.employee_reviews?.length > 0 && (
                                                            <div>
                                                                <div className="text-[10px] font-bold text-text-primary uppercase tracking-wide mb-2">Employee Reviews</div>
                                                                <div className="space-y-2">
                                                                    {companyDossier.employee_reviews.map((r: any, i: number) => (
                                                                        <div key={i} className="bg-bg-input p-3 rounded-lg">
                                                                            <div className="flex items-start gap-2">
                                                                                <span className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${r.sentiment === 'positive' ? 'bg-green-400' : r.sentiment === 'mixed' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                                                                                <p className="text-xs text-text-secondary leading-relaxed italic">"{r.quote}"</p>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 mt-2 ml-4">
                                                                                {r.role && <span className="text-[10px] text-text-tertiary">{r.role}</span>}
                                                                                {r.role && r.source && <span className="text-text-tertiary/40 text-[10px]">·</span>}
                                                                                {r.source && <span className="text-[10px] text-text-tertiary/70 bg-bg-input px-1.5 py-0.5 rounded">{r.source}</span>}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Critics — common complaints */}
                                                        {companyDossier.critics?.length > 0 && (
                                                            <div>
                                                                <div className="flex items-center gap-1.5 mb-2">
                                                                    <AlertCircle size={11} className="text-orange-400" />
                                                                    <div className="text-[10px] font-bold text-text-primary uppercase tracking-wide">Common Complaints</div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {companyDossier.critics.map((c: any, i: number) => (
                                                                        <div key={i} className="bg-bg-input p-3 rounded-lg">
                                                                            <div className="flex items-center justify-between mb-1">
                                                                                <span className="text-[10px] font-semibold text-orange-400/90">{c.category}</span>
                                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                                                                    c.frequency === 'widespread' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                                                    c.frequency === 'frequently' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                                                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                                                }`}>
                                                                                    {c.frequency?.toUpperCase()}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-xs text-text-secondary leading-relaxed">{c.complaint}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Benefits */}
                                                        {companyDossier.benefits?.length > 0 && (
                                                            <div>
                                                                <div className="flex items-center gap-1.5 mb-2">
                                                                    <Gift size={11} className="text-emerald-400" />
                                                                    <div className="text-[10px] font-bold text-text-primary uppercase tracking-wide">Benefits & Perks</div>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {companyDossier.benefits.map((b: string, i: number) => (
                                                                        <span key={i} className="text-[11px] text-emerald-400/90 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">{b}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Core Values */}
                                                        {companyDossier.core_values?.length > 0 && (
                                                            <div>
                                                                <div className="text-[10px] font-bold text-text-primary uppercase tracking-wide mb-2">Core Values</div>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {companyDossier.core_values.map((v: string, i: number) => (
                                                                        <span key={i} className="text-[11px] text-purple-400/90 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">{v}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Recent News */}
                                                        {companyDossier.recent_news && (
                                                            <div>
                                                                <div className="text-[10px] font-bold text-text-primary uppercase tracking-wide mb-1">Recent News</div>
                                                                <p className="text-xs text-text-secondary leading-relaxed bg-bg-input p-3 rounded-lg">{companyDossier.recent_news}</p>
                                                            </div>
                                                        )}

                                                        {/* Competitors */}
                                                        {companyDossier.competitors?.length > 0 && (
                                                            <div>
                                                                <div className="text-[10px] font-bold text-text-primary uppercase tracking-wide mb-2">Competitors</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {companyDossier.competitors.map((c: string, i: number) => (
                                                                        <span key={i} className="text-[11px] text-text-secondary px-2.5 py-1 rounded-full bg-bg-input flex items-center gap-1.5">
                                                                            <Building2 size={10} className="text-text-tertiary" /> {c}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Sources count */}
                                                        {companyDossier.sources?.length > 0 && (
                                                            <div className="text-[10px] text-text-tertiary mt-2">
                                                                Sources: {companyDossier.sources.filter(Boolean).length} references
                                                            </div>
                                                        )}

                                                        {/* Beta disclaimer */}
                                                        <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-purple-500/5 border border-purple-500/15">
                                                            <span className="text-purple-400/70 mt-px shrink-0">⚠</span>
                                                            <p className="text-[10px] text-text-tertiary leading-relaxed">
                                                                <span className="font-semibold text-purple-400/80">Beta feature.</span> Company research is AI-generated and may contain inaccuracies. Verify salary figures and hiring details independently before use.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <ProfileVisualizer profileData={profileData} />

                                    {/* Salary Negotiation Script */}
                                    {profileData?.hasActiveJD && (
                                        <div className="mt-6 animated fadeIn">
                                            <div className="relative rounded-xl border border-border-subtle overflow-hidden bg-bg-item-surface">

                                                <div className="p-5">
                                                    {/* Header row */}
                                                    <div className="flex items-center justify-between mb-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,182,212,0.1) 100%)', border: '1px solid rgba(16,185,129,0.25)' }}>
                                                                    <Briefcase size={15} className="text-emerald-400" />
                                                                </div>
                                                                {negotiationScript && (
                                                                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-bg-item-surface" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h3 className="text-[13px] font-bold text-text-primary tracking-tight">Negotiation Script</h3>
                                                                <p className="text-[10px] text-text-tertiary mt-0.5 tracking-wide uppercase">
                                                                    {negotiationScript ? `Tailored for ${profileData?.activeJD?.company || 'this role'}` : 'AI-powered salary coaching'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {negotiationScript && (
                                                                <button
                                                                    onClick={async () => {
                                                                        setNegotiationGenerating(true);
                                                                        setNegotiationError('');
                                                                        try {
                                                                            const result = await window.electronAPI?.profileGenerateNegotiation?.(true);
                                                                            if (result?.success && result.script) {
                                                                                setNegotiationScript(result.script);
                                                                            } else {
                                                                                setNegotiationError(result?.error || 'Failed to regenerate');
                                                                            }
                                                                        } catch { setNegotiationError('Generation failed'); }
                                                                        finally { setNegotiationGenerating(false); }
                                                                    }}
                                                                    disabled={negotiationGenerating}
                                                                    title="Regenerate script"
                                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-input transition-all border border-border-subtle"
                                                                >
                                                                    <RefreshCw size={12} className={negotiationGenerating ? 'animate-spin' : ''} />
                                                                </button>
                                                            )}
                                                            {!negotiationScript && (
                                                                <button
                                                                    onClick={async () => {
                                                                        setNegotiationGenerating(true);
                                                                        setNegotiationError('');
                                                                        try {
                                                                            const result = await window.electronAPI?.profileGenerateNegotiation?.(false);
                                                                            if (result?.success && result.script) {
                                                                                setNegotiationScript(result.script);
                                                                            } else {
                                                                                setNegotiationError(result?.error || 'Failed to generate');
                                                                            }
                                                                        } catch { setNegotiationError('Generation failed'); }
                                                                        finally { setNegotiationGenerating(false); }
                                                                    }}
                                                                    disabled={negotiationGenerating}
                                                                    className="px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait"
                                                                    style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(6,182,212,0.15) 100%)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}
                                                                >
                                                                    {negotiationGenerating ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                                                                    {negotiationGenerating ? 'Generating…' : 'Generate Script'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {negotiationError && (
                                                        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                                            <AlertCircle size={12} className="text-red-400 shrink-0" />
                                                            <p className="text-[11px] text-red-400">{negotiationError}</p>
                                                        </div>
                                                    )}

                                                    {/* Empty state */}
                                                    {!negotiationScript && !negotiationGenerating && !negotiationError && (
                                                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.06) 100%)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                                                <Briefcase size={20} className="text-emerald-500/50" />
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-[12px] font-medium text-text-secondary">No script yet</p>
                                                                <p className="text-[10px] text-text-tertiary mt-0.5">Generate a personalized opening, justification &amp; counter-offer</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Generating skeleton */}
                                                    {negotiationGenerating && (
                                                        <div className="space-y-3 py-2">
                                                            {[40, 70, 55].map((w, i) => (
                                                                <div key={i} className="h-3 rounded-full bg-bg-input animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 150}ms` }} />
                                                            ))}
                                                            <div className="h-12 rounded-lg bg-bg-input animate-pulse mt-2" style={{ animationDelay: '450ms' }} />
                                                        </div>
                                                    )}

                                                    {negotiationScript && !negotiationGenerating && (
                                                        <div className="space-y-3">
                                                            {/* Salary Range Hero */}
                                                            {negotiationScript.salary_range && (
                                                                <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.06) 100%)', border: '1px solid rgba(16,185,129,0.18)' }}>
                                                                    <div>
                                                                        <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/70 mb-1">Target Compensation</div>
                                                                        <div className="text-xl font-bold tracking-tight" style={{ color: '#34d399' }}>
                                                                            {negotiationScript.salary_range.currency} {negotiationScript.salary_range.min.toLocaleString()}
                                                                            <span className="text-text-tertiary font-normal mx-2">–</span>
                                                                            {negotiationScript.salary_range.max.toLocaleString()}
                                                                        </div>
                                                                        {negotiationScript.sources?.length > 0 && (
                                                                            <div className="text-[9px] text-text-tertiary mt-1">{negotiationScript.sources.length} market source{negotiationScript.sources.length > 1 ? 's' : ''}</div>
                                                                        )}
                                                                    </div>
                                                                    <span className={`text-[9px] font-bold px-2 py-1 rounded-full tracking-wide ${
                                                                        negotiationScript.salary_range.confidence === 'high' ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/25' :
                                                                        negotiationScript.salary_range.confidence === 'medium' ? 'text-yellow-400 bg-yellow-500/15 border border-yellow-500/25' :
                                                                        'text-text-tertiary bg-bg-input border border-border-subtle'
                                                                    }`}>
                                                                        {(negotiationScript.salary_range.confidence || 'low').toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Step cards */}
                                                            {[
                                                                {
                                                                    step: '01',
                                                                    label: 'Opening',
                                                                    sublabel: 'When asked about salary expectations',
                                                                    content: negotiationScript.opening_line,
                                                                    accent: '#10b981',
                                                                    accentBg: 'rgba(16,185,129,0.07)',
                                                                    accentBorder: 'rgba(16,185,129,0.2)',
                                                                    quote: true,
                                                                },
                                                                {
                                                                    step: '02',
                                                                    label: 'Justify Your Ask',
                                                                    sublabel: 'Link your track record to the number',
                                                                    content: negotiationScript.justification,
                                                                    accent: '#60a5fa',
                                                                    accentBg: 'rgba(96,165,250,0.07)',
                                                                    accentBorder: 'rgba(96,165,250,0.2)',
                                                                    quote: false,
                                                                },
                                                                {
                                                                    step: '03',
                                                                    label: 'Counter & Hold',
                                                                    sublabel: 'If they come back lower',
                                                                    content: negotiationScript.counter_offer_fallback,
                                                                    accent: '#fb923c',
                                                                    accentBg: 'rgba(251,146,60,0.07)',
                                                                    accentBorder: 'rgba(251,146,60,0.2)',
                                                                    quote: true,
                                                                },
                                                            ].filter(s => s.content).map((s) => ({ ...s, content: s.content.replace(/^["'"']+|["'"']+$/g, '').trim() })).map((s) => (
                                                                <div key={s.step} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${s.accentBorder}`, background: s.accentBg }}>
                                                                    <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] font-black tracking-widest" style={{ color: s.accent, opacity: 0.6 }}>STEP {s.step}</span>
                                                                            <span className="text-[11px] font-bold text-text-primary">{s.label}</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => navigator.clipboard?.writeText(s.content)}
                                                                            title="Copy to clipboard"
                                                                            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium transition-all hover:bg-bg-input text-text-tertiary hover:text-text-secondary"
                                                                        >
                                                                            <Check size={9} />
                                                                            Copy
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-[10px] text-text-tertiary px-3.5 pb-2 -mt-1 tracking-wide">{s.sublabel}</p>
                                                                    <div className="mx-3.5 mb-3.5">
                                                                        <p className={`text-[12px] leading-relaxed text-text-primary ${s.quote ? 'pl-3 italic' : ''}`}>
                                                                            {s.content}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}
                            {activeTab === 'billing' && (
                                <BillingSettings />
                            )}
                            {activeTab === 'keybinds' && (
                                <div className="space-y-5 animated fadeIn select-text pb-4">
                                    <div>
                                        <div>
                                            <h3 className="text-lg font-bold text-text-primary mb-1">Keyboard shortcuts</h3>
                                        <p className="text-xs text-text-secondary">Cluegent works with these easy to remember commands.</p>
                                        </div>
                                    </div>

                                    <div className="grid gap-6">
                                        {/* General Category */}
                                        <div>
                                            <h4 className="text-sm font-bold text-text-primary mb-3">General</h4>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between py-1.5 group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-text-tertiary group-hover:text-text-primary transition-colors w-5 flex justify-center"><Eye size={14} /></span>
                                                        <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">Toggle Visibility</span>
                                                    </div>
                                                    <KeyRecorder
                                                        currentKeys={shortcuts.toggleVisibility}
                                                        onSave={(keys) => updateShortcut('toggleVisibility', keys)}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between py-1.5 group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-text-tertiary group-hover:text-text-primary transition-colors w-5 flex justify-center"><PointerOff size={14} /></span>
                                                        <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">Toggle Mouse Passthrough</span>
                                                    </div>
                                                    <KeyRecorder
                                                        currentKeys={shortcuts.toggleMousePassthrough}
                                                        onSave={(keys) => updateShortcut('toggleMousePassthrough', keys)}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between py-1.5 group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-text-tertiary group-hover:text-text-primary transition-colors w-5 flex justify-center"><MessageSquare size={14} /></span>
                                                        <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">Process Screenshots</span>
                                                    </div>
                                                    <KeyRecorder
                                                        currentKeys={shortcuts.processScreenshots}
                                                        onSave={(keys) => updateShortcut('processScreenshots', keys)}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between py-1.5 group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-text-tertiary group-hover:text-text-primary transition-colors w-5 flex justify-center"><Sparkles size={14} /></span>
                                                        <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">Capture Screen & Ask AI</span>
                                                    </div>
                                                    <KeyRecorder
                                                        currentKeys={shortcuts.captureAndProcess}
                                                        onSave={(keys) => updateShortcut('captureAndProcess', keys)}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between py-1.5 group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-text-tertiary group-hover:text-text-primary transition-colors w-5 flex justify-center"><RotateCcw size={14} /></span>
                                                        <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">Reset / Cancel</span>
                                                    </div>
                                                    <KeyRecorder
                                                        currentKeys={shortcuts.resetCancel}
                                                        onSave={(keys) => updateShortcut('resetCancel', keys)}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between py-1.5 group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-text-tertiary group-hover:text-text-primary transition-colors w-5 flex justify-center"><Camera size={14} /></span>
                                                        <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">Take Screenshot</span>
                                                    </div>
                                                    <KeyRecorder
                                                        currentKeys={shortcuts.takeScreenshot}
                                                        onSave={(keys) => updateShortcut('takeScreenshot', keys)}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between py-1.5 group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-text-tertiary group-hover:text-text-primary transition-colors w-5 flex justify-center"><Crop size={14} /></span>
                                                        <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">Selective Screenshot</span>
                                                    </div>
                                                    <KeyRecorder
                                                        currentKeys={shortcuts.selectiveScreenshot}
                                                        onSave={(keys) => updateShortcut('selectiveScreenshot', keys)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Chat Category */}
                                        <div>
                                            <div className="mb-3">
                                                <h4 className="text-sm font-bold text-text-primary">Chat</h4>
                                            </div>
                                            <div className="space-y-1">
                                                {[
                                                    { id: 'answer', label: 'Mic / Record', icon: <Mic size={14} /> },
                                                    { id: 'clearTranscript', label: 'Clear Transcript', icon: <Trash2 size={14} /> },
                                                ].map((item, i) => (
                                                    <div key={i} className="flex items-center justify-between py-1.5 group">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-text-tertiary group-hover:text-text-primary transition-colors w-5 flex justify-center">{item.icon}</span>
                                                            <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">{item.label}</span>
                                                        </div>
                                                        <KeyRecorder
                                                            currentKeys={shortcuts[item.id as keyof typeof shortcuts]}
                                                            onSave={(keys) => updateShortcut(item.id as any, keys)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Window Category */}
                                        <div>
                                            <h4 className="text-sm font-bold text-text-primary mb-3">Window</h4>
                                            <div className="space-y-1">
                                                {[
                                                    { id: 'moveWindowUp', label: 'Move Window Up', icon: <ArrowUp size={14} /> },
                                                    { id: 'moveWindowDown', label: 'Move Window Down', icon: <ArrowDown size={14} /> },
                                                    { id: 'moveWindowLeft', label: 'Move Window Left', icon: <ArrowLeft size={14} /> },
                                                    { id: 'moveWindowRight', label: 'Move Window Right', icon: <ArrowRight size={14} /> }
                                                ].map((item, i) => (
                                                    <div key={i} className="flex items-center justify-between py-1.5 group">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-text-tertiary group-hover:text-text-primary transition-colors w-5 flex justify-center">{item.icon}</span>
                                                            <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">{item.label}</span>
                                                        </div>
                                                        <KeyRecorder
                                                            currentKeys={shortcuts[item.id as keyof typeof shortcuts]}
                                                            onSave={(keys) => updateShortcut(item.id as any, keys)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'audio' && (
                                <div className="space-y-6 animated fadeIn">
                                            <div>
                                                <h3 className="text-lg font-bold text-text-primary mb-1">Audio Configuration</h3>
                                                <p className="text-xs text-text-secondary mb-5">Manage input and output devices.</p>

                                                <div className="space-y-4">
                                                    <CustomSelect
                                                        label="Input Device"
                                                        icon={<Mic size={16} />}
                                                        value={selectedInput}
                                                        options={inputDevices}
                                                        onChange={(id) => {
                                                            setSelectedInput(id);
                                                            localStorage.setItem('preferredInputDeviceId', id);
                                                        }}
                                                        placeholder="Default Microphone"
                                                    />

                                                    <div>
                                                        <div className="flex justify-between text-xs text-text-secondary mb-2 px-1">
                                                            <span>Input Level</span>
                                                        </div>
                                                        <div className="h-1.5 bg-bg-input rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-green-500 transition-all duration-100 ease-out"
                                                                style={{ width: `${micLevel}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="h-px bg-border-subtle my-2" />

                                                    <CustomSelect
                                                        label="Output Device"
                                                        icon={<Speaker size={16} />}
                                                        value={selectedOutput}
                                                        options={outputDevices}
                                                        onChange={(id) => {
                                                            setSelectedOutput(id);
                                                            localStorage.setItem('preferredOutputDeviceId', id);
                                                        }}
                                                        placeholder="Default Speakers"
                                                    />

                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                                                                    if (!AudioContext) {
                                                                        console.error("Web Audio API not supported");
                                                                        return;
                                                                    }

                                                                    const ctx = new AudioContext();

                                                                    if (ctx.state === 'suspended') {
                                                                        await ctx.resume();
                                                                    }

                                                                    const oscillator = ctx.createOscillator();
                                                                    const gainNode = ctx.createGain();

                                                                    oscillator.connect(gainNode);
                                                                    gainNode.connect(ctx.destination);

                                                                    oscillator.type = 'sine';
                                                                    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
                                                                    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
                                                                    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);

                                                                    if (selectedOutput && (ctx as any).setSinkId) {
                                                                        try {
                                                                            await (ctx as any).setSinkId(selectedOutput);
                                                                        } catch (e) {
                                                                            console.warn("Error setting sink for AudioContext", e);
                                                                        }
                                                                    }

                                                                    oscillator.start();
                                                                    oscillator.stop(ctx.currentTime + 1.0);
                                                                } catch (e) {
                                                                    console.error("Error playing test sound", e);
                                                                }
                                                            }}
                                                            className="text-xs bg-bg-input hover:bg-bg-elevated text-text-primary px-3 py-1.5 rounded-md transition-colors flex items-center gap-2"
                                                        >
                                                            <Speaker size={12} /> Test Sound
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="h-px bg-border-subtle" />

                                            {/* Recognition Language Family */}
                                            <CustomSelect
                                                label="Language"
                                                icon={<Globe size={14} />}
                                                value={selectedSttGroup}
                                                options={languageGroups.map(g => ({
                                                    deviceId: g,
                                                    label: g,
                                                    kind: 'audioinput' as MediaDeviceKind,
                                                    groupId: '',
                                                    toJSON: () => ({})
                                                }))}
                                                onChange={handleGroupChange}
                                                placeholder="Select Language"
                                            />

                                            {/* Variant/Accent Selector (Conditional) */}
                                            {currentGroupVariants.length > 1 && (
                                                <div className="mt-3 animated fadeIn">
                                                    <CustomSelect
                                                        label="Accent / Region"
                                                        icon={<MapPin size={14} />}
                                                        value={recognitionLanguage}
                                                        options={currentGroupVariants}
                                                        onChange={handleLanguageChange}
                                                        placeholder="Select Region"
                                                    />
                                                </div>
                                            )}

                                            <div className="flex gap-2 items-center mt-2 px-1">
                                                <Info size={14} className="text-text-secondary shrink-0" />
                                                <p className="text-xs text-text-secondary">
                                                    {recognitionLanguage === 'auto'
                                                        ? autoDetectedLanguage
                                                            ? (() => {
                                                                const label = Object.values(availableLanguages).find((l: any) =>
                                                                    l.bcp47 === autoDetectedLanguage || l.iso639 === autoDetectedLanguage
                                                                )?.label as string | undefined;
                                                                return `Auto mode — detected: ${label ?? autoDetectedLanguage}`;
                                                              })()
                                                            : 'Auto mode — language will be detected from the first few seconds of audio.'
                                                        : 'Select the primary language being spoken in the meeting.'
                                                    }
                                                </p>
                                            </div>


                                    {/* ── Audio Configuration Section ── */}
                                </div>
                            )}
                            {activeTab === 'help' && (
                                <HelpSettings onNavigate={setActiveTab} />
                            )}

                            {activeTab === 'about' && (
                                <AboutSection />
                            )}
                        </div>
                    </div>
                    </motion.div>
                </motion.div>
            )
            }
            <PremiumUpgradeModal
                isOpen={isPremiumModalOpen}
                onClose={() => setIsPremiumModalOpen(false)}
                isPremium={isPremium}
                onActivated={async () => {
                    setIsPremium(true);
                    const status = await window.electronAPI?.profileGetStatus?.();
                    if (status) setProfileStatus(status);
                }}
                onDeactivated={() => {
                    setIsPremium(false);
                    // Auto-disable profile mode in UI when license is removed
                    setProfileStatus(prev => ({ ...prev, profileMode: false }));
                }}
            />

            <AnimatePresence>
                {isDeleteAccountConfirmOpen && (
                    <motion.div
                        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 16, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}
                            className="w-full max-w-[520px] rounded-[28px] border border-red-500/20 bg-[#111827] p-6 shadow-2xl"
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/12 text-red-300">
                                    <Trash2 size={22} />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-red-300">
                                        Delete account
                                    </p>
                                    <h3 className="mt-2 text-2xl font-black tracking-tight text-white">
                                        Do you want to delete your account?
                                    </h3>
                                    <p className="mt-3 text-sm leading-6 text-slate-300">
                                        This deletes your Cluegent account data, removes local app data on this device,
                                        cancels any active Razorpay subscription immediately, signs you out, and quits the app.
                                    </p>
                                </div>
                            </div>

                            {deleteAccountError && (
                                <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                    {deleteAccountError}
                                </div>
                            )}

                            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsDeleteAccountConfirmOpen(false)}
                                    disabled={isDeletingAccount}
                                    className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
                                >
                                    No, keep account
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        void handleDeleteAccountAndQuit();
                                    }}
                                    disabled={isDeletingAccount}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-400 disabled:opacity-60"
                                >
                                    {isDeletingAccount ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Deleting
                                        </>
                                    ) : (
                                        'Yes, delete account'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ------------------------------------------------------------------ */}
            {/* Live Preview — mockup sits below the z-50 modal                    */}
            {/* ------------------------------------------------------------------ */}
            {/* ------------------------------------------------------------------ */}
            {/* Live Preview — mockup sits below the z-50 modal                    */}
            {/* ALWAYS MOUNTED to prevent React AnimatePresence lag spikes         */}
            {/* ------------------------------------------------------------------ */}
            <div
                id="settings-mockup-wrapper"
                className="fixed inset-0 z-[49] pointer-events-none transition-opacity duration-150"
                style={{ opacity: isPreviewingOpacity ? 1 : 0 }}
            >
                <MockupNativelyInterface opacity={previewOverlayOpacity} />
            </div>
        </AnimatePresence >
    );
};

export default SettingsOverlay;
