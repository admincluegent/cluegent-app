# AI Resume Builder

Settings → AI Resume Builder supports importing text-based PDF/DOCX files (up to 10 MB), describing experience, generating an editable resume, choosing 18 templates (Classic, Modern, Elegant, Compact, Executive, Minimal, Professional, Academic, Technical, Editorial, Timeline, Banner, Portfolio, Ribbon, Cards, Ledger, Spotlight, Horizon) and preset/custom accent colors, and saving an A4 PDF with selectable text. Templates include dark/light sidebars, two-column bodies, split headers and section-label columns, a vertical timeline, and traditional single-column layouts. The eye button on each template opens a modal preview using generated content or a sample before generation; choosing a preview does not change the selected template until “Use this template” is clicked. Longer resumes paginate automatically. Scanned PDFs require OCR and are not supported in this version. Legacy `.doc` files are not supported.

Resume generation uses the authenticated `generateResumeAsia` Firebase callable, GPT-6 Luna, and the existing assistant usage reservation and cost accounting. The OpenAI key stays in Firebase Functions. Only extracted text and the description are sent to the AI service; the original file and selected styling are not sent. PDF rendering happens locally in a sandboxed Electron window with network access blocked. Changing styling and exporting require no additional model request.

## Deployment

Build and deploy the new callable before using generation in a released desktop app:

```sh
npm --prefix functions run build
npx firebase-tools deploy --only functions:generateResumeAsia,functions:verifyRazorpayLiveOrderPayment,functions:razorpayLiveWebhook
```

The deployment requires the project's existing OpenAI and live Razorpay secrets and Firebase project configuration. The function is in `asia-south1`, allows up to 120 seconds, and has no configured minimum instances. Resume generation requires an active paid plan with listening time remaining. The 3-hour pack grants 30 successful generations; the 10-hour pack grants 75. Verified hourly top-ups add their allowances and retain prior usage. Monthly, quarterly, and yearly plans have unlimited generations while active. Credits live on the subscription, so hourly allowances do not reset at calendar-month boundaries. Generation is reserved atomically before contacting AI; failed requests restore the resume credit. Existing general assistant usage accounting still applies. Manual editing, styling, previewing, and downloading do not spend resume credits. Free and inactive/expired/exhausted plans cannot generate. The allowance is displayed in Settings and checked again by the server for every request.

## Verification

```sh
npx tsc --noEmit
npm run typecheck:electron
npm --prefix functions run build
npm run build
node scripts/build-electron.js
node scripts/test-resume-builder.cjs
node scripts/test-resume-limits.cjs
```

The last command requires Playwright Chromium, or set `RESUME_TEST_BROWSER` to an installed Chromium-based browser executable. It verifies malformed/oversized data rejection, HTML injection escaping, all template exports, selectable PDF text, pagination, and the UI import/generate/edit/style/download flow with mocked cloud and Electron responses. Live OpenAI generation and native save dialogs need a signed-in desktop smoke test after deployment.

Resume edits remain in memory while switching Settings tabs. Closing/unmounting Settings can discard the draft; there is no automatic permanent storage of resume data in this version.
