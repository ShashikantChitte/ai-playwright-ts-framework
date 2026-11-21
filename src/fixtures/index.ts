import { test as base, expect, type Page } from '@playwright/test';
import { env } from '../config/env';
import { Healer } from '../core/selfHealing';
import { describeStrategy } from '../core/locatorTypes';
import { ApiClient } from '../api/ApiClient';
import { AuthApi } from '../api/AuthApi';
import { CartPage, CategoryPage, LoginPage, ShopPage } from '../pages';

interface TestFixtures {
  healer: Healer;
  loginPage: LoginPage;
  shopPage: ShopPage;
  categoryPage: CategoryPage;
  cartPage: CartPage;
  api: ApiClient;
  authedApi: ApiClient;
}

interface WorkerFixtures {
  /** One API login per worker, shared by all tests in that worker. */
  apiToken: string;
}

const apiBase = env.API_BASE_URL.replace(/\/+$/, '') + '/';

export const test = base.extend<TestFixtures, WorkerFixtures>({
  /** Observability: capture console errors, page errors and failed requests; attach on failure. */
  page: async ({ page }, use, testInfo) => {
    const diag = { console: [] as string[], pageErrors: [] as string[], failedRequests: [] as string[] };
    page.on('console', (m) => m.type() === 'error' && diag.console.push(m.text()));
    page.on('pageerror', (e) => diag.pageErrors.push(e.message));
    page.on('requestfailed', (r) => diag.failedRequests.push(`${r.method()} ${r.url()} - ${r.failure()?.errorText}`));
    page.on('response', (r) => r.status() >= 500 && diag.failedRequests.push(`${r.status()} ${r.url()}`));

    await use(page);

    const failed = testInfo.status !== testInfo.expectedStatus;
    if (failed || diag.pageErrors.length) {
      await testInfo.attach('browser-diagnostics', {
        body: JSON.stringify(diag, null, 2),
        contentType: 'application/json',
      });
    }
  },

  healer: async ({ page }, use, testInfo) => {
    await use(
      new Healer(
        page as Page,
        (e) =>
          testInfo.annotations.push({
            type: 'healed-locator',
            description: `${e.key}: ${describeStrategy(e.primary)} -> ${describeStrategy(e.used)} (${e.kind})`,
          }),
        testInfo.title,
      ),
    );
  },

  loginPage: async ({ page, healer }, use) => use(new LoginPage(page, healer)),
  shopPage: async ({ page, healer }, use) => use(new ShopPage(page, healer)),
  categoryPage: async ({ page, healer }, use) => use(new CategoryPage(page, healer)),
  cartPage: async ({ page, healer }, use) => use(new CartPage(page, healer)),

  api: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL: apiBase,
      extraHTTPHeaders: { Accept: 'application/json', ...env.extraHeaders },
    });
    await use(new ApiClient(ctx));
    await ctx.dispose();
  },

  apiToken: [
    async ({ playwright }, use) => {
      const ctx = await playwright.request.newContext({
        baseURL: apiBase,
        extraHTTPHeaders: { Accept: 'application/json', ...env.extraHeaders },
      });
      const token = await new AuthApi(new ApiClient(ctx)).loginForToken(env.API_USER_EMAIL, env.API_USER_PASSWORD);
      await use(token);
      await ctx.dispose();
    },
    { scope: 'worker' },
  ],

  authedApi: async ({ api, apiToken }, use) => use(api.withToken(apiToken)),
});

export { expect };
