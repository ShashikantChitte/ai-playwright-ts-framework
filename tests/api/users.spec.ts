import { test, expect } from '../../src/fixtures';
import { ENDPOINTS } from '../../src/api/endpoints';
import { ResourceApi } from '../../src/api/ResourceApi';
import { UserSchema, unwrap, type User } from '../../src/api/schemas';
import { buildUser } from '../../src/data/factory';

test.describe('API users CRUD', () => {
  test('list supports pagination params', { tag: ['@smoke', '@api'] }, async ({ authedApi }) => {
    const res = await new ResourceApi<User>(authedApi, ENDPOINTS.users).list({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    const data = unwrap(res.body);
    expect(Array.isArray(data)).toBe(true);
  });

  test('create -> read -> update -> delete', { tag: ['@regression', '@api'] }, async ({ authedApi }) => {
    const users = new ResourceApi<User>(authedApi, ENDPOINTS.users);
    const payload = buildUser();

    const created = await users.create(payload as Partial<User>);
    expect([200, 201]).toContain(created.status);
    const user = UserSchema.parse(unwrap(created.body));

    try {
      const fetched = await users.get(user.id);
      expect(fetched.status).toBe(200);
      expect(UserSchema.parse(unwrap(fetched.body)).id).toBe(user.id);

      const updated = await users.patch(user.id, { name: 'Renamed QA User' });
      expect([200, 204]).toContain(updated.status);
    } finally {
      const removed = await users.remove(user.id);
      expect([200, 202, 204]).toContain(removed.status);
    }

    expect((await users.get(user.id)).status).toBe(404);
  });

  test('protected route rejects anonymous callers', { tag: ['@regression', '@api', '@security'] }, async ({ authedApi }) => {
    const res = await authedApi.get(ENDPOINTS.users, { anonymous: true });
    expect([401, 403]).toContain(res.status);
  });
});
