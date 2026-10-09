export interface ScreenshotContext<T> { image: T; answer: string; recent: boolean }
export function refersToScreenshot(text: string, recent: boolean): boolean {
    if (/\b(screenshot|image|on (?:the |this |that )?screen|shown (?:here|above)|(?:this|that|same|above|first|second|third|last) (?:code|function|method|line|error|diagram|query|problem))\b/i.test(text)) return true;
    return recent && /\b(explain (?:more|it|this|that)|give (?:an? )?example|why (?:is|does|did|do|it|that)|(?:change|modify|optimi[sz]e|simplify|expand|fix) (?:it|this|that)|what about|how about)\b/i.test(text);
}
