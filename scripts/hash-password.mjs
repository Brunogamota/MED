/**
 * Gera o valor de ADMIN_PASSWORD_HASH a partir de uma senha.
 *
 *   node scripts/hash-password.mjs 'minha senha'
 *
 * A senha entra como argumento e nao e gravada em lugar nenhum: o que sai e o
 * hash, que e o unico valor que deve ir para a variavel de ambiente.
 */
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const password = process.argv[2];

if (!password) {
  console.error("Uso: node scripts/hash-password.mjs 'sua senha'");
  process.exit(1);
}

const salt = randomBytes(16);
const derived = await scryptAsync(password, salt, 64);

console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt.toString('hex')}:${derived.toString('hex')}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString('hex')}`);
