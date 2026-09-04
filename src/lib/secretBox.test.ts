import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SecretBoxError, open, readEncryptionKey, seal } from '@/lib/secretBox';

const key = randomBytes(32);

describe('readEncryptionKey', () => {
  it('aceita base64 de 32 bytes', () => {
    expect(readEncryptionKey(key.toString('base64'))).toEqual(key);
  });

  it('aceita hex de 32 bytes', () => {
    expect(readEncryptionKey(key.toString('hex'))).toEqual(key);
  });

  it('recusa chave curta, em vez de completar com zeros', () => {
    expect(() => readEncryptionKey(Buffer.alloc(16).toString('base64'))).toThrow(SecretBoxError);
  });

  it('recusa ausencia, dizendo como gerar', () => {
    expect(() => readEncryptionKey(undefined)).toThrow(/openssl rand -base64 32/);
  });
});

describe('seal e open', () => {
  it('devolve o texto original', () => {
    const secret = '1//0hXP1eQgbcHOKCgYIARAAGBESNwF-exemplo';
    expect(open(seal(secret, key), key)).toBe(secret);
  });

  it('nao vaza o texto claro no envelope', () => {
    const envelope = seal('token-secreto', key);
    expect(envelope).not.toContain('token-secreto');
  });

  it('cifra o mesmo texto de forma diferente a cada vez', () => {
    // IV aleatorio: dois envelopes iguais denunciariam que o valor nao mudou.
    expect(seal('igual', key)).not.toBe(seal('igual', key));
  });

  it('recusa envelope adulterado', () => {
    const envelope = seal('token', key);
    const parts = envelope.split('.');
    const data = Buffer.from(parts[3] as string, 'base64url');
    data[0] = data[0] === 0 ? 1 : 0;
    parts[3] = data.toString('base64url');
    expect(() => open(parts.join('.'), key)).toThrow(SecretBoxError);
  });

  it('recusa chave errada', () => {
    expect(() => open(seal('token', key), randomBytes(32))).toThrow(SecretBoxError);
  });

  it('recusa formato desconhecido', () => {
    expect(() => open('v9.a.b.c', key)).toThrow(/desconhecida/);
    expect(() => open('sem-pontos', key)).toThrow(/malformado/);
  });

  it('nao repete a causa do OpenSSL na mensagem', () => {
    // A mensagem do OpenSSL pode descrever o conteudo; a nossa nao descreve.
    expect(() => open(seal('token', key), randomBytes(32))).toThrow(
      /chave trocada ou conteúdo adulterado/,
    );
  });
});
