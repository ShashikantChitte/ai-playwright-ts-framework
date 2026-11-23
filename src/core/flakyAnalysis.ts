/**
 * Flaky-test intelligence. Pure functions (no Playwright imports) so they are unit-testable
 * and shared by the reporter, the analysis CLI and any dashboards you build later.
 */
export type Outcome = 'passed' | 'failed' | 'flaky' | 'skipped';

export interface RunRecord {
  /** projectName::file::title */
  id: string;
  title: string;
  file: string;
  project: string;
  outcome: Outcome;
  /** retries consumed (0 = passed first time) */
  retries: number;
  durationMs: number;
  /** first error message of the first failed attempt, if any */
  error?: string;
  runId: string;
  ts: string;
}

export type FlakeClass = 'stable' | 'suspect' | 'flaky' | 'broken';
export type RootCause =
  | 'timing/wait'
  | 'locator/strict-mode'
  | 'detached-element'
  | 'network/backend'
  | 'rate-limit'
  | 'bot-protection'
  | 'data/state'
  | 'assertion'
  | 'unknown';

export interface TestHealth {
  id: string;
  title: string;
  project: string;
  runs: number;
  passes: number;
  fails: number;
  flakyRuns: number;
  flips: number;
  /** 0..1  - higher is worse */
  score: number;
  classification: FlakeClass;
  likelyCause?: RootCause;
  avgDurationMs: number;
  lastError?: string;
}

export const HISTORY_WINDOW = 30;

/** Remove ANSI colour codes from Playwright error messages. */
// eslint-disable-next-line no-control-regex
export const stripAnsi = (s: string): string => s.replace(/\u001b\[[0-9;]*m/g, '');

/** Heuristic root-cause bucketing from an error message. */
export function classifyError(msg = ''): RootCause {
  const m = msg.toLowerCase();
  if (/just a moment|cloudflare|captcha|403 forbidden|blocked by bot/.test(m)) return 'bot-protection';
  if (/429|too many requests|rate.?limit/.test(m)) return 'rate-limit';
  if (/strict mode violation/.test(m)) return 'locator/strict-mode';
  if (/detached|not attached|element is not stable|intercepts pointer/.test(m)) return 'detached-element';
  if (/net::err|econnreset|econnrefused|socket hang up|502|503|504|fetch failed/.test(m)) return 'network/backend';
  if (/timeout|waiting for|exceeded/.test(m)) return 'timing/wait';
  if (/already exists|duplicate|not found|stale|conflict|409/.test(m)) return 'data/state';
  if (/expect\(|expected|received/.test(m)) return 'assertion';
  return 'unknown';
}

export function scoreTest(records: RunRecord[]): TestHealth {
  const window = records.slice(-HISTORY_WINDOW);
  const executed = window.filter((r) => r.outcome !== 'skipped');
  const passes = executed.filter((r) => r.outcome === 'passed' || r.outcome === 'flaky').length;
  const fails = executed.filter((r) => r.outcome === 'failed').length;
  const flakyRuns = executed.filter((r) => r.outcome === 'flaky').length;

  let flips = 0;
  for (let i = 1; i < executed.length; i++) {
    const prevBad = executed[i - 1]!.outcome === 'failed';
    const curBad = executed[i]!.outcome === 'failed';
    if (prevBad !== curBad) flips++;
  }

  const runs = executed.length;
  const score = runs === 0 ? 0 : Math.min(1, (flakyRuns + flips) / runs);
  const recentFlaky = executed.slice(-5).some((r) => r.outcome === 'flaky');

  let classification: FlakeClass = 'stable';
  if (runs >= 3 && fails === runs) classification = 'broken';
  else if (score >= 0.2 || recentFlaky) classification = 'flaky';
  else if (score >= 0.08) classification = 'suspect';

  const lastBad = [...executed].reverse().find((r) => r.error);
  const last = executed[executed.length - 1];
  return {
    id: last?.id ?? records[0]?.id ?? 'unknown',
    title: last?.title ?? '',
    project: last?.project ?? '',
    runs,
    passes,
    fails,
    flakyRuns,
    flips,
    score: Number(score.toFixed(3)),
    classification,
    likelyCause: lastBad?.error ? classifyError(lastBad.error) : undefined,
    avgDurationMs: runs ? Math.round(executed.reduce((a, r) => a + r.durationMs, 0) / runs) : 0,
    lastError: lastBad?.error?.split('\n')[0]?.slice(0, 200),
  };
}

export function analyse(history: Record<string, RunRecord[]>): TestHealth[] {
  return Object.values(history)
    .map(scoreTest)
    .sort((a, b) => b.score - a.score);
}

export function toMarkdown(health: TestHealth[]): string {
  const bad = health.filter((h) => h.classification !== 'stable');
  const lines = [
    '# Flaky test report',
    '',
    `Tracked tests: **${health.length}** | flaky: **${health.filter((h) => h.classification === 'flaky').length}** | suspect: **${health.filter((h) => h.classification === 'suspect').length}** | broken: **${health.filter((h) => h.classification === 'broken').length}**`,
    '',
  ];
  if (!bad.length) return [...lines, 'No flaky or suspect tests. 🎉', ''].join('\n');
  lines.push('| Class | Score | Runs | Flaky runs | Likely cause | Test |', '|---|---|---|---|---|---|');
  for (const h of bad) {
    lines.push(
      `| ${h.classification} | ${h.score} | ${h.runs} | ${h.flakyRuns} | ${h.likelyCause ?? '-'} | ${h.project} › ${h.title.replace(/\|/g, '\\|')} |`,
    );
  }
  return [...lines, ''].join('\n');
}
