import { expect } from '@playwright/test';
import { LOC } from './locators';
import { BasePage } from './BasePage';

/** A product-listing page such as /mens-wear.php. Product locators are UNVERIFIED (see locators.ts). */
export class CategoryPage extends BasePage {
  constructor(
    page: ConstructorParameters<typeof BasePage>[0],
    healer: ConstructorParameters<typeof BasePage>[1],
    readonly path: string = '/mens-wear.php',
  ) {
    super(page, healer);
  }

  async expectProductsListed(min = 1) {
    const cards = await this.el(LOC.category.productCards);
    await expect.poll(() => cards.count(), { message: 'product cards rendered' }).toBeGreaterThanOrEqual(min);
  }

  /** Adds the nth product (0-based) and waits until the header cart badge reflects it. */
  async addProductToCart(index = 0) {
    const before = await this.cartCount();
    const buttons = await this.el(LOC.category.addToCartButtons);
    await buttons.nth(index).click();
    await expect.poll(() => this.cartCount(), { message: 'cart badge increments' }).toBeGreaterThan(before);
  }
}
