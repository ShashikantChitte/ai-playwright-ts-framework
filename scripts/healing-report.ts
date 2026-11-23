/** Summarise locator heals from .healing/*.jsonl and say which primary locators should be updated. */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { describeStrategy, type HealEvent } from '../src/core/locatorTypes';

const dir = '.healing';
const events: HealEvent[] = existsSync(dir)
  ? readdirSync(dir)
      .filter((f) => f.endsWith('.jsonl'))
      .flatMap((f) =>
        readFileSync(`${dir}/${f}`, 'utf8')
          .split('\n')
          .filter(Boolean)
          .map((l) => JSON.parse(l) as HealEvent),
      )
  : [];

const byKey = new Map<string, HealEvent[]>();
for (const e of events) byKey.set(e.key, [...(byKey.get(e.key) ?? []), e]);

const lines = ['# Self-healing report', '', `Heal events: **${events.length}** across **${byKey.size}** locators`, ''];
if (!events.length) lines.push('No locators needed healing. ✅');
else {
  lines.push('| Locator | Kind | Primary (broken) | Healed with | Seen | Action |', '|---|---|---|---|---|---|');
  for (const [key, list] of byKey) {
    const last = list[list.length - 1]!;
    const action = last.kind === 'ai' ? 'Review AI suggestion, then promote' : 'Promote fallback to primary in src/pages/locators.ts';
    lines.push(`| ${key} | ${last.kind} | \`${describeStrategy(last.primary)}\` | \`${describeStrategy(last.used)}\` | ${list.length} | ${action} |`);
  }
}
mkdirSync('test-results', { recursive: true });
writeFileSync('test-results/healing-report.md', lines.join('\n') + '\n');
console.log(lines.join('\n'));
