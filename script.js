const root = document.documentElement;
const themeToggle = document.getElementById("theme-toggle");
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.getElementById("site-nav");
const navLinks = siteNav.querySelectorAll("a");
const logo = document.querySelector(".logo");
const easterEgg = document.getElementById("easter-egg");
const eggBanner = document.getElementById("egg-banner");
const resetSecretsButton = document.getElementById("reset-secrets");
const blackHoleProject = document.getElementById("black-hole-project");
const storageKey = "msa-theme";
const konamiStorageKey = "msa-easter-konami";
const logoStorageKey = "msa-easter-logo";
const blackHoleDriftSelector = [
  ".site-header .logo",
  ".site-nav a",
  ".header-actions > button",
  "#egg-banner",
  "main .eyebrow",
  "main h1",
  "main h2",
  "main h3",
  "main p",
  "main .btn",
  "main .card",
  "main .status-chip",
  "main .tag-list li",
  "main .skill-list li",
  "main .contact-link",
  ".site-footer .footer-inner > p",
  ".site-footer .footer-inner > button",
].join(", ");
const blackHoleLensSelector = [
  "main h1",
  "main h2",
  "main h3",
  "main p",
  ".site-nav a",
  ".status-chip",
  ".tag-list li",
  ".skill-list li",
  ".contact-link span",
].join(", ");

let gravityResizeFrame = 0;

const getPreferredTheme = () => {
  const savedTheme = localStorage.getItem(storageKey);

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyTheme = (theme) => {
  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
    themeToggle.textContent = "☾";
    themeToggle.setAttribute("aria-label", "Switch to light theme");
    themeToggle.setAttribute("title", "Switch to light theme");
  } else {
    root.removeAttribute("data-theme");
    themeToggle.textContent = "☀";
    themeToggle.setAttribute("aria-label", "Switch to dark theme");
    themeToggle.setAttribute("title", "Switch to dark theme");
  }
};

const revealEasterEgg = (message) => {
  if (!easterEgg) {
    return;
  }

  easterEgg.textContent = message;
  easterEgg.classList.add("is-visible");
};

const hideEasterEgg = () => {
  if (!easterEgg) {
    return;
  }

  easterEgg.textContent = "";
  easterEgg.classList.remove("is-visible");
};

const setBanner = (message) => {
  if (!eggBanner) {
    return;
  }

  if (message) {
    eggBanner.textContent = message;
    eggBanner.classList.add("is-visible");
    return;
  }

  eggBanner.textContent = "";
  eggBanner.classList.remove("is-visible");
};

const setSecretControlsVisible = (isVisible) => {
  if (resetSecretsButton) {
    resetSecretsButton.classList.toggle("is-visible", isVisible);
  }
};

const getAbsoluteCenter = (element) => {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left + window.scrollX + rect.width / 2,
    y: rect.top + window.scrollY + rect.height / 2,
  };
};

const collectLeafDriftTargets = () => {
  const candidates = Array.from(document.querySelectorAll(blackHoleDriftSelector));

  return candidates.filter(
    (candidate) =>
      !candidates.some(
        (other) => other !== candidate && candidate.contains(other),
      ),
  );
};

const clearBlackHoleGravity = () => {
  document.querySelectorAll(".bh-drift-target").forEach((element) => {
    element.style.removeProperty("--bh-shift-x");
    element.style.removeProperty("--bh-shift-y");
    element.classList.remove("bh-drift-target");
  });

  document.querySelectorAll(".bh-lens-target").forEach((element) => {
    element.classList.remove("bh-lens-target");
  });
};

const applyBlackHoleGravity = () => {
  if (!blackHoleProject) {
    return;
  }

  const blackHoleCenter = getAbsoluteCenter(blackHoleProject);
  const targets = collectLeafDriftTargets();

  targets.forEach((target) => {
    const targetCenter = getAbsoluteCenter(target);
    const dx = blackHoleCenter.x - targetCenter.x;
    const dy = blackHoleCenter.y - targetCenter.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 1) {
      target.style.setProperty("--bh-shift-x", "0px");
      target.style.setProperty("--bh-shift-y", "0px");
      target.classList.add("bh-drift-target");
      return;
    }

    const pullStrength = Math.max(0.2, 1 - Math.min(distance, 1900) / 1900);
    const magnitude = 1.6 + pullStrength * 6.4;
    const shiftX = (dx / distance) * magnitude;
    const shiftY = (dy / distance) * magnitude;

    target.style.setProperty("--bh-shift-x", `${shiftX.toFixed(2)}px`);
    target.style.setProperty("--bh-shift-y", `${shiftY.toFixed(2)}px`);
    target.classList.add("bh-drift-target");
  });

  document.querySelectorAll(blackHoleLensSelector).forEach((element) => {
    element.classList.add("bh-lens-target");
  });
};

const refreshBlackHoleGravity = () => {
  clearBlackHoleGravity();

  if (root.classList.contains("egg-konami")) {
    applyBlackHoleGravity();
  }
};

const updateEggMode = () => {
  const konamiUnlocked = localStorage.getItem(konamiStorageKey) === "1";
  const logoUnlocked = localStorage.getItem(logoStorageKey) === "1";
  const hasUnlockedSecrets = konamiUnlocked || logoUnlocked;

  root.classList.toggle("egg-konami", konamiUnlocked);
  root.classList.toggle("egg-logo", logoUnlocked);
  setSecretControlsVisible(hasUnlockedSecrets);
  refreshBlackHoleGravity();

  if (konamiUnlocked && logoUnlocked) {
    revealEasterEgg("Spacetime curvature increased.");
    setBanner("BLACK HOLE MODE — Relic layer detected");
    return;
  }

  if (konamiUnlocked) {
    revealEasterEgg("Spacetime curvature increased.");
    setBanner("BLACK HOLE MODE — Gravitational lensing active");
    return;
  }

  if (logoUnlocked) {
    revealEasterEgg("Logo secret active: relic mode enabled ✨");
    setBanner("RELIC MODE — Hidden developer layer enabled");
    return;
  }

  hideEasterEgg();
  setBanner("");
};

applyTheme(getPreferredTheme());

themeToggle.addEventListener("click", () => {
  const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  localStorage.setItem(storageKey, nextTheme);
  applyTheme(nextTheme);
});

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

updateEggMode();

const konamiCode = [
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

let konamiIndex = 0;

document.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const expected = konamiCode[konamiIndex];

  if (key === expected) {
    konamiIndex += 1;

    if (konamiIndex === konamiCode.length) {
      localStorage.setItem(konamiStorageKey, "1");
      updateEggMode();
      konamiIndex = 0;
    }
  } else {
    konamiIndex = key === konamiCode[0] ? 1 : 0;
  }
});

let logoClicks = 0;

if (logo) {
  logo.addEventListener("click", () => {
    logoClicks += 1;

    if (logoClicks === 7) {
      localStorage.setItem(logoStorageKey, "1");
      updateEggMode();
      logoClicks = 0;
    }
  });
}

if (resetSecretsButton) {
  resetSecretsButton.addEventListener("click", () => {
    localStorage.removeItem(konamiStorageKey);
    localStorage.removeItem(logoStorageKey);
    updateEggMode();
  });
}

window.addEventListener("resize", () => {
  if (!root.classList.contains("egg-konami")) {
    return;
  }

  if (gravityResizeFrame) {
    cancelAnimationFrame(gravityResizeFrame);
  }

  gravityResizeFrame = requestAnimationFrame(() => {
    refreshBlackHoleGravity();
  });
});