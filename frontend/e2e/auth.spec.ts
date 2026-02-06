import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Login page', () => {
    test('should display login form', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /circle hours/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should have link to register page', async ({ page }) => {
      await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
    });

    test('should show validation errors for invalid email', async ({ page }) => {
      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByLabel(/password/i).click();
      await expect(page.getByText(/please enter a valid email/i)).toBeVisible();
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.getByLabel(/email/i).click();
      await page.getByLabel(/password/i).click();
      await page.getByLabel(/email/i).click();
      await expect(page.getByText(/email is required/i)).toBeVisible();
    });

    test('should disable submit button when form is invalid', async ({ page }) => {
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await expect(submitButton).toBeDisabled();
    });

    test('should enable submit button when form is valid', async ({ page }) => {
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('password123');
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await expect(submitButton).toBeEnabled();
    });

    test('should toggle password visibility', async ({ page }) => {
      const passwordInput = page.getByLabel(/password/i);
      await passwordInput.fill('secret123');

      // Initially password type
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle button
      await page.getByRole('button', { name: /visibility/i }).click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
    });

    test('should have Google login button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    });
  });

  test.describe('Register page', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('link', { name: /sign up/i }).click();
    });

    test('should display register form', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
      await expect(page.getByLabel(/name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    });

    test('should have link back to login', async ({ page }) => {
      await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    });

    test('should validate password confirmation matches', async ({ page }) => {
      await page.getByLabel(/^password$/i).fill('Password123!');
      await page.getByLabel(/confirm password/i).fill('DifferentPassword!');
      await page.getByLabel(/name/i).click();
      await expect(page.getByText(/passwords must match/i)).toBeVisible();
    });
  });

  test.describe('Login flow', () => {
    test('should show error for invalid credentials', async ({ page }) => {
      await page.getByLabel(/email/i).fill('nonexistent@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 10000 });
    });
  });
});
