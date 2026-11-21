import { test, type APIRequestContext, type APIResponse } from '@playwright/test';
import { createLogger } from '../core/logger';

const log = createLogger('api');
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiResult<T = unknown> {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  body: T;
  durationMs: number;
  raw: APIResponse;
}

export interface RequestOptions {
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  headers?: Record<string, string>;
  /** Skip the bearer token even if the client has one (negative auth tests). */
  anonymous?: boolean;
  /** Retries for transient 429/502/503/504 (default 2 for GET, 0 otherwise). */
  retries?: number;
}

const TRANSIENT = new Set([429, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Thin, typed wrapper around Playwright's APIRequestContext:
 * bearer auth, transient-failure retry with backoff, timing, structured logging and report steps.
 */
export class ApiClient {
  constructor(
    private readonly ctx: APIRequestContext,
    private readonly token?: string,
  ) {}

  withToken(token: string): ApiClient {
    return new ApiClient(this.ctx, token);
  }

  get = <T = unknown>(path: string, o?: RequestOptions) => this.request<T>('GET', path, o);
  post = <T = unknown>(path: string, data?: unknown, o?: RequestOptions) =>
    this.request<T>('POST', path, { ...o, data });
  put = <T = unknown>(path: string, data?: unknown, o?: RequestOptions) =>
    this.request<T>('PUT', path, { ...o, data });
  patch = <T = unknown>(path: string, data?: unknown, o?: RequestOptions) =>
    this.request<T>('PATCH', path, { ...o, data });
  delete = <T = unknown>(path: string, o?: RequestOptions) => this.request<T>('DELETE', path, o);

  async request<T = unknown>(method: Method, path: string, o: RequestOptions = {}): Promise<ApiResult<T>> {
    const url = path.replace(/^\/+/, ''); // keep baseURL's /api/v1 prefix
    const maxRetries = o.retries ?? (method === 'GET' ? 2 : 0);

    return test.step(`${method} /${url}`, async () => {
      for (let attempt = 0; ; attempt++) {
        const started = Date.now();
        const headers = { ...o.headers };
        if (this.token && !o.anonymous) headers.Authorization = `Bearer ${this.token}`;

        const res = await this.ctx.fetch(url, {
          method,
          params: o.params,
          data: o.data as never,
          headers,
          failOnStatusCode: false,
        });
        const durationMs = Date.now() - started;
        log.debug(`${method} ${url} -> ${res.status()}`, { durationMs, attempt });

        if (TRANSIENT.has(res.status()) && attempt < maxRetries) {
          await sleep(300 * 2 ** attempt);
          continue;
        }

        const text = await res.text();
        let body: unknown = text;
        try {
          body = text ? JSON.parse(text) : undefined;
        } catch {
          /* non-JSON payload (csv, svg, html) - keep raw text */
        }
        return { status: res.status(), ok: res.ok(), headers: res.headers(), body: body as T, durationMs, raw: res };
      }
    });
  }
}
