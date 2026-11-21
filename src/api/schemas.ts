import { z } from 'zod';

/** Lenient contract schemas: assert the shape we depend on, tolerate additive changes. */
export const UserSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    email: z.string().email().optional(),
    name: z.string().optional(),
  })
  .passthrough();

export type User = z.infer<typeof UserSchema>;

/** Unwrap an optional {data: ...} envelope. */
export const unwrap = (body: unknown): unknown =>
  body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: unknown }).data : body;
