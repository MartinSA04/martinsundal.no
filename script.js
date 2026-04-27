const root = document.documentElement;
const themeToggle = document.getElementById("theme-toggle");
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.getElementById("site-nav");
const navLinks = siteNav.querySelectorAll("a");
const toastStack = document.getElementById("toast-stack");
const lifeCanvas = document.getElementById("life-canvas");
const projectLifeCanvas = document.getElementById("project-life-canvas");
const lifeResetButton = document.getElementById("life-reset");
const lifeRunningState = document.getElementById("life-running-state");
const lifeStatus = document.getElementById("life-status");
const lifePlanData = document.getElementById("life-plan-data");
const projectLifePlanData = document.getElementById("project-life-plan-data");
const storageKey = "msa-theme";

let themeCycleCount = 0;

const TOAST_DURATION = 4200;

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
  }

  if (current === "deep-space") {
    nextTheme = "light";
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
initializeLife();
initializeProjectLifePreview();

if (lifeScenes.length > 0) {
  window.requestAnimationFrame(lifeAnimationLoop);
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
