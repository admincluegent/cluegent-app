import { LLMHelper } from "../LLMHelper";
import { FAST_LIVE_COPILOT_SYSTEM_PROMPT } from "./prompts";
import { TemporalContext } from "./TemporalContextBuilder";
import { IntentResult } from "./IntentClassifier";
import { LocalProfileManager } from "../services/LocalProfileManager";
import { FREE_PLAN_LIMIT_REACHED_MESSAGE, isPlanLimitError } from "./limitMessages";

export class WhatToAnswerLLM {
    private llmHelper: LLMHelper;

    constructor(llmHelper: LLMHelper) {
        this.llmHelper = llmHelper;
    }

    // Deprecated non-streaming method (redirect to streaming or implement if needed)
    async generate(cleanedTranscript: string): Promise<string> {
        // Simple wrapper around stream
        const stream = this.generateStream(cleanedTranscript);
        let full = "";
        for await (const chunk of stream) full += chunk;
        return full;
    }

    async *generateStream(
        cleanedTranscript: string,
        temporalContext?: TemporalContext,
        intentResult?: IntentResult,
        imagePaths?: string[],
        behaviorInstructions?: string
    ): AsyncGenerator<string> {
        try {
            // Build a rich message context
            // Note: We can't easily inject the complex temporal/intent logic into universal prompt *variables* 
            // but we can prepend it to the message.

            let contextParts: string[] = [];

            if (intentResult) {
                contextParts.push(`<intent_and_shape>
DETECTED INTENT: ${intentResult.intent}
ANSWER SHAPE: ${intentResult.answerShape}
</intent_and_shape>`);
            }

            if (temporalContext && temporalContext.hasRecentResponses && !imagePaths?.length) {
                // Keep recent answers available so short follow-ups like
                // "give example" or "change that name" can resolve correctly.
                const history = temporalContext.previousResponses.map((r, i) => `${i + 1}. "${r}"`).join('\n');
                contextParts.push(`PREVIOUS RESPONSES (Use only for follow-ups; do not repeat them):\n${history}`);
            }

            if (behaviorInstructions?.trim()) {
                contextParts.push(`REQUEST-SPECIFIC BEHAVIOR:\n${behaviorInstructions.trim()}`);
            }

            const extraContext = contextParts.join('\n\n');
            const fullMessage = extraContext
                ? `${extraContext}\n\nCURRENT REQUEST (answer every supplied question):\n${cleanedTranscript}`
                : cleanedTranscript;

            let profileContext: string | undefined;
            try {
                const profileResult = LocalProfileManager.getInstance().buildContextForRequest({
                    message: fullMessage,
                    hasImages: Boolean(imagePaths?.length),
                });
                if (profileResult.shouldInject && profileResult.contextBlock) {
                    profileContext = profileResult.contextBlock;
                    console.log(`[WhatToAnswerLLM] Local resume context injected (${profileResult.reason})`);
                }
            } catch (profileErr: any) {
                console.warn("[WhatToAnswerLLM] Local resume context skipped:", profileErr?.message || profileErr);
            }

            yield* this.llmHelper.streamChat(fullMessage, imagePaths, profileContext, FAST_LIVE_COPILOT_SYSTEM_PROMPT, true);

        } catch (error) {
            // Let the engine report failure so the submitted speech remains pending.
            console.error('[WhatToAnswerLLM] Stream failed:', error);
            throw error;
        }
    }
}
