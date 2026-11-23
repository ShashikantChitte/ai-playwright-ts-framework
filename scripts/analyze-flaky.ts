/**
 * Merge run data (test-results/flaky/run-*.json, also from downloaded shard artifacts) into a rolling
 * history (.flaky/history.json), score every test and emit JSON + Markdown reports.
 *
 *   npm run ai:flaky                      # analyse and print
 *   npm run ai:flaky -- --fail-on-flaky   # exit 1 if any test is classified flaky/broken (quality gate)
 *   npm run ai:flaky -- --dir=artifacts   # look for run-*.json under another directory
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HISTORY_WINDOW, analyse, toMarkdown, type RunRecord } from '../src/core/flakyAnalysis';

const args = process.argv.slice(2);
const dir = args.find((a) => a.startsWith('--dir='))?.split('=')[1] ?? 'test-results';
const failOnFlaky = args.includes('--fail-on-flaky');

function findRunFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap((name) => {
    const p = join(root, name);
    if (statSync(p).isDirectory()) return findRunFiles(p);
    return /^run-.*\.json$/.test(name) ? [p] : [];
  });
}

const HISTORY = '.flaky/history.json';
const history: Record<string, RunRecord[]> = existsSync(HISTORY)
  ? (JSON.parse(readFileSync(HISTORY, 'utf8')) as Record<string, RunRecord[]>)
  : {};

const files = findRunFiles(dir);
let added = 0;
for (const f of files) {
  for (const rec of JSON.parse(readFileSync(f, 'utf8')) as RunRecord[]) {
    const list = (history[rec.id] ??= []);
    // idempotent: the same run+test is only ever recorded once
    if (list.some((r) => r.runId === rec.runId && r.ts === rec.ts)) continue;
    list.push(rec);
    history[rec.id] = list.slice(-HISTORY_WINDOW);
    added++;
  }
}

mkdirSync('.flaky', { recursive: true });
writeFileSync(HISTORY, JSON.stringify(history, null, 2));

const health = analyse(history);
mkdirSync('test-results', { recursive: true });
writeFileSync('test-results/flaky-health.json', JSON.stringify(health, null, 2));
const md = toMarkdown(health);
writeFileSync('test-results/flaky-health.md', md);

console.log(`Merged ${added} new records from ${files.length} file(s).\n`);
console.log(md);

if (failOnFlaky && health.some((h) => h.classification === 'flaky' || h.classification === 'broken')) {
  console.error('Quality gate failed: flaky/broken tests detected.');
  process.exit(1);
}
