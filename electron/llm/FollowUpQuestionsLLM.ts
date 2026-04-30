import { LLMHelper } from "../LLMHelper";
import { UNIVERSAL_FOLLOW_UP_QUESTIONS_PROMPT } from "./prompts";

export class FollowUpQuestionsLLM {
    private llmHelper: LLMHelper;

    constructor(llmHelper: LLMHelper) {
        this.llmHelper = llmHelper;
    }

    async generate(context: string, behaviorInstructions?: string): Promise<string> {
        try {
            const message = behaviorInstructions?.trim()
                ? `${behaviorInstructions.trim()}\n\n${context}`
                : context;
            const stream = this.llmHelper.streamChat(message, undefined, undefined, UNIVERSAL_FOLLOW_UP_QUESTIONS_PROMPT);
            let full = "";
            for await (const chunk of stream) full += chunk;
            return full;
        } catch (e) {
            console.error("[FollowUpQuestionsLLM] Failed:", e);
            return "";
        }
    }

    async *generateStream(context: string, behaviorInstructions?: string): AsyncGenerator<string> {
        try {
            const message = behaviorInstructions?.trim()
                ? `${behaviorInstructions.trim()}\n\n${context}`
                : context;
            yield* this.llmHelper.streamChat(message, undefined, undefined, UNIVERSAL_FOLLOW_UP_QUESTIONS_PROMPT);
        } catch (e) {
            console.error("[FollowUpQuestionsLLM] Stream Failed:", e);
        }
    }
}
