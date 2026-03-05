import { test, expect } from '@playwright/test';

test('homepage loads and has basic content', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/travel/i);
});

