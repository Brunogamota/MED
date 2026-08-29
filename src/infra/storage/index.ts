import type { DocumentStorage } from '@/infra/storage/types';
import { InMemoryDocumentStorage } from '@/infra/storage/memory';
import { getConfig } from '@/lib/env';

/**
 * Storage resolution.
 *
 * Demo mode gets the in-process store so the document flow is usable end to end.
 * With a database configured, an S3-compatible bucket is required and no
 * fallback is offered: silently accepting an upload that would be lost on the
 * next cold start would destroy evidence. The S3 adapter is not implemented yet,
 * so this returns null and the routes fail closed with an explicit message.
 */

const globalStore = globalThis as unknown as { __documentStorage?: DocumentStorage };

export function getDocumentStorage(): DocumentStorage | null {
  const config = getConfig();
  if (!config.demoMode) {
    // TODO(storage): S3-compatible adapter. Configure S3_* in .env.example.
    return null;
  }
  if (!globalStore.__documentStorage) {
    globalStore.__documentStorage = new InMemoryDocumentStorage();
  }
  return globalStore.__documentStorage;
}

export type { DocumentStorage, StoredBlob } from '@/infra/storage/types';
