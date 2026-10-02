/** Keep one answer and its prompt on each page; retain pending prompts while loading. */
export function buildResponsePages<T extends { role: string }>(messages: T[]): T[][] {
    const pages: T[][] = [];
    let prompts: T[] = [];
    for (const message of messages) {
        if (message.role === 'user') prompts.push(message);
        if (message.role === 'system') {
            pages.push([...prompts, message]);
            prompts = [];
        }
    }
    if (prompts.length) pages.push(prompts);
    return pages;
}
