import { describe, expect, it } from 'vitest';
import { withRequiredSsl } from '@/infra/repositories/prisma';

/**
 * A `POSTGRES_PRISMA_URL` que a integração do Supabase cria não traz
 * `sslmode`. O driver `pg` então conecta em claro, o pooler derruba, e a tela
 * mostra "não foi possível carregar" sem dizer por quê.
 */
describe('withRequiredSsl', () => {
  it('exige TLS quando a URL não diz nada', () => {
    const url = withRequiredSsl(
      'postgres://user:pw@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    );
    expect(new URL(url).searchParams.get('sslmode')).toBe('require');
    // não perde o que já estava lá
    expect(new URL(url).searchParams.get('pgbouncer')).toBe('true');
  });

  it('respeita o sslmode que já veio, inclusive quando desliga', () => {
    const disabled = 'postgres://user:pw@host.example:5432/db?sslmode=disable';
    expect(withRequiredSsl(disabled)).toBe(disabled);

    const verify = 'postgres://user:pw@host.example:5432/db?sslmode=verify-full';
    expect(withRequiredSsl(verify)).toBe(verify);
  });

  it('não exige TLS de banco local, que não tem certificado', () => {
    const local = 'postgresql://postgres@127.0.0.1:5432/med';
    expect(withRequiredSsl(local)).toBe(local);
    expect(withRequiredSsl('postgresql://postgres@localhost:5432/med')).toBe(
      'postgresql://postgres@localhost:5432/med',
    );
  });

  it('devolve string ilegível intacta em vez de estourar', () => {
    expect(withRequiredSsl('isto não é uma URL')).toBe('isto não é uma URL');
  });
});
