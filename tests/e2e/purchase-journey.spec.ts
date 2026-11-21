import { test, expect } from '../../src/fixtures';

// UNVERIFIED: depends on product/cart-page locators. Tagged @regression until confirmed; then promote to @smoke.
test.describe('Purchase journey', () => {
  test('add a product, see it in the cart, checkout is offered', { tag: ['@regression', '@e2e'] }, async ({ shopPage, categoryPage, cartPage, page }) => {
    await test.step('browse to a category and add the first product', async () => {
      await shopPage.open();
      await shopPage.openCategory('Men Fashion');
      await categoryPage.addProductToCart(0);
    });

    await test.step('cart shows the item', async () => {
      await categoryPage.openCart();
      await expect(page).toHaveURL(/cart/i);
      await cartPage.expectItems(1);
    });

    await test.step('checkout is available', async () => {
      await cartPage.expectCheckoutAvailable();
    });
  });
});
