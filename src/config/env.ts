import 'dotenv/config';
import { z } from 'zod';

/**
 * Single source of truth for runtime configuration.
 * Everything is validated at start-up so mis-configuration fails fast with a clear message.
 */
const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())));

/** Treat "", whitespace and inline "# comments" as unset (GitHub passes missing secrets as ""). */
const unset = (v: unknown) => {
  if (typeof v !== 'string') return v;
  const t = v.split('#')[0]!.trim();
  return t === '' ? undefined : t;
};
const str = (def: string) => z.preprocess(unset, z.string().default(def));
const url = (def: string) => z.preprocess(unset, z.string().url().default(def));

const schema = z.object({
  TEST_ENV: z.enum(['dev', 'qa', 'prod']).default('prod'),
  BASE_URL: url('https://shop.qaautomationlabs.com'),
  API_BASE_URL: url('https://testing.qaautomationlabs.com/api/v1'),

  SHOP_USER_EMAIL: str('demo@demo.com'),
  SHOP_USER_PASSWORD: str('demo'),
  API_USER_EMAIL: str('qa@demo.io'),
  API_USER_PASSWORD: str('Password123'),

  CI: bool(false),
  HEADLESS: bool(true),
  WORKERS: z
    .preprocess(unset, z.string().optional())
    .refine((v) => v === undefined || /^\d+%?$/.test(v), 'WORKERS must be a number or a percentage like 50%'),
  RETRIES: z
    .preprocess(unset, z.string().optional())
    .refine((v) => v === undefined || /^\d+$/.test(v), 'RETRIES must be a whole number'),
  TRACE: z.enum(['on', 'off', 'retain-on-failure', 'on-first-retry']).default('on-first-retry'),
  RUN_QUARANTINE: bool(false),
  EXTRA_HTTP_HEADERS: z.string().optional(),

  HEALING_ENABLED: bool(true),
  HEALING_GRACE_MS: z.coerce.number().int().positive().default(1500),
  HEALING_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-sonnet-5-5'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

const raw = parsed.data;

function parseHeaders(json?: string): Record<string, string> {
  if (!json) return {};
  try {
    return z.record(z.string()).parse(JSON.parse(json));
  } catch {
    throw new Error('EXTRA_HTTP_HEADERS must be a JSON object of string values');
  }
}

export const env = {
  ...raw,
  extraHeaders: parseHeaders(raw.EXTRA_HTTP_HEADERS),
  aiEnabled: Boolean(raw.ANTHROPIC_API_KEY),
} as const;

export type Env = typeof env;
