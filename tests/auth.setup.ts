import { test as setup, expect } from '../src/fixtures';
import { env } from '../src/config/env';

/** Logs in once through the UI and stores the session for every browser project. */
setup('authenticate', async ({ page, loginPage }) => {
  await loginPage.open();
  await loginPage.login(env.SHOP_USER_EMAIL, env.SHOP_USER_PASSWORD);
  await expect(page).not.toHaveURL(/^[^?#]*\/(index\.php)?$/, { timeout: 15_000 });
  await page.context().storageState({ path: '.auth/user.json' });
});
