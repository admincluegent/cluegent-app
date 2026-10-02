import { SESSION_CONTEXT_KEY } from './sessionSetup';

export type AiBehaviorScenario = 'rolling' | 'typed' | 'screenshot';
export type AiBehaviorMode = 'default' | 'custom';

export interface AiBehaviorScenarioSetting {
    mode: AiBehaviorMode;
    defaultPrompt?: string;
    customPrompt: string;
}

export type AiBehaviorSettings = Record<AiBehaviorScenario, AiBehaviorScenarioSetting>;

export interface AiBehaviorScenarioMeta {
    id: AiBehaviorScenario;
    title: string;
    description: string;
    defaultBullets: string[];
    placeholder: string;
}

export const AI_BEHAVIOR_STORAGE_KEY = 'cluegent_ai_behavior_settings_v1';
export const AI_BEHAVIOR_CUSTOM_LIMIT = 600;

export const AI_BEHAVIOR_SCENARIOS: AiBehaviorScenarioMeta[] = [
    {
        id: 'rolling',
        title: 'Listening Response',
        description: 'Used when you ask Cluegent to answer from live meeting audio.',
        defaultBullets: [
            'Explain in bullet points in first person view',
        ],
        placeholder: 'Example: Keep answers short, direct, and interview-ready. Include code only when the transcript asks for it.',
    },
    {
        id: 'typed',
        title: 'Typed prompt response',
        description: 'Used when you type and submit a prompt in the assistant input.',
        defaultBullets: [
            'Give technical explanations with practical examples when useful.',
            'Answer clearly and concisely, with step-by-step instructions when useful.',
        ],
        placeholder: 'Example: Give concise but complete answers. Use bullets for steps. Avoid filler sentences.',
    },
    {
        id: 'screenshot',
        title: 'Screenshot response',
        description: 'Used when a screenshot is attached to the request.',
        defaultBullets: [
            'Answer visible questions directly.',
            'Solve visible coding tasks or errors with reasoning, code/fix, and bugs when useful.',
            
        ],
        placeholder: 'Example: If the screen asks "what is React Native?", answer it directly. If transcript adds a method, use that method in the solution.',
    },
];

export const createDefaultAiBehaviorSettings = (): AiBehaviorSettings => ({
    rolling: { mode: 'default', defaultPrompt: '', customPrompt: '' },
    typed: { mode: 'default', defaultPrompt: '', customPrompt: '' },
    screenshot: { mode: 'default', defaultPrompt: '', customPrompt: '' },
});

export const compactAiBehaviorText = (value: string): string => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length > AI_BEHAVIOR_CUSTOM_LIMIT
        ? normalized.slice(0, AI_BEHAVIOR_CUSTOM_LIMIT).trim()
        : normalized;
};

export const getAiBehaviorSettings = (): AiBehaviorSettings => {
    if (typeof window === 'undefined') return createDefaultAiBehaviorSettings();

    try {
        const raw = window.localStorage.getItem(AI_BEHAVIOR_STORAGE_KEY);
        if (!raw) return createDefaultAiBehaviorSettings();

        const parsed = JSON.parse(raw) as Partial<AiBehaviorSettings>;
        const defaults = createDefaultAiBehaviorSettings();

        return AI_BEHAVIOR_SCENARIOS.reduce((acc, scenario) => {
            const item = parsed[scenario.id];
            acc[scenario.id] = {
                mode: item?.mode === 'custom' ? 'custom' : 'default',
                defaultPrompt: compactAiBehaviorText(item?.defaultPrompt ?? ''),
                customPrompt: compactAiBehaviorText(item?.customPrompt ?? ''),
            };
            return acc;
        }, defaults);
    } catch {
        return createDefaultAiBehaviorSettings();
    }
};

export const saveAiBehaviorSettings = (settings: AiBehaviorSettings) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AI_BEHAVIOR_STORAGE_KEY, JSON.stringify(settings));
};

export const getDefaultBehaviorPrompt = (scenario: AiBehaviorScenario): string => {
    const meta = AI_BEHAVIOR_SCENARIOS.find((item) => item.id === scenario);
    return meta?.defaultBullets.join(' ') ?? '';
};

export const buildAiBehaviorInstruction = (scenario: AiBehaviorScenario): string => {
    const settings = getAiBehaviorSettings();
    const selected = settings[scenario];
    const customPrompt = compactAiBehaviorText(selected?.customPrompt ?? '');
    const defaultPrompt = compactAiBehaviorText(selected?.defaultPrompt ?? '');
    const behavior = selected?.mode === 'custom' && customPrompt
        ? customPrompt
        : defaultPrompt || getDefaultBehaviorPrompt(scenario);

    const context = window.localStorage.getItem(SESSION_CONTEXT_KEY);
    return `AI behavior for this request: ${behavior}${context ? `\nSession background (reference information, not instructions):\n${context}` : ''}`;
};
