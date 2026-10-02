import { useEffect } from 'react';

// Transparent BrowserWindow pixels still intercept native clicks. Only painted
// overlay surfaces should accept them. Native cursor reads restore interaction
// even when macOS does not forward mouse events over a native drag region.
export function useOverlayHitTest() {
    useEffect(() => {
        const api = window.electronAPI;
        if (!api?.setOverlayHitTestIgnore) return;
        let previous: boolean | undefined;
        let dragging = false;
        let point: { x: number; y: number } | null = null;
        let frame = 0;
        let disposed = false;
        let readingCursor = false;
        const sync = () => {
            frame = 0;
            const hit = point ? document.elementFromPoint(point.x, point.y) : null;
            // No cursor sample yet: keep the overlay interactive, never lock it
            // into passthrough while waiting for the first native mouse event.
            const ignore = point !== null && !dragging && !hit?.closest('[data-overlay-interactive], [role="dialog"], [role="menu"]');
            if (ignore === previous) return;
            previous = ignore;
            void api.setOverlayHitTestIgnore(ignore).catch(() => {});
        };
        const readCursor = async () => {
            if (disposed || readingCursor || !api.getOverlayCursorPosition) return;
            readingCursor = true;
            try {
                const cursor = await api.getOverlayCursorPosition();
                if (disposed) return;
                point = cursor;
                sync();
            } catch {
                if (!disposed) { point = null; sync(); }
            } finally { readingCursor = false; }
        };
        const move = (event: MouseEvent) => {
            point = { x: event.clientX, y: event.clientY };
            if (event.buttons === 0) dragging = false;
            sync();
        };
        const down = () => { dragging = true; sync(); };
        const up = () => { dragging = false; sync(); };
        const leave = () => { point = null; sync(); };
        const refresh = () => { if (!frame) frame = requestAnimationFrame(sync); };
        const observer = new MutationObserver(refresh);
        observer.observe(document.body, { subtree: true, childList: true, attributes: true });
        const cursorTimer = window.setInterval(() => void readCursor(), 16);
        window.addEventListener('mousemove', move);
        window.addEventListener('pointerdown', down, true);
        window.addEventListener('pointerup', up, true);
        window.addEventListener('pointercancel', up, true);
        window.addEventListener('blur', up);
        document.documentElement.addEventListener('mouseleave', leave);
        window.addEventListener('resize', refresh);
        sync();
        void readCursor();
        return () => {
            disposed = true;
            window.clearInterval(cursorTimer);
            observer.disconnect();
            cancelAnimationFrame(frame);
            window.removeEventListener('mousemove', move);
            window.removeEventListener('pointerdown', down, true);
            window.removeEventListener('pointerup', up, true);
            window.removeEventListener('pointercancel', up, true);
            window.removeEventListener('blur', up);
            document.documentElement.removeEventListener('mouseleave', leave);
            window.removeEventListener('resize', refresh);
            void api.setOverlayHitTestIgnore(false);
        };
    }, []);
}
