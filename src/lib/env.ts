import type { Role } from '@/domain/types';
import { ROLES } from '@/domain/types';
import { readDatabaseUrl } from '@/lib/databaseUrl';

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

// A lista de nomes mora em `databaseUrl.ts`, que nao importa nada: o
// `prisma.config.ts` tambem a le, e o carregador do Prisma nao resolve o
// atalho `@/`.
export {
  readDatabaseUrl,
  readDirectDatabaseUrl,
  readFirstEnv,
} from '@/lib/databaseUrl';

export const DEMO_ORGANIZATION_ID = 'org_demo';

/**
 * Organizacao que as telas do console operam.
 *
 * `ORGANIZATION_ID` manda. Sem ela, herda a da primeira chave de API, que era
 * o comportamento antigo. Sem nenhuma das duas, cai na organizacao demo.
 *
 * Nao falha quando nada esta configurado: quem protege o console e o login, e
 * nao a existencia de uma chave de API — que serve para acesso de maquina. Ate
 * o commit que trouxe este comentario, ligar um banco sem tambem definir
 * `API_KEYS` derrubava todas as telas com "Nenhuma API key configurada".
 */
export function readOrganizationId(
  env: Record<string, string | undefined> = process.env,
  apiKeys: ApiKeyGrant[] = [],
): string {
  return env.ORGANIZATION_ID?.trim() || apiKeys[0]?.organizationId || DEMO_ORGANIZATION_ID;
}

export interface AppConfig {
  appEnv: AppEnv;
  /**
   * Organizacao que o console opera. Ver `readOrganizationId`.
   */
  organizationId: string;
  /** True when no DATABASE_URL is configured: state is in-memory and ephemeral. */
  demoMode: boolean;
  databaseUrl: string | null;
  apiKeys: ApiKeyGrant[];
  webhookSigningSecret: string | null;
  documentUrlSigningSecret: string | null;
  llm: { apiKey: string | null; model: string };
  /**
   * Gmail. `refreshToken` e o que sobrevive entre deploys — sem ele o
   * conector existe mas nao le nada. `query` e a mesma sintaxe da busca do
   * Gmail, para o operador poder conferir na propria caixa o que a ferramenta
   * enxerga.
   */
  gmail: {
    clientId: string | null;
    clientSecret: string | null;
    query: string | null;
    /** Da para iniciar o consentimento: as duas metades do app existem. */
    configured: boolean;
  };
  appUrl: string;
  /**
   * Login do console. Só existe quando as duas variáveis estão presentes —
   * senha sem segredo de sessão (ou o contrário) não autentica ninguém, então
   * meia configuração vale como nenhuma.
   */
  auth: { passwordHash: string | null; sessionSecret: string | null; enabled: boolean };
}

function buildGmailConfig(): AppConfig['gmail'] {
  const clientId = process.env.GMAIL_CLIENT_ID?.trim() || null;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim() || null;
  const configured = clientId !== null && clientSecret !== null;
  return {
    clientId,
    clientSecret,
    query: process.env.GMAIL_QUERY?.trim() || null,
    configured,
  };
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
  const apiKeys = parseApiKeys(process.env.API_KEYS);
  const appEnv = readAppEnv();
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;

  cached = {
    appEnv,
    demoMode: databaseUrl === null,
    databaseUrl,
    apiKeys,
    organizationId: readOrganizationId(process.env, apiKeys),
    webhookSigningSecret: process.env.WEBHOOK_SIGNING_SECRET?.trim() || null,
    documentUrlSigningSecret: process.env.DOCUMENT_URL_SIGNING_SECRET?.trim() || null,
    llm: {
      apiKey: process.env.ANTHROPIC_API_KEY?.trim() || null,
      model: process.env.LLM_MODEL?.trim() || 'claude-sonnet-5',
    },
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || vercelUrl || 'http://localhost:3000',
    auth: buildAuthConfig(),
    gmail: buildGmailConfig(),
  };

  return cached;
}

/** Only for tests: drops the memoised config so env changes take effect. */
export function resetConfigCache(): void {
  cached = null;
}
