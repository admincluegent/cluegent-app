/** Pro is the first portion of the existing listening allowance, not extra hours.
 * Usage windows are supplied by buildPlanStatus (lifetime trial, purchased pack,
 * or purchase-date monthly window, including quarterly/yearly subscriptions).
 */
export const PRO_STT_MODEL = 'universal-3-6-pro';
const PRO_LANGUAGES = new Set('af ar yue ca da nl en et fi fr gl de he hi it ja ko zh mr no nn fa pt ro ru es sv tr ur vi xh zu'.split(' '));
const UNIVERSAL_LANGUAGES = new Set(['es', 'pt', 'de', 'fr', 'it']);
const PRO_SECONDS: Record<string, number> = {
  free: 12 * 60,
  hour3: 3 * 3600,
  hour10: 5 * 3600,
  monthly200: 10 * 3600,
  quarterly200: 10 * 3600,
  annual200: 10 * 3600,
};

export function getProSttSecondsRemaining(status: {
  plan: string;
  usage: { sttSecondsUsed: number };
  freeTrialUsage: { sttSecondsUsed: number };
  remaining: { sttSeconds: number };
}): number {
  const used = status.plan === 'free' ? status.freeTrialUsage.sttSecondsUsed : status.usage.sttSecondsUsed;
  return Math.max(0, Math.min((PRO_SECONDS[status.plan] ?? 0) - used, status.remaining.sttSeconds));
}

export function getSttRoute(language: string, proSecondsRemaining: number) {
  const fallbackSpeechModel = language === 'en' ? 'universal-streaming-english'
    : UNIVERSAL_LANGUAGES.has(language) ? 'universal-streaming-multilingual' : 'whisper-rt';
  // Preserve Auto Detect's existing 99+ language coverage rather than narrowing it.
  const proSpeechModel = PRO_LANGUAGES.has(language) ? PRO_STT_MODEL : null;
  return {
    speechModel: proSpeechModel && proSecondsRemaining > 0 ? proSpeechModel : fallbackSpeechModel,
    proSpeechModel,
    fallbackSpeechModel,
    proSecondsRemaining,
  };
}
