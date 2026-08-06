/**
 * Stops the node map when nobody is looking at it.
 *
 * Fig. 00 is pure CSS and needs no script to run — this only pauses it. CSS
 * animations do not stop when their element scrolls out of view, so the orbital
 * was recalculating style and repainting sixty times a second at the bottom of
 * the page, with the masthead a full screen away. Measured at 76 ms/s of main
 * thread, paid continuously; 0.4 ms/s with the animations paused.
 *
 * That is not a large number while the figure is on screen — about 1.3ms of a
 * 16.7ms frame, and the page never drops one. It is only indefensible when
 * nothing can be seen for it.
 *
 * Deliberately not a rewrite of how the figure animates. The custom property
 * that drives it is what keeps each trailing arc ending exactly on its
 * traveller, and swapping it for cheaper mechanics costs that guarantee: see
 * docs/perf-home-renders.md for what the alternatives measured.
 *
 * Nothing here is load-bearing. With the script missing or blocked the figure
 * runs exactly as it did before.
 */
const orb = document.querySelector<HTMLElement>(".orb");

if (orb) {
  new IntersectionObserver(
    (entries) => {
      /* toggleAttribute rather than a class, so the CSS reads as a state of the
         figure rather than as a modifier on it. */
      orb.toggleAttribute("data-still", !entries[0]!.isIntersecting);
    },
    /* A little margin, so the figure is already running by the time any of it
       is actually on screen. */
    { rootMargin: "150px" },
  ).observe(orb);
}
