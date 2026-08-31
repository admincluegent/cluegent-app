const root = document.documentElement;
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const revealItems = document.querySelectorAll(".reveal");
const shortcutModifier = /mac|iphone|ipad|ipod/i.test(navigator.platform) ? "Command" : "Ctrl";

const pricingCurrencyToggle = document.querySelector("[data-pricing-currency-toggle]");

if (pricingCurrencyToggle) {
  const currencyButtons = Array.from(pricingCurrencyToggle.querySelectorAll("[data-pricing-currency]"));
  const pricingValues = Array.from(document.querySelectorAll("[data-pricing-price]"));
  const originalPricingValues = Array.from(document.querySelectorAll("[data-pricing-original]"));
  const pricingOffers = Array.from(document.querySelectorAll(".pricing-offer[data-aria-inr]"));
  const storageKey = "cluegent-pricing-currency";
  const supportedCurrencies = ["INR", "USD"];

  const getSavedCurrency = () => {
    try {
      const savedCurrency = window.localStorage.getItem(storageKey);
      return supportedCurrencies.includes(savedCurrency) ? savedCurrency : "INR";
    } catch {
      return "INR";
    }
  };

  const selectPricingCurrency = (currency, shouldFocus = false) => {
    const normalizedCurrency = supportedCurrencies.includes(currency) ? currency : "INR";
    const dataSuffix = normalizedCurrency.toLowerCase();

    pricingValues.forEach((element) => {
      element.textContent = element.dataset[`price${normalizedCurrency === "INR" ? "Inr" : "Usd"}`] || element.textContent;
    });

    originalPricingValues.forEach((element) => {
      element.textContent = element.dataset[`original${normalizedCurrency === "INR" ? "Inr" : "Usd"}`] || element.textContent;
    });

    pricingOffers.forEach((element) => {
      element.setAttribute("aria-label", element.dataset[`aria${dataSuffix === "inr" ? "Inr" : "Usd"}`] || "");
    });

    currencyButtons.forEach((button) => {
      const isSelected = button.dataset.pricingCurrency === normalizedCurrency;
      button.setAttribute("aria-pressed", String(isSelected));
      if (isSelected && shouldFocus) button.focus();
    });

    try {
      window.localStorage.setItem(storageKey, normalizedCurrency);
    } catch {
      // Pricing remains usable when browser storage is unavailable.
    }
  };

  currencyButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      selectPricingCurrency(button.dataset.pricingCurrency || "INR");
    });

    button.addEventListener("keydown", (event) => {
      const isNext = event.key === "ArrowRight" || event.key === "ArrowDown";
      const isPrevious = event.key === "ArrowLeft" || event.key === "ArrowUp";
      if (!isNext && !isPrevious && event.key !== "Home" && event.key !== "End") return;

      event.preventDefault();
      let nextIndex = index;
      if (isNext) nextIndex = (index + 1) % currencyButtons.length;
      if (isPrevious) nextIndex = (index - 1 + currencyButtons.length) % currencyButtons.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = currencyButtons.length - 1;

      selectPricingCurrency(currencyButtons[nextIndex].dataset.pricingCurrency || "INR", true);
    });
  });

  selectPricingCurrency(getSavedCurrency());
}

const trackCluegentEvent = (eventName, params = {}) => {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, {
    page_path: window.location.pathname,
    ...params,
  });
};

const getDownloadPlatform = (href, text) => {
  const value = `${href} ${text}`.toLowerCase();
  if (value.includes("apps.microsoft.com") || value.includes("windows")) return "windows";
  if (value.includes("arm64")) return "mac_arm64";
  if (value.includes("mac")) return "mac_intel";
  return "unknown";
};

const getCtaLocation = (element) => {
  if (element.dataset.analyticsLocation) return element.dataset.analyticsLocation;
  const section = element.closest("section");
  if (section?.id) return section.id;
  if (element.closest(".site-header")) return "header";
  if (element.closest(".site-footer")) return "footer";
  return section?.classList[0] || "page";
};

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

document.querySelectorAll("a[href]").forEach((element) => {
  element.addEventListener("click", () => {
    const href = element.href || "";
    const linkText = element.textContent?.replace(/\s+/g, " ").trim() || "";
    const trackingText = `${href} ${linkText}`.toLowerCase();
    const commonParams = {
      link_url: href,
      link_text: linkText,
      platform: getDownloadPlatform(href, linkText),
      cta_location: getCtaLocation(element),
    };

    if (element.dataset.analyticsEvent) {
      trackCluegentEvent(element.dataset.analyticsEvent, commonParams);
      return;
    }

    if (trackingText.includes("try for free") || trackingText.includes("start free")) {
      trackCluegentEvent("free_trial_click", commonParams);
      return;
    }

    if (trackingText.includes("pricing") || trackingText.includes("upgrade")) {
      trackCluegentEvent(trackingText.includes("upgrade") ? "upgrade_click" : "pricing_click", commonParams);
      return;
    }

    if (
      trackingText.includes("apps.microsoft.com") ||
      trackingText.includes("github.com/admincluegent/cluegent-app/releases/download") ||
      trackingText.includes("download") ||
      trackingText.includes("get cluegent") ||
      trackingText.includes("get for windows") ||
      trackingText.includes("get for macos")
    ) {
      trackCluegentEvent("download_click", commonParams);
    }
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
    if (isOpen) {
      trackCluegentEvent("download_menu_open", {
        platform: "macos",
        cta_location: getCtaLocation(trigger),
      });
    }
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

document.querySelectorAll("[data-workflow-tabs]").forEach((tabsRoot) => {
  const tabs = Array.from(tabsRoot.querySelectorAll("[data-workflow-tab]"));
  const panels = Array.from(tabsRoot.querySelectorAll("[data-workflow-panel]"));

  const activateTab = (activeTab, shouldFocus = false) => {
    const activeKey = activeTab.getAttribute("data-workflow-tab");

    tabs.forEach((tab) => {
      const isActive = tab === activeTab;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    panels.forEach((panel) => {
      const isActive = panel.getAttribute("data-workflow-panel") === activeKey;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    if (shouldFocus) {
      activeTab.focus();
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      const isNext = event.key === "ArrowRight" || event.key === "ArrowDown";
      const isPrevious = event.key === "ArrowLeft" || event.key === "ArrowUp";
      if (!isNext && !isPrevious && event.key !== "Home" && event.key !== "End") return;

      event.preventDefault();
      let nextIndex = index;
      if (isNext) nextIndex = (index + 1) % tabs.length;
      if (isPrevious) nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;

      activateTab(tabs[nextIndex], true);
    });
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

const resourceTool = document.querySelector("[data-resource-tool]");
if (resourceTool instanceof HTMLElement) {
  const resourceType = resourceTool.dataset.resourceTool || "resource";
  const storageKey = resourceTool.dataset.resourceStorage || `cluegent-${resourceType}`;
  const printButton = resourceTool.querySelector("[data-resource-print]");
  const resetButton = resourceTool.querySelector("[data-resource-reset]");
  let hasTrackedStart = false;
  let hasTrackedComplete = false;

  const trackResourceStart = () => {
    if (hasTrackedStart) return;
    hasTrackedStart = true;
    trackCluegentEvent("resource_start", { resource_type: resourceType });
  };

  const readResourceState = () => {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    } catch {
      return {};
    }
  };

  const writeResourceState = (state) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // The resource remains usable when private browsing blocks storage.
    }
  };

  const checklistItems = Array.from(resourceTool.querySelectorAll("[data-resource-checklist-item]"));
  const completedElement = resourceTool.querySelector("[data-resource-complete]");
  const totalElement = resourceTool.querySelector("[data-resource-total]");
  const progressBar = resourceTool.querySelector("[data-resource-progress-bar]");

  const updateChecklist = () => {
    const completedValues = checklistItems.filter((item) => item.checked).map((item) => item.value);
    const progress = checklistItems.length ? completedValues.length / checklistItems.length : 0;
    if (completedElement) completedElement.textContent = String(completedValues.length);
    if (totalElement) totalElement.textContent = String(checklistItems.length);
    if (progressBar instanceof HTMLElement) progressBar.style.transform = `scaleX(${progress})`;
    writeResourceState({ completedValues });

    if (progress === 1 && !hasTrackedComplete) {
      hasTrackedComplete = true;
      trackCluegentEvent("resource_complete", { resource_type: resourceType });
    }
  };

  if (checklistItems.length) {
    const savedValues = new Set(readResourceState().completedValues || []);
    checklistItems.forEach((item) => {
      item.checked = savedValues.has(item.value);
      item.addEventListener("change", () => {
        trackResourceStart();
        updateChecklist();
      });
    });
    updateChecklist();
  }

  const resourceFields = Array.from(resourceTool.querySelectorAll("[data-resource-field]"));
  if (resourceFields.length) {
    const savedFields = readResourceState().fields || {};
    resourceFields.forEach((field) => {
      const fieldKey = field.dataset.resourceField;
      if (fieldKey && typeof savedFields[fieldKey] === "string") field.value = savedFields[fieldKey];
      field.addEventListener("input", () => {
        trackResourceStart();
        const fields = Object.fromEntries(
          resourceFields.map((item) => [item.dataset.resourceField || "field", item.value])
        );
        const existingState = readResourceState();
        writeResourceState({ ...existingState, fields });
      });
    });
  }

  const scoreItems = Array.from(resourceTool.querySelectorAll("[data-resource-score-item]"));
  const scoreElement = resourceTool.querySelector("[data-resource-score]");
  const scoreMessage = resourceTool.querySelector("[data-resource-score-message]");

  const updateScore = () => {
    const scores = Object.fromEntries(
      scoreItems.map((item) => [item.dataset.resourceScoreItem || "score", Number(item.value)])
    );
    const values = Object.values(scores);
    const total = values.reduce((sum, value) => sum + value, 0);
    const scoredCount = values.filter((value) => value > 0).length;
    if (scoreElement) scoreElement.textContent = String(total);
    if (scoreMessage) {
      if (scoredCount === 0) scoreMessage.textContent = "Score each category after the mock interview.";
      else if (scoredCount < scoreItems.length) scoreMessage.textContent = `${scoredCount} of ${scoreItems.length} categories scored.`;
      else if (total < 21) scoreMessage.textContent = "Choose one weak category and repeat a short practice session.";
      else if (total < 29) scoreMessage.textContent = "The foundation is working. Improve the lowest-scoring category next.";
      else scoreMessage.textContent = "Strong practice result. Test the same skills with harder follow-up questions.";
    }
    const existingState = readResourceState();
    writeResourceState({ ...existingState, scores });

    if (scoredCount === scoreItems.length && !hasTrackedComplete) {
      hasTrackedComplete = true;
      trackCluegentEvent("resource_complete", { resource_type: resourceType, resource_score: total });
    }
  };

  if (scoreItems.length) {
    const savedScores = readResourceState().scores || {};
    scoreItems.forEach((item) => {
      const itemKey = item.dataset.resourceScoreItem;
      if (itemKey && Number.isFinite(Number(savedScores[itemKey]))) item.value = String(savedScores[itemKey]);
      item.addEventListener("change", () => {
        trackResourceStart();
        updateScore();
      });
    });
    updateScore();
  }

  printButton?.addEventListener("click", () => {
    trackCluegentEvent("resource_print", { resource_type: resourceType });
    window.print();
  });

  resetButton?.addEventListener("click", () => {
    const shouldReset = window.confirm("Clear the saved entries for this resource?");
    if (!shouldReset) return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Continue with the visible reset even if storage is unavailable.
    }
    checklistItems.forEach((item) => {
      item.checked = false;
    });
    resourceFields.forEach((field) => {
      field.value = "";
    });
    scoreItems.forEach((item) => {
      item.value = "0";
    });
    updateChecklist();
    updateScore();
    hasTrackedComplete = false;
    trackCluegentEvent("resource_reset", { resource_type: resourceType });
  });
}
