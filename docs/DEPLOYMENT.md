# Deploy

## Ambientes

| Ambiente | Origem | Persistencia | Autenticacao |
| --- | --- | --- | --- |
| `development` | local (`npm run dev`) | memoria, salvo `DATABASE_URL` local | modo demo aberto |
| `preview` | qualquer branch com PR na Vercel | banco de preview, ou memoria | API key se configurada |
| `production` | branch de producao na Vercel | Postgres obrigatorio | API key obrigatoria |

`APP_ENV` local; na Vercel o valor vem de `VERCEL_ENV` automaticamente.

## Vercel

O projeto ja esta pronto para a Vercel:

- `vercel.json` — framework, regiao `gru1`, `maxDuration` de 60s nas rotas de API.
- Build command `npm run vercel-build` = `prisma generate && next build`.
  `prisma generate` nao precisa de banco, entao o build funciona mesmo sem
  `DATABASE_URL`.
- Todas as rotas de API sao `force-dynamic`; nada que dependa de dados de tenant
  e pre-renderizado.

### Estado atual: secrets cadastrados, mas apontando para o projeto errado

O CI passa (lint, typecheck, testes e build verdes) e o job `deploy` chega a
rodar, mas para no primeiro comando da Vercel:

```
Retrieving project…
Error: Project not found ({"VERCEL_PROJECT_ID":"***","VERCEL_ORG_ID":"***"})
```

Os tres secrets existem — o que nao existe e um projeto que corresponda ao par
`VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` dentro do escopo do `VERCEL_TOKEN`. Ver
"Quando o deploy falha com Project not found", abaixo.

O ambiente onde o agente roda **nao alcanca a rede da Vercel** (`vercel.com` e
`api.vercel.com` sao bloqueados pela politica de rede; npm passa). Ou seja:
publicar, ou conferir as credenciais, a partir da sessao do agente e impossivel,
mesmo com token. Os passos abaixo sao seus.

Por isso o deploy foi movido para o CI, onde ele funciona sem depender do agente.
Escolha um dos dois caminhos abaixo — os dois deixam toda versao nova publicada
automaticamente.

### Caminho A — GitHub Actions (ja implementado, falta so cadastrar os secrets)

O workflow `.github/workflows/ci.yml` tem um job `deploy` que roda **depois** de
lint, typecheck, testes e build. Versao quebrada nao chega a ser publicada.

Para ligar, faca uma vez:

1. Gere um token em <https://vercel.com/account/tokens>.
2. Crie o projeto uma vez, a partir da sua maquina, na raiz do repositorio:

   ```bash
   npx vercel@latest login
   npx vercel@latest link      # cria .vercel/project.json
   cat .vercel/project.json    # mostra orgId e projectId
   ```

3. No GitHub, em **Settings -> Secrets and variables -> Actions**, cadastre:

   | Secret | Valor |
   | --- | --- |
   | `VERCEL_TOKEN` | o token gerado no passo 1 |
   | `VERCEL_ORG_ID` | `orgId` do `.vercel/project.json` |
   | `VERCEL_PROJECT_ID` | `projectId` do `.vercel/project.json` |

Pronto. A partir do proximo push:

- push na branch padrao -> **Production**;
- push em qualquer outra branch -> **Preview**;
- o job confere `GET /api/health` na URL publicada e **falha** se a versao no ar
  nao responder, para que "publicado" nao signifique apenas "o upload terminou".

Enquanto os secrets nao existirem, o job nao quebra o CI: ele avisa no resumo da
execucao que faltam credenciais e segue verde.

> `.vercel/` esta no `.gitignore` — o arquivo de link nunca entra no repositorio.

#### Quando o deploy falha com "Project not found"

O erro nao vem do codigo: e o token nao alcancando o projeto identificado pelos
secrets. Em ordem de probabilidade:

1. **`VERCEL_PROJECT_ID` guarda o nome do projeto**, e nao o id. O valor certo
   comeca com `prj_`. O CI agora avisa quando o formato nao bate.
2. **Escopo errado.** O projeto vive em um time e o `VERCEL_ORG_ID` e o da conta
   pessoal, ou o contrario. Id de time comeca com `team_`.
3. **Token de outro escopo, ou revogado.** Um token so enxerga os projetos do
   escopo em que foi criado.

A forma confiavel de pegar os dois ids e deixar a propria CLI escrever:

```bash
npx vercel@latest login
npx vercel@latest link      # escolha (ou crie) o projeto e o time
cat .vercel/project.json    # orgId e projectId, exatamente como o CI espera
```

Copie os dois valores para os secrets e redisparre a execucao em
**Actions -> CI -> Re-run failed jobs**. Nada de novo commit e necessario: o
deploy le o codigo da branch, e a branch ja esta atualizada.

> Token e segredo: cadastre direto no GitHub e nunca cole em chat, issue ou PR.
> Se um token vazou, revogue em <https://vercel.com/account/tokens> e gere outro.

### Ver a versao no ar agora, sem nenhuma credencial

O workflow `.github/workflows/deploy-temporario.yml` publica um deployment
temporario usando `vercel deploy --temporary`, que dispensa login. Dispare em
**Actions -> Deploy temporario -> Run workflow**.

O que ele publica:

- URL **publica e sem autenticacao**;
- modo demo (sem `DATABASE_URL`), com os dados ficticios de exemplo;
- estado em memoria, que some no primeiro cold start;
- nenhum secret envolvido, nenhum dado real exposto.

Serve para conferir a versao atual e para reivindicar o deployment na sua conta
Vercel depois. Nao substitui o caminho A: ele roda so quando disparado a mao,
nunca a cada push.

### Caminho B — Integracao Git da Vercel

Importe o repositorio em <https://vercel.com/new>. Cada push passa a gerar um
deployment automaticamente, sem secrets e sem workflow.

A diferenca em relacao ao caminho A: a Vercel publica **antes** de saber se o CI
passou. Se voce quer a garantia de nunca publicar uma versao com teste quebrado,
prefira o caminho A, ou ative "Ignored Build Step" no projeto para condicionar o
build ao CI.

Um detalhe que costuma explicar "a Vercel ainda mostra a versao antiga": em
**Settings -> Git -> Production Branch**, o projeto precisa apontar para a branch
padrao deste repositorio. Se ela apontar para uma branch que nao recebe push, a
producao congela na ultima versao que aquela branch teve, enquanto as branches
novas so geram preview.

### Vercel CLI direto (fora do CI)

Com a CLI autenticada na sua maquina:

```bash
npx vercel@latest --yes          # preview
npx vercel@latest --prod --yes   # producao
```

## Variaveis de ambiente

Referencia completa e comentada em `.env.example`. Minimo por ambiente:

**Preview sem banco** — nada. Sobe em modo demo.

**Preview com banco / Producao:**

```
DATABASE_URL=postgresql://...   # pooled
DIRECT_DATABASE_URL=postgresql://...   # direta, so para migrate
API_KEYS=<key>:<organizationId>:OWNER
WEBHOOK_SIGNING_SECRET=<hex>    # obrigatorio para receber MED por webhook
DOCUMENT_URL_SIGNING_SECRET=<hex>
```

Opcionais: `ANTHROPIC_API_KEY` + `LLM_MODEL` (reescrita de texto), credenciais de
storage S3-compativel, tokens de provider.

Nenhum secret entra no repositorio. `.env` e `.env.local` estao no `.gitignore`.

## Migrations

```bash
npm run db:migrate     # desenvolvimento: cria e aplica
npm run db:deploy      # preview/producao: aplica migrations existentes
```

### Politica de operacoes destrutivas

Deploy de codigo e automatico. **Operacao destrutiva em banco de producao nao e.**

Antes de aplicar qualquer migration que possa perder dados — `DROP TABLE`,
`DROP COLUMN`, mudanca de tipo com truncamento, `NOT NULL` em coluna existente
sem default, ou qualquer `prisma migrate reset` — pare, proponha uma estrategia
de duas fases (adicionar novo, migrar dados, so depois remover o antigo) e
execute somente com decisao humana explicita. `prisma migrate reset` nunca roda
contra producao.

## Definition of Done

Uma feature so esta pronta quando:

1. implementacao concluida;
2. `npm run typecheck` limpo;
3. `npm run lint` limpo;
4. `npm run test` passando;
5. `npm run build` passando;
6. migrations avaliadas quanto a destrutividade;
7. variaveis de ambiente novas documentadas em `.env.example`;
8. revisao de seguranca quando a mudanca toca autenticacao, tenancy ou dados
   pessoais;
9. revisao das regras de evidencia quando a mudanca toca dominio;
10. deploy realizado;
11. versao publicada verificada (`GET /api/health` e uma tela real).

Atalho para os passos 2 a 5: `npm run verify`.

## Verificacao pos-deploy

O job de deploy ja faz isso automaticamente e falha se a versao publicada nao
responder. Para conferir a mao:

```bash
curl -s https://<deployment>/api/health
# { "status": "ok", "appEnv": "...", "persistence": "..." }
```

Depois abra `/meds` e confirme que a listagem responde. Em modo demo a tela mostra
o aviso "modo demo - dados nao persistidos".

Sem `DATABASE_URL` o deploy sobe em modo demo e e exploravel de imediato, com os
dados de exemplo. Para valer, configure `DATABASE_URL` no projeto Vercel e rode
`npm run db:deploy` apontando para `DIRECT_DATABASE_URL`.
