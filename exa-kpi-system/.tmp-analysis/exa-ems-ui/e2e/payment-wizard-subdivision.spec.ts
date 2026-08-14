import { test, expect } from '@playwright/test'

const BASE = 'http://ems.exasa.net:3000'

async function selectPaymentType(page: any, label: string) {
  const card = page.locator('div.card.h-100', { hasText: label })
  await card.click()
  await page.waitForTimeout(500)
}

test.describe('Payment Wizard – Subdivision Statement form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/operations/payments/new`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
  })

  test('hides Weeks and Show KMs when SUBDIVISION_STATEMENT is selected', async ({ page }) => {
    await selectPaymentType(page, 'Subdivision Statement')

    const mainContent = page.locator('.wrapper')
    await expect(mainContent.locator('label', { hasText: 'Weeks' })).not.toBeVisible()
    await expect(mainContent.locator('label', { hasText: 'Show Kilometers' })).not.toBeVisible()
    await expect(mainContent.locator('input[type="number"][step="0.01"]')).toBeVisible()
    await expect(mainContent.locator('label', { hasText: 'Subdivision' }).first()).toBeVisible()
  })

  test('hides Clients for SUBDIVISION_STATEMENT', async ({ page }) => {
    await selectPaymentType(page, 'Subdivision Statement')

    const mainContent = page.locator('.wrapper')
    await expect(mainContent.locator('label', { hasText: 'Subdivision' }).first()).toBeVisible()
    await expect(mainContent.locator('label', { hasText: 'Clients' })).not.toBeVisible()
  })

  test('shows Weeks + Exchange Rate + Clients for CLIENT_INVOICE', async ({ page }) => {
    await selectPaymentType(page, 'Client Invoice')

    const mainContent = page.locator('.wrapper')
    await expect(mainContent.locator('label', { hasText: 'Weeks' })).toBeVisible()
    await expect(mainContent.locator('input[type="number"][step="0.01"]')).toBeVisible()
    await expect(mainContent.locator('label', { hasText: 'Clients' })).toBeVisible()
    await expect(mainContent.locator('label', { hasText: 'Show Kilometers' })).toBeVisible()
  })

  test('shows Exchange Rate when no type selected', async ({ page }) => {
    await expect(page.locator('input[type="number"][step="0.01"]')).toBeVisible()
  })
})
