import { defineConfig } from '@playwright/test'
import process from 'node:process'

export default defineConfig({
  testDir: './e2e/sharing',
  outputDir: './test-results/sharing',
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 7000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4176',
    channel:
      process.env.PLAYWRIGHT_CHANNEL ??
      (process.platform === 'win32' ? 'msedge' : undefined),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: { viewport: { width: 375, height: 812 }, hasTouch: true },
    },
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js --mode sharing-e2e --host 127.0.0.1 --port 4176 --strictPort',
    url: 'http://127.0.0.1:4176',
    reuseExistingServer: false,
    // Dummy configuration only. Every request to this non-existent host is intercepted.
    env: {
      VITE_SUPABASE_URL: 'https://sharing.invalid',
      VITE_SUPABASE_ANON_KEY: 'test-publishable-key',
    },
  },
})
