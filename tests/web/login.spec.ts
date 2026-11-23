import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';

// These tests exercise the anonymous sign-in screen, so they drop the shared session.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('valid credentials sign the user in', { tag: ['@smoke', '@auth'] }, async ({ page, loginPage }) => {
    await loginPage.login(env.SHOP_USER_EMAIL, env.SHOP_USER_PASSWORD);
    await expect(page).toHaveURL(/shop\.php|home|dashboard|account/i);
  });

  test('invalid credentials are rejected', { tag: ['@regression', '@auth'] }, async ({ loginPage }) => {
    await loginPage.login(env.SHOP_USER_EMAIL, 'definitely-wrong-password');
    await loginPage.expectLoginFormVisible();
    await loginPage.expectErrorVisible();
  });

  test('autofill fills the demo credentials', { tag: '@regression' }, async ({ loginPage }) => {
    await loginPage.autofillDemoCredentials();
    await loginPage.expectEmailValue(env.SHOP_USER_EMAIL);
    await loginPage.expectPasswordFilled();
  });

  test('register link navigates to registration', { tag: '@regression' }, async ({ loginPage }) => {
    await loginPage.goToRegister();
    await loginPage.expectUrl(/register/i);
  });
});
