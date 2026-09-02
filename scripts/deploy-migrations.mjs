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

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? '';

if (url.trim().length === 0) {
  console.log('[migrations] Sem DATABASE_URL: modo demo, nada a migrar.');
  process.exit(0);
}

console.log('[migrations] Aplicando migracoes pendentes...');
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit' });

if (result.status !== 0) {
  console.error('[migrations] Falhou. O build para aqui em vez de publicar sobre um banco incerto.');
  process.exit(result.status ?? 1);
}
