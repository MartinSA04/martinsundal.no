import { test, expect } from "@playwright/test";

test("video transfers zero bytes before the user clicks play", async ({
  page,
}) => {
  const videoRequests: string[] = [];
  page.on("request", (r) => {
    if (/\.(webm|mp4)$/.test(new URL(r.url()).pathname))
      videoRequests.push(r.url());
  });
  await page.goto("/work/");
  await page.waitForLoadState("networkidle");
  expect(videoRequests).toHaveLength(0);
});

test("clicking the facade loads and plays the video", async ({ page }) => {
  await page.goto("/work/");
  await page.locator("[data-video-facade] button").click();
  const video = page.locator("[data-video-facade] video");
  await expect(video).toBeVisible();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState), {
      timeout: 20_000,
    })
    .toBeGreaterThan(0);
});

test("the facade is keyboard reachable and labelled", async ({ page }) => {
  await page.goto("/work/");
  const btn = page.locator("[data-video-facade] button");
  await expect(btn).toHaveAttribute("aria-label", /verdal production line/i);
  await btn.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-video-facade] video")).toBeVisible();
});

test("credits Aker Solutions and links to the source", async ({ page }) => {
  await page.goto("/work/");
  await expect(page.getByText(/aker solutions/i).first()).toBeVisible();
  await expect(
    page.locator(
      "a[href*='akersolutions.com'][href*='verdal-production-site']",
    ),
  ).toHaveCount(1);
});

test("prints no unsourced claims", async ({ page }) => {
  await page.goto("/work/");
  const body = (await page.locator("body").innerText()).toLowerCase();
  expect(body).not.toContain("10x faster");
  expect(body).not.toContain("10 times faster");
  expect(body).not.toMatch(/opened in 2024/);
  expect(body).not.toMatch(/since 2024/);
});

test("poster reserves its space so there is no layout shift", async ({
  page,
}) => {
  await page.goto("/work/");
  const img = page.locator("[data-video-facade] img");
  expect(await img.getAttribute("width")).not.toBeNull();
  expect(await img.getAttribute("height")).not.toBeNull();
});

test("emits a VideoObject naming Aker as copyright holder", async ({
  page,
}) => {
  await page.goto("/work/");
  const blocks = await page
    .locator("script[type='application/ld+json']")
    .allTextContents();
  const nodes = blocks.flatMap((b) => JSON.parse(b)["@graph"]);
  const video = nodes.find((n: any) => n["@type"] === "VideoObject");
  expect(video).toBeTruthy();
  expect(video.copyrightHolder.name).toBe("Aker Solutions");
  expect(video.duration).toBe("PT1M9S");
});

test("the play button states the file's real duration", async ({ page }) => {
  // Hardcoding it once meant the Cipherbound trailer claimed the VPL video's
  // runtime, so this asserts the label against the media itself.
  for (const [path, expected] of [
    ["/work/", "1:09"],
    ["/projects/cipherbound/", "0:33"],
  ] as const) {
    await page.goto(path);
    await expect(page.locator("[data-video-facade] .play")).toContainText(
      expected,
    );

    await page.locator("[data-video-facade] button").click();
    const seconds = await page.locator("[data-video-facade] video").evaluate(
      (v: HTMLVideoElement) =>
        new Promise<number>((resolve) => {
          if (v.readyState >= 1) return resolve(v.duration);
          v.addEventListener("loadedmetadata", () => resolve(v.duration), {
            once: true,
          });
        }),
    );
    const [m, s] = expected.split(":").map(Number);
    expect(Math.abs(seconds - (m! * 60 + s!))).toBeLessThan(1.5);
  }
});

/**
 * The cable is the page's structure, and it is measured from the section boxes
 * rather than authored. These three pin the properties that measurement has to
 * keep: it runs, it lands on the port, and neither the run nor the arms push
 * the sheet sideways.
 */
test("the cable is routed from the sections and lands on the port", async ({
  page,
}) => {
  await page.goto("/work/");
  await page.waitForFunction(
    () => !!document.querySelector(".cab-jacket")?.getAttribute("d"),
  );

  // One `d`, shared by the jacket, the core and all three signal dashes, which
  // is what lets the pulse turn every corner the cable turns.
  const ds = await page
    .locator(".cab-jacket, .cab-core, .cab-glow, .cab-sig, .cab-tip")
    .evaluateAll((els) => els.map((e) => e.getAttribute("d")));
  expect(ds).toHaveLength(5);
  expect(new Set(ds).size).toBe(1);

  // Clamps are placed along the straights by the same pass.
  expect(await page.locator(".cab-ties rect").count()).toBeGreaterThan(4);

  // The run ends on the port rather than near it.
  const { endX, portX } = await page.evaluate(() => {
    const d = document.querySelector(".cab-jacket")!.getAttribute("d")!;
    const last = d.slice(d.lastIndexOf("L") + 1).split(" ");
    const port = document.querySelector("[data-cable-end]")!;
    const page_ = document.querySelector("[data-cable-page]")!;
    const pb = port.getBoundingClientRect();
    const gb = page_.getBoundingClientRect();
    return {
      endX: Number(last[0]),
      portX: pb.left - gb.left + pb.width / 2,
    };
  });
  expect(Math.abs(endX - portX)).toBeLessThan(1);
});

test("renders without JavaScript, minus the cable", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/work/");

  await expect(page.locator("h1")).toHaveText(/welding planner/i);
  await expect(page.locator("[data-bay]")).toHaveCount(3);
  // The decoration is gone; nothing it was decorating went with it.
  expect(await page.locator(".cab-jacket").getAttribute("d")).toBeNull();

  await context.close();
});

test("has no horizontal overflow at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/work/");
  await page.waitForFunction(
    () => !!document.querySelector(".cab-jacket")?.getAttribute("d"),
  );
  const [scroll, client] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  expect(scroll).toBeLessThanOrEqual(client);
});
