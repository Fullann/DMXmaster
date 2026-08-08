# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> DMX Master - E2E Tests >> should launch window and display main interface
- Location: e2e/app.spec.ts:17:7

# Error details

```
"beforeAll" hook timeout of 30000ms exceeded.
```

# Test source

```ts
  1  | import { test, expect, _electron as electron, ElectronApplication } from '@playwright/test'
  2  | 
  3  | test.describe('DMX Master - E2E Tests', () => {
  4  |   let app: ElectronApplication
  5  | 
> 6  |   test.beforeAll(async () => {
     |        ^ "beforeAll" hook timeout of 30000ms exceeded.
  7  |     // Launch the electron app with the current directory
  8  |     app = await electron.launch({ args: ['.'] })
  9  |   })
  10 | 
  11 |   test.afterAll(async () => {
  12 |     if (app) {
  13 |       await app.close()
  14 |     }
  15 |   })
  16 | 
  17 |   test('should launch window and display main interface', async () => {
  18 |     // Get the main window
  19 |     const window = await app.firstWindow()
  20 |     
  21 |     // Check if the logo text is rendered (Top bar)
  22 |     const logoText = await window.locator('.topbar-logo-text').textContent()
  23 |     expect(logoText).toBe('DMX Master')
  24 | 
  25 |     // Check if the Dashboard tab is visible and active
  26 |     const dashboardTab = window.locator('#tab-dashboard')
  27 |     await expect(dashboardTab).toBeVisible()
  28 |     await expect(dashboardTab).toHaveClass(/active/)
  29 |     
  30 |     // Check if the blackout button is present
  31 |     const blackoutBtn = window.locator('#btn-blackout')
  32 |     await expect(blackoutBtn).toBeVisible()
  33 |   })
  34 | })
  35 | 
```