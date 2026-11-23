import { test, expect } from '../../src/fixtures';
import { AuthApi, extractToken } from '../../src/api/AuthApi';
import { env } from '../../src/config/env';

test.describe('API auth', () => {
  test('login returns a token', { tag: ['@smoke', '@api'] }, async ({ api }) => {
    const res = await new AuthApi(api).login(env.API_USER_EMAIL, env.API_USER_PASSWORD);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(extractToken(res.body), 'token in response').toBeTruthy();
    expect(res.durationMs).toBeLessThan(3000);
  });

  test('wrong password is rejected', { tag: ['@regression', '@api'] }, async ({ api }) => {
    const res = await new AuthApi(api).login(env.API_USER_EMAIL, 'nope-nope');
    expect([400, 401, 403, 422]).toContain(res.status);
    expect(extractToken(res.body)).toBeUndefined();
  });
});
