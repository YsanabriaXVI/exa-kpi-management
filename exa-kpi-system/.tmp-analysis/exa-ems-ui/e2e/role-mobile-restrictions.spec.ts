import { test, expect } from '@playwright/test'

const BASE = 'http://ems.exasa.net:3000'

test.describe('Role 68 - Mobile Field Restrictions', () => {

  test('save and verify mobile field restrictions persist', async ({ page }) => {
    await page.goto(`${BASE}/modules/roles/edit/68`, { waitUntil: 'networkidle' })

    if (page.url().includes('/login')) {
      await page.locator('#login-username').fill('sistemas5@exasa.net')
      await page.locator('#login-password').fill('Sistem/7*')
      await page.locator('button[type="submit"]').click()
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
      await page.waitForTimeout(2000)
      await page.goto(`${BASE}/modules/roles/edit/68`, { waitUntil: 'networkidle' })
    }

    await page.waitForTimeout(2000)

    const roleNotFound = await page.locator('.alert', { hasText: 'Role not found' }).isVisible()
    if (roleNotFound) {
      test.skip()
      return
    }

    const mobileTab = page.locator('a.nav-link', { hasText: 'Mobile Field Restrictions' })
    await expect(mobileTab).toBeVisible({ timeout: 10000 })
    await mobileTab.click()
    await page.waitForTimeout(1500)

    const carrierHeader = page.locator('.card-header', { hasText: 'Carrier' }).first()
    await expect(carrierHeader).toBeVisible({ timeout: 5000 })
    await carrierHeader.locator('button', { hasText: 'Hide All' }).click()
    await page.waitForTimeout(500)

    const [putRequest] = await Promise.all([
      page.waitForRequest(req => req.method() === 'PUT' && req.url().includes('/roles/'), { timeout: 10000 }),
      page.locator('button', { hasText: 'Save Changes' }).click(),
    ])

    const response = await putRequest.response()
    if (response) {
      expect(response.status()).toBeLessThan(400)
    }

    await page.waitForTimeout(2000)

    await page.goto(`${BASE}/modules/roles/edit/68`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.locator('a.nav-link', { hasText: 'Mobile Field Restrictions' }).click()
    await page.waitForTimeout(1500)

    const carrierHeader2 = page.locator('.card-header', { hasText: 'Carrier' }).first()
    const hiddenBadge = carrierHeader2.locator('.badge', { hasText: /hidden/ })
    await expect(hiddenBadge).toBeVisible({ timeout: 5000 })
  })
})
