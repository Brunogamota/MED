# Deploy

## Ambientes

| Ambiente | Origem | Persistencia | Autenticacao |
| --- | --- | --- | --- |
| `development` | local (`npm run dev`) | memoria, salvo `DATABASE_URL` local | modo demo aberto |
| `preview` | qualquer branch com PR na Vercel | banco de preview, ou memoria | API key se configurada |
| `production` | branch de producao na Vercel | Postgres obrigatorio | API key obrigatoria |

`APP_ENV` local; na Vercel o valor vem de `VERCEL_ENV` automaticamente.

## Vercel

O projeto ja esta configurado para a Vercel:

- `vercel.json` — framework, regiao `gru1`, `maxDuration` de 60s nas rotas de API.
- Build command `npm run vercel-build` = `prisma generate && next build`.
  `prisma generate` nao precisa de banco, entao o build funciona mesmo sem
  `DATABASE_URL`.
- Todas as rotas de API sao `force-dynamic`; nada que dependa de dados de tenant
  e pre-renderizado.

### Fluxo Git (recomendado)

Repositorio conectado ao projeto Vercel: cada push gera um Preview Deployment; o
merge na branch de producao gera o deploy de producao. Nenhum passo manual.

### Vercel CLI (alternativa)

Com a CLI autenticada no ambiente:

```bash
vercel --yes                 # preview
vercel --prod --yes          # producao
```

> Estado atual do ambiente de desenvolvimento deste repositorio: a Vercel CLI
> **nao** esta instalada nem autenticada, e nao ha `VERCEL_TOKEN`. Portanto o
> deploy acontece pelo fluxo Git. Para habilitar a CLI, exporte `VERCEL_TOKEN`,
> `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` no ambiente.

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

```bash
curl -s https://<deployment>/api/health
# { "status": "ok", "appEnv": "...", "persistence": "..." }
```

Depois abra `/meds` e confirme que a listagem responde. Em modo demo a tela mostra
o aviso "modo demo - dados nao persistidos".
