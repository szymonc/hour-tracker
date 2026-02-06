import { test, expect } from '@playwright/test';

test.describe('Log Hours', () => {
  test.describe('Unauthenticated access', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/app/log-hours');
      await expect(page).toHaveURL(/.*login/);
    });
  });

  // These tests require authenticated state
  test.describe('Form validation', () => {
    test.skip('should display log hours form', async ({ page }) => {
      await page.goto('/app/log-hours');
      await expect(page.getByRole('heading', { name: /log hours/i })).toBeVisible();
      await expect(page.getByLabel(/date/i)).toBeVisible();
      await expect(page.getByLabel(/circle/i)).toBeVisible();
      await expect(page.getByLabel(/hours/i)).toBeVisible();
      await expect(page.getByLabel(/description/i)).toBeVisible();
    });

    test.skip('should have cancel button linking to dashboard', async ({ page }) => {
      await page.goto('/app/log-hours');
      const cancelButton = page.getByRole('button', { name: /cancel/i });
      await expect(cancelButton).toBeVisible();
      await cancelButton.click();
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test.skip('should show reason field when hours is 0', async ({ page }) => {
      await page.goto('/app/log-hours');
      await page.getByLabel(/hours/i).fill('0');
      await expect(page.getByLabel(/reason for 0 hours/i)).toBeVisible();
    });

    test.skip('should hide reason field when hours is greater than 0', async ({ page }) => {
      await page.goto('/app/log-hours');
      await page.getByLabel(/hours/i).fill('2');
      await expect(page.getByLabel(/reason for 0 hours/i)).not.toBeVisible();
    });

    test.skip('should require description', async ({ page }) => {
      await page.goto('/app/log-hours');
      await page.getByLabel(/description/i).click();
      await page.getByLabel(/hours/i).click();
      await expect(page.getByText(/description is required/i)).toBeVisible();
    });

    test.skip('should not allow negative hours', async ({ page }) => {
      await page.goto('/app/log-hours');
      await page.getByLabel(/hours/i).fill('-1');
      await expect(page.getByText(/hours must be 0 or greater/i)).toBeVisible();
    });
  });
});
