import { COMPROVANTE, MEDS, RESUMO, type PreviewMed, type PreviewStatus } from '@/components/previews/fixtures';

/*
 * Tudo aqui é conta sobre os fixtures — soma, contagem, faixa. Nenhum número
 * novo entra: se não sai de MEDS, RESUMO ou COMPROVANTE, não aparece.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;
export const pct = (parte: number, todo: number) => (todo === 0 ? 0 : round1((parte / todo) * 100));
export const pctLabel = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/* Entrada diária: 14 dias, o último é hoje. */
export const ENTRADA = RESUMO.entradaDiaria.map((meds, i, arr) => {
  const d = arr.length - 1 - i;
  return { dia: d === 0 ? 'Hoje' : `D-${d}`, meds };
});
export const ENTRADA_TOTAL = RESUMO.entradaDiaria.reduce((a, b) => a + b, 0);
const anterior = RESUMO.entradaDiaria.slice(0, 7).reduce((a, b) => a + b, 0);
const recente = RESUMO.entradaDiaria.slice(7).reduce((a, b) => a + b, 0);
export const ENTRADA_SEMANA = { anterior, recente, variacao: pct(recente - anterior, anterior) };
export const ENTRADA_PICO = Math.max(...RESUMO.entradaDiaria);
export const ENTRADA_MEDIA = round1(ENTRADA_TOTAL / RESUMO.entradaDiaria.length);

export const TICKET_MEDIO = RESUMO.valorEmAberto / RESUMO.emAberto;

/* Amostra da fila (os MEDs listados). */
export const AMOSTRA = MEDS.length;

export const POR_PRODUTO = (['Físico', 'Digital'] as const).map((produto) => {
  const itens = MEDS.filter((m) => m.produto === produto);
  return {
    produto,
    quantidade: itens.length,
    valor: itens.reduce((a, m) => a + m.valor, 0),
    scoreMedio: itens.length ? Math.round(itens.reduce((a, m) => a + m.score, 0) / itens.length) : 0,
  };
});
export const AMOSTRA_VALOR = MEDS.reduce((a, m) => a + m.valor, 0);

export const STATUS_ORDEM: PreviewStatus[] = ['SEM_ENVIO', 'COLETANDO', 'DEFESA', 'PRONTO', 'ENVIADO'];
export const POR_STATUS = STATUS_ORDEM.map((status) => ({
  status,
  quantidade: MEDS.filter((m) => m.status === status).length,
}));

export type Faixa = 'fraca' | 'parcial' | 'boa' | 'forte';
export const FAIXAS: { id: Faixa; rotulo: string; de: number; ate: number }[] = [
  { id: 'fraca', rotulo: '0–39', de: 0, ate: 39 },
  { id: 'parcial', rotulo: '40–69', de: 40, ate: 69 },
  { id: 'boa', rotulo: '70–84', de: 70, ate: 84 },
  { id: 'forte', rotulo: '85–100', de: 85, ate: 100 },
];
export const faixaDe = (score: number): Faixa =>
  FAIXAS.find((f) => score >= f.de && score <= f.ate)?.id ?? 'fraca';

export const SAUDE = FAIXAS.map((f) => ({
  faixa: f.rotulo,
  id: f.id,
  meds: MEDS.filter((m) => faixaDe(m.score) === f.id).length,
}));
export const SCORE_MEDIO = round1(MEDS.reduce((a, m) => a + m.score, 0) / MEDS.length);
export const ACIMA_DE_70 = MEDS.filter((m) => m.score >= 70).length;

export const EM_ABERTO_AMOSTRA = MEDS.filter((m) => m.status !== 'ENVIADO');
export const TOTAL_EM_ABERTO_AMOSTRA = EM_ABERTO_AMOSTRA.reduce((a, m) => a + m.valor, 0);

export function porNome(nome: string): PreviewMed | undefined {
  return MEDS.find((m) => m.pagador === nome);
}

/* Atividade: um evento por MED, só com o que o status de cada um afirma. */
export interface Atividade {
  id: string;
  titulo: string;
  pessoa: string;
  detalhe: string;
  quando?: string;
  tom: 'brand' | 'success' | 'warning' | 'error' | 'neutral';
}

const TITULO_POR_STATUS: Record<PreviewStatus, { titulo: string; tom: Atividade['tom'] }> = {
  PRONTO: { titulo: 'Pronto para envio', tom: 'success' },
  SEM_ENVIO: { titulo: 'Sem registro de envio', tom: 'error' },
  DEFESA: { titulo: 'Defesa v2', tom: 'brand' },
  COLETANDO: { titulo: 'Coletando dados', tom: 'warning' },
  ENVIADO: { titulo: 'Defesa enviada', tom: 'neutral' },
};

const comprovanteMed = MEDS.find((m) => m.e2e === COMPROVANTE.e2e);

export const ATIVIDADE: Atividade[] = [
  ...(comprovanteMed
    ? [
        {
          id: `${comprovanteMed.id}-comprovante`,
          titulo: 'Comprovante gerado',
          pessoa: comprovanteMed.pagador,
          detalhe: `${COMPROVANTE.canal} · ${COMPROVANTE.idMensagem}`,
          quando: COMPROVANTE.enviadoEm,
          tom: 'brand' as const,
        },
      ]
    : []),
  ...MEDS.filter((m) => m.status !== 'PRONTO' || m.id !== comprovanteMed?.id).map((m) => ({
    id: m.id,
    titulo: TITULO_POR_STATUS[m.status].titulo,
    pessoa: m.pagador,
    detalhe: `Score ${m.score} · ${m.produto}`,
    tom: TITULO_POR_STATUS[m.status].tom,
  })),
].slice(0, 7);
