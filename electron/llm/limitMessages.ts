export const FREE_PLAN_LIMIT_REACHED_MESSAGE = "Free Plan Limit Reached. Subscribe to use more.";

export function isPlanLimitError(error: unknown): boolean {
    const message = error instanceof Error
        ? error.message
        : typeof error === 'string'
            ? error
            : JSON.stringify(error ?? '');

    const lower = message.toLowerCase();

    return (
        lower.includes('free trial limit') ||
        lower.includes('free plan limit') ||
        lower.includes('monthly screenshot limit') ||
        lower.includes('screenshot limit') ||
        lower.includes('prompt limit') ||
        lower.includes('plan limit') ||
        lower.includes('quota exceeded') ||
        lower.includes('resource_exhausted')
    );
}
