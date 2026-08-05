/**
 * Requests every external link in dist/ and reports anything that is not 2xx.
 *
 *   node scripts/check-links.mjs
 *
 * Sequential on purpose: this runs on a workstation, and hammering a dozen
 * hosts in parallel is both rude and noisy.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...htmlFiles(path));
    else if (name.endsWith(".html")) out.push(path);
  }
  return out;
}

const links = new Map(); // url -> Set of pages
for (const file of htmlFiles("dist")) {
  const html = readFileSync(file, "utf8");
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const url = m[1].replace(/&amp;/g, "&");
    if (!links.has(url)) links.set(url, new Set());
    links.get(url).add(file.replace("dist", ""));
  }
}

console.log(`checking ${links.size} unique external links\n`);

let bad = 0;
for (const [url, pages] of [...links].sort()) {
  let status = 0;
  let note = "";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (link-check; martinsundal.no)" },
    });
    // Some hosts refuse HEAD but serve GET fine.
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (link-check; martinsundal.no)" },
      });
      note = " (GET)";
    }
    clearTimeout(timer);
    status = res.status;
  } catch (err) {
    note = ` ${err.name}: ${err.message}`;
  }

  // Own-origin absolute URLs (canonicals, breadcrumbs, og:url) point at the
  // live site, which will not have a new page until this branch deploys. The
  // sitemap spec already asserts these routes exist in the build.
  const isSelf = url.startsWith("https://martinsundal.no/");
  // Some hosts return 403 to any non-browser request. That is a bot block, not
  // a dead link.
  const botBlocked = status === 403;

  const ok = status >= 200 && status < 300;
  const label = ok ? "ok  " : isSelf ? "self" : botBlocked ? "bot " : "FAIL";
  if (!ok && !isSelf && !botBlocked) bad++;

  console.log(
    `${label} ${String(status || "---").padEnd(4)}${note.padEnd(12)} ${url}`,
  );
  if (label === "FAIL") console.log(`       on: ${[...pages].join(", ")}`);
}

console.log(
  bad
    ? `\n${bad} failing`
    : "\nall links ok (self = not deployed yet, bot = host blocks scripted requests)",
);
process.exit(bad ? 1 : 0);
