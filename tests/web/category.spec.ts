import { test } from '../../src/fixtures';

// UNVERIFIED locators: tagged @regression (not @smoke) until the category page structure is confirmed.
// Promote to @smoke once green against the live site.
test.describe('Category page (Men Fashion)', () => {
  test('lists products', { tag: ['@regression', '@catalogue'] }, async ({ categoryPage }) => {
    await categoryPage.open();
    await categoryPage.expectProductsListed(1);
  });
});
