import { type CallableRequest } from "firebase-functions/v2/https";
import { db, requireAuth } from "../utils/auth.js";
import { getMonthKey } from "../utils/monthKey.js";
import {
  buildPlanStatus,
  buildSubscriptionDoc,
  buildUsageDoc,
  buildUserProfileDoc,
  getUserRefs,
  materializeSubscription,
  materializeUsage,
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

  await db.runTransaction(async (transaction) => {
    const [userSnap, subscriptionSnap, usageSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(subscriptionRef),
      transaction.get(usageRef),
    ]);

    transaction.set(
      userRef,
      buildUserProfileDoc({
        uid: authUser.uid,
        email: authUser.email,
        emailVerified: authUser.emailVerified,
        displayName: authUser.displayName,
        photoURL: authUser.photoURL,
      }),
      { merge: true }
    );

    if (!subscriptionSnap.exists) {
      transaction.set(subscriptionRef, buildSubscriptionDoc());
    }

    if (!usageSnap.exists) {
      transaction.set(usageRef, buildUsageDoc(monthKey));
    }

    if (userSnap.exists) {
      transaction.update(userRef, {
        updatedAt: buildUserProfileDoc({
          uid: authUser.uid,
          email: authUser.email,
          emailVerified: authUser.emailVerified,
          displayName: authUser.displayName,
          photoURL: authUser.photoURL,
        }).updatedAt,
        lastLoginAt: buildUserProfileDoc({
          uid: authUser.uid,
          email: authUser.email,
          emailVerified: authUser.emailVerified,
          displayName: authUser.displayName,
          photoURL: authUser.photoURL,
        }).lastLoginAt,
      });
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

  return {
    success: true,
    data: {
      profile: userSnap.data(),
      subscription,
      usage,
      monthKey,
      planStatus: buildPlanStatus(subscription, usage),
    },
  };
}
