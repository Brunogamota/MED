import { randomUUID } from 'node:crypto';

/** Prefixed, sortable-enough identifiers. Prefixes make logs readable. */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}
