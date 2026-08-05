import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // One worker locally, on purpose. The default is one per core; this machine
  // is also a workstation running other suites, and the black-hole spec
  // software-renders a 300-step-per-pixel shader when there is no GPU. Four
  // workers still saturated it. CI can go wider.
  workers: process.env.CI ? "50%" : 1,
  reporter: "list",
  use: { baseURL: "http://localhost:4321", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "pnpm build && pnpm preview --port 4321",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
