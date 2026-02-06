import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.describe('Public routes', () => {
    test('should load login page at root', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: /circle hours/i })).toBeVisible();
    });

    test('should navigate to register from login', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('link', { name: /sign up/i }).click();
      await expect(page).toHaveURL(/.*register/);
    });

    test('should navigate to login from register', async ({ page }) => {
      await page.goto('/register');
      await page.getByRole('link', { name: /sign in/i }).click();
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Protected routes', () => {
    test('should redirect /app/dashboard to login when not authenticated', async ({ page }) => {
      await page.goto('/app/dashboard');
      await expect(page).toHaveURL(/.*login/);
    });

    test('should redirect /app/log-hours to login when not authenticated', async ({ page }) => {
      await page.goto('/app/log-hours');
      await expect(page).toHaveURL(/.*login/);
    });

    test('should redirect /app/history to login when not authenticated', async ({ page }) => {
      await page.goto('/app/history');
      await expect(page).toHaveURL(/.*login/);
    });

    test('should redirect /app/profile to login when not authenticated', async ({ page }) => {
      await page.goto('/app/profile');
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('404 handling', () => {
    test('should handle unknown routes', async ({ page }) => {
      await page.goto('/unknown-route');
      // Should either redirect to login or show 404
      // In this app, it redirects to login for unauthenticated users
      await expect(page).toHaveURL(/.*login/);
    });
  });
});
