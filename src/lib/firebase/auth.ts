import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { auth, firebaseConfig, googleProvider } from "@/firebase";

function isElectronDesktop() {
  return typeof window !== "undefined" && Boolean(window.electronAPI);
}

function shouldFallbackToRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    [
      "auth/popup-blocked",
      "auth/cancelled-popup-request",
      "auth/operation-not-supported-in-this-environment",
    ].includes(error.code)
  );
}

async function loginWithGoogleInSystemBrowser() {
  if (!window.electronAPI?.firebaseAuthStartGoogleSignIn) {
    throw new Error("Electron Google sign-in bridge is not available.");
  }

  const callback = await window.electronAPI.firebaseAuthStartGoogleSignIn(
    firebaseConfig.apiKey
  );

  if (!callback.idToken && !callback.accessToken) {
    throw new Error("Google sign-in did not return a Firebase-compatible token.");
  }

  const credential = callback.idToken
    ? GoogleAuthProvider.credential(callback.idToken)
    : GoogleAuthProvider.credential(null, callback.accessToken);

  try {
    const result = await signInWithCredential(auth, credential);
    return result.user;
  } catch (error) {
    console.error("[FirebaseAuth] signInWithCredential failed", {
      code:
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
          ? error.code
          : undefined,
      message: error instanceof Error ? error.message : String(error),
      usedIdToken: Boolean(callback.idToken),
      usedAccessToken: Boolean(callback.accessToken),
    });
    throw error;
  }
}

export async function loginWithGoogle() {
  if (isElectronDesktop()) {
    return await loginWithGoogleInSystemBrowser();
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    if (shouldFallbackToRedirect(error)) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    throw error;
  }
}

export async function loginWithEmailPassword(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function registerWithEmailPassword(
  email: string,
  password: string
) {
  const result = await createUserWithEmailAndPassword(auth, email, password);

  try {
    await sendEmailVerification(result.user);
  } catch (error) {
    console.warn("[FirebaseAuth] Failed to send verification email", error);
  }

  return result.user;
}

export async function sendPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function resendVerificationEmail() {
  if (!auth.currentUser) {
    throw new Error("No signed-in user is available for email verification.");
  }

  await sendEmailVerification(auth.currentUser);
}

export async function refreshCurrentUser() {
  if (!auth.currentUser) {
    return null;
  }

  await reload(auth.currentUser);
  return auth.currentUser;
}

export async function logout() {
  await signOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function consumeGoogleRedirectResult() {
  if (isElectronDesktop()) {
    return null;
  }

  const result = await getRedirectResult(auth);
  return result?.user ?? null;
}

export function initializeDesktopGoogleAuthBridge() {
  // Electron auth uses an IPC bridge, so there is no renderer bootstrap work.
}

export function getFirebaseAuthErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    switch (error.code) {
      case "auth/popup-closed-by-user":
        return "Google sign-in was canceled before completion.";
      case "auth/popup-blocked":
        return "Popup sign-in was blocked. Try the system browser flow again.";
      case "auth/operation-not-supported-in-this-environment":
        return "This environment does not allow popup sign-in.";
      case "auth/network-request-failed":
        return "Network error while contacting Firebase.";
      case "auth/email-already-in-use":
        return "That email is already in use. Try signing in instead.";
      case "auth/invalid-email":
        return "That email address looks invalid.";
      case "auth/missing-password":
        return "Enter your password to continue.";
      case "auth/invalid-credential":
        return "The email or password is incorrect.";
      case "auth/wrong-password":
        return "The email or password is incorrect.";
      case "auth/user-not-found":
        return "No account was found for that email.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a bit and try again.";
      case "auth/argument-error":
        return "Firebase rejected the Google credential returned by the browser sign-in flow.";
      case "auth/unauthorized-domain":
        return "This app origin is not authorized in Firebase Auth.";
      default:
        break;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Firebase authentication failed.";
}
