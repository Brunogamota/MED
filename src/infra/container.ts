import type {
  IdempotencyStore,
  IntegrationCredentialRepository,
  LoginThrottleRepository,
  MedRepository,
} from '@/infra/repositories/types';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import { getConfig } from '@/lib/env';

/**
 * Composition root.
 *
 * Demo mode (no DATABASE_URL) uses the in-memory repository so a preview
 * deployment is usable before any infrastructure exists. With DATABASE_URL set,
 * the Prisma repository is loaded lazily — that keeps the driver out of the
 * bundle entirely when it is not configured.
 */

export type Repository = MedRepository &
  IdempotencyStore &
  IntegrationCredentialRepository &
  LoginThrottleRepository;

const globalStore = globalThis as unknown as {
  __medRepository?: Repository;
  __medSeeded?: boolean;
};

export async function getRepository(): Promise<Repository> {
  if (globalStore.__medRepository) return globalStore.__medRepository;

  const config = getConfig();
  if (config.databaseUrl) {
    const { PrismaMedRepository, createPrismaClient } = await import(
      '@/infra/repositories/prisma'
    );
    globalStore.__medRepository = new PrismaMedRepository(
      createPrismaClient(config.databaseUrl),
    );
    return globalStore.__medRepository;
  }

  const repository = new InMemoryMedRepository();
  globalStore.__medRepository = repository;

  if (!globalStore.__medSeeded) {
    globalStore.__medSeeded = true;
    const { seedDemoData } = await import('@/infra/seed');
    await seedDemoData(repository);
  }

  return repository;
}

/**
 * Test seam: replaces the process-wide repository with a caller-provided one.
 * Passing `null` clears it so the next `getRepository()` builds a fresh
 * instance. Only tests should call this.
 */
export function __setRepositoryForTests(repository: Repository | null): void {
  if (repository === null) {
    delete globalStore.__medRepository;
    delete globalStore.__medSeeded;
    return;
  }
  globalStore.__medRepository = repository;
  globalStore.__medSeeded = true;
}
