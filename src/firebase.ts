import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

export const firestoreDatabaseId = "cluegent";

export const firebaseConfig = {
  apiKey: "AIzaSyD9BdMzNt3f2GM_VY50p1rgQ9NE3ki5gDQ",
  authDomain: "cluegent-2514d.firebaseapp.com",
  projectId: "cluegent-2514d",
  storageBucket: "cluegent-2514d.firebasestorage.app",
  messagingSenderId: "668074615998",
  appId: "1:668074615998:web:e3bdf7a3ea47e536d7aaef",
};

export const app = initializeApp(firebaseConfig);

function isElectronDesktop() {
  return typeof window !== "undefined" && Boolean((window as { electronAPI?: unknown }).electronAPI);
}

export const auth = isElectronDesktop()
  ? initializeAuth(app, {
      persistence: browserLocalPersistence,
    })
  : getAuth(app);

export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, firestoreDatabaseId);
export const functions = getFunctions(app, "us-central1");

export default app;
