import type { DeliveryLogRow } from '@/domain/import/deliveryLog';

/**
 * Casa cada linha do log de envio com o MED correspondente.
 *
 * O export do provedor de e-mail nao carrega o identificador do MED — ele nao
 * sabe que existe MED. Sobram valor, horario da compra e nome do comprador,
 * que juntos identificam a transacao.
 *
 * A regra central: **na duvida, nao casa**. Duas linhas que servem para o mesmo
 * MED, ou um MED que serve para duas linhas, viram relatorio e nao vinculo.
 * Anexar o comprovante de entrega do comprador errado a um caso seria pior do
 * que nao anexar nenhum — a defesa passaria a afirmar algo sobre uma pessoa que
 * nao e a daquele caso.
 */

/** O minimo do MED que este casamento precisa conhecer. */
export interface MatchableMed {
  id: string;
  medId: string;
  /** Em reais, como o dominio guarda. */
  amount: number;
  /** Momento da transacao. Sem ele, o valor sozinho nao distingue nada. */
  transactionAt: string | null;
  payerName: string | null;
}

export interface DeliveryMatch {
  med: MatchableMed;
  row: DeliveryLogRow;
}

export interface UnmatchedRow {
  row: DeliveryLogRow;
  reason: string;
}

export interface MatchReport {
  matched: DeliveryMatch[];
  /** Linhas do log que nao encontraram MED, com o motivo. */
  unmatchedRows: UnmatchedRow[];
  /** MEDs que ficaram sem registro de envio: e o que a defesa nao tem. */
  medsWithoutDelivery: MatchableMed[];
}

/** Centavos, para comparar dinheiro sem depender de ponto flutuante. */
function cents(amount: number): number {
  return Math.round(amount * 100);
}

/** Minuto cheio: log e MED registram o mesmo instante com segundos diferentes. */
function minuteKey(iso: string | null): string | null {
  return iso ? iso.slice(0, 16) : null;
}

/**
 * Nome comparavel: sem acento, sem caixa, sem pontuacao.
 *
 * Nao e criterio de casamento — e conferencia. Valor e minuto ja identificam a
 * transacao; o nome serve para recusar um casamento que deu certo por acaso.
 */
export function comparableName(value: string | null): string | null {
  if (!value) return null;
  const normalized = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Dois nomes que descrevem a mesma pessoa.
 *
 * Um dos lados costuma vir abreviado ou com um sobrenome a menos. Exigir
 * igualdade exata descartaria casamento bom; aceitar qualquer coisa casaria
 * pessoas diferentes. O criterio e conter um ao outro, ja normalizados.
 */
function sameName(a: string | null, b: string | null): boolean {
  const left = comparableName(a);
  const right = comparableName(b);
  if (!left || !right) return true; // sem nome dos dois lados, nao ha o que contradizer
  return left === right || left.includes(right) || right.includes(left);
}

export function matchDeliveryLog(rows: DeliveryLogRow[], meds: MatchableMed[]): MatchReport {
  const matched: DeliveryMatch[] = [];
  const unmatchedRows: UnmatchedRow[] = [];
  const usedMedIds = new Set<string>();

  for (const row of rows) {
    if (row.amount === null || row.purchaseAt === null) {
      unmatchedRows.push({
        row,
        reason: 'Linha sem valor ou sem data da compra: não há como identificar a transação.',
      });
      continue;
    }

    const rowCents = cents(row.amount);
    const rowMinute = minuteKey(row.purchaseAt);

    const candidates = meds.filter(
      (med) =>
        !usedMedIds.has(med.id) &&
        cents(med.amount) === rowCents &&
        minuteKey(med.transactionAt) === rowMinute &&
        sameName(med.payerName, row.customerName),
    );

    if (candidates.length === 0) {
      unmatchedRows.push({
        row,
        reason: 'Nenhum MED com esse valor e horário de compra.',
      });
      continue;
    }
    if (candidates.length > 1) {
      // Mesmo valor, mesmo minuto, mesma pessoa: o log nao distingue, e o
      // sistema tambem nao deve. Escolher um seria sortear.
      unmatchedRows.push({
        row,
        reason: `Mais de um MED corresponde (${candidates
          .map((med) => med.medId)
          .join(', ')}). Vincule à mão.`,
      });
      continue;
    }

    const med = candidates[0] as MatchableMed;
    usedMedIds.add(med.id);
    matched.push({ med, row });
  }

  return {
    matched,
    unmatchedRows,
    medsWithoutDelivery: meds.filter((med) => !usedMedIds.has(med.id)),
  };
}
