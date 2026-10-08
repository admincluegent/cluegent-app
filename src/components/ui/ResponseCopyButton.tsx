import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Copy } from 'lucide-react';

export default function ResponseCopyButton({ text, style, onCopied }: {
    text: string;
    style?: CSSProperties;
    onCopied: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            if (timer.current !== null) clearTimeout(timer.current);
            setCopied(true);
            timer.current = setTimeout(() => setCopied(false), 1400);
            onCopied();
        } catch (error) {
            console.error('[ResponseCopyButton] Copy failed:', error);
        }
    };

    return <button
        type="button"
        onClick={() => void copy()}
        className={`absolute top-2 right-2 p-1.5 rounded-md ${copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity overlay-icon-surface overlay-icon-surface-hover overlay-text-interactive`}
        title={copied ? 'Copied' : 'Copy to clipboard'}
        aria-label={copied ? 'Copied' : 'Copy response'}
        style={style}
    >
        {copied ? <span className="text-[10px]" role="status">Copied</span> : <Copy className="w-3.5 h-3.5" />}
    </button>;
}
