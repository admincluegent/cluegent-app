import { useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export default function HoverInfo({ text, children }: { text: string; children: ReactNode }) {
    const id = useId();
    const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
    return <span className="inline-flex shrink-0 no-drag" aria-describedby={position ? id : undefined}
        onMouseEnter={event => {
            const rect = event.currentTarget.getBoundingClientRect();
            setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 268)), top: rect.bottom + 8 });
        }}
        onMouseLeave={() => setPosition(null)}
        onFocus={event => {
            const rect = event.currentTarget.getBoundingClientRect();
            setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 268)), top: rect.bottom + 8 });
        }}
        onBlur={() => setPosition(null)}
        onKeyDown={event => { if (event.key === 'Escape') setPosition(null); }}>
        {children}
        {position && createPortal(<span id={id} role="tooltip" className="pointer-events-none fixed z-[100] max-w-[260px] rounded-lg border border-white/15 bg-[#111214] px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg" style={position}>{text}</span>, document.body)}
    </span>;
}
