export interface SessionSetupDetails {
    sessionType: 'interview' | 'meeting';
    company: string;
    position: string;
    title: string;
    language: string;
    useResume: boolean;
    referenceDocs: Array<{ name: string; content: string }>;
}

export const SESSION_CONTEXT_KEY = 'cluegent_active_session_context_v1';

export function buildSessionContext(details: SessionSetupDetails): string {
    return [
        `Session type: ${details.sessionType}.`,
        details.company && `Company: ${details.company}.`,
        details.position && `Position: ${details.position}.`,
        details.title && `Meeting goal: ${details.title}.`,
        ...details.referenceDocs.map(doc => `Reference document (${doc.name}):\n${doc.content}`),
    ].filter(Boolean).join('\n').slice(0, 12000);
}
