import type { Role } from '@/domain/types';
import { ROLES } from '@/domain/types';

/**
 * Environment resolution.
 *
 * Rules:
 *  - secrets are read here and nowhere else, and are never logged or returned;
 *  - a missing optional integration degrades to a documented fallback;
 *  - a missing *required* production setting fails closed rather than guessing.
 */

export type AppEnv = 'development' | 'preview' | 'production';

export interface ApiKeyGrant {
  key: string;
  organizationId: string;
  role: Role;
}

function readAppEnv(): AppEnv {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === 'production' || vercelEnv === 'preview' || vercelEnv === 'development') {
    return vercelEnv;
  }
  const appEnv = process.env.APP_ENV;
  if (appEnv === 'production' || appEnv === 'preview' || appEnv === 'development') {
    return appEnv;
  }
  return 'development';
}

function parseApiKeys(raw: string | undefined): ApiKeyGrant[] {
  if (!raw) return [];
  const grants: ApiKeyGrant[] = [];
  for (const entry of raw.split(',')) {
    const parts = entry.trim().split(':');
    if (parts.length !== 3) continue;
    const [key, organizationId, role] = parts as [string, string, string];
    if (!key || !organizationId) continue;
    if (!ROLES.includes(role as Role)) continue;
    grants.push({ key, organizationId, role: role as Role });
  }
  return grants;
}

/**
 * Nomes que carregam a string de conexao, em ordem de preferencia.
 *
 * `DATABASE_URL` e o nosso. Os outros sao os que a Vercel injeta sozinha ao
 * conectar um banco pela aba Storage — Vercel Postgres e a integracao do
 * Supabase usam os mesmos nomes. Aceitar os dois evita o modo demo silencioso:
 * o banco esta conectado, a aplicacao nao acha a variavel, e nada na tela diz
 * que o nome e que estava diferente.
 *
 * `POSTGRES_PRISMA_URL` vem antes de `POSTGRES_URL` porque ja vem com os
 * parametros de pool que o Prisma espera.
 */
const DATABASE_URL_KEYS = ['DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL'] as const;

/** Conexao direta, sem pool: e a unica que consegue rodar migration. */
const DIRECT_DATABASE_URL_KEYS = ['DIRECT_DATABASE_URL', 'POSTGRES_URL_NON_POOLING'] as const;

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

export const DEMO_ORGANIZATION_ID = 'org_demo';

export interface AppConfig {
  appEnv: AppEnv;
  /** True when no DATABASE_URL is configured: state is in-memory and ephemeral. */
  demoMode: boolean;
  databaseUrl: string | null;
  apiKeys: ApiKeyGrant[];
  webhookSigningSecret: string | null;
  documentUrlSigningSecret: string | null;
  llm: { apiKey: string | null; model: string };
  appUrl: string;
  /**
   * Login do console. Só existe quando as duas variáveis estão presentes —
   * senha sem segredo de sessão (ou o contrário) não autentica ninguém, então
   * meia configuração vale como nenhuma.
   */
  auth: { passwordHash: string | null; sessionSecret: string | null; enabled: boolean };
}

function buildAuthConfig(): AppConfig['auth'] {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim() || null;
  const sessionSecret = process.env.SESSION_SECRET?.trim() || null;
  return { passwordHash, sessionSecret, enabled: passwordHash !== null && sessionSecret !== null };
}

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;

  const databaseUrl = readDatabaseUrl();
  const appEnv = readAppEnv();
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;

  cached = {
    appEnv,
    demoMode: databaseUrl === null,
    databaseUrl,
    apiKeys: parseApiKeys(process.env.API_KEYS),
    webhookSigningSecret: process.env.WEBHOOK_SIGNING_SECRET?.trim() || null,
    documentUrlSigningSecret: process.env.DOCUMENT_URL_SIGNING_SECRET?.trim() || null,
    llm: {
      apiKey: process.env.ANTHROPIC_API_KEY?.trim() || null,
      model: process.env.LLM_MODEL?.trim() || 'claude-sonnet-5',
    },
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || vercelUrl || 'http://localhost:3000',
    auth: buildAuthConfig(),
  };

  return cached;
}

/** Only for tests: drops the memoised config so env changes take effect. */
export function resetConfigCache(): void {
  cached = null;
}
