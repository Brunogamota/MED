/**
 * Dados ilustrativos das prévias de interface do Marketplace Verificado.
 *
 * Só para comparar direções visuais em /preview/marketplace — nada aqui entra
 * em caso, evidência ou defesa. Nomes e identificadores de exemplo.
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
  { id: 'm1', e2e: 'E18236120202610221350a71c0e2d94f', pagador: 'Camila Duarte', valor: 189.9, produto: 'Físico', prazoHoras: 4, status: 'PRONTO', score: 88 },
  { id: 'm2', e2e: 'E00360305202610221906b5d1e77a0c2', pagador: 'Lucas Andrade', valor: 59.9, produto: 'Digital', prazoHoras: 9, status: 'SEM_ENVIO', score: 31 },
  { id: 'm3', e2e: 'E00416968202610230809QWEr19KdP2s', pagador: 'Fernanda Costa', valor: 349.0, produto: 'Físico', prazoHoras: 30, status: 'DEFESA', score: 79 },
  { id: 'm4', e2e: 'E90400888202610231140811294295771', pagador: 'Bruno Martins', valor: 27.9, produto: 'Digital', prazoHoras: 52, status: 'PRONTO', score: 92 },
  { id: 'm5', e2e: 'E22896431202610241019CC1b3f2e90a', pagador: 'Juliana Reis', valor: 129.9, produto: 'Físico', prazoHoras: 77, status: 'COLETANDO', score: 48 },
  { id: 'm6', e2e: 'E16501555202610241528ffa03cd2817', pagador: 'Thiago Nunes', valor: 74.5, produto: 'Físico', prazoHoras: 101, status: 'ENVIADO', score: 87 },
  { id: 'm7', e2e: 'E10573521202610250012ZP4OyhvM77a', pagador: 'Patrícia Gomes', valor: 412.0, produto: 'Físico', prazoHoras: 14, status: 'PRONTO', score: 84 },
  { id: 'm8', e2e: 'E31872495202610251347kR8QPbjqTXe', pagador: 'Diego Ferraz', valor: 39.6, produto: 'Digital', prazoHoras: 63, status: 'SEM_ENVIO', score: 27 },
];

export const RESUMO = {
  emAberto: 238,
  valorEmAberto: 26914.3,
  vencendo24h: 15,
  prontos: 57,
  semEvidencia: 33,
  enviadosMes: 1012,
  /** MEDs recebidos por dia nos últimos 14 dias. */
  entradaDiaria: [12, 18, 15, 21, 17, 26, 10, 9, 22, 27, 19, 16, 23, 20],
};

/**
 * O comprovante de envio que todas as opções desenham. Mesmo dado, outra
 * peça. Só a mensagem "Obrigado pela sua compra" — físico ou digital, sem as
 * etapas do pedido.
 */
export const COMPROVANTE = {
  remetente: 'Marketplace Verificado',
  destinatarioNome: 'Camila Duarte',
  destinatarioEmail: 'camila.duarte@email.com',
  canal: 'E-mail',
  tipo: 'Confirmação de compra',
  enviadoEm: '22/10/2026 13:52:08',
  e2e: 'E18236120202610221350a71c0e2d94f',
  idMensagem: 'MKV-261022-7QH2LZP',
  assunto: 'Obrigado pela sua compra',
  saudacao: 'Olá, Camila',
  corpo: 'Obrigado por comprar com a gente! Clique no botão abaixo para acompanhar o seu pedido até ser entregue.',
  botao: 'Acompanhar pedido',
  linkPedido: 'https://exemplo.com/pedidos/MKV-261022-7QH2LZP',
  /** Declaração de origem — vai em toda peça, nunca some. */
  declaracao: 'Documento gerado a partir do registro de envio.',
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
