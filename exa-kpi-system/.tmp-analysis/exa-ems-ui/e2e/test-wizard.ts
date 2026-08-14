import { chromium } from '@playwright/test'

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()

  console.log('>> Navigating to wizard...')
  await page.goto('http://ems.exasa.net:3000/operations/payments/new', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // ── Test 1: Default state — Weeks + Exchange Rate visible ──
  console.log('\n== Test 1: Default state ==')
  const exchangeRateVisible = await page.locator('input[type="number"][step="0.01"]').isVisible()
  console.log(`  Exchange Rate visible: ${exchangeRateVisible} (expected: true)`)

  // ── Test 2: Select SUBDIVISION_STATEMENT ──
  console.log('\n== Test 2: Select SUBDIVISION_STATEMENT ==')
  const typeSelect = page.locator('select').first()
  await typeSelect.selectOption('SUBDIVISION_STATEMENT')
  await page.waitForTimeout(500)

  // Take a screenshot
  await page.screenshot({ path: 'e2e/screenshot-subdivision.png', fullPage: true })
  console.log('  Screenshot saved: e2e/screenshot-subdivision.png')

  // Check Weeks is hidden
  const weeksVisible = await page.getByText('Weeks', { exact: true }).isVisible().catch(() => false)
  console.log(`  Weeks field visible: ${weeksVisible} (expected: false)`)

  // Check Exchange Rate is hidden
  const erVisible = await page.locator('input[type="number"][step="0.01"]').isVisible()
  console.log(`  Exchange Rate visible: ${erVisible} (expected: false)`)

  // Check Show KMs is still visible
  const showKmsVisible = await page.getByText(/show\s*k/i).isVisible().catch(() => false)
  console.log(`  Show KMs visible: ${showKmsVisible} (expected: true)`)

  // Check Clients multi-select is visible
  const clientsVisible = await page.getByText('Clients', { exact: false }).first().isVisible().catch(() => false)
  console.log(`  Clients field visible: ${clientsVisible} (expected: true)`)

  // Check Subdivision dropdown is visible
  const subdivisionVisible = await page.getByText('Subdivision', { exact: false }).first().isVisible().catch(() => false)
  console.log(`  Subdivision field visible: ${subdivisionVisible} (expected: true)`)

  // ── Test 3: Switch to CLIENT_INVOICE — verify fields return ──
  console.log('\n== Test 3: Switch to CLIENT_INVOICE ==')
  await typeSelect.selectOption('CLIENT_INVOICE')
  await page.waitForTimeout(500)

  const weeksBack = await page.getByText('Weeks', { exact: true }).isVisible().catch(() => false)
  const erBack = await page.locator('input[type="number"][step="0.01"]').isVisible()
  console.log(`  Weeks field visible: ${weeksBack} (expected: true)`)
  console.log(`  Exchange Rate visible: ${erBack} (expected: true)`)

  await page.screenshot({ path: 'e2e/screenshot-client-invoice.png', fullPage: true })
  console.log('  Screenshot saved: e2e/screenshot-client-invoice.png')

  console.log('\n>> Tests complete. Browser stays open for manual inspection.')
  console.log('>> Press Ctrl+C to close.')

  // Keep browser open for inspection
  await page.waitForTimeout(300000)
  await browser.close()
})()
