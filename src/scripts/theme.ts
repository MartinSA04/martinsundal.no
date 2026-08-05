/**
 * Three-state theme cycle. The *initial* theme is applied by a blocking
 * inline script in Base.astro before first paint — this module only handles
 * the toggle afterwards, so it can be deferred safely.
 */

export const THEMES = ["light", "dark", "deep-space"] as const;
export type Theme = (typeof THEMES)[number];

export const STORAGE_KEY = "msa-theme";

const LABELS: Record<Theme, string> = {
  light: "Theme: light. Switch to dark.",
  dark: "Theme: dark. Switch to deep space.",
  "deep-space": "Theme: deep space. Switch to light.",
};

function current(): Theme {
  const attr = document.documentElement.dataset.theme;
  return (THEMES as readonly string[]).includes(attr ?? "")
    ? (attr as Theme)
    : "light";
}

function apply(theme: Theme, toggle: HTMLElement | null) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode or blocked storage: the theme still applies for this page.
  }
  if (toggle) toggle.setAttribute("aria-label", LABELS[theme]);
}

export function initTheme(): void {
  const toggle = document.getElementById("theme-toggle");
  apply(current(), toggle);
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const next = THEMES[(THEMES.indexOf(current()) + 1) % THEMES.length]!;
    apply(next, toggle);
  });
}
