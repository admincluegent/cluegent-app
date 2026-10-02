import { useRef, useState, type ReactNode } from 'react';

const WIDTH_KEY = 'cluegent_response_panel_width';
const DEFAULT_WIDTH = 576;
const MAX_WIDTH = 1156;
const MIN_WIDTH = 480;

export function getResponsePanelWidth() {
    const saved = Number(localStorage.getItem(WIDTH_KEY));
    return Number.isFinite(saved) && saved >= MIN_WIDTH ? Math.min(saved, MAX_WIDTH) : DEFAULT_WIDTH;
}

export default function ResizableResponsePanel({ height, children, onWidthChange, opacity = 1 }: { height: number; children: ReactNode; onWidthChange?: (width: number) => void; opacity?: number }) {
    const panel = useRef<HTMLDivElement>(null);
    const drag = useRef<{ pointerId: number; x: number; width: number } | null>(null);
    const [width, setWidth] = useState(getResponsePanelWidth);
    const updateWidth = (requested: number) => {
        const max = onWidthChange ? MAX_WIDTH : Math.min(MAX_WIDTH, Math.max(0, (panel.current?.parentElement?.clientWidth ?? 1180) - 24));
        const next = Math.round(Math.max(Math.min(MIN_WIDTH, max), Math.min(requested, max)));
        setWidth(next);
        onWidthChange?.(next);
        return next;
    };
    const saveWidth = (value: number) => localStorage.setItem(WIDTH_KEY, String(value));
    return <div ref={panel} data-theme="dark" className="cluegent-response-panel relative mx-auto mb-2 rounded-[22px] border border-white/10 no-drag overflow-hidden" style={{ height, width, maxWidth: 'calc(100% - 24px)', backgroundColor: `rgba(0, 0, 0, ${opacity})` }}>
        {children}
        <button type="button" aria-label="Resize response width" title="Drag left or right to resize response width. Double-click to reset." className="absolute bottom-1.5 right-1.5 z-20 flex h-8 w-8 touch-none select-none items-center justify-center rounded-full border border-white/10 bg-[#111214] text-white/70 hover:text-white hover:bg-[#25272c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 cursor-ew-resize"
            onPointerDown={event => {
                if (event.button !== 0) return;
                event.preventDefault(); event.stopPropagation();
                drag.current = { pointerId: event.pointerId, x: event.clientX, width: panel.current?.getBoundingClientRect().width ?? width };
                event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={event => {
                if (drag.current?.pointerId !== event.pointerId) return;
                // The panel stays centered, so each side moves by half the width delta.
                updateWidth(drag.current.width + (event.clientX - drag.current.x) * 2);
            }}
            onPointerUp={event => {
                if (drag.current?.pointerId !== event.pointerId) return;
                saveWidth(updateWidth(drag.current.width + (event.clientX - drag.current.x) * 2));
                drag.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => { drag.current = null; }}
            onLostPointerCapture={() => { drag.current = null; }}
            onDoubleClick={() => saveWidth(updateWidth(DEFAULT_WIDTH))}
            onKeyDown={event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault(); event.stopPropagation();
                saveWidth(updateWidth(event.key === 'Home' ? MIN_WIDTH : event.key === 'End' ? MAX_WIDTH : width + (event.key === 'ArrowRight' ? 40 : -40)));
            }}>
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H3v5M3 3l7 7M16 21h5v-5M21 21l-7-7" /></svg>
        </button>
    </div>;
}
