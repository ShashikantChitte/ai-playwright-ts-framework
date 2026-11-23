import { mkdirSync, writeFileSync } from 'node:fs';
import { test } from '../../src/fixtures';

/**
 * Locator discovery. Logs in (via the `setup` project), visits each page and writes
 * test-results/snapshots/<page>.md containing the accessibility snapshot and every data-testid.
 * Paste those files when asking for locators to be written or fixed.
 *
 *   DISCOVER_PATHS=mens-wear.php,cart.php   (comma-separated, relative to BASE_URL)
 */
const paths = (process.env.DISCOVER_PATHS ?? 'mens-wear.php,cart.php,electronics.php')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

for (const path of paths) {
  test(`snapshot ${path}`, async ({ page }) => {
    await page.goto(`/${path.replace(/^\/+/, '')}`, { waitUntil: 'networkidle' });

    const aria = await page.locator('body').ariaSnapshot();
    const testids = await page.locator('[data-testid]').evaluateAll((els) =>
      els.map((e) => ({
        testid: e.getAttribute('data-testid'),
        tag: e.tagName.toLowerCase(),
        text: ((e as HTMLElement).innerText ?? '').trim().replace(/\s+/g, ' ').slice(0, 60),
      })),
    );

    mkdirSync('test-results/snapshots', { recursive: true });
    const name = path.replace(/\W+/g, '_');
    writeFileSync(
      `test-results/snapshots/${name}.md`,
      [
        `# ${page.url()}`,
        `Title: ${await page.title()}`,
        '',
        `## data-testid elements (${testids.length})`,
        '```json',
        JSON.stringify(testids, null, 2),
        '```',
        '',
        '## Accessibility snapshot',
        '```yaml',
        aria,
        '```',
        '',
      ].join('\n'),
    );
  });
}
