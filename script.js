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
const projectLifeCanvas = document.getElementById("project-life-canvas");
const lifeResetButton = document.getElementById("life-reset");
const lifeRunningState = document.getElementById("life-running-state");
const lifeStatus = document.getElementById("life-status");
const lifePlanData = document.getElementById("life-plan-data");
const projectLifePlanData = document.getElementById("project-life-plan-data");
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
  list_projects: "Cipherbound, Interactive Black Hole Renderer, Game of Life Text Generator, and a rotating backlog of experiments that definitely did not need to exist.",
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

const lifeState = createLifeScene({
  canvas: lifeCanvas,
  inlinePlanNode: lifePlanData,
  planSrc: "martin_plan.txt",
  speed: 10,
});

const projectLifeState = createLifeScene({
  canvas: projectLifeCanvas,
  inlinePlanNode: projectLifePlanData,
  planSrc: "game_of_life_plan.txt",
  speed: 18,
  loopAfter: 540,
  restartOnExtinction: true,
  pauseWhenOffscreen: true,
});

const lifeScenes = [lifeState, projectLifeState].filter(Boolean);

function createLifeScene({
  canvas,
  inlinePlanNode = null,
  planSrc = "",
  speed = 10,
  loopAfter = null,
  restartOnExtinction = false,
  pauseWhenOffscreen = false,
}) {
  const ctx = canvas ? canvas.getContext("2d") : null;
  if (!canvas || !ctx) {
    return null;
  }

  ctx.imageSmoothingEnabled = false;

  return {
    canvas,
    ctx,
    inlinePlanNode,
    planSrc,
    speed,
    loopAfter,
    restartOnExtinction,
    pauseWhenOffscreen,
    ready: false,
    running: false,
    isVisible: !pauseWhenOffscreen,
    width: 0,
    height: 0,
    generation: 0,
    liveCells: 0,
    initialBoard: null,
    currentBoard: null,
    nextBoard: null,
    imageData: null,
    liveColor: [122, 245, 149],
    accumulator: 0,
    lastTimestamp: 0,
  };
}

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

function updateLifePalette(scene) {
  if (!scene) {
    return;
  }

  scene.liveColor = colorToRgb(
    getComputedStyle(root).getPropertyValue("--life-cell")
  );
}

function syncLifeTheme() {
  lifeScenes.forEach((scene) => {
    if (!scene?.ready) {
      return;
    }

    updateLifePalette(scene);
    renderLifeBoard(scene);
  });
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
    lifeResetButton.disabled = !lifeState?.ready;
  }
}

function updateLifeStatus() {
  if (!lifeRunningState || !lifeStatus) {
    return;
  }

  if (!lifeState || !lifeState.ready) {
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

function renderLifeBoard(scene) {
  if (!scene || !scene.ready || !scene.imageData || !scene.currentBoard) {
    return;
  }

  const data = scene.imageData.data;
  data.fill(0);

  const [red, green, blue] = scene.liveColor;
  for (let index = 0; index < scene.currentBoard.length; index += 1) {
    if (scene.currentBoard[index] !== 1) {
      continue;
    }

    const pixelOffset = index * 4;
    data[pixelOffset] = red;
    data[pixelOffset + 1] = green;
    data[pixelOffset + 2] = blue;
    data[pixelOffset + 3] = 255;
  }

  scene.ctx.clearRect(0, 0, scene.width, scene.height);
  scene.ctx.putImageData(scene.imageData, 0, 0);
}

function resetLifeFrame(scene) {
  if (!scene) {
    return;
  }

  scene.accumulator = 0;
  scene.lastTimestamp = 0;
}

function setLifeRunning(scene, shouldRun) {
  if (!scene?.ready) {
    return;
  }

  scene.running = shouldRun;
  resetLifeFrame(scene);

  if (scene === lifeState) {
    updateLifeControls();
    updateLifeStatus();
  }
}

function advanceLifeGeneration(scene) {
  if (!scene?.ready || !scene.currentBoard || !scene.nextBoard) {
    return;
  }

  const { width, height, currentBoard, nextBoard } = scene;
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

  scene.currentBoard = nextBoard;
  scene.nextBoard = currentBoard;
  scene.liveCells = liveCells;
  scene.generation += 1;
}

function stepLifeOnce(scene) {
  if (!scene?.ready) {
    return;
  }

  advanceLifeGeneration(scene);
  renderLifeBoard(scene);

  if (scene === lifeState) {
    updateLifeStats();
  }
}

function countLifeCells(board) {
  let count = 0;
  for (let index = 0; index < board.length; index += 1) {
    count += board[index];
  }
  return count;
}

function resetLifeBoard(scene) {
  if (!scene?.ready || !scene.initialBoard) {
    return;
  }

  resetLifeFrame(scene);
  scene.currentBoard = scene.initialBoard.slice();
  scene.nextBoard = new Uint8Array(scene.initialBoard.length);
  scene.generation = 0;
  scene.liveCells = countLifeCells(scene.currentBoard);
  renderLifeBoard(scene);

  if (scene === lifeState) {
    updateLifeStats();
  }
}

function shouldLoopLifeScene(scene) {
  if (!scene?.ready) {
    return false;
  }

  if (scene.loopAfter !== null && scene.generation >= scene.loopAfter) {
    resetLifeBoard(scene);
    return true;
  }

  if (scene.restartOnExtinction && scene.liveCells === 0) {
    resetLifeBoard(scene);
    return true;
  }

  return false;
}

function animateLifeScene(scene, timestamp) {
  if (!scene?.running || !scene.ready) {
    return;
  }

  if (scene.lastTimestamp === 0) {
    scene.lastTimestamp = timestamp;
  }

  const frameDelta = Math.min(timestamp - scene.lastTimestamp, 250);
  scene.lastTimestamp = timestamp;
  scene.accumulator += frameDelta;

  const interval = 1000 / scene.speed;
  let stepped = false;

  while (scene.accumulator >= interval) {
    advanceLifeGeneration(scene);
    scene.accumulator -= interval;
    stepped = true;

    if (shouldLoopLifeScene(scene)) {
      break;
    }
  }

  if (stepped) {
    renderLifeBoard(scene);

    if (scene === lifeState) {
      updateLifeStats();
    }
  }
}

function lifeAnimationLoop(timestamp) {
  lifeScenes.forEach((scene) => {
    animateLifeScene(scene, timestamp);
  });

  window.requestAnimationFrame(lifeAnimationLoop);
}

function initializeLifeSceneVisibility(scene, options = {}) {
  if (!scene?.pauseWhenOffscreen) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    scene.isVisible = true;
    if (scene.ready) {
      setLifeRunning(scene, true);
    }
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        scene.isVisible = entry.isIntersecting;

        if (!scene.ready) {
          return;
        }

        setLifeRunning(scene, entry.isIntersecting);
      });
    },
    options
  );

  observer.observe(scene.canvas);
}

async function loadLifeScene(scene) {
  if (!scene) {
    return;
  }

  let text = "";

  if (scene.inlinePlanNode?.textContent.trim()) {
    text = atob(scene.inlinePlanNode.textContent.trim());
  } else if (scene.planSrc) {
    const response = await fetch(scene.planSrc);
    if (!response.ok) {
      throw new Error(`Unable to load ${scene.planSrc} (${response.status})`);
    }

    text = await response.text();
  } else {
    throw new Error("No life plan source configured.");
  }

  const plan = parseLifePlan(text);
  const seed = createLifeSeedBoard(plan);

  scene.ready = true;
  scene.width = plan.width;
  scene.height = plan.height;
  scene.initialBoard = seed.board;
  scene.currentBoard = seed.board.slice();
  scene.nextBoard = new Uint8Array(seed.board.length);
  scene.imageData = null;
  scene.generation = 0;
  scene.liveCells = seed.liveCells;

  scene.canvas.width = plan.width;
  scene.canvas.height = plan.height;
  scene.ctx.imageSmoothingEnabled = false;
  scene.imageData = scene.ctx.createImageData(plan.width, plan.height);

  updateLifePalette(scene);
  renderLifeBoard(scene);
  setLifeRunning(scene, !scene.pauseWhenOffscreen || scene.isVisible);

  if (scene === lifeState) {
    updateLifeControls();
    updateLifeStats();
  }
}

function reportLifeError(message) {
  if (!lifeState) {
    return;
  }

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
  if (!lifeState || !lifeState.ready) {
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
    setLifeRunning(lifeState, !lifeState.running);
    return;
  }

  if (event.key === "n" || event.key === "N") {
    event.preventDefault();
    setLifeRunning(lifeState, false);
    stepLifeOnce(lifeState);
    return;
  }

  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    resetLifeBoard(lifeState);
  }
}

function initializeLife() {
  if (!lifeState) {
    return;
  }

  updateLifeControls();
  updateLifeStatus();

  if (lifeResetButton) {
    lifeResetButton.addEventListener("click", () => {
      resetLifeBoard(lifeState);
    });
  }

  lifeState.canvas.addEventListener("click", () => {
    setLifeRunning(lifeState, !lifeState.running);
  });

  window.addEventListener("keydown", handleLifeKeydown);

  loadLifeScene(lifeState).catch((error) => {
    reportLifeError(error.message);
  });
}

function initializeProjectLifePreview() {
  if (!projectLifeState) {
    return;
  }

  initializeLifeSceneVisibility(projectLifeState, {
    threshold: 0.2,
  });

  loadLifeScene(projectLifeState).catch((error) => {
    console.error(error);
  });
}

applyTheme(getPreferredTheme());
trackSectionVisits();
startIdleWatcher();
initializeLife();
initializeProjectLifePreview();

if (lifeScenes.length > 0) {
  window.requestAnimationFrame(lifeAnimationLoop);
}

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
