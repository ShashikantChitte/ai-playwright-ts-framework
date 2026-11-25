import { test, expect } from '../../src/fixtures';
import { ENDPOINTS } from '../../src/api/endpoints';
import { ResourceApi } from '../../src/api/ResourceApi';
import { UserSchema, unwrap, type User } from '../../src/api/schemas';
import { buildUser } from '../../src/data/factory';

// NOTE: this sandbox API is stateless. POST /users returns 201 but does not persist the record,
// so we assert the create contract and read only seeded data (no create -> read-back round trip).
test.describe('API users', () => {
  test('list supports pagination params', { tag: ['@smoke', '@api'] }, async ({ authedApi }) => {
    const res = await new ResourceApi<User>(authedApi, ENDPOINTS.users).list({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    const data = unwrap(res.body);
    expect(Array.isArray(data)).toBe(true);
  });

  test('get an existing user by id', { tag: ['@regression', '@api'] }, async ({ authedApi }) => {
    const users = new ResourceApi<User>(authedApi, ENDPOINTS.users);
    const list = await users.list({ page: 1, limit: 5 });
    const items = unwrap(list.body) as unknown[];
    expect(items.length, 'seeded users').toBeGreaterThan(0);
    const existing = UserSchema.parse(items[0]);

    const res = await users.get(existing.id);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(UserSchema.parse(unwrap(res.body)).id).toBe(existing.id);
  });

  test('unknown user id returns 404', { tag: ['@regression', '@api'] }, async ({ authedApi }) => {
    const res = await new ResourceApi<User>(authedApi, ENDPOINTS.users).get(999999);
    expect(res.status).toBe(404);
  });

  test('create returns the new user', { tag: ['@regression', '@api'] }, async ({ authedApi }) => {
    const payload = buildUser();
    const res = await new ResourceApi<User>(authedApi, ENDPOINTS.users).create(
      payload as Partial<User>,
    );
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const user = UserSchema.parse(unwrap(res.body));
    expect(user.id).toBeTruthy();
    expect(user.email).toBe(payload.email);
    expect(user).toMatchObject({ firstName: payload.firstName, lastName: payload.lastName });
  });

  test(
    'create rejects a payload with missing required fields',
    { tag: ['@regression', '@api'] },
    async ({ authedApi }) => {
      const res = await new ResourceApi<User>(authedApi, ENDPOINTS.users).create({});
      expect(res.status).toBe(422);
      expect((res.body as { error?: { code?: string } }).error?.code).toBe('VALIDATION_ERROR');
    },
  );

  test(
    'protected route rejects anonymous callers',
    { tag: ['@regression', '@api', '@security'] },
    async ({ authedApi }) => {
      const res = await authedApi.get(ENDPOINTS.me, { anonymous: true });
      expect([401, 403]).toContain(res.status);
    },
  );
});
