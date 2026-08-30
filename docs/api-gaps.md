# Gaps de API — front pronto, backend pendente

Cada item abaixo tem interface funcional; o backend correspondente ainda não
existe. Um `TODO(api)` no código aponta para cá.

| Área | O que falta no backend | Onde o front contorna |
| --- | --- | --- |
| Conectores (3.7) | Armazenar credenciais por organização, validar contra o provedor e sincronizar transação/pedido/entrega. Hoje só webhook de entrada e importação de CSV são reais. | `src/components/ConnectorCard.tsx` valida o formulário e informa com clareza que nada é armazenado até a sincronização existir. |
| Origem do MED (3.2) | `Med` não grava por onde chegou (webhook, lote, formulário). A interface assume "instituição" para os campos do MED. | `src/lib/origin.ts` (`MED_ORIGIN`); adicionar `source` ao modelo `Med` resolve. |
| Indicador de preenchimento (3.7) | Endpoint agregado de % de evidências automáticas; hoje o cálculo varre até 50 casos por request. | `computeAutoFillStats` em `src/services/medService.ts`. |
| Desfecho do MED (3.11) | Registrar ganho/perdido estruturado por caso para o aprendizado futuro. `ACCEPTED`/`REJECTED` existem como status, mas sem valor recuperado nem data de desfecho. | Sem contorno — registrar aqui para priorização. |
| Envio automático (3.10) | Regra "score ≥ 75 e < 24h → enviar e notificar", alertas (e-mail/webhook/Slack) e relatório semanal. | Sem contorno — interface de envio continua manual por decisão de segurança. |
| Solicitação de evidência ao cliente (3.10) | Disparo de e-mail ao comprador pedindo confirmação de recebimento, com o próprio envio registrado como evidência. | Sem contorno. |
