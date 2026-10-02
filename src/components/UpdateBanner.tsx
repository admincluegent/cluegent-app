import React, { useEffect, useState } from 'react';

// Downloads are quiet: only a completed update needs user attention.
const UpdateBanner: React.FC = () => {
    const [ready, setReady] = useState(false);
    const [storeRequired, setStoreRequired] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        let eventReceived = false;
        const downloaded = window.electronAPI.onUpdateDownloaded(() => {
            eventReceived = true;
            setReady(true);
            setStoreRequired(false);
            setError(null);
        });
        const managed = window.electronAPI.onUpdateManagedByStore(() => {
            eventReceived = true;
            setStoreRequired(true);
            setReady(false);
        });
        // Recover state if a window mounts after the download completed.
        void window.electronAPI.getUpdateState().then(state => {
            if (!mounted || eventReceived) return;
            setReady(state.status === 'ready');
            setStoreRequired(state.status === 'store');
        }).catch(console.error);
        return () => { mounted = false; downloaded(); managed(); };
    }, []);

    const restart = async () => {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            const result = await window.electronAPI.restartAndInstall();
            if (!result.success) throw new Error(result.error || 'Could not install the update.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not install the update.');
        } finally { setBusy(false); }
    };

    if (!ready && !storeRequired) return null;
    return (
        <aside role="status" aria-live="polite"
            className="fixed bottom-4 right-4 z-[9999] max-w-sm rounded-xl border border-white/15 bg-[#17191f] p-4 text-white shadow-xl"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <p className="text-sm mb-3">{ready ? 'A Cluegent update is ready. Restart when you’ve finished your session.' : 'Updates are managed by Microsoft Store. Open Store to finish updating.'}</p>
            {error && <p role="alert" className="text-sm text-red-300 mb-3">{error}</p>}
            <button disabled={busy} onClick={ready ? restart : () => void window.electronAPI.openExternal('ms-windows-store://downloadsandupdates')}
                className="rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 px-4 py-2 text-sm font-medium">
                {busy ? 'Installing…' : ready ? 'Restart to update' : 'Open Microsoft Store'}
            </button>
        </aside>
    );
};

export default UpdateBanner;
