export const AI_CONTENT_REPORT_EMAIL = 'admincluegent@gmail.com';
const MAX_REPORT_FIELD_LENGTH = 3000;

type AiContentReportContext = {
    source: string;
    prompt?: string;
    response?: string;
    meetingId?: string | null;
    reason?: string;
};

const truncateReportField = (value?: string) => {
    if (!value) return 'Not provided';
    const trimmed = value.trim();
    if (trimmed.length <= MAX_REPORT_FIELD_LENGTH) return trimmed;
    return `${trimmed.slice(0, MAX_REPORT_FIELD_LENGTH)}\n\n[Content truncated for email length]`;
};

export const buildAiContentReportEmail = ({
    source,
    prompt,
    response,
    meetingId,
    reason,
}: AiContentReportContext) => {
    const subject = 'Report inappropriate AI content in Cluegent';
    const body = [
        'Please review this AI-generated content report.',
        '',
        `Source: ${source}`,
        `Reported at: ${new Date().toISOString()}`,
        meetingId ? `Meeting ID: ${meetingId}` : null,
        '',
        'What was inappropriate or harmful?',
        truncateReportField(reason),
        '',
        'User prompt or context:',
        truncateReportField(prompt),
        '',
        'AI-generated content:',
        truncateReportField(response),
    ].filter(Boolean).join('\n');

    return { subject, body };
};

export const openAiContentReport = async (context: AiContentReportContext) => {
    const { subject, body } = buildAiContentReportEmail(context);

    if (window.electronAPI?.openMailto) {
        await window.electronAPI.openMailto({
            to: AI_CONTENT_REPORT_EMAIL,
            subject,
            body,
        });
        return;
    }

    const params = new URLSearchParams({ subject, body });
    const mailtoUrl = `mailto:${AI_CONTENT_REPORT_EMAIL}?${params.toString()}`;

    if (window.electronAPI?.openExternal) {
        await window.electronAPI.openExternal(mailtoUrl);
        return;
    }

    window.location.href = mailtoUrl;
};
