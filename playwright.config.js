import { defineConfig } from '@playwright/test'

const localUrl = 'http://127.0.0.1:5184'

export default defineConfig({
  testDir: './tests',
  testMatch: 'responsive.spec.js',
  timeout: 45000,
  workers: 2,
  reporter: [['line'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.UI_AUDIT_BASE_URL || localUrl,
    reducedMotion: 'reduce',
    locale: 'en-AU',
    trace: 'retain-on-failure',
  },
  webServer: process.env.UI_AUDIT_BASE_URL ? undefined : {
    command: 'npm run dev -- --host 127.0.0.1 --port 5184 --strictPort',
    url: localUrl,
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: 'https://gqogroabhqnxtmvgnqnh.supabase.co',
      VITE_BOOKING_FUNCTION: 'bookings-test',
    },
  },
})