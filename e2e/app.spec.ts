import { test, expect, _electron as electron, ElectronApplication } from '@playwright/test'

test.describe('DMX Master - E2E Tests', () => {
  let app: ElectronApplication

  test.beforeAll(async () => {
    // Launch the electron app with the current directory
    app = await electron.launch({ args: ['.'] })
  })

  test.afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  test('should launch window and display main interface', async () => {
    // Get the main window
    const window = await app.firstWindow()
    
    // Check if the logo text is rendered (Top bar)
    const logoText = await window.locator('.topbar-logo-text').textContent()
    expect(logoText).toBe('DMX Master')

    // Check if the Dashboard tab is visible and active
    const dashboardTab = window.locator('#tab-dashboard')
    await expect(dashboardTab).toBeVisible()
    await expect(dashboardTab).toHaveClass(/active/)
    
    // Check if the blackout button is present
    const blackoutBtn = window.locator('#btn-blackout')
    await expect(blackoutBtn).toBeVisible()
  })
})
