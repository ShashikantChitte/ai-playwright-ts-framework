import { expect } from '@playwright/test';
import { LOC } from './locators';
import { BasePage } from './BasePage';

export type Category = 'Men Fashion' | 'Women Fashion' | 'Kids Fashion' | 'Electronics';

/** category -> page the "Shop Now" link opens (verified from the live page). */
export const CATEGORY_PATH: Record<Category, string> = {
  'Men Fashion': 'mens-wear.php',
  'Women Fashion': 'womens-wear.php',
  'Kids Fashion': 'kids-wear.php',
  Electronics: 'electronics.php',
};

/** /shop.php: the category landing page. */
export class ShopPage extends BasePage {
  readonly path = '/shop.php';

  async expectAllCategoriesListed() {
    const links = await this.el(LOC.shop.categoryLinks);
    await expect(links).toHaveCount(4);
  }

  /** href of each category link, as rendered. */
  async categoryHrefs(): Promise<string[]> {
    const links = await this.el(LOC.shop.categoryLinks);
    return links.evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
  }

  async openCategory(category: Category) {
    await this.page.getByRole('link', { name: `Shop ${category}`, exact: true }).click();
    await this.expectUrl(new RegExp(`${CATEGORY_PATH[category].replace('.', '\\.')}$`));
  }
}
