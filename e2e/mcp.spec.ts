import { test, expect, type Page } from "@playwright/test";

/**
 * Pick a question, fill its blanks with your own courses, ask.
 *
 * Narrow screens get a select where wide ones get six chips, so which control
 * is driven here depends on which one the viewport is showing.
 */
const compose = async (page: Page, prompt: string, codes: string[] = []) => {
  const chip = page.locator(`[data-mcp-chip="${prompt}"]`);
  if (await chip.isVisible()) await chip.click();
  else await page.locator("[data-mcp-select]").selectOption(prompt);
  const slots = page.locator(".chat-line input.slot");
  for (const [i, code] of codes.entries()) await slots.nth(i).fill(code);
};

const ask = (page: Page) => page.locator("[data-mcp-send]").click();

test("a filled-in prompt reaches the live worker", async ({ page }) => {
  await page.goto("/projects/ntnu-api/");
  await compose(page, "search");
  await ask(page);

  const reply = page.locator(".turn-bot").last();
  await expect(reply).toContainText(/TFY|FY\d/, { timeout: 25_000 });
  await expect(reply.locator(".call-tool")).toHaveText("search_courses");
  await expect(page.locator("[data-mcp-dot]")).toHaveAttribute(
    "data-state",
    "live",
  );
  await expect(page.locator(".turn-note")).toHaveCount(0);
});

test("the question picked is the tool called", async ({ page }) => {
  await page.goto("/projects/ntnu-api/");
  for (const [prompt, tool] of [
    ["conflicts", "check_timetable_conflicts"],
    ["compare", "compare_courses"],
    ["exam", "get_exam_info"],
  ] as const) {
    await compose(page, prompt);
    await ask(page);
    await expect(
      page.locator(".turn-bot").last().locator(".call-tool"),
    ).toHaveText(tool, { timeout: 25_000 });
  }
});

test("the courses in the blanks are the courses in the call", async ({
  page,
}) => {
  await page.goto("/projects/ntnu-api/");
  await compose(page, "conflicts", ["TDT4100", "TDT4102", ""]);
  await ask(page);

  const reply = page.locator(".turn-bot").last();
  // Year comes from the clock, so it is matched rather than pinned.
  await expect(reply.locator(".call-args")).toHaveText(
    /^\{"course_codes":\["TDT4100","TDT4102"\],"year":20\d\d\}$/,
    { timeout: 25_000 },
  );
  // The emptied optional blank leaves no wreckage in the sentence either.
  await expect(page.locator(".turn-you").last()).toHaveText(
    "do TDT4100, TDT4102 clash?",
  );
});

test("a blank that is not a course code cannot be asked", async ({ page }) => {
  await page.goto("/projects/ntnu-api/");
  await compose(page, "grades", ["quantum"]);
  await expect(page.locator("[data-mcp-send]")).toBeDisabled();
  await expect(page.locator("input.slot").first()).toHaveAttribute(
    "data-invalid",
    "true",
  );
  await page.locator("input.slot").first().fill("TDT4100");
  await expect(page.locator("[data-mcp-send]")).toBeEnabled();
});

test("the wire is one click away inside the tool call", async ({ page }) => {
  await page.goto("/projects/ntnu-api/");
  await compose(page, "course");
  await ask(page);

  const call = page.locator(".turn-bot").last().locator(".call");
  await expect(call).toBeVisible({ timeout: 25_000 });
  await expect(call.locator(".call-wire")).toBeHidden();
  await call.locator("summary").click();
  await expect(call.locator(".call-wire")).toContainText(
    '"method": "tools/call"',
  );
});

test("an unedited prompt falls back to a labelled snapshot when the worker is unreachable", async ({
  page,
}) => {
  await page.route("**ntnu-mcp.martinsundal.no/**", (r) => r.abort());
  await page.goto("/projects/ntnu-api/");
  await compose(page, "conflicts");
  await ask(page);

  const note = page.locator(".turn-note");
  await expect(note).toBeVisible({ timeout: 15_000 });
  await expect(note).toContainText(/unreachable/i);
  await expect(note).toContainText(/captured/i);
  await expect(page.locator(".turn-bot").last()).toContainText(/TFY|FY\d/);
});

test("a prompt edited to other courses reports the failure instead of inventing one", async ({
  page,
}) => {
  await page.route("**ntnu-mcp.martinsundal.no/**", (r) => r.abort());
  await page.goto("/projects/ntnu-api/");
  await compose(page, "course", ["TMA4130"]);
  await ask(page);

  const reply = page.locator(".turn-bot").last();
  await expect(reply).toContainText(/unreachable/i, { timeout: 15_000 });
  await expect(reply.locator(".mcp-facts")).toHaveCount(0);
});

test("grade distribution renders as bars", async ({ page }) => {
  await page.goto("/projects/ntnu-api/");
  await compose(page, "grades");
  await ask(page);
  await expect(page.locator(".mcp-bar-fill").first()).toBeVisible({
    timeout: 25_000,
  });
});

test("the console is keyboard operable", async ({ page }) => {
  await page.goto("/projects/ntnu-api/");
  const slot = page.locator(".chat-line input.slot").first();
  await slot.focus();
  await slot.fill("TDT4102");
  await page.keyboard.press("Enter");
  await expect(page.locator(".turn-bot").last()).toContainText(/TDT4102/, {
    timeout: 25_000,
  });
});

test("the console opens empty, the way a chat window opens", async ({
  page,
}) => {
  await page.goto("/projects/ntnu-api/");
  await expect(page.locator(".turn")).toHaveCount(0);
  await expect(page.locator("[data-mcp-log]")).toBeVisible();

  await ask(page);
  await expect(page.locator(".turn-bot")).toHaveCount(1, { timeout: 25_000 });
});

test("a blank fits what is typed into it, with no slack left over", async ({
  page,
}) => {
  await page.goto("/projects/ntnu-api/");
  // The mono face loads with `font-display: swap`, and a blank measured
  // against the fallback is the wrong width for the face that replaces it.
  await page.evaluate(() => document.fonts.ready);
  await page.locator("input.slot").first().fill("AM201306");

  const fit = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLInputElement>("input.slot")].map(
      (el) => [el.value, el.clientWidth, el.scrollWidth] as const,
    ),
  );
  for (const [value, client, scroll] of fit) {
    // Nothing clipped, and no more than a caret's worth of slack past the end.
    expect(scroll, `${value} is clipped`).toBeLessThanOrEqual(client + 1);
    expect(client - scroll, `${value} trails empty space`).toBeLessThan(6);
  }
});

test("the transcript does not trap the page's scroll", async ({ page }) => {
  await page.goto("/projects/ntnu-api/");
  await expect(
    page.evaluate(() =>
      getComputedStyle(
        document.querySelector("[data-mcp-log]")!,
      ).overscrollBehaviorY.trim(),
    ),
  ).resolves.toBe("auto");
});

test("the picker is a row of chips on a wide screen and a select on a narrow one", async ({
  page,
}, info) => {
  await page.goto("/projects/ntnu-api/");
  const wide = info.project.name === "desktop";
  await expect(page.locator(".chat-chips")).toBeVisible({ visible: wide });
  await expect(page.locator("[data-mcp-select]")).toBeVisible({
    visible: !wide,
  });

  // Whichever one is shown drives the same choice.
  await compose(page, "grades");
  await expect(page.locator("[data-mcp-line]")).toContainText("how many fail");
});

test("the console degrades to readable copy without JavaScript", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/projects/ntnu-api/");
  await expect(page.locator("[data-mcp]")).toBeVisible();
  await expect(page.locator("noscript")).toHaveCount(1);
  // The opening question still reads as a sentence, and nothing that cannot
  // work is left live to be clicked.
  await expect(page.locator("[data-mcp-line]")).toHaveText(
    "do TFY4205, FY2045 and TMA4130 clash?",
  );
  await expect(page.locator("[data-mcp-send]")).toBeDisabled();
  await ctx.close();
});

test("nothing on the page overflows a narrow phone", async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 320, height: 780 },
  });
  const page = await ctx.newPage();
  await page.goto("/projects/ntnu-api/");
  await compose(page, "conflicts");
  await ask(page);
  await expect(page.locator(".turn-bot").last()).toBeVisible({
    timeout: 25_000,
  });

  const offenders = await page.evaluate(() => {
    const bad: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      // Elements that scroll internally are allowed to be wider than the
      // screen; they just must not widen the page.
      const style = getComputedStyle(el);
      if (style.overflowX === "auto" || style.overflowX === "scroll") continue;
      if (el.closest(".mcp-scroll, .call-wire, .mcp-raw")) continue;
      if (el.getBoundingClientRect().right > window.innerWidth + 1) {
        bad.push(`${el.tagName.toLowerCase()}.${el.className}`);
      }
    }
    return bad;
  });
  expect(offenders).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await ctx.close();
});
