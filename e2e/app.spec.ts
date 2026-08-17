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

    // Default workspace is Setup, Home tab
    const homeTab = window.locator('#tab-home')
    await expect(homeTab).toBeVisible()
    await expect(homeTab).toHaveClass(/active/)
    
    // Click on Program workspace
    await window.locator('text=Program').click()

    // Check if the Dashboard tab is visible and active
    const dashboardTab = window.locator('#tab-dashboard')
    await expect(dashboardTab).toBeVisible()
    await expect(dashboardTab).toHaveClass(/active/)
    
    // Check if the blackout button is present
    const blackoutBtn = window.locator('.dashboard-blackout-btn')
    await expect(blackoutBtn).toBeVisible()
  })

  test('should navigate to Patch tab and display patch grid', async () => {
    const window = await app.firstWindow()
    
    // Switch to Setup mode
    await window.locator('button', { hasText: /^Setup$/ }).click()

    // Click on Patch tab
    await window.locator('#tab-patch').click()
    
    // Check if the patch view container is visible
    const patchView = window.locator('.patch-view')
    await expect(patchView).toBeVisible()
    
    // Check for Add Fixture button
    const addBtn = window.locator('text=Add Fixture')
    await expect(addBtn).toBeVisible()
  })

  test('should navigate to 3D View tab and load visualizer', async () => {
    const window = await app.firstWindow()
    
    // Switch to Setup mode
    await window.locator('button', { hasText: /^Setup$/ }).click()

    // Click on 3D View tab
    await window.locator('#tab-visualizer').click()
    
    // Check if the visualizer wrapper is visible
    const visualizer = window.locator('.section-title', { hasText: '3D Stage Visualizer' })
    await expect(visualizer).toBeVisible()
    
    // Check that canvas is rendering
    const canvas = window.locator('canvas')
    await expect(canvas).toBeVisible()
  })
})
