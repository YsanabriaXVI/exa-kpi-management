import { defineConfig } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, 'e2e', '.auth-state.json')

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://ems.exasa.net:3000',
    headless: false,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
})
