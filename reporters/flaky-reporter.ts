import type { FullConfig, Reporter, TestCase } from '@playwright/test/reporter';
import { mkdirSync, writeFileSync } from 'node:fs';
import { classifyError, stripAnsi, type Outcome, type RunRecord } from '../src/core/flakyAnalysis';

/**
 * Records one RunRecord per test (with retry info) to test-results/flaky/run-<shard>.json.
 * It also prints Azure DevOps / GitHub warning annotations for tests that passed only on retry.
 * Historical scoring happens in `npm run ai:flaky` so sharded runs can be merged first.
 */
export default class FlakyReporter implements Reporter {
  private records: RunRecord[] = [];
  private shard = 'all';
  private readonly runId = process.env.BUILD_BUILDID ?? process.env.GITHUB_RUN_ID ?? String(Date.now());

  onBegin(config: FullConfig) {
    if (config.shard) this.shard = `${config.shard.current}of${config.shard.total}`;
  }

  onTestEnd(test: TestCase) {
    const outcome = test.outcome();
    const mapped: Outcome =
      outcome === 'expected' ? 'passed' : outcome === 'flaky' ? 'flaky' : outcome === 'skipped' ? 'skipped' : 'failed';
    const project = test.parent.project()?.name ?? 'default';
    const lastResult = test.results[test.results.length - 1];
    const firstBad = test.results.find((r) => r.status !== 'passed' && r.status !== 'skipped');
    const error = firstBad?.error?.message ? stripAnsi(firstBad.error.message) : undefined;

    this.records.push({
      id: `${project}::${test.location.file.split(/[\\/]/).slice(-2).join('/')}::${test.title}`,
      title: test.titlePath().slice(3).join(' › '),
      file: test.location.file,
      project,
      outcome: mapped,
      retries: Math.max(0, test.results.length - 1),
      durationMs: lastResult?.duration ?? 0,
      error,
      runId: this.runId,
      ts: new Date().toISOString(),
    });
  }

  onEnd() {
    mkdirSync('test-results/flaky', { recursive: true });
    writeFileSync(`test-results/flaky/run-${this.shard}.json`, JSON.stringify(this.records, null, 2));

    const flaky = this.records.filter((r) => r.outcome === 'flaky');
    for (const r of flaky) {
      const cause = classifyError(r.error);
      const msg = `FLAKY (passed after ${r.retries} retr${r.retries === 1 ? 'y' : 'ies'}, likely ${cause}): ${r.project} › ${r.title}`;
      if (process.env.TF_BUILD) console.log(`##vso[task.logissue type=warning]${msg}`);
      else if (process.env.GITHUB_ACTIONS) console.log(`::warning::${msg}`);
      else console.log(`⚠️  ${msg}`);
    }
  }

  printsToStdio() {
    return false;
  }
}
