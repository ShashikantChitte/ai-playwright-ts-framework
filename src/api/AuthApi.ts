import { ENDPOINTS } from './endpoints';
import type { ApiClient, ApiResult } from './ApiClient';

/** Tolerant token extraction: {token} | {accessToken} | {access_token} | {data:{...}}. */
export function extractToken(body: unknown): string | undefined {
  const visit = (o: unknown): string | undefined => {
    if (!o || typeof o !== 'object') return undefined;
    const rec = o as Record<string, unknown>;
    for (const k of ['token', 'accessToken', 'access_token', 'jwt']) {
      if (typeof rec[k] === 'string') return rec[k] as string;
    }
    return visit(rec.data);
  };
  return visit(body);
}

export class AuthApi {
  constructor(private readonly api: ApiClient) {}

  login(email: string, password: string): Promise<ApiResult> {
    return this.api.post(ENDPOINTS.login, { email, password }, { anonymous: true });
  }

  async loginForToken(email: string, password: string): Promise<string> {
    const res = await this.login(email, password);
    const token = extractToken(res.body);
    if (!res.ok || !token) {
      throw new Error(`API login failed (HTTP ${res.status}); check API_USER_EMAIL/API_USER_PASSWORD and ENDPOINTS.login`);
    }
    return token;
  }
}
