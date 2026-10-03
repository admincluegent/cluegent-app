export function remainingListeningSeconds(balance: number, elapsedSeconds: number): number {
    return Math.max(0, Math.floor(balance) - Math.max(0, Math.floor(elapsedSeconds)));
}

export function formatListeningDuration(seconds: number): string {
    const value = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(value % 3600 / 60).toString().padStart(2, '0');
    const remainder = (value % 60).toString().padStart(2, '0');
    return value >= 3600 ? `${Math.floor(value / 3600)}:${minutes}:${remainder}`
        : `${Math.floor(value / 60).toString().padStart(2, '0')}:${remainder}`;
}
