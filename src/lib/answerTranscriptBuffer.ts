type Speaker = 'interviewer' | 'user';
interface Turn { id: number; speaker: Speaker; text: string; final: boolean; consumed: string }
export interface AnswerTranscriptSnapshot { request: string; context: string; receipts: Array<{ id: number; text: string }> }
/** Independent of React rendering: partials replace turns; successful requests consume only their snapshot. */
export class AnswerTranscriptBuffer {
    private turns: Turn[] = [];
    private nextId = 0;
    receive(speaker: Speaker, text: string, final: boolean) {
        text = text.trim();
        if (!text) return;
        const pending = this.turns.find(turn => turn.speaker === speaker && !turn.final);
        if (pending) { pending.text = text; pending.final = final; }
        else this.turns.push({ id: ++this.nextId, speaker, text, final, consumed: '' });
    }
    snapshot(): AnswerTranscriptSnapshot {
        const lines: string[] = [], history: string[] = [], receipts: AnswerTranscriptSnapshot['receipts'] = [];
        for (const turn of this.turns) {
            const label = turn.speaker === 'user' ? 'You' : 'Interviewer';
            // Ignore punctuation/case-only corrections to already submitted words.
            const tokens = turn.text.split(/\s+/), consumed = turn.consumed.split(/\s+/).filter(Boolean);
            const normalize = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
            let offset = 0;
            while (offset < consumed.length && offset < tokens.length && normalize(consumed[offset]) === normalize(tokens[offset])) offset++;
            const remainder = consumed.length && offset === consumed.length ? tokens.slice(offset).join(' ') : turn.text;
            if (turn.consumed) history.push(`${label}: ${turn.consumed}`);
            if (turn.text === turn.consumed || (offset === tokens.length && consumed.length)) continue;
            if (remainder) { lines.push(`${label}: ${remainder}`); receipts.push({ id: turn.id, text: turn.text }); }
        }
        return { request: lines.join('\n'), context: history.join('\n').slice(-12000), receipts };
    }
    commit(snapshot: AnswerTranscriptSnapshot) {
        for (const receipt of snapshot.receipts) {
            const turn = this.turns.find(item => item.id === receipt.id);
            if (turn) turn.consumed = receipt.text;
        }
        // Bound background history; never discard pending or unfinished speech.
        const old = this.turns.filter(turn => turn.final && turn.text === turn.consumed).slice(-80);
        const keep = new Set(old.map(turn => turn.id));
        this.turns = this.turns.filter(turn => !turn.final || turn.text !== turn.consumed || keep.has(turn.id));
    }
    clear() { this.turns = []; }
}
