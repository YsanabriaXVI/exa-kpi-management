import { test, expect } from '@playwright/test'

const BASE = 'http://ems.exasa.net:3000'

test.describe('Smoke tests — fixed pages', () => {
  test('Gate IN page loads without 500', async ({ page }) => {
    const apiErrors: { url: string; status: number }[] = []
    page.on('response', (res) => {
      if (res.url().includes('/api/') && res.status() >= 400) {
        apiErrors.push({ url: res.url(), status: res.status() })
      }
    })

    await page.goto(`${BASE}/depot-main/gate-in`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    expect(page.url()).not.toContain('/login')

    const serverErrors = apiErrors.filter((e) => e.status >= 500)
    expect(serverErrors).toHaveLength(0)

    const hasContent = await page
      .locator('table, [class*="list"], [class*="gate"], [class*="Card"], .card')
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasContent).toBeTruthy()
  })

  test('Gate OUT page loads without error', async ({ page }) => {
    const apiErrors: { url: string; status: number }[] = []
    page.on('response', (res) => {
      if (res.url().includes('/api/') && res.status() >= 500) {
        apiErrors.push({ url: res.url(), status: res.status() })
      }
    })

    await page.goto(`${BASE}/depot-main/gate-out`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    expect(page.url()).not.toContain('/login')
    expect(apiErrors).toHaveLength(0)
  })

  test('Tires page loads without 400', async ({ page }) => {
    const tiresResponses: { url: string; status: number }[] = []
    page.on('response', (res) => {
      if (res.url().includes('tires-assignment-service')) {
        tiresResponses.push({ url: res.url(), status: res.status() })
      }
    })

    await page.goto(`${BASE}/mr/tires`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    expect(page.url()).not.toContain('/login')

    const badRequests = tiresResponses.filter((r) => r.status === 400)
    expect(badRequests).toHaveLength(0)
  })

  test('Depot Statement page loads', async ({ page }) => {
    const apiErrors: { url: string; status: number }[] = []
    page.on('response', (res) => {
      if (res.url().includes('/api/') && res.status() >= 500) {
        apiErrors.push({ url: res.url(), status: res.status() })
      }
    })

    await page.goto(`${BASE}/depot-main/depot-statement`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })
    await page.waitForTimeout(3000)

    expect(page.url()).not.toContain('/login')
    expect(apiErrors).toHaveLength(0)
  })

  test('Gates list page loads', async ({ page }) => {
    const apiErrors: { url: string; status: number }[] = []
    page.on('response', (res) => {
      if (res.url().includes('/api/') && res.status() >= 500) {
        apiErrors.push({ url: res.url(), status: res.status() })
      }
    })

    await page.goto(`${BASE}/depot-main/gates`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    expect(page.url()).not.toContain('/login')
    expect(apiErrors).toHaveLength(0)
  })

  test('no console errors from API failures on Gate IN', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('runtime.lastError')) {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto(`${BASE}/depot-main/gate-in`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    const apiConsoleErrors = consoleErrors.filter(
      (e) => e.includes('500') || e.includes('400') || e.includes('ERR_NETWORK'),
    )
    expect(apiConsoleErrors).toHaveLength(0)
  })
})
