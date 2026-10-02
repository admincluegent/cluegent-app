import { createMessageId } from './messageIds';
export interface LiveTranscriptTurn { id: string; speaker: 'interviewer' | 'user'; text: string; final: boolean }
export function updateLiveTranscript(turns: LiveTranscriptTurn[], speaker: LiveTranscriptTurn['speaker'], text: string, final: boolean): LiveTranscriptTurn[] {
    if (!text.trim()) return turns;
    const pending = turns.findIndex(turn => turn.speaker === speaker && !turn.final);
    if (pending >= 0) return turns.map((turn, index) => index === pending ? { ...turn, text: text.trim(), final } : turn);
    return [...turns, { id: createMessageId(), speaker, text: text.trim(), final }].slice(-80);
}
export function formatLiveTranscript(turns: LiveTranscriptTurn[]) {
    return turns.map(turn => `${turn.speaker === 'user' ? 'You' : 'Interviewer'}: ${turn.text}`).join('  |  ');
}
