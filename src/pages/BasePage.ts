import { expect, type Locator, type Page } from '@playwright/test';
import type { Healer } from '../core/selfHealing';
import type { LocatorSpec } from '../core/locatorTypes';
import { LOC } from './locators';

/** Thrown when the target answers with a bot-protection challenge instead of the app. */
export class BlockedByBotProtectionError extends Error {
  constructor(url: string) {
    super(
      `Blocked by bot protection at ${url} (Cloudflare-style challenge). ` +
        `Ask the site owner to allow-list the runner IP, or pass an agreed header via EXTRA_HTTP_HEADERS.`,
    );
  }
}

export abstract class BasePage {
  /** Path relative to baseURL, e.g. "/shop.php". */
  abstract readonly path: string;

  constructor(
    protected readonly page: Page,
    protected readonly healer: Healer,
  ) {}

  async open(): Promise<this> {
    const res = await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
    const title = await this.page.title();
    const challenged =
      /just a moment|attention required/i.test(title) || res?.headers()['cf-mitigated'] === 'challenge';
    if (challenged) throw new BlockedByBotProtectionError(this.page.url());
    return this;
  }

  /** Resolve a (self-healing) locator. */
  protected el(spec: LocatorSpec): Promise<Locator> {
    return this.healer.locate(spec);
  }

  protected async click(spec: LocatorSpec) {
    await (await this.el(spec)).click();
  }

  protected async fill(spec: LocatorSpec, value: string) {
    await (await this.el(spec)).fill(value);
  }

  async expectUrl(pattern: RegExp | string) {
    await expect(this.page).toHaveURL(pattern);
  }

  // ---- Shared header (present on every authenticated page) ----

  /** Cart badge number from the header link (0 when empty/unparsable). */
  async cartCount(): Promise<number> {
    const text = (await (await this.el(LOC.header.cartLink)).first().innerText()).trim();
    const n = /\d+/.exec(text);
    return n ? Number(n[0]) : 0;
  }

  async openCart() {
    await this.click(LOC.header.cartLink);
  }

  async search(term: string) {
    const box = await this.el(LOC.header.search);
    await box.fill(term);
    await box.press('Enter');
  }

  async expectHeaderVisible() {
    await expect(await this.el(LOC.header.cartLink)).toBeVisible();
    await expect(await this.el(LOC.header.logout)).toBeVisible();
  }
}
