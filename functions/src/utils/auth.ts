import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { type CallableRequest, HttpsError } from "firebase-functions/v2/https";

const FIRESTORE_DATABASE_ID = "cluegent";

const app = getApps().length ? getApps()[0]! : initializeApp();

export const db = getFirestore(app, FIRESTORE_DATABASE_ID);
export const adminAuth = getAuth(app);

export interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL: string;
  authTime: string | null;
}

function toIsoAuthTime(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function getDisplayNameFromToken(name: unknown, email: unknown): string {
  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }

  if (typeof email === "string" && email.includes("@")) {
    const prefix = email.split("@")[0]?.trim();
    if (prefix) {
      return prefix;
    }
  }

  return "Signed-in user";
}

function toAuthenticatedUser(decodedToken: DecodedIdToken): AuthenticatedUser {
  return {
    uid:
      typeof decodedToken.uid === "string"
        ? decodedToken.uid
        : typeof decodedToken.user_id === "string"
          ? decodedToken.user_id
          : "",
    email: typeof decodedToken.email === "string" ? decodedToken.email : "",
    emailVerified: decodedToken.email_verified === true,
    displayName: getDisplayNameFromToken(decodedToken.name, decodedToken.email),
    photoURL:
      typeof decodedToken.picture === "string" ? decodedToken.picture : "",
    authTime: toIsoAuthTime(decodedToken.auth_time),
  };
}

export function requireAuth(request: CallableRequest<unknown>): AuthenticatedUser {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to call this function."
    );
  }

  const token = request.auth.token;

  return {
    uid: request.auth.uid,
    email: typeof token.email === "string" ? token.email : "",
    emailVerified: token.email_verified === true,
    displayName: getDisplayNameFromToken(token.name, token.email),
    photoURL: typeof token.picture === "string" ? token.picture : "",
    authTime: toIsoAuthTime(token.auth_time),
  };
}

export async function requireBearerAuth(
  authorizationHeader?: string
): Promise<AuthenticatedUser> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new HttpsError(
      "unauthenticated",
      "Missing Firebase ID token in Authorization header."
    );
  }

  const idToken = authorizationHeader.slice("Bearer ".length).trim();

  if (!idToken) {
    throw new HttpsError(
      "unauthenticated",
      "Firebase ID token is empty."
    );
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return toAuthenticatedUser(decodedToken);
  } catch (error) {
    throw new HttpsError(
      "unauthenticated",
      `Invalid Firebase ID token: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
