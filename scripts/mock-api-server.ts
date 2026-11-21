/**
 * Tiny in-memory mock of the assumed API contract. Lets CI self-test the framework offline:
 *   npm run mock:api &   API_BASE_URL=http://localhost:4010/api/v1 npm run test:api
 */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const TOKEN = 'mock-jwt-token';
const users = new Map<string, Record<string, unknown>>();

const send = (res: import('node:http').ServerResponse, status: number, body?: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = chunks.length ? (JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>) : {};
  const path = url.pathname.replace(/^\/api\/v1\//, '');
  const authed = req.headers.authorization === `Bearer ${TOKEN}`;

  if (path === 'auth/login' && req.method === 'POST') {
    return body.email === 'qa@demo.io' && body.password === 'Password123'
      ? send(res, 200, { success: true, data: { token: TOKEN } })
      : send(res, 401, { success: false, message: 'Invalid credentials' });
  }
  if (!path.startsWith('users')) return send(res, 404, { message: 'Not found' });
  if (!authed) return send(res, 401, { message: 'Unauthorized' });

  const id = path.split('/')[1];
  if (!id && req.method === 'GET') return send(res, 200, { success: true, data: [...users.values()] });
  if (!id && req.method === 'POST') {
    const u = { id: randomUUID(), ...body };
    users.set(u.id, u);
    return send(res, 201, { success: true, data: u });
  }
  const u = id ? users.get(id) : undefined;
  if (!u) return send(res, 404, { message: 'Not found' });
  if (req.method === 'GET') return send(res, 200, { success: true, data: u });
  if (req.method === 'PATCH' || req.method === 'PUT') {
    Object.assign(u, body);
    return send(res, 200, { success: true, data: u });
  }
  if (req.method === 'DELETE') {
    users.delete(id!);
    return send(res, 204);
  }
  return send(res, 405, { message: 'Method not allowed' });
}).listen(PORT, () => console.log(`mock api on :${PORT}`));
