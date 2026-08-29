# MED Defense

Automacao de defesa de MED (Mecanismo Especial de Devolucao do Pix): recebe o MED,
coleta os dados da compra, identifica quais evidencias sao necessarias, aponta o
que esta faltando, monta a defesa e gera o pacote de evidencias pronto para envio.

> **NO CLAIM WITHOUT EVIDENCE. NO EVIDENCE WITHOUT PROVENANCE.**
>
> Nenhuma afirmacao factual e criada porque parece provavel. Toda afirmacao aponta
> para evidencias reais, e cada evidencia carrega de onde veio. Dado ausente
> permanece ausente e e reportado como faltante.

## O que o sistema faz

0. Recebe o lote diario da adquirente (arquivo CSV, tela ou API) e normaliza cada linha.
1. Recebe o MED (manual ou webhook) e normaliza os dados.
2. Identifica o tipo de transacao (fisico, digital, servico, assinatura, ...).
3. Determina quais evidencias sao exigidas para aquele tipo **e** aquele motivo.
4. Projeta os registros existentes (pedido, pagamento, cliente, rastreio,
   documentos) em evidencias com origem preservada.
5. Monta a timeline unificando eventos de fontes distintas.
6. Mostra o que existe, o que falta e a forca de cada evidencia.
6a. Registra a entrega: status e marcos datados no fisico; canal, destino e data
   do envio do acesso no digital, sem depender de confirmacao do comprador.
7. Gera claims — cada frase amarrada as evidencias que a sustentam.
8. Produz o Defense JSON, o texto da defesa, o Evidence Pack e o PDF.
9. Prepara o payload de submissao por instituicao, mantendo o pack universal.
10. Registra tudo em audit log append-only.

## Stack

Next.js 16 (App Router) - React 19 - TypeScript - Tailwind 4 - Zod - Prisma 7 +
PostgreSQL - pdf-lib - Vitest - deploy na Vercel.

## Rodando localmente

```bash
npm install
cp .env.example .env.local     # opcional: sem DATABASE_URL sobe em modo demo
npm run dev
```

Abra http://localhost:3000 — o modo demo carrega dois MEDs de exemplo
(`DEMO-2026-0001` completo, `DEMO-2026-0002` com evidencias faltando).

Com banco:

```bash
export DATABASE_URL=postgresql://...          # pooled
export DIRECT_DATABASE_URL=postgresql://...   # direta, para migrate
npm run db:migrate
npm run dev
```

## Verificacao

```bash
npm run verify   # lint + typecheck + test + build
```

## Deploy

Toda versao nova e publicada pelo CI: o job `deploy` em
`.github/workflows/ci.yml` roda depois de lint, typecheck, testes e build, e
confere `GET /api/health` na URL publicada.

Falta apenas cadastrar tres secrets no repositorio (`VERCEL_TOKEN`,
`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) — passo a passo em
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Sem eles, o job avisa e segue verde,
sem publicar.

## Documentacao

- [`CLAUDE.md`](CLAUDE.md) — guia do projeto e regras invioláveis
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — fluxo, engines, modelo de dados
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — decisoes tecnicas e seus motivos
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — ambientes, variaveis, migrations
- [`docs/API.md`](docs/API.md) — referencia REST

## Estado atual

Implementado: dominio completo (Evidence Engine, Timeline Engine, Defense Engine,
Evidence Pack), REST, PDF, UI operacional, audit log, RBAC, multi-tenancy,
idempotencia, guard de LLM, repositorio Postgres via Prisma.

Ainda nao implementado, e deliberadamente nao simulado: integracoes reais com
transportadoras, PSPs e plataformas de e-commerce (as portas existem, sem adapters
falsos), adapter de storage S3-compativel (o upload funciona em modo demo e e
recusado explicitamente quando nao ha storage duravel), login interativo de
usuario, envio automatico para instituicoes, e rate limiting distribuido.
