import { test as setup, expect } from '@playwright/test'
import path from 'path'

const BASE = 'http://ems.exasa.net:3000'
const AUTH_FILE = path.join(__dirname, '.auth-state.json')

setup('authenticate', async ({ page }) => {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })

  await page.locator('#login-username').fill('sistemas5@exasa.net')
  await page.locator('#login-password').fill('Sistem/7*')
  await page.locator('button[type="submit"]').click()

  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  await page.waitForTimeout(2000)

  await page.context().storageState({ path: AUTH_FILE })
})
