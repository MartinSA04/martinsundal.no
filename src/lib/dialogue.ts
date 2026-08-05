/**
 * A dialogue box's entire state, kept away from the DOM so it can be tested
 * without a browser. Deliberately dumb: advance is one-way, like the games it
 * is imitating.
 */

export interface Dialogue {
  current(): string;
  advance(): boolean;
  done(): boolean;
  index(): number;
  total(): number;
  reset(): void;
}

export function createDialogue(pages: readonly string[]): Dialogue {
  let i = 0;

  return {
    current: () => pages[i] ?? "",
    advance() {
      if (i >= pages.length - 1) return false;
      i++;
      return true;
    },
    done: () => i >= pages.length - 1,
    index: () => i,
    total: () => pages.length,
    reset() {
      i = 0;
    },
  };
}
