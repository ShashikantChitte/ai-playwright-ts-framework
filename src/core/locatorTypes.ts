import type { Page } from '@playwright/test';

export type Role = Parameters<Page['getByRole']>[0];

/** One way of finding an element. Listed in priority order inside a LocatorSpec. */
export type Strategy =
  | { by: 'testid'; value: string }
  | { by: 'role'; role: Role; name?: string | RegExp; exact?: boolean }
  | { by: 'label'; value: string | RegExp }
  | { by: 'placeholder'; value: string | RegExp }
  | { by: 'text'; value: string | RegExp }
  | { by: 'css'; value: string };

/**
 * A logical element ("login email field") with an ordered list of ways to find it.
 * strategies[0] is the PRIMARY (preferred) locator; the rest are fallbacks used for self-healing.
 */
export interface LocatorSpec {
  /** Stable logical id, e.g. "login.email". Used for caching and reporting. */
  key: string;
  /** Human description, also fed to the AI advisor. */
  description: string;
  strategies: Strategy[];
  /** The element is expected to match many nodes (lists, cards). */
  multiple?: boolean;
  /** Never ask the AI advisor for this element. */
  noAi?: boolean;
}

export interface HealEvent {
  ts: string;
  key: string;
  description: string;
  url: string;
  kind: 'fallback' | 'ai';
  primary: Strategy;
  used: Strategy;
  worker: number;
  test?: string;
}

export const describeStrategy = (s: Strategy): string => {
  switch (s.by) {
    case 'role':
      return `role=${String(s.role)}${s.name ? `[name=${String(s.name)}]` : ''}`;
    default:
      return `${s.by}=${String(s.value)}`;
  }
};
