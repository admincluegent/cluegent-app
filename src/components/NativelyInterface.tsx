import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { remainingListeningSeconds, formatListeningDuration } from '../lib/listeningBalance';
import {
    Sparkles,
    Pencil,
    MessageSquare,
    RefreshCw,
    Settings,
    ArrowUp,
    ArrowRight,
    HelpCircle,
    ChevronUp,
    ChevronDown,
    Lightbulb,
    CornerDownLeft,
    Mic,
    MicOff,
    Image,
    Camera,
    X,
    LogOut,
    Zap,
    Edit3,
    LayoutGrid,
    Ghost,
    Link,
    Code,
    Copy,
    Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// import { ModelSelector } from './ui/ModelSelector'; // REMOVED
import TopPill from './ui/TopPill';
import RollingTranscript from './ui/RollingTranscript';
import ResizableResponsePanel, { getResponsePanelWidth } from './ui/ResizableResponsePanel';
import { buildResponsePages } from '../lib/responsePages';
import { createMessageId } from '../lib/messageIds';
import { updateLiveTranscript, formatLiveTranscript, type LiveTranscriptTurn } from '../lib/liveTranscript';
import { useOverlayHitTest } from '../hooks/useOverlayHitTest';
import { ReportAiContentButton } from './ReportAiContentButton';
import { NegotiationCoachingCard } from '../premium';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { analytics, detectProviderType } from '../lib/analytics/analytics.service';
import { useShortcuts } from '../hooks/useShortcuts';
import { useResolvedTheme } from '../hooks/useResolvedTheme';
import { getOverlayAppearance, OVERLAY_OPACITY_DEFAULT } from '../lib/overlayAppearance';
import { useAuth } from '../contexts/auth.context';
import { trackSttUsage } from '../services/backendApi';
import {
    appendLocalMeetingEvent,
    finishCurrentLocalMeeting,
    getCurrentLocalMeetingId,
    startCurrentLocalMeetingListening,
    stopCurrentLocalMeetingListening,
} from '../lib/localMeetingStorage';
import { buildAiBehaviorInstruction } from '../lib/aiBehaviorSettings';
import {
    DEFAULT_QUICK_ACTIONS,
    buildQuickActionInstruction,
    getCustomQuickActions,
    getQuickActionVisibility,
    getQuickActionSettings,
    getVisibleDefaultQuickActions,
    QuickActionConfig,
    subscribeQuickActionSettings,
} from '../lib/quickActionSettings';

interface Message {
    id: string;
    requestId?: string;
    role: 'user' | 'system' | 'interviewer';
    text: string;
    isStreaming?: boolean;
    hasScreenshot?: boolean;
    screenshotPreview?: string;
    isCode?: boolean;
    intent?: string;
    isNegotiationCoaching?: boolean;
    negotiationCoachingData?: {
        tacticalNote: string;
        exactScript: string;
        showSilenceTimer: boolean;
        phase: string;
        theirOffer: number | null;
        yourTarget: number | null;
        currency: string;
    };
}

interface NativelyInterfaceProps {
    onEndMeeting?: () => void;
    overlayOpacity?: number;
}

type ScreenshotAttachment = { path: string; preview: string };

type AiTimingTrace = {
    traceId: string;
    submitStartedAt: number;
    ragDoneAt?: number;
    clientFirstTokenAt?: number;
};

const createAiTimingTrace = (): AiTimingTrace => ({
    traceId: globalThis.crypto?.randomUUID?.() ?? `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    submitStartedAt: Date.now(),
});

const logAiTiming = (
    trace: AiTimingTrace,
    milestone: string,
    details: Record<string, unknown> = {}
) => {
    const at = Date.now();
    console.info('[AI_TIMING]', JSON.stringify({
        traceId: trace.traceId,
        milestone,
        component: 'renderer',
        at,
        elapsedMs: at - trace.submitStartedAt,
        ...details,
    }));
};

const FREE_PLAN_LIMIT_REACHED_MESSAGE = "Free Plan Limit Reached. Subscribe to use more.";
const FREE_TRIAL_TOTAL_USAGE_SECONDS = 12 * 60;
const FREE_TRIAL_USAGE_REPORT_INTERVAL_SECONDS = 5;

const isPlanLimitMessage = (error: string) => {
    const lower = error.toLowerCase();
    return (
        lower.includes('free trial limit') ||
        lower.includes('free plan limit') ||
        lower.includes('monthly screenshot limit') ||
        lower.includes('screenshot limit') ||
        lower.includes('prompt limit') ||
        lower.includes('plan limit') ||
        lower.includes('quota exceeded') ||
        lower.includes('resource_exhausted')
    );
};

const formatAssistantError = (error: string) => (
    isPlanLimitMessage(error) ? FREE_PLAN_LIMIT_REACHED_MESSAGE : error
);

const compactOrderedListClass = 'my-0.5 list-decimal list-inside space-y-0.5 pl-0 marker:font-semibold marker:text-white/90';
const compactUnorderedListClass = 'my-0.5 list-disc list-inside space-y-0.5 pl-0 marker:text-white/90';
const compactListItemClass = 'leading-snug [&>p]:inline [&>p]:m-0 [&>ul]:mt-0.5 [&>ol]:mt-0.5';

const normalizeMarkdownLists = (text: string) => (
    text
        .replace(/(^|\n)([ \t]*)(\d+)\.[ \t]*(?:\r?\n)+[ \t]*(?=\S)/g, '$1$2$3. ')
        .replace(/(^|\n)([ \t]*)([-*+])[ \t]*(?:\r?\n)+[ \t]*(?=\S)/g, '$1$2$3 ')
        .replace(/\n{2,}(?=[ \t]*(?:\d+\.|[-*+])\s+)/g, '\n')
        .replace(/(:|\.)\n{2,}(?=[ \t]*[-*+]\s+)/g, '$1\n')
        .replace(/\n{3,}/g, '\n\n')
);

const NativelyInterface: React.FC<NativelyInterfaceProps> = ({ onEndMeeting, overlayOpacity = OVERLAY_OPACITY_DEFAULT }) => {
    const isLightTheme = useResolvedTheme() === 'light';
    const { user, planStatus, refreshProfile, isSyncing } = useAuth();
    const [isExpanded, setIsExpanded] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const { shortcuts, isShortcutPressed } = useShortcuts();
    const [messages, setMessages] = useState<Message[]>([]);
    const responsePages = useMemo(() => buildResponsePages(messages), [messages]);
    const [selectedResponsePage, setSelectedResponsePage] = useState<number | null>(null);
    const responsePageIndex = Math.min(selectedResponsePage ?? responsePages.length - 1, responsePages.length - 1);
    const visibleResponseMessages = responsePages[responsePageIndex] ?? [];
    const [responseOpacity, setResponseOpacity] = useState(() => {
        const saved = Number(localStorage.getItem('cluegent_response_opacity'));
        return saved >= .2 && saved <= 1 ? saved : 1;
    });
    const directScreenshotInProgress = useRef(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [listeningSeconds, setListeningSeconds] = useState(0);
    const listeningStartedAtRef = useRef<number | null>(null);
    const isListeningRef = useRef(false);
    const [sttUserStatus, setSttUserStatus] = useState<'connected' | 'reconnecting' | 'failed'>('connected');
    const [sttUserError, setSttUserError] = useState<string>('');
    const [sttUserProvider, setSttUserProvider] = useState<string>('');
    const [sttInterviewerStatus, setSttInterviewerStatus] = useState<'connected' | 'reconnecting' | 'failed'>('connected');
    const [sttInterviewerError, setSttInterviewerError] = useState<string>('');
    const [sttInterviewerProvider, setSttInterviewerProvider] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const chatSubmissionInProgress = useRef(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [conversationContext, setConversationContext] = useState<string>('');
    const [isManualRecording, setIsManualRecording] = useState(false);
    const isRecordingRef = useRef(false);  // Ref to track recording state (avoids stale closure)
    const [manualTranscript, setManualTranscript] = useState('');
    const manualTranscriptRef = useRef<string>('');
    const [isCluegentSessionActive, setIsCluegentSessionActive] = useState(false);
    const [showTranscript, setShowTranscript] = useState(() => {
        const stored = localStorage.getItem('natively_interviewer_transcript');
        return stored !== 'false';
    });

    // Analytics State
    const requestStartTimeRef = useRef<number | null>(null);
    const activeAiTimingRef = useRef<AiTimingTrace | null>(null);
    const streamingResponseTextRef = useRef('');
    const localMeetingIdRef = useRef<string | null>(getCurrentLocalMeetingId());
    const isHourlyPlan = planStatus?.plan === 'hour3' || planStatus?.plan === 'hour10';
    const hourlyBalanceRef = useRef({ seconds: planStatus?.remaining.sttSeconds ?? 0, at: Date.now(), snapshot: planStatus, listening: isCluegentSessionActive });
    if (hourlyBalanceRef.current.snapshot !== planStatus || hourlyBalanceRef.current.listening !== isCluegentSessionActive) {
        const previous = hourlyBalanceRef.current;
        const serverBalance = planStatus?.remaining.sttSeconds ?? 0;
        const previousEstimate = remainingListeningSeconds(previous.seconds, previous.listening ? (Date.now() - previous.at) / 1000 : 0);
        // Usage reports may lag by a few seconds. Do not move the countdown backwards
        // unless a purchase or plan change actually increased the server balance.
        const seconds = previous.snapshot?.plan === planStatus?.plan && serverBalance <= (previous.snapshot?.remaining.sttSeconds ?? 0)
            ? Math.min(serverBalance, previousEstimate) : serverBalance;
        hourlyBalanceRef.current = { seconds, at: Date.now(), snapshot: planStatus, listening: isCluegentSessionActive };
    }
    const hourlyRemainingSeconds = isHourlyPlan
        ? remainingListeningSeconds(hourlyBalanceRef.current.seconds, isCluegentSessionActive ? (Date.now() - hourlyBalanceRef.current.at) / 1000 : 0)
        : null;
    const isPaidListeningExhausted = !!planStatus && planStatus.plan !== 'free' && (isHourlyPlan ? hourlyRemainingSeconds === 0 : (planStatus.remaining.sttSeconds ?? 0) <= 0);
    useEffect(() => {
        if (!isListening && !(isHourlyPlan && isCluegentSessionActive)) return;
        const timer = window.setInterval(() => { void refreshProfile(); }, 15000);
        return () => window.clearInterval(timer);
    }, [isListening, isHourlyPlan, isCluegentSessionActive, refreshProfile]);
    useEffect(() => {
        if (isPaidListeningExhausted && isListening) void window.electronAPI?.stopListening();
    }, [isPaidListeningExhausted, isListening]);
    useEffect(() => {
        if (isPaidListeningExhausted) setIsExpanded(true);
    }, [isPaidListeningExhausted]);
    const formatDuration = formatListeningDuration;
    const freeTrialUsageStorageKey = user?.uid
        ? `cluegent_free_trial_local_used_seconds_${user.uid}`
        : null;
    const [freeTrialLocalUsedSeconds, setFreeTrialLocalUsedSeconds] = useState(0);
    const freeTrialLocalUsedSecondsRef = useRef(0);
    const freeTrialReportedSecondsRef = useRef(0);
    const freeTrialUsageReportInFlightRef = useRef(false);
    const freeTrialLimitOpenedRef = useRef(false);
    const wasCluegentSessionActiveRef = useRef(false);
    useEffect(() => {
        if (!planStatus || planStatus.plan === 'free') return;
        freeTrialLimitOpenedRef.current = false;
        setSttInterviewerError(current => /free trial limit/i.test(current) ? '' : current);
        setSttUserError(current => /free trial limit/i.test(current) ? '' : current);
    }, [planStatus?.plan]);
    const serverFreeTrialUsedSeconds = planStatus?.plan === 'free'
        ? Math.max(
            0,
            FREE_TRIAL_TOTAL_USAGE_SECONDS -
                Math.min(
                    FREE_TRIAL_TOTAL_USAGE_SECONDS,
                    planStatus.remaining.sttSeconds ?? FREE_TRIAL_TOTAL_USAGE_SECONDS
                )
        )
        : 0;
    const effectiveFreeTrialUsedSeconds = planStatus?.plan === 'free'
        ? Math.max(serverFreeTrialUsedSeconds, freeTrialLocalUsedSeconds)
        : 0;
    const freeTrialRemainingSeconds =
        planStatus?.plan === 'free'
            ? Math.max(0, FREE_TRIAL_TOTAL_USAGE_SECONDS - effectiveFreeTrialUsedSeconds)
            : null;
    const isFreePlanExhausted = planStatus?.plan === 'free' && freeTrialRemainingSeconds !== null && freeTrialRemainingSeconds <= 0;
    const listeningDuration =
        freeTrialRemainingSeconds !== null
            ? `${formatDuration(freeTrialRemainingSeconds)} left`
            : hourlyRemainingSeconds !== null ? `${formatDuration(hourlyRemainingSeconds)} left` : formatDuration(listeningSeconds);

    useEffect(() => {
        freeTrialLocalUsedSecondsRef.current = freeTrialLocalUsedSeconds;
    }, [freeTrialLocalUsedSeconds]);

    const syncFreeTrialUsage = useCallback(async (options?: { force?: boolean }) => {
        if (
            planStatus?.plan !== 'free' ||
            !freeTrialUsageStorageKey ||
            freeTrialUsageReportInFlightRef.current
        ) {
            return;
        }

        const currentUsedSeconds = freeTrialLocalUsedSecondsRef.current;
        const unreportedSeconds = currentUsedSeconds - freeTrialReportedSecondsRef.current;
        const shouldReport =
            unreportedSeconds >= FREE_TRIAL_USAGE_REPORT_INTERVAL_SECONDS ||
            (options?.force === true && unreportedSeconds > 0) ||
            (currentUsedSeconds >= FREE_TRIAL_TOTAL_USAGE_SECONDS && unreportedSeconds > 0);

        if (!shouldReport) {
            return;
        }

        const secondsToReport = Math.max(1, Math.floor(unreportedSeconds));
        freeTrialUsageReportInFlightRef.current = true;

        try {
            const result = await trackSttUsage(secondsToReport);
            const nextReportedSeconds = Math.min(
                FREE_TRIAL_TOTAL_USAGE_SECONDS,
                freeTrialReportedSecondsRef.current + secondsToReport
            );
            freeTrialReportedSecondsRef.current = nextReportedSeconds;

            if (result.remaining.sttSecondsRemaining <= 0) {
                freeTrialLocalUsedSecondsRef.current = FREE_TRIAL_TOTAL_USAGE_SECONDS;
                setFreeTrialLocalUsedSeconds(FREE_TRIAL_TOTAL_USAGE_SECONDS);
                localStorage.setItem(freeTrialUsageStorageKey, String(FREE_TRIAL_TOTAL_USAGE_SECONDS));
            }

            void refreshProfile();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (isPlanLimitMessage(message)) {
                freeTrialLocalUsedSecondsRef.current = FREE_TRIAL_TOTAL_USAGE_SECONDS;
                setFreeTrialLocalUsedSeconds(FREE_TRIAL_TOTAL_USAGE_SECONDS);
                localStorage.setItem(freeTrialUsageStorageKey, String(FREE_TRIAL_TOTAL_USAGE_SECONDS));
                void refreshProfile();
            } else {
                console.warn('[NativelyInterface] Failed to sync free trial usage', error);
            }
        } finally {
            freeTrialUsageReportInFlightRef.current = false;
        }
    }, [freeTrialUsageStorageKey, planStatus?.plan, refreshProfile]);

    // Sync transcript setting
    useEffect(() => {
        localStorage.setItem('natively_interviewer_transcript', 'true');
        setShowTranscript(true);
        const handleStorage = () => {
            const stored = localStorage.getItem('natively_interviewer_transcript');
            setShowTranscript(stored !== 'false');
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    useEffect(() => {
        void refreshProfile();
    }, [refreshProfile]);

    const [rollingTranscript, setRollingTranscript] = useState('');  // For interviewer rolling text bar
    const [liveTranscriptTurns, setLiveTranscriptTurns] = useState<LiveTranscriptTurn[]>([]);
    const [listeningSources, setListeningSources] = useState({ systemEnabled: true, micEnabled: true });
    const listeningSourcesRef = useRef(listeningSources);
    listeningSourcesRef.current = listeningSources;
    const [sourceBusy, setSourceBusy] = useState(false);
    const [sourceError, setSourceError] = useState('');
    const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false);  // Track if actively speaking
    const rollingTranscriptRef = useRef('');
    const finalizedRollingTranscriptRef = useRef('');  // Stores only committed interviewer turns
    const [userRollingTranscript, setUserRollingTranscript] = useState('');
    const [isUserSpeaking, setIsUserSpeaking] = useState(false);
    const userRollingTranscriptRef = useRef('');
    const finalizedUserRollingTranscriptRef = useRef('');
    const [voiceInput, setVoiceInput] = useState('');  // Accumulated user voice input
    const voiceInputRef = useRef<string>('');  // Ref for capturing in async handlers
    const textInputRef = useRef<HTMLInputElement>(null); // Ref for input focus
    const isStealthRef = useRef<boolean>(false); // Tracks if the next expansion should be stealthy
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [responsePanelWidth, setResponsePanelWidth] = useState(getResponsePanelWidth);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => { setSelectedResponsePage(null); }, [responsePages.length]);
    useEffect(() => { if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0; }, [responsePageIndex]);
    const [responsePanelHeight, setResponsePanelHeight] = useState(() => {
        const stored = Number(localStorage.getItem('cluegent_response_panel_height'));
        return Number.isFinite(stored) && stored > 0
            ? Math.min(Math.max(stored, 260), 620)
            : 380;
    });
    // Captures data from onCaptureAndProcess before the React state flush so
    // handleWhatToSay() can access it even in React 18 concurrent mode (where
    // a plain setTimeout(0) may fire before setAttachedContext flushes).
    const pendingCaptureRef = useRef<ScreenshotAttachment | null>(null);

    // Latent Context State (Screenshots attached but not sent)
    const [attachedContext, setAttachedContextState] = useState<ScreenshotAttachment[]>([]);
    const attachedContextRef = useRef<ScreenshotAttachment[]>([]);
    const setAttachedContext = (
        next: ScreenshotAttachment[] | ((prev: ScreenshotAttachment[]) => ScreenshotAttachment[])
    ) => {
        const resolved = typeof next === 'function'
            ? next(attachedContextRef.current)
            : next;
        attachedContextRef.current = resolved;
        setAttachedContextState(resolved);
    };
    const [copiedCodeBlockKey, setCopiedCodeBlockKey] = useState<string | null>(null);

    // Settings State with Persistence
    const [isUndetectable, setIsUndetectable] = useState(false);
    const [hideChatHidesWidget, setHideChatHidesWidget] = useState(() => {
        const stored = localStorage.getItem('natively_hideChatHidesWidget');
        return stored ? stored === 'true' : true;
    });

    // Active mode name (shown as a badge near the Modes button)
    const [activeModeLabel, setActiveModeLabel] = useState<string | null>(null);

    useEffect(() => {
        // Load initial active mode name
        window.electronAPI?.modesGetActive?.()
            .then((mode: { name: string } | null) => setActiveModeLabel(mode?.name ?? null))
            .catch(() => {});
        // Live-update whenever mode is activated/deactivated
        const unsub = window.electronAPI?.onModeChanged?.((data: { id: string | null; name: string | null }) => {
            setActiveModeLabel(data.name);
        });
        return () => unsub?.();
    }, []);

    // Backend-managed model badge
    const [currentModel] = useState<string>('firebase-managed');

    // Dynamic Action Button Mode (Recap vs Brainstorm)
    const [actionButtonMode, setActionButtonMode] = useState<'recap' | 'brainstorm'>('recap');
    const [quickActions, setQuickActions] = useState(() => getQuickActionSettings());
    const [customQuickActions, setCustomQuickActions] = useState<QuickActionConfig[]>(() => getCustomQuickActions());
    const [visibleDefaultQuickActions, setVisibleDefaultQuickActions] = useState(() => getVisibleDefaultQuickActions());
    const [showQuickActionButtons, setShowQuickActionButtons] = useState(() => getQuickActionVisibility());
    const allQuickActions = useMemo(
        () => [...visibleDefaultQuickActions.map((action) => quickActions[action.id as keyof typeof quickActions]), ...customQuickActions],
        [customQuickActions, quickActions, visibleDefaultQuickActions]
    );

    useEffect(() => {
        // Load persisted mode
        window.electronAPI?.getActionButtonMode?.()?.then((mode: 'recap' | 'brainstorm') => {
            if (mode) setActionButtonMode(mode);
        }).catch(() => {});

        // Listen for live changes from SettingsPopup / IPC
        const unsubscribe = window.electronAPI?.onActionButtonModeChanged?.((mode: 'recap' | 'brainstorm') => {
            setActionButtonMode(mode);
        });
        return () => { unsubscribe?.(); };
    }, []);

    useEffect(() => {
        const refreshQuickActions = () => {
            setQuickActions(getQuickActionSettings());
            setCustomQuickActions(getCustomQuickActions());
            setVisibleDefaultQuickActions(getVisibleDefaultQuickActions());
            setShowQuickActionButtons(getQuickActionVisibility());
        };
        refreshQuickActions();
        return subscribeQuickActionSettings(refreshQuickActions);
    }, []);

    useEffect(() => {
        window.electronAPI?.getListeningActive?.().then((active) => {
            setIsListening(active);
            isListeningRef.current = active;
            listeningStartedAtRef.current = active ? Date.now() : null;
            setListeningSeconds(0);
            if (active) {
                startCurrentLocalMeetingListening();
            }
        }).catch(() => {});

        const unsubscribe = window.electronAPI?.onListeningStateChanged?.((data) => {
            if (data.systemEnabled !== undefined && data.micEnabled !== undefined) {
                setListeningSources({ systemEnabled: data.systemEnabled, micEnabled: data.micEnabled });
            }
            if (isListeningRef.current === data.isListening) return;
            setIsListening(data.isListening);
            isListeningRef.current = data.isListening;
            listeningStartedAtRef.current = data.isListening ? Date.now() : null;
            setListeningSeconds(0);
            if (data.isListening) {
                startCurrentLocalMeetingListening();
            } else {
                stopCurrentLocalMeetingListening();
            }
        });

        return () => unsubscribe?.();
    }, []);

    useEffect(() => {
        if (!isListening && !(isHourlyPlan && isCluegentSessionActive)) return;
        const timer = window.setInterval(() => {
            const startedAt = listeningStartedAtRef.current ?? Date.now();
            setListeningSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [isListening, isHourlyPlan, isCluegentSessionActive]);

    useEffect(() => {
        let disposed = false;

        const refreshActiveState = async () => {
            const localSessionActive = Boolean(localStorage.getItem('natively_last_meeting_start'));
            let active = localSessionActive;

            try {
                active = Boolean(await window.electronAPI?.getMeetingActive?.());
            } catch {
                active = localSessionActive;
            }

            if (!disposed) {
                setIsCluegentSessionActive(active);
            }
        };

        void refreshActiveState();
        const intervalId = window.setInterval(() => {
            void refreshActiveState();
        }, 1000);

        return () => {
            disposed = true;
            window.clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        if (!freeTrialUsageStorageKey) {
            setFreeTrialLocalUsedSeconds(0);
            freeTrialLocalUsedSecondsRef.current = 0;
            freeTrialReportedSecondsRef.current = 0;
            return;
        }

        const stored = Number(localStorage.getItem(freeTrialUsageStorageKey));
        const safeStored = Number.isFinite(stored)
            ? Math.min(Math.max(Math.floor(stored), 0), FREE_TRIAL_TOTAL_USAGE_SECONDS)
            : 0;
        const mergedUsedSeconds = Math.max(safeStored, serverFreeTrialUsedSeconds);
        setFreeTrialLocalUsedSeconds(mergedUsedSeconds);
        freeTrialLocalUsedSecondsRef.current = mergedUsedSeconds;
        localStorage.setItem(freeTrialUsageStorageKey, String(mergedUsedSeconds));
        freeTrialReportedSecondsRef.current = serverFreeTrialUsedSeconds;
        if (mergedUsedSeconds < FREE_TRIAL_TOTAL_USAGE_SECONDS) {
            freeTrialLimitOpenedRef.current = false;
        }
    }, [freeTrialUsageStorageKey, serverFreeTrialUsedSeconds]);

    useEffect(() => {
        if (planStatus?.plan !== 'free' || !freeTrialUsageStorageKey) {
            return;
        }

        if (serverFreeTrialUsedSeconds > freeTrialReportedSecondsRef.current) {
            freeTrialReportedSecondsRef.current = serverFreeTrialUsedSeconds;
        }
    }, [freeTrialUsageStorageKey, planStatus?.plan, serverFreeTrialUsedSeconds]);

    useEffect(() => {
        if (planStatus?.plan !== 'free' || !freeTrialUsageStorageKey) {
            return;
        }

        const tick = () => {
            if (!isCluegentSessionActive) {
                return;
            }

            setFreeTrialLocalUsedSeconds((previous) => {
                const next = Math.min(previous + 1, FREE_TRIAL_TOTAL_USAGE_SECONDS);
                freeTrialLocalUsedSecondsRef.current = next;
                localStorage.setItem(freeTrialUsageStorageKey, String(next));
                return next;
            });
        };

        const timer = window.setInterval(tick, 1000);
        tick();
        return () => window.clearInterval(timer);
    }, [freeTrialUsageStorageKey, isCluegentSessionActive, planStatus?.plan]);

    useEffect(() => {
        void syncFreeTrialUsage();
    }, [freeTrialLocalUsedSeconds, syncFreeTrialUsage]);

    useEffect(() => {
        if (wasCluegentSessionActiveRef.current && !isCluegentSessionActive) {
            void syncFreeTrialUsage({ force: true });
        }

        wasCluegentSessionActiveRef.current = isCluegentSessionActive;
    }, [isCluegentSessionActive, syncFreeTrialUsage]);

    useEffect(() => {
        const flushUsage = () => {
            void syncFreeTrialUsage({ force: true });
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                flushUsage();
            }
        };

        window.addEventListener('pagehide', flushUsage);
        window.addEventListener('beforeunload', flushUsage);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('pagehide', flushUsage);
            window.removeEventListener('beforeunload', flushUsage);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [syncFreeTrialUsage]);

    const codeTheme = {
        'code[class*="language-"]': {
            color: '#ffffff',
            background: 'transparent',
            textShadow: 'none',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        },
        'pre[class*="language-"]': {
            color: '#ffffff',
            background: 'transparent',
            textShadow: 'none',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        },
        comment: {
            color: '#22c55e',
            fontStyle: 'italic',
        },
        prolog: {
            color: '#22c55e',
            fontStyle: 'italic',
        },
        doctype: {
            color: '#22c55e',
            fontStyle: 'italic',
        },
        cdata: {
            color: '#22c55e',
            fontStyle: 'italic',
        },
    };
    const codeLineNumberColor = 'rgba(255,255,255,0.5)';
    const appearance = useMemo(
        () => getOverlayAppearance(overlayOpacity, isLightTheme ? 'light' : 'dark'),
        [overlayOpacity, isLightTheme]
    );
    const overlayPanelClass = 'overlay-text-primary';
    const subtleSurfaceClass = 'overlay-subtle-surface';
    const codeBlockClass = 'overlay-code-block-surface';
    const codeHeaderClass = 'overlay-code-header-surface';
    const codeHeaderTextClass = 'text-white';
    const quickActionClass = 'overlay-chip-surface overlay-text-interactive';
    const inputClass = 'focus:ring-white/15 overlay-input-surface overlay-input-text text-white caret-white';
    const controlSurfaceClass = 'overlay-control-surface overlay-text-interactive';

    // Global State Sync
    useEffect(() => {
        // Fetch initial state
        if (window.electronAPI?.getUndetectable) {
            window.electronAPI.getUndetectable().then(setIsUndetectable);
        }

        if (window.electronAPI?.onUndetectableChanged) {
            const unsubscribe = window.electronAPI.onUndetectableChanged((state) => {
                setIsUndetectable(state);
            });
            return () => unsubscribe();
        }
    }, []);

    // Persist Settings
    useEffect(() => {
        localStorage.setItem('natively_undetectable', String(isUndetectable));
        localStorage.setItem('natively_hideChatHidesWidget', String(hideChatHidesWidget));
    }, [isUndetectable, hideChatHidesWidget]);

    // Mouse Passthrough State
    const [isMousePassthrough, setIsMousePassthrough] = useState(false);
    useEffect(() => {
        window.electronAPI?.getOverlayMousePassthrough?.().then(setIsMousePassthrough).catch(() => {});
        const unsub = window.electronAPI?.onOverlayMousePassthroughChanged?.((v) => setIsMousePassthrough(v));
        return () => unsub?.();
    }, []);

    // Screen Recording Permission Warning Banner
    const [systemAudioWarning, setSystemAudioWarning] = useState<string | null>(null);
    useEffect(() => {
        const unsub = window.electronAPI?.onSystemAudioPermissionDenied?.((message: string) => {
            setSystemAudioWarning(message);
            setIsExpanded(true); // Force overlay open so user sees the warning
        });
        return () => unsub?.();
    }, []);

    // PR #173: STT not configured warning â€” shown when provider is 'none' during a meeting
    const [sttNotConfigured, setSttNotConfigured] = useState(false);
    useEffect(() => {
        let mounted = true;
        // Check current STT config on mount
        window.electronAPI?.getSttProvider?.().then((provider: string) => {
            if (mounted) setSttNotConfigured(provider === 'none');
        }).catch(() => {});

        // Listen for live config changes (e.g. user saves a key in Settings while meeting is active)
        const unsub = window.electronAPI?.onSttConfigChanged?.((data: { configured: boolean; provider: string }) => {
            if (mounted) setSttNotConfigured(!data.configured);
        });
        return () => {
            mounted = false;
            unsub?.();
        };
    }, []);

    useOverlayHitTest();

    // Auto-resize Window
    useLayoutEffect(() => {
        if (!contentRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Use getBoundingClientRect to get the exact rendered size including padding
                const rect = entry.target.getBoundingClientRect();

                // Send exact dimensions to Electron
                // Removed buffer to ensure tight fit
                console.log('[NativelyInterface] ResizeObserver:', Math.ceil(rect.width), Math.ceil(rect.height));
                window.electronAPI?.updateContentDimensions({
                    width: Math.ceil(rect.width),
                    height: Math.ceil(rect.height)
                });
            }
        });

        observer.observe(contentRef.current);
        return () => observer.disconnect();
    }, []);

    // Force resize when attachedContext changes (screenshots added/removed)
    useEffect(() => {
        if (!contentRef.current) return;
        // Let the DOM settle, then measure and push new dimensions
        requestAnimationFrame(() => {
            if (!contentRef.current) return;
            const rect = contentRef.current.getBoundingClientRect();
            window.electronAPI?.updateContentDimensions({
                width: Math.ceil(rect.width),
                height: Math.ceil(rect.height)
            });
        });
    }, [attachedContext]);

    // Force initial sizing safety check
    useEffect(() => {
        const timer = setTimeout(() => {
            if (contentRef.current) {
                const rect = contentRef.current.getBoundingClientRect();
                window.electronAPI?.updateContentDimensions({
                    width: Math.ceil(rect.width),
                    height: Math.ceil(rect.height)
                });
            }
        }, 600);
        return () => clearTimeout(timer);
    }, []);

    // Build conversation context from messages
    useEffect(() => {
        rollingTranscriptRef.current = rollingTranscript;
    }, [rollingTranscript]);

    useEffect(() => {
        userRollingTranscriptRef.current = userRollingTranscript;
    }, [userRollingTranscript]);

    const combinedRollingTranscript = useMemo(() => formatLiveTranscript(liveTranscriptTurns), [liveTranscriptTurns]);

    useEffect(() => {
        const trimContextLine = (value: string, maxLength = 700) => {
            const clean = value.replace(/\s+/g, ' ').trim();
            return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
        };

        const context = messages
            .filter(m => m.role !== 'user' || !m.hasScreenshot)
            .map(m => {
                const label = m.role === 'interviewer'
                    ? 'Interviewer'
                    : m.role === 'user'
                        ? 'User'
                        : 'Assistant';
                return `${label}: ${trimContextLine(m.text)}`;
            })
            .filter(Boolean)
            .slice(-6)
            .join('\n')
            .slice(-3200);
        setConversationContext(context);
    }, [messages]);

    const buildLiveCopilotContext = (extraInstructions?: string) => {
        const contextBlocks: string[] = [];
        const liveTranscript = (
            rollingTranscriptRef.current
            || rollingTranscript
            || finalizedRollingTranscriptRef.current
            || ''
        ).trim().slice(-2500);
        const micTranscript = (
            userRollingTranscriptRef.current
            || userRollingTranscript
            || finalizedUserRollingTranscriptRef.current
            || ''
        ).trim().slice(-1800);
        const chatContext = conversationContext.trim();

        if (liveTranscript) {
            contextBlocks.push(`[INTERVIEWER / SYSTEM AUDIO - latest live audio]\n${liveTranscript}`);
        }

        if (micTranscript) {
            contextBlocks.push(`[YOU / MICROPHONE - latest live audio]\n${micTranscript}`);
        }

        if (chatContext) {
            contextBlocks.push(`[RECENT CHAT CONTEXT]\n${chatContext}`);
        }

        if (extraInstructions?.trim()) {
            contextBlocks.push(`[REQUEST INSTRUCTIONS]\n${extraInstructions.trim()}`);
        }

        return contextBlocks.join('\n\n');
    };

    const shouldQueryLiveRag = (text: string) =>
        /\b(previous|earlier|before|meeting|transcript|recap|summari[sz]e|mentioned|what did|history)\b/i.test(text);

    const combineInstructions = (...instructions: Array<string | undefined>) =>
        instructions
            .map(instruction => instruction?.trim())
            .filter(Boolean)
            .join('\n');

    type AiSubmitFlow = 'typed' | 'rolling-stt' | 'screenshot' | 'rolling-stt+screenshot';

    const getLatestRollingTranscript = () => (
        [
            (rollingTranscriptRef.current || rollingTranscript || finalizedRollingTranscriptRef.current || '').trim()
                ? `Interviewer: ${(rollingTranscriptRef.current || rollingTranscript || finalizedRollingTranscriptRef.current || '').trim()}`
                : '',
            (userRollingTranscriptRef.current || userRollingTranscript || finalizedUserRollingTranscriptRef.current || '').trim()
                ? `You: ${(userRollingTranscriptRef.current || userRollingTranscript || finalizedUserRollingTranscriptRef.current || '').trim()}`
                : '',
        ].filter(Boolean).join('\n')
    ).trim();

    const getAiSubmitFlow = (hasScreenshot: boolean, hasTypedPrompt: boolean, hasRollingTranscript: boolean): AiSubmitFlow => {
        if (hasScreenshot && hasRollingTranscript) return 'rolling-stt+screenshot';
        if (hasScreenshot) return 'screenshot';
        if (hasRollingTranscript && !hasTypedPrompt) return 'rolling-stt';
        return 'typed';
    };

    const previewDebugText = (text: string, limit = 220) => {
        const compact = text.replace(/\s+/g, ' ').trim();
        return compact.length > limit ? `${compact.slice(0, limit)}...` : compact;
    };

    const debugAiSubmitFlow = (
        flow: AiSubmitFlow,
        details: {
            typedPrompt?: string;
            rollingTranscript?: string;
            effectivePrompt?: string;
            attachmentCount?: number;
            context?: string;
            modelRoute?: string;
        }
    ) => {
        const enabled = import.meta.env.DEV || localStorage.getItem('cluegent_ai_debug') === 'true';
        if (!enabled) return;

        console.groupCollapsed(`[Cluegent AI] ${flow}`);
        console.info({
            modelRoute: details.modelRoute,
            attachmentCount: details.attachmentCount ?? 0,
            hasTypedPrompt: Boolean(details.typedPrompt?.trim()),
            hasRollingTranscript: Boolean(details.rollingTranscript?.trim()),
            effectivePromptLength: details.effectivePrompt?.length ?? 0,
            contextLength: details.context?.length ?? 0,
        });
        if (details.typedPrompt?.trim()) {
            console.info('typedPrompt:', previewDebugText(details.typedPrompt));
        }
        if (details.rollingTranscript?.trim()) {
            console.info('rollingTranscript:', previewDebugText(details.rollingTranscript));
        }
        if (details.effectivePrompt?.trim()) {
            console.info('effectivePrompt:', previewDebugText(details.effectivePrompt, 500));
        }
        console.groupEnd();
    };

    // Listen for settings window visibility changes
    useEffect(() => {
        if (!window.electronAPI?.onSettingsVisibilityChange) return;
        const unsubscribe = window.electronAPI.onSettingsVisibilityChange((isVisible) => {
            setIsSettingsOpen(isVisible);
        });
        return () => unsubscribe();
    }, []);

    // Sync Window Visibility with Expanded State
    useEffect(() => {
        if (isExpanded) {
            window.electronAPI.showWindow(isStealthRef.current);
            isStealthRef.current = false; // Reset back to default
        }
    }, [isExpanded]);

    // Keyboard shortcut to toggle expanded state (via Main Process)
    useEffect(() => {
        if (!window.electronAPI?.onToggleExpand) return;
        const unsubscribe = window.electronAPI.onToggleExpand(() => {
            setIsExpanded(prev => !prev);
        });
        return () => unsubscribe();
    }, []);

    // Ensure overlay is expanded when requested by main process (e.g. after switching to overlay mode).
    // IMPORTANT: set isStealthRef before setIsExpanded so that if isExpanded was false, the
    // isExpanded effect fires showWindow(true) instead of showWindow(false). Without this,
    // ensure-expanded on a collapsed overlay would trigger show()+focus(), breaking stealth.
    useEffect(() => {
        if (!window.electronAPI?.onEnsureExpanded) return;
        const unsubscribe = window.electronAPI.onEnsureExpanded(() => {
            isStealthRef.current = true;
            setIsExpanded(true);
        });
        return () => unsubscribe();
    }, []);

    // Session Reset Listener - Clears UI when a NEW meeting starts
    useEffect(() => {
        if (!window.electronAPI?.onSessionReset) return;
        const unsubscribe = window.electronAPI.onSessionReset(() => {
            setLiveTranscriptTurns([]);
            chatSubmissionInProgress.current = false;
            console.log('[NativelyInterface] Resetting session state...');
            setMessages([]);
            setInputValue('');
            setAttachedContext([]);
            setManualTranscript('');
            setVoiceInput('');
            setRollingTranscript('');
            finalizedRollingTranscriptRef.current = '';
            setUserRollingTranscript('');
            finalizedUserRollingTranscriptRef.current = '';
            userRollingTranscriptRef.current = '';
            setIsUserSpeaking(false);
            setIsProcessing(false);
            // Optionally reset connection status if needed, but connection persists

            // Track new conversation/session if applicable?
            // Actually 'app_opened' is global, 'assistant_started' is overlay.
            // Maybe 'conversation_started' event?
            analytics.trackConversationStarted();
        });
        return () => unsubscribe();
    }, []);


    const handleScreenshotAttach = (data: ScreenshotAttachment) => {
        if (directScreenshotInProgress.current) return;
        setIsExpanded(true);
        setAttachedContext(prev => {
            // Prevent duplicates and cap at 5
            if (prev.some(s => s.path === data.path)) return prev;
            const updated = [...prev, data];
            return updated.slice(-5); // Keep last 5
        });
    };

    const reportScreenshotError = (error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        setIsExpanded(true);
        setMessages(prev => [...prev, {
            id: `screenshot-error-${Date.now()}`,
            role: 'system',
            text: `Screenshot failed: ${detail}`,
        }]);
    };

    // STT Status listener â€” must survive isExpanded changes.
    // If registered inside the [isExpanded] effect, events are dropped during cleanup.
    useEffect(() => {
        return window.electronAPI.onSttStatusChanged((data) => {
            const lowerError = data.error?.toLowerCase() ?? '';
            const isLimitError =
                lowerError.includes('quota') ||
                lowerError.includes('limit') ||
                lowerError.includes('resource_exhausted');

            if (data.channel === 'user') {
                setSttUserStatus(data.state);
                setSttUserProvider(data.provider);
                if (data.error) setSttUserError(data.error);
                if (data.state === 'connected') setSttUserError('');
            } else if (data.channel === 'interviewer') {
                setSttInterviewerStatus(data.state);
                setSttInterviewerProvider(data.provider);
                if (data.error) setSttInterviewerError(data.error);
                if (data.state === 'connected') setSttInterviewerError('');
            }

            if (data.state === 'failed' && isLimitError) {
                void refreshProfile();
            }
        });
    }, [refreshProfile]);

    // Connect to Native Audio Backend
    useEffect(() => {
        const cleanups: (() => void)[] = [];

        // Connection Status
        window.electronAPI.getNativeAudioStatus().then((status) => {
            setIsConnected(status.connected);
        }).catch(() => setIsConnected(false));

        cleanups.push(window.electronAPI.onNativeAudioConnected(() => {
            setIsConnected(true);
        }));
        cleanups.push(window.electronAPI.onNativeAudioDisconnected(() => {
            setIsConnected(false);
        }));

        // Real-time Transcripts
        cleanups.push(window.electronAPI.onNativeAudioTranscript((transcript) => {
            if (!isRecordingRef.current && ((transcript.speaker === 'user' && !listeningSourcesRef.current.micEnabled) || (transcript.speaker === 'interviewer' && !listeningSourcesRef.current.systemEnabled))) return;
            if (isListeningRef.current && !isRecordingRef.current && (transcript.speaker === 'user' || transcript.speaker === 'interviewer')) {
                const speaker = transcript.speaker;
                setLiveTranscriptTurns(turns => updateLiveTranscript(turns, speaker, transcript.text, transcript.final));
            }
            // When the manual Mic flow is active, capture USER transcripts for voice input.
            // Use ref to avoid stale closure issue.
            if (isRecordingRef.current && transcript.speaker === 'user') {
                if (transcript.final) {
                    // Accumulate final transcripts
                    setVoiceInput(prev => {
                        const updated = prev + (prev ? ' ' : '') + transcript.text;
                        voiceInputRef.current = updated;
                        return updated;
                    });
                    setManualTranscript('');  // Clear partial preview
                    manualTranscriptRef.current = '';
                } else {
                    // Show live partial transcript
                    setManualTranscript(transcript.text);
                    manualTranscriptRef.current = transcript.text;
                }
                return;  // Don't add to messages while recording
            }

            if (transcript.speaker === 'user') {
                if (!isListeningRef.current) {
                    return;
                }

                setIsUserSpeaking(!transcript.final);
                const committed = finalizedUserRollingTranscriptRef.current;
                const nextText = transcript.text.trim();

                if (transcript.final) {
                    const normalizedTranscript = committed
                        ? `${committed}  |  ${nextText}`
                        : nextText;
                    finalizedUserRollingTranscriptRef.current = normalizedTranscript;
                    userRollingTranscriptRef.current = normalizedTranscript;
                    setUserRollingTranscript(normalizedTranscript);
                    try {
                        appendLocalMeetingEvent({
                            type: 'transcript',
                            text: `You: ${nextText}`,
                        }, localMeetingIdRef.current);
                    } catch (error) {
                        console.warn('[NativelyInterface] Failed to save microphone transcript locally:', error);
                    }

                    setTimeout(() => {
                        setIsUserSpeaking(false);
                    }, 3000);
                    return;
                }

                const liveTranscript = committed && nextText
                    ? `${committed}  |  ${nextText}`
                    : nextText || committed;
                userRollingTranscriptRef.current = liveTranscript;
                setUserRollingTranscript(liveTranscript);
                return;
            }

            if (!isListeningRef.current) {
                return;
            }

            // Only show interviewer (system audio) transcripts in rolling bar
            if (transcript.speaker !== 'interviewer') {
                return;  // Safety check for any other speaker types
            }

            // Route to rolling transcript bar - keep committed turns separate from
            // the current interim preview so final turn text does not duplicate.
            setIsInterviewerSpeaking(!transcript.final);

            const committed = finalizedRollingTranscriptRef.current;
            const nextText = transcript.text.trim();

            if (transcript.final) {
                const nextTranscript = committed
                    ? `${committed}  Â·  ${nextText}`
                    : nextText;
                finalizedRollingTranscriptRef.current = nextTranscript;
                rollingTranscriptRef.current = nextTranscript;
                setRollingTranscript(nextTranscript);
                const normalizedTranscript = committed
                    ? `${committed}  |  ${nextText}`
                    : nextText;
                finalizedRollingTranscriptRef.current = normalizedTranscript;
                rollingTranscriptRef.current = normalizedTranscript;
                setRollingTranscript(normalizedTranscript);
                try {
                    appendLocalMeetingEvent({
                        type: 'transcript',
                        text: nextText,
                    }, localMeetingIdRef.current);
                } catch (error) {
                    console.warn('[NativelyInterface] Failed to save rolling transcript locally:', error);
                }

                setTimeout(() => {
                    setIsInterviewerSpeaking(false);
                }, 3000);
                return;
            }

            const liveTranscript = committed && nextText
                ? `${committed}  |  ${nextText}`
                : nextText || committed;
            rollingTranscriptRef.current = liveTranscript;
            setRollingTranscript(liveTranscript);
            return;

            setRollingTranscript(
                committed && nextText
                    ? `${committed}  Â·  ${nextText}`
                    : nextText || committed
            );
            rollingTranscriptRef.current = committed && nextText
                ? `${committed}  Ã‚Â·  ${nextText}`
                : nextText || committed;
            return;

            if (transcript.final) {
                // Append finalized text to accumulated transcript
                setRollingTranscript(prev => {
                    const separator = prev ? '  Â·  ' : '';
                    return prev + separator + transcript.text;
                });

                // Clear speaking indicator after pause
                setTimeout(() => {
                    setIsInterviewerSpeaking(false);
                }, 3000);
            } else {
                // For partial transcripts, show current segment appended to accumulated
                setRollingTranscript(prev => {
                    // Find where previous finalized content ends (look for last separator)
                    const lastSeparator = prev.lastIndexOf('  Â·  ');
                    const accumulated = lastSeparator >= 0 ? prev.substring(0, lastSeparator + 5) : '';
                    return accumulated + transcript.text;
                });
            }
        }));

        // AI Suggestions from native audio (legacy)
        cleanups.push(window.electronAPI.onSuggestionProcessingStart(() => {
            setIsProcessing(true);
            setIsExpanded(true);
        }));

        cleanups.push(window.electronAPI.onSuggestionGenerated((data) => {
            setIsProcessing(false);
            setMessages(prev => [...prev, {
                id: createMessageId(),
                role: 'system',
                text: data.suggestion
            }]);
        }));

        cleanups.push(window.electronAPI.onSuggestionError((err) => {
            setIsProcessing(false);
            setMessages(prev => [...prev, {
                id: createMessageId(),
                role: 'system',
                text: `Error: ${err.error}`
            }]);
        }));



        cleanups.push(window.electronAPI.onIntelligenceSuggestedAnswerToken((data) => {
            // Progressive update for 'what_to_answer' mode
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];

                // If we already have a streaming message for this intent, append
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'what_to_answer') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: lastMsg.text + data.token
                    };
                    return updated;
                }

                // Otherwise, start a new one (First token)
                return [...prev, {
                    id: createMessageId(),
                    role: 'system',
                    text: data.token,
                    intent: 'what_to_answer',
                    isStreaming: true
                }];
            });
        }));

        cleanups.push(window.electronAPI.onIntelligenceSuggestedAnswer((data) => {
            setIsProcessing(false);
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];

                // If we were streaming, finalize it
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'what_to_answer') {
                    // Start new array to avoid mutation
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: data.answer, // Ensure final consistency
                        isStreaming: false
                    };
                    return updated;
                }

                // If we missed the stream (or not streaming), append fresh
                return [...prev, {
                    id: createMessageId(),
                    role: 'system',
                    text: data.answer,  // Plain text, no markdown - ready to speak
                    intent: 'what_to_answer'
                }];
            });
        }));

        // STREAMING: Refinement
        cleanups.push(window.electronAPI.onIntelligenceRefinedAnswerToken((data) => {
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === data.intent) {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: lastMsg.text + data.token
                    };
                    return updated;
                }
                // New stream start (e.g. user clicked Shorten)
                return [...prev, {
                    id: createMessageId(),
                    role: 'system',
                    text: data.token,
                    intent: data.intent,
                    isStreaming: true
                }];
            });
        }));

        cleanups.push(window.electronAPI.onIntelligenceRefinedAnswer((data) => {
            setIsProcessing(false);
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === data.intent) {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: data.answer,
                        isStreaming: false
                    };
                    return updated;
                }
                return [...prev, {
                    id: createMessageId(),
                    role: 'system',
                    text: data.answer,
                    intent: data.intent
                }];
            });
        }));

        // STREAMING: Recap
        cleanups.push(window.electronAPI.onIntelligenceRecapToken((data) => {
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'recap') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: lastMsg.text + data.token
                    };
                    return updated;
                }
                return [...prev, {
                    id: createMessageId(),
                    role: 'system',
                    text: data.token,
                    intent: 'recap',
                    isStreaming: true
                }];
            });
        }));

        cleanups.push(window.electronAPI.onIntelligenceRecap((data) => {
            setIsProcessing(false);
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'recap') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: data.summary,
                        isStreaming: false
                    };
                    return updated;
                }
                return [...prev, {
                    id: createMessageId(),
                    role: 'system',
                    text: data.summary,
                    intent: 'recap'
                }];
            });
        }));

        // STREAMING: Follow-Up Questions (Rendered as message? Or specific UI?)
        // Currently interface typically renders follow-up Qs as a message or button update.
        // Let's assume message for now based on existing 'follow_up_questions_update' handling
        // But wait, existing handle just sets state?
        // Let's check how 'follow_up_questions_update' was handled.
        // It was handled separate locally in this component maybe?
        // Ah, I need to see the existing listener for 'onIntelligenceFollowUpQuestionsUpdate'

        // Let's implemented token streaming for it anyway, likely it updates a message bubble 
        // OR it might update a specialized "Suggested Questions" area.
        // Assuming it's a message for consistency with "Copilot" approach.

        cleanups.push(window.electronAPI.onIntelligenceFollowUpQuestionsToken((data) => {
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'follow_up_questions') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: lastMsg.text + data.token
                    };
                    return updated;
                }
                return [...prev, {
                    id: createMessageId(),
                    role: 'system',
                    text: data.token,
                    intent: 'follow_up_questions',
                    isStreaming: true
                }];
            });
        }));

        cleanups.push(window.electronAPI.onIntelligenceFollowUpQuestionsUpdate((data) => {
            // This event name is slightly different ('update' vs 'answer')
            setIsProcessing(false);
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'follow_up_questions') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: data.questions,
                        isStreaming: false
                    };
                    return updated;
                }
                return [...prev, {
                    id: createMessageId(),
                    role: 'system',
                    text: data.questions,
                    intent: 'follow_up_questions'
                }];
            });
        }));

        cleanups.push(window.electronAPI.onIntelligenceManualResult((data) => {
            setIsProcessing(false);
            setMessages(prev => [...prev, {
                id: createMessageId(),
                role: 'system',
                text: `ðŸŽ¯ **Answer:**\n\n${data.answer}`
            }]);
        }));

        cleanups.push(window.electronAPI.onIntelligenceError((data) => {
            setIsProcessing(false);
            const errorText = formatAssistantError(data.error);
            setMessages(prev => [...prev, {
                id: createMessageId(),
                role: 'system',
                text: errorText === FREE_PLAN_LIMIT_REACHED_MESSAGE
                    ? errorText
                    : `âŒ Error (${data.mode}): ${errorText}`
            }]);
        }));
        return () => cleanups.forEach(fn => fn());
    }, [isExpanded]);

    // Stable mount-only effect for screenshot listeners.
    // These MUST NOT be inside the [isExpanded] effect â€” when a screenshot is
    // taken, `switchToOverlay` fires `ensure-expanded` which can flip isExpanded
    // from falseâ†’true, triggering the [isExpanded] effect cleanup. If `screenshot-taken`
    // arrives during that teardown gap the event is silently dropped (same issue
    // as clarify streaming listeners below). handleScreenshotAttach only uses stable
    // useState setters so a mount-only closure is safe here.
    useEffect(() => {
        const cleanupTaken = window.electronAPI.onScreenshotTaken(handleScreenshotAttach);
        const cleanupAttached = window.electronAPI.onScreenshotAttached?.(handleScreenshotAttach);
        return () => {
            cleanupTaken?.();
            cleanupAttached?.();
        };
    }, []);

    // Stable mount-only effect for clarify streaming listeners.
    // These MUST NOT be inside the [isExpanded] effect â€” if the user
    // expands/collapses the panel while a clarify stream is in-flight,
    // the [isExpanded] effect would tear down and re-register listeners,
    // orphaning the final 'clarify' event and leaving isProcessing=true forever.
    useEffect(() => {
        const cleanupToken = window.electronAPI.onIntelligenceClarifyToken((data) => {
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'clarify') {
                    const updated = [...prev];
                    updated[prev.length - 1] = { ...lastMsg, text: lastMsg.text + data.token };
                    return updated;
                }
                return [...prev, {
                    id: createMessageId(),
                    role: 'system' as const,
                    text: data.token,
                    intent: 'clarify',
                    isStreaming: true
                }];
            });
        });

        const cleanupFinal = window.electronAPI.onIntelligenceClarify((data) => {
            setIsProcessing(false);
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'clarify') {
                    const updated = [...prev];
                    updated[prev.length - 1] = { ...lastMsg, text: data.clarification, isStreaming: false };
                    return updated;
                }
                return [...prev, {
                    id: createMessageId(),
                    role: 'system' as const,
                    text: data.clarification,
                    intent: 'clarify'
                }];
            });
        });

        return () => {
            cleanupToken();
            cleanupFinal();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty â€” these listeners must survive isExpanded changes

    // Quick Actions - Updated to use new Intelligence APIs

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        analytics.trackCopyAnswer();
        // Optional: Trigger a small toast or state change for visual feedback
    };

    const handleCopyCodeBlock = (code: string, key: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCodeBlockKey(key);
        window.setTimeout(() => {
            setCopiedCodeBlockKey(current => current === key ? null : current);
        }, 1400);
    };

    const renderCodeBlock = (code: string, lang: string, key: string | number) => {
        const blockKey = String(key);
        const isCopied = copiedCodeBlockKey === blockKey;

        return (
            <div key={blockKey} className={`my-3 w-full min-w-0 overflow-hidden rounded-xl border shadow-lg ${codeBlockClass}`} style={appearance.codeBlockStyle}>
                <div className={`flex items-center justify-between gap-3 border-b px-3 py-1.5 ${codeHeaderClass}`} style={appearance.codeHeaderStyle}>
                    <span className={`truncate text-[10px] font-semibold uppercase tracking-widest font-mono ${codeHeaderTextClass}`}>
                        {lang || 'CODE'}
                    </span>
                    <button
                        type="button"
                        onClick={() => handleCopyCodeBlock(code, blockKey)}
                        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                        title="Copy code"
                        aria-label="Copy code"
                    >
                        {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                </div>
                <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden bg-transparent">
                    <SyntaxHighlighter
                        language={lang}
                        style={codeTheme}
                        customStyle={{
                            margin: 0,
                            borderRadius: 0,
                            fontSize: '13px',
                            lineHeight: '1.6',
                            background: 'transparent',
                            padding: '16px',
                            color: '#ffffff',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'normal',
                            overflowWrap: 'anywhere',
                        }}
                        codeTagProps={{
                            style: {
                                color: '#ffffff',
                                whiteSpace: 'inherit',
                                wordBreak: 'inherit',
                                overflowWrap: 'inherit',
                            }
                        }}
                        PreTag={({ children, ...props }: any) => <pre {...props} style={{ ...props.style, color: '#ffffff', maxWidth: '100%', whiteSpace: 'pre-wrap', wordBreak: 'normal', overflowWrap: 'normal' }}>{children}</pre>}
                        wrapLongLines={true}
                        wrapLines={true}
                        showLineNumbers={true}
                        lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1.2em', color: codeLineNumberColor, textAlign: 'right', fontSize: '11px' }}
                        lineProps={() => ({
                            style: {
                                display: 'block',
                                width: '100%',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'normal',
                                overflowWrap: 'anywhere',
                            }
                        })}
                    >
                        {code}
                    </SyntaxHighlighter>
                </div>
            </div>
        );
    };

    const handleWhatToSay = async () => {
        if (isProcessing || chatSubmissionInProgress.current) return;
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('what_to_say');

        // Capture and clear attached image context.
        // Also merge in any screenshot from the capture-and-process shortcut that
        // arrived via pendingCaptureRef before the React state flush (React 18 fix).
        const pending = pendingCaptureRef.current;
        let currentAttachments = attachedContextRef.current;
        if (pending && !currentAttachments.some(s => s.path === pending.path)) {
            currentAttachments = [...currentAttachments, pending].slice(-5);
        }

        if (currentAttachments.length > 0) {
            setAttachedContext([]);
            appendLocalMeetingEvent({
                type: 'prompt',
                text: 'Screenshot attached',
                hasScreenshot: true,
            }, localMeetingIdRef.current);
        }

        try {
            const screenshotInstruction = currentAttachments.length > 0
                ? [
                    'The screenshot is not just visual context. Read any visible text, question, instruction, code, or error first.',
                    'If a question is visible in the screenshot, answer it directly. Do not describe the editor/window unless that helps the answer.',
                    'If the screenshot shows a coding problem, partial code, or error, solve/debug it directly with reasoning, code/fix, and complexity when relevant.',
                    'If rolling transcript text is provided, answering it is required. If it relates to the screenshot, combine them; if it is unrelated, answer both separately.',
                ].join('\n')
                : '';
            const liveTranscriptForScreenshot = getLatestRollingTranscript() || undefined;
            const flow = getAiSubmitFlow(
                currentAttachments.length > 0,
                false,
                Boolean(liveTranscriptForScreenshot)
            );
            const whatToSayInstructions = combineInstructions(
                buildAiBehaviorInstruction(currentAttachments.length > 0 ? 'screenshot' : 'rolling'),
                screenshotInstruction,
                buildQuickActionInstruction('whatToAnswer')
            );
            debugAiSubmitFlow(flow, {
                rollingTranscript: liveTranscriptForScreenshot,
                effectivePrompt: liveTranscriptForScreenshot || 'What should I answer?',
                attachmentCount: currentAttachments.length,
                context: whatToSayInstructions,
                modelRoute: currentAttachments.length > 0
                    ? 'Gemini gemini-2.5-flash-lite via Firebase screenshot route'
                    : 'DeepSeek deepseek-v4-flash via Firebase text route',
            });

            // Pass imagePath if attached
            await window.electronAPI.generateWhatToSay(
                currentAttachments.length > 0 ? liveTranscriptForScreenshot : undefined,
                currentAttachments.length > 0 ? currentAttachments.map(s => s.path) : undefined,
                whatToSayInstructions
            );
        } catch (err) {
            setMessages(prev => [...prev, {
                id: createMessageId(),
                role: 'system',
                text: `Error: ${err}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleQuickActionPrompt = async (action: QuickActionConfig) => {
        if (isProcessing || chatSubmissionInProgress.current) return;
        const timingTrace = createAiTimingTrace();
        activeAiTimingRef.current = timingTrace;
        requestStartTimeRef.current = timingTrace.submitStartedAt;
        logAiTiming(timingTrace, 'submit_start', { source: 'quick_action' });
        timingTrace.ragDoneAt = Date.now();
        logAiTiming(timingTrace, 'rag_done', { skipped: true });

        const defaultAction = DEFAULT_QUICK_ACTIONS.find(item => item.id === action.id);
        const labelChanged = action.label.trim() !== defaultAction?.label;
        const instructionChanged = action.instruction.trim() !== defaultAction?.instruction;
        const promptText = labelChanged
            ? action.label.trim()
            : (action.instruction.trim() || action.label);
        const extraBehavior = instructionChanged ? action.instruction.trim() : '';

        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted(`quick_action_${action.id.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}`);

        const pending = pendingCaptureRef.current;
        let currentAttachments = attachedContextRef.current;
        if (pending && !currentAttachments.some(s => s.path === pending.path)) {
            currentAttachments = [...currentAttachments, pending].slice(-5);
        }

        if (currentAttachments.length > 0) {
            setAttachedContext([]);
        }

        appendLocalMeetingEvent({
            type: 'prompt',
            text: action.label,
            hasScreenshot: currentAttachments.length > 0,
        }, localMeetingIdRef.current);

        streamingResponseTextRef.current = '';
        setMessages(prev => [...prev, {
            id: createMessageId(),
            role: 'system',
            text: '',
            isStreaming: true,
        }]);

        try {
            const scenarioBehavior = buildAiBehaviorInstruction(currentAttachments.length > 0 ? 'screenshot' : 'typed');
            const quickActionPrompt = [
                `The user clicked a saved quick-action prompt named "${action.label}".`,
                `Treat this quick action as the user's current prompt: ${promptText}`,
                extraBehavior ? `Additional quick-action behavior: ${extraBehavior}` : '',
                'Answer using the most recent relevant context from the rolling transcript and chat history.',
                'If this is a follow-up like "give example", "explain more", or "make it shorter", apply it to the latest user question and assistant answer.',
                currentAttachments.length > 0 ? 'Read visible screenshot text first. If it contains a question, instruction, coding problem, code task, or error, answer/solve/debug it directly. Combine related rolling transcript context with the screenshot; if unrelated, answer both. Do not say no errors are visible unless asked.' : '',
            ].filter(Boolean).join('\n');

            const rollingPrompt = getLatestRollingTranscript();
            const requestContext = buildLiveCopilotContext(combineInstructions(scenarioBehavior, quickActionPrompt));
            debugAiSubmitFlow(
                getAiSubmitFlow(currentAttachments.length > 0, true, Boolean(rollingPrompt)),
                {
                    typedPrompt: promptText,
                    rollingTranscript: rollingPrompt,
                    effectivePrompt: promptText,
                    attachmentCount: currentAttachments.length,
                    context: requestContext,
                    modelRoute: currentAttachments.length > 0
                        ? 'Gemini gemini-2.5-flash-lite via Firebase screenshot route'
                        : 'DeepSeek deepseek-v4-flash via Firebase text route',
                }
            );
            await window.electronAPI.streamGeminiChat(
                promptText,
                currentAttachments.length > 0 ? currentAttachments.map(s => s.path) : undefined,
                requestContext,
                { skipSystemPrompt: true, ignoreKnowledgeMode: true, timingTrace }
            );
        } catch (err) {
            setIsProcessing(false);
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.isStreaming && last.text === '') {
                    return prev.slice(0, -1).concat({
                        id: createMessageId(),
                        role: 'system',
                        text: `Error starting quick action: ${err}`,
                    });
                }
                return [...prev, {
                    id: createMessageId(),
                    role: 'system',
                    text: `Error: ${err}`,
                }];
            });
        }
    };

    const handleFollowUp = async (intent: string = 'rephrase') => {
        if (isProcessing || chatSubmissionInProgress.current) return;
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('follow_up_' + intent);

        try {
            await window.electronAPI.generateFollowUp(intent);
        } catch (err) {
            setMessages(prev => [...prev, {
                id: createMessageId(),
                role: 'system',
                text: `Error: ${err}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRecap = async () => {
        if (isProcessing || chatSubmissionInProgress.current) return;
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('recap');

        try {
            await window.electronAPI.generateRecap();
        } catch (err) {
            setMessages(prev => [...prev, {
                id: createMessageId(),
                role: 'system',
                text: `Error: ${err}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFollowUpQuestions = async () => {
        if (isProcessing || chatSubmissionInProgress.current) return;
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('suggest_questions');

        try {
            await window.electronAPI.generateFollowUpQuestions(buildQuickActionInstruction('followUpQuestions'));
        } catch (err) {
            setMessages(prev => [...prev, {
                id: createMessageId(),
                role: 'system',
                text: `Error: ${err}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClarify = async () => {
        if (isProcessing || chatSubmissionInProgress.current) return;
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('clarify');

        try {
            await window.electronAPI.generateClarify(buildQuickActionInstruction('clarify'));
        } catch (err) {
            setMessages(prev => [...prev, {
                id: createMessageId(),
                role: 'system',
                text: `Error: ${err}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCodeHint = async () => {
        if (isProcessing || chatSubmissionInProgress.current) return;
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('code_hint');

        const currentAttachments = attachedContextRef.current;
        if (currentAttachments.length > 0) {
            setAttachedContext([]);
            // Show the attached image in chat
            setMessages(prev => [...prev, {
                id: createMessageId(),
                role: 'user',
                text: 'Give me a code hint for this',
                hasScreenshot: true,
                screenshotPreview: currentAttachments[0].preview
            }]);
        	// Scroll to bottom when user sends message
        	setTimeout(() => {
        		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        	}, 50);
        }

        try {
            await window.electronAPI.generateCodeHint(currentAttachments.length > 0 ? currentAttachments.map(s => s.path) : undefined);
        } catch (err) {
            setMessages(prev => [...prev, {
                id: createMessageId(),
                role: 'system',
                text: `Error: ${err}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBrainstorm = async () => {
        if (isProcessing || chatSubmissionInProgress.current) return;
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('brainstorm');

        const currentAttachments = attachedContextRef.current;
        if (currentAttachments.length > 0) {
            setAttachedContext([]);
            // Show the attached image in chat
            setMessages(prev => [...prev, {
                id: createMessageId(),
                role: 'user',
                text: 'Brainstorm with this context',
                hasScreenshot: true,
                screenshotPreview: currentAttachments[0].preview
            }]);
        	// Scroll to bottom when user sends message
        	setTimeout(() => {
        		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        	}, 50);
        }

        try {
            await window.electronAPI.generateBrainstorm(
                currentAttachments.length > 0 ? currentAttachments.map(s => s.path) : undefined,
                undefined,
                buildQuickActionInstruction('brainstorm')
            );
        } catch (err) {
            setMessages(prev => [...prev, {
                id: createMessageId(),
                role: 'system',
                text: `Error: ${err}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };


    // Setup Streaming Listeners
    useEffect(() => {
        const cleanups: (() => void)[] = [];

        // Stream Token
        cleanups.push(window.electronAPI.onGeminiStreamToken((token) => {
            const timingTrace = activeAiTimingRef.current;
            if (timingTrace && !timingTrace.clientFirstTokenAt) {
                timingTrace.clientFirstTokenAt = Date.now();
                logAiTiming(timingTrace, 'client_first_token');
            }
            streamingResponseTextRef.current += token;
            // Guard: if this token is the negotiation coaching JSON sentinel, accumulate it
            // silently. The JSON is always emitted as a single complete `yield JSON.stringify(...)`
            // call, so one parse attempt is sufficient. The onGeminiStreamDone handler will
            // detect the accumulated JSON and render the proper card UI â€” we just prevent the
            // raw JSON characters from ever appearing in the chat bubble.
            try {
                const parsed = JSON.parse(token);
                if (parsed?.__negotiationCoaching) {
                    // Store the raw JSON text (Done handler needs it) but don't show it.
                    setMessages(prev => {
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg && lastMsg.isStreaming && lastMsg.role === 'system') {
                            const updated = [...prev];
                            updated[prev.length - 1] = { ...lastMsg, text: token };
                            return updated;
                        }
                        return prev;
                    });
                    return; // Skip the normal append below
                }
            } catch {
                // Not JSON â€” normal text token, fall through to the standard append.
            }

            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.role === 'system') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: lastMsg.text + token,
                        // re-check code status on every token? Expensive but needed for progressive highlighting
                        isCode: (lastMsg.text + token).includes('```') || (lastMsg.text + token).includes('def ') || (lastMsg.text + token).includes('function ')
                    };
                    return updated;
                }
                return prev;
            });
        }));

        // Stream Done
        cleanups.push(window.electronAPI.onGeminiStreamDone(() => {
            chatSubmissionInProgress.current = false;
            const timingTrace = activeAiTimingRef.current;
            if (timingTrace) {
                logAiTiming(timingTrace, 'stream_done', { componentStage: 'client' });
                activeAiTimingRef.current = null;
            }
            setIsProcessing(false);

            // Calculate latency if we have a start time
            let latency = 0;
            if (requestStartTimeRef.current) {
                latency = Date.now() - requestStartTimeRef.current;
                requestStartTimeRef.current = null;
            }

            // Track Usage
            analytics.trackModelUsed({
                model_name: currentModel,
                provider_type: detectProviderType(currentModel),
                latency_ms: latency
            });

            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.role === 'system') {
                    // Detect negotiation coaching response
                    try {
                        const parsed = JSON.parse(lastMsg.text);
                        if (parsed?.__negotiationCoaching) {
                            const coaching = parsed.__negotiationCoaching;
                            return [...prev.slice(0, -1), {
                                ...lastMsg,
                                isStreaming: false,
                                isNegotiationCoaching: true,
                                negotiationCoachingData: coaching,
                                text: '',
                            }];
                        }
                    } catch {}
                    // Normal completion
                    return [...prev.slice(0, -1), { ...lastMsg, isStreaming: false }];
                }
                return prev;
            });
            const completedText = streamingResponseTextRef.current.trim();
            if (completedText) {
                try {
                    appendLocalMeetingEvent({
                        type: 'response',
                        text: completedText,
                    }, localMeetingIdRef.current);
                } catch (error) {
                    console.warn('[NativelyInterface] Failed to save LLM response locally:', error);
                }
            }
            streamingResponseTextRef.current = '';
        }));

        // Stream Error
        cleanups.push(window.electronAPI.onGeminiStreamError((error) => {
            chatSubmissionInProgress.current = false;
            setIsProcessing(false);
            requestStartTimeRef.current = null; // Clear timer on error
            const errorText = formatAssistantError(error);
            setMessages(prev => {
                // Append error to the current message or add new one?
                // Let's add a new error block if the previous one confusing,
                // or just update status.
                // Ideally we want to show the partial response AND the error.
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming) {
                    const updated = [...prev];
                    const messageText = errorText === FREE_PLAN_LIMIT_REACHED_MESSAGE
                        ? errorText
                        : lastMsg.text + `\n\n[Error: ${errorText}]`;
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        isStreaming: false,
                        text: messageText
                    };
                    appendLocalMeetingEvent({
                        type: 'response',
                        text: messageText,
                    }, localMeetingIdRef.current);
                    streamingResponseTextRef.current = '';
                    return updated;
                }
                return [...prev, {
                    id: createMessageId(),
                    role: 'system',
                    text: errorText === FREE_PLAN_LIMIT_REACHED_MESSAGE
                        ? errorText
                        : `âŒ Error: ${errorText}`
                }];
            });
        }));

        // JIT RAG Stream listeners (for live meeting RAG responses)
        if (window.electronAPI.onRAGStreamChunk) {
            cleanups.push(window.electronAPI.onRAGStreamChunk((data: { chunk: string }) => {
                const timingTrace = activeAiTimingRef.current;
                if (timingTrace && !timingTrace.clientFirstTokenAt) {
                    timingTrace.clientFirstTokenAt = Date.now();
                    logAiTiming(timingTrace, 'client_first_token', { route: 'rag' });
                }
                // Same guard as onGeminiStreamToken: suppress raw JSON if this chunk is
                // the negotiation coaching sentinel. The onRAGStreamComplete handler will
                // convert it to the proper card UI.
                try {
                    const parsed = JSON.parse(data.chunk);
                    if (parsed?.__negotiationCoaching) {
                        setMessages(prev => {
                            const lastMsg = prev[prev.length - 1];
                            if (lastMsg && lastMsg.isStreaming && lastMsg.role === 'system') {
                                const updated = [...prev];
                                updated[prev.length - 1] = { ...lastMsg, text: data.chunk };
                                return updated;
                            }
                            return prev;
                        });
                        return; // Skip normal append
                    }
                } catch {
                    // Normal text chunk â€” fall through.
                }

                streamingResponseTextRef.current += data.chunk;
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.isStreaming && lastMsg.role === 'system') {
                        const updated = [...prev];
                        updated[prev.length - 1] = {
                            ...lastMsg,
                            text: lastMsg.text + data.chunk,
                            isCode: (lastMsg.text + data.chunk).includes('```')
                        };
                        return updated;
                    }
                    return prev;
                });
            }));
        }

        if (window.electronAPI.onRAGStreamComplete) {
            cleanups.push(window.electronAPI.onRAGStreamComplete(() => {
                const timingTrace = activeAiTimingRef.current;
                if (timingTrace) {
                    logAiTiming(timingTrace, 'stream_done', {
                        componentStage: 'client',
                        route: 'rag',
                    });
                    activeAiTimingRef.current = null;
                }
                setIsProcessing(false);
                requestStartTimeRef.current = null;
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.isStreaming && lastMsg.role === 'system') {
                        // Detect negotiation coaching response
                        try {
                            const parsed = JSON.parse(lastMsg.text);
                            if (parsed?.__negotiationCoaching) {
                                const coaching = parsed.__negotiationCoaching;
                                return [...prev.slice(0, -1), {
                                    ...lastMsg,
                                    isStreaming: false,
                                    isNegotiationCoaching: true,
                                    negotiationCoachingData: coaching,
                                    text: '',
                                }];
                            }
                        } catch {}
                        // Normal completion
                        return [...prev.slice(0, -1), { ...lastMsg, isStreaming: false }];
                    }
                    if (lastMsg && lastMsg.isStreaming) {
                        const updated = [...prev];
                        updated[prev.length - 1] = { ...lastMsg, isStreaming: false };
                        return updated;
                    }
                    return prev;
                });
                const completedText = streamingResponseTextRef.current.trim();
                if (completedText) {
                    try {
                        appendLocalMeetingEvent({
                            type: 'response',
                            text: completedText,
                        }, localMeetingIdRef.current);
                    } catch (error) {
                        console.warn('[NativelyInterface] Failed to save RAG response locally:', error);
                    }
                }
                streamingResponseTextRef.current = '';
            }));
        }

        if (window.electronAPI.onRAGStreamError) {
            cleanups.push(window.electronAPI.onRAGStreamError((data: { error: string }) => {
                setIsProcessing(false);
                requestStartTimeRef.current = null;
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.isStreaming) {
                        const updated = [...prev];
                        const errorText = lastMsg.text + `\n\n[RAG Error: ${data.error}]`;
                        updated[prev.length - 1] = {
                            ...lastMsg,
                            isStreaming: false,
                            text: errorText
                        };
                        appendLocalMeetingEvent({
                            type: 'response',
                            text: errorText,
                        }, localMeetingIdRef.current);
                        streamingResponseTextRef.current = '';
                        return updated;
                    }
                    return prev;
                });
            }));
        }

        return () => cleanups.forEach(fn => fn());
    }, [currentModel]); // Ensure tracking captures correct model


    const handleAnswerNow = async () => {
        if (isManualRecording) {
            // Stop recording and move captured speech into the input box.
            // The response is generated only when the user sends explicitly.
            isRecordingRef.current = false;  // Update ref immediately
            setIsManualRecording(false);
            setManualTranscript('');  // Clear live preview

            // Finalize first, then give the provider a tiny moment to emit its last final turn.
            await window.electronAPI.finalizeMicSTT().catch(err => console.error('[NativelyInterface] Failed to send finalizeMicSTT:', err));
            await new Promise(resolve => window.setTimeout(resolve, 250));

            const question = (voiceInputRef.current + (manualTranscriptRef.current ? ' ' + manualTranscriptRef.current : '')).trim();
            setVoiceInput('');
            voiceInputRef.current = '';
            setManualTranscript('');
            manualTranscriptRef.current = '';
            window.electronAPI.stopMicSTT?.().catch(err => console.error('[NativelyInterface] Failed to stop mic STT:', err));

            if (question) {
                setInputValue(prev => [prev.trim(), question].filter(Boolean).join(prev.trim() ? ' ' : ''));
                setTimeout(() => textInputRef.current?.focus(), 0);
            }
            return;

            /*
            if (!question && currentAttachments.length === 0) {
                // No voice input and no image â€” show real STT error if available
                if (sttUserStatus === 'failed' && sttUserError) {
                    setMessages(prev => [...prev, {
                        id: createMessageId(),
                        role: 'system',
                        text: `âŒ STT Error: ${sttUserError}`
                    }]);
                } else if (sttUserStatus === 'reconnecting') {
                    setMessages(prev => [...prev, {
                        id: createMessageId(),
                        role: 'system',
                        text: 'â³ STT is reconnecting, try again in a moment.'
                    }]);
                } else {
                    setMessages(prev => [...prev, {
                        id: createMessageId(),
                        role: 'system',
                        text: 'âš ï¸ No speech detected. Try speaking closer to your microphone.'
                    }]);
                }
                return;
            }

            // Show user's spoken question
            appendLocalMeetingEvent({
                type: 'prompt',
                text: question || (currentAttachments.length > 0 ? 'Screenshot attached' : ''),
                hasScreenshot: currentAttachments.length > 0,
            }, localMeetingIdRef.current);
            setMessages(prev => [...prev, {
                id: createMessageId(),
                role: 'user',
                text: question,
                hasScreenshot: currentAttachments.length > 0,
                screenshotPreview: currentAttachments[0]?.preview
            }]);
            
            // Scroll to bottom when user sends message
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 50);

            // Add placeholder for streaming response
            streamingResponseTextRef.current = '';
            setMessages(prev => [...prev, {
                id: createMessageId(),
                role: 'system',
                text: '',
                isStreaming: true
            }]);

            setIsProcessing(true);

            try {
                let prompt = '';
                const scenarioBehavior = combineInstructions(
                    buildAiBehaviorInstruction(currentAttachments.length > 0 ? 'screenshot' : 'typed'),
                    buildQuickActionInstruction('answer')
                );

                if (currentAttachments.length > 0) {
                    // Image + Voice Context
                    prompt = `You are a technical copilot. The user has provided a screenshot and a spoken question/command.
User said: "${question}"

Instructions:
1. If the screenshot contains a visible question or prompt, answer that question directly.
2. If the screenshot shows a coding problem, algorithm prompt, LeetCode-style task, compiler/runtime error, or partially written code, solve/debug it directly.
3. For coding problems: give the approach, working code in the detected language, and time/space complexity.
4. Combine the screenshot with live audio context when both are present. If the transcript suggests a method/constraint, use it in the solution.
5. If screenshot and live audio are unrelated, answer both separately.
6. Never say "there are no errors/issues visible" unless the user specifically asks for debugging or error checking.
7. Only describe the screen when there is no visible question, task, code problem, or error to answer.

${buildLiveCopilotContext(scenarioBehavior)}`;
                } else {
                    // JIT RAG pre-flight: try to use indexed meeting context first
                    const ragResult = shouldQueryLiveRag(question)
                        ? await window.electronAPI.ragQueryLive?.(question)
                        : undefined;
                    if (ragResult?.success) {
                        // JIT RAG handled it â€” response streamed via rag:stream-chunk events
                        return;
                    }

                    // Voice Only (Smart Extract) â€” fallback
                    prompt = `You are a real-time technical copilot. The user just asked a live or typed question.
Instructions:
1. Answer the latest explicit request directly.
2. If the request is a follow-up, use recent transcript/chat context.
3. If it is a new topic, ignore older topic context.
4. For technical questions, explain what/how with medium detail and include code or examples when asked.
5. Do NOT include phrases like "The question is..." - just give the answer directly.

${buildLiveCopilotContext(scenarioBehavior)}`;
                }

                // Call Streaming API: message = question, context = instructions
                requestStartTimeRef.current = Date.now();
                await window.electronAPI.streamGeminiChat(question, currentAttachments.length > 0 ? currentAttachments.map(s => s.path) : undefined, prompt, { skipSystemPrompt: true, ignoreKnowledgeMode: true });

            } catch (err) {
                // Initial invocation failing (e.g. IPC error before stream starts)
                setIsProcessing(false);
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    // If we just added the empty streaming placeholder, remove it or fill it with error
                    if (last && last.isStreaming && last.text === '') {
                        return prev.slice(0, -1).concat({
                            id: createMessageId(),
                            role: 'system',
                            text: `âŒ Error starting stream: ${err}`
                        });
                    }
                    return [...prev, {
                        id: createMessageId(),
                        role: 'system',
                        text: `âŒ Error: ${err}`
                    }];
                });
            }
            */
        } else {
            // Start recording - reset voice input state
            const micStart = await window.electronAPI.startMicSTT?.();
            if (micStart && !micStart.success) {
                setMessages(prev => [...prev, {
                    id: createMessageId(),
                    role: 'system',
                    text: `Mic STT error: ${micStart.error || 'Failed to start microphone transcription'}`
                }]);
                return;
            }
            setVoiceInput('');
            voiceInputRef.current = '';
            setManualTranscript('');
            isRecordingRef.current = true;  // Update ref immediately
            setIsManualRecording(true);


            // Ensure native audio is connected
            try {
                // Native audio is now managed by main process
                // await window.electronAPI.invoke('native-audio-connect');
            } catch (err) {
                // Already connected, that's fine
            }
        }
    };

    const handleManualSubmit = async () => {
        if (chatSubmissionInProgress.current || isProcessing) return;
        const rollingPrompt = getLatestRollingTranscript();
        const pending = pendingCaptureRef.current;
        let currentAttachments = attachedContextRef.current;
        if (pending && !currentAttachments.some(s => s.path === pending.path)) {
            currentAttachments = [...currentAttachments, pending].slice(-5);
        }
        if (!inputValue.trim() && currentAttachments.length === 0 && !rollingPrompt) return;
        chatSubmissionInProgress.current = true;
        const requestId = createMessageId();

        const timingTrace = createAiTimingTrace();
        activeAiTimingRef.current = timingTrace;
        requestStartTimeRef.current = timingTrace.submitStartedAt;
        logAiTiming(timingTrace, 'submit_start', {
            source: 'manual_submit',
            hasScreenshot: currentAttachments.length > 0,
        });

        const userText = inputValue.trim();
        const hasScreenshot = currentAttachments.length > 0;
        const effectivePrompt = hasScreenshot
            ? [
                'You are answering one combined screenshot request.',
                rollingPrompt
                    ? [
                        'MANDATORY OUTPUT FORMAT:',
                        '1. Rolling Transcript Answer',
                        '2. Screenshot Answer',
                        'If both are about the same topic, still include both sections and connect them into one useful answer.',
                        'If they are different topics, answer both separately. Do not skip the rolling transcript.',
                        'The answer is incomplete if it only answers the screenshot.',
                    ].join('\n')
                    : [
                        'MANDATORY OUTPUT FORMAT:',
                        'Screenshot Answer',
                    ].join('\n'),
                userText ? `Typed prompt from user:\n${userText}` : '',
                rollingPrompt ? `Rolling transcript to answer:\n${rollingPrompt}` : '',
                [
                    'Screenshot to answer:',
                    'Read the attached screenshot. If it contains a visible question, answer it directly.',
                    'If it shows a coding problem, partial code, or error, solve/debug it with reasoning and code when useful.',
                ].join('\n'),
            ].filter(Boolean).join('\n\n')
            : (userText || rollingPrompt);
        const visiblePromptText = userText
            || rollingPrompt
            || (currentAttachments.length > 0 ? '' : effectivePrompt);

        // Clear inputs immediately
        setInputValue('');
        setAttachedContext([]);

        appendLocalMeetingEvent({
            type: 'prompt',
            text: effectivePrompt || (currentAttachments.length > 0 ? 'Screenshot attached' : ''),
            hasScreenshot: currentAttachments.length > 0,
        }, localMeetingIdRef.current);
        if (userText || hasScreenshot) {
            setMessages(prev => [...prev, {
                id: requestId,
                requestId,
                role: 'user',
                text: visiblePromptText || 'Screenshot attached',
                hasScreenshot,
                screenshotPreview: currentAttachments[0]?.preview
            }]);

            // Scroll to bottom when user sends message
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
        }

        // Add placeholder for streaming response
        streamingResponseTextRef.current = '';
        setMessages(prev => [...prev, {
            id: createMessageId(),
            requestId,
            role: 'system',
            text: '',
            isStreaming: true
        }]);

        setIsExpanded(true);
        setIsProcessing(true);

        try {
            // JIT RAG pre-flight: try to use indexed meeting context first
            if (currentAttachments.length === 0 && shouldQueryLiveRag(effectivePrompt)) {
                const ragResult = await window.electronAPI.ragQueryLive?.(effectivePrompt);
                timingTrace.ragDoneAt = Date.now();
                logAiTiming(timingTrace, 'rag_done', {
                    attempted: true,
                    handled: Boolean(ragResult?.success),
                    fallback: Boolean(ragResult?.fallback),
                });
                if (ragResult?.success) {
                    // JIT RAG handled it â€” response streamed via rag:stream-chunk events
                    return;
                }
            } else {
                timingTrace.ragDoneAt = Date.now();
                logAiTiming(timingTrace, 'rag_done', {
                    skipped: true,
                    reason: currentAttachments.length > 0 ? 'screenshot' : 'not_contextual',
                });
            }

            // Pass imagePath if attached, AND conversation context
            const scenarioBehavior = buildAiBehaviorInstruction(hasScreenshot ? 'screenshot' : 'typed');
            const screenshotInstruction = hasScreenshot
                ? [
                    'Follow the mandatory output format from the user message.',
                    'When a rolling transcript is included, answer it even if the screenshot has a separate question.',
                    'Use the screenshot model vision for image understanding, but treat the rolling transcript as an equal request.',
                    'For coding problems, include approach, working code, and time/space complexity when enough details are visible.',
                ].join('\n')
                : '';
            const requestContext = hasScreenshot
                ? [scenarioBehavior, screenshotInstruction].filter(Boolean).join('\n')
                : buildLiveCopilotContext([scenarioBehavior, screenshotInstruction].filter(Boolean).join('\n'));
            debugAiSubmitFlow(
                getAiSubmitFlow(hasScreenshot, Boolean(userText), Boolean(rollingPrompt)),
                {
                    typedPrompt: userText,
                    rollingTranscript: rollingPrompt,
                    effectivePrompt,
                    attachmentCount: currentAttachments.length,
                    context: requestContext,
                    modelRoute: hasScreenshot
                        ? 'Gemini gemini-2.5-flash-lite via Firebase screenshot route'
                        : 'DeepSeek deepseek-v4-flash via Firebase text route',
                }
            );
            await window.electronAPI.streamGeminiChat(
                effectivePrompt,
                hasScreenshot ? currentAttachments.map(s => s.path) : undefined,
                requestContext,
                { skipSystemPrompt: true, ignoreKnowledgeMode: true, timingTrace }
            );
        } catch (err) {
            setIsProcessing(false);
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.isStreaming && last.text === '') {
                    // remove the empty placeholder
                    return prev.slice(0, -1).concat({
                        id: createMessageId(),
                        role: 'system',
                        text: `âŒ Error starting stream: ${err}`
                    });
                }
                return [...prev, {
                    id: createMessageId(),
                    role: 'system',
                    text: `âŒ Error: ${err}`
                }];
            });
        } finally {
            chatSubmissionInProgress.current = false;
        }
    };

    const handleAnswerShortcut = () => {
        if (isManualRecording) {
            void handleAnswerNow();
            return;
        }

        if (inputValue.trim() || attachedContextRef.current.length > 0) {
            void handleManualSubmit();
            return;
        }

        void handleAnswerNow();
    };

    const clearChat = () => {
        setMessages([]);
        setConversationContext('');
    };

    const handleResponseResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const startY = event.clientY;
        const startHeight = responsePanelHeight;
        let latestHeight = startHeight;

        const clampHeight = (height: number) => Math.min(Math.max(height, 260), 620);
        const handlePointerMove = (moveEvent: PointerEvent) => {
            latestHeight = clampHeight(startHeight + moveEvent.clientY - startY);
            setResponsePanelHeight(latestHeight);
        };
        const handlePointerUp = () => {
            localStorage.setItem('cluegent_response_panel_height', String(latestHeight));
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };




    const renderMessageText = (msg: Message) => {
        // Negotiation coaching card takes priority
        if (msg.isNegotiationCoaching && msg.negotiationCoachingData) {
            return (
                <NegotiationCoachingCard
                    {...msg.negotiationCoachingData}
                    phase={msg.negotiationCoachingData.phase as any}
                    onSilenceTimerEnd={() => {
                        setMessages(prev => prev.map(m =>
                            m.id === msg.id
                                ? { ...m, negotiationCoachingData: m.negotiationCoachingData ? { ...m.negotiationCoachingData, showSilenceTimer: false } : undefined }
                                : m
                        ));
                    }}
                />
            );
        }

        if (msg.role === 'user' && msg.hasScreenshot && !msg.text.trim()) {
            return null;
        }

        // Code-containing messages get special styling
        // We split by code blocks to keep the "Code Solution" UI intact for the code parts
        // But use ReactMarkdown for the text parts around it
        if (msg.isCode || (msg.role === 'system' && msg.text.includes('```'))) {
            const parts = msg.text.split(/(```[\s\S]*?```)/g);
            return (
                <div className={`w-full min-w-0 rounded-lg p-3 my-1 border ${subtleSurfaceClass}`} style={appearance.subtleStyle}>
                    <div className="flex items-center gap-2 mb-2 font-semibold text-xs uppercase tracking-wide text-white">
                        <Code className="w-3.5 h-3.5" />
                        <span>Code Solution</span>
                    </div>
                    <div className="w-full min-w-0 space-y-2 text-[13px] leading-relaxed text-white">
                        {parts.map((part, i) => {
                            if (part.startsWith('```')) {
                                const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
                                if (match) {
                                    const lang = match[1] || 'python';
                                    const code = match[2].trim();
                                    return renderCodeBlock(code, lang, `${msg.id}-code-${i}`);
                                }
                            }
                            // Regular text - Render with Markdown
                            return (
                                <div key={i} className="markdown-content w-full min-w-0">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            p: ({ node, ...props }: any) => <p className="mb-1 last:mb-0 whitespace-pre-wrap" {...props} />,
                                            strong: ({ node, ...props }: any) => <strong className="font-bold text-white" {...props} />,
                                            em: ({ node, ...props }: any) => <em className="italic text-white" {...props} />,
                                            ul: ({ node, ...props }: any) => <ul className={compactUnorderedListClass} {...props} />,
                                            ol: ({ node, ...props }: any) => <ol className={compactOrderedListClass} {...props} />,
                                            li: ({ node, ...props }: any) => <li className={compactListItemClass} {...props} />,
                                            h1: ({ node, ...props }: any) => <h1 className="text-lg font-bold mb-1 mt-2 text-white" {...props} />,
                                            h2: ({ node, ...props }: any) => <h2 className="text-base font-bold mb-1 mt-2 text-white" {...props} />,
                                            h3: ({ node, ...props }: any) => <h3 className="text-sm font-bold mb-1 mt-1.5 text-white" {...props} />,
                                            code: ({ node, ...props }: any) => <code className="overlay-inline-code-surface rounded px-1 py-0.5 text-xs font-mono whitespace-pre-wrap text-white" {...props} />,
                                            blockquote: ({ node, ...props }: any) => <blockquote className="border-l-2 border-white/40 pl-3 italic my-2 text-white" {...props} />,
                                            a: ({ node, ...props }: any) => <a className="text-white underline hover:opacity-80" target="_blank" rel="noopener noreferrer" {...props} />,
                                        }}
                                    >
                                        {normalizeMarkdownLists(part)}
                                    </ReactMarkdown>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // Custom Styled Labels (Shorten, Recap, Follow-up) - also use Markdown for content
        if (msg.intent === 'shorten') {
            return (
                <div className={`w-full min-w-0 rounded-lg p-3 my-1 border ${subtleSurfaceClass}`} style={appearance.subtleStyle}>
                    <div className="flex items-center gap-2 mb-2 font-semibold text-xs uppercase tracking-wide text-white">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Shortened</span>
                    </div>
                    <div className="text-[13px] leading-relaxed markdown-content text-white">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                            p: ({ node, ...props }: any) => <p className="mb-1 last:mb-0" {...props} />,
                            strong: ({ node, ...props }: any) => <strong className="font-bold text-white" {...props} />,
                            ul: ({ node, ...props }: any) => <ul className={compactUnorderedListClass} {...props} />,
                            ol: ({ node, ...props }: any) => <ol className={compactOrderedListClass} {...props} />,
                            li: ({ node, ...props }: any) => <li className={compactListItemClass} {...props} />,
                        }}>
                            {normalizeMarkdownLists(msg.text)}
                        </ReactMarkdown>
                    </div>
                </div>
            );
        }

        if (msg.intent === 'recap') {
            return (
                <div className={`w-full min-w-0 rounded-lg p-3 my-1 border ${subtleSurfaceClass}`} style={appearance.subtleStyle}>
                    <div className="flex items-center gap-2 mb-2 font-semibold text-xs uppercase tracking-wide text-white">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Recap</span>
                    </div>
                    <div className="text-[13px] leading-relaxed markdown-content text-white">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                            p: ({ node, ...props }: any) => <p className="mb-1 last:mb-0" {...props} />,
                            strong: ({ node, ...props }: any) => <strong className="font-bold text-white" {...props} />,
                            ul: ({ node, ...props }: any) => <ul className={compactUnorderedListClass} {...props} />,
                            ol: ({ node, ...props }: any) => <ol className={compactOrderedListClass} {...props} />,
                            li: ({ node, ...props }: any) => <li className={compactListItemClass} {...props} />,
                        }}>
                            {normalizeMarkdownLists(msg.text)}
                        </ReactMarkdown>
                    </div>
                </div>
            );
        }

        if (msg.intent === 'follow_up_questions') {
            return (
                <div className={`w-full min-w-0 rounded-lg p-3 my-1 border ${subtleSurfaceClass}`} style={appearance.subtleStyle}>
                    <div className="flex items-center gap-2 mb-2 font-semibold text-xs uppercase tracking-wide text-white">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Follow-Up Questions</span>
                    </div>
                    <div className="text-[13px] leading-relaxed markdown-content text-white">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                            p: ({ node, ...props }: any) => <p className="mb-1 last:mb-0" {...props} />,
                            strong: ({ node, ...props }: any) => <strong className="font-bold text-white" {...props} />,
                            ul: ({ node, ...props }: any) => <ul className={compactUnorderedListClass} {...props} />,
                            ol: ({ node, ...props }: any) => <ol className={compactOrderedListClass} {...props} />,
                            li: ({ node, ...props }: any) => <li className={compactListItemClass} {...props} />,
                        }}>
                            {normalizeMarkdownLists(msg.text)}
                        </ReactMarkdown>
                    </div>
                </div>
            );
        }

        if (msg.intent === 'what_to_answer') {
            // Split text by code blocks (Handle unclosed blocks at EOF)
            const parts = msg.text.split(/(```[\s\S]*?(?:```|$))/g);

            return (
                <div className={`w-full min-w-0 rounded-lg p-3 my-1 border ${subtleSurfaceClass}`} style={appearance.subtleStyle}>
                    <div className="flex items-center gap-2 mb-2 text-white font-semibold text-xs uppercase tracking-wide">
                        <span>Say this</span>
                    </div>
                    <div className="w-full min-w-0 text-[14px] leading-relaxed text-white">
                        {parts.map((part, i) => {
                            if (part.startsWith('```')) {
                                // Robust matching: handles unclosed blocks for streaming (```...$)
                                const match = part.match(/```(\w*)\s+([\s\S]*?)(?:```|$)/);

                                // Fallback logic: if it starts with ticks, treat as code (even if unclosed)
                                if (match || part.startsWith('```')) {
                                    const lang = (match && match[1]) ? match[1] : 'python';
                                    let code = '';

                                    if (match && match[2]) {
                                        code = match[2].trim();
                                    } else {
                                        // Manual strip if regex failed
                                        code = part.replace(/^```\w*\s*/, '').replace(/```$/, '').trim();
                                    }

                                    return renderCodeBlock(code, lang, `${msg.id}-answer-code-${i}`);
                                }
                            }
                            // Regular text - Render Markdown
                            return (
                                <div key={i} className="markdown-content w-full min-w-0">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            p: ({ node, ...props }: any) => <p className="mb-1 last:mb-0" {...props} />,
                                            strong: ({ node, ...props }: any) => <strong className="font-bold text-white" {...props} />,
                                            em: ({ node, ...props }: any) => <em className="italic text-white" {...props} />,
                                            ul: ({ node, ...props }: any) => <ul className={compactUnorderedListClass} {...props} />,
                                            ol: ({ node, ...props }: any) => <ol className={compactOrderedListClass} {...props} />,
                                            li: ({ node, ...props }: any) => <li className={compactListItemClass} {...props} />,
                                        }}
                                    >
                                        {normalizeMarkdownLists(part)}
                                    </ReactMarkdown>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // Standard Text Messages (e.g. from User or Interviewer)
        // We still want basic markdown support here too
        return (
            <div className="markdown-content w-full min-w-0">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                        p: ({ node, ...props }: any) => <p className="mb-1 last:mb-0 whitespace-pre-wrap" {...props} />,
                        strong: ({ node, ...props }: any) => <strong className="font-bold opacity-100 text-white" {...props} />,
                        em: ({ node, ...props }: any) => <em className="italic opacity-90 text-white" {...props} />,
                        ul: ({ node, ...props }: any) => <ul className={compactUnorderedListClass} {...props} />,
                        ol: ({ node, ...props }: any) => <ol className={compactOrderedListClass} {...props} />,
                        li: ({ node, ...props }: any) => <li className={compactListItemClass} {...props} />,
                        code: ({ node, ...props }: any) => <code className="overlay-inline-code-surface rounded px-1 py-0.5 text-xs font-mono text-white" {...props} />,
                        a: ({ node, ...props }: any) => <a className="text-white underline hover:opacity-80" target="_blank" rel="noopener noreferrer" {...props} />,
                    }}
                >
                    {normalizeMarkdownLists(msg.text)}
                </ReactMarkdown>
            </div>
        );
    };

    const getReportableAiResponse = (msg: Message) => {
        if (msg.negotiationCoachingData) {
            return [
                msg.negotiationCoachingData.tacticalNote,
                msg.negotiationCoachingData.exactScript,
            ].filter(Boolean).join('\n\n');
        }
        return msg.text;
    };


    // We use a ref to hold the latest handlers to avoid re-binding the event listener on every render
    const handlersRef = useRef({
        handleWhatToSay,
        handleFollowUp,
        handleFollowUpQuestions,
        handleRecap,
        handleAnswerNow,
        handleAnswerShortcut,
        handleClarify,
        handleCodeHint,
        handleBrainstorm
    });

    // Update ref on every render so the event listener always access latest state/props
    handlersRef.current = {
        handleWhatToSay,
        handleFollowUp,
        handleFollowUpQuestions,
        handleRecap,
        handleAnswerNow,
        handleAnswerShortcut,
        handleClarify,
        handleCodeHint,
        handleBrainstorm
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const { handleWhatToSay, handleFollowUp, handleFollowUpQuestions, handleRecap, handleAnswerShortcut, handleClarify, handleCodeHint, handleBrainstorm } = handlersRef.current;

            // Chat Shortcuts (Scope: Local to Chat/Overlay usually, but we allow them here if focused)
            if (isShortcutPressed(e, 'whatToAnswer')) {
                e.preventDefault();
                handleWhatToSay();
            } else if (isShortcutPressed(e, 'clarify')) {
                e.preventDefault();
                handleClarify();
            } else if (isShortcutPressed(e, 'followUp')) {
                e.preventDefault();
                handleFollowUpQuestions();
            } else if (isShortcutPressed(e, 'dynamicAction4')) {
                e.preventDefault();
                if (actionButtonMode === 'brainstorm') {
                    handleBrainstorm();
                } else {
                    handleRecap();
                }
            } else if (isShortcutPressed(e, 'answer')) {
                e.preventDefault();
                handleAnswerShortcut();
            } else if (isShortcutPressed(e, 'clearTranscript')) {
                e.preventDefault();
                clearRollingTranscript();
            } else if (isShortcutPressed(e, 'clarify')) {
                e.preventDefault();
                handleClarify();
            } else if (isShortcutPressed(e, 'codeHint')) {
                e.preventDefault();
                handleCodeHint();
            } else if (isShortcutPressed(e, 'brainstorm')) {
                e.preventDefault();
                handleBrainstorm();
            } else if (isShortcutPressed(e, 'scrollUp')) {
                e.preventDefault();
                scrollContainerRef.current?.scrollBy({ top: -100, behavior: 'smooth' });
            } else if (isShortcutPressed(e, 'scrollDown')) {
                e.preventDefault();
                scrollContainerRef.current?.scrollBy({ top: 100, behavior: 'smooth' });
            } else if (isShortcutPressed(e, 'moveWindowUp') || isShortcutPressed(e, 'moveWindowDown')) {
                // Prevent default scrolling when moving window
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isShortcutPressed]);

    // General Global Shortcuts (Rebindable)
    // We listen here to handle them when the window is focused (renderer side)
    // Global shortcuts (when window blurred) are handled by Main process -> GlobalShortcuts
    // But Main process events might not reach here if we don't listen, or we want unified handling.
    // Actually, KeybindManager registers global shortcuts. If they are registered as global, 
    // Electron might consume them before they reach here?
    // 'toggle-app' is Global.
    // 'toggle-visibility' is NOT Global in default config (isGlobal: false), so it depends on focus.
    // So we MUST listen for them here.

    const generalHandlersRef = useRef({
        toggleVisibility: () => window.electronAPI.toggleWindow(),
        processScreenshots: () => {
            if (inputValue.trim() || attachedContextRef.current.length > 0) {
                void handleManualSubmit();
                return;
            }

            void handleWhatToSay();
        },
        resetCancel: async () => {
            if (isProcessing) {
                setIsProcessing(false);
            } else {
                await window.electronAPI.resetIntelligence();
                setMessages([]);
                setAttachedContext([]);
                setInputValue('');
                setConversationContext('');
                clearRollingTranscript();
            }
        },
        clearTranscript: () => {
            clearRollingTranscript();
        },
        toggleMousePassthrough: () => {
            const newState = !isMousePassthrough;
            setIsMousePassthrough(newState);
            window.electronAPI?.setOverlayMousePassthrough?.(newState);
        },
        takeScreenshot: async () => {
            try {
                const data = await window.electronAPI.takeScreenshot();
                if (data && data.path) {
                    handleScreenshotAttach(data as { path: string; preview: string });
                }
            } catch (err) {
                console.error("Error triggering screenshot:", err);
                reportScreenshotError(err);
            }
        },
        selectiveScreenshot: async () => {
            try {
                const data = await window.electronAPI.takeSelectiveScreenshot();
                if (data && !data.cancelled && data.path) {
                    handleScreenshotAttach(data as { path: string; preview: string });
                }
            } catch (err) {
                console.error("Error triggering selective screenshot:", err);
            }
        }
    });

    // Update ref
    generalHandlersRef.current = {
        toggleVisibility: () => window.electronAPI.toggleWindow(),
        processScreenshots: () => {
            if (inputValue.trim() || attachedContextRef.current.length > 0) {
                void handleManualSubmit();
                return;
            }

            void handleWhatToSay();
        },
        resetCancel: async () => {
            if (isProcessing) {
                setIsProcessing(false);
            } else {
                await window.electronAPI.resetIntelligence();
                setMessages([]);
                setAttachedContext([]);
                setInputValue('');
                setConversationContext('');
                clearRollingTranscript();
            }
        },
        clearTranscript: () => {
            clearRollingTranscript();
        },
        toggleMousePassthrough: () => {
            const newState = !isMousePassthrough;
            setIsMousePassthrough(newState);
            window.electronAPI?.setOverlayMousePassthrough?.(newState);
        },
        takeScreenshot: async () => {
            try {
                const data = await window.electronAPI.takeScreenshot();
                if (data && data.path) {
                    handleScreenshotAttach(data as { path: string; preview: string });
                }
            } catch (err) {
                console.error("Error triggering screenshot:", err);
                reportScreenshotError(err);
            }
        },
        selectiveScreenshot: async () => {
            try {
                const data = await window.electronAPI.takeSelectiveScreenshot();
                if (data && !data.cancelled && data.path) {
                    handleScreenshotAttach(data as { path: string; preview: string });
                }
            } catch (err) {
                console.error("Error triggering selective screenshot:", err);
            }
        }
    };

    useEffect(() => {
        const handleGeneralKeyDown = (e: KeyboardEvent) => {
            const handlers = generalHandlersRef.current;
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            if (isShortcutPressed(e, 'toggleVisibility')) {
                // Always allow toggling visibility
                e.preventDefault();
                handlers.toggleVisibility();
            } else if (isShortcutPressed(e, 'processScreenshots')) {
                if (!isInput) {
                    e.preventDefault();
                    handlers.processScreenshots();
                }
                // If input focused, let default behavior (Enter) happen or handle it via onKeyDown in Input
            } else if (isShortcutPressed(e, 'resetCancel')) {
                e.preventDefault();
                handlers.resetCancel();
            } else if (isShortcutPressed(e, 'clearTranscript')) {
                e.preventDefault();
                handlers.clearTranscript();
            } else if (isShortcutPressed(e, 'takeScreenshot')) {
                e.preventDefault();
                handlers.takeScreenshot();
            } else if (isShortcutPressed(e, 'selectiveScreenshot')) {
                e.preventDefault();
                handlers.selectiveScreenshot();
            } else if (isShortcutPressed(e, 'toggleMousePassthrough')) {
                e.preventDefault();
                handlers.toggleMousePassthrough();
            }
        };

        window.addEventListener('keydown', handleGeneralKeyDown);
        return () => window.removeEventListener('keydown', handleGeneralKeyDown);
    }, [isShortcutPressed]);

    // Global "Capture & Process" shortcut handler (issue #90)
    // Registered separately so it always has the latest handlersRef via stable ref access.
    // Main process takes the screenshot and sends "capture-and-process" with path+preview;
    // we attach the screenshot to context and immediately trigger AI analysis.
    useEffect(() => {
        if (!window.electronAPI.onCaptureAndProcess) return;
        const unsubscribe = window.electronAPI.onCaptureAndProcess((data) => {
            setIsExpanded(true);

            // Store screenshot in a stable ref BEFORE updating React state.
            // This fixes the React 18 concurrent mode timing race where setTimeout(0)
            // could fire before setAttachedContext had flushed, leaving handleWhatToSay
            // with an empty attachedContext and causing silent failures.
            pendingCaptureRef.current = data;


            // Use requestAnimationFrame so we wait for at least one paint cycle â€”
            // more reliable than setTimeout(0) under React 18 concurrent scheduling.
            // The ref guarantees handleWhatToSay has the screenshot regardless of
            // whether the state update has flushed yet.
            requestAnimationFrame(() => {
                void (async () => {
                    try {
                        await handlersRef.current.handleWhatToSay();
                    } finally {
                        pendingCaptureRef.current = null;
                    }
                })();
            });
        });
        return unsubscribe;
    }, []);

    // Stealth Global Shortcuts Handler
    // Listens for shortcuts triggered when the app is in the background
    useEffect(() => {
        if (!window.electronAPI.onGlobalShortcut) return;
        const unsubscribe = window.electronAPI.onGlobalShortcut(({ action }) => {
            const handlers = handlersRef.current;
            const generalHandlers = generalHandlersRef.current;

            isStealthRef.current = true;

            if (action === 'whatToAnswer') handlers.handleWhatToSay();
            else if (action === 'shorten') handlers.handleFollowUp('shorten');
            else if (action === 'followUp') handlers.handleFollowUpQuestions();
            else if (action === 'recap') handlers.handleRecap();
            else if (action === 'dynamicAction4') {
                if (actionButtonMode === 'brainstorm') handlers.handleBrainstorm();
                else handlers.handleRecap();
            }
            else if (action === 'answer') handlers.handleAnswerShortcut();
            else if (action === 'clearTranscript') generalHandlers.clearTranscript();
            else if (action === 'clarify') handlers.handleClarify();
            else if (action === 'codeHint') handlers.handleCodeHint();
            else if (action === 'brainstorm') handlers.handleBrainstorm();
            else if (action === 'scrollUp') scrollContainerRef.current?.scrollBy({ top: -100, behavior: 'smooth' });
            else if (action === 'scrollDown') scrollContainerRef.current?.scrollBy({ top: 100, behavior: 'smooth' });
            else if (action === 'processScreenshots') generalHandlers.processScreenshots();
            else if (action === 'resetCancel') generalHandlers.resetCancel();
            else if (action === 'takeScreenshot') generalHandlers.takeScreenshot();
            else if (action === 'selectiveScreenshot') generalHandlers.selectiveScreenshot();
            
            // Safety reset if it didn't trigger an expansion
            setTimeout(() => { isStealthRef.current = false; }, 500);
        });
        return unsubscribe;
    }, []);

    // â”€â”€ Derived STT status for the rolling transcript indicator (interviewer channel) â”€â”€
    const interviewerSttIndicatorStatus = sttInterviewerStatus;
    // Strip consecutive error count from display â€” show only in expanded diagnostics
    const interviewerSttIndicatorError = sttInterviewerError?.replace(/\s*\(\d+ consecutive errors\):?/gi, '');

    const copyDiagnostics = async () => {
        const version = import.meta.env.VITE_APP_VERSION || 'unknown';
        const [arch, osVersion] = await Promise.all([
            window.electronAPI?.getArch?.().catch(() => 'unknown'),
            window.electronAPI?.getOsVersion?.().catch(() => 'unknown'),
        ]);
        const { categorizeSttError } = await import('../lib/sttErrorMapper');
        const userCat = sttUserError ? categorizeSttError(sttUserError) : null;
        const interviewerCat = sttInterviewerError ? categorizeSttError(sttInterviewerError) : null;
        const report = [
            '## STT Diagnostic Report',
            `App Version: ${version}`,
            `Platform: ${osVersion} (${arch})`,
            `---`,
            `Microphone Provider: ${sttUserProvider}`,
            `Microphone Status: ${sttUserStatus}`,
            userCat ? `Microphone Category: ${userCat.title} [${userCat.category}]` : '',
            `Microphone Error: ${sttUserError || 'N/A'}`,
            `---`,
            `System Audio Provider: ${sttInterviewerProvider}`,
            `System Audio Status: ${sttInterviewerStatus}`,
            interviewerCat ? `System Audio Category: ${interviewerCat.title} [${interviewerCat.category}]` : '',
            `System Audio Error: ${sttInterviewerError || 'N/A'}`,
            `Timestamp: ${new Date().toISOString()}`,
        ].filter(Boolean).join('\n');
        try {
            await navigator.clipboard.writeText(report);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = report;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    };

    const handleQuitMeeting = () => {
        finishCurrentLocalMeeting();
        if (onEndMeeting) {
            onEndMeeting();
            return;
        }
        window.electronAPI.quitApp();
    };

    const handleToggleListeningSource = async (source: 'system' | 'mic') => {
        if (sourceBusy || isManualRecording) return;
        const key = source === 'system' ? 'systemEnabled' : 'micEnabled';
        const enabled = !listeningSources[key];
        setSourceError('');
        if (!isListening) {
            setListeningSources(current => ({ ...current, [key]: enabled }));
            return;
        }
        setSourceBusy(true);
        try {
            const result = await window.electronAPI.setListeningSource(source, enabled);
            if (!result.success) throw new Error(result.error || 'Could not change audio source.');
            setListeningSources(current => ({ ...current, [key]: enabled }));
        } catch (error) {
            setSourceError(error instanceof Error ? error.message : 'Could not change audio source.');
        } finally { setSourceBusy(false); }
    };

    const handleToggleListening = async () => {
        try {
            if (isListening) {
                clearRollingTranscript();
                setIsListening(false);
                isListeningRef.current = false;
                listeningStartedAtRef.current = null;
                setListeningSeconds(0);
                await window.electronAPI.stopListening();
                return;
            }

            if (isFreePlanExhausted) {
                await window.electronAPI?.openSettingsTab?.('billing');
                return;
            }

            if (isPaidListeningExhausted) {
                setSttInterviewerStatus('failed');
                setSttInterviewerError('You have reached your plan limit. Limits will reset every month.');
                return;
            }

            clearRollingTranscript();
            // Listening state is broadcast after native capture confirms startup.
            setListeningSeconds(0);
            setSttInterviewerStatus('reconnecting');
            setSttInterviewerError('');
            setSttUserStatus('reconnecting');
            setSttUserError('');
            const inputDeviceId = localStorage.getItem('preferredInputDeviceId');
            let outputDeviceId = localStorage.getItem('preferredOutputDeviceId');
            const shouldUseScreenCaptureKit =
                window.electronAPI?.platform === 'darwin' ||
                localStorage.getItem('useExperimentalSckBackend') === 'true';
            if (shouldUseScreenCaptureKit) {
                outputDeviceId = 'sck';
            }

            const result = await window.electronAPI.startListening({
                audio: { inputDeviceId, outputDeviceId },
                sources: listeningSources
            });
            if (!result?.success) {
                setIsListening(false);
                isListeningRef.current = false;
                listeningStartedAtRef.current = null;
                setListeningSeconds(0);
                setSttInterviewerStatus('failed');
                setSttInterviewerError(result?.error || 'Listening failed to start.');
                setSttUserStatus('failed');
                setSttUserError(result?.error || 'Listening failed to start.');
            }
        } catch (error) {
            setIsListening(false);
            isListeningRef.current = false;
            listeningStartedAtRef.current = null;
            setListeningSeconds(0);
            setSttInterviewerStatus('failed');
            setSttInterviewerError(error instanceof Error ? error.message : 'Failed to toggle listening');
            setSttUserStatus('failed');
            setSttUserError(error instanceof Error ? error.message : 'Failed to toggle listening');
        }
    };

    const clearRollingTranscript = () => {
        setLiveTranscriptTurns([]);
        setRollingTranscript('');
        setIsInterviewerSpeaking(false);
        rollingTranscriptRef.current = '';
        finalizedRollingTranscriptRef.current = '';
        setUserRollingTranscript('');
        setIsUserSpeaking(false);
        userRollingTranscriptRef.current = '';
        finalizedUserRollingTranscriptRef.current = '';
    };

    useEffect(() => {
        if (
            planStatus?.plan !== 'free' ||
            freeTrialRemainingSeconds === null ||
            freeTrialRemainingSeconds > 0 ||
            freeTrialLimitOpenedRef.current
        ) {
            return;
        }

        freeTrialLimitOpenedRef.current = true;
        clearRollingTranscript();
        if (isListening) {
            setIsListening(false);
            isListeningRef.current = false;
            listeningStartedAtRef.current = null;
            setListeningSeconds(0);
            void window.electronAPI.stopListening();
        }
        setSttInterviewerStatus('failed');
        setSttInterviewerError('Free trial limit reached. Subscribe to continue using Cluegent.');
        void refreshProfile();
        void window.electronAPI?.openSettingsTab?.('billing');
    }, [freeTrialRemainingSeconds, isListening, planStatus?.plan, refreshProfile]);

    const handleOptionsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (isSettingsOpen) {
            window.electronAPI.toggleSettingsWindow();
            return;
        }

        const buttonRect = event.currentTarget.getBoundingClientRect();
        const POPUP_WIDTH = 270;
        const GAP = 8;
        const x = window.screenX + Math.max(8, buttonRect.right - POPUP_WIDTH);
        const y = window.screenY + buttonRect.bottom + GAP;

        window.electronAPI.toggleSettingsWindow({ x, y });
    };

    const handleToolbarAnswer = () => {
        if (isProcessing || chatSubmissionInProgress.current) return;
        if (inputValue.trim() || attachedContextRef.current.length > 0) {
            void handleManualSubmit();
            return;
        }

        void handleWhatToSay();
    };

    const handleToolbarScreenshot = async () => {
        if (isProcessing || directScreenshotInProgress.current) return;
        directScreenshotInProgress.current = true;
        try {
            const data = await window.electronAPI.takeScreenshot();
            if (!data?.path) throw new Error('Screenshot capture did not return an image.');
            pendingCaptureRef.current = data;
            await handlersRef.current.handleWhatToSay();
        } catch (error) {
            reportScreenshotError(error);
        } finally {
            pendingCaptureRef.current = null;
            directScreenshotInProgress.current = false;
        }
    };

    const handleToolbarChat = () => {
        setIsExpanded(true);
        requestAnimationFrame(() => textInputRef.current?.focus());
    };
    const hasPendingManualSubmit = inputValue.trim().length > 0 || attachedContext.length > 0;

    return (
        <div ref={contentRef} className="flex flex-col items-center w-[1180px] max-w-none mx-auto h-fit min-h-0 bg-transparent p-0 rounded-[24px] font-sans gap-2 overlay-text-primary">
            <TopPill
                expanded={isExpanded}
                onToggle={() => setIsExpanded(!isExpanded)}
                onQuit={handleQuitMeeting}
                appearance={appearance}
                onLogoClick={() => window.electronAPI?.setWindowMode?.('launcher')}
                isListening={isListening}
                listeningDuration={listeningDuration}
                trialRemainingLabel={
                    freeTrialRemainingSeconds !== null
                        ? `${formatDuration(freeTrialRemainingSeconds)} left`
                        : hourlyRemainingSeconds !== null ? `${formatDuration(hourlyRemainingSeconds)} left` : undefined
                }
                onToggleListening={handleToggleListening}
                sources={listeningSources}
                sourceBusy={sourceBusy || isManualRecording}
                onToggleSource={handleToggleListeningSource}
                onAnswer={handleToolbarAnswer}
                onScreenshot={handleToolbarScreenshot}
                onChat={handleToolbarChat}
                answerShortcut={shortcuts.processScreenshots}
                screenshotShortcut={shortcuts.captureAndProcess}
                isOptionsOpen={isSettingsOpen}
                onOptionsClick={handleOptionsClick}
            />

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="flex flex-col items-center gap-2 w-full"
                    >
                        <div
                            data-overlay-interactive
                            className={`cluegent-overlay-shell relative w-[600px] max-w-none backdrop-blur-2xl border rounded-[24px] overflow-hidden flex flex-col draggable-area overlay-shell-surface ${overlayPanelClass}`}
                            style={{ ...appearance.shellStyle, width: responsePanelWidth + 24 }}
                        >



                            {/* System Audio Permission Warning Banner */}
                            {systemAudioWarning && (
                                <div className="flex items-center justify-between mx-4 mt-3 mb-1 px-3.5 py-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-[12px] shadow-sm relative no-drag group/warning">
                                    <div className="flex flex-col gap-1 pr-3">
                                        <div className="flex items-center gap-2 text-[12.5px] text-yellow-600 dark:text-yellow-400/90 font-medium leading-tight">
                                            <div className="shrink-0 p-1 bg-yellow-500/20 rounded-full">
                                                <svg className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            <span>Screen Recording Permission Denied</span>
                                        </div>
                                        <p className="text-[11px] text-yellow-600/70 dark:text-yellow-400/60 leading-snug pl-[26px]">
                                            {systemAudioWarning}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button 
                                            onClick={() => { window.electronAPI.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'); }}
                                            className="px-3 py-1.5 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-700 dark:text-yellow-500 text-[11px] font-semibold transition-all active:scale-95 border border-yellow-500/20 shadow-sm"
                                        >
                                            Open Settings
                                        </button>
                                        <button 
                                            onClick={() => setSystemAudioWarning(null)}
                                            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-yellow-600/50 hover:text-yellow-700 dark:text-yellow-500/50 dark:hover:text-yellow-400 transition-colors absolute top-1 right-1 opacity-0 group-hover/warning:opacity-100"
                                            title="Dismiss"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PR #173: STT Not Configured Warning Banner */}
                            {sttNotConfigured && (
                                <div className="flex items-center justify-between mx-4 mt-3 mb-1 px-3.5 py-2.5 bg-orange-500/10 border border-orange-500/20 rounded-[12px] shadow-sm relative no-drag group/stt-warning">
                                    <div className="flex flex-col gap-1 pr-3">
                                        <div className="flex items-center gap-2 text-[12.5px] text-orange-600 dark:text-orange-400/90 font-medium leading-tight">
                                            <div className="shrink-0 p-1 bg-orange-500/20 rounded-full">
                                                <svg className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                                </svg>
                                            </div>
                                            <span>Transcription Not Configured</span>
                                        </div>
                                        <p className="text-[11px] text-orange-600/70 dark:text-orange-400/60 leading-snug pl-[26px]">
                                            No STT provider selected. Open Settings â†’ Audio to pick one.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => { window.electronAPI?.toggleSettingsWindow?.(); }}
                                            className="px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-700 dark:text-orange-500 text-[11px] font-semibold transition-all active:scale-95 border border-orange-500/20 shadow-sm"
                                        >
                                            Open Settings
                                        </button>
                                        <button
                                            onClick={() => setSttNotConfigured(false)}
                                            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-orange-600/50 hover:text-orange-700 dark:text-orange-500/50 dark:hover:text-orange-400 transition-colors absolute top-1 right-1 opacity-0 group-hover/stt-warning:opacity-100"
                                            title="Dismiss"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Rolling Transcript Bar â€” includes STT status indicator inline */}
                            {isListening ? (
                                <RollingTranscript
                                    text={showTranscript ? combinedRollingTranscript : ''}
                                    isActive={listeningSources.systemEnabled || listeningSources.micEnabled}
                                    sourceError={sourceError}
                                    surfaceStyle={showTranscript ? appearance.transcriptStyle : undefined}
                                    interviewerChannel={{
                                        status: listeningSources.systemEnabled ? interviewerSttIndicatorStatus : 'connected',
                                        error: interviewerSttIndicatorError,
                                        provider: sttInterviewerProvider,
                                    }}
                                    microphoneChannel={{
                                        status: listeningSources.micEnabled ? sttUserStatus : 'connected',
                                        error: sttUserError,
                                        provider: sttUserProvider,
                                    }}
                                    onCopyDiagnostics={copyDiagnostics}
                                    onClearTranscript={clearRollingTranscript}
                                />
                            ) : null}

                            {/* Chat History - Only show if there are messages OR active states */}
                            {(messages.length > 0 || isManualRecording || isProcessing) && (
                                <ResizableResponsePanel height={responsePanelHeight} onWidthChange={setResponsePanelWidth} opacity={responseOpacity}>
                                    <div className="absolute left-3 right-3 top-2 z-10 flex items-center justify-between gap-2">
                                        <div className="flex shrink-0 items-center gap-1">
                                            <button type="button" aria-label="Previous response" title="Previous response" disabled={responsePageIndex <= 0} onClick={() => setSelectedResponsePage(responsePageIndex - 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-25"><svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m15 6-6 6 6 6"/></svg></button>
                                            <button type="button" aria-label="Next response" title="Next response" disabled={responsePageIndex >= responsePages.length - 1} onClick={() => setSelectedResponsePage(responsePageIndex + 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-25"><svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m9 6 6 6-6 6"/></svg></button>
                                            <span className="text-[10px] font-mono text-white/50">{responsePages.length ? `${responsePageIndex + 1}/${responsePages.length}` : '0/0'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="flex items-center gap-1.5 text-[9px] uppercase text-white/60">Opacity<input aria-label="Response opacity" type="range" min="20" max="100" step="5" value={Math.round(responseOpacity * 100)} onChange={event => {
                                                const opacity = Number(event.target.value) / 100;
                                                setResponseOpacity(opacity);
                                                localStorage.setItem('cluegent_response_opacity', String(opacity));
                                            }} className="w-16 accent-white"/><span className="w-7 font-mono">{Math.round(responseOpacity * 100)}%</span></label>
                                        {messages.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={clearChat}
                                                className="pointer-events-auto rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:bg-white/[0.14] hover:text-white active:scale-95"
                                                title="Clear response chat"
                                            >
                                                Clear chat
                                            </button>
                                        )}
                                        </div>
                                    </div>
                                <div ref={scrollContainerRef} className="h-full overflow-y-auto p-4 pt-11 pb-6 space-y-3 no-drag" style={{ scrollbarWidth: 'none' }}>
                                    {visibleResponseMessages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                                            <div className={`
                      ${msg.role === 'user' ? 'max-w-[72.25%] px-[13.6px] py-[10.2px]' : 'w-full max-w-full px-4 py-3'} text-[14px] leading-relaxed relative group whitespace-pre-wrap min-w-0
                      ${msg.role === 'user'
                                                    ? 'bg-blue-500/20 backdrop-blur-md border border-blue-300/25 text-white rounded-[20px] rounded-tr-[4px] shadow-sm font-medium'
                                                    : ''
                                                }
                      ${msg.role === 'system'
                                                    ? 'cluegent-response-card rounded-[22px] px-5 py-4 text-[16px] font-medium leading-7 text-white'
                                                    : ''
                                                }
                      ${msg.role === 'interviewer'
                                                    ? 'overlay-text-muted italic pl-0 text-[13px]'
                                                    : ''
                                                }
                    `}>
                                                {msg.role === 'interviewer' && (
                                                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-medium uppercase tracking-wider overlay-text-muted">
                                                        Interviewer
                                                        {msg.isStreaming && <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />}
                                                    </div>
                                                )}
                                                {msg.role === 'user' && msg.hasScreenshot && (
                                                    <div className={`flex items-center gap-1 text-[10px] opacity-70 mb-1 border-b pb-1 ${isLightTheme ? 'border-black/10' : 'border-white/10'}`}>
                                                        <Image className="w-2.5 h-2.5" />
                                                <span>Screenshot attached</span>
                                                    </div>
                                                )}
                                                {msg.role === 'user' && msg.screenshotPreview && (
                                                    <img
                                                        src={msg.screenshotPreview}
                                                        alt="Attached screenshot preview"
                                                        className={`mb-2 max-h-28 w-auto max-w-full rounded-lg border object-contain ${isLightTheme ? 'border-black/15' : 'border-white/15'}`}
                                                        draggable="false"
                                                    />
                                                )}
                                                {msg.role === 'system' && !msg.isStreaming && (
                                                    <button
                                                        onClick={() => handleCopy(msg.text)}
                                                        className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity overlay-icon-surface overlay-icon-surface-hover overlay-text-interactive"
                                                        title="Copy to clipboard"
                                                        style={appearance.iconStyle}
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {renderMessageText(msg)}
                                                {msg.role === 'system' && !msg.isStreaming && (
                                                    <div className="mt-2 flex justify-end">
                                                        <ReportAiContentButton
                                                            source="Live overlay response"
                                                            response={getReportableAiResponse(msg)}
                                                            meetingId={localMeetingIdRef.current}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Active Recording State with Live Transcription */}
                                    {isManualRecording && (
                                        <div className="flex flex-col items-end gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            {/* Live transcription preview */}
                                            {(manualTranscript || voiceInput) && (
                                                <div className="max-w-[85%] px-3.5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-[18px] rounded-tr-[4px]">
                                                    <span className="text-[13px] text-emerald-300">
                                                        {voiceInput}{voiceInput && manualTranscript ? ' ' : ''}{manualTranscript}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="px-3 py-2 flex gap-1.5 items-center">
                                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                <span className="text-[10px] text-emerald-400/70 ml-1">Listening...</span>
                                            </div>
                                        </div>
                                    )}

                                    {isProcessing && (
                                        <div className="flex justify-start">
                                            <div className="px-3 py-2 flex gap-1.5">
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                                    <div
                                        onPointerDown={handleResponseResizeStart}
                                        className="absolute inset-x-0 bottom-0 z-20 flex h-5 cursor-ns-resize items-end justify-center bg-gradient-to-t from-black/18 to-transparent pb-1"
                                        title="Drag to resize responses"
                                    >
                                        <span className="h-1 w-12 rounded-full bg-white/18 transition group-hover:bg-white/30" />
                                    </div>
                                </ResizableResponsePanel>
                            )}

                            {isFreePlanExhausted && !isSyncing && (
                                <div className="mx-4 mb-2 rounded-[16px] border border-violet-500/20 bg-violet-500/10 px-4 py-3 no-drag">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-violet-300">
                                                Free Plan Limit Reached
                                            </p>
                                            <p className="mt-1 text-[12px] leading-5 text-violet-100/85">
                                                Your free trial includes 12 minutes of Cluegent usage. Subscribe to keep using live answers, chat, and screenshot analysis.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => void window.electronAPI?.openSettingsTab?.('billing')}
                                            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-[12px] font-semibold text-black transition hover:bg-violet-400"
                                        >
                                            Subscribe
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isPaidListeningExhausted && !isSyncing && (
                                <div className="mx-4 mb-2 rounded-[16px] border border-amber-400/25 bg-amber-400/10 px-4 py-3 no-drag">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                                                {isHourlyPlan ? 'Hours exhausted' : 'Listening Limit Reached'}
                                            </p>
                                            <p className="mt-1 text-[12px] leading-5 text-white/85">
                                                {isHourlyPlan
                                                    ? 'Your listening hours are used up. Buy another hourly pack or switch to a monthly plan to continue listening.'
                                                    : 'Your monthly listening allowance is used up. Open Billing to view your plan or upgrade.'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => void window.electronAPI?.openSettingsTab?.('billing')}
                                            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-[12px] font-semibold text-black transition hover:bg-amber-200"
                                        >
                                            {isHourlyPlan ? 'Buy hours or upgrade' : 'View Plan'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Quick Actions - Minimal & Clean */}
                            {showQuickActionButtons && (
                            <div className={`flex flex-nowrap justify-start items-center gap-1.5 px-4 pb-3 overflow-x-auto ${isListening && combinedRollingTranscript && showTranscript ? 'pt-1' : 'pt-3'}`} style={{ scrollbarWidth: 'none' }}>
                                {allQuickActions.map((action) => (
                                    <button
                                        key={action.id}
                                        onClick={() => handleQuickActionPrompt(action)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all active:scale-95 duration-200 interaction-base interaction-press whitespace-nowrap shrink-0 ${quickActionClass}`}
                                        style={appearance.chipStyle}
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                            )}

                            {/* Input Area */}
                            <div className={`p-3 ${showQuickActionButtons ? 'pt-0' : 'pt-3'}`}>
                                {/* Latent Context Preview (Attached Screenshot) */}
                                {attachedContext.length > 0 && (
                                    <div className={`mb-2 rounded-lg border p-1.5 transition-all duration-200 ${subtleSurfaceClass}`} style={appearance.subtleStyle}>
                                        <div className="mb-1 flex items-center justify-between">
                                            <span className="text-[11px] font-medium overlay-text-primary">
                                                {attachedContext.length} screenshot{attachedContext.length > 1 ? 's' : ''} attached
                                            </span>
                                            <button
                                                onClick={() => setAttachedContext([])}
                                                className="p-1 rounded-full transition-colors overlay-icon-surface overlay-icon-surface-hover overlay-text-interactive"
                                                title="Remove all"
                                                style={appearance.iconStyle}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="flex max-w-full gap-1.5 overflow-x-auto pb-0.5">
                                            {attachedContext.map((ctx, idx) => (
                                                <div key={ctx.path} className="relative group/thumb flex-shrink-0">
                                                    <img
                                                        src={ctx.preview}
                                                        alt={`Screenshot ${idx + 1}`}
                                                        className={`h-7 w-auto rounded border object-contain ${isLightTheme ? 'border-black/15' : 'border-white/20'}`}
                                                    />
                                                    <button
                                                        onClick={() => setAttachedContext(prev => prev.filter((_, i) => i !== idx))}
                                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                                                        title="Remove"
                                                    >
                                                        <X className="w-2.5 h-2.5 text-white" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-[10px] overlay-text-muted">Ask a question or click Mic</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <div className="relative group flex-1 min-w-0">
                                    <input
                                        ref={textInputRef}
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}

                                        className={`w-full border focus:ring-1 rounded-xl pl-3 pr-3 py-2.5 focus:outline-none transition-all duration-200 ease-sculpted text-[13px] leading-relaxed ${inputClass}`}
                                        style={appearance.inputStyle}
                                    />

                                    {/* Custom Rich Placeholder */}
                                    {false && !inputValue && (
                                        <div className="absolute inset-y-0 left-3 right-3 flex items-center gap-1.5 pointer-events-none text-[13px] overlay-text-muted overflow-hidden whitespace-nowrap">
                                            <span className="shrink-0">Ask anything...</span>
                                            <div className="flex items-center gap-1 opacity-80">
                                                {(shortcuts.selectiveScreenshot || ['âŒ˜', 'Shift', 'H']).map((key, i) => (
                                                    <React.Fragment key={i}>
                                                        {i > 0 && <span className="text-[10px]">+</span>}
                                                        <kbd className="px-1.5 py-0.5 rounded border text-[10px] font-sans min-w-[20px] text-center overlay-control-surface overlay-text-secondary" style={appearance.controlStyle}>{key}</kbd>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                            <span>for selective screenshot</span>
                                        </div>
                                    )}

                                    {false && !inputValue && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none opacity-20">
                                            <span className="text-[10px]">â†µ</span>
                                        </div>
                                    )}
                                    {!inputValue && (
                                        <div className="absolute inset-y-0 left-3 right-3 flex items-center gap-1.5 pointer-events-none text-[13px] overlay-text-muted overflow-hidden whitespace-nowrap">
                                            <span className="shrink-0">Ask anything...</span>
                                            {/* <span className="opacity-45 shrink-0">â€¢</span> */}
                                            <div className="flex items-center gap-1 opacity-80 shrink-0">
                                                {(shortcuts.processScreenshots || ['âŒ˜', 'Enter']).map((key, i) => (
                                                    <React.Fragment key={`submit-${i}`}>
                                                        {i > 0 && <span className="text-[10px]">+</span>}
                                                        <kbd className="px-1.5 py-0.5 rounded border text-[10px] font-sans min-w-[20px] text-center overlay-control-surface overlay-text-secondary" style={appearance.controlStyle}>{key}</kbd>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                            <span className="shrink-0">to submit</span>
                                            {/* <span className="opacity-45 shrink-0">â€¢</span> */}
                                            <div className="flex items-center gap-1 opacity-80 shrink-0">
                                                {(shortcuts.captureAndProcess || ['⌘', '⇧', 'Enter']).map((key, i) => (
                                                    <React.Fragment key={`shot-${i}`}>
                                                        {i > 0 && <span className="text-[10px]">+</span>}
                                                        <kbd className="px-1.5 py-0.5 rounded border text-[10px] font-sans min-w-[20px] text-center overlay-control-surface overlay-text-secondary" style={appearance.controlStyle}>{key}</kbd>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                            <span className="shrink-0">for screenshot</span>
                                        </div>
                                    )}
                                </div>

                                {/* Submit Row */}
                                <div className="flex items-center shrink-0 px-0.5">
                                    <button
                                        onClick={handleManualSubmit}
                                        disabled={!hasPendingManualSubmit}
                                    className={`
                                    w-7 h-7 rounded-full flex items-center justify-center
                                    interaction-base interaction-press
                                    ${hasPendingManualSubmit
                                                ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/20 hover:bg-[#0071E3]'
                                                : 'overlay-icon-surface overlay-text-muted cursor-not-allowed'
                                            }
                                `}
                                    style={hasPendingManualSubmit ? undefined : appearance.iconStyle}
                                    >
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NativelyInterface;
