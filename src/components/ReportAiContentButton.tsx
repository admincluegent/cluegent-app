import React, { useState } from 'react';
import { Copy, Flag, Mail, X } from 'lucide-react';
import {
    AI_CONTENT_REPORT_EMAIL,
    buildAiContentReportEmail,
    openAiContentReport,
} from '../lib/aiContentReporting';

type ReportAiContentButtonProps = {
    source: string;
    response: string;
    prompt?: string;
    meetingId?: string | null;
    className?: string;
};

export const ReportAiContentButton: React.FC<ReportAiContentButtonProps> = ({
    source,
    response,
    prompt,
    meetingId,
    className = '',
}) => {
    const [isOpening, setIsOpening] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [status, setStatus] = useState<string | null>(null);

    const reportContext = { source, response, prompt, meetingId, reason };

    const handleSendReport = async () => {
        if (isOpening) return;
        setIsOpening(true);
        setStatus(null);
        try {
            await openAiContentReport(reportContext);
            setStatus(`Email report opened. If no email app appeared, send it to ${AI_CONTENT_REPORT_EMAIL}.`);
        } catch (error) {
            console.error('[AIContentReport] Failed to open report email:', error);
            setStatus(`Could not open your email app. Please email ${AI_CONTENT_REPORT_EMAIL}.`);
        } finally {
            setIsOpening(false);
        }
    };

    const handleCopyReport = async () => {
        const { subject, body } = buildAiContentReportEmail(reportContext);
        await navigator.clipboard.writeText(`To: ${AI_CONTENT_REPORT_EMAIL}\nSubject: ${subject}\n\n${body}`);
        setStatus('Report copied. Paste it into an email to send it.');
    };

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setStatus(null);
                    setIsDialogOpen(true);
                }}
                disabled={isOpening}
                className={`no-drag inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-400/20 bg-red-500/8 text-red-300 transition hover:border-red-300/35 hover:bg-red-500/15 hover:text-red-200 disabled:cursor-wait disabled:opacity-70 ${className}`}
                title="Report inappropriate AI-generated content"
                aria-label="Report inappropriate AI-generated content"
            >
                <Flag size={12} />
                {isOpening && <span className="sr-only">Opening report</span>}
            </button>

            {isDialogOpen && (
                <div className="no-drag fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-[460px] rounded-2xl border border-white/10 bg-[#111827] p-5 text-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-base font-bold">Report AI content</h3>
                                <p className="mt-1 text-xs leading-5 text-white/60">
                                    Send this AI-generated response to Cluegent for review.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsDialogOpen(false)}
                                className="rounded-full p-1 text-white/55 transition hover:bg-white/10 hover:text-white"
                                aria-label="Close report dialog"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <label className="mt-4 block text-xs font-semibold text-white/75">
                            What was inappropriate?
                        </label>
                        <textarea
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            className="mt-2 min-h-[96px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-red-300/40 focus:bg-white/8"
                            placeholder="Briefly describe the issue."
                        />

                        <div className="mt-3 max-h-28 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/55">
                            {response || 'No AI response text available.'}
                        </div>

                        {status && (
                            <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-white/70">
                                {status}
                            </p>
                        )}

                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleCopyReport}
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
                            >
                                <Copy size={13} />
                                Copy report
                            </button>
                            <button
                                type="button"
                                onClick={handleSendReport}
                                disabled={isOpening}
                                className="inline-flex items-center gap-2 rounded-full bg-red-400 px-3 py-2 text-xs font-bold text-black transition hover:bg-red-300 disabled:cursor-wait disabled:opacity-70"
                            >
                                <Mail size={13} />
                                {isOpening ? 'Opening email' : 'Send report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
