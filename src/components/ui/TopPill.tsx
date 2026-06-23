import { Camera, ChevronUp, ChevronDown, MessageSquare, SlidersHorizontal, Sparkles } from "lucide-react";
import icon from "../icon.png";
import type { OverlayAppearance } from "../../lib/overlayAppearance";
import type { MouseEvent } from "react";

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
            <div
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

                {/* LISTENING CONTROL */}
                <button
                    onClick={onToggleListening}
                    className={`
            flex flex-col items-center justify-center
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
                        <span className={`h-1.5 w-1.5 rounded-full ${isListening ? "bg-emerald-300 animate-pulse" : "bg-white/45"}`} />
                        {isListening ? "Stop listening" : "Start listening"}
                    </span>
                    {isListening || trialRemainingLabel ? (
                        <span className="font-mono text-[9px] leading-none opacity-80">
                            {trialRemainingLabel ?? listeningDuration}
                        </span>
                    ) : null}
                </button>

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
                        aria-label="Attach screenshot"
                        title="Screenshot"
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
                <button
                    onClick={onQuit}
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
            </div>
        </div>
    );
}
