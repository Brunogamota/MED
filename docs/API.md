# API REST

Autenticacao por API key:

```
Authorization: Bearer <key>
# ou
x-api-key: <key>
```

Em modo demo (sem `DATABASE_URL`) as rotas respondem sem credencial, sobre a
organizacao `org_demo`. Em producao, ausencia de credencial retorna 401.

Erros seguem `{ "error": string, "details"?: unknown }` com os status:
401 nao autenticado, 403 sem permissao, 404 inexistente, 409 conflito de estado,
422 payload invalido, 429 rate limit, 500 erro interno.

## Rotas

| Metodo | Rota | Descricao |
| --- | --- | --- |
| GET | `/api/health` | Liveness e configuracao efetiva (sem secrets). |
| GET | `/api/meds` | Lista MEDs. Query: `status`, `search`, `limit`. |
| POST | `/api/meds` | Cria MED. Idempotente por `medId` dentro da organizacao. |
| GET | `/api/meds/:id` | Caso completo (MedCase). |
| PATCH | `/api/meds/:id` | Atualiza tipo de produto, status, prazo, observacoes. |
| POST | `/api/meds/:id/transaction` | Upsert da transacao. |
| POST | `/api/meds/:id/customer` | Upsert do cliente. |
| POST | `/api/meds/:id/order` | Upsert do pedido. |
| POST | `/api/meds/:id/tracking` | Upsert do rastreio e seus eventos. |
| GET | `/api/meds/:id/evidence` | Avaliacao atual: disponivel, faltante, score. |
| POST | `/api/meds/:id/evidence` | Registra evidencia com origem. |
| POST | `/api/meds/:id/documents` | Registra a referencia de um documento (sem upload). |
| POST | `/api/meds/:id/documents/upload` | Upload multipart do arquivo (campo `file`, ate 8 MB). |
| GET | `/api/documents/:id` | Serve o arquivo a partir de link assinado (`org`, `exp`, `sig`). |
| POST | `/api/meds/:id/generate-defense` | Gera nova versao da defesa. Body: `{ "useLlm": boolean }`. |
| GET | `/api/meds/:id/defenses` | Historico de versoes. |
| GET | `/api/meds/:id/evidence-pack` | Evidence Pack em JSON. |
| GET | `/api/meds/:id/pdf` | MED Defense Report em PDF. |
| GET/POST | `/api/meds/:id/submissions` | Lista / prepara payload por provider. |
| GET | `/api/meds/:id/audit` | Audit log do caso. |
| POST | `/api/webhooks/med` | Ingestao de MED. HMAC-SHA256 + idempotencia. |

## Documentos e links assinados

O download nao usa API key: a autorizacao vem da propria assinatura. O link
carrega organizacao, id do documento e expiracao, todos cobertos por HMAC-SHA256
com `DOCUMENT_URL_SIGNING_SECRET`, e vale 5 minutos. Alterar qualquer parametro
invalida a assinatura. Link expirado retorna 410; assinatura invalida, 403. Sem
`DOCUMENT_URL_SIGNING_SECRET` configurado, nenhum link e emitido (503 no download)
em vez de expor URL sem autenticacao.

O upload exige storage configurado. Em modo demo usa-se um store em processo
(efemero); com banco configurado e sem `S3_*`, o upload e recusado com 409 em vez
de aceitar um arquivo que se perderia — perder evidencia e pior que recusar o
envio. O checksum SHA-256 e calculado no recebimento e guardado com o documento.

## Rate limiting

Rotas de escrita sao limitadas a 120 requisicoes por minuto por organizacao e
rota; upload, a 60. O contador e in-process, portanto por instancia: serve como
guarda-corpo operacional, nao como controle de seguranca. Um limitador
distribuido e pre-requisito para trafego de producao.

## Idempotencia

- `POST /api/meds` e o webhook sao idempotentes pelo `medId` da instituicao:
  replay retorna o MED existente, sem duplicar.
- `POST /api/meds/:id/generate-defense` **nao** e idempotente por design: cada
  chamada cria uma nova versao imutavel e a anterior e preservada.

## Webhook

```
POST /api/webhooks/med
x-signature: sha256=<hmac_hex do corpo bruto com WEBHOOK_SIGNING_SECRET>
```

Sem `WEBHOOK_SIGNING_SECRET` configurado, producao responde 503 em vez de aceitar
ingestao nao autenticada.

## Exemplo

```bash
BASE=http://localhost:3000

MED=$(curl -s -X POST $BASE/api/meds -H 'content-type: application/json' -d '{
  "medId": "MED-2026-1234",
  "amount": 349.90,
  "openedAt": "2026-08-20T12:00:00Z",
  "transactionAt": "2026-08-10T17:32:00Z",
  "responseDeadlineAt": "2026-09-05T12:00:00Z",
  "reason": "PRODUCT_NOT_RECEIVED",
  "endToEndId": "E1234567820260810143200000001",
  "productType": "PHYSICAL",
  "requestingInstitution": "Banco Exemplo S.A.",
  "payer": { "document": "12345678909", "name": "Maria Souza", "email": "maria@example.com" }
}' | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["id"])')

curl -s -X POST $BASE/api/meds/$MED/tracking -H 'content-type: application/json' -d '{
  "trackingCode": "AA123456789BR",
  "carrier": "Correios",
  "status": "DELIVERED",
  "postedAt": "2026-08-11T19:42:00Z",
  "deliveredAt": "2026-08-14T16:17:00Z",
  "receiverName": "Maria Souza",
  "source": "TRACKING_PROVIDER",
  "sourceProvider": "correios",
  "sourceReference": "AA123456789BR",
  "events": [{
    "occurredAt": "2026-08-14T16:17:00Z",
    "status": "DELIVERED",
    "description": "Objeto entregue ao destinatario",
    "source": "TRACKING_PROVIDER",
    "sourceReference": "AA123456789BR"
  }]
}' > /dev/null

curl -s -X POST $BASE/api/meds/$MED/generate-defense -H 'content-type: application/json' -d '{"useLlm":false}'
curl -s -o defesa.pdf $BASE/api/meds/$MED/pdf
```
