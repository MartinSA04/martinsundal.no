const root = document.documentElement;
const body = document.body;
const themeToggle = document.getElementById("theme-toggle");
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.getElementById("site-nav");
const navLinks = siteNav.querySelectorAll("a");
const logo = document.querySelector(".logo");
const toastStack = document.getElementById("toast-stack");
const terminal = document.getElementById("terminal");
const terminalBody = document.getElementById("terminal-body");
const terminalForm = document.getElementById("terminal-form");
const terminalInput = document.getElementById("terminal-input");
const terminalClose = document.getElementById("terminal-close");
const commandPalette = document.getElementById("command-palette");
const commandClose = document.getElementById("command-close");
const commandButtons = document.querySelectorAll("[data-command]");
const footerStars = document.getElementById("footer-stars");
const secretProject = document.getElementById("secret-project");
const secretProjectClose = document.getElementById("secret-project-close");
const secretFacts = document.getElementById("secret-facts");
const secretFactText = document.getElementById("secret-fact-text");
const retroOverlay = document.getElementById("retro-overlay");
const storageKey = "msa-theme";
const secretSequence = [0, 2, 1, 3];
const konami = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

let konamiBuffer = [];
let typedBuffer = "";
let logoClicks = 0;
let achievements = new Set();
let visitedSections = new Set();
let footerProgress = [];
let themeCycleCount = 0;
let secretFactIndex = 0;
let gameModeActive = false;
let idleTimer;

const TOAST_DURATION = 4200;
const RETRO_POPUP_DURATION = 3200;

const terminalCommands = {
  help: "Available commands: whoami, list_projects, current_focus, fun_fact, clear",
  whoami: "Martin Sundal Aspås — software engineer by day, physics/math student by night, side-project enjoyer at all hours.",
  list_projects: "Cipherbound, Interactive Black Hole Renderer, and a rotating backlog of experiments that definitely did not need to exist.",
  current_focus: "Robotics, simulation, engineering software, and learning by building things that are technically unnecessary.",
  fun_fact: "The best part of programming is accidentally discovering a new hobby while trying to finish an old one.",
  clear: "__CLEAR__",
};

const personalFacts = [
  "Current status: probably thinking about some combination of code, math, and a weird side project.",
  "Preferred project shape: interesting enough to be slightly inconvenient.",
  "Debug personality: calm until proven otherwise.",
  "Favorite category of build: something technically unnecessary but deeply satisfying.",
];

const gameCopyOverrides = [
  ["#home h1", "PLAYER ONE: MARTIN"],
  [
    "#home .lead",
    "Quest briefing: ship reliable software for robotics, simulation, and side quests that should probably not exist.",
  ],
  ["#work .section-head h2", "Quest Log"],
  ["#projects .section-head h2", "Level Select"],
  ["#projects .section-head p", "Choose your next side quest."],
  ["#contact .section-head h2", "Co-op Lobby"],
  ["#contact .section-head p", "Send a ping to join the party."],
  [".hero-actions .btn-primary", "Start Quest"],
  ["#projects .project-card:first-child .btn-primary", "Enter Cipherbound"],
  ["#projects .project-card:nth-child(2) .btn-secondary", "Inspect Artifact"],
];

const getPreferredTheme = () => {
  const savedTheme = localStorage.getItem(storageKey);

  if (["light", "dark", "deep-space"].includes(savedTheme)) {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyTheme = (theme) => {
  if (theme === "light") {
    root.removeAttribute("data-theme");
    themeToggle.textContent = "☀";
    themeToggle.setAttribute("aria-label", "Switch theme");
    themeToggle.setAttribute("title", "Switch theme");
    return;
  }

  root.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "deep-space" ? "✦" : "☾";
  themeToggle.setAttribute("aria-label", "Switch theme");
  themeToggle.setAttribute("title", "Switch theme");
};

const cycleTheme = () => {
  const current = root.getAttribute("data-theme") || "light";
  const shouldResetGameMode = gameModeActive;
  const shouldResetRetroMode = body.classList.contains("retro-mode");
  let nextTheme = "dark";

  if (current === "dark") {
    nextTheme = "light";
  } else if (current === "light") {
    nextTheme = "dark";
  }

  themeCycleCount += 1;

  if (themeCycleCount >= 5 && current === "dark") {
    nextTheme = "deep-space";
    showToast("Deep space mode unlocked.");
    unlockAchievement("Dark mode engineer");
  }

  if (current === "deep-space") {
    nextTheme = "light";
  }

  if (shouldResetGameMode) {
    resetGameMode();
  }

  if (shouldResetRetroMode) {
    resetRetroMode();
  }

  localStorage.setItem(storageKey, nextTheme);
  applyTheme(nextTheme);
};

const showToast = (message, duration = TOAST_DURATION) => {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastStack.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, duration);
};

const unlockAchievement = (name) => {
  if (achievements.has(name)) return;
  achievements.add(name);
  showToast(`Achievement unlocked: ${name}`);
};

const revealSecretProject = () => {
  secretProject.classList.remove("hidden");
  secretProject.setAttribute("aria-hidden", "false");
};

const hideSecretProject = () => {
  secretProject.classList.add("hidden");
  secretProject.setAttribute("aria-hidden", "true");
};

const applyGameReferences = () => {
  gameCopyOverrides.forEach(([selector, text]) => {
    const element = document.querySelector(selector);
    if (!element) {
      return;
    }

    if (!element.dataset.originalCopy) {
      element.dataset.originalCopy = element.textContent;
    }

    element.textContent = text;
  });
};

const resetGameReferences = () => {
  document.querySelectorAll("[data-original-copy]").forEach((element) => {
    element.textContent = element.dataset.originalCopy;
    delete element.dataset.originalCopy;
  });
};

const resetGameMode = () => {
  if (!gameModeActive) {
    return;
  }

  gameModeActive = false;
  body.classList.remove("game-mode");
  resetGameReferences();
};

const launchGameMode = () => {
  if (gameModeActive) return;

  localStorage.setItem(storageKey, "dark");
  applyTheme("dark");

  gameModeActive = true;
  body.classList.add("game-mode");
  applyGameReferences();
  showToast("Arcade mode engaged.");
  unlockAchievement("Konami champion");
  revealSecretProject();
};

const openTerminal = () => {
  terminal.classList.remove("hidden");
  terminal.setAttribute("aria-hidden", "false");
  terminalInput.focus();
};

const closeTerminal = () => {
  terminal.classList.add("hidden");
  terminal.setAttribute("aria-hidden", "true");
};

const appendTerminalLine = (text, isCommand = false) => {
  const line = document.createElement("p");
  line.innerHTML = isCommand
    ? `<span class="terminal-prompt">&gt;</span> ${text}`
    : text;
  terminalBody.appendChild(line);
  terminalBody.scrollTop = terminalBody.scrollHeight;
};

const handleTerminalCommand = (command) => {
  const normalized = command.trim().toLowerCase();
  appendTerminalLine(command, true);

  if (!normalized) return;

  const output = terminalCommands[normalized] || "Unknown command. Try help.";

  if (output === "__CLEAR__") {
    terminalBody.innerHTML = "";
    return;
  }

  appendTerminalLine(output);
};

const openCommandPalette = () => {
  commandPalette.classList.remove("hidden");
  commandPalette.setAttribute("aria-hidden", "false");
};

const closeCommandPalette = () => {
  commandPalette.classList.add("hidden");
  commandPalette.setAttribute("aria-hidden", "true");
};

const showPersonalFacts = () => {
  secretFacts.classList.remove("hidden");
  secretFacts.setAttribute("aria-hidden", "false");
  secretFactText.textContent = personalFacts[secretFactIndex % personalFacts.length];
  secretFactIndex += 1;
};

const hidePersonalFacts = () => {
  secretFacts.classList.add("hidden");
  secretFacts.setAttribute("aria-hidden", "true");
};

const hideRetroOverlay = () => {
  retroOverlay.classList.add("hidden");
  retroOverlay.setAttribute("aria-hidden", "true");
};

const resetRetroMode = () => {
  body.classList.remove("retro-mode");
  hideRetroOverlay();
};

const enableRetroMode = () => {
  body.classList.add("retro-mode");
  retroOverlay.classList.remove("hidden");
  retroOverlay.setAttribute("aria-hidden", "false");
  showToast("Retro mode engaged.");
  window.setTimeout(() => {
    hideRetroOverlay();
  }, RETRO_POPUP_DURATION);
};

const trackSectionVisits = () => {
  const sections = document.querySelectorAll("main section[id]");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visitedSections.add(entry.target.id);
          if (visitedSections.size >= 5) {
            unlockAchievement("Curious mind");
          }
        }
      });
    },
    { threshold: 0.45 }
  );

  sections.forEach((section) => observer.observe(section));
};

const startIdleWatcher = () => {
  const reset = () => {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      unlockAchievement("Touch grass");
    }, 120000);
  };

  ["mousemove", "scroll", "keydown", "click"].forEach((eventName) => {
    window.addEventListener(eventName, reset, { passive: true });
  });

  reset();
};

applyTheme(getPreferredTheme());
trackSectionVisits();
startIdleWatcher();

const nightHour = new Date().getHours();
if (nightHour >= 22 || nightHour < 5) {
  revealSecretProject();
}

logo.addEventListener("click", () => {
  logoClicks += 1;
  if (logoClicks === 5) {
    openTerminal();
    showToast("Developer terminal unlocked.");
  }
});

if (secretProjectClose) {
  secretProjectClose.addEventListener("click", hideSecretProject);
}

themeToggle.addEventListener("click", cycleTheme);

navToggle.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!isOpen));
  siteNav.classList.toggle("is-open");
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navToggle.setAttribute("aria-expanded", "false");
    siteNav.classList.remove("is-open");
  });
});

terminalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleTerminalCommand(terminalInput.value);
  terminalInput.value = "";
});

terminalClose.addEventListener("click", closeTerminal);
commandClose.addEventListener("click", closeCommandPalette);

commandButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const command = button.dataset.command;

    if (command === "projects") {
      document.getElementById("projects").scrollIntoView({ behavior: "smooth" });
    } else if (command === "theme") {
      cycleTheme();
    } else if (command === "blackhole") {
      launchGameMode();
    } else if (command === "retro") {
      enableRetroMode();
    } else if (command === "linkedin") {
      window.open("https://linkedin.com/in/martinsa04", "_blank", "noopener,noreferrer");
    } else if (command === "secret") {
      revealSecretProject();
      showToast("Curiosity detected.");
    }

    closeCommandPalette();
  });
});

footerStars.addEventListener("click", (event) => {
  const star = event.target.closest("[data-star]");
  if (!star) return;

  const value = Number(star.dataset.star);
  footerProgress.push(value);
  star.classList.add("active");

  window.setTimeout(() => {
    star.classList.remove("active");
  }, 300);

  if (footerProgress.length > secretSequence.length) {
    footerProgress.shift();
  }

  const matched = secretSequence.every((item, index) => footerProgress[index] === item);
  if (matched) {
    revealSecretProject();
    showToast("Constellation recognized.");
    footerProgress = [];
  }
});

window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openCommandPalette();
    return;
  }

  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    openCommandPalette();
    return;
  }

  konamiBuffer.push(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  if (konamiBuffer.length > konami.length) {
    konamiBuffer.shift();
  }

  const matchesKonami = konami.every((key, index) => konamiBuffer[index] === key);
  if (matchesKonami) {
    launchGameMode();
    konamiBuffer = [];
  }

  if (event.key.length === 1 && /[a-z]/i.test(event.key)) {
    typedBuffer += event.key.toLowerCase();
    typedBuffer = typedBuffer.slice(-12);

    if (typedBuffer.includes("martin")) {
      showPersonalFacts();
      unlockAchievement("Pattern recognized");
      typedBuffer = "";
    }

    if (typedBuffer.includes("retro")) {
      enableRetroMode();
      typedBuffer = "";
    }
  }
});

[commandPalette, secretFacts].forEach((overlay) => {
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      overlay.classList.add("hidden");
      overlay.setAttribute("aria-hidden", "true");
    }
  });
});

secretFacts.addEventListener("click", (event) => {
  if (event.target === secretFacts) {
    hidePersonalFacts();
  }
});

window.addEventListener("click", (event) => {
  if (event.target === retroOverlay) {
    hideRetroOverlay();
  }
});