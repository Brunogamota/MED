import type { JsonValue } from '@/domain/types';

/**
 * Serialises a value into plain JSON, dropping `undefined` (which JSON has no
 * representation for). Used at persistence and audit boundaries so a missing
 * field is stored as absent rather than as a fabricated placeholder.
 */
export function toJson(value: unknown): JsonValue {
  if (value === undefined || value === null) return null;
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
