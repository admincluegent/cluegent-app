import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { MessageSquare, Camera, User } from 'lucide-react';
import { useShortcuts } from '../hooks/useShortcuts';

const SettingsPopup = () => {
    const { shortcuts } = useShortcuts();
    const [isUndetectable, setIsUndetectable] = useState(false);
    const [profileMode, setProfileMode] = useState(false);
    const [hasProfile, setHasProfile] = useState(false);

    const loadProfile = useCallback(async () => {
        try {
            const status = await window.electronAPI?.profileGetStatus?.();
            if (status) {
                setHasProfile(status.hasProfile);
                setProfileMode(status.profileMode);
            }
        } catch (e) {
            console.warn('[SettingsPopup] Failed to load profile status:', e);
        }
    }, []);

    // Load Initial Data and refresh on focus
    useEffect(() => {
        void loadProfile();

        const handleFocus = () => void loadProfile();
        const handleVisibility = () => {
            if (!document.hidden) void loadProfile();
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [loadProfile]);

    useEffect(() => {
        if (!window.electronAPI?.onSettingsVisibilityChange) return;
        const unsubscribe = window.electronAPI.onSettingsVisibilityChange((isVisible) => {
            if (isVisible) void loadProfile();
        });
        return () => unsubscribe();
    }, [loadProfile]);

    useEffect(() => {
        if (!window.electronAPI?.onProfileStatusChanged) return;
        const unsubscribe = window.electronAPI.onProfileStatusChanged((status) => {
            setHasProfile(status.hasProfile);
            setProfileMode(status.profileMode);
        });
        return () => unsubscribe();
    }, []);

    // Fetch initial undetectable state from main process (source of truth)
    useEffect(() => {
        if (window.electronAPI?.getUndetectable) {
            window.electronAPI.getUndetectable().then((state: boolean) => {
                setIsUndetectable(state);
            });
        }
    }, []);

    // One-way listener: receive state changes from main process, never echo back
    useEffect(() => {
        if (window.electronAPI?.onUndetectableChanged) {
            const unsubscribe = window.electronAPI.onUndetectableChanged((newState: boolean) => {
                setIsUndetectable(newState);
                localStorage.setItem('natively_undetectable', String(newState));
            });
            return () => unsubscribe();
        }
    }, []);

    const [showTranscript, setShowTranscript] = useState(() => {
        const stored = localStorage.getItem('natively_interviewer_transcript');
        return stored !== 'false'; // Default to true if not set
    });

    useEffect(() => {
        const handleStorage = () => {
            const stored = localStorage.getItem('natively_interviewer_transcript');
            setShowTranscript(stored !== 'false');
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const contentRef = useRef<HTMLDivElement>(null);

    // Auto-resize Window
    useLayoutEffect(() => {
        if (!contentRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const rect = entry.target.getBoundingClientRect();
                // Send exact dimensions to Electron
                try {
                    // @ts-ignore
                    window.electronAPI?.updateContentDimensions({
                        width: Math.ceil(rect.width),
                        height: Math.ceil(rect.height)
                    });
                } catch (e) {
                    console.warn("Failed to update dimensions", e);
                }
            }
        });

        observer.observe(contentRef.current);
        return () => observer.disconnect();
    }, []);

    const popupPanelClass = 'border-white/[0.12] shadow-[0_24px_70px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.10)]';
    const itemHoverClass = 'hover:bg-white/10';
    const labelInactiveClass = 'text-white group-hover:text-white';
    const iconInactiveClass = 'text-white group-hover:text-white';
    const dividerClass = 'bg-white/10';
    const shortcutKeyClass = 'border-white/15 bg-white/10 text-white';
    const defaultToggleTrackClass = 'bg-white/[0.18]';
    const toggleKnobClass = 'bg-white shadow-[0_1px_5px_rgba(0,0,0,0.3)]';

    return (
        <div
            className="w-[216px] h-fit flex flex-col text-white"
            style={{ backgroundColor: '#05070c' }}
        >
            <div
                ref={contentRef}
                className={`w-[216px] max-h-[320px] border rounded-[18px] overflow-hidden p-2 flex flex-col animate-scale-in origin-top-left text-white ${popupPanelClass}`}
                style={{ backgroundColor: '#05070c' }}
            >
                <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col min-h-0">

                {/* Undetectability */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-200 group cursor-default ${itemHoverClass}`}>
                    <div className="flex items-center gap-3">
                        <CustomGhost
                            className="w-4 h-4 transition-colors text-white"
                            fill={isUndetectable ? "currentColor" : "none"}
                            stroke={isUndetectable ? "none" : "currentColor"}
                            eyeColor={isUndetectable ? "black" : "white"}
                        />
                        <span className={`text-[12px] font-medium transition-colors ${isUndetectable ? 'text-white' : labelInactiveClass}`}>{isUndetectable ? 'Undetectable' : 'Detectable'}</span>
                    </div>
                    <button
                        onClick={() => {
                            const newState = !isUndetectable;
                            setIsUndetectable(newState);
                            localStorage.setItem('natively_undetectable', String(newState));
                            window.electronAPI?.setUndetectable(newState);
                        }}
                        className={`w-[30px] h-[18px] rounded-full p-[1.5px] transition-all duration-300 ease-spring active:scale-[0.92] ${isUndetectable
                            ? 'bg-white shadow-[0_2px_8px_rgba(255,255,255,0.2)]'
                            : defaultToggleTrackClass}`}
                    >
                        <div className={`w-[15px] h-[15px] rounded-full transition-transform duration-300 ease-spring ${toggleKnobClass} ${isUndetectable ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* Interviewer Transcript Toggle */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-200 group cursor-default ${itemHoverClass}`}>
                    <div className="flex items-center gap-3">
                        <MessageSquare
                            className="w-3.5 h-3.5 transition-colors text-white"
                            fill={showTranscript ? "currentColor" : "none"}
                        />
                        <span className={`text-[12px] font-medium transition-colors ${showTranscript ? 'text-white' : labelInactiveClass}`}>Transcript</span>
                    </div>
                    <button
                        onClick={() => {
                            const newState = !showTranscript;
                            setShowTranscript(newState);
                            localStorage.setItem('natively_interviewer_transcript', String(newState));
                            // Dispatch event for same-window listeners
                            window.dispatchEvent(new Event('storage'));
                        }}
                        className={`w-[30px] h-[18px] rounded-full p-[1.5px] transition-all duration-300 ease-spring active:scale-[0.92] ${showTranscript ? 'bg-emerald-500 shadow-[0_2px_10px_rgba(16,185,129,0.3)]' : defaultToggleTrackClass}`}
                    >
                        <div className={`w-[15px] h-[15px] rounded-full transition-transform duration-300 ease-spring ${toggleKnobClass} ${showTranscript ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* Resume Context Toggle */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-200 group ${hasProfile ? `${itemHoverClass} cursor-default` : 'opacity-50 cursor-not-allowed'}`} title={hasProfile ? 'Use uploaded resume when relevant' : 'Upload a resume in Customize first'}>
                    <div className="flex items-center gap-3">
                        <User
                            className="w-3.5 h-3.5 transition-colors text-white"
                            fill={profileMode ? "currentColor" : "none"}
                        />
                        <span className={`text-[12px] font-medium transition-colors ${profileMode ? 'text-white' : labelInactiveClass}`}>Resume Context</span>
                    </div>
                    <button
                        onClick={async () => {
                            if (!hasProfile) return;
                            const newState = !profileMode;
                            setProfileMode(newState);
                            try {
                                await window.electronAPI?.profileSetMode?.(newState);
                            } catch (e) { console.error(e); }
                        }}
                        className={`w-[30px] h-[18px] rounded-full p-[1.5px] transition-all duration-300 ease-spring active:scale-[0.92] ${profileMode ? 'bg-emerald-500 shadow-[0_2px_10px_rgba(16,185,129,0.3)]' : defaultToggleTrackClass}`}
                        disabled={!hasProfile}
                    >
                        <div className={`w-[15px] h-[15px] rounded-full transition-transform duration-300 ease-spring ${toggleKnobClass} ${profileMode ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                    </button>
                </div>

                <div className={`h-px my-0.5 mx-2 ${dividerClass}`} />

                    {/* Show/Hide Cluegent */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-200 group interaction-base interaction-press ${itemHoverClass}`}>
                    <div className="flex items-center gap-3">
                        <MessageSquare className={`w-3.5 h-3.5 transition-colors ${iconInactiveClass}`} />
                        <span className={`text-[12px] transition-colors ${labelInactiveClass}`}>Show/Hide</span>
                    </div>
                    <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        {/* Dynamic Keys for Toggle Visibility */}
                        {(shortcuts.toggleVisibility || ['⌘', '\\']).map((key, index) => (
                            <div key={index} className={`px-1.5 py-0.5 rounded border text-[10px] font-medium min-w-[20px] text-center ${shortcutKeyClass}`}>
                                {key}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Screenshot */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-200 group interaction-base interaction-press ${itemHoverClass}`}>
                    <div className="flex items-center gap-3">
                        <Camera className={`w-3.5 h-3.5 transition-colors ${iconInactiveClass}`} />
                        <span className={`text-[12px] transition-colors ${labelInactiveClass}`}>Screenshot</span>
                    </div>
                    <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        {/* Dynamic Keys for Take Screenshot */}
                        {(shortcuts.takeScreenshot || ['⌘', '[']).map((key, index) => (
                            <div key={index} className={`px-1.5 py-0.5 rounded border text-[10px] font-medium min-w-[20px] text-center ${shortcutKeyClass}`}>
                                {key}
                            </div>
                        ))}
                    </div>
                </div>

                </div>
            </div>
        </div>
    );
};

interface CustomGhostProps {
    className?: string;
    fill?: string;
    stroke?: string;
    eyeColor?: string;
}

// Custom Ghost with dynamic eye color support
const CustomGhost = ({ className, fill, stroke, eyeColor }: CustomGhostProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={fill || "none"}
        stroke={stroke || "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {/* Body */}
        <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
        {/* Eyes - No stroke, just fill */}
        <path
            d="M9 10h.01 M15 10h.01"
            stroke={eyeColor || "currentColor"}
            strokeWidth="2.5" // Slightly bolder for visibility
            fill="none"
        />
    </svg>
);

export default SettingsPopup;
