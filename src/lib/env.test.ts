import { describe, expect, it } from 'vitest';
import { readDatabaseUrl, readDirectDatabaseUrl } from '@/lib/env';

/**
 * Conectar um banco pela aba Storage da Vercel cria as variáveis com os nomes
 * do provedor, não com o nosso. Quando a aplicação só olhava `DATABASE_URL`,
 * o banco ficava conectado e a tela seguia em modo demo — sem nada dizendo que
 * a diferença era o nome da variável.
 */
describe('leitura da conexão', () => {
  it('prefere o nosso nome quando ele existe', () => {
    const env = { DATABASE_URL: 'nosso', POSTGRES_URL: 'da-vercel' };
    expect(readDatabaseUrl(env)).toBe('nosso');
  });

  it('aceita o nome que a Vercel e o Supabase criam', () => {
    expect(readDatabaseUrl({ POSTGRES_URL: 'da-vercel' })).toBe('da-vercel');
  });

  it('prefere a URL já preparada para o Prisma à genérica', () => {
    const env = { POSTGRES_URL: 'generica', POSTGRES_PRISMA_URL: 'prisma' };
    expect(readDatabaseUrl(env)).toBe('prisma');
  });

  it('ignora variável vazia em vez de tratá-la como conexão', () => {
    const env = { DATABASE_URL: '   ', POSTGRES_URL: 'da-vercel' };
    expect(readDatabaseUrl(env)).toBe('da-vercel');
  });

  it('sem nenhuma delas, não há banco', () => {
    expect(readDatabaseUrl({})).toBeNull();
  });

  it('migration usa a conexão sem pool quando ela existe', () => {
    const env = {
      DATABASE_URL: 'com-pool',
      POSTGRES_URL_NON_POOLING: 'direta',
    };
    expect(readDirectDatabaseUrl(env)).toBe('direta');
  });

  it('sem conexão direta declarada, migration cai na comum', () => {
    expect(readDirectDatabaseUrl({ DATABASE_URL: 'unica' })).toBe('unica');
  });
});
