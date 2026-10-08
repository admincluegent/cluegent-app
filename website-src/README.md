Mobile signup uses the same Firebase helpers and project as the desktop app. Run `npm run website:build-auth` after changing those helpers or Firebase public config. Only allowlisted Firebase public values enter the browser bundle; provider secrets never do.

Before releasing:
1. Set `RESEND_API_KEY` in Firebase Secret Manager (`firebase functions:secrets:set RESEND_API_KEY`). Verify the sender domain in Resend. Configure `DOWNLOAD_EMAIL_FROM` in the functions environment if a different verified sender is needed.
2. Allow `www.cluegent.com` (and any other production website domains) in Firebase Authentication authorized domains. Set the Google OAuth authorized redirect URI to `https://www.cluegent.com/__/auth/handler`. Firebase Hosting provides that same-origin helper. For another host, set `WEBSITE_AUTH_DOMAIN` when building and configure that host's auth helper and OAuth redirect URI.
3. Deploy `functions:sendDesktopDownloadEmail` and Hosting together after building auth. The success screen appears only after the email provider accepts the email; actual inbox placement depends on the provider.

Email records are server-only in the named `cluegent` database. Recipient comes from Firebase Admin, with one download email per account/email and provider idempotency for retries. Update the email's Mac release URLs alongside website release links.
