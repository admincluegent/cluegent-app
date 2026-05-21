# Cluegent

Cluegent is an open-source desktop AI assistant for permitted meetings, sales calls, learning sessions, technical conversations, rolling transcription, typed prompts, and screenshot-based answers.

Cluegent is intended for lawful, permitted productivity use. Do not use it to violate interview, exam, platform, workplace, school, meeting, consent, privacy, or legal rules.

## What It Does

- Provides a private desktop overlay for live context and quick questions.
- Captures rolling transcript context when listening is enabled.
- Answers typed prompts and shortcut-triggered questions.
- Supports screenshot-aware responses for visible questions, code, slides, and errors.
- Stores recent meeting history locally on the device.
- Supports local resume/reference context for relevant permitted questions.
- Uses Firebase Auth, Firestore usage tracking, Firebase Functions, Razorpay billing, AssemblyAI speech-to-text, OpenAI, DeepSeek, and Gemini.

## Responsible Use

Use Cluegent only where AI assistance, transcription, screenshots, and note-taking are allowed.

You are responsible for:

- obtaining required consent before recording, transcribing, screenshotting, or processing any conversation;
- following applicable laws and local consent requirements;
- following the rules of meeting, workplace, school, assessment, communication, and platform providers;
- reviewing AI output before relying on it;
- not using Cluegent for cheating, fraud, impersonation, deceptive conduct, or prohibited assistance.

See [ACCEPTABLE_USE.md](ACCEPTABLE_USE.md), [TERMS.md](TERMS.md), and [PRIVACY.md](PRIVACY.md).

## Plans And Usage

Free plan:

- 20 AI requests total
- 20 screenshot analyses total
- 30 minutes listening total

Pro plan:

- 30 hours listening per month
- 5,000 AI requests per month
- 2,500 screenshot analyses per month
- first 200 monthly text and screenshot requests route through OpenAI `gpt-4.1-mini`
- fallback text model: DeepSeek
- fallback screenshot model: Gemini

Power plan:

- 50 hours listening per month
- unlimited AI requests
- unlimited screenshot analyses
- first 500 monthly text and screenshot requests route through OpenAI `gpt-4.1-mini`
- fallback text model: DeepSeek
- fallback screenshot model: Gemini

## Local Development

Install dependencies:

```bash
npm install
cd functions
npm install
cd ..
```

Run the desktop app in development:

```bash
npm run dev
```

Build the renderer:

```bash
npm run build -- --mode development
```

Build Firebase Functions:

```bash
cd functions
npm run build
```

## Firebase Setup

Create your own Firebase project before deploying your own instance.

Required backend secrets include:

- `GEMINI_API_KEY`
- `DEEPSEEK_AI_API_KEY`
- `OPENAI_API_KEY`
- `ASSEMBLY_AI_API_KEY`
- `RAZORPAY_TEST_KEY_ID`
- `RAZORPAY_TEST_KEY_SECRET`
- `RAZORPAY_TEST_WEBHOOK_SECRET`
- `RAZORPAY_TEST_ALLOWED_EMAILS`
- `RAZORPAY_TEST_PLAN_PRO_MONTHLY`
- `RAZORPAY_TEST_PLAN_PRO_YEARLY`
- `RAZORPAY_TEST_PLAN_POWER_MONTHLY`
- `RAZORPAY_TEST_PLAN_POWER_YEARLY`

Set secrets with:

```bash
firebase functions:secrets:set SECRET_NAME --project YOUR_FIREBASE_PROJECT_ID
```

Deploy functions:

```bash
npx firebase deploy --only functions --project YOUR_FIREBASE_PROJECT_ID
```

Deploy the website:

```bash
npx firebase deploy --only hosting --project YOUR_FIREBASE_PROJECT_ID
```

## Release Build

The Electron app uses the existing build scripts in `package.json`. Before making a release, verify:

- app build passes;
- Firebase Functions build passes;
- website legal pages match repo legal files;
- usage limits and billing flows are using the intended Firebase project;
- Windows and macOS signing/notarization requirements are handled for the target release.

## Privacy

Cluegent keeps recent meeting history and customization data locally where possible. Backend services process account, subscription, usage, audio, transcript, prompt, and screenshot data only as needed to provide the selected features and enforce plan limits.

For privacy questions or deletion requests, email admincluegent@gmail.com.

## Security

Please do not report vulnerabilities through public GitHub issues. Email security reports to admincluegent@gmail.com.

See [SECURITY.md](SECURITY.md).

## License

Cluegent is distributed under the AGPL-3.0 license. See [LICENSE](LICENSE).

This repository is based on the upstream Natively open-source project and has been adapted for Cluegent branding, Firebase-backed usage tracking, billing, and deployment.
