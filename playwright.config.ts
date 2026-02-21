import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 15_000,
  use: {
    baseURL: 'http://localhost:4321',
  },
  webServer: {
    command: 'yarn dev',
    port: 4321,
    reuseExistingServer: !process.env.CI,
  },
});
