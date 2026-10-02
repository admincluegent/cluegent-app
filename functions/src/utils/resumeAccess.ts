export interface ResumeAccess {
  allowed: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  message: string;
}
export function getResumeAccess(subscription: { plan: string; status: string; expiresAt?: unknown; resumeGenerationsGranted?: unknown; resumeGenerationsUsed?: unknown }, listeningSecondsRemaining: number, now = Date.now()): ResumeAccess {
  const hourlyLimit = subscription.plan === 'hour3' ? 30 : subscription.plan === 'hour10' ? 75 : null;
  const paid = ['hour3', 'hour10', 'monthly200', 'quarterly200', 'annual200', 'plus', 'pro', 'power'].includes(subscription.plan);
  const limit = hourlyLimit === null ? null : (typeof subscription.resumeGenerationsGranted === 'number' && Number.isFinite(subscription.resumeGenerationsGranted) ? Math.max(0, Math.floor(subscription.resumeGenerationsGranted)) : hourlyLimit);
  const used = typeof subscription.resumeGenerationsUsed === 'number' && Number.isFinite(subscription.resumeGenerationsUsed) ? Math.max(0, Math.floor(subscription.resumeGenerationsUsed)) : 0;
  const remaining = limit === null ? null : Math.max(0, limit - used);
  const expiresAt = typeof subscription.expiresAt === 'string' ? new Date(subscription.expiresAt).getTime() : NaN;
  let message = '';
  if (!paid) message = 'Subscribe to use AI Resume Builder. Resume generation is not available on the free trial.';
  else if (subscription.status !== 'active' || (Number.isFinite(expiresAt) && expiresAt <= now)) message = 'Your plan has expired or is inactive. Please subscribe to use AI Resume Builder.';
  else if (listeningSecondsRemaining <= 0) message = 'Your plan has been used up. Please subscribe or add hours to use AI Resume Builder.';
  else if (remaining === 0) message = 'Your AI resume generation limit has been reached. Please subscribe or buy another plan to generate more resumes.';
  return { allowed: !message, limit, used, remaining, message };
}

export function getResumePurchaseAllocation(plan: string, previous: { plan?: unknown; resumeGenerationsGranted?: unknown; resumeGenerationsUsed?: unknown }, hourlyTopup: boolean) {
  const allowance = plan === 'hour3' ? 30 : plan === 'hour10' ? 75 : null;
  const previousDefault = previous.plan === 'hour3' ? 30 : previous.plan === 'hour10' ? 75 : 0;
  const priorGranted = typeof previous.resumeGenerationsGranted === 'number' && Number.isFinite(previous.resumeGenerationsGranted) ? Math.max(0, previous.resumeGenerationsGranted) : previousDefault;
  const priorUsed = typeof previous.resumeGenerationsUsed === 'number' && Number.isFinite(previous.resumeGenerationsUsed) ? Math.max(0, previous.resumeGenerationsUsed) : 0;
  return { resumeGenerationsGranted: allowance === null ? null : allowance + (hourlyTopup ? priorGranted : 0), resumeGenerationsUsed: hourlyTopup ? priorUsed : 0 };
}
