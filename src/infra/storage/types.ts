/**
 * Document storage port.
 *
 * Kept behind an interface because the deployment target decides the backend:
 * an S3-compatible bucket in production, an in-process store for local work and
 * demo deployments. Nothing above this port knows which one is in use.
 */

export interface StoredBlob {
  bytes: Uint8Array;
  contentType: string;
}

export interface DocumentStorage {
  /** Identifies the backend in health output and logs. Never a secret. */
  readonly kind: string;
  put(key: string, blob: StoredBlob): Promise<void>;
  get(key: string): Promise<StoredBlob | null>;
  delete(key: string): Promise<void>;
}
