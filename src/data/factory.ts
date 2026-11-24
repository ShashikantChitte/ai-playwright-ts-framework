import { randomUUID } from 'node:crypto';

/** Unique, collision-free test data (safe under fullyParallel). */
const uid = () => randomUUID().slice(0, 8);

export const buildUser = (
  over: Partial<{
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    password: string;
  }> = {},
) => {
  const id = uid();
  return {
    firstName: `QA${id}`,
    lastName: 'User',
    name: `QA User ${id}`,
    email: `qa.${id}@example.test`,
    password: `Pw!${id}Aa1`,
    ...over,
  };
};
