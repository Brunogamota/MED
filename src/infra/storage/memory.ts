import type { DocumentStorage, StoredBlob } from '@/infra/storage/types';

/**
 * In-process document storage.
 *
 * For local development and demo deployments only. On serverless the contents
 * live inside a single instance and vanish on cold start — the same limitation
 * as the in-memory repository, and surfaced the same way in the UI.
 */
export class InMemoryDocumentStorage implements DocumentStorage {
  readonly kind = 'in-memory';
  private readonly blobs = new Map<string, StoredBlob>();

  async put(key: string, blob: StoredBlob): Promise<void> {
    this.blobs.set(key, blob);
  }

  async get(key: string): Promise<StoredBlob | null> {
    return this.blobs.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.blobs.delete(key);
  }
}
