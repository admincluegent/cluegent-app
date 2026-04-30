import http, {
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { shell } from "electron";

const CALLBACK_HOST = "127.0.0.1";
const CALLBACK_PUBLIC_HOST = "localhost";
const CALLBACK_PORT = 42813;
const DEFAULT_TIMEOUT_MS = 180_000;

type AuthCallbackPayload = {
  callbackUrl: string;
};

export interface FirebaseGoogleSignInResult {
  idToken: string | null;
  accessToken: string | null;
  state: string | null;
}

let activeGoogleSignInPromise: Promise<FirebaseGoogleSignInResult> | null = null;

function buildCallbackHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Return to Cluegent</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, "Segoe UI", sans-serif;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(34, 197, 94, 0.14), transparent 32%),
          linear-gradient(180deg, #050816 0%, #0b1020 100%);
        color: #e5eefb;
      }

      main {
        width: min(92vw, 32rem);
        padding: 2rem;
        border-radius: 24px;
        background: rgba(15, 23, 42, 0.88);
        border: 1px solid rgba(148, 163, 184, 0.18);
        box-shadow: 0 24px 80px rgba(2, 6, 23, 0.45);
      }

      h1 {
        margin: 0 0 0.75rem;
        font-size: 1.6rem;
      }

      p {
        margin: 0;
        line-height: 1.6;
        color: #cbd5e1;
      }

      .status {
        margin-top: 1rem;
        color: #93c5fd;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Google sign-in complete</h1>
      <p id="message">Sending your Firebase session back to Cluegent.</p>
      <p class="status" id="status">You can return to the app once this finishes.</p>
    </main>
    <script>
      const message = document.getElementById("message");
      const status = document.getElementById("status");

      const callbackUrl = new URL(window.location.href);
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash
      );

      for (const [key, value] of hashParams.entries()) {
        callbackUrl.searchParams.set(key, value);
      }

      async function finish() {
        try {
          const response = await fetch("/auth/complete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              callbackUrl: callbackUrl.toString()
            })
          });

          if (!response.ok) {
            throw new Error("The callback handoff failed.");
          }

          if (message) {
            message.textContent = "Your account is connected. Return to Cluegent.";
          }

          if (status) {
            status.textContent = "This tab can stay open or be closed.";
          }
        } catch (error) {
          if (message) {
            message.textContent = "Sign-in finished, but the app did not receive the result.";
          }

          if (status) {
            status.textContent = "Keep this tab open and try the sign-in again from Cluegent.";
          }
        }
      }

      void finish();
    </script>
  </body>
</html>`;
}

function writeResponse(
  res: ServerResponse,
  statusCode: number,
  body: string,
  contentType: string
) {
  res.writeHead(statusCode, {
    "Content-Type": `${contentType}; charset=utf-8`,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

async function readRequestBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function createFirebaseGoogleAuthUri(apiKey: string, continueUri: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providerId: "google.com",
        continueUri,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      errorText
        ? `Failed to start Google sign-in: ${errorText}`
        : "Failed to start Google sign-in."
    );
  }

  const data = (await response.json()) as { authUri?: string };
  if (!data.authUri) {
    throw new Error("Firebase did not return a Google auth URL.");
  }

  return data.authUri;
}

async function waitForAuthCallback(
  server: http.Server,
  timeoutMs: number
): Promise<string> {
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Google sign-in timed out before returning to the app."));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      server.close();
    };

    server.on("request", async (req, res) => {
      try {
        if (!req.url) {
          writeResponse(res, 400, "Bad Request", "text/plain");
          return;
        }

        const url = new URL(req.url, `http://${CALLBACK_PUBLIC_HOST}`);

        if (req.method === "GET" && url.pathname === "/auth/callback") {
          writeResponse(res, 200, buildCallbackHtml(), "text/html");
          return;
        }

        if (req.method === "POST" && url.pathname === "/auth/complete") {
          const body = await readRequestBody(req);
          const payload = JSON.parse(body) as AuthCallbackPayload;

          if (!payload.callbackUrl) {
            writeResponse(
              res,
              400,
              JSON.stringify({ success: false, error: "Missing callbackUrl." }),
              "application/json"
            );
            return;
          }

          writeResponse(
            res,
            200,
            JSON.stringify({ success: true }),
            "application/json"
          );
          cleanup();
          resolve(payload.callbackUrl);
          return;
        }

        writeResponse(res, 404, "Not Found", "text/plain");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Callback handling failed.";
        writeResponse(
          res,
          500,
          JSON.stringify({ success: false, error: message }),
          "application/json"
        );
      }
    });

    server.on("error", (error) => {
      cleanup();
      reject(error);
    });
  });
}

export async function startFirebaseGoogleSignIn(
  apiKey: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  if (!apiKey.trim()) {
    throw new Error("A Firebase API key is required to start Google sign-in.");
  }

  if (activeGoogleSignInPromise) {
    throw new Error("A Google sign-in attempt is already in progress.");
  }

  activeGoogleSignInPromise = (async () => {
    const server = http.createServer();

    await new Promise<void>((resolve, reject) => {
      server.listen(CALLBACK_PORT, CALLBACK_HOST, () => resolve());
      server.once("error", (error) => {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "EADDRINUSE"
        ) {
          reject(
            new Error(
              `Google sign-in callback port ${CALLBACK_PORT} is already in use. Close the app instance using that port and try again.`
            )
          );
          return;
        }

        reject(error);
      });
    });

    const callbackUrl = `http://${CALLBACK_PUBLIC_HOST}:${CALLBACK_PORT}/auth/callback`;
    const authUri = await createFirebaseGoogleAuthUri(apiKey, callbackUrl);

    await shell.openExternal(authUri);

    const callbackResponseUrl = await waitForAuthCallback(server, timeoutMs);
    const parsedCallbackUrl = new URL(callbackResponseUrl);
    const authError = parsedCallbackUrl.searchParams.get("error");
    const authErrorDescription =
      parsedCallbackUrl.searchParams.get("error_description");

    if (authError) {
      throw new Error(authErrorDescription || authError);
    }

    const idToken =
      parsedCallbackUrl.searchParams.get("id_token") ??
      parsedCallbackUrl.searchParams.get("oauthIdToken");
    const accessToken =
      parsedCallbackUrl.searchParams.get("access_token") ??
      parsedCallbackUrl.searchParams.get("oauthAccessToken");
    const returnedKeys = Array.from(parsedCallbackUrl.searchParams.keys());

    console.log(
      "[FirebaseAuthManager] Google callback received params:",
      returnedKeys
    );

    if (!idToken && !accessToken) {
      throw new Error(
        `Google sign-in did not return a usable OAuth token. Returned params: ${returnedKeys.join(", ")}`
      );
    }

    return {
      idToken,
      accessToken,
      state: parsedCallbackUrl.searchParams.get("state"),
    };
  })().finally(() => {
    activeGoogleSignInPromise = null;
  });

  return await activeGoogleSignInPromise;
}
