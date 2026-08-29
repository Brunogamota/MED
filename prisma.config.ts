import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI configuration (migrate / introspect / generate).
 *
 * The CLI uses a direct, non-pooled connection: pgbouncer-style poolers cannot
 * run migrations. The application runtime does not read this file — it passes a
 * driver adapter to PrismaClient instead (src/infra/repositories/prisma.ts).
 *
 * The URL is resolved leniently so that `prisma generate` — which needs no
 * database at all — still runs in CI and on Vercel builds where no connection
 * string is configured.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  },
});
