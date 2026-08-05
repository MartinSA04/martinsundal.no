/**
 * Konami code -> RPG. This lived in the old script.js, not rpg.js: rpg.js only
 * exposes window.MSA_RPG = { start, stop, isActive }, and something else has to
 * decide when to call start().
 *
 * Home page only. The RPG's collision model reads .card / .project-card and
 * spawns from the Cipherbound row, none of which exist elsewhere.
 */

const SEQUENCE = [
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
] as const;

declare global {
  interface Window {
    MSA_RPG?: { start(): void; stop(): void; isActive(): boolean };
  }
}

export function initKonami(): void {
  let buffer: string[] = [];

  window.addEventListener("keydown", (event) => {
    if (window.MSA_RPG?.isActive()) return;

    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    buffer.push(key);
    if (buffer.length > SEQUENCE.length) buffer.shift();

    if (
      buffer.length === SEQUENCE.length &&
      SEQUENCE.every((expected, i) => buffer[i] === expected)
    ) {
      buffer = [];
      window.MSA_RPG?.start();
    }
  });
}
