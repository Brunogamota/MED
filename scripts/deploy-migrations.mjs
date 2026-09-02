#!/usr/bin/env node
/**
 * Aplica as migracoes pendentes antes do build, quando ha banco configurado.
 *
 * Roda no `vercel-build`. Sem isso, colar a `DATABASE_URL` na Vercel publica
 * uma aplicacao apontando para um banco sem tabela nenhuma — tudo responde 500
 * e o motivo nao aparece em lugar nenhum.
 *
 * Sem banco configurado nao ha o que migrar: a aplicacao sobe em modo demo,
 * com repositorio em memoria, e o build segue. E deliberado — o primeiro
 * deploy tem de funcionar antes de existir banco.
 *
 * Migracao que falha derruba o build. Publicar por cima de um banco em estado
 * desconhecido e pior que nao publicar.
 */
import { spawnSync } from 'node:child_process';

// Os mesmos nomes que `src/lib/env.ts` aceita: o nosso e os que a Vercel
// injeta ao conectar um banco (Vercel Postgres e Supabase usam os mesmos).
const KEYS = [
  'DIRECT_DATABASE_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
];
const chosen = KEYS.find((key) => process.env[key]?.trim());

if (!chosen) {
  console.log('[migrations] Nenhuma string de conexao no ambiente: modo demo, nada a migrar.');
  console.log(`[migrations] Nomes procurados: ${KEYS.join(', ')}`);
  process.exit(0);
}

/**
 * O nome da variavel e o host aparecem no log; a URL inteira, nunca — ela
 * carrega a senha do banco, e log de build fica gravado.
 *
 * Sem isto, uma falha de conexao no build nao dizia *qual* conexao falhou, e
 * a diferenca importa: no Supabase a URL direta pode ser so IPv6, enquanto o
 * pooler responde em IPv4.
 */
function hostOf(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port || '5432'}`;
  } catch {
    return 'host ilegivel';
  }
}

console.log(`[migrations] Usando ${chosen} (${hostOf(process.env[chosen].trim())}).`);
console.log('[migrations] Aplicando migracoes pendentes...');
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit' });

if (result.status !== 0) {
  console.error(
    `[migrations] Falhou usando ${chosen}. O build para aqui em vez de publicar sobre um banco incerto.`,
  );
  console.error(
    '[migrations] Se o erro for de conexao: no Supabase a URL direta pode ser so IPv6. ' +
      'Nesse caso, defina DIRECT_DATABASE_URL com a do "Session pooler" (porta 5432 no host do pooler).',
  );
  process.exit(result.status ?? 1);
}
