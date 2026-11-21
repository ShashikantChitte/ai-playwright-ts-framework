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
    .transform((v) =>
      v === undefined || v === '' ? def : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase()),
    );
const clean = (v?: string) => {
  const t = (v ?? '').split('#')[0]!.trim();
  return t === '' ? undefined : t;
};

const schema = z.object({
  TEST_ENV: z.enum(['dev', 'qa', 'prod']).default('prod'),
  BASE_URL: z.string().url().default('https://shop.qaautomationlabs.com'),
  API_BASE_URL: z.string().url().default('https://testing.qaautomationlabs.com/api/v1'),

  SHOP_USER_EMAIL: z.string().default('demo@demo.com'),
  SHOP_USER_PASSWORD: z.string().default('demo'),
  API_USER_EMAIL: z.string().default('qa@demo.io'),
  API_USER_PASSWORD: z.string().default('Password123'),

  CI: bool(false),
  HEADLESS: bool(true),
  WORKERS: z
    .string()
    .optional()
    .transform(clean)
    .refine(
      (v) => v === undefined || /^\d+%?$/.test(v),
      'WORKERS must be a number or a percentage like 50%',
    ),
  RETRIES: z
    .string()
    .optional()
    .transform(clean)
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

/** Drops inline "# comments" and blanks (Docker env_file keeps them in some cases). */


export const env = {
  ...raw,
  extraHeaders: parseHeaders(raw.EXTRA_HTTP_HEADERS),
  aiEnabled: Boolean(raw.ANTHROPIC_API_KEY),
} as const;

export type Env = typeof env;
