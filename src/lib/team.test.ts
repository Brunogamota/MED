import { describe, expect, it } from 'vitest';
import { buildAccessList, maskApiKey } from '@/lib/team';
import type { AppConfig } from '@/lib/env';

function config(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    appEnv: 'production',
    organizationId: 'org_a',
    demoMode: false,
    databaseUrl: 'postgres://x',
    apiKeys: [],
    webhookSigningSecret: null,
    documentUrlSigningSecret: null,
    llm: { apiKey: null, model: 'claude-sonnet-5' },
    appUrl: 'https://example.test',
    auth: { passwordHash: 'scrypt:aa:bb', sessionSecret: 'cc', enabled: true },
    ...overrides,
  };
}

describe('maskApiKey', () => {
  it('deixa passar só os quatro últimos caracteres', () => {
    expect(maskApiKey('med_live_9f3a2b7c')).toBe('••••2b7c');
  });

  it('não vaza chave curta por inteiro', () => {
    const masked = maskApiKey('abc');
    expect(masked).toBe('••••abc');
    expect(masked.startsWith('••••')).toBe(true);
  });
});

describe('buildAccessList', () => {
  it('lista o console mesmo sem nenhuma chave', () => {
    const list = buildAccessList(config(), 'org_a');
    expect(list).toHaveLength(1);
    expect(list[0]!.kind).toBe('CONSOLE');
    expect(list[0]!.role).toBe('OWNER');
    expect(list[0]!.reference).toBeNull();
  });

  it('marca o console como desligado quando falta metade da configuração', () => {
    const list = buildAccessList(
      config({ auth: { passwordHash: 'scrypt:aa:bb', sessionSecret: null, enabled: false } }),
      'org_a',
    );
    expect(list[0]!.active).toBe(false);
    expect(list[0]!.inactiveReason).toContain('SESSION_SECRET');
  });

  it('nunca devolve a chave inteira', () => {
    const list = buildAccessList(
      config({ apiKeys: [{ key: 'med_live_9f3a2b7c', organizationId: 'org_a', role: 'ANALYST' }] }),
      'org_a',
    );
    const serialized = JSON.stringify(list);
    expect(serialized).not.toContain('med_live_9f3a2b7c');
    expect(serialized).not.toContain('9f3a2b');
    expect(list[1]!.reference).toBe('••••2b7c');
  });

  it('deriva as permissões do papel, sem repetir a tabela', () => {
    const list = buildAccessList(
      config({
        apiKeys: [
          { key: 'k1', organizationId: 'org_a', role: 'VIEWER' },
          { key: 'k2', organizationId: 'org_a', role: 'ANALYST' },
        ],
      }),
      'org_a',
    );
    expect(list[1]!.permissions).toEqual(['med:read', 'audit:read']);
    expect(list[2]!.permissions).toContain('defense:generate');
    expect(list[2]!.permissions).not.toContain('submission:create');
  });

  it('usa a organização ativa no console, não a da primeira chave', () => {
    const list = buildAccessList(
      config({ apiKeys: [{ key: 'k1', organizationId: 'org_outra', role: 'OWNER' }] }),
      'org_ativa',
    );
    expect(list[0]!.organizationId).toBe('org_ativa');
  });

  it('marca a chave que abre outra organização', () => {
    const list = buildAccessList(
      config({
        apiKeys: [
          { key: 'k1', organizationId: 'org_ativa', role: 'OWNER' },
          { key: 'k2', organizationId: 'org_outra', role: 'OWNER' },
        ],
      }),
      'org_ativa',
    );
    expect(list[1]!.foreignOrganization).toBe(false);
    expect(list[2]!.foreignOrganization).toBe(true);
  });
});
