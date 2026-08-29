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
}

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;

  const databaseUrl = process.env.DATABASE_URL?.trim() || null;
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
  };

  return cached;
}

/** Only for tests: drops the memoised config so env changes take effect. */
export function resetConfigCache(): void {
  cached = null;
}
