import React, { useEffect, useState } from 'react';
import { Clock, MessageSquare, Trash2 } from 'lucide-react';
import {
    deleteLocalMeeting,
    formatLocalMeetingDuration,
    getLocalMeetings,
    subscribeLocalMeetings,
    type LocalMeetingRecord,
} from '../../lib/localMeetingStorage';

const formatMeetingDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

const eventLabel = (type: string) => {
    if (type === 'transcript') return 'Rolling transcript';
    if (type === 'prompt') return 'Prompt';
    return 'Cluegent response';
};

export const RecentLocalMeetings: React.FC = () => {
    const [meetings, setMeetings] = useState<LocalMeetingRecord[]>(() => getLocalMeetings());
    const [selectedId, setSelectedId] = useState<string | null>(meetings[0]?.id ?? null);

    const refresh = () => {
        const nextMeetings = getLocalMeetings();
        setMeetings(nextMeetings);
        setSelectedId(current => {
            if (current && nextMeetings.some(meeting => meeting.id === current)) return current;
            return nextMeetings[0]?.id ?? null;
        });
    };

    useEffect(() => subscribeLocalMeetings(refresh), []);

    const selectedMeeting = meetings.find(meeting => meeting.id === selectedId) || null;

    const handleDelete = (id: string) => {
        deleteLocalMeeting(id);
        refresh();
    };

    return (
        <section className="rounded-xl border border-border-subtle bg-bg-item-surface overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Clock size={15} className="text-blue-400" />
                        <h4 className="text-sm font-bold text-text-primary">Recent meetings</h4>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">
                        Local-only history of rolling transcript, prompts, screenshots, and Cluegent answers.
                    </p>
                </div>
                <span className="rounded-full bg-bg-input px-2.5 py-1 text-[11px] font-medium text-text-secondary border border-border-subtle">
                    {meetings.length} saved
                </span>
            </div>

            {meetings.length === 0 ? (
                <div className="px-5 py-8 text-sm text-text-tertiary">
                    No recent meetings yet. Start Cluegent, use STT or ask a question, then stop the meeting to save it here.
                </div>
            ) : (
                <div className="grid min-h-[360px] grid-cols-[260px_1fr]">
                    <div className="border-r border-border-subtle bg-bg-card/60 p-2">
                        {meetings.map(meeting => (
                            <button
                                key={meeting.id}
                                onClick={() => setSelectedId(meeting.id)}
                                className={`group mb-1 w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                                    selectedId === meeting.id
                                        ? 'bg-bg-item-active text-text-primary'
                                        : 'text-text-secondary hover:bg-bg-input hover:text-text-primary'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold">{meeting.title}</p>
                                        <p className="mt-1 text-[11px] text-text-tertiary">
                                            {formatMeetingDate(meeting.startedAt)} · {formatLocalMeetingDuration(meeting)}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-bg-input px-1.5 py-0.5 text-[10px] text-text-tertiary">
                                        {meeting.events.length}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="flex min-h-0 flex-col">
                        {selectedMeeting ? (
                            <>
                                <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-text-primary">{selectedMeeting.title}</p>
                                        <p className="mt-1 text-[11px] text-text-tertiary">
                                            Saved locally on {formatMeetingDate(selectedMeeting.startedAt)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(selectedMeeting.id)}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/15 hover:text-red-300"
                                    >
                                        <Trash2 size={13} />
                                        Delete
                                    </button>
                                </div>

                                <div className="flex-1 space-y-4 overflow-y-auto p-5 custom-scrollbar">
                                    {selectedMeeting.events.map(event => (
                                        <div
                                            key={event.id}
                                            className={`flex ${event.type === 'prompt' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                                                    event.type === 'prompt'
                                                        ? 'rounded-tr-sm bg-blue-500/20 text-text-primary border border-blue-400/20'
                                                        : event.type === 'response'
                                                        ? 'rounded-tl-sm bg-bg-card border border-border-subtle text-text-secondary'
                                                        : 'rounded-tl-sm bg-emerald-500/10 border border-emerald-500/20 text-text-secondary'
                                                }`}
                                            >
                                                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">
                                                    {event.type === 'transcript' && <MessageSquare size={11} className="text-emerald-400" />}
                                                    <span>{eventLabel(event.type)}</span>
                                                    {event.hasScreenshot && <span>· Screenshot</span>}
                                                </div>
                                                <p className="whitespace-pre-wrap text-sm leading-6">{event.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            )}
        </section>
    );
};

