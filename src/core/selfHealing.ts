import type { Locator, Page } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import { env } from '../config/env';
import { suggestLocator } from '../ai/healingAdvisor';
import { createLogger } from './logger';
import { describeStrategy, type HealEvent, type LocatorSpec, type Strategy } from './locatorTypes';

const log = createLogger('healing');
const HEAL_DIR = '.healing';
const POLL_MS = 100;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function buildLocator(page: Page, s: Strategy): Locator {
  switch (s.by) {
    case 'testid':
      return page.getByTestId(s.value);
    case 'role':
      return page.getByRole(s.role, { name: s.name, exact: s.exact });
    case 'label':
      return page.getByLabel(s.value);
    case 'placeholder':
      return page.getByPlaceholder(s.value);
    case 'text':
      return page.getByText(s.value);
    case 'css':
      return page.locator(s.value);
  }
}

/**
 * Self-healing locator resolver.
 *
 * Resolution order per element:
 *   1. last-known-good strategy for this element (per worker cache)
 *   2. PRIMARY strategy, given HEALING_GRACE_MS to appear (so slow pages don't trigger false heals)
 *   3. fallback strategies, each of which must match exactly one element (unless spec.multiple)
 *   4. optional LLM suggestion (ANTHROPIC_API_KEY) - verified before use
 *
 * Every heal is logged, attached to the test as an annotation, and appended to
 * .healing/events-<pid>.jsonl so `npm run ai:healing` can tell you which locators to update.
 * A heal NEVER hides a real bug: if nothing matches, the test fails with every attempt listed.
 */
export class Healer {
  private static readonly winners = new Map<string, number>();
  private static readonly aiWinners = new Map<string, Strategy>();
  private static readonly reported = new Set<string>();

  constructor(
    private readonly page: Page,
    private readonly onHeal?: (e: HealEvent) => void,
    private readonly testTitle?: string,
  ) {}

  /** Primary locator, no waiting or healing. Use for negative assertions (not.toBeVisible). */
  raw(spec: LocatorSpec): Locator {
    return buildLocator(this.page, spec.strategies[0]!);
  }

  async locate(spec: LocatorSpec): Promise<Locator> {
    if (!env.HEALING_ENABLED) return this.raw(spec);

    const aiCached = Healer.aiWinners.get(spec.key);
    if (aiCached) {
      const loc = buildLocator(this.page, aiCached);
      if ((await loc.count().catch(() => 0)) >= 1) return loc;
    }

    const cached = Healer.winners.get(spec.key);
    const order = spec.strategies.map((_, i) => i);
    if (cached !== undefined) order.sort((a, b) => (a === cached ? -1 : b === cached ? 1 : a - b));

    const started = Date.now();
    while (Date.now() - started < env.HEALING_TIMEOUT_MS) {
      const pastGrace = cached !== undefined || Date.now() - started >= env.HEALING_GRACE_MS;
      for (const idx of pastGrace ? order : [0]) {
        const loc = buildLocator(this.page, spec.strategies[idx]!);
        const n = await loc.count().catch(() => 0);
        const acceptable = idx === 0 || spec.multiple ? n >= 1 : n === 1;
        if (!acceptable) continue;
        Healer.winners.set(spec.key, idx);
        if (idx !== 0) this.report(spec, spec.strategies[idx]!, 'fallback');
        return loc;
      }
      await sleep(POLL_MS);
    }

    if (env.aiEnabled && !spec.noAi) {
      try {
        const suggestion = await suggestLocator(this.page, spec);
        if (suggestion) {
          const loc = buildLocator(this.page, suggestion);
          if ((await loc.count().catch(() => 0)) === 1) {
            Healer.aiWinners.set(spec.key, suggestion);
            this.report(spec, suggestion, 'ai');
            return loc;
          }
        }
      } catch (err) {
        log.warn('AI locator suggestion failed', { key: spec.key, err: String(err) });
      }
    }

    throw new Error(
      `Element "${spec.description}" (${spec.key}) not found at ${this.page.url()}.\n` +
        `Tried:\n${spec.strategies.map((s, i) => `  ${i === 0 ? 'primary ' : 'fallback'} ${describeStrategy(s)}`).join('\n')}`,
    );
  }

  private report(spec: LocatorSpec, used: Strategy, kind: HealEvent['kind']) {
    const id = `${spec.key}:${kind}:${describeStrategy(used)}`;
    if (Healer.reported.has(id)) return;
    Healer.reported.add(id);

    const event: HealEvent = {
      ts: new Date().toISOString(),
      key: spec.key,
      description: spec.description,
      url: this.page.url(),
      kind,
      primary: spec.strategies[0]!,
      used,
      worker: Number(process.env.TEST_WORKER_INDEX ?? 0),
      test: this.testTitle,
    };
    log.warn(`Healed "${spec.key}" via ${kind}: ${describeStrategy(used)}`, {
      primary: describeStrategy(event.primary),
    });
    try {
      mkdirSync(HEAL_DIR, { recursive: true });
      appendFileSync(`${HEAL_DIR}/events-${process.pid}.jsonl`, JSON.stringify(event) + '\n');
    } catch {
      /* reporting must never break a test */
    }
    this.onHeal?.(event);
  }
}
