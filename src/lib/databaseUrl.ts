/**
 * Nomes de variavel que carregam a string de conexao.
 *
 * Este arquivo nao importa nada, de proposito. Ele e lido tanto pela aplicacao
 * quanto pelo `prisma.config.ts`, e o carregador de configuracao do Prisma roda
 * fora do resolvedor de modulos do Next: qualquer `import` com o atalho `@/`
 * aqui derruba o `prisma migrate` inteiro com "Cannot find module".
 */

/**
 * `DATABASE_URL` e o nosso. Os outros sao os que a Vercel injeta ao conectar um
 * banco pela aba Storage — Vercel Postgres e a integracao do Supabase usam os
 * mesmos nomes. `POSTGRES_PRISMA_URL` vem antes de `POSTGRES_URL` por ja trazer
 * os parametros de pool que o Prisma espera.
 */
export const DATABASE_URL_KEYS = [
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
] as const;

/** Conexao direta, sem pool: e a unica que consegue rodar migration. */
export const DIRECT_DATABASE_URL_KEYS = [
  'DIRECT_DATABASE_URL',
  'POSTGRES_URL_NON_POOLING',
] as const;

type EnvSource = Record<string, string | undefined>;

/** Primeiro nome preenchido, ou `null` quando nenhum existe. */
export function readFirstEnv(keys: readonly string[], env: EnvSource): string | null {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return null;
}

export function readDatabaseUrl(env: EnvSource = process.env): string | null {
  return readFirstEnv(DATABASE_URL_KEYS, env);
}

/** Cai na conexao comum quando nao ha uma direta declarada. */
export function readDirectDatabaseUrl(env: EnvSource = process.env): string | null {
  return readFirstEnv(DIRECT_DATABASE_URL_KEYS, env) ?? readDatabaseUrl(env);
}
