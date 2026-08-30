# Redesign console v2 — plano de ataque

Branch: `redesign/console-v2`. Briefing completo no histórico do projeto; este
arquivo registra a ordem de execução e o que cada etapa entrega. Prioridade
quando faltar tempo, na ordem do briefing: (1) automação de preenchimento,
(2) correções de estética, (3) fila de trabalho, (4) elemento assinatura.

## Mapa do que existe (leitura previa)

- Rotas UI: `/meds` (tabela cronológica), `/meds/[id]` (9 abas + indicador de
  etapas), `/meds/new`, `/meds/import`, `/meds/[id]/comprovante/*`.
- `Sidebar.tsx`: 3 grupos; metade dos itens sem href (opacidade de desabilitado).
- Primitivos em `components/ui.tsx` (Panel, MetricStrip, KeyValueRow, ScoreBar,
  StatusDot, tabela); campos em `components/form.tsx` (input nativo 32px,
  select `appearance-none` com chevron próprio mas popover nativo).
- Dados: server components + server actions (`app/meds/actions.ts`) sobre a
  camada de serviço; validação Zod compartilhada com a REST API.
- Origem já existe no dado: `Evidence.source` + `metadata.derivedFrom`
  (`domain/evidence/derive.ts`); registros estruturados carregam
  `provider/source`. Não há conectores implementados — a origem "conector"
  hoje se manifesta como `provider != null` num registro.
- Defesa só nasce por botão (`generateDefenseAction`); status é derivado
  automaticamente (`deriveStatus`), mas a minuta não.

## Etapas

### A. Fundamentos (tokens + primitivos)
- `globals.css`: token set final do briefing (neutros quentes, `--color-accent`
  = verde de status, spinner de number removido globalmente).
- Primitivos novos em `ui.tsx`: `SourceMark` (marcador de origem 4px + tooltip),
  `CopyId` (mono truncado no meio + copiar no hover, client), célula de prazo.
- `MetricStrip` com 4 células iguais; célula de prazo com fundo danger < 48h e
  badge `urgente` < 24h; barra de 4px sob o score; "N de M fortes".

### B. Automação (Parte 3 — prioridade 1)
1. **Defesa nasce com o MED**: `createMedWithOutcome` gera a defesa v1
   (determinística) logo após criar o caso — webhook, lote e formulário caem no
   mesmo caminho. `Gerar defesa` vira `Regerar` dentro da aba Defesa.
2. **Origem em todo dado**: adapter `lib/origin.ts` mapeia cada campo do caso
   para a cadeia de origem (instituição / conector / derivado / manual /
   ausente); `KeyValueRow` ganha `origin` e renderiza o marcador.
3. **Próxima ação**: `lib/nextAction.ts` (função pura, um estado por vez:
   pronto / faltam N / prazo crítico / enviado / vencido) + `NextActionCard`
   no topo do Resumo, com ação direta por item faltante.
4. **Fim dos botões Salvar**: `AutoSaveForm` (client) — submit no blur quando o
   formulário está sujo e válido, "Salvo" discreto, Cmd+S salva, Esc descarta o
   campo. Formulários de registro (transação, cliente, pedido, entrega) migram.
5. **Integrações** `/integracoes`: catálogo completo em grade (gateways Pix,
   plataformas digitais, áreas de membros, e-commerce, genéricos), estado por
   card, "o que preenche", indicador honesto no topo. Fluxo de conexão grava
   intenção e devolve `TODO(api)` — gaps em `docs/api-gaps.md`.
6. **Cmd+K**: paleta com busca de MED (número, CPF, e-mail, end-to-end — via
   `GET /api/meds?search=`), navegação e ações do caso aberto; atalhos `g m`,
   `g i`, `/`, `?`, `Esc`.

### C. Estética (Parte 2 — prioridade 2)
1. Abas de 9 → 5 (Resumo, Evidências, Defesa, Envio, Auditoria); indicador de
   etapas removido; chaves antigas de URL redirecionam.
2. Inputs: `DateTimeField` próprio (texto humano + popover calendário com
   Hoje/Ontem/Agora + colagem + exibição `dd/mm/aaaa · HH:mm`), `MoneyField`
   com máscara `R$`, `SelectField` sobre Radix. Sem spinner, sem select nativo.
3. Datas: nunca inventar `00:00` — hora meia-noite exata vira só data na
   timeline e nas telas.
4. Sidebar: `Em breve` em badge (sem opacidade), `Importar lote` sai da
   navegação (já é botão na lista), rodapé sticky, contadores à direita.
5. Linha do tempo: linha vertical 1px contínua, coluna de data 140px à
   direita, ponto por tipo (confirmado/sem prova/prazo/ação do usuário),
   origem em badge com `Manual` em âmbar.
6. Campos vazios atrás de "Mostrar N campos vazios" nos blocos > 6 campos.
7. Comprovantes como documentos com ações no topo do card.

### D. Fila de trabalho (Parte 4 — prioridade 3)
- `/meds` vira fila: ordenação por urgência calculada (prazo dominante,
  desempate por valor e distância do score ao limiar 75), agrupamento por
  faixa (`Vence hoje`, `Próximas 48h`, `Esta semana`, `Sem urgência`),
  colunas com barra de score, contagem regressiva e próxima ação, linha
  clicável, `j`/`k`/`Enter`, seleção múltipla com ações em lote
  (Gerar defesa (n) / Preparar envio (n)), filtros salvos como abas leves.

### E. Estados e acessibilidade (Parte 5, transversal)
- `loading.tsx` com skeleton na forma do conteúdo (sem brilho) para /meds,
  /meds/[id] e /integracoes; `error.tsx` com recuperação; estados vazios já
  padronizados em `EmptyState`.

### F. Elemento assinatura (Parte 6 — só se A–D impecáveis)
- Tela de login com painel direito. Critério de descarte do briefing vale:
  na dúvida, painel sóbrio `--color-bg-subtle` + marca, decisão registrada.

## Decisões tomadas de saída

- Fontes: tokens citam Inter/JetBrains Mono com fallback de sistema; não
  adicionamos `next/font` (download em build atrás de proxy é frágil) — o
  fallback de sistema atende. Registrada no relatório.
- Conectores não existem no backend: a página de Integrações é interface
  completa com persistência de intenção adiada (`TODO(api)`), como o briefing
  autoriza.
- Widgets flutuantes do canto: são o dev-tools do Next (só em dev) — nada a
  fazer em produção; verificado e registrado.
