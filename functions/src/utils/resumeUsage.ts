import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { db, type AuthenticatedUser } from './auth.js';
import { ensureUsageDocuments } from '../controllers/usageController.js';
import { buildPlanStatus, getUserRefs, materializeFreeTrialUsage, materializeSubscription, materializeUsage } from './usage.js';
import { getResumeAccess } from './resumeAccess.js';

function period(raw: Record<string, unknown>) { return String(raw.startedAt || raw.orderId || raw.subscriptionId || raw.plan || ''); }
export async function prepareResumeUsage(user: AuthenticatedUser, reserve: boolean) {
  await ensureUsageDocuments(user.uid, user);
  const refs = getUserRefs(user.uid);
  const subscriptionRef = db.doc(refs.subscriptionPath);
  return db.runTransaction(async transaction => {
    const [subscriptionSnap, usageSnap, userSnap] = await Promise.all([
      transaction.get(subscriptionRef), transaction.get(db.doc(refs.usagePath)), transaction.get(db.doc(refs.userPath)),
    ]);
    const raw = subscriptionSnap.data() || {};
    const subscription = materializeSubscription(raw);
    const status = buildPlanStatus(subscription, materializeUsage(usageSnap.data()), materializeFreeTrialUsage(userSnap.data()));
    const access = getResumeAccess({ ...subscription, resumeGenerationsUsed: raw.resumeGenerationsUsed, resumeGenerationsGranted: raw.resumeGenerationsGranted }, status.remaining.sttSeconds);
    if (reserve) {
      if (!access.allowed) throw new HttpsError('failed-precondition', access.message);
      transaction.set(subscriptionRef, {
        resumeGenerationsUsed: access.used + 1,
        ...(access.limit !== null ? { resumeGenerationsGranted: access.limit } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    return { access, period: period(raw) };
  });
}
export async function refundResumeUsage(uid: string, reservationPeriod: string) {
  const ref = db.doc(getUserRefs(uid).subscriptionPath);
  await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    const raw = snap.data() || {};
    if (period(raw) !== reservationPeriod) return;
    const used = typeof raw.resumeGenerationsUsed === 'number' ? raw.resumeGenerationsUsed : 0;
    if (used > 0) transaction.set(ref, { resumeGenerationsUsed: used - 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}
