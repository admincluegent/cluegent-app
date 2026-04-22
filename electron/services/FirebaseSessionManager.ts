export class FirebaseSessionManager {
  private static instance: FirebaseSessionManager | null = null;

  private idToken: string | null = null;

  public static getInstance() {
    if (!FirebaseSessionManager.instance) {
      FirebaseSessionManager.instance = new FirebaseSessionManager();
    }

    return FirebaseSessionManager.instance;
  }

  public setIdToken(idToken: string | null) {
    this.idToken = idToken?.trim() || null;
    console.log(
      `[FirebaseSessionManager] ${this.idToken ? "Stored" : "Cleared"} Firebase ID token`
    );
  }

  public getIdToken() {
    return this.idToken;
  }
}
