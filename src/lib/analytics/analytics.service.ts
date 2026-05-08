export type ModelProviderType = 'cloud' | 'local';

export type AssistantMode = 'launcher' | 'overlay' | 'undetectable' | string;

export type AnalyticsEventName =
    | 'app_opened'
    | 'app_closed'
    | 'first_launch'
    | 'assistant_started'
    | 'assistant_stopped'
    | 'mode_selected'
    | 'copy_answer_clicked'
    | 'calendar_connected'
    | 'pdf_exported'
    | 'meeting_started'
    | 'meeting_ended'
    | 'model_used'
    | 'session_duration'
    | 'command_executed'
    | 'conversation_started';

interface ModelUsedPayload {
    model_name: string;
    provider_type: ModelProviderType;
    latency_ms: number;
    tokens_used?: number;
}

/** Detect if a model is running locally (Ollama) or in the cloud. */
export function detectProviderType(modelName: string): ModelProviderType {
    const lower = modelName.toLowerCase();

    if (
        lower.startsWith('ollama:') ||
        lower.includes('localhost') ||
        lower.includes('127.0.0.1')
    ) {
        return 'local';
    }

    return 'cloud';
}

class AnalyticsService {
    private static instance: AnalyticsService;

    private constructor() { }

    public static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }

        return AnalyticsService.instance;
    }

    public initAnalytics(): void {
        // Analytics is intentionally disabled for production privacy.
    }

    public trackAppOpen(): void { }

    public trackAppClose(): void { }

    public trackAssistantStart(): void { }

    public trackAssistantStop(): void { }

    public trackModeSelected(_mode: AssistantMode): void { }

    public trackModelUsed(_payload: ModelUsedPayload): void { }

    public trackCopyAnswer(): void { }

    public trackCommandExecuted(_commandType: string): void { }

    public trackConversationStarted(): void { }

    public trackCalendarConnected(): void { }

    public trackMeetingStarted(): void { }

    public trackMeetingEnded(): void { }

    public trackPdfExported(): void { }
}

export const analytics = AnalyticsService.getInstance();
