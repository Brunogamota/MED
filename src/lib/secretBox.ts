/**
 * Cifra simetrica para credencial de terceiro guardada no banco.
 *
 * Um refresh token do Gmail e uma chave da caixa de e-mail do cliente. Em
 * texto puro, quem ler um backup, um dump ou uma replica de leitura le a caixa
 * de todo mundo. Cifrado, precisa tambem da chave — que vive no ambiente e nao
 * no banco, entao os dois vazamentos teriam de acontecer juntos.
 *
 * AES-256-GCM: cifra e autentica de uma vez. Sem a autenticacao, alguem com
 * escrita no banco poderia trocar bytes do texto cifrado e nos entregariamos o
 * resultado adiante sem perceber.
 *
 * Node apenas. O middleware roda em outro runtime e nao toca nisto.
 */

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;
/** Prefixo de versao: permite trocar de algoritmo sem adivinhar o formato. */
const VERSION = 'v1';

export class SecretBoxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecretBoxError';
  }
}

/**
 * Le a chave do ambiente.
 *
 * Aceita base64 ou hex, porque as duas formas aparecem em gerador de chave e
 * exigir uma so vira erro de digitacao na madrugada. O que nao se aceita e
 * chave curta: 32 bytes ou nada.
 */
export function readEncryptionKey(raw: string | undefined | null): Buffer {
  const value = raw?.trim();
  if (!value) {
    throw new SecretBoxError(
      'ENCRYPTION_KEY ausente. Gere uma com: openssl rand -base64 32',
    );
  }
  const decoded = /^[0-9a-fA-F]{64}$/.test(value)
    ? Buffer.from(value, 'hex')
    : Buffer.from(value, 'base64');
  if (decoded.length !== KEY_BYTES) {
    throw new SecretBoxError(
      `ENCRYPTION_KEY precisa ter ${KEY_BYTES} bytes (base64 ou hex). Gere uma com: openssl rand -base64 32`,
    );
  }
  return decoded;
}

/** Texto claro -> `v1.<iv>.<tag>.<cifra>`, tudo em base64url. */
export function seal(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const sealed = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    sealed.toString('base64url'),
  ].join('.');
}

/**
 * Volta ao texto claro. Lanca se o conteudo foi adulterado ou a chave mudou.
 *
 * Falhar alto e proposital: entregar meio segredo, ou um segredo de outra
 * chave, seria pior do que nao entregar nenhum.
 */
export function open(envelope: string, key: Buffer): string {
  const parts = envelope.split('.');
  if (parts.length !== 4) throw new SecretBoxError('Envelope cifrado malformado.');
  const [version, ivPart, tagPart, dataPart] = parts as [string, string, string, string];
  // Comparacao em tempo constante por habito: a versao e publica, mas o padrao
  // da casa para comparar bytes de material cifrado e este.
  const expected = Buffer.from(VERSION, 'utf8');
  const found = Buffer.from(version, 'utf8');
  if (found.length !== expected.length || !timingSafeEqual(found, expected)) {
    throw new SecretBoxError(`Versão de envelope desconhecida: ${version}`);
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // A causa nao entra na mensagem: ela viria do OpenSSL e pode descrever o
    // conteudo. "Nao abriu" e tudo que quem chama precisa saber.
    throw new SecretBoxError(
      'Não foi possível abrir o segredo: chave trocada ou conteúdo adulterado.',
    );
  }
}
