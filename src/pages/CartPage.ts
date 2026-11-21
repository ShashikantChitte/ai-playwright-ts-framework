import { expect } from '@playwright/test';
import { LOC } from './locators';
import { BasePage } from './BasePage';

export class CartPage extends BasePage {
  readonly path = '/cart.php';

  async expectItems(min = 1) {
    const items = await this.el(LOC.cart.items);
    await expect.poll(() => items.count()).toBeGreaterThanOrEqual(min);
  }

  async expectCheckoutAvailable() {
    await expect(await this.el(LOC.cart.checkout)).toBeVisible();
  }
}
