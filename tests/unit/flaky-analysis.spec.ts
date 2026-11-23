import { test, expect } from '@playwright/test';
import { classifyError, scoreTest, type Outcome, type RunRecord } from '../../src/core/flakyAnalysis';

const rec = (outcome: Outcome, i: number, error?: string): RunRecord => ({
  id: 'p::f::t', title: 't', file: 'f', project: 'p', outcome,
  retries: outcome === 'flaky' ? 1 : 0, durationMs: 100, runId: String(i), ts: String(i), error,
});

test.describe('flaky analysis (framework self-test)', () => {
  test('stable test stays stable', () => {
    const h = scoreTest(Array.from({ length: 10 }, (_, i) => rec('passed', i)));
    expect(h.classification).toBe('stable');
    expect(h.score).toBe(0);
  });

  test('pass-after-retry history is flaky', () => {
    const h = scoreTest(['passed', 'flaky', 'passed', 'flaky', 'passed'].map((o, i) => rec(o as Outcome, i, 'Timeout 5000ms exceeded')));
    expect(h.classification).toBe('flaky');
    expect(h.likelyCause).toBe('timing/wait');
  });

  test('always failing is broken, not flaky', () => {
    const h = scoreTest(Array.from({ length: 4 }, (_, i) => rec('failed', i, 'expect(received) mismatch')));
    expect(h.classification).toBe('broken');
  });

  test('root-cause classifier', () => {
    expect(classifyError('strict mode violation: locator resolved to 2 elements')).toBe('locator/strict-mode');
    expect(classifyError('Just a moment... Cloudflare')).toBe('bot-protection');
    expect(classifyError('HTTP 429 Too Many Requests')).toBe('rate-limit');
    expect(classifyError('net::ERR_CONNECTION_RESET')).toBe('network/backend');
    expect(classifyError('')).toBe('unknown');
  });
});
