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
const lifeCanvas = document.getElementById("life-canvas");
const lifeResetButton = document.getElementById("life-reset");
const lifeRunningState = document.getElementById("life-running-state");
const lifeStatus = document.getElementById("life-status");
const lifePlanData = document.getElementById("life-plan-data");
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
const lifeCtx = lifeCanvas ? lifeCanvas.getContext("2d") : null;

if (lifeCtx) {
  lifeCtx.imageSmoothingEnabled = false;
}

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
  list_projects: "Conway's Game of Life, Cipherbound, Interactive Black Hole Renderer, and a rotating backlog of experiments that definitely did not need to exist.",
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

const lifeState = {
  ready: false,
  running: false,
  width: 0,
  height: 0,
  generation: 0,
  liveCells: 0,
  speed: 10,
  initialBoard: null,
  currentBoard: null,
  nextBoard: null,
  imageData: null,
  liveColor: [122, 245, 149],
};

const lifeFrameState = {
  accumulator: 0,
  lastTimestamp: 0,
};

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
    syncLifeTheme();
    return;
  }

  root.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "deep-space" ? "✦" : "☾";
  themeToggle.setAttribute("aria-label", "Switch theme");
  themeToggle.setAttribute("title", "Switch theme");
  syncLifeTheme();
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
  resetLifeFrame();
  syncLifeTheme();
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

function colorToRgb(value) {
  const trimmed = value.trim();

  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    const normalized = hex.length === 3
      ? hex.split("").map((character) => character + character).join("")
      : hex;

    return [
      Number.parseInt(normalized.slice(0, 2), 16),
      Number.parseInt(normalized.slice(2, 4), 16),
      Number.parseInt(normalized.slice(4, 6), 16),
    ];
  }

  const rgbMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return [
      Number.parseInt(rgbMatch[1], 10),
      Number.parseInt(rgbMatch[2], 10),
      Number.parseInt(rgbMatch[3], 10),
    ];
  }

  return [255, 255, 255];
}

function updateLifePalette() {
  if (!lifeCtx) {
    return;
  }

  lifeState.liveColor = colorToRgb(
    getComputedStyle(root).getPropertyValue("--life-cell")
  );
}

function syncLifeTheme() {
  if (!lifeState.ready) {
    return;
  }

  updateLifePalette();
  renderLifeBoard();
}

function parseLifePlan(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let width = 0;
  let height = 0;
  const coordinates = [];

  lines.forEach((line) => {
    if (line.startsWith("#")) {
      const match = line.match(/board_size\s*=\s*(\d+)\s*,\s*(\d+)/i);
      if (match) {
        width = Number.parseInt(match[1], 10);
        height = Number.parseInt(match[2], 10);
      }
      return;
    }

    const match = line.match(/^(\d+)\s*,\s*(\d+)$/);
    if (!match) {
      return;
    }

    coordinates.push([
      Number.parseInt(match[1], 10),
      Number.parseInt(match[2], 10),
    ]);
  });

  if (!width || !height) {
    let maxX = 0;
    let maxY = 0;

    coordinates.forEach(([x, y]) => {
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    width = maxX + 1;
    height = maxY + 1;
  }

  return { width, height, coordinates };
}

function createLifeSeedBoard(plan) {
  const board = new Uint8Array(plan.width * plan.height);
  let liveCells = 0;
  let minX = plan.width;
  let minY = plan.height;
  let maxX = 0;
  let maxY = 0;

  plan.coordinates.forEach(([x, y]) => {
    if (x < 0 || x >= plan.width || y < 0 || y >= plan.height) {
      return;
    }

    const index = y * plan.width + x;
    if (board[index] === 1) {
      return;
    }

    board[index] = 1;
    liveCells += 1;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  return {
    board,
    liveCells,
    bounds: liveCells === 0
      ? null
      : {
          minX,
          minY,
          maxX,
          maxY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        },
  };
}

function updateLifeControls() {
  if (lifeResetButton) {
    lifeResetButton.disabled = !lifeState.ready;
  }
}

function updateLifeStatus() {
  if (!lifeRunningState || !lifeStatus) {
    return;
  }

  if (!lifeState.ready) {
    lifeRunningState.textContent = "Loading";
    lifeRunningState.classList.remove("is-running");
    lifeStatus.textContent = "Loading seed...";
    return;
  }

  lifeRunningState.textContent = lifeState.running ? "Live" : "Paused";
  lifeRunningState.classList.toggle("is-running", lifeState.running);
  lifeStatus.textContent = lifeState.running
    ? "Click the board to pause, or replay the original seed."
    : "Paused. Click the board to continue.";
}

function updateLifeStats() {
  updateLifeStatus();
}

function renderLifeBoard() {
  if (!lifeCtx || !lifeState.ready || !lifeState.imageData || !lifeState.currentBoard) {
    return;
  }

  const data = lifeState.imageData.data;
  data.fill(0);

  const [red, green, blue] = lifeState.liveColor;
  for (let index = 0; index < lifeState.currentBoard.length; index += 1) {
    if (lifeState.currentBoard[index] !== 1) {
      continue;
    }

    const pixelOffset = index * 4;
    data[pixelOffset] = red;
    data[pixelOffset + 1] = green;
    data[pixelOffset + 2] = blue;
    data[pixelOffset + 3] = 255;
  }

  lifeCtx.clearRect(0, 0, lifeState.width, lifeState.height);
  lifeCtx.putImageData(lifeState.imageData, 0, 0);
}

function resetLifeFrame() {
  lifeFrameState.accumulator = 0;
  lifeFrameState.lastTimestamp = 0;
}

function setLifeRunning(shouldRun) {
  if (!lifeState.ready) {
    return;
  }

  lifeState.running = shouldRun;
  resetLifeFrame();
  updateLifeControls();
  updateLifeStatus();
}

function advanceLifeGeneration() {
  if (!lifeState.ready || !lifeState.currentBoard || !lifeState.nextBoard) {
    return;
  }

  const { width, height, currentBoard, nextBoard } = lifeState;
  let liveCells = 0;

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width;
    const previousRow = y > 0 ? rowOffset - width : -1;
    const nextRow = y < height - 1 ? rowOffset + width : -1;

    for (let x = 0; x < width; x += 1) {
      const index = rowOffset + x;
      let neighbors = 0;

      if (x > 0) {
        neighbors += currentBoard[index - 1];
        if (previousRow >= 0) {
          neighbors += currentBoard[previousRow + x - 1];
        }
        if (nextRow >= 0) {
          neighbors += currentBoard[nextRow + x - 1];
        }
      }

      if (x < width - 1) {
        neighbors += currentBoard[index + 1];
        if (previousRow >= 0) {
          neighbors += currentBoard[previousRow + x + 1];
        }
        if (nextRow >= 0) {
          neighbors += currentBoard[nextRow + x + 1];
        }
      }

      if (previousRow >= 0) {
        neighbors += currentBoard[previousRow + x];
      }
      if (nextRow >= 0) {
        neighbors += currentBoard[nextRow + x];
      }

      const alive = currentBoard[index] === 1;
      const nextAlive = neighbors === 3 || (alive && neighbors === 2);
      nextBoard[index] = nextAlive ? 1 : 0;
      if (nextAlive) {
        liveCells += 1;
      }
    }
  }

  lifeState.currentBoard = nextBoard;
  lifeState.nextBoard = currentBoard;
  lifeState.liveCells = liveCells;
  lifeState.generation += 1;
}

function stepLifeOnce() {
  if (!lifeState.ready) {
    return;
  }

  advanceLifeGeneration();
  renderLifeBoard();
  updateLifeStats();
}

function countLifeCells(board) {
  let count = 0;
  for (let index = 0; index < board.length; index += 1) {
    count += board[index];
  }
  return count;
}

function resetLifeBoard() {
  if (!lifeState.ready || !lifeState.initialBoard) {
    return;
  }

  resetLifeFrame();
  lifeState.currentBoard = lifeState.initialBoard.slice();
  lifeState.nextBoard = new Uint8Array(lifeState.initialBoard.length);
  lifeState.generation = 0;
  lifeState.liveCells = countLifeCells(lifeState.currentBoard);
  renderLifeBoard();
  updateLifeStats();
}

function lifeAnimationLoop(timestamp) {
  if (lifeState.running && lifeState.ready) {
    if (lifeFrameState.lastTimestamp === 0) {
      lifeFrameState.lastTimestamp = timestamp;
    }

    const frameDelta = Math.min(timestamp - lifeFrameState.lastTimestamp, 250);
    lifeFrameState.lastTimestamp = timestamp;
    lifeFrameState.accumulator += frameDelta;

    const interval = 1000 / lifeState.speed;
    let stepped = false;

    while (lifeFrameState.accumulator >= interval) {
      advanceLifeGeneration();
      lifeFrameState.accumulator -= interval;
      stepped = true;
    }

    if (stepped) {
      renderLifeBoard();
      updateLifeStats();
    }
  }

  window.requestAnimationFrame(lifeAnimationLoop);
}

async function loadLifeSeed() {
  if (!lifeCanvas || !lifeCtx) {
    return;
  }

  let text = "";

  if (lifePlanData?.textContent.trim()) {
    text = atob(lifePlanData.textContent.trim());
  } else {
    const response = await fetch("martin_plan.txt");
    if (!response.ok) {
      throw new Error(`Unable to load martin_plan.txt (${response.status})`);
    }

    text = await response.text();
  }
  const plan = parseLifePlan(text);
  const seed = createLifeSeedBoard(plan);

  lifeState.ready = true;
  lifeState.width = plan.width;
  lifeState.height = plan.height;
  lifeState.initialBoard = seed.board;
  lifeState.currentBoard = seed.board.slice();
  lifeState.nextBoard = new Uint8Array(seed.board.length);
  lifeState.imageData = null;
  lifeState.generation = 0;
  lifeState.liveCells = seed.liveCells;

  lifeCanvas.width = plan.width;
  lifeCanvas.height = plan.height;
  lifeCtx.imageSmoothingEnabled = false;
  lifeState.imageData = lifeCtx.createImageData(plan.width, plan.height);

  updateLifePalette();
  updateLifeControls();
  updateLifeStats();
  renderLifeBoard();
  setLifeRunning(true);
}

function reportLifeError(message) {
  lifeState.ready = false;
  lifeState.running = false;

  if (lifeRunningState) {
    lifeRunningState.textContent = "Error";
    lifeRunningState.classList.remove("is-running");
  }

  if (lifeStatus) {
    lifeStatus.textContent = message;
  }

  updateLifeControls();
}

function handleLifeKeydown(event) {
  if (!lifeCanvas || !lifeState.ready) {
    return;
  }

  if (
    !terminal.classList.contains("hidden") ||
    !commandPalette.classList.contains("hidden") ||
    !secretFacts.classList.contains("hidden") ||
    !retroOverlay.classList.contains("hidden")
  ) {
    return;
  }

  const target = event.target;
  if (
    target instanceof HTMLElement &&
    ["INPUT", "BUTTON", "TEXTAREA", "SELECT"].includes(target.tagName)
  ) {
    return;
  }

  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    setLifeRunning(!lifeState.running);
    return;
  }

  if (event.key === "n" || event.key === "N") {
    event.preventDefault();
    setLifeRunning(false);
    stepLifeOnce();
    return;
  }

  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    resetLifeBoard();
  }
}

function initializeLife() {
  if (!lifeCanvas || !lifeCtx) {
    return;
  }

  updateLifeControls();
  updateLifeStatus();

  if (lifeResetButton) {
    lifeResetButton.addEventListener("click", () => {
      resetLifeBoard();
    });
  }

  lifeCanvas.addEventListener("click", () => {
    setLifeRunning(!lifeState.running);
  });

  window.addEventListener("keydown", handleLifeKeydown);
  window.requestAnimationFrame(lifeAnimationLoop);

  loadLifeSeed().catch((error) => {
    reportLifeError(error.message);
  });
}

applyTheme(getPreferredTheme());
trackSectionVisits();
startIdleWatcher();
initializeLife();

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

    if (command === "life") {
      document.getElementById("home").scrollIntoView({ behavior: "smooth" });
    } else if (command === "projects") {
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
