# Redesign console v2 — relatório de entrega

Branch `redesign/console-v2`. `npm run verify` (lint, typecheck, 125 testes,
build) limpo em todos os commits. Telas verificadas em navegador real
(screenshots durante o desenvolvimento). Gaps de backend em
`docs/api-gaps.md`; plano executado em `docs/redesign-plan.md`.

## O que mudou

**Automação (Parte 3 — prioridade 1)**

- A defesa nasce junto com o MED: `createMedWithOutcome` gera a minuta v1
  determinística na chegada (webhook, lote e formulário caem no mesmo
  caminho). `Gerar defesa` saiu do topo e virou `Regerar` na aba Defesa.
  `deriveStatus` mudou: evidência obrigatória faltante domina; "defesa
  existe" deixou de ser marco (o caso vai de `MISSING_EVIDENCE` direto a
  `READY_TO_SUBMIT`).
- Origem em todo dado: `lib/origin.ts` traduz a proveniência que o backend
  já grava para as cinco origens da interface (instituição / conector /
  derivado / manual / ausente); marcador de 4px + tooltip em cada par
  rótulo-valor; `Manual` em âmbar nas evidências e na linha do tempo.
- Bloco `Próxima ação` (`lib/nextAction.ts`, com testes): um estado por vez
  (pronto / faltam N / prazo crítico / enviado / vencido), cada item
  faltante com ação que leva direto ao campo (âncoras nos painéis).
  Detecta minuta desatualizada e oferece regenerar.
- Fim dos botões "Salvar seção": `AutoSaveForm` salva no blur (form sujo e
  válido), `Salvo` discreto por 2s, aviso quando falta obrigatório, Cmd+S
  salva, Esc descarta o campo. Transação, cliente, pedido, rastreio e os
  dois painéis de entrega migrados.
- `/integracoes`: catálogo completo por grupo (6 gateways Pix, 6
  plataformas digitais, 2 áreas de membros, 3 e-commerce, 3 genéricos),
  estado honesto (`Conectado` só para webhook e CSV, que funcionam de
  fato), "Preenche: …" por card, fluxo de conexão embutido e indicador
  do topo (fontes conectadas + % de preenchimento sem digitação em 30
  dias, calculado dos dados reais).
- `Cmd+K`: busca por número, nome, CPF, e-mail e end-to-end (rota interna
  `/api/ui/search`, documento mascarado), ações de navegação e do caso
  aberto; `g m`, `g i`, `/`, `?`, `Esc`.

**Estética (Parte 2 — prioridade 2)**

- Tokens finais (neutros quentes) em `globals.css`; hex solto removido dos
  componentes.
- Nenhum input nativo restante: `DateTimeField` (texto humano, colagem,
  popover de calendário com Hoje/Ontem/Agora, exibição `dd/mm/aaaa ·
  HH:mm`), `MoneyField` (`R$` com tabular-nums e máscara), `SelectField`
  (Radix, chevron 14px, popover com sombra do sistema); number vira texto
  com `inputMode` e o spinner morreu no CSS global.
- Abas de 9 → 5 (Resumo, Evidências, Defesa, Envio, Auditoria); URLs
  antigas redirecionam; indicador de etapas removido.
- Faixa de métricas: 4 células iguais, score com barra de 4px, "N de M
  fortes", prazo em horas < 48h com fundo danger e badge `urgente` < 24h.
- Sidebar: `Em breve` em badge (sem opacidade), `Importar lote` fora da
  navegação, contadores à direita (`Vencendo` em danger com caso < 24h),
  `Recolher menu` sticky e funcional (colapso persistido).
- Linha do tempo: coluna de data 140px à direita, linha contínua, ponto
  por natureza (verde confirmado com evidência, cinza sem prova, âmbar
  prazo, preto ação manual), origem em badge.
- Datas: `formatDateTimeSmart` — meia-noite exata é hora desconhecida e
  exibe só a data; nenhuma tela inventa `00:00`. Prazo em dias usa `ceil`
  em todas as telas.
- Campos vazios atrás de `Mostrar N campos vazios` nos blocos > 6 campos;
  ids técnicos truncados no meio com copiar no hover (`CopyId`).

**Fila de trabalho (Parte 4 — prioridade 3)**

- `/meds` virou fila: urgência calculada (`lib/urgency.ts`, com testes — o
  prazo domina; desempate por distância do score ao limiar 75 e valor),
  agrupamento por faixa de prazo, contagem regressiva, score em barra,
  próxima ação por linha, linha clicável, `j`/`k`/`Enter`/espaço, seleção
  múltipla com barra fixa (`Regerar defesa (n)`, `Preparar envio (n)` com
  confirmação única, `Exportar` CSV), filtros salvos como visões.

**Estados (Parte 5)**

- Skeletons com a forma do conteúdo (invisíveis nos primeiros 300ms, sem
  brilho) para fila, detalhe e integrações; error boundary com recuperação;
  estados vazios com ação (o da fila desenha o fluxo de conexão).

## Decisões de produto tomadas sozinho (uma linha cada)

- "Enviar defesa" chama-se `Preparar envio`: o produto protocola payload
  para conferência e não envia sozinho — o rótulo não pode prometer mais.
- Formulários de criação (evidência, documento, comprovante) mantêm botão
  explícito: criar registro exige intenção; autosave lá fabricaria lixo.
- Estado "Aguardando conector" da Próxima ação não foi implementado: não
  existe conector que rode em background; entraria como mentira de UI.
- Status `DEFENSE_GENERATED` deixou de ser emitido (mantido no enum para
  registros antigos) — com a minuta nascendo com o caso, o marco é falso.
- Toggle "Gerar a defesa ao salvar" da entrega saiu: a minuta já existe e
  a Próxima ação oferece `Regerar` quando entra evidência nova.
- O comprovante de pagamento mantém paleta escura própria (fora dos
  tokens) de propósito: representa a peça do provedor, não o console.
- Fontes: tokens citam Inter/JetBrains Mono com fallback de sistema; sem
  `next/font` (download em build atrás de proxy é frágil).
- Widgets flutuantes dos cantos são o dev-tools do Next: só existem em
  desenvolvimento; nada a corrigir em produção.
- Contadores da sidebar são computados no layout (uma consulta por
  render); com volume real, migrar para agregado dedicado (api-gaps).

## O que ficou de fora (e por quê)

- **Parte 6 (elemento assinatura / login)**: não existe camada de
  autenticação — a interface roda no tenant demo ou na organização da API
  key. Uma tela de login seria fachada sem função, e o critério de
  descarte do próprio briefing manda preferir sobriedade a 3D mediano.
  Quando a autenticação existir, o slot é o painel direito do login com
  fallback `--color-bg-subtle` + marca.
- Edição inline por campo (3.6) na leitura dos registros: o modo padrão de
  MED/pagador é leitura pura (dados da instituição, não editáveis); os
  registros editáveis vivem em formulários com autosave. Um modo
  lápis-por-campo sobre os registros seria redundante com o autosave — se
  a densidade de edição crescer, reavaliar.
- Envio automático por regra, alertas, relatório semanal, solicitação de
  evidência ao cliente e registro estruturado de desfecho (3.10/3.11):
  exigem backend novo; especificados em `docs/api-gaps.md`.
- Modelos e Regras de evidência (4.4): páginas continuam `Em breve` na
  sidebar — os motores existem no domínio, mas a UI de edição pede
  persistência própria de templates/pesos.
- Virtualização de lista (>200 linhas): a fila é limitada a 200 casos por
  consulta hoje; virtualizar quando a paginação real chegar.
