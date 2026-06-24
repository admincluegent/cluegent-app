import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const websiteDir = join(rootDir, "website");
const siteUrl = "https://www.cluegent.com";
const ga4MeasurementId = "G-CCH0Y2SN4G";
const downloadUrl = "https://apps.microsoft.com/detail/9NXWZPN07THN";
const generatedDate = "2026-06-23";
const defaultImage = "/assets/how-to-use-01.png";

const productLinks = [
  ["AI Interview Assistant", "/ai-interview-assistant/"],
  ["AI Interview Assistant India", "/ai-interview-assistant-india/"],
  ["AI Interview Assistant for Freshers", "/ai-interview-assistant-for-freshers/"],
  ["AI Interview Assistant for Zoom", "/ai-interview-assistant-for-zoom/"],
  ["AI Interview Assistant for Google Meet", "/ai-interview-assistant-for-google-meet/"],
  ["AI Interview Assistant for Teams", "/ai-interview-assistant-for-teams/"],
  ["Coding Interview Assistant", "/coding-interview-assistant/"],
  ["Private Overlay", "/undetectable-ai-interview-assistant/"],
  ["AI Meeting Assistant", "/ai-meeting-assistant/"],
  ["Pricing", "/pricing/"],
  ["Download", "/download/"],
];

const resourceLinks = [
  ["How to Use", "/how-to-use-cluegent/"],
  ["Blog", "/blog/"],
  ["Alternatives", "/alternatives/"],
  ["Privacy", "/privacy.html"],
  ["Terms", "/terms.html"],
];

const sharedFaq = [
  {
    q: "What is Cluegent?",
    a: "Cluegent is a customizable Windows desktop AI assistant for live interviews, meetings, coding screens, and screen workflows. It listens when you start it, keeps rolling context, and shows private responses on your desktop.",
  },
  {
    q: "Does Cluegent join my meeting?",
    a: "No. Cluegent runs as a desktop app and does not join as a meeting participant or install a browser extension into the call.",
  },
  {
    q: "Which platforms does Cluegent work with?",
    a: "Cluegent is designed for desktop workflows across Google Meet, Zoom, Microsoft Teams, Slack Huddles, coding editors, browsers, and document windows.",
  },
  {
    q: "Can I customize how Cluegent answers?",
    a: "Yes. In Settings, the Customize section lets you add resume context, tune listening responses, screen responses, and typed prompt responses, and manage quick action buttons for common prompts.",
  },
  {
    q: "Is the private overlay a guarantee against every detection method?",
    a: "No. Cluegent is designed to stay out of standard screen capture behavior, but users are responsible for following laws, platform rules, workplace policies, school policies, and interview rules.",
  },
];

const landingPages = [
  {
    slug: "ai-interview-assistant",
    title: "AI Interview Assistant for Live Calls | Cluegent",
    description:
      "Cluegent is a private AI interview assistant for real-time answers, coding help, screenshot-aware support, and live interview context on Windows desktop.",
    kicker: "AI interview assistant",
    h1: "Private AI Interview Assistant for Live Calls",
    lede:
      "Use Cluegent during permitted live interviews to keep context, structure answers, and handle coding or screen-based questions without switching tabs.",
    image: defaultImage,
    primaryCta: "Download Cluegent",
    secondaryCta: "Compare alternatives",
    secondaryHref: "/alternatives/",
    bullets: [
      "Real-time interview context from live audio when listening is enabled.",
      "Typed prompts and quick actions for follow-up questions.",
      "Screenshot-aware responses for coding problems, errors, and visual prompts.",
      "Private desktop overlay designed to stay out of standard screen capture.",
      "Resume context and custom response behavior from Settings.",
    ],
    sections: [
      {
        title: "Built for the moments where preparation gets messy",
        text: "Interview pressure usually comes from timing: the question is live, the context is moving, and you need a clear answer fast. Cluegent keeps the active transcript, typed prompt, and screenshot context in one desktop assistant so you can respond with structure instead of scrambling.",
      },
      {
        title: "Interview answers that stay grounded in context",
        text: "Cluegent can help summarize the question, propose a direct answer, give an example, shorten a response, or explain a tradeoff. You stay in control of when listening starts and when a prompt is submitted.",
      },
      {
        title: "Customize Cluegent before the interview",
        text: "In Settings, open Customize to add your resume as context, define how Cluegent should answer listening requests, screen questions, and typed prompts, and create quick action buttons for repeated interview moves.",
      },
      {
        title: "Use it responsibly",
        text: "Cluegent should be used only where AI assistance, transcription, screenshotting, and recording are allowed. Always follow the rules of the interview, employer, platform, school, and jurisdiction.",
      },
    ],
    comparisonRows: [
      ["Live audio context", "Yes, when listening is enabled", "Not usually"],
      ["Screen or code screenshots", "Built in", "Manual copy-paste"],
      ["Private desktop workflow", "Desktop overlay", "Browser tabs"],
      ["Meeting notes after calls", "Local meeting history", "Usually separate tools"],
    ],
    related: [
      ["/coding-interview-assistant/", "AI coding interview assistant"],
      ["/ai-interview-assistant-india/", "AI interview assistant India"],
      ["/ai-interview-assistant-for-freshers/", "AI interview assistant for freshers"],
      ["/ai-interview-assistant-for-zoom/", "AI interview assistant for Zoom"],
      ["/ai-interview-assistant-for-google-meet/", "AI interview assistant for Google Meet"],
      ["/ai-interview-assistant-for-teams/", "AI interview assistant for Teams"],
      ["/undetectable-ai-interview-assistant/", "Private overlay for screen sharing"],
      ["/blog/how-to-use-ai-interview-assistant-live-interviews/", "How to use AI interview assistants"],
    ],
  },
  {
    slug: "ai-interview-assistant-india",
    title: "AI Interview Assistant India | Cluegent",
    description:
      "Cluegent is an AI interview assistant for India with real-time interview answers, coding help, resume-aware context, and a private desktop overlay for Zoom, Meet, and Teams.",
    kicker: "AI interview assistant India",
    h1: "AI Interview Assistant for India",
    lede:
      "Cluegent helps Indian job seekers, freshers, and developers stay structured during permitted live interviews with resume-aware answers, coding support, screenshot context, and private desktop workflows.",
    image: defaultImage,
    primaryCta: "Try Cluegent free",
    secondaryCta: "Read India guide",
    secondaryHref: "/blog/best-ai-interview-assistants-india/",
    bullets: [
      "Built for live interview workflows across Zoom, Google Meet, and Microsoft Teams.",
      "Resume-aware answers for freshers, developers, and experienced candidates.",
      "Screenshot-aware coding help for visible problems, errors, and technical screens.",
      "Private desktop overlay designed to stay out of standard screen sharing.",
      "Useful for software, product, support, analyst, and technical interview practice.",
    ],
    sections: [
      {
        title: "Why India candidates search for live AI interview help",
        text: "Many Indian candidates face fast-paced interviews, coding rounds, English communication pressure, and back-to-back hiring processes. Cluegent is positioned for candidates who need structure, examples, and context while staying inside the desktop workflow.",
      },
      {
        title: "How Cluegent helps during Indian hiring rounds",
        text: "Use live listening for permitted calls, add your resume for context, submit typed prompts for direct questions, and attach screenshots when a code problem, system design diagram, or error is visible on screen.",
      },
      {
        title: "Affordability and plan clarity",
        text: "Cluegent shows plan details inside the app and keeps pricing visible on the website. Candidates can start free, test the workflow, and upgrade only if the assistant fits their interview preparation and live-call needs.",
      },
      {
        title: "Responsible use matters",
        text: "Use Cluegent only where AI assistance, transcription, screenshot capture, and desktop overlays are permitted by the interviewer, employer, platform, school, and local law.",
      },
    ],
    comparisonRows: [
      ["India interview use cases", "Freshers, developers, technical rounds", "Generic global copy"],
      ["Resume context", "Built into customization", "Often separate"],
      ["Coding screenshots", "Built in", "Manual copy-paste"],
      ["Meeting platforms", "Zoom, Google Meet, Teams", "Varies"],
    ],
    related: [
      ["/ai-interview-assistant-for-freshers/", "AI interview assistant for freshers"],
      ["/coding-interview-assistant/", "Coding interview assistant"],
      ["/chiku-ai-alternative/", "Chiku AI alternative"],
      ["/blog/best-ai-interview-assistants-india/", "Best AI interview assistants in India"],
    ],
  },
  {
    slug: "ai-interview-assistant-for-freshers",
    title: "AI Interview Assistant for Freshers | Cluegent",
    description:
      "Cluegent helps freshers answer live interview questions with resume context, STAR structure, coding help, examples, and private desktop assistance.",
    kicker: "Freshers interview assistant",
    h1: "AI Interview Assistant for Freshers",
    lede:
      "Cluegent helps freshers turn resume details, projects, internships, coursework, and coding practice into clearer live interview answers.",
    image: defaultImage,
    primaryCta: "Start free",
    secondaryCta: "Read freshers guide",
    secondaryHref: "/blog/ai-interview-assistant-for-freshers/",
    bullets: [
      "Add resume context so answers can reference your projects and skills.",
      "Use quick actions for examples, clarification, and follow-up answers.",
      "Structure behavioral answers with STAR-style responses.",
      "Attach coding screens when a technical question is visible.",
      "Practice responsibly before using Cluegent in permitted live calls.",
    ],
    sections: [
      {
        title: "Freshers often need structure more than long answers",
        text: "First job interviews are stressful because candidates may know the concept but struggle to frame it clearly. Cluegent helps turn raw context into a concise answer, example, or follow-up point.",
      },
      {
        title: "Resume-aware context for projects and internships",
        text: "Add your resume in Customize so Cluegent can keep your projects, skills, coursework, and internship experience in mind when you ask for answer structure.",
      },
      {
        title: "Coding, HR, and behavioral interviews",
        text: "Use screenshot mode for coding questions, listening mode for permitted live context, and typed prompts for HR or behavioral questions where a short structured answer is useful.",
      },
      {
        title: "Use it as support, not replacement",
        text: "Freshers should prepare fundamentals first. Cluegent is best used to organize what you know and reduce blank moments, not to fake knowledge.",
      },
    ],
    comparisonRows: [
      ["Resume-aware answers", "Yes", "Generic AI answers"],
      ["STAR support", "Quick prompts", "Manual prep"],
      ["Coding support", "Screenshot-aware", "Copy-paste"],
      ["Freshers focus", "Dedicated workflow", "Broad tools"],
    ],
    related: [
      ["/ai-interview-assistant-india/", "AI interview assistant India"],
      ["/blog/star-method-behavioral-interview-questions/", "STAR behavioral answers"],
      ["/blog/ai-interview-assistant-for-freshers/", "Freshers guide"],
      ["/pricing/", "Pricing"],
    ],
  },
  {
    slug: "ai-interview-assistant-for-zoom",
    title: "AI Interview Assistant for Zoom Interviews | Cluegent",
    description:
      "Use Cluegent as a private AI interview assistant for permitted Zoom interviews with live context, resume-aware answers, coding screenshots, and typed prompts.",
    kicker: "Zoom interview assistant",
    h1: "AI Interview Assistant for Zoom Interviews",
    lede:
      "Cluegent runs as a desktop assistant outside the meeting participant list, helping with permitted Zoom interviews through live context, typed prompts, and screenshot-aware support.",
    image: defaultImage,
    primaryCta: "Try Cluegent for Zoom",
    secondaryCta: "Compare alternatives",
    secondaryHref: "/alternatives/",
    bullets: [
      "Designed for desktop workflows alongside Zoom.",
      "Does not join the call as a meeting participant.",
      "Private overlay designed to stay out of standard screen sharing.",
      "Supports resume-aware and screenshot-aware answers.",
      "Useful for HR, behavioral, technical, and coding Zoom interviews.",
    ],
    sections: [
      {
        title: "Why Zoom interviews need fast context",
        text: "Zoom interviews move quickly between introductions, behavioral questions, coding prompts, and follow-up constraints. Cluegent keeps the relevant context close so you can request a structured answer without leaving the desktop workflow.",
      },
      {
        title: "How Cluegent works with Zoom",
        text: "Start Cluegent before the call, place the overlay where it is comfortable, use listening only where permitted, and submit typed or screenshot prompts when you need direct help.",
      },
      {
        title: "Private overlay language",
        text: "Cluegent is designed to stay out of standard screen capture, but users should always check Zoom settings, interview rules, and any monitoring requirements before use.",
      },
    ],
    comparisonRows: [
      ["Zoom participant", "No", "Meeting bot"],
      ["Live context", "User-controlled", "Post-call notes"],
      ["Screenshot help", "Yes", "Manual"],
      ["Resume context", "Yes", "Generic"],
    ],
    related: [
      ["/ai-interview-assistant-for-google-meet/", "Google Meet interview assistant"],
      ["/ai-interview-assistant-for-teams/", "Teams interview assistant"],
      ["/blog/best-ai-interview-assistant-for-zoom/", "Zoom interview guide"],
      ["/download/", "Download"],
    ],
  },
  {
    slug: "ai-interview-assistant-for-google-meet",
    title: "AI Interview Assistant for Google Meet | Cluegent",
    description:
      "Cluegent helps with permitted Google Meet interviews using live interview context, typed prompts, coding screenshot support, and resume-aware desktop answers.",
    kicker: "Google Meet interview assistant",
    h1: "AI Interview Assistant for Google Meet",
    lede:
      "Use Cluegent beside Google Meet for permitted interviews where you want live context, quick answer structure, resume-aware prompts, and screenshot-aware coding support.",
    image: defaultImage,
    primaryCta: "Try Cluegent for Google Meet",
    secondaryCta: "Read Meet guide",
    secondaryHref: "/blog/best-ai-interview-assistant-for-google-meet/",
    bullets: [
      "Desktop assistant workflow for Google Meet interviews.",
      "Resume-aware context for project and experience answers.",
      "Screenshot-aware support for coding screens and visual prompts.",
      "Quick actions for examples, clarification, and follow-up questions.",
      "Private overlay designed to stay out of standard screen sharing.",
    ],
    sections: [
      {
        title: "Google Meet interviews often mix voice and screen",
        text: "Candidates may need to answer spoken questions, explain projects, solve visible code, or react to screen-shared prompts. Cluegent supports those workflows with listening, typed prompt, and screenshot modes.",
      },
      {
        title: "How to prepare before the Meet call",
        text: "Test Cluegent before the interview, add resume context, choose response style, and verify that your intended use is allowed by the interviewer and platform rules.",
      },
      {
        title: "Use concise answers",
        text: "For live interviews, Cluegent is most useful when answers are short, structured, and easy to speak. Customize listening responses and typed responses for your preferred style.",
      },
    ],
    comparisonRows: [
      ["Google Meet workflow", "Desktop assistant", "Browser tab switching"],
      ["Live answer structure", "Yes", "Manual"],
      ["Code screenshots", "Yes", "Manual"],
      ["Quick actions", "Customizable", "Generic prompts"],
    ],
    related: [
      ["/ai-interview-assistant-for-zoom/", "Zoom interview assistant"],
      ["/ai-interview-assistant-for-teams/", "Teams interview assistant"],
      ["/blog/best-ai-interview-assistant-for-google-meet/", "Google Meet guide"],
      ["/ai-interview-assistant-india/", "AI interview assistant India"],
    ],
  },
  {
    slug: "ai-interview-assistant-for-teams",
    title: "AI Interview Assistant for Microsoft Teams | Cluegent",
    description:
      "Use Cluegent during permitted Microsoft Teams interviews for live answers, resume-aware context, screenshot coding help, and private desktop assistance.",
    kicker: "Microsoft Teams interview assistant",
    h1: "AI Interview Assistant for Microsoft Teams",
    lede:
      "Cluegent supports permitted Microsoft Teams interviews with a private desktop assistant for live context, typed prompts, coding screens, and resume-aware answers.",
    image: defaultImage,
    primaryCta: "Try Cluegent for Teams",
    secondaryCta: "Download Cluegent",
    secondaryHref: "/download/",
    bullets: [
      "Works beside Microsoft Teams as a desktop assistant.",
      "Use live listening only where transcription and AI assistance are allowed.",
      "Attach screenshots for coding rounds, diagrams, and visible prompts.",
      "Customize answer behavior for HR, coding, and technical interviews.",
      "Keep Cluegent out of the meeting participant list.",
    ],
    sections: [
      {
        title: "Teams interviews need a desktop-first workflow",
        text: "Many corporate interviews happen on Microsoft Teams, especially technical, consulting, support, and enterprise roles. Cluegent keeps help in a movable desktop overlay while you stay focused on the call.",
      },
      {
        title: "Good for enterprise-style interviews",
        text: "Use typed prompts for direct questions, quick actions for clarification, and screenshots when the interview includes shared technical content or coding tasks.",
      },
      {
        title: "Stay compliant",
        text: "Teams environments may include company policies and security controls. Use Cluegent only when AI assistance and capture features are permitted.",
      },
    ],
    comparisonRows: [
      ["Teams participant", "No", "Meeting bot"],
      ["Technical interview support", "Screenshots and prompts", "Manual"],
      ["Resume context", "Customizable", "Generic"],
      ["Responsible-use controls", "Clear disclaimer", "Varies"],
    ],
    related: [
      ["/ai-interview-assistant-for-zoom/", "Zoom interview assistant"],
      ["/ai-interview-assistant-for-google-meet/", "Google Meet interview assistant"],
      ["/coding-interview-assistant/", "Coding interview assistant"],
      ["/pricing/", "Pricing"],
    ],
  },
  {
    slug: "coding-interview-assistant",
    title: "Coding Interview Assistant for Live Technical Rounds | Cluegent",
    description:
      "Use Cluegent for coding interviews with screenshot-aware code help, visible error analysis, live transcript context, and private desktop guidance.",
    kicker: "Coding interview assistant",
    h1: "AI Coding Interview Assistant for Technical Screens",
    lede:
      "Cluegent helps with live coding questions, visible errors, algorithm prompts, React problems, and follow-up explanations from one desktop overlay.",
    image: "/assets/how-to-use-08.png",
    primaryCta: "Get coding support",
    secondaryCta: "Read coding guide",
    secondaryHref: "/blog/ai-interview-assistant-coding-interviews/",
    bullets: [
      "Attach the visible screen with a shortcut when the problem is on screen.",
      "Ask for approach, complexity, edge cases, debugging help, or a concise explanation.",
      "Use live transcript hints when the interviewer adds constraints verbally.",
      "Keep the response in the same movable overlay while you work in your editor.",
      "Customize coding responses for explanations, complexity, debugging, or concise spoken answers.",
    ],
    sections: [
      {
        title: "Designed for code, not just conversation",
        text: "Technical interviews often mix spoken prompts, coding editors, platform UIs, and follow-up constraints. Cluegent combines screenshot context and transcript context so the assistant can respond to what is visible and what was said.",
      },
      {
        title: "Explain while you solve",
        text: "Ask Cluegent for a plan, a cleaner implementation, test cases, time complexity, or a short spoken explanation. The goal is to support your thinking and communication, not replace the fundamentals you need for the role.",
      },
      {
        title: "Tune coding support to your role",
        text: "Add resume context and customize screenshot responses so Cluegent can explain code in the style you need: concise, detailed, interviewer-facing, debugging-focused, or complexity-focused.",
      },
    ],
    comparisonRows: [
      ["Screenshot code context", "Yes", "Limited"],
      ["Algorithm explanation", "Yes", "Depends"],
      ["Follow-up prompt support", "Yes", "Manual"],
      ["Editor-friendly overlay", "Yes", "No"],
    ],
    related: [
      ["/blog/react-interview-questions-with-answers/", "React interview questions"],
      ["/blog/javascript-coding-interview-questions/", "JavaScript coding questions"],
      ["/blog/system-design-interview-questions-beginners/", "System design questions"],
      ["/blog/how-to-use-ai-during-coding-interview/", "How to use AI during coding interviews"],
      ["/ai-interview-assistant-india/", "AI interview assistant India"],
    ],
  },
  {
    slug: "undetectable-ai-interview-assistant",
    title: "Private AI Interview Overlay for Screen Sharing | Cluegent",
    description:
      "Cluegent provides a private desktop overlay designed to stay out of standard screen capture while helping with permitted interviews and meetings.",
    kicker: "Private overlay",
    h1: "Private AI Interview Overlay for Screen Sharing",
    lede:
      "Cluegent is built for desktop workflows where you need live context and a private response surface while using Zoom, Meet, Teams, editors, or browsers.",
    image: "/assets/privacy-controls-showcase.png",
    primaryCta: "Download private overlay",
    secondaryCta: "Read screen sharing guide",
    secondaryHref: "/blog/ai-interview-assistant-screen-sharing/",
    bullets: [
      "Movable desktop overlay with listening, typing, and screenshot modes.",
      "Designed to stay out of standard screen capture behavior.",
      "Does not join meetings as a participant.",
      "Requires user responsibility for consent, rules, and permitted use.",
      "Separate customization for listening, screen, and typed prompt responses.",
    ],
    sections: [
      {
        title: "Privacy-first desktop workflow",
        text: "Cluegent is not a meeting bot and does not appear in the participant list. You start the desktop assistant, place it where it is comfortable, and control when listening or screenshot analysis is used.",
      },
      {
        title: "Important limitation",
        text: "No product can guarantee invisibility against every monitoring, proctoring, security, or platform control. Cluegent's private overlay language refers to standard screen capture behavior, and users must comply with all applicable rules.",
      },
      {
        title: "Your response style stays configurable",
        text: "The private overlay is only one part of the workflow. Cluegent also lets you customize listening behavior, screen responses, typed prompt responses, resume context, and quick actions from Settings.",
      },
    ],
    comparisonRows: [
      ["Meeting participant bot", "No", "Often yes"],
      ["Browser extension required", "No", "Sometimes"],
      ["Standard screen capture avoidance", "Designed for it", "Varies"],
      ["User-controlled capture", "Yes", "Varies"],
    ],
    related: [
      ["/ai-interview-assistant/", "AI interview assistant"],
      ["/blog/ai-interview-assistant-screen-sharing/", "Screen sharing guide"],
      ["/terms.html#acceptable-use", "Acceptable use"],
    ],
  },
  {
    slug: "ai-meeting-assistant",
    title: "AI Meeting Assistant for Live Notes and Answers | Cluegent",
    description:
      "Cluegent is an AI meeting assistant for live transcription, real-time answers, screenshot-aware context, and local meeting history.",
    kicker: "AI meeting assistant",
    h1: "AI Meeting Assistant for Live Notes and Answers",
    lede:
      "Use Cluegent for permitted meetings where you want rolling context, fast answers, useful local notes, and a private assistant that stays in your desktop workflow.",
    image: "/assets/meetingnotesimage.png",
    primaryCta: "Use Cluegent for meetings",
    secondaryCta: "How it works",
    secondaryHref: "/how-to-use-cluegent/",
    bullets: [
      "Start and stop listening when you choose.",
      "Ask live follow-ups from transcript, typed prompt, or screenshot context.",
      "Review saved local meeting history after the call.",
      "Works across common desktop meeting and collaboration apps.",
      "Custom response behavior and quick actions for recurring meeting workflows.",
    ],
    sections: [
      {
        title: "During the call, not only after",
        text: "Most meeting tools summarize after the call. Cluegent helps during the call by keeping rolling context close to your workflow and answering when you submit a prompt.",
      },
      {
        title: "Useful for sales, learning, support, and technical discussions",
        text: "The same live context workflow can support customer calls, classes, technical debugging, brainstorming, and interviews where the use is permitted.",
      },
      {
        title: "Customize meeting answers",
        text: "Use the Customize settings to shape how Cluegent answers listening prompts, typed prompts, and screen prompts. Quick action buttons can turn repeated workflows into one-click prompts.",
      },
    ],
    comparisonRows: [
      ["Live answers", "Yes", "Usually post-call only"],
      ["Local meeting history", "Yes", "Varies"],
      ["Screenshot context", "Yes", "Rare"],
      ["Private desktop overlay", "Yes", "No"],
    ],
    related: [
      ["/how-to-use-cluegent/", "How to use Cluegent"],
      ["/ai-interview-assistant/", "Interview assistant"],
      ["/download/", "Download"],
    ],
  },
  {
    slug: "how-to-use-cluegent",
    title: "How to Use Cluegent | Live AI Interview Assistant Guide",
    description:
      "Learn how to start Cluegent, move the private overlay, use listening mode, type prompts, attach screenshots, and review meeting context.",
    kicker: "Product guide",
    h1: "How to Use Cluegent in Live Interviews and Meetings",
    lede:
      "A practical guide to launching Cluegent, using listening mode, asking typed prompts, attaching screenshots, and keeping your workflow private.",
    image: "/assets/how-to-use-01.png",
    primaryCta: "Watch walkthrough",
    secondaryCta: "Download Cluegent",
    secondaryHref: "/download/",
    bullets: [
      "Start Cluegent before the call and switch to the private overlay.",
      "Use Start listening only when live audio context is needed.",
      "Submit with Ctrl + Enter or Command + Enter on macOS.",
      "Attach the visible screen when code, errors, or visual questions matter.",
      "Add resume context and tune listening, screen, and typed responses in Customize.",
    ],
    sections: [
      {
        title: "1. Start the desktop assistant",
        text: "Open Cluegent before the meeting or interview starts, enable private overlay mode, and keep the assistant ready while you work in your call, browser, editor, or document.",
      },
      {
        title: "2. Choose the input mode",
        text: "Use listening for live conversation context, typed prompts for direct questions, and screenshot mode when the problem or error is visible on screen.",
      },
      {
        title: "3. Review what happened later",
        text: "After a session, Cluegent can keep local meeting history so you can revisit transcript snippets, prompts, screenshots, and answers.",
      },
    ],
    comparisonRows: [
      ["Start listening", "Live audio context"],
      ["Typed prompt", "Direct questions"],
      ["Screenshot", "Visible code or screen context"],
      ["Recent meetings", "Local review after the call"],
    ],
    related: [
      ["/how-to-use.html", "Full video walkthrough"],
      ["/ai-interview-assistant/", "AI interview assistant"],
      ["/ai-meeting-assistant/", "AI meeting assistant"],
    ],
  },
  {
    slug: "pricing",
    title: "Cluegent Pricing | AI Interview Assistant Download",
    description:
      "Cluegent pricing and download options for real-time interview help, coding support, private overlay workflows, and AI meeting assistance.",
    kicker: "Pricing",
    h1: "Cluegent Pricing and Download Options",
    lede:
      "Start with the Microsoft Store download and choose the plan shown inside the Cluegent app for your live interview and meeting workflow.",
    image: defaultImage,
    primaryCta: "Download from Microsoft Store",
    secondaryCta: "Compare tools",
    secondaryHref: "/alternatives/",
    bullets: [
      "Windows desktop app available from Microsoft Store.",
      "Plan limits and active subscription details are shown in the app.",
      "Use the privacy, terms, and refund pages before purchasing.",
      "Contact support for billing questions.",
      "Customization includes resume context, response behavior, and quick actions.",
    ],
    sections: [
      {
        title: "What the plan includes",
        text: "Cluegent focuses on live AI assistance: real-time transcription, typed prompts, screenshot-aware responses, local meeting history, resume-aware context, quick actions, and configurable answer behavior.",
      },
      {
        title: "Before you buy",
        text: "Review the Terms of Service, Privacy Policy, and acceptable-use language. Use Cluegent only where AI assistance and capture features are allowed.",
      },
    ],
    comparisonRows: [
      ["Desktop app", "Included"],
      ["Live listening", "Plan limits apply"],
      ["Screenshot answers", "Plan limits apply"],
      ["Billing support", "admincluegent@gmail.com"],
    ],
    related: [
      ["/download/", "Download Cluegent"],
      ["/terms.html#refund-cancellation", "Refund and cancellation"],
      ["/privacy.html", "Privacy policy"],
    ],
  },
  {
    slug: "download",
    title: "Download Cluegent | Private AI Interview Assistant for Windows",
    description:
      "Download Cluegent for Windows to use a private AI interview assistant with real-time answers, coding help, screenshot context, and meeting support.",
    kicker: "Download",
    h1: "Download Cluegent for Windows",
    lede:
      "Install Cluegent from the Microsoft Store and use a private desktop assistant for permitted interviews, meetings, coding rounds, and screen workflows.",
    image: "/assets/mainui.png",
    primaryCta: "Open Microsoft Store",
    secondaryCta: "How to use Cluegent",
    secondaryHref: "/how-to-use-cluegent/",
    bullets: [
      "Windows desktop support through Microsoft Store.",
      "Private overlay for live calls and desktop workflows.",
      "Listening, typed prompt, and screenshot modes.",
      "Works with common meeting, browser, editor, and document workflows.",
    ],
    sections: [
      {
        title: "Install and sign in",
        text: "Download Cluegent, open the desktop app, sign in, and check the app settings before your first permitted live session.",
      },
      {
        title: "Prepare before the call",
        text: "Test listening, overlay placement, shortcuts, and screenshot mode in a safe environment before using Cluegent in an important workflow.",
      },
    ],
    comparisonRows: [
      ["Microsoft Store", "Windows download"],
      ["Private overlay", "Desktop workflow"],
      ["Support", "admincluegent@gmail.com"],
      ["Setup guide", "Available"],
    ],
    related: [
      [downloadUrl, "Microsoft Store"],
      ["/how-to-use-cluegent/", "Setup guide"],
      ["/ai-interview-assistant/", "AI interview assistant"],
    ],
  },
];

const alternatives = [
  {
    slug: "lockedin-ai",
    rootSlug: "lockedin-ai-alternative",
    blogSlug: "cluegent-vs-lockedin-ai",
    competitor: "LockedIn AI",
    alternativeTitle: "LockedIn AI Alternative | Cluegent",
    alternativeH1: "LockedIn AI Alternative",
    title: "Cluegent vs LockedIn AI | AI Interview Assistant Alternative",
    description:
      "Compare Cluegent and LockedIn AI for live interview assistance, coding help, private desktop workflows, meeting support, and responsible use.",
    positioning:
      "LockedIn AI is a broad career platform. Cluegent is a focused desktop assistant for live interview, coding, screenshot, and meeting workflows.",
    rows: [
      ["Product focus", "Desktop live assistant", "Career platform and interview copilot"],
      ["Screenshot-aware code help", "Built into Cluegent workflow", "Available in parts of the platform"],
      ["Meeting notes", "Local meeting history", "Post-session reports"],
      ["Setup path", "Microsoft Store desktop app", "Web and desktop options"],
    ],
  },
  {
    slug: "final-round-ai",
    rootSlug: "final-round-ai-alternative",
    blogSlug: "cluegent-vs-final-round-ai",
    competitor: "Final Round AI",
    alternativeTitle: "Final Round AI Alternative | Cluegent",
    alternativeH1: "Final Round AI Alternative",
    title: "Cluegent vs Final Round AI | Interview Copilot Alternative",
    description:
      "Compare Cluegent and Final Round AI for real-time interview help, coding support, private overlay workflows, and interview preparation.",
    positioning:
      "Final Round AI has a large interview prep ecosystem. Cluegent is a lean desktop overlay for live context, screenshots, and meeting workflows.",
    rows: [
      ["Primary strength", "Live desktop context", "Interview prep ecosystem"],
      ["Coding screen support", "Screenshot-aware", "Copilot-focused"],
      ["Meeting use cases", "Interview and meeting workflows", "Mostly interview and prep"],
      ["Best fit", "Users who want a simple desktop assistant", "Users who want a larger prep suite"],
    ],
  },
  {
    slug: "parakeet-ai",
    rootSlug: "parakeet-ai-alternative",
    blogSlug: "cluegent-vs-parakeet-ai",
    competitor: "ParakeetAI",
    alternativeTitle: "Parakeet AI Alternative | Cluegent",
    alternativeH1: "Parakeet AI Alternative",
    title: "Cluegent vs ParakeetAI | AI Interview Assistant Alternative",
    description:
      "Compare Cluegent and ParakeetAI for private AI interview assistance, coding interview support, platform compatibility, and live meeting help.",
    positioning:
      "ParakeetAI emphasizes interview assistance and privacy demos. Cluegent adds a direct desktop workflow with screenshots, typed prompts, and local meeting history.",
    rows: [
      ["Private overlay", "Desktop overlay", "Desktop privacy positioning"],
      ["Coding context", "Screenshot and transcript context", "Coding interview support"],
      ["Meeting notes", "Local meeting history", "AI notes"],
      ["Workflow", "Windows app from Microsoft Store", "Web and desktop workflow"],
    ],
  },
  {
    slug: "chiku-ai",
    rootSlug: "chiku-ai-alternative",
    blogSlug: "cluegent-vs-chiku-ai",
    competitor: "Chiku AI",
    alternativeTitle: "Chiku AI Alternative | Cluegent",
    alternativeH1: "Chiku AI Alternative",
    title: "Cluegent vs Chiku AI | AI Interview Assistant Alternative",
    description:
      "Compare Cluegent and Chiku AI for AI interview assistance, India-friendly positioning, private desktop support, coding help, and meeting workflows.",
    positioning:
      "Chiku AI has a strong India/value positioning. Cluegent focuses on a private desktop workflow for interviews, coding screens, and meetings.",
    rows: [
      ["Market angle", "Desktop productivity and interview assistant", "India-focused interview assistant"],
      ["Coding support", "Screenshot-aware code help", "Coding interview support"],
      ["Meeting workflows", "Built into product story", "Interview-first positioning"],
      ["Responsible-use language", "Legal and acceptable-use pages", "Legal pages available"],
    ],
  },
];

const blogPosts = [
  {
    slug: "best-ai-interview-assistants-india",
    title: "Best AI Interview Assistants in India | Cluegent",
    description:
      "Compare the best AI interview assistants in India for freshers, developers, coding interviews, Google Meet, Zoom, Teams, pricing, and private desktop workflows.",
    h1: "Best AI Interview Assistants in India",
    summary:
      "Indian candidates need tools that handle live interview pressure, coding screens, resume context, affordability, and common platforms like Google Meet, Zoom, and Teams.",
    sections: [
      ["What Indian candidates should compare", "Look for real-time answer quality, coding screenshot support, resume-aware context, pricing in India, platform compatibility, setup speed, and clear responsible-use policies."],
      ["Where Cluegent fits", "Cluegent is a desktop AI interview assistant for job seekers and developers who want live transcript context, typed prompts, screenshot-aware coding help, resume context, and quick actions."],
      ["Best use cases", "Cluegent is strongest for permitted live interviews, technical screens, freshers preparing their first answers, and developers who need structured explanations under time pressure."],
      ["What to avoid", "Avoid relying on any tool as a replacement for preparation. Also avoid products that make absolute invisibility claims without explaining responsible use and platform limitations."],
    ],
    links: [["/ai-interview-assistant-india/", "AI interview assistant India"], ["/chiku-ai-alternative/", "Chiku AI alternative"], ["/ai-interview-assistant-for-freshers/", "Freshers interview assistant"]],
  },
  {
    slug: "ai-interview-assistant-for-freshers",
    title: "AI Interview Assistant for Freshers | Cluegent Guide",
    description:
      "A practical guide for freshers using an AI interview assistant for resume-aware answers, project explanations, HR questions, STAR responses, and coding screens.",
    h1: "AI Interview Assistant for Freshers",
    summary:
      "Freshers usually do not need longer answers. They need structure, confidence, project context, and a way to avoid blank moments during live interviews.",
    sections: [
      ["Start with resume context", "Add your resume before the interview so answers can reference projects, internships, coursework, skills, and tools you actually know."],
      ["Use STAR for behavioral answers", "For HR and behavioral questions, ask for Situation, Task, Action, and Result structure so the answer sounds specific instead of generic."],
      ["Use screenshots for technical screens", "If a coding problem or error is visible, screenshot-aware support can explain the approach, complexity, edge cases, and debugging steps."],
      ["Practice before the real call", "Freshers should test shortcuts, overlay placement, response style, and platform behavior before any important interview."],
    ],
    links: [["/ai-interview-assistant-for-freshers/", "Freshers landing page"], ["/blog/star-method-behavioral-interview-questions/", "STAR answers"], ["/coding-interview-assistant/", "Coding interview assistant"]],
  },
  {
    slug: "how-to-use-ai-during-coding-interview",
    title: "How to Use AI During a Coding Interview | Cluegent",
    description:
      "Learn how to use AI responsibly during permitted coding interviews for approach, debugging, screenshots, complexity analysis, and spoken explanations.",
    h1: "How to Use AI During a Coding Interview",
    summary:
      "AI support is most useful in coding interviews when it helps you structure the approach, explain tradeoffs, debug visible code, and communicate clearly.",
    sections: [
      ["Use AI for structure first", "Ask for the brute force approach, optimized approach, edge cases, time complexity, and a short explanation you can speak naturally."],
      ["Use screenshots when code is visible", "When the editor, problem, test failure, or stack trace is on screen, screenshot context is faster and less error-prone than retyping everything."],
      ["Do not skip fundamentals", "You still need to understand data structures, language behavior, complexity, and debugging. Use Cluegent to organize thinking, not to replace it."],
      ["Stay within interview rules", "Only use AI assistance, transcription, or screenshots when the hiring process allows it."],
    ],
    links: [["/coding-interview-assistant/", "Coding interview assistant"], ["/blog/javascript-coding-interview-questions/", "JavaScript coding questions"], ["/blog/react-interview-questions-with-answers/", "React questions"]],
  },
  {
    slug: "best-ai-interview-assistant-for-google-meet",
    title: "Best AI Interview Assistant for Google Meet | Cluegent",
    description:
      "Choose an AI interview assistant for Google Meet interviews with live context, resume-aware answers, coding screenshots, private desktop overlay, and responsible use.",
    h1: "Best AI Interview Assistant for Google Meet",
    summary:
      "For Google Meet interviews, the best assistant should work beside the call, handle live context, support screenshots, and avoid forcing tab switching.",
    sections: [
      ["What matters on Google Meet", "Candidates need quick answer structure, screen support for technical prompts, resume context, and a workflow that does not join the meeting as a participant."],
      ["How Cluegent fits", "Cluegent runs as a desktop app, supports listening when permitted, typed prompts, screenshot answers, quick actions, and private overlay behavior."],
      ["Before using it", "Test Google Meet, your OS, overlay placement, microphone, shortcuts, and allowed use before any important call."],
    ],
    links: [["/ai-interview-assistant-for-google-meet/", "Google Meet interview assistant"], ["/ai-interview-assistant-for-zoom/", "Zoom assistant"], ["/download/", "Download"]],
  },
  {
    slug: "best-ai-interview-assistant-for-zoom",
    title: "Best AI Interview Assistant for Zoom Interviews | Cluegent",
    description:
      "Choose an AI interview assistant for Zoom interviews with real-time context, resume-aware answers, private desktop overlay, and screenshot coding help.",
    h1: "Best AI Interview Assistant for Zoom Interviews",
    summary:
      "Zoom interviews reward fast, clear answers. A good AI assistant should support live context, screenshots, and concise spoken responses without joining as a participant.",
    sections: [
      ["What to look for", "Prioritize desktop workflow, setup speed, private overlay language, transcript context, screenshot support, and customization for short spoken answers."],
      ["Where Cluegent helps", "Cluegent supports permitted Zoom workflows with live listening, typed prompts, screenshot-aware code help, resume context, and quick action buttons."],
      ["Use responsibly", "Check Zoom settings, interviewer rules, and platform policy before using any AI, audio capture, or screenshot feature."],
    ],
    links: [["/ai-interview-assistant-for-zoom/", "Zoom interview assistant"], ["/ai-interview-assistant-for-google-meet/", "Google Meet assistant"], ["/alternatives/", "Compare alternatives"]],
  },
  {
    slug: "cluegent-vs-parakeet-ai",
    title: "Cluegent vs Parakeet AI | AI Interview Assistant Comparison",
    description:
      "Compare Cluegent and Parakeet AI for real-time interview answers, coding support, screen sharing privacy, customization, and desktop workflows.",
    h1: "Cluegent vs Parakeet AI",
    summary:
      "Parakeet AI has strong real-time interview positioning. Cluegent focuses on a customizable desktop workflow with resume context, screenshots, quick actions, and local meeting support.",
    sections: [
      ["Choose Cluegent if", "You want a desktop assistant with typed prompts, screenshot-aware code help, resume-aware context, quick actions, and meeting workflows."],
      ["Compare the workflow", "Test how fast each tool starts, how answers are submitted, how screenshots work, and whether the assistant fits your Zoom, Meet, or Teams workflow."],
      ["Evaluate privacy language", "Look for careful wording about standard screen sharing and responsible use instead of absolute promises."],
    ],
    links: [["/parakeet-ai-alternative/", "Parakeet AI alternative"], ["/alternatives/parakeet-ai/", "Full comparison"], ["/ai-interview-assistant/", "AI interview assistant"]],
  },
  {
    slug: "cluegent-vs-chiku-ai",
    title: "Cluegent vs Chiku AI | AI Interview Assistant Comparison",
    description:
      "Compare Cluegent and Chiku AI for India-focused AI interview assistance, pricing, coding support, private desktop workflows, and live meeting help.",
    h1: "Cluegent vs Chiku AI",
    summary:
      "Chiku AI is visible in India-focused AI interview searches. Cluegent competes with desktop workflow, customization, screenshot support, and resume-aware answers.",
    sections: [
      ["India search intent", "Candidates in India often compare pricing, setup speed, supported platforms, coding help, and whether the product works for freshers."],
      ["Where Cluegent fits", "Cluegent helps with permitted live interviews, resume context, screenshot coding help, typed prompts, quick actions, and Zoom/Meet/Teams workflows."],
      ["What to test", "Compare answer quality, customization, platform behavior, pricing clarity, support, and responsible-use terms."],
    ],
    links: [["/chiku-ai-alternative/", "Chiku AI alternative"], ["/alternatives/chiku-ai/", "Full comparison"], ["/ai-interview-assistant-india/", "AI interview assistant India"]],
  },
  {
    slug: "cluegent-vs-final-round-ai",
    title: "Cluegent vs Final Round AI | AI Interview Assistant Comparison",
    description:
      "Compare Cluegent and Final Round AI for live interview assistance, interview prep, coding help, private desktop workflows, and candidate use cases.",
    h1: "Cluegent vs Final Round AI",
    summary:
      "Final Round AI is known for a broader interview prep ecosystem. Cluegent is positioned as a focused desktop assistant for live interview and meeting workflows.",
    sections: [
      ["Different product shapes", "Final Round AI is closer to a larger prep platform. Cluegent focuses on live context, screenshot support, typed prompts, and desktop overlay workflows."],
      ["Choose Cluegent if", "You need a simple live assistant for permitted interviews, coding rounds, resume-aware answers, quick actions, and local meeting context."],
      ["Choose broader prep if", "You want many pre-interview resources, question banks, and company prep pages before the live call."],
    ],
    links: [["/final-round-ai-alternative/", "Final Round AI alternative"], ["/alternatives/final-round-ai/", "Full comparison"], ["/blog/best-ai-interview-assistants-2026/", "Best AI interview assistants"]],
  },
  {
    slug: "best-ai-interview-assistants-2026",
    title: "Best AI Interview Assistants in 2026 | Cluegent Guide",
    description:
      "A practical 2026 guide to choosing an AI interview assistant for live answers, coding interviews, screen sharing, privacy, and responsible use.",
    h1: "Best AI Interview Assistants in 2026",
    summary:
      "The best AI interview assistant depends on your workflow: live answers, coding help, private overlay behavior, customization, resume context, prep tools, or meeting notes.",
    sections: [
      ["What to look for", "Prioritize live context quality, setup speed, screenshot support, clear privacy language, platform compatibility, customization, and responsible-use controls."],
      ["Where Cluegent fits", "Cluegent is best for people who want a focused desktop assistant for live calls, coding screens, screenshot-aware prompts, resume context, quick actions, and meeting notes."],
      ["How to compare tools", "Compare exact use case, not only pricing. A broad interview prep platform and a private desktop assistant solve different problems."],
    ],
    links: [["/ai-interview-assistant/", "AI interview assistant"], ["/alternatives/", "Compare alternatives"]],
  },
  {
    slug: "how-to-use-ai-interview-assistant-live-interviews",
    title: "How to Use an AI Interview Assistant During Live Interviews",
    description:
      "Learn how to use an AI interview assistant during live interviews with setup checks, resume context, response customization, prompts, and follow-up workflows.",
    h1: "How to Use an AI Interview Assistant During Live Interviews",
    summary:
      "Use AI interview assistants as structure and context support, not as a substitute for preparation, honesty, or role knowledge.",
    sections: [
      ["Prepare before the interview", "Test your desktop app, microphone, shortcuts, overlay placement, screenshot flow, resume context, and response settings before the real call."],
      ["Use concise prompts", "Ask for structure, examples, tradeoffs, or shorter answers. Good prompts keep answers usable under pressure."],
      ["Stay responsible", "Only use AI assistance where it is allowed. Check interview rules and platform requirements before capturing audio or screen content."],
    ],
    links: [["/how-to-use-cluegent/", "How to use Cluegent"], ["/terms.html#acceptable-use", "Acceptable use"]],
  },
  {
    slug: "ai-interview-assistant-coding-interviews",
    title: "AI Interview Assistant for Coding Interviews | What Matters",
    description:
      "A coding interview guide for using AI support with visible problems, screenshots, debugging, complexity analysis, and follow-up explanations.",
    h1: "AI Interview Assistant for Coding Interviews",
    summary:
      "Coding interviews need more than generic answers. The assistant must understand visible code, spoken constraints, and the explanation you need to give.",
    sections: [
      ["Use screen context", "When a problem, stack trace, or editor is visible, screenshot-aware support can be faster than manual copy-paste."],
      ["Ask for the reasoning", "Prompt for approach, edge cases, complexity, and tradeoffs so you can explain the solution clearly."],
      ["Practice fundamentals", "AI support cannot replace data structures, debugging skill, or system design fundamentals. Use resume context, screenshot context, and custom response settings to organize what you already understand."],
    ],
    links: [["/coding-interview-assistant/", "Coding interview assistant"], ["/blog/javascript-coding-interview-questions/", "JavaScript questions"]],
  },
  {
    slug: "ai-interview-assistant-screen-sharing",
    title: "Does AI Interview Help Work With Screen Sharing?",
    description:
      "Understand how private overlays, screen sharing, capture behavior, and responsible-use limits apply to AI interview assistants.",
    h1: "Does AI Interview Help Work With Screen Sharing?",
    summary:
      "Some desktop overlays are designed to stay out of standard screen capture, but no tool should be treated as a universal invisibility guarantee.",
    sections: [
      ["Standard screen capture is not every detection method", "A private overlay may avoid normal screen sharing, but proctoring tools, platform controls, or workplace monitoring can behave differently."],
      ["Test in a safe environment", "Before an important call, test the exact app, OS, sharing mode, and meeting platform you plan to use."],
      ["Follow the rules", "Do not use AI assistance where it is prohibited. Responsible use protects you and everyone in the conversation."],
    ],
    links: [["/undetectable-ai-interview-assistant/", "Private overlay"], ["/terms.html", "Terms"]],
  },
  {
    slug: "ai-interview-copilot-vs-interview-prep-tool",
    title: "AI Interview Copilot vs Interview Prep Tool",
    description:
      "Learn the difference between AI interview copilots, mock interview tools, resume prep products, and live desktop interview assistants.",
    h1: "AI Interview Copilot vs Interview Prep Tool",
    summary:
      "Prep tools help before the interview. A live interview copilot helps during the call. Strong candidates often need both.",
    sections: [
      ["Prep tools", "Mock interviews, question banks, resume reviews, and STAR practice help you improve before the live round starts."],
      ["Live copilots", "Live copilots help with active context, answer structure, follow-up prompts, and coding or screen questions during the call."],
      ["Best workflow", "Use prep first, then live support only for permitted contexts where the main problem is pressure, structure, or recall."],
    ],
    links: [["/ai-interview-assistant/", "Live AI interview assistant"], ["/blog/best-ai-interview-assistants-2026/", "Best AI interview assistants"]],
  },
  {
    slug: "star-method-behavioral-interview-questions",
    title: "How to Answer Behavioral Interview Questions With STAR",
    description:
      "Use the STAR method to answer behavioral interview questions with structure, specifics, measurable impact, and natural delivery.",
    h1: "How to Answer Behavioral Interview Questions With STAR",
    summary:
      "STAR stands for Situation, Task, Action, Result. It keeps behavioral answers specific without turning them into long speeches.",
    sections: [
      ["Situation", "Give enough context for the interviewer to understand the stakes, but keep it short."],
      ["Task and action", "Explain what you owned and what you actually did. Avoid making the whole answer about the team if the question asks about you."],
      ["Result", "End with measurable impact, learning, or what changed because of your action."],
    ],
    links: [["/ai-interview-assistant/", "AI interview assistant"], ["/blog/how-to-use-ai-interview-assistant-live-interviews/", "Live interview guide"]],
  },
  {
    slug: "system-design-interview-questions-beginners",
    title: "System Design Interview Questions for Beginners",
    description:
      "Beginner-friendly system design interview questions with answer structure for scale, APIs, storage, caching, queues, and tradeoffs.",
    h1: "System Design Interview Questions for Beginners",
    summary:
      "System design interviews reward clear constraints, tradeoffs, and communication more than memorizing one perfect architecture.",
    sections: [
      ["Common questions", "Design a URL shortener, chat app, news feed, file storage system, rate limiter, or notification system."],
      ["Answer structure", "Clarify requirements, estimate scale, define APIs, choose storage, discuss cache and queues, then call out bottlenecks."],
      ["What interviewers listen for", "They want to hear assumptions, tradeoffs, failure modes, and why your design matches the constraints."],
    ],
    links: [["/coding-interview-assistant/", "Coding interview assistant"], ["/blog/ai-interview-assistant-coding-interviews/", "Coding interview AI guide"]],
  },
  {
    slug: "react-interview-questions-with-answers",
    title: "React Interview Questions With Answers",
    description:
      "Practice React interview questions on hooks, state, props, effects, rendering, performance, keys, and component architecture.",
    h1: "React Interview Questions With Answers",
    summary:
      "React interviews usually test fundamentals: state flow, rendering behavior, hooks, effects, performance, and component design.",
    sections: [
      ["Hooks", "Be ready to explain useState, useEffect, useMemo, useCallback, refs, and when not to overuse memoization."],
      ["Rendering", "Understand keys, reconciliation, controlled components, prop changes, and why state updates can batch."],
      ["Performance", "Talk about list virtualization, splitting components, avoiding unnecessary effects, and measuring before optimizing."],
    ],
    links: [["/coding-interview-assistant/", "Coding interview assistant"], ["/blog/javascript-coding-interview-questions/", "JavaScript interview questions"]],
  },
  {
    slug: "javascript-coding-interview-questions",
    title: "JavaScript Coding Interview Questions",
    description:
      "Practice JavaScript coding interview questions covering arrays, objects, promises, closures, async code, and common algorithm patterns.",
    h1: "JavaScript Coding Interview Questions",
    summary:
      "JavaScript coding interviews combine language details with algorithm basics and practical debugging.",
    sections: [
      ["Core language", "Practice closures, scope, this binding, prototypes, equality, modules, and event loop behavior."],
      ["Async JavaScript", "Know promises, async/await, timers, microtasks, cancellation patterns, and error handling."],
      ["Coding patterns", "Practice maps, sets, two pointers, sliding windows, recursion, sorting, and tree traversal."],
    ],
    links: [["/coding-interview-assistant/", "Coding interview assistant"], ["/blog/react-interview-questions-with-answers/", "React questions"]],
  },
  {
    slug: "cluegent-vs-lockedin-ai",
    title: "Cluegent vs LockedIn AI",
    description:
      "Compare Cluegent and LockedIn AI for live interview assistance, desktop overlays, coding help, meeting support, and user-controlled workflows.",
    h1: "Cluegent vs LockedIn AI",
    summary:
      "Cluegent is a focused desktop assistant. LockedIn AI is a broader interview and career platform.",
    sections: [
      ["Choose Cluegent if", "You want a simple desktop assistant for live context, typed prompts, screenshots, coding help, resume context, quick actions, and meeting notes."],
      ["Choose a larger platform if", "You want a full career ecosystem with many prep tools, resume tools, and broader job-search workflows."],
      ["Compare responsibly", "Look beyond snippets. Test setup, privacy language, support, reliability, and whether the tool matches your actual interview format."],
    ],
    links: [["/alternatives/lockedin-ai/", "Full comparison"], ["/ai-interview-assistant/", "AI interview assistant"]],
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function absolute(path) {
  if (path.startsWith("http")) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function nav(activePath = "") {
  const links = [
    ["Product", "/ai-interview-assistant/"],
    ["Coding", "/coding-interview-assistant/"],
    ["Pricing", "/pricing/"],
    ["Blog", "/blog/"],
    ["Download", "/download/"],
  ];
  return `
    <header class="site-header">
      <a class="brand" href="/" aria-label="Cluegent home">
        <span class="brand-icon"><img src="/assets/icon.png" alt="Cluegent logo" /></span>
        <span>Cluegent</span>
      </a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open navigation">
        <span></span><span></span>
      </button>
      <nav class="site-nav" id="site-nav">
        ${links
          .map(([label, href]) => `<a href="${href}"${activePath === href ? ' aria-current="page"' : ""}>${label}</a>`)
          .join("")}
        <a class="nav-button" href="${downloadUrl}">Get Cluegent</a>
      </nav>
    </header>`;
}

function footer() {
  return `
    <footer class="site-footer">
      <div class="footer-brand">
        <span class="brand-icon"><img src="/assets/icon.png" alt="" /></span>
        <strong>Cluegent</strong>
        <p>Private AI interview and meeting assistance for real-time answers, coding support, screenshots, and desktop context.</p>
      </div>
      <div class="footer-grid">
        <div>
          <h3>Product</h3>
          ${productLinks.map(([label, href]) => `<a href="${href}">${label}</a>`).join("")}
        </div>
        <div>
          <h3>Resources</h3>
          ${resourceLinks.map(([label, href]) => `<a href="${href}">${label}</a>`).join("")}
        </div>
        <div>
          <h3>Compare</h3>
          ${alternatives.map((item) => `<a href="/${item.rootSlug}/">${item.alternativeH1}</a>`).join("")}
        </div>
        <div>
          <h3>Support</h3>
          <a href="mailto:admincluegent@gmail.com">Contact</a>
          <a href="mailto:admincluegent@gmail.com?subject=Cluegent%20Bug%20Report">Report bug</a>
          <a href="https://github.com/admincluegent/cluegent-app" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Cluegent. All rights reserved.</span>
        <span class="footer-disclaimer">Use only where AI assistance, capture, and transcription are permitted.</span>
      </div>
    </footer>`;
}

function head({ title, description, canonical, image = defaultImage, type = "website", schema = [] }) {
  const schemaList = Array.isArray(schema) ? schema : [schema];
  return `
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="author" content="Cluegent" />
    <link rel="canonical" href="${absolute(canonical)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:url" content="${absolute(canonical)}" />
    <meta property="og:image" content="${absolute(image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${absolute(image)}" />
    <meta name="theme-color" content="#ffffff" />
    <link rel="icon" type="image/png" href="/assets/icon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@500;600&family=Geist:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css?v=20260604-seo" />
    <script async src="https://www.googletagmanager.com/gtag/js?id=${ga4MeasurementId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag("js", new Date());
      gtag("config", "${ga4MeasurementId}");
    </script>
    ${schemaList
      .filter(Boolean)
      .map((item) => `<script type="application/ld+json">${JSON.stringify(item)}</script>`)
      .join("\n    ")}
  </head>`;
}

function baseSchemas() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Cluegent",
      url: siteUrl,
      logo: `${siteUrl}/assets/icon.png`,
      email: "admincluegent@gmail.com",
      sameAs: ["https://github.com/admincluegent/cluegent-app"],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Cluegent",
      url: siteUrl,
    },
  ];
}

function softwareSchema(page) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cluegent",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Windows",
    url: absolute(`/${page.slug}/`),
    downloadUrl,
    description: page.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };
}

function faqSchema(faqs = sharedFaq) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.url),
    })),
  };
}

function videoSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: "How to use Cluegent",
    description: "Cluegent product walkthrough covering private overlay, listening mode, typed prompts, and screenshot answers.",
    thumbnailUrl: [`${siteUrl}/assets/how-to-use-01.png`],
    uploadDate: "2026-06-04",
    contentUrl: `${siteUrl}/assets/cluegent-how-to-full.mp4`,
  };
}

function pageShell({ title, description, canonical, image, schema, body, activePath }) {
  return `<!DOCTYPE html>
<html lang="en">
${head({ title, description, canonical, image, schema })}
<body>
  <div class="page-shell seo-shell">
    ${nav(activePath)}
    ${body}
    ${footer()}
  </div>
  <script src="/app.js?v=20260604-seo"></script>
</body>
</html>
`;
}

function landingTemplate(page) {
  const canonical = `/${page.slug}/`;
  const schema = [
    ...baseSchemas(),
    softwareSchema(page),
    faqSchema(),
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: page.h1, url: canonical },
    ]),
    ...(page.slug === "how-to-use-cluegent" ? [videoSchema()] : []),
  ];
  const body = `
    <main>
      <section class="seo-hero">
        <div class="seo-hero-copy reveal">
          <p class="section-kicker">${escapeHtml(page.kicker)}</p>
          <h1>${escapeHtml(page.h1)}</h1>
          <p>${escapeHtml(page.lede)}</p>
          <div class="seo-actions">
            <a class="primary-download" href="${page.slug === "download" ? downloadUrl : downloadUrl}">${escapeHtml(page.primaryCta)}</a>
            <a class="secondary-link" href="${page.secondaryHref}">${escapeHtml(page.secondaryCta)}</a>
          </div>
        </div>
        <div class="seo-hero-media reveal">
          <img src="${page.image}" alt="${escapeHtml(page.h1)}" />
        </div>
      </section>

      <section class="seo-section seo-section--compact">
        <div class="seo-feature-list reveal">
          ${page.bullets.map((bullet) => `<article><span></span><p>${escapeHtml(bullet)}</p></article>`).join("")}
        </div>
      </section>

      <section class="seo-section">
        <div class="seo-two-col">
          ${page.sections
            .map(
              (section) => `
            <article class="seo-panel reveal">
              <h2>${escapeHtml(section.title)}</h2>
              <p>${escapeHtml(section.text)}</p>
            </article>`
            )
            .join("")}
        </div>
      </section>

      <section class="seo-section">
        <div class="section-heading reveal">
          <h2>Customize Cluegent for your context</h2>
          <p>Cluegent is not one fixed answer style. You can tune the assistant around your resume, screen, voice context, and repeated prompts.</p>
        </div>
        <div class="seo-card-grid seo-card-grid--four">
          <article class="seo-panel reveal">
            <h2>Resume context</h2>
            <p>Add your resume in Settings → Customize so Cluegent can keep your background, projects, skills, and experience in mind while helping with permitted interviews.</p>
          </article>
          <article class="seo-panel reveal">
            <h2>Listening responses</h2>
            <p>Customize how Cluegent answers from live transcript context: concise, detailed, example-first, interviewer-facing, or any style that matches your workflow.</p>
          </article>
          <article class="seo-panel reveal">
            <h2>Screen and type responses</h2>
            <p>Set separate behavior for screenshot-based answers and typed prompt answers, so code screens, visual questions, and direct questions get the right response style.</p>
          </article>
          <article class="seo-panel reveal">
            <h2>Quick action buttons</h2>
            <p>Create quick action buttons for repeated prompts like answer shortly, give an example, explain tradeoffs, brainstorm, or ask the next question.</p>
          </article>
        </div>
      </section>

      <section class="seo-section">
        <div class="section-heading reveal">
          <h2>How Cluegent compares</h2>
          <p>Clear differences help Google and users understand where Cluegent fits.</p>
        </div>
        <div class="seo-table reveal">
          ${page.comparisonRows
            .map(
              (row) => `
            <div>
              <strong>${escapeHtml(row[0])}</strong>
              <span>${escapeHtml(row[1])}</span>
              <span>${escapeHtml(row[2] || "")}</span>
            </div>`
            )
            .join("")}
        </div>
      </section>

      <section class="seo-section faq-section">
        <div class="section-heading reveal">
          <h2>Frequently asked questions</h2>
        </div>
        <div class="faq-list reveal">
          ${sharedFaq
            .map(
              (item, index) => `
            <details${index === 0 ? " open" : ""}>
              <summary>${escapeHtml(item.q)}</summary>
              <p>${escapeHtml(item.a)}</p>
            </details>`
            )
            .join("")}
        </div>
      </section>

      <section class="seo-section seo-related">
        <h2>Related Cluegent resources</h2>
        <div>
          ${page.related.map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("")}
        </div>
      </section>
    </main>`;

  return pageShell({ title: page.title, description: page.description, canonical, image: page.image, schema, body, activePath: canonical });
}

function alternativesIndexTemplate() {
  const title = "AI Interview Assistant Alternatives | Cluegent Comparisons";
  const description = "Compare Cluegent with LockedIn AI, Final Round AI, ParakeetAI, and Chiku AI for live interview assistance, coding help, and private desktop workflows.";
  const body = `
    <main>
      <section class="seo-hero seo-hero--simple">
        <div class="seo-hero-copy reveal">
          <p class="section-kicker">Compare AI interview tools</p>
          <h1>AI Interview Assistant Alternatives</h1>
          <p>${description}</p>
        </div>
      </section>
      <section class="seo-section">
        <div class="seo-card-grid">
          ${alternatives
            .map(
              (item) => `
            <article class="seo-panel reveal">
              <h2>Cluegent vs ${escapeHtml(item.competitor)}</h2>
              <p>${escapeHtml(item.positioning)}</p>
              <a class="secondary-link" href="/alternatives/${item.slug}/">Read comparison</a>
              <a class="secondary-link" href="/${item.rootSlug}/">Read ${escapeHtml(item.alternativeH1)}</a>
            </article>`
            )
            .join("")}
        </div>
      </section>
    </main>`;
  return pageShell({
    title,
    description,
    canonical: "/alternatives/",
    image: defaultImage,
    schema: [
      ...baseSchemas(),
      breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Alternatives", url: "/alternatives/" },
      ]),
    ],
    body,
    activePath: "/alternatives/",
  });
}

function alternativeTemplate(item) {
  const canonical = `/alternatives/${item.slug}/`;
  const body = `
    <main>
      <section class="seo-hero seo-hero--simple">
        <div class="seo-hero-copy reveal">
          <p class="section-kicker">Comparison</p>
          <h1>Cluegent vs ${escapeHtml(item.competitor)}</h1>
          <p>${escapeHtml(item.positioning)}</p>
          <div class="seo-actions">
            <a class="primary-download" href="${downloadUrl}">Download Cluegent</a>
            <a class="secondary-link" href="/alternatives/">All comparisons</a>
          </div>
        </div>
      </section>
      <section class="seo-section">
        <div class="seo-table reveal">
          ${item.rows
            .map(
              (row) => `
            <div>
              <strong>${escapeHtml(row[0])}</strong>
              <span>Cluegent: ${escapeHtml(row[1])}</span>
              <span>${escapeHtml(item.competitor)}: ${escapeHtml(row[2])}</span>
            </div>`
            )
            .join("")}
        </div>
      </section>
      <section class="seo-section seo-two-col">
        <article class="seo-panel reveal">
          <h2>When Cluegent is a fit</h2>
          <p>Choose Cluegent when you want a focused desktop assistant for live interview answers, coding screenshots, typed prompts, and local meeting context.</p>
        </article>
        <article class="seo-panel reveal">
          <h2>What to test before choosing</h2>
          <p>Test setup speed, platform compatibility, privacy behavior, customization depth, resume context, quick actions, support quality, pricing, and whether the assistant matches the interview or meeting format you actually use.</p>
        </article>
      </section>
      <section class="seo-section seo-related">
        <h2>Keep comparing</h2>
        <div>
          <a href="/ai-interview-assistant/">AI interview assistant</a>
          <a href="/coding-interview-assistant/">Coding interview assistant</a>
          <a href="/${item.rootSlug}/">${escapeHtml(item.alternativeH1)}</a>
          <a href="/blog/${item.blogSlug}/">Cluegent vs ${escapeHtml(item.competitor)} blog</a>
        </div>
      </section>
    </main>`;
  return pageShell({
    title: item.title,
    description: item.description,
    canonical,
    image: defaultImage,
    schema: [
      ...baseSchemas(),
      faqSchema(),
      breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Alternatives", url: "/alternatives/" },
        { name: `Cluegent vs ${item.competitor}`, url: canonical },
      ]),
    ],
    body,
    activePath: "/alternatives/",
  });
}

function alternativeLandingTemplate(item) {
  const canonical = `/${item.rootSlug}/`;
  const description = `${item.alternativeH1} for candidates comparing private AI interview assistants, coding interview support, resume-aware context, platform compatibility, and pricing.`;
  const body = `
    <main>
      <section class="seo-hero seo-hero--simple">
        <div class="seo-hero-copy reveal">
          <p class="section-kicker">AI interview assistant alternative</p>
          <h1>${escapeHtml(item.alternativeH1)}</h1>
          <p>${escapeHtml(item.positioning)} Use this page to compare live interview workflow, coding support, private overlay behavior, customization, and responsible-use fit.</p>
          <div class="seo-actions">
            <a class="primary-download" href="${downloadUrl}">Try Cluegent</a>
            <a class="secondary-link" href="/alternatives/${item.slug}/">Read full comparison</a>
          </div>
        </div>
      </section>

      <section class="seo-section">
        <div class="seo-two-col">
          <article class="seo-panel reveal">
            <h2>Why people look for a ${escapeHtml(item.competitor)} alternative</h2>
            <p>Candidates usually compare AI interview tools when they need a different workflow, clearer pricing, faster setup, better coding support, resume context, screenshot help, or a desktop assistant that fits Zoom, Google Meet, and Teams interviews.</p>
          </article>
          <article class="seo-panel reveal">
            <h2>How Cluegent helps</h2>
            <p>Cluegent focuses on a desktop workflow with live listening when permitted, typed prompts, screenshot-aware coding help, resume-aware answers, custom response styles, quick actions, and local meeting history.</p>
          </article>
          <article class="seo-panel reveal">
            <h2>Customize responses before the call</h2>
            <p>Add your resume in Settings, customize listening responses, screen responses, and typed prompt responses, then use quick action buttons for common interview moves like clarify, give example, or follow up.</p>
          </article>
          <article class="seo-panel reveal">
            <h2>Use responsibly</h2>
            <p>Use Cluegent only where AI assistance, capture, transcription, and screenshots are allowed. The private overlay is designed to stay out of standard screen sharing, not to bypass every monitoring method.</p>
          </article>
        </div>
      </section>

      <section class="seo-section">
        <div class="section-heading reveal">
          <h2>${escapeHtml(item.alternativeH1)} comparison points</h2>
          <p>Compare the exact live interview workflow before choosing a tool.</p>
        </div>
        <div class="seo-table reveal">
          ${item.rows
            .map(
              (row) => `
            <div>
              <strong>${escapeHtml(row[0])}</strong>
              <span>Cluegent: ${escapeHtml(row[1])}</span>
              <span>${escapeHtml(item.competitor)}: ${escapeHtml(row[2])}</span>
            </div>`
            )
            .join("")}
        </div>
      </section>

      <section class="seo-section faq-section">
        <div class="section-heading reveal">
          <h2>Frequently asked questions</h2>
        </div>
        <div class="faq-list reveal">
          ${sharedFaq
            .map(
              (faq, index) => `
            <details${index === 0 ? " open" : ""}>
              <summary>${escapeHtml(faq.q)}</summary>
              <p>${escapeHtml(faq.a)}</p>
            </details>`
            )
            .join("")}
        </div>
      </section>

      <section class="seo-section seo-related">
        <h2>Related resources</h2>
        <div>
          <a href="/alternatives/${item.slug}/">Full ${escapeHtml(item.competitor)} comparison</a>
          <a href="/blog/${item.blogSlug}/">Cluegent vs ${escapeHtml(item.competitor)} guide</a>
          <a href="/ai-interview-assistant/">AI interview assistant</a>
          <a href="/pricing/">Pricing</a>
        </div>
      </section>
    </main>`;
  return pageShell({
    title: item.alternativeTitle,
    description,
    canonical,
    image: defaultImage,
    schema: [
      ...baseSchemas(),
      faqSchema(),
      breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: item.alternativeH1, url: canonical },
      ]),
    ],
    body,
    activePath: "/alternatives/",
  });
}

function blogIndexTemplate() {
  const title = "Cluegent Blog | AI Interview Assistant Guides";
  const description = "Guides on AI interview assistants, coding interviews, screen sharing, STAR answers, JavaScript questions, React questions, and system design prep.";
  const body = `
    <main>
      <section class="seo-hero seo-hero--simple">
        <div class="seo-hero-copy reveal">
          <p class="section-kicker">Cluegent blog</p>
          <h1>AI Interview Assistant Guides</h1>
          <p>${description}</p>
        </div>
      </section>
      <section class="seo-section">
        <div class="seo-card-grid">
          ${blogPosts
            .map(
              (post) => `
            <article class="seo-panel reveal">
              <p class="section-kicker">Guide</p>
              <h2>${escapeHtml(post.h1)}</h2>
              <p>${escapeHtml(post.summary)}</p>
              <a class="secondary-link" href="/blog/${post.slug}/">Read guide</a>
            </article>`
            )
            .join("")}
        </div>
      </section>
    </main>`;
  return pageShell({
    title,
    description,
    canonical: "/blog/",
    image: defaultImage,
    schema: [
      ...baseSchemas(),
      breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Blog", url: "/blog/" },
      ]),
    ],
    body,
    activePath: "/blog/",
  });
}

function articleTemplate(post) {
  const canonical = `/blog/${post.slug}/`;
  const schema = [
    ...baseSchemas(),
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.h1,
      description: post.description,
      datePublished: generatedDate,
      dateModified: generatedDate,
      author: {
        "@type": "Organization",
        name: "Cluegent",
      },
      publisher: {
        "@type": "Organization",
        name: "Cluegent",
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/assets/icon.png`,
        },
      },
      mainEntityOfPage: absolute(canonical),
    },
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Blog", url: "/blog/" },
      { name: post.h1, url: canonical },
    ]),
  ];
  const body = `
    <main>
      <article class="seo-article">
        <header class="seo-article-header reveal">
          <p class="section-kicker">AI interview guide</p>
          <h1>${escapeHtml(post.h1)}</h1>
          <p>${escapeHtml(post.summary)}</p>
        </header>
        <div class="seo-article-body reveal">
          ${post.sections.map(([title, text]) => `<section><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></section>`).join("")}
          <section>
            <h2>Where Cluegent helps</h2>
            <p>Cluegent supports permitted live workflows with transcript context, typed prompts, screenshot-aware answers, resume context, custom response behavior, quick action buttons, and a private desktop overlay. It is most useful when you already understand the subject and need help staying structured under pressure.</p>
          </section>
        </div>
      </article>
      <section class="seo-section seo-related">
        <h2>Related resources</h2>
        <div>
          ${post.links.map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("")}
        </div>
      </section>
    </main>`;
  return pageShell({ title: post.title, description: post.description, canonical, image: defaultImage, schema, body, activePath: "/blog/" });
}

function writePage(relativePath, html) {
  const fullPath = join(websiteDir, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, html);
}

function buildSitemap() {
  const paths = [
    "/",
    "/how-to-use.html",
    "/privacy.html",
    "/terms.html",
    ...landingPages.map((page) => `/${page.slug}/`),
    "/alternatives/",
    ...alternatives.map((item) => `/alternatives/${item.slug}/`),
    ...alternatives.map((item) => `/${item.rootSlug}/`),
    "/blog/",
    ...blogPosts.map((post) => `/blog/${post.slug}/`),
  ];

  const urls = paths
    .map(
      (path) => `  <url>
    <loc>${absolute(path)}</loc>
    <lastmod>${generatedDate}</lastmod>
    <changefreq>${path.includes("/blog/") ? "monthly" : "weekly"}</changefreq>
    <priority>${path === "/" ? "1.0" : path.includes("/blog/") ? "0.8" : "0.9"}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildRobots() {
  return `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
}

for (const page of landingPages) {
  writePage(`${page.slug}/index.html`, landingTemplate(page));
}

writePage("alternatives/index.html", alternativesIndexTemplate());
for (const item of alternatives) {
  writePage(`alternatives/${item.slug}/index.html`, alternativeTemplate(item));
  writePage(`${item.rootSlug}/index.html`, alternativeLandingTemplate(item));
}

writePage("blog/index.html", blogIndexTemplate());
for (const post of blogPosts) {
  writePage(`blog/${post.slug}/index.html`, articleTemplate(post));
}

writePage("sitemap.xml", buildSitemap());
writePage("robots.txt", buildRobots());

console.log(`Generated ${landingPages.length + alternatives.length + blogPosts.length + 4} SEO files in website/`);
