# Arquitetura

## Fluxo completo

```
  MED (manual | webhook)
        |
        v
  Normalizacao (Zod)                       src/domain/schemas.ts
        |
        v
  MedCase = med + transaction + customer + order + tracking + evidences + documents
        |
        +---> deriveEvidence()   projeta registros estruturados em evidencias,
        |                        preservando source / sourceReference
        v
  Evidence Engine                          src/domain/evidence/engine.ts
        |  requisitos = f(productType, medReason)
        |  status por requisito: AVAILABLE | MISSING | PENDING | CONFLICTING
        |  forca por evidencia: regras explicitas (strength.ts)
        |  score por categoria: pesos normalizados para 100
        v
  Claims                                   src/domain/defense/claims.ts
        |  cada template declara as evidencias obrigatorias
        |  sem todas elas, a frase simplesmente nao e gerada
        v
  Defense JSON                             src/domain/defense/engine.ts
        |  claims[] + evidenceIds[] + missingEvidences[] + riskFlags[] + score
        v
  Narrativa
        |  deterministica (padrao) ou LLM com guard de fatos
        v
  Evidence Pack                            src/domain/pack/builder.ts
        |  universal, independente de provider
        +---> PDF                          src/infra/pdf/defenseReport.ts
        +---> JSON                         GET /api/meds/:id/evidence-pack
        +---> DefenseSubmission            src/infra/adapters/submission.ts
```

## O que e deterministico e o que pode usar LLM

| Etapa | Natureza |
| --- | --- |
| Normalizacao e validacao | Deterministica |
| Derivacao de evidencia a partir de registros | Deterministica |
| Requisitos de evidencia por tipo/motivo | Deterministica (matriz em codigo) |
| Forca de evidencia | Deterministica (regras R0..R5) |
| Score | Deterministico (pesos + fatores) |
| Timeline | Deterministica |
| Claims | Deterministica (templates + evidencias obrigatorias) |
| Risk flags | Deterministica |
| Texto final | Deterministico por padrao; LLM opcional **com guard** |

O LLM nunca escolhe fatos, nunca classifica forca de evidencia e nunca decide o
que esta faltando. Ele recebe um Defense JSON pronto e reescreve a prosa. A saida
passa por `guardNarrative`, que extrai todo token verificavel (data, valor,
codigo, documento, e-mail, IP) e rejeita o texto inteiro se qualquer um deles nao
existir no Defense JSON. Rejeitou, usa-se o texto deterministico e o motivo fica
registrado em `narrative.guardRejections`.

## Modelo de dados

Entidades principais (`prisma/schema.prisma`):

- `Med` — o caso. Unico por `(organizationId, medId)`.
- `MedTransaction`, `Customer`, `Order`, `Tracking` — 1:1 com o MED.
- `Evidence` — N:1, cada uma com origem e status de verificacao.
- `Document` — N:1, arquivos anexados.
- `Defense` — N:1, **imutavel e versionada** (`@@unique([medId, version])`).
- `Submission` — traducao da defesa para um parceiro especifico.
- `AuditLog` — append-only, com valor anterior e novo.
- `IdempotencyRecord` — chaves de idempotencia por `(org, scope, key)`.

Relacao Claim -> Evidence e estrutural, nao textual: `Claim.evidenceIds` referencia
ids reais de `Evidence`, e o PDF imprime, ao lado de cada afirmacao, qual evidencia
a sustenta e de onde ela veio.

## Multi-tenant

`organizationId` esta em toda entidade e em toda consulta do repositorio, incluindo
as que ja filtram por chave primaria. A organizacao vem **sempre** da credencial
autenticada, nunca de um header, query string ou corpo enviado pelo cliente.

## Portas de integracao

`src/infra/adapters/ports.ts` define `PaymentProviderAdapter`, `OrderProviderAdapter`,
`TrackingProviderAdapter`, `FraudProviderAdapter`, `MerchantAdapter` e
`DocumentProviderAdapter`. Nenhuma delas tem implementacao real ainda — e isso e
proposital: um adapter so entra quando ha credencial e contrato de dados reais.
Um adapter nunca pode preencher um campo que o provider nao retornou.

`SubmissionProviderAdapter` traduz o Evidence Pack para o formato de cada
instituicao. O pack permanece universal.

## Serverless (Vercel)

O runtime e serverless, e isso restringe algumas escolhas:

- PDF gerado com `pdf-lib` (JavaScript puro), sem headless browser.
- Prisma com driver adapter `@prisma/adapter-pg`, apontando `DATABASE_URL` para
  uma connection string **pooled**.
- Sem worker persistente. Nao ha BullMQ: ele exige um processo Node vivo e Redis,
  o que nao existe em funcao serverless. Consultas a transportadora e afins ficam
  para uma fila externa desacoplada — ver `docs/DECISIONS.md`.
- Rate limiting atual e in-process, portanto por instancia. Vale como guarda-corpo,
  nao como controle de seguranca.
