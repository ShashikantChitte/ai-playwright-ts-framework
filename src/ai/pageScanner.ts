import { chromium } from '@playwright/test';

export interface ScannedElement {
  tag: string;
  type?: string;
  role?: string;
  name: string;
  testid?: string;
  href?: string;
}

export interface PageScan {
  url: string;
  title: string;
  aria: string;
  elements: ScannedElement[];
}

/** Opens a URL in a real browser and returns an AI-friendly summary of the interactive surface. */
export async function scanPage(url: string, headers: Record<string, string> = {}): Promise<PageScan> {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ extraHTTPHeaders: headers });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    const title = await page.title();
    if (/just a moment|attention required/i.test(title)) {
      throw new Error('Page is behind a bot challenge; cannot scan. Run from an allow-listed network or set EXTRA_HTTP_HEADERS.');
    }
    const aria = await page.locator('body').ariaSnapshot();
    const elements = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[role],[data-testid]'),
      )
        .filter((e) => e.offsetParent !== null)
        .slice(0, 150)
        .map((e) => ({
          tag: e.tagName.toLowerCase(),
          type: e.getAttribute('type') ?? undefined,
          role: e.getAttribute('role') ?? undefined,
          name: (
            e.getAttribute('aria-label') ||
            e.getAttribute('placeholder') ||
            e.innerText ||
            (e as HTMLInputElement).value ||
            ''
          )
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 60),
          testid: e.getAttribute('data-testid') ?? undefined,
          href: e.getAttribute('href') ?? undefined,
        })),
    );
    return { url, title, aria, elements };
  } finally {
    await browser.close();
  }
}
