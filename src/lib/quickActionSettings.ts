export type QuickActionId = 'whatToAnswer' | 'clarify' | 'brainstorm' | 'followUpQuestions';

export interface QuickActionConfig {
    id: string;
    label: string;
    instruction: string;
    isCustom?: boolean;
}

export interface DefaultQuickActionConfig extends QuickActionConfig {
    id: QuickActionId;
}

export type QuickActionSettings = Record<QuickActionId, QuickActionConfig>;

export const QUICK_ACTION_STORAGE_KEY = 'cluegent_quick_action_settings_v1';
export const QUICK_ACTION_CUSTOM_STORAGE_KEY = 'cluegent_quick_action_custom_settings_v1';
export const QUICK_ACTION_VISIBILITY_STORAGE_KEY = 'cluegent_quick_action_visibility_v1';
export const QUICK_ACTION_REMOVED_DEFAULTS_STORAGE_KEY = 'cluegent_quick_action_removed_defaults_v1';
export const QUICK_ACTION_CHANGED_EVENT = 'cluegent-quick-actions-changed';
export const QUICK_ACTION_LABEL_LIMIT = 28;
export const QUICK_ACTION_INSTRUCTION_LIMIT = 360;

export const DEFAULT_QUICK_ACTIONS: DefaultQuickActionConfig[] = [
    {
        id: 'whatToAnswer',
        label: 'What to answer?',
        instruction: 'Answer the latest live transcript or screenshot directly and practically.',
    },
    {
        id: 'clarify',
        label: 'Clarify',
        instruction: 'Explain the current topic more clearly and remove ambiguity.',
    },
    {
        id: 'brainstorm',
        label: 'Brainstorm',
        instruction: 'Generate useful options, approaches, and trade-offs from the current context.',
    },
    {
        id: 'followUpQuestions',
        label: 'Follow Up Question',
        instruction: 'Suggest smart follow-up questions the user can ask next.',
    },
];

export const createDefaultQuickActionSettings = (): QuickActionSettings =>
    DEFAULT_QUICK_ACTIONS.reduce((acc, action) => {
        acc[action.id] = { ...action };
        return acc;
    }, {} as QuickActionSettings);

export const compactQuickActionInstruction = (value: string) =>
    value.replace(/\s+/g, ' ').trim().slice(0, QUICK_ACTION_INSTRUCTION_LIMIT);

const cleanLabel = (value: string) =>
    value.replace(/\s+/g, ' ').trim().slice(0, QUICK_ACTION_LABEL_LIMIT);

export const getQuickActionSettings = (): QuickActionSettings => {
    if (typeof window === 'undefined') return createDefaultQuickActionSettings();

    try {
        const raw = window.localStorage.getItem(QUICK_ACTION_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) as Partial<QuickActionSettings> : {};
        const defaults = createDefaultQuickActionSettings();

        return DEFAULT_QUICK_ACTIONS.reduce((acc, action) => {
            const saved = parsed[action.id];
            acc[action.id] = {
                id: action.id,
                label: cleanLabel(saved?.label || action.label) || action.label,
                instruction: (saved?.instruction || action.instruction).slice(0, QUICK_ACTION_INSTRUCTION_LIMIT),
            };
            return acc;
        }, defaults);
    } catch {
        return createDefaultQuickActionSettings();
    }
};

export const saveQuickActionSettings = (settings: QuickActionSettings) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(QUICK_ACTION_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(QUICK_ACTION_CHANGED_EVENT));
};

const createCustomQuickActionId = () =>
    `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const getCustomQuickActions = (): QuickActionConfig[] => {
    if (typeof window === 'undefined') return [];

    try {
        const raw = window.localStorage.getItem(QUICK_ACTION_CUSTOM_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) as QuickActionConfig[] : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.map((action) => ({
            id: typeof action.id === 'string' && action.id ? action.id : createCustomQuickActionId(),
            label: cleanLabel(action.label || 'New Button') || 'New Button',
            instruction: (action.instruction || '').slice(0, QUICK_ACTION_INSTRUCTION_LIMIT),
            isCustom: true,
        }));
    } catch {
        return [];
    }
};

export const saveCustomQuickActions = (actions: QuickActionConfig[]) => {
    if (typeof window === 'undefined') return;
    const normalized = actions.map((action) => ({
        id: typeof action.id === 'string' && action.id ? action.id : createCustomQuickActionId(),
        label: cleanLabel(action.label || 'New Button') || 'New Button',
        instruction: (action.instruction || '').slice(0, QUICK_ACTION_INSTRUCTION_LIMIT),
        isCustom: true,
    }));
    window.localStorage.setItem(QUICK_ACTION_CUSTOM_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(QUICK_ACTION_CHANGED_EVENT));
};

export const createEmptyCustomQuickAction = (): QuickActionConfig => ({
    id: createCustomQuickActionId(),
    label: 'New Button',
    instruction: 'Respond to the latest relevant context using this custom quick action.',
    isCustom: true,
});

export const getQuickActionVisibility = () => {
    if (typeof window === 'undefined') return true;
    const raw = window.localStorage.getItem(QUICK_ACTION_VISIBILITY_STORAGE_KEY);
    return raw !== 'false';
};

export const saveQuickActionVisibility = (visible: boolean) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(QUICK_ACTION_VISIBILITY_STORAGE_KEY, visible ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent(QUICK_ACTION_CHANGED_EVENT));
};

export const getRemovedDefaultQuickActionIds = (): QuickActionId[] => {
    if (typeof window === 'undefined') return [];

    try {
        const raw = window.localStorage.getItem(QUICK_ACTION_REMOVED_DEFAULTS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) as string[] : [];
        if (!Array.isArray(parsed)) return [];
        const allowed = new Set(DEFAULT_QUICK_ACTIONS.map((action) => action.id));
        return parsed.filter((id): id is QuickActionId => allowed.has(id as QuickActionId));
    } catch {
        return [];
    }
};

export const saveRemovedDefaultQuickActionIds = (ids: QuickActionId[]) => {
    if (typeof window === 'undefined') return;
    const unique = Array.from(new Set(ids));
    window.localStorage.setItem(QUICK_ACTION_REMOVED_DEFAULTS_STORAGE_KEY, JSON.stringify(unique));
    window.dispatchEvent(new CustomEvent(QUICK_ACTION_CHANGED_EVENT));
};

export const getVisibleDefaultQuickActions = (): DefaultQuickActionConfig[] => {
    const removedIds = new Set(getRemovedDefaultQuickActionIds());
    return DEFAULT_QUICK_ACTIONS.filter((action) => !removedIds.has(action.id));
};

export const subscribeQuickActionSettings = (callback: () => void) => {
    if (typeof window === 'undefined') return () => {};

    const handleStorage = (event: StorageEvent) => {
        if (
            event.key === QUICK_ACTION_STORAGE_KEY ||
            event.key === QUICK_ACTION_CUSTOM_STORAGE_KEY ||
            event.key === QUICK_ACTION_VISIBILITY_STORAGE_KEY ||
            event.key === QUICK_ACTION_REMOVED_DEFAULTS_STORAGE_KEY
        ) callback();
    };
    const handleLocalChange = () => callback();

    window.addEventListener('storage', handleStorage);
    window.addEventListener(QUICK_ACTION_CHANGED_EVENT, handleLocalChange);
    return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(QUICK_ACTION_CHANGED_EVENT, handleLocalChange);
    };
};

export const buildQuickActionInstruction = (id: QuickActionId) => {
    const settings = getQuickActionSettings();
    const action = settings[id];
    return `Quick action "${action.label}" behavior: ${compactQuickActionInstruction(action.instruction)}`;
};
