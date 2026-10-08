import { appleDownloadIcon, windowsDownloadIcon } from './emailPlatformIcons.js';

const windows = 'https://apps.microsoft.com/detail/9NXWZPN07THN';
const appleSilicon = 'https://github.com/admincluegent/cluegent-app/releases/download/v1.0.13/Cluegent-1.0.13-arm64.dmg';
const intel = 'https://github.com/admincluegent/cluegent-app/releases/download/v1.0.13/Cluegent-1.0.13.dmg';

export function buildDownloadEmail() {
  const subject = 'Your Cluegent download links + quick start guide';
  const text = `Hi there,

Your Cluegent account is ready.

Open this email on your computer and download Cluegent for your device.

1. Download Cluegent

Windows: ${windows}
Mac (Apple Silicon — M-series): ${appleSilicon}
Mac (Intel): ${intel}

2. Sign in

Open Cluegent and sign in using the same email address or Google account you used on our website. Follow the app’s permission prompts to complete setup.

3. Try Cluegent

There are several ways to ask Cluegent for help:

• Speak: Turn on Start Listening, speak your question, then click Answer.
• System audio: Play a video, meeting, or other audio on your computer. Cluegent can listen to the audio context, then click Answer to get a response.
• Type: Enter any question in the prompt box and click Answer.
• Screenshot: Capture your screen and ask a question. Cluegent can use what’s visible on the screen to help explain code, errors, questions, or other content.

You can also press Ctrl + Enter on Windows or Command + Enter on Mac to submit.

4. Make answers relevant to you

Go to Settings → Customize to add your resume, adjust response styles, and create quick actions for prompts you use often.

We recommend trying a short practice session first so you can get familiar with listening, typing, and screen capture.

— Team Cluegent`;
  const paragraph = 'margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;';
  const heading = 'margin:28px 0 12px;color:#0f172a;font-size:18px;line-height:1.4;font-weight:700;';
  const download = (href: string, label: string, icon: string) => `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 10px;width:100%;"><tr><td style="border:1px solid #dbeafe;border-radius:10px;background:#eff6ff;"><a href="${href}" style="display:block;padding:14px 18px;color:#1d4ed8;font-size:15px;font-weight:600;text-decoration:none;"><img src="cid:${icon}" alt="" width="18" height="18" style="display:inline-block;vertical-align:middle;margin-right:10px;border:0;">${label}&nbsp; ↓</a></td></tr></table>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${subject}</title></head><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your download links and four simple steps to get started with Cluegent.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;"><tr><td style="padding:28px 24px;">
<p style="margin:0 0 28px;color:#0f172a;font-size:22px;font-weight:700;letter-spacing:-.6px;">Cluegent</p>
<p style="${paragraph}">Hi there,</p><p style="${paragraph}">Your Cluegent account is ready.</p><p style="${paragraph}">Open this email on your computer and download Cluegent for your device.</p>
<h2 style="${heading}">1. Download Cluegent</h2>
${download(windows, 'Download for Windows', 'windows-download')}
${download(appleSilicon, 'Download for Mac — Apple Silicon (M-series)', 'apple-download')}
${download(intel, 'Download for Mac — Intel', 'apple-download')}
<h2 style="${heading}">2. Sign in</h2><p style="${paragraph}">Open Cluegent and sign in using the same email address or Google account you used on our website. Follow the app’s permission prompts to complete setup.</p>
<h2 style="${heading}">3. Try Cluegent</h2><p style="${paragraph}">There are several ways to ask Cluegent for help:</p>
<ul style="margin:0 0 16px;padding-left:20px;color:#475569;font-size:15px;line-height:1.7;">
<li style="margin-bottom:12px;"><strong style="color:#0f172a;">Speak:</strong> Turn on <strong>Start Listening</strong>, speak your question, then click <strong>Answer</strong>.</li>
<li style="margin-bottom:12px;"><strong style="color:#0f172a;">System audio:</strong> Play a video, meeting, or other audio on your computer. Cluegent can listen to the audio context, then click <strong>Answer</strong> to get a response.</li>
<li style="margin-bottom:12px;"><strong style="color:#0f172a;">Type:</strong> Enter any question in the prompt box and click <strong>Answer</strong>.</li>
<li style="margin-bottom:12px;"><strong style="color:#0f172a;">Screenshot:</strong> Capture your screen and ask a question. Cluegent can use what’s visible on the screen to help explain code, errors, questions, or other content.</li></ul>
<p style="${paragraph}">You can also press <strong>Ctrl + Enter</strong> on Windows or <strong>Command + Enter</strong> on Mac to submit.</p>
<h2 style="${heading}">4. Make answers relevant to you</h2><p style="${paragraph}">Go to <strong>Settings → Customize</strong> to add your resume, adjust response styles, and create quick actions for prompts you use often.</p>
<p style="${paragraph}">We recommend trying a short practice session first so you can get familiar with listening, typing, and screen capture.</p>
<p style="margin:24px 0 0;color:#0f172a;font-size:15px;line-height:1.7;">— <strong>Team Cluegent</strong></p>
</td></tr></table></td></tr></table></body></html>`;
  return {
    subject, text, html,
    attachments: [
      { filename: 'windows.png', content: windowsDownloadIcon, content_id: 'windows-download' },
      { filename: 'apple.png', content: appleDownloadIcon, content_id: 'apple-download' },
    ],
  };
}
