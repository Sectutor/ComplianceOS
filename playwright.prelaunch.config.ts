// Temporary pre-launch override: use system Edge instead of missing Chrome channel.
import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: 'D:/OneDrive - Intellfence/WebDev/ComplianceOS/e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    channel: 'msedge',
  },
  projects: [
    { name: 'edge', use: { channel: 'msedge' } },
  ],
});
