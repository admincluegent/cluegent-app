# Plan-based AssemblyAI streaming

The backend returns the stream model and remaining Pro allowance from the existing,
transactional listening usage ledger. Pro hours are part of the plan's listening
balance, not additional hours. Existing usage in the current period counts toward
these thresholds; this does not grant a fresh allowance at deployment.

| Plan | First listening time on Universal-3.6 Pro |
| --- | --- |
| Lifetime free trial | 12 minutes |
| 3-hour pack | 3 hours |
| 10-hour pack | 5 hours |
| Monthly, quarterly, yearly | 10 hours per purchase-date monthly window |

After that, English uses `universal-streaming-english`. Spanish, Portuguese,
German, French and Italian use `universal-streaming-multilingual`; other languages
keep `whisper-rt`. Pro is used only for its documented supported language codes.
Auto Detect retains Whisper's existing broad language coverage. Legacy plans have
no new Pro allowance. Expired/exhausted subscriptions retain existing protections.

Hourly plans use the existing elapsed-session meter, even while listening is
paused. Other plans use the existing listening meter. Microphone and system audio
share the same allowance and are counted once. The backend's 10-second usage
reports update both streams; switching can occur up to one reporting interval
plus network delay after a threshold. A failed report retries its existing receipt
and leaves the current route in place until usage is synchronized.

Changing models requires a new WebSocket. The app requests a final turn from the
old socket, buffers incoming audio, then obtains a fresh token for the new route.
The old socket gets up to one second to drain; transcript history stays in the app.
The new model logs both requested and confirmed models for verification.

## Verification

Run:

```sh
npm --prefix functions run build
npm run typecheck:electron
node --test scripts/test-stt-routing.cjs scripts/test-hourly-usage-meter.cjs scripts/test-hourly-session.cjs scripts/test-listening-balance.cjs
npm run build:electron
```

Tests use mock sockets and deterministic usage scenarios; they do not consume
customer balances or incur provider fees. They cover quota boundaries, monthly
reset and month-end anniversaries, language fallback, dual-stream switching,
retry receipts, queued audio, stop-during-connect, and partial-to-final emission.
Release checks also cover stopping/disabling metering during an in-flight report,
retaining usage when authentication is unavailable, cancelling queued model
switches after stop, and avoiding token retries after allowance exhaustion.

## Test in the existing app

The desktop app keeps the same screens and listening controls. Deploy the backend
changes before testing the rebuilt app against production:

```sh
firebase deploy --only functions:createDeepgramStreamToken,functions:trackSttUsage,functions:trackSttUsageHttp
npm run app:dev
```

The token HTTP endpoint retains its historical Deepgram name. These are the three
existing exported endpoints affected by this change.
The app requires a rebuild/restart; installed release binaries will not change.
A new trial account should show `Confirmed speech model: universal-3-6-pro` in
logs. A 10-hour account with five hours consumed should show
`universal-streaming-english` for English. For a live boundary check use a test
account near its threshold, not a production customer's balance. Verify the
subscription's monthly `usageWindowStart` advances and Pro returns after renewal.
An older deployed backend without `sttRoute` keeps the desktop's previous model
selection until these endpoints are updated.

Provider references:
- https://github.com/AssemblyAI/assemblyai-skill/blob/main/skills/assemblyai/references/streaming.md
