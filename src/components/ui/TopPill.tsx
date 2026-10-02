import { Camera, ChevronUp, ChevronDown, MessageSquare, SlidersHorizontal, Sparkles } from "lucide-react";
import icon from "../icon.png";
import type { OverlayAppearance } from "../../lib/overlayAppearance";
import type { MouseEvent } from "react";
import HoverInfo from './HoverInfo';

interface TopPillProps {
    expanded: boolean;
    onToggle: () => void;
    onQuit: () => void;
    appearance: OverlayAppearance;
    onLogoClick?: () => void;
    isListening?: boolean;
    listeningDuration?: string;
    trialRemainingLabel?: string;
    onToggleListening?: () => void;
    sources?: { systemEnabled: boolean; micEnabled: boolean };
    sourceBusy?: boolean;
    onToggleSource?: (source: 'system' | 'mic') => void;
    onAnswer?: () => void;
    onScreenshot?: () => void;
    onChat?: () => void;
    answerShortcut?: string[];
    screenshotShortcut?: string[];
    isOptionsOpen?: boolean;
    onOptionsClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export default function TopPill({
    expanded,
    onToggle,
    onQuit,
    appearance,
    onLogoClick,
    isListening = false,
    listeningDuration = "00:00",
    trialRemainingLabel,
    onToggleListening,
    sources,
    sourceBusy,
    onToggleSource,
    onAnswer,
    onScreenshot,
    onChat,
    answerShortcut,
    screenshotShortcut,
    isOptionsOpen = false,
    onOptionsClick,
}: TopPillProps) {
    const shortcutLabel = (keys?: string[]) => (
        keys?.length ? keys.map(key => key === 'Enter' ? '↵' : key).join(' ') : ''
    );

    const actionButtonClass = `
            flex items-center gap-1.5
            px-3 py-1.5
            rounded-full
            backdrop-blur-md
            overlay-chip-surface
            text-white
            text-[12px]
            font-semibold
            border
            transition-all duration-200 ease-sculpted
            interaction-base interaction-hover interaction-press
          `;

    return (
        <div className="flex justify-center mt-2 select-none z-50">
            <div data-overlay-interactive
                className="
          draggable-area
          flex w-fit max-w-full items-center gap-2
          rounded-full
          overlay-pill-surface
          backdrop-blur-md
          pl-1.5 pr-1.5 py-1.5
          transition-all duration-300 ease-sculpted
        "
                style={appearance.pillStyle}
            >
                {/* LOGO BUTTON */}
                <button
                    onClick={onLogoClick}
                    className={`
            w-8 h-8
            rounded-full
            overlay-icon-surface
            overlay-icon-surface-hover
            flex items-center justify-center
            shrink-0
            relative overflow-hidden
            interaction-base interaction-press
          `}
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
                        onDragStart={(e) => e.preventDefault()}
                    />
                </button>

                {/* AUDIO SOURCES */}
                {sources && onToggleSource && <div className="flex shrink-0 items-center gap-1">
                    {(['system', 'mic'] as const).map(source => {
                        const enabled = source === 'system' ? sources.systemEnabled : sources.micEnabled;
                        const label = source === 'system' ? 'System audio' : 'Microphone';
                        const state = enabled ? (isListening ? 'capturing' : 'ready') : 'muted';
                        return <HoverInfo key={source} text={`${label}: ${state} (click to ${enabled ? 'mute' : 'unmute'})`}>
                            <button type="button" aria-label={`${enabled ? 'Mute' : 'Unmute'} ${label.toLowerCase()}`} aria-pressed={enabled} disabled={sourceBusy} onClick={() => onToggleSource(source)} className={`relative no-drag flex h-8 w-8 items-center justify-center rounded-full border border-white/10 transition-colors active:scale-95 disabled:opacity-40 ${enabled ? 'bg-white/5 text-white hover:bg-white/15' : 'bg-red-500/15 text-red-300 hover:bg-red-500/25'}`}>
                                <span aria-hidden="true" data-audio-status={enabled ? 'on' : 'off'} className={`absolute right-0 top-0 h-2 w-2 rounded-full ring-2 ring-[#191b20] ${enabled ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    {source === 'system' ? <><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></> : <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></>}
                                    {!enabled && <path d="M3 3l18 18"/>}
                                </svg>
                            </button>
                        </HoverInfo>;
                    })}
                </div>}

                {/* LISTENING CONTROL */}
                <HoverInfo text={`Click to ${isListening ? 'stop' : 'start'} listening to the meeting.`}>
                <button
                    onClick={onToggleListening}
                    aria-label={isListening ? 'Stop listening' : 'Start listening'}
                    className={`
            no-drag flex items-center justify-center
            gap-0.5
            px-3 py-1
            rounded-full
            backdrop-blur-md
            border
            text-[11px]
            font-semibold
            transition-all duration-200 ease-sculpted
            interaction-base interaction-hover interaction-press
            ${isListening ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/25" : "overlay-chip-surface text-white"}
          `}
                    style={isListening ? undefined : appearance.chipStyle}
                >
                    <span className="flex items-center gap-1.5 leading-none">
                        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">{isListening ? <rect x="5" y="5" width="14" height="14" rx="2"/> : <path d="M7 4v16l14-8z"/>}</svg>
                        {isListening ? "Stop listening" : "Start listening"}
                    </span>
                </button>
                </HoverInfo>
                {isListening || trialRemainingLabel ? <span aria-label={trialRemainingLabel ? 'Listening time remaining' : 'Listening duration'} className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[11px] tabular-nums text-white/80">{trialRemainingLabel ?? listeningDuration}</span> : null}

                {/* PRIMARY ACTIONS */}
                <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
                    <button
                        onClick={onAnswer}
                        className={actionButtonClass}
                        style={appearance.chipStyle}
                        aria-label="Answer current prompt"
                        title="Answer"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Answer</span>
                        {shortcutLabel(answerShortcut) && (
                            <kbd className="ml-1 rounded-md border border-white/10 bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white/65">
                                {shortcutLabel(answerShortcut)}
                            </kbd>
                        )}
                    </button>
                    <button
                        onClick={onScreenshot}
                        className={actionButtonClass}
                        style={appearance.chipStyle}
                        aria-label="Capture and analyze screenshot"
                        title="Capture and analyze screenshot"
                    >
                        <Camera className="w-3.5 h-3.5 text-sky-300" />
                        <span>Screenshot</span>
                        {shortcutLabel(screenshotShortcut) && (
                            <kbd className="ml-1 rounded-md border border-white/10 bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white/65">
                                {shortcutLabel(screenshotShortcut)}
                            </kbd>
                        )}
                    </button>
                    <button
                        onClick={onChat}
                        className={actionButtonClass}
                        style={appearance.chipStyle}
                        aria-label="Focus chat"
                        title="Chat"
                    >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Chat</span>
                    </button>
                </div>

                {/* CENTER SEGMENT */}
                <button
                    onClick={onToggle}
                    className={`
            flex items-center gap-2
            group
            px-4 py-1.5
            rounded-full
            backdrop-blur-md
            overlay-chip-surface
            text-white
            text-[12px]
            font-medium
            border
            interaction-base interaction-hover interaction-press
          `}
                    style={appearance.chipStyle}
                >
                    <span className="opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                        {expanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                        )}
                    </span>
                    <span className="tracking-wide opacity-80 group-hover:opacity-100">{expanded ? "Hide" : "Show"}</span>
                </button>

                {/* OPTIONS BUTTON */}
                <button
                    onClick={onOptionsClick}
                    className={`
            w-8 h-8
            rounded-full
            overlay-icon-surface
            overlay-icon-surface-hover
            flex items-center justify-center
            interaction-base interaction-press
            ${isOptionsOpen ? "text-white" : "text-white/85 hover:text-white"}
          `}
                    style={appearance.iconStyle}
                    aria-label="Open Cluegent options"
                    title="Options"
                >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>

                {/* STOP / QUIT BUTTON */}
                <HoverInfo text="End session">
                <button
                    onClick={onQuit}
                    aria-label="End session"
                    className={`
            w-8 h-8
            rounded-full
            overlay-icon-surface
            text-white
            flex items-center justify-center
            shrink-0
            interaction-base interaction-press
            hover:bg-white/10 hover:text-white
          `}
                    style={appearance.iconStyle}
                >
                    <div className="w-3.5 h-3.5 rounded-[3px] bg-current opacity-80" />
                </button>
                </HoverInfo>
            </div>
        </div>
    );
}
