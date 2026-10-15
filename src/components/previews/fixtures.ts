/**
 * Dados ilustrativos das prévias de interface da Bulls Cash.
 *
 * Só para comparar direções visuais em /preview/bulls — nada aqui entra em
 * caso, evidência ou defesa. Nomes abreviados e identificadores de exemplo.
 */

export type PreviewStatus = 'PRONTO' | 'SEM_ENVIO' | 'DEFESA' | 'COLETANDO' | 'ENVIADO';

export interface PreviewMed {
  id: string;
  e2e: string;
  pagador: string;
  valor: number;
  produto: 'Físico' | 'Digital';
  prazoHoras: number;
  status: PreviewStatus;
  score: number;
}

export const STATUS_LABEL: Record<PreviewStatus, string> = {
  PRONTO: 'Pronto para envio',
  SEM_ENVIO: 'Sem registro de envio',
  DEFESA: 'Defesa gerada',
  COLETANDO: 'Coletando dados',
  ENVIADO: 'Enviado',
};

export const MEDS: PreviewMed[] = [
  { id: 'm1', e2e: 'E18236120202610022350s48a1f2c9e1', pagador: 'Maria Silva', valor: 149.9, produto: 'Físico', prazoHoras: 3, status: 'PRONTO', score: 86 },
  { id: 'm2', e2e: 'E00360305202610121906d467820c938', pagador: 'João Pereira', valor: 89.9, produto: 'Digital', prazoHoras: 7, status: 'SEM_ENVIO', score: 34 },
  { id: 'm3', e2e: 'E00416968202610122109cUQEACS8QDp', pagador: 'Ana Rocha', valor: 229.9, produto: 'Físico', prazoHoras: 28, status: 'DEFESA', score: 78 },
  { id: 'm4', e2e: 'E90400888202610030140711294295204', pagador: 'Carlos Mendes', valor: 47.9, produto: 'Digital', prazoHoras: 49, status: 'PRONTO', score: 91 },
  { id: 'm5', e2e: 'E22896431202609281019DB434a2e44b', pagador: 'Beatriz Lima', valor: 99.9, produto: 'Físico', prazoHoras: 81, status: 'COLETANDO', score: 52 },
  { id: 'm6', e2e: 'E16501555202609261128eebe3cc165c', pagador: 'Rafael Torres', valor: 64.5, produto: 'Físico', prazoHoras: 98, status: 'ENVIADO', score: 88 },
  { id: 'm7', e2e: 'E10573521202609280012KQ7OyzvR10f', pagador: 'Luiza Prado', valor: 312.0, produto: 'Físico', prazoHoras: 12, status: 'PRONTO', score: 83 },
  { id: 'm8', e2e: 'E31872495202610081347cX0QPajpRKU', pagador: 'Pedro Alves', valor: 44.6, produto: 'Digital', prazoHoras: 60, status: 'SEM_ENVIO', score: 29 },
];

export const RESUMO = {
  emAberto: 195,
  valorEmAberto: 18430.6,
  vencendo24h: 12,
  prontos: 41,
  semEvidencia: 27,
  enviadosMes: 844,
  /** MEDs recebidos por dia nos últimos 14 dias. */
  entradaDiaria: [9, 14, 11, 17, 13, 21, 8, 6, 19, 23, 16, 12, 18, 15],
};

/** O comprovante de envio que todas as opções desenham. Mesmo dado, outra peça. */
export const COMPROVANTE = {
  remetente: 'Bulls Cash',
  destinatarioNome: 'Maria Silva',
  destinatarioEmail: 'maria.s@email.com',
  canal: 'E-mail',
  tipo: 'Acompanhamento do pedido',
  enviadoEm: '02/10/2026 20:52:33',
  e2e: 'E18236120202610022350s48a1f2c9e1',
  idMensagem: 'ARK-261002-KCYKDDD',
  assunto: 'Obrigado pela sua compra',
  saudacao: 'Olá, Maria',
  corpo: 'Obrigado por comprar com a gente! Clique no botão abaixo para acompanhar o seu pedido até ser entregue.',
  botao: 'Acompanhar pedido',
  linkPedido: 'https://exemplo.com/pedidos/ARK-261002-KCYKDDD',
  /** Declaração de origem — vai em toda peça, nunca some. */
  declaracao: 'Documento gerado a partir do registro de envio.',
  etapas: [
    { titulo: 'Pagamento confirmado', data: '02/10/2026 20:50', status: 'completed' as const },
    { titulo: 'Pedido recebido', data: '02/10/2026 20:52', status: 'completed' as const },
    { titulo: 'Em preparação', data: '02/10/2026 21:01', status: 'completed' as const },
    { titulo: 'Enviado para a distribuidora', data: '02/10/2026 21:21', status: 'completed' as const },
    { titulo: 'Retorno da distribuidora', data: 'Aguardando retorno', status: 'in-progress' as const },
  ],
};

export function brl(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function prazo(horas: number): string {
  if (horas < 24) return `${horas}h`;
  const dias = Math.floor(horas / 24);
  const resto = horas % 24;
  return resto ? `${dias}d ${resto}h` : `${dias}d`;
}
