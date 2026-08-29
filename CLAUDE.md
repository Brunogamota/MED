# MED Defense — guia do projeto

Plataforma de automacao de defesa de MED (Mecanismo Especial de Devolucao do Pix):
recebe o MED, coleta e normaliza os dados da compra, monta a timeline, avalia as
evidencias disponiveis e ausentes, gera a defesa e o Evidence Pack, e produz o
PDF pronto para envio.

## Principio inviolavel

> **NO CLAIM WITHOUT EVIDENCE. NO EVIDENCE WITHOUT PROVENANCE.**

Consequencias praticas, validas para qualquer alteracao neste repositorio:

- Nenhuma afirmacao factual pode existir sem apontar para evidencias concretas.
  Um `Claim` sempre carrega `evidenceIds` nao vazio.
- Nenhum dado ausente pode ser preenchido com placeholder, valor plausivel ou
  default. Dado ausente permanece ausente e e reportado como `MISSING`.
- Toda evidencia carrega `source`, `sourceReference` e `verificationStatus`.
- Nunca invente codigo de rastreio, evento logistico, IP, device, CPF, nome,
  endereco, nota fiscal, comprovante, data, resposta de provider ou evento de
  timeline. Se nao existe no sistema, nao entra no documento.
- A IA nao determina fatos. O backend determina os fatos; a IA apenas reescreve
  um Defense JSON ja pronto, e a saida passa por um guard que descarta qualquer
  fato novo (`src/domain/llm/guard.ts`).

## Arquitetura em uma frase

```
Raw data -> Normalized data -> Evidence Engine -> Claims -> Defense JSON -> (LLM guarded) -> Evidence Pack -> PDF / payload
```

Detalhes em `docs/ARCHITECTURE.md`. Decisoes tecnicas e seus motivos em
`docs/DECISIONS.md`.

## Mapa do codigo

| Caminho | Responsabilidade |
| --- | --- |
| `src/domain/types.ts` | Tipos e enums do dominio. Nenhuma dependencia de I/O. |
| `src/domain/schemas.ts` | Validacao Zod de tudo que cruza a fronteira da API. |
| `src/domain/evidence/catalog.ts` | Catalogo de tipos de evidencia (label, categoria, forca base). |
| `src/domain/evidence/requirements.ts` | Matriz (tipo de produto x motivo do MED) -> evidencias exigidas e pesos. |
| `src/domain/evidence/strength.ts` | Regras explicitas de forca de evidencia. |
| `src/domain/evidence/derive.ts` | Projeta registros estruturados em evidencias, preservando origem. |
| `src/domain/evidence/engine.ts` | Evidence Engine: disponivel / faltante / score. |
| `src/domain/timeline/engine.ts` | Timeline Engine: une eventos de fontes distintas. |
| `src/domain/defense/claims.ts` | Templates de afirmacao e suas evidencias obrigatorias. |
| `src/domain/defense/risks.ts` | Risk flags operacionais. |
| `src/domain/defense/narrative.ts` | Renderizador deterministico do texto da defesa. |
| `src/domain/defense/engine.ts` | Defense Engine: MedCase -> Defense. |
| `src/domain/pack/builder.ts` | Evidence Pack (independente de provider). |
| `src/domain/llm/` | Rewrite opcional por LLM + guard de fatos. |
| `src/infra/repositories/` | Porta de persistencia + adapters memoria/Prisma. |
| `src/infra/adapters/` | Portas de integracao e adapters de submissao. |
| `src/infra/pdf/` | Geracao do MED Defense Report. |
| `src/services/` | Casos de uso: autorizacao, auditoria, transicao de status. |
| `src/app/api/` | REST. |
| `src/app/meds/` | UI operacional. |

## Regras de codigo

- Camada de dominio e **pura**: sem I/O, sem `Date.now()` implicito (receba `now`),
  sem acesso a env. Isso e o que a mantem testavel e deterministica.
- Toda consulta ao repositorio recebe `organizationId` e filtra por ele, inclusive
  quando ja filtra por id (protecao contra IDOR).
- Nada de `any`. O lint bloqueia.
- Dinheiro persiste em centavos (`Int`). Nunca float no banco.
- Defense e imutavel e versionada: gerar de novo cria uma nova versao, nunca
  sobrescreve.
- Log nao carrega PII desnecessaria. Use os helpers de mascara em `src/lib/format.ts`.

## Ciclo de desenvolvimento

```
npm run lint && npm run typecheck && npm run test && npm run build
```

Atalho: `npm run verify`. Nao publique nada que nao passe nos quatro.

Deploy: ver `docs/DEPLOYMENT.md`. Deploy de codigo e automatico via push; operacao
destrutiva em banco de producao **nao** e automatica e exige decisao humana.
