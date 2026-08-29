# Decisoes tecnicas

Registro curto de cada escolha relevante e do motivo.

## 1. Next.js full-stack, sem backend separado

API Routes cobrem o REST atual e compartilham tipos e dominio com a UI. Um backend
separado so se justifica quando houver processamento longo — e nesse caso ele
entra como servico proprio, nao como reescrita.

## 2. Prisma 7 com driver adapter `pg`

Prisma 7 removeu `url` do schema: a connection string vai para `prisma.config.ts`
(CLI) e para o adapter (runtime). O adapter `pg` e compativel com o runtime
serverless. `DATABASE_URL` deve apontar para conexao **pooled**;
`DIRECT_DATABASE_URL` para conexao direta, usada apenas por `prisma migrate`.

## 3. Dinheiro em centavos

`amountCents Int`. Valor financeiro nunca passa por float no banco. A conversao
para decimal acontece somente na camada de repositorio.

## 4. Modo demo quando nao ha `DATABASE_URL`

Sem banco configurado o app sobe com repositorio em memoria e dados de exemplo
claramente rotulados (`DEMO-*`). Isso permite validar um preview deploy antes de
existir infraestrutura.

**Limitacao real, documentada e sinalizada na UI:** em serverless esse estado vive
dentro de uma unica instancia e desaparece no proximo cold start. Modo demo nao e
persistencia. Producao exige `DATABASE_URL`.

## 5. Nada de BullMQ

BullMQ precisa de um worker Node persistente e de Redis. Funcao serverless nao
oferece nenhum dos dois. Quando houver trabalho assincrono real (consultar
transportadora, reprocessar rastreio, gerar lote de PDFs), a escolha e uma
plataforma de jobs compativel com serverless (Inngest, Trigger.dev, QStash) ou um
worker em infraestrutura propria — mantido **desacoplado** atras de uma porta,
para nao contaminar o dominio.

## 6. PDF com `pdf-lib`

JavaScript puro, sem Chromium, sem binario. Um pipeline HTML->PDF daria mais
liberdade visual ao custo de um browser headless dentro da funcao — inviavel no
budget de uma serverless function. O preco pago e uma camada minima de layout
(`src/infra/pdf/layout.ts`).

## 7. Componentes de UI proprios em vez de shadcn/ui

As telas sao tabelas operacionais densas, onde altura de linha e tipografia
importam mais do que variedade de componentes. Componentes proprios em Tailwind
saem menores e mais controlaveis. shadcn/ui continua compativel caso a superficie
de UI cresca.

## 8. Score e completude, nunca probabilidade

`DefenseScore` mede completude e forca documental segundo as regras deste
repositorio. Ele nao estima chance de vitoria e a UI e o PDF dizem isso
explicitamente. Apresentar o numero como probabilidade seria inventar uma
estatistica que nao existe.

## 9. Evidencia derivada e projecao, nao invencao

`deriveEvidence` transforma registros estruturados (transacao, pedido, cliente,
tracking, documentos) em `Evidence`. O valor e copiado literalmente e herda a
origem do registro; `metadata.derivedFrom` aponta a origem exata. Comparacoes
(pagador x comprador) sao marcadas `SYSTEM_DERIVED` e carregam os dois lados.
Evidencia gravada explicitamente sempre vence a projecao, para nao sobrescrever
uma correcao de analista.

## 10. Guard do LLM e containment, nao semantica

O guard compara tokens verificaveis. Ele nao detecta uma invencao puramente
qualitativa ("o cliente confirmou por telefone"). Por isso o LLM e opcional,
recebe apenas o Defense JSON e o renderizador deterministico continua sendo o
padrao. Endurecer o guard (validacao sentenca a sentenca contra claims) e o
proximo passo natural.

## 11. Autenticacao por API key nesta fase

Nao ha sessao interativa ainda. A API autentica por API key
(`API_KEYS="<key>:<org>:<role>"`) com RBAC em `src/infra/auth/rbac.ts`. Em
producao, ausencia de key **falha fechado**. A UI hoje opera sobre a organizacao
da primeira credencial configurada; login de usuario e o proximo item de backlog.

## 12. Upload recusado quando nao ha storage duravel

Com banco configurado e sem bucket S3, o upload falha explicitamente em vez de
usar o store em memoria. Aceitar o arquivo e perde-lo no proximo cold start
destruiria evidencia — exatamente o que este produto existe para evitar. Recusar
com mensagem clara e a opcao correta.

## 13. Prazo vencido vira EXPIRED

Um MED cuja janela de resposta fechou sem envio passa a `EXPIRED`, qualquer que
seja a qualidade das evidencias. Continuar exibindo `READY_TO_SUBMIT` depois do
prazo informaria ao operador algo que nao e verdade. Casos ja submetidos ou
decididos nao sao afetados: status terminal nao e sobrescrito.

## 14. Marco de entrega digitado a mao e permitido, com procedencia MANUAL

A decisao anterior era nao aceitar evento de rastreio digitado. Estava errada
para a operacao real: o dado existe no ERP ou no painel da transportadora, e o
operador esta transcrevendo, nao inventando. O que importa e a procedencia ficar
visivel — evento manual entra com `source: MANUAL`, aparece assim no PDF e vale
menos na regra de forca (R2/R3) do que o dado vindo direto do provedor.

O limite continua de pe: **status sozinho nao vira afirmacao**. Cada marco so
existe se vier com a data e a hora. Marcar "entregue" sem informar quando e
recusado pelo servico, porque geraria uma data inventada.

## 15. No digital, a entrega e o envio do acesso — nao a confirmacao do cliente

Exigir log de acesso ou confirmacao do comprador deixava a defesa refem de uma
acao do proprio contestante, que nao tem incentivo para responder dentro do
prazo do MED. O que o estabelecimento controla e comprova e o envio: data, canal
e destino. Entao `ACCESS_SENT_AT` e `ACCESS_SENT_TO` sao obrigatorios no digital,
e `FIRST_ACCESS_AT`/`ACCESS_LOG` passaram a recomendados — reforcam a defesa
quando existem, sem trava-la quando nao existem.

## 16. Deduplicacao da timeline por autoridade da origem

O mesmo marco chega por dois caminhos (o campo `deliveredAt` do rastreio e o
evento de entrega da lista) e e um fato so. Dois eventos de mesmo tipo e mesmo
instante viram um: fica a versao de origem mais autoritativa — a redacao da
propria transportadora vale mais que a nossa parafrase —, e as evidencias das
duas versoes sao preservadas.

Marcos com **horarios diferentes** nao sao deduplicados: sao informacoes
divergentes de fontes distintas, e some-las seria escolher uma verdade. As duas
aparecem com sua origem.

## 17. Importacao em lote nao conserta linha

Valor ou data que nao pode ser interpretado com seguranca faz a linha ser
reportada e ficar de fora, em vez de virar palpite. Motivo desconhecido vira
`OTHER` com o texto original preservado, porque encaixar na categoria errada
mudaria quais evidencias o sistema passa a exigir. Coluna nao reconhecida e
listada para o operador, nunca encaixada a forca em algum campo.
