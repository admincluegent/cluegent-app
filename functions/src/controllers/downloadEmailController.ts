import { buildDownloadEmail } from '../services/downloadEmailTemplate.js';
import { createHash } from 'node:crypto';
import { type CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, db, requireAuth } from '../utils/auth.js';

export async function sendDesktopDownloadEmailController(
  request: CallableRequest<unknown>, apiKey: string, from: string
) {
  const authUser = requireAuth(request);
  // Resolve the recipient from Firebase, never from client-provided email fields.
  const user = await adminAuth.getUser(authUser.uid);
  if (!user.email) throw new HttpsError('failed-precondition', 'Your account needs an email address.');
  const key = createHash('sha256').update(`${user.uid}:${user.email}`).digest('hex');
  const ref = db.collection('desktop_download_emails').doc(key);
  const claim = await db.runTransaction(async transaction => {
    const data = (await transaction.get(ref)).data();
    if (data?.sentAt) return 'sent';
    if (data?.leaseUntil > Date.now()) return 'pending';
    transaction.set(ref, { uid: user.uid, leaseUntil: Date.now() + 180000 }, { merge: true });
    return 'claimed';
  });
  if (claim === 'sent') return { sent: true };
  if (claim === 'pending') throw new HttpsError('resource-exhausted', 'Email is being sent. Please retry shortly.');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `desktop-download/${key}` },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        from, to: [user.email], ...buildDownloadEmail(),
      }),
    });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
    const result = await response.json() as { id?: string };
    if (!result.id) throw new Error('Email provider did not confirm acceptance');
    await ref.set({ sentAt: FieldValue.serverTimestamp(), providerId: result.id, leaseUntil: 0 }, { merge: true });
    return { sent: true };
  } catch (error) {
    await ref.set({ leaseUntil: 0 }, { merge: true });
    console.error('Desktop download email failed', error instanceof Error ? error.message : 'Unknown error');
    throw new HttpsError('unavailable', 'Could not send your download email. Please retry.');
  }
}
