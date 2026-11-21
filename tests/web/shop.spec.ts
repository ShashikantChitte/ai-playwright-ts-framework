import { test, expect } from '../../src/fixtures';
import { CATEGORY_PATH, type Category } from '../../src/pages';

// /shop.php is the category landing page. Everything here is verified against the live page.
test.describe('Shop landing (categories)', () => {
  test.beforeEach(async ({ shopPage }) => {
    await shopPage.open();
  });

  test('shows all four categories', { tag: ['@smoke', '@catalogue'] }, async ({ shopPage }) => {
    await shopPage.expectAllCategoriesListed();
  });

  test('category links point to the right pages', { tag: ['@regression', '@catalogue'] }, async ({ shopPage }) => {
    const hrefs = await shopPage.categoryHrefs();
    expect(hrefs.sort()).toEqual(Object.values(CATEGORY_PATH).sort());
  });

  test('header shows cart and logout for a signed-in user', { tag: ['@smoke', '@auth'] }, async ({ shopPage }) => {
    await shopPage.expectHeaderVisible();
  });

  for (const category of Object.keys(CATEGORY_PATH) as Category[]) {
    test(`opens "${category}"`, { tag: '@regression' }, async ({ shopPage }) => {
      await shopPage.openCategory(category);
    });
  }

  test('page has a title and no uncaught errors', { tag: '@regression' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.reload();
    await expect(page).toHaveTitle(/.+/);
    expect(errors, 'uncaught page errors').toEqual([]);
  });
});
