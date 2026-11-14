import { expect, test } from '@playwright/test'

test('the start page shows the heading at phone size', async ({ page }) => {
  await page.goto('./')

  expect(page.viewportSize()).toEqual({ width: 390, height: 844 })
  await expect(page.locator('html')).toHaveAttribute('lang', 'nb')
  await expect(page.getByRole('heading', { level: 1, name: 'Tidslinje' })).toBeVisible()
})
