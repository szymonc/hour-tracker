import { test, expect } from '@playwright/test';

// Helper to bypass auth for testing
async function loginAsTestUser(page: any) {
  // This would need backend test fixtures set up
  // For now, we'll simulate the authenticated state by setting localStorage
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('accessToken', 'test-token');
  });
}

test.describe('Dashboard', () => {
  test.describe('Unauthenticated access', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/app/dashboard');
      await expect(page).toHaveURL(/.*login/);
    });
  });

  // These tests require a logged-in user
  // In a real scenario, you'd use fixtures or API calls to set up auth state
  test.describe('Authenticated user', () => {
    test.skip('should display welcome message with user name', async ({ page }) => {
      // This test requires proper auth setup
      await page.goto('/app/dashboard');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });

    test.skip('should display weekly summary cards', async ({ page }) => {
      await page.goto('/app/dashboard');
      await expect(page.getByText(/last 4 weeks/i)).toBeVisible();
      await expect(page.getByText(/weekly breakdown/i)).toBeVisible();
      await expect(page.getByText(/quick actions/i)).toBeVisible();
    });

    test.skip('should have Log Hours button in header', async ({ page }) => {
      await page.goto('/app/dashboard');
      await expect(page.getByRole('button', { name: /log hours/i })).toBeVisible();
    });

    test.skip('should navigate to log hours page', async ({ page }) => {
      await page.goto('/app/dashboard');
      await page.getByRole('button', { name: /log hours/i }).first().click();
      await expect(page).toHaveURL(/.*log-hours/);
    });

    test.skip('should navigate to history page', async ({ page }) => {
      await page.goto('/app/dashboard');
      await page.getByRole('button', { name: /view history/i }).click();
      await expect(page).toHaveURL(/.*history/);
    });

    test.skip('should navigate to profile page', async ({ page }) => {
      await page.goto('/app/dashboard');
      await page.getByRole('button', { name: /edit profile/i }).click();
      await expect(page).toHaveURL(/.*profile/);
    });
  });
});
