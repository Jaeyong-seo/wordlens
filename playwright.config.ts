import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
          ],
        },
      },
    },
  ],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { WORDLENS_MOCK: "1", WORDLENS_DATA_DIR: ".data-e2e" },
  },
});
