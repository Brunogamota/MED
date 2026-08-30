import type { ImportedMedRow } from '@/domain/import/csv';
import {
  upsertCustomerSchema,
  upsertOrderSchema,
  upsertTransactionSchema,
  type UpsertCustomerInput,
  type UpsertOrderInput,
  type UpsertTransactionInput,
} from '@/domain/schemas';

/**
 * Mapeamento coluna-do-CSV → registro do caso, para a importação em lote.
 *
 * Hoje a importação só cria o `Med`: as abas Transação, Cliente e Pedido
 * ficam em branco mesmo quando o dado já veio no arquivo, e o operador acaba
 * digitando de novo o que a adquirente já mandou. Estas funções fecham esse
 * buraco — cada uma monta o candidato de um registro a partir do que
 * `parseMedImport` já extraiu da linha (o mapeamento coluna-do-CSV → campo
 * mora em `COLUMN_ALIASES`, em `csv.ts`; este arquivo só faz a segunda etapa,
 * campo-da-linha → registro).
 *
 * Estender para uma coluna nova (e-mail, telefone, método, end-to-end...) é
 * mecânico: a coluna já é reconhecida por `COLUMN_ALIASES`, então o valor já
 * chega em `ImportedMedRow` — só falta usá-lo aqui. Nenhuma linha de parsing
 * de CSV vive neste arquivo, e nenhum destes campos é chutado: quando falta o
 * suficiente para um registro válido, a função devolve `null` e a seção
 * continua em branco, como hoje.
 */

export function buildTransactionInput(row: ImportedMedRow): UpsertTransactionInput | null {
  if (row.amount === null) return null;

  const candidate = {
    externalId: row.transactionId ?? undefined,
    endToEndId: row.endToEndId ?? undefined,
    amount: row.amount,
    // O CSV nao tem coluna de moeda hoje; fixo BRL ate que exista uma.
    currency: 'BRL',
    // Uma unica data de compra no arquivo alimenta autorizacao e captura —
    // nao ha como distinguir as duas so com o que a adquirente manda.
    authorizedAt: row.transactionAt ?? undefined,
    capturedAt: row.transactionAt ?? undefined,
  };

  const parsed = upsertTransactionSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function buildCustomerInput(row: ImportedMedRow): UpsertCustomerInput | null {
  if (!row.payerName && !row.payerDocument && !row.payerEmail && !row.payerPhone) return null;

  const candidate = {
    identification: {
      name: row.payerName ?? undefined,
      document: row.payerDocument ?? undefined,
      email: row.payerEmail ?? undefined,
      phone: row.payerPhone ?? undefined,
    },
  };

  const parsed = upsertCustomerSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/**
 * Pedido: criado quando o arquivo traz algo que o identifique — numero do
 * pedido ou tipo de produto. So data e valor nao viram Pedido: seriam uma
 * copia da Transacao, sem identidade propria.
 *
 * `productType` e obrigatorio no dominio (define a matriz de evidencias
 * exigidas). Quando o arquivo nao diz qual e, usamos `OTHER` — o mesmo valor
 * que `resolveProductType` ja devolve para um caso sem tipo declarado. Nao e
 * chute: e o "nao classificado" explicito do proprio dominio, e o operador
 * troca pelo tipo certo no formulario quando souber.
 */
export function buildOrderInput(row: ImportedMedRow): UpsertOrderInput | null {
  if (!row.productType && !row.orderReference) return null;

  const candidate = {
    externalId: row.orderReference ?? undefined,
    productType: row.productType ?? 'OTHER',
    totalAmount: row.amount ?? undefined,
    placedAt: row.transactionAt ?? undefined,
  };

  const parsed = upsertOrderSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
