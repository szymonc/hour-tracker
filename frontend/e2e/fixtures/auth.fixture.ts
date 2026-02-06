import { test as base, expect } from '@playwright/test';

// Extend the base test to include authenticated state
export const test = base.extend<{ authenticatedPage: any }>({
  authenticatedPage: async ({ page }, use) => {
    // Set up authentication state
    // In a real scenario, you'd either:
    // 1. Call the login API and store the token
    // 2. Use a test user with preset credentials
    // 3. Use storage state from a setup project

    await page.goto('/');

    // For testing, you could set auth state directly
    // This is a simplified example - real implementation depends on your auth strategy
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'test-token');
    });

    await use(page);
  },
});

export { expect };

// Helper function to create test user via API
export async function createTestUser(request: any) {
  const timestamp = Date.now();
  const testUser = {
    email: `test-${timestamp}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
  };

  try {
    const response = await request.post('http://localhost:3000/api/v1/auth/register', {
      data: testUser,
    });

    if (response.ok()) {
      const data = await response.json();
      return {
        ...testUser,
        accessToken: data.accessToken,
        user: data.user,
      };
    }
  } catch (error) {
    console.error('Failed to create test user:', error);
  }

  return null;
}

// Helper function to login and get token
export async function loginTestUser(request: any, email: string, password: string) {
  try {
    const response = await request.post('http://localhost:3000/api/v1/auth/login', {
      data: { email, password },
    });

    if (response.ok()) {
      const data = await response.json();
      return data.accessToken;
    }
  } catch (error) {
    console.error('Failed to login test user:', error);
  }

  return null;
}

// Helper to set auth state in page
export async function setAuthState(page: any, accessToken: string) {
  await page.evaluate((token: string) => {
    localStorage.setItem('accessToken', token);
  }, accessToken);
}
