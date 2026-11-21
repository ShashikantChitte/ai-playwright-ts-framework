import { env } from '../config/env';

export interface LlmRequest {
  system: string;
  user: string;
  maxTokens?: number;
}

/**
 * Minimal Anthropic Messages API client (no SDK dependency).
 * All AI features are OPT-IN: they require ANTHROPIC_API_KEY and degrade gracefully without it.
 *
 * DATA PROTECTION: prompts may contain page DOM / accessibility snapshots. Do not enable against
 * environments that render production PII unless your data-handling policy allows it.
 */
export async function askClaude({ system, user, maxTokens = 1500 }: LlmRequest): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.AI_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n');
}

/** Pull the first JSON object/array out of a model reply (handles ```json fences). */
export function extractJson<T = unknown>(text: string): T {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)?.[1] ?? text;
  const start = fenced.search(/[[{]/);
  if (start < 0) throw new Error('No JSON found in model reply');
  return JSON.parse(fenced.slice(start)) as T;
}

/** Strip code fences from a model reply that should be plain source code. */
export function extractCode(text: string): string {
  const m = /```(?:typescript|ts)?\s*([\s\S]*?)```/i.exec(text);
  return (m?.[1] ?? text).trim() + '\n';
}
