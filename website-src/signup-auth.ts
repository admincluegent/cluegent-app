// Reuse the desktop application's Firebase account and authentication helpers.
export { auth, functions } from '../src/firebase';
export {
  loginWithGoogle,
  loginWithEmailPassword,
  registerWithEmailPassword,
  consumeGoogleRedirectResult,
  getFirebaseAuthErrorMessage,
} from '../src/lib/firebase/auth';
export { httpsCallable } from 'firebase/functions';
