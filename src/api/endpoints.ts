/**
 * Single place for API paths (RELATIVE - no leading slash, so the /api/v1 base path is preserved).
 * Verify against the OpenAPI spec (https://api.qaautomationlabs.com/swagger.html) and adjust here only.
 * Generate the full set of tests from the spec with: npm run ai:generate-api -- --spec=<openapi.json>
 */
export const ENDPOINTS = {
  login: 'auth/login',
  register: 'auth/register',
  refresh: 'auth/refresh',
  users: 'users',
  orders: 'orders',
  products: 'products',
} as const;
