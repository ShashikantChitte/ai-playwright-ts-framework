/**
 * Generate API contract tests from an OpenAPI 3 document (deterministic - no LLM needed).
 *
 *   npm run ai:generate-api -- --spec=./openapi.json            (file)
 *   npm run ai:generate-api -- --spec=https://host/openapi.json (URL)
 *
 * One test per operation WITHOUT path parameters: documented status, JSON content-type, latency budget.
 * Operations needing path params / bodies are listed as TODO comments for a human (or the LLM) to extend.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

interface Operation {
  summary?: string;
  operationId?: string;
  security?: unknown[];
  responses?: Record<string, unknown>;
  requestBody?: unknown;
  parameters?: Array<{ in: string; name: string; required?: boolean }>;
}
interface OpenApi {
  info?: { title?: string };
  security?: unknown[];
  paths: Record<string, Record<string, Operation>>;
}

const spec = process.argv.find((a) => a.startsWith('--spec='))?.slice(7);
if (!spec) {
  console.error('Usage: npm run ai:generate-api -- --spec=<file|url>');
  process.exit(1);
}

const loadSpec = async (): Promise<OpenApi> =>
  /^https?:/.test(spec) ? ((await (await fetch(spec)).json()) as OpenApi) : (JSON.parse(readFileSync(spec, 'utf8')) as OpenApi);

const q = JSON.stringify;

async function main() {
  const doc = await loadSpec();
  const tests: string[] = [];
  const todo: string[] = [];

  for (const [path, ops] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(ops)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      const label = `${method.toUpperCase()} ${path}`;
      const needsInput = path.includes('{') || Boolean(op.requestBody) || op.parameters?.some((p) => p.required && p.in === 'query');
      if (method !== 'get' || needsInput) {
        todo.push(`// TODO ${label}${op.summary ? ` - ${op.summary}` : ''}`);
        continue;
      }
      const ok = Object.keys(op.responses ?? {}).filter((c) => /^2\d\d$/.test(c)).map(Number);
      const secured = Boolean(op.security?.length ?? doc.security?.length);
      const client = secured ? 'authedApi' : 'api';
      tests.push(`  test(${q(label)}, { tag: ['@api', '@contract'] }, async ({ ${client} }) => {
    const res = await ${client}.get(${q(path.replace(/^\//, ''))});
    expect(${q(ok.length ? ok : [200])}).toContain(res.status);
    expect(res.headers['content-type'] ?? '').toContain('json');
    expect(res.durationMs).toBeLessThan(3000);
  });`);
    }
  }

  const file = `// GENERATED from ${spec} on ${new Date().toISOString()}\n// Review, then move into tests/api/.\nimport { test, expect } from '../../src/fixtures';\n\ntest.describe(${q(`Contract: ${doc.info?.title ?? 'API'}`)}, () => {\n${tests.join('\n\n')}\n});\n\n${todo.join('\n')}\n`;
  mkdirSync('tests/generated', { recursive: true });
  writeFileSync('tests/generated/api-contract.spec.ts', file);
  console.log(`Generated ${tests.length} tests, ${todo.length} TODO operations -> tests/generated/api-contract.spec.ts`);
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
