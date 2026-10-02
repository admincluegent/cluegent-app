let sequence = 0;
/** Unique even when two messages are created in the same millisecond. */
export function createMessageId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `message-${Date.now()}-${++sequence}`;
}
