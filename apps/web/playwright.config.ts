import { defineConfig, devices } from "@playwright/test";
import { DATABASE_PORT, FAKE_DISCORD_PORT, WEB_ENVIRONMENT, WEB_PORT } from "./e2e/environment";

/** The built website (next start) against a prepared PGlite database, in Chromium. */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${WEB_PORT}` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "tsx e2e/databaseServer.ts", port: DATABASE_PORT, reuseExistingServer: false },
    { command: "tsx e2e/fakeDiscordServer.ts", port: FAKE_DISCORD_PORT, reuseExistingServer: false },
    {
      command: `next start --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}/connexion`,
      env: WEB_ENVIRONMENT,
      reuseExistingServer: false,
    },
  ],
});
