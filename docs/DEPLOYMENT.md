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
- Build command `npm run vercel-build` = `prisma generate`, migrations pendentes
  (quando ha banco) e `next build`.
  `prisma generate` nao precisa de banco, entao o build funciona mesmo sem
  `DATABASE_URL`.
- Todas as rotas de API sao `force-dynamic`; nada que dependa de dados de tenant
  e pre-renderizado.

### Caminho em uso: integracao Git da Vercel

O deploy roda pela integracao Git da Vercel: o repositorio esta importado no
projeto, e cada push na branch de producao publica sozinho. Nao ha secret
envolvido, e o conector MCP da Vercel nao serve aqui — ele exige um `teamId`, e
uma conta Hobby nao tem time nenhum.

Dois pontos de configuracao no projeto da Vercel:

- **Settings -> Environments -> Production -> Branch Tracking** aponta para a
  branch padrao deste repositorio. O campo *nao* fica em Settings -> Git, onde a
  intuicao manda procurar. Apontar para uma branch que nao recebe push congela a
  producao na ultima versao dela, enquanto o resto vira so preview.
- Trocar a branch de producao **nao reconstroi sozinho**: a Vercel mantem o
  ultimo deployment de producao que existia, que pode ser de meses atras. O
  primeiro push depois da troca e o que publica a versao atual — ou promova a
  mao, em Deployments -> `...` -> Promote to Production.
- Nenhuma variavel de ambiente e obrigatoria para subir: sem `DATABASE_URL` a
  aplicacao roda em **modo demo**, com repositorio em memoria e dados de
  exemplo. Isso e deliberado, para o primeiro deploy funcionar antes de existir
  banco. Producao de verdade exige as variaveis da secao "Variaveis de
  ambiente", abaixo.

O que se perde em relacao ao caminho A: a Vercel publica **antes** de saber se o
CI passou. O job `deploy` do `ci.yml` continua no repositorio, dormente, e volta
a ser o caminho no dia em que essa garantia importar mais que a simplicidade.

> Enquanto os tres secrets do Vercel existirem no GitHub apontando para um
> projeto que o token nao alcanca, o job `deploy` falha a cada push e pinta o CI
> de vermelho a toa. Apague `VERCEL_TOKEN`, `VERCEL_ORG_ID` e
> `VERCEL_PROJECT_ID` em **Settings -> Secrets and variables -> Actions**: sem
> eles o job pula limpo, com um aviso no resumo.

### Caminho A (dormente): secrets cadastrados apontando para o projeto errado

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
**Settings -> Environments -> Production -> Branch Tracking**, o projeto precisa
apontar para a branch padrao deste repositorio. Se ela apontar para uma branch
que nao recebe push, a producao congela na ultima versao que aquela branch teve,
enquanto as branches novas so geram preview.

### Vercel CLI direto (fora do CI)

Com a CLI autenticada na sua maquina:

```bash
npx vercel@latest --yes          # preview
npx vercel@latest --prod --yes   # producao
```

## Login do console

O console tem tela de entrada em `/login`. Ela **só protege alguma coisa
quando as duas variaveis existem**:

```
ADMIN_PASSWORD_HASH=scrypt:<salt>:<hash>
SESSION_SECRET=<32 bytes em hex>
```

Gere as duas de uma vez, na raiz do repositorio:

```bash
node scripts/hash-password.mjs 'sua senha'
```

Com elas configuradas, o middleware redireciona para `/login` toda rota que
nao seja `/login`, `/api` ou asset, ate existir um cookie de sessao assinado e
no prazo (oito horas). Sem elas o console continua aberto, como sempre esteve,
e a propria tela de login diz isso — trocar esse comportamento em silencio
trancaria quem ja tem um deploy no ar.

As rotas de `/api` ficam de fora do portao de propósito: elas tem autenticacao
propria, por API key (`API_KEYS`), e um cookie de navegador nao serve para
integracao maquina a maquina.

Duas observacoes que economizam tempo:

- o hash usa `:` como separador, e nao o `$` do padrao PHC, porque `$` e
  expandido por shell e por boa parte dos leitores de `.env` — o hash chegaria
  mutilado e a senha certa seria recusada sem explicacao;
- a senha nunca e gravada: o que vai para a variavel e o hash scrypt, com salt
  proprio, comparado em tempo constante.

## Variaveis de ambiente

Referencia completa e comentada em `.env.example`. Minimo por ambiente:

**Preview sem banco** — nada. Sobe em modo demo.

**Preview com banco / Producao:**

Conectar um banco pela aba **Storage** da Vercel (Vercel Postgres ou a
integracao do Supabase) cria as variaveis com os nomes do provedor, nao com os
nossos. A aplicacao aceita os dois conjuntos, nesta ordem:

| Papel | Nomes aceitos |
| --- | --- |
| Conexao da aplicacao | `DATABASE_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL` |
| Migrations (sem pool) | `DIRECT_DATABASE_URL`, `POSTGRES_URL_NON_POOLING` |

Sem isso o banco fica conectado e a tela segue em modo demo, sem nada dizendo
que a diferenca era so o nome da variavel.

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
npm run db:deploy      # aplica as pendentes; sem banco configurado, nao faz nada
```

O `vercel-build` chama `db:deploy` antes do `next build`, entao **toda migration
pendente e aplicada no deploy**. Sem `DATABASE_URL` o passo se anuncia e sai sem
fazer nada, e o build segue em modo demo — o primeiro deploy funciona antes de
existir banco.

Migration que falha **derruba o build**, de proposito: publicar por cima de um
banco em estado desconhecido e pior que nao publicar.

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
dados de exemplo.

Para valer, na Vercel: **Storage -> Create Database -> Postgres**, conectar ao
projeto, e redeploy. As variaveis entram sozinhas e o proprio build aplica as
migrations. A unica coisa que ainda pode faltar e a linha da organizacao — o
`organizationId` das chaves de API precisa existir na tabela `Organization`:

```sql
insert into "Organization" (id, name, "createdAt")
values ('org_demo', 'Minha organizacao', now());
```
