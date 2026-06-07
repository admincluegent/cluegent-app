const root = document.documentElement;
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const revealItems = document.querySelectorAll(".reveal");
const shortcutModifier = /mac|iphone|ipad|ipod/i.test(navigator.platform) ? "Command" : "Ctrl";

document.querySelectorAll("[data-shortcut-mod]").forEach((element) => {
  element.textContent = shortcutModifier;
});

document.querySelectorAll("[data-shortcut]").forEach((element) => {
  element.textContent = `${shortcutModifier} + ${element.getAttribute("data-shortcut")}`;
});

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    const open = root.classList.toggle("menu-open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    root.classList.remove("menu-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

const downloadMenus = Array.from(document.querySelectorAll("[data-download-menu]"));

const closeDownloadMenus = (exceptMenu = null) => {
  downloadMenus.forEach((menu) => {
    if (menu === exceptMenu) return;
    menu.classList.remove("is-open");
    menu.querySelector("[data-download-trigger]")?.setAttribute("aria-expanded", "false");
    const options = menu.querySelector("[data-download-options]");
    if (options instanceof HTMLElement) {
      options.hidden = true;
    }
  });
};

downloadMenus.forEach((menu) => {
  const trigger = menu.querySelector("[data-download-trigger]");
  if (!(trigger instanceof HTMLButtonElement)) return;

  trigger.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("is-open");
    trigger.setAttribute("aria-expanded", String(isOpen));
    const options = menu.querySelector("[data-download-options]");
    if (options instanceof HTMLElement) {
      options.hidden = !isOpen;
    }
    closeDownloadMenus(menu);
  });
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (downloadMenus.some((menu) => menu.contains(target))) return;
  closeDownloadMenus();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDownloadMenus();
  }
});

document.querySelectorAll("[data-video-play]").forEach((button) => {
  const targetId = button.getAttribute("aria-controls");
  const video = targetId ? document.getElementById(targetId) : null;
  if (!(video instanceof HTMLVideoElement)) return;

  button.addEventListener("click", async () => {
    try {
      await video.play();
      button.classList.add("is-hidden");
    } catch {
      video.controls = true;
    }
  });

  video.addEventListener("play", () => button.classList.add("is-hidden"));
  video.addEventListener("pause", () => {
    if (video.currentTime === 0 || video.ended) {
      button.classList.remove("is-hidden");
    }
  });
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.14,
    rootMargin: "0px 0px -10% 0px",
  }
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 45, 220)}ms`;
  observer.observe(item);
});

const interfaceDemo = document.querySelector('[data-demo="interface"]');
if (interfaceDemo) {
  const transcriptEl = interfaceDemo.querySelector("[data-demo-transcript]");
  const responseEl = interfaceDemo.querySelector("[data-demo-response]");
  const actionEls = Array.from(interfaceDemo.querySelectorAll("[data-demo-action]"));
  const overlayEl = interfaceDemo.querySelector("[data-interface-overlay]");
  const listenEl = interfaceDemo.querySelector("[data-interface-listen]");
  const stepLabelEl = interfaceDemo.querySelector("[data-demo-step-label]");
  const cursorEl = interfaceDemo.querySelector("[data-demo-cursor]");

  const interfaceStates = [
    {
      transcript: "...compare ScrollView and FlatList, then explain useEffect clearly",
      response: "Listening begins only when you press Start listening.",
      activeAction: -1,
      stepLabel: "Start listening",
      cursor: { x: 250, y: 38 },
      collapsed: false,
      listenActive: true,
    },
    {
      transcript: "...show one example with FlatList performance benefits",
      response: "Quick actions reuse the current transcript, typed prompt, or screenshot context.",
      activeAction: 1,
      stepLabel: "Use a quick action",
      cursor: { x: 175, y: 145 },
      collapsed: false,
      listenActive: false,
    },
    {
      transcript: "...now answer in one short meeting-ready version",
      response: "Submit sends the prompt to the backend and streams the answer back into the overlay.",
      activeAction: -1,
      stepLabel: `Submit with ${shortcutModifier} + Enter`,
      cursor: { x: 516, y: 302 },
      collapsed: true,
      listenActive: false,
    },
  ];

  let interfaceIndex = 0;
  const renderInterfaceState = () => {
    const state = interfaceStates[interfaceIndex];
    if (transcriptEl) transcriptEl.innerHTML = `<span>${state.transcript}</span>`;
    if (responseEl) responseEl.textContent = state.response;
    if (stepLabelEl) stepLabelEl.textContent = state.stepLabel;
    if (overlayEl) overlayEl.classList.toggle("is-collapsed", state.collapsed);
    if (listenEl) listenEl.classList.toggle("is-active", state.listenActive);
    if (cursorEl) {
      cursorEl.style.transform = `translate(${state.cursor.x}px, ${state.cursor.y}px)`;
    }
    actionEls.forEach((action, index) => {
      action.classList.toggle("is-active", index === state.activeAction);
    });
  };

  renderInterfaceState();
  window.setInterval(() => {
    interfaceIndex = (interfaceIndex + 1) % interfaceStates.length;
    renderInterfaceState();
  }, 2400);
}

const screenshotDemo = document.querySelector('[data-demo="screenshot"]');
if (screenshotDemo) {
  const responseEl = screenshotDemo.querySelector("[data-demo-screenshot-response]");
  const transcriptEl = screenshotDemo.querySelector("[data-demo-screenshot-transcript]");
  const bubbleEl = screenshotDemo.querySelector("[data-demo-shot-bubble]");
  const stepLabelEl = screenshotDemo.querySelector("[data-demo-screenshot-step]");
  const cursorEl = screenshotDemo.querySelector("[data-demo-screenshot-cursor]");
  const hotkeyEl = screenshotDemo.querySelector("[data-screenshot-hotkey]");

  const screenshotStates = [
    {
      transcript: "...transcript hint: explain the visible React hook question clearly",
      response: `Press ${shortcutModifier} + [ to attach the current screen from inside the same overlay.`,
      stepLabel: `Capture screenshot with ${shortcutModifier} + [`,
      cursor: { x: 520, y: 306 },
      bubbleVisible: false,
      hotkeyActive: true,
    },
    {
      transcript: "...transcript hint: explain the visible React hook question clearly",
      response: "Screenshot attached. Cluegent keeps the UI quiet and sends the image with your behavior rules.",
      stepLabel: "Screenshot attached",
      cursor: { x: 456, y: 156 },
      bubbleVisible: true,
      hotkeyActive: false,
    },
    {
      transcript: "...transcript hint: explain the visible React hook question clearly",
      response: "AI reads the screenshot, combines any rolling transcript context, and answers the visible question directly.",
      stepLabel: "AI analyzes the same overlay",
      cursor: { x: 138, y: 214 },
      bubbleVisible: true,
      hotkeyActive: false,
    },
  ];

  let screenshotIndex = 0;
  const renderScreenshotState = () => {
    const state = screenshotStates[screenshotIndex];
    if (transcriptEl) transcriptEl.innerHTML = `<span>${state.transcript}</span>`;
    if (responseEl) responseEl.textContent = state.response;
    if (stepLabelEl) stepLabelEl.textContent = state.stepLabel;
    if (bubbleEl) bubbleEl.classList.toggle("is-visible", state.bubbleVisible);
    if (hotkeyEl) hotkeyEl.classList.toggle("is-active", state.hotkeyActive);
    if (cursorEl) {
      cursorEl.style.transform = `translate(${state.cursor.x}px, ${state.cursor.y}px)`;
    }
  };

  renderScreenshotState();
  window.setInterval(() => {
    screenshotIndex = (screenshotIndex + 1) % screenshotStates.length;
    renderScreenshotState();
  }, 2800);
}
