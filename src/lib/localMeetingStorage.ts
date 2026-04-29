export type LocalMeetingEventType = 'transcript' | 'prompt' | 'response';

export interface LocalMeetingEvent {
    id: string;
    type: LocalMeetingEventType;
    text: string;
    timestamp: number;
    hasScreenshot?: boolean;
}

export interface LocalMeetingRecord {
    id: string;
    startedAt: number;
    endedAt?: number;
    title: string;
    events: LocalMeetingEvent[];
}

const MEETINGS_KEY = 'cluegent.localMeetings.v1';
const CURRENT_MEETING_KEY = 'cluegent.currentLocalMeetingId.v1';
const MAX_MEETINGS = 100;

const nowId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const canUseLocalStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const emitChange = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('cluegent-local-meetings-changed'));
};

const readMeetings = (): LocalMeetingRecord[] => {
    if (!canUseLocalStorage()) return [];
    try {
        const raw = window.localStorage.getItem(MEETINGS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeMeetings = (meetings: LocalMeetingRecord[]) => {
    if (!canUseLocalStorage()) return;
    const trimmed = meetings
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, MAX_MEETINGS);
    window.localStorage.setItem(MEETINGS_KEY, JSON.stringify(trimmed));
    emitChange();
};

const summarizeTitle = (meeting: LocalMeetingRecord) => {
    const firstUsefulText = meeting.events.find(event => event.text.trim())?.text.trim();
    if (!firstUsefulText) {
        return `Meeting ${new Date(meeting.startedAt).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        })}`;
    }
    return firstUsefulText.length > 60 ? `${firstUsefulText.slice(0, 57)}...` : firstUsefulText;
};

export const beginLocalMeeting = (title?: string): LocalMeetingRecord => {
    const meeting: LocalMeetingRecord = {
        id: `local-${nowId()}`,
        startedAt: Date.now(),
        title: title || 'Cluegent meeting',
        events: [],
    };

    const meetings = readMeetings().filter(item => item.id !== meeting.id);
    writeMeetings([meeting, ...meetings]);
    window.localStorage.setItem(CURRENT_MEETING_KEY, meeting.id);
    return meeting;
};

export const getCurrentLocalMeetingId = () => {
    if (!canUseLocalStorage()) return null;
    return window.localStorage.getItem(CURRENT_MEETING_KEY);
};

const ensureCurrentMeeting = () => {
    const currentId = getCurrentLocalMeetingId();
    const meetings = readMeetings();
    const existing = currentId ? meetings.find(meeting => meeting.id === currentId) : null;
    return existing || beginLocalMeeting();
};

export const appendLocalMeetingEvent = (
    event: Omit<LocalMeetingEvent, 'id' | 'timestamp'> & Partial<Pick<LocalMeetingEvent, 'timestamp'>>,
    meetingId?: string | null,
) => {
    const text = event.text.trim();
    if (!text || !canUseLocalStorage()) return;

    const activeMeeting = meetingId
        ? readMeetings().find(meeting => meeting.id === meetingId) || ensureCurrentMeeting()
        : ensureCurrentMeeting();

    const meetings = readMeetings();
    const updatedMeetings = meetings.map(meeting => {
        if (meeting.id !== activeMeeting.id) return meeting;
        const nextEvents = [
            ...meeting.events,
            {
                ...event,
                id: nowId(),
                text,
                timestamp: event.timestamp ?? Date.now(),
            },
        ];
        return {
            ...meeting,
            title: meeting.events.length === 0 ? summarizeTitle({ ...meeting, events: nextEvents }) : meeting.title,
            events: nextEvents,
        };
    });

    writeMeetings(updatedMeetings);
};

export const finishCurrentLocalMeeting = () => {
    if (!canUseLocalStorage()) return;

    const currentId = getCurrentLocalMeetingId();
    if (!currentId) return;

    const meetings = readMeetings();
    const updatedMeetings = meetings
        .map(meeting => (
            meeting.id === currentId
                ? {
                    ...meeting,
                    endedAt: Date.now(),
                    title: summarizeTitle(meeting),
                }
                : meeting
        ))
        .filter(meeting => meeting.id !== currentId || meeting.events.length > 0);

    writeMeetings(updatedMeetings);
    window.localStorage.removeItem(CURRENT_MEETING_KEY);
};

export const getLocalMeetings = () => readMeetings().filter(meeting => meeting.events.length > 0);

export const getLocalMeetingById = (id: string) => getLocalMeetings().find(meeting => meeting.id === id) || null;

export const deleteLocalMeeting = (id: string) => {
    if (!canUseLocalStorage()) return;
    const currentId = getCurrentLocalMeetingId();
    writeMeetings(readMeetings().filter(meeting => meeting.id !== id));
    if (currentId === id) {
        window.localStorage.removeItem(CURRENT_MEETING_KEY);
    }
};

export const subscribeLocalMeetings = (callback: () => void) => {
    if (typeof window === 'undefined') return () => {};
    const handleStorage = (event: StorageEvent) => {
        if (event.key === MEETINGS_KEY || event.key === CURRENT_MEETING_KEY) callback();
    };
    const handleCustomChange = () => callback();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('cluegent-local-meetings-changed', handleCustomChange);
    return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('cluegent-local-meetings-changed', handleCustomChange);
    };
};

export const formatLocalMeetingDuration = (meeting: LocalMeetingRecord) => {
    const end = meeting.endedAt || Date.now();
    const durationMs = Math.max(0, end - meeting.startedAt);
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

