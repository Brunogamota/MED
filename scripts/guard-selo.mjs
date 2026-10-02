// Trava de producao para o selo dos comprovantes.
//
// Neste branch o selo foi trocado, a pedido do Bruno (02/10/2026), de
// "Documento gerado a partir do registro de envio. Nao e uma captura de tela do
// painel." para "Representacao do registro de envio". Ele mesmo pediu que essa
// versao nunca fosse para producao. Se o build de producao encontrar o selo
// curto, para aqui.
import { readFileSync } from 'node:fs';

const env = process.env.VERCEL_ENV ?? process.env.APP_ENV ?? '';
const source = readFileSync(new URL('../src/domain/communication/receipt.ts', import.meta.url), 'utf8');

if (env === 'production' && source.includes("'Representação do registro de envio'")) {
  console.error(
    '\n[guard-selo] Publicacao em producao bloqueada: o selo dos comprovantes esta com o texto ' +
      '"Representação do registro de envio", que o Bruno pediu para nunca ir a producao ' +
      '(ver CLAUDE.md, "Selo dos comprovantes"). Volte o selo original antes de publicar.\n',
  );
  process.exit(1);
}
