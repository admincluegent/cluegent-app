import { type CallableRequest } from "firebase-functions/v2/https";
import { db, requireAuth } from "../utils/auth.js";
import { getMonthKey } from "../utils/monthKey.js";
import {
  buildPlanStatus,
  buildSubscriptionDoc,
  buildUsageDoc,
  buildUserProfileDoc,
  buildUserProfileUpdate,
  getUserRefs,
  materializeSubscription,
  materializeUsage,
  serializeForClient,
} from "../utils/usage.js";

export async function getOrCreateUserProfileController(
  request: CallableRequest<unknown>
) {
  const authUser = requireAuth(request);
  const monthKey = getMonthKey();
  const refs = getUserRefs(authUser.uid, monthKey);
  const userRef = db.doc(refs.userPath);
  const subscriptionRef = db.doc(refs.subscriptionPath);
  const usageRef = db.doc(refs.usagePath);
  const profileDoc = buildUserProfileDoc({
    uid: authUser.uid,
    email: authUser.email,
    emailVerified: authUser.emailVerified,
    displayName: authUser.displayName,
    photoURL: authUser.photoURL,
    authTime: authUser.authTime,
  });
  const profileUpdate = buildUserProfileUpdate({
    email: authUser.email,
    emailVerified: authUser.emailVerified,
    displayName: authUser.displayName,
    photoURL: authUser.photoURL,
    authTime: authUser.authTime,
  });

  await db.runTransaction(async (transaction) => {
    const [userSnap, subscriptionSnap, usageSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(subscriptionRef),
      transaction.get(usageRef),
    ]);

    if (!userSnap.exists) {
      transaction.set(userRef, profileDoc);
    } else {
      transaction.update(userRef, profileUpdate);
    }

    if (!subscriptionSnap.exists) {
      transaction.set(subscriptionRef, buildSubscriptionDoc());
    }

    if (!usageSnap.exists) {
      transaction.set(usageRef, buildUsageDoc(monthKey));
    }
  });

  const [userSnap, subscriptionSnap, usageSnap] = await Promise.all([
    userRef.get(),
    subscriptionRef.get(),
    usageRef.get(),
  ]);

  const subscription = materializeSubscription(
    subscriptionSnap.data() as ReturnType<typeof materializeSubscription>
  );
  const usage = materializeUsage(
    usageSnap.data() as ReturnType<typeof materializeUsage>,
    monthKey
  );
  const planStatus = buildPlanStatus(subscription, usage);

  return {
    success: true,
    data: {
      profile: serializeForClient(userSnap.data()),
      subscription: serializeForClient(subscription),
      usage: serializeForClient(usage),
      monthKey,
      planStatus: serializeForClient(planStatus),
    },
  };
}
