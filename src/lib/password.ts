import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Senha do console, guardada como hash scrypt — nunca em texto.
 *
 * Formato: `scrypt:<salt em hex>:<hash em hex>`. O salt é por senha, então
 * dois consoles com a mesma senha têm hashes diferentes, e a comparação é em
 * tempo constante para não vazar o quanto o palpite chegou perto.
 *
 * Dois-pontos como separador, e não o `$` do padrão PHC: este valor vai para
 * uma variável de ambiente, e `$` é expandido por shell e por boa parte dos
 * leitores de `.env` — o hash chegaria mutilado e a senha certa seria
 * recusada, sem nenhuma mensagem que explicasse por quê.
 *
 * Roda só no Node (Server Action), nunca no middleware de borda.
 */

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;

  let expected: Buffer;
  try {
    expected = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  if (expected.length !== KEY_LENGTH) return false;

  const derived = (await scryptAsync(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH)) as Buffer;
  return timingSafeEqual(derived, expected);
}
