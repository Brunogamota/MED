/**
 * Gera as credenciais do console.
 *
 *   node scripts/hash-password.mjs
 *
 * A senha e pedida no terminal, com eco desligado, e nunca vira argumento:
 * argumento aparece no historico do shell e na lista de processos, onde
 * qualquer outro usuario da maquina le. O que sai daqui e o hash e o segredo
 * de sessao — a senha em si nao e gravada em lugar nenhum.
 */
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline';

const scryptAsync = promisify(scrypt);

if (process.argv[2]) {
  console.error(
    'Nao passe a senha como argumento: ela fica no historico do shell e em `ps`.\n' +
      'Rode sem argumento que eu pergunto: node scripts/hash-password.mjs',
  );
  process.exit(1);
}

/** Pergunta sem ecoar o que e digitado. */
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output = rl.output;
    let silent = false;
    output.write(question);
    // Escreve so o prompt; o que o usuario digita nao aparece.
    const write = output.write.bind(output);
    output.write = (chunk, ...rest) => (silent ? true : write(chunk, ...rest));
    silent = true;
    rl.question('', (answer) => {
      silent = false;
      output.write = write;
      output.write('\n');
      rl.close();
      resolve(answer);
    });
  });
}

const password = (await askHidden('Senha do console: ')).trim();
if (password.length < 12) {
  console.error('\nSenha muito curta. Use ao menos 12 caracteres — esta senha fica exposta na internet.');
  process.exit(1);
}
const again = (await askHidden('Repita a senha: ')).trim();
if (password !== again) {
  console.error('\nAs senhas nao conferem.');
  process.exit(1);
}

const salt = randomBytes(16);
const derived = await scryptAsync(password, salt, 64);

console.log('\nCrie estas variaveis de ambiente (Production, tipo Secret):\n');
console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt.toString('hex')}:${derived.toString('hex')}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString('hex')}`);
console.log('\nOpcional, para exigir tambem um nome de usuario:');
console.log('ADMIN_USER=seu.usuario\n');
