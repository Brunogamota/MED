/**
 * Aviso de MED que chega por e-mail vira caso.
 *
 * A leitura e feita pelo dominio (`domain/email/medNotice.ts`), que devolve um
 * rascunho e diz o que ficou faltando. Aqui decidimos o que fazer com isso, e a
 * decisao e conservadora: so criamos o MED quando o aviso trouxe os quatro
 * campos sem os quais um caso nao existe — identificador, valor, data de
 * abertura e motivo. Faltando qualquer um, devolvemos o rascunho para a pessoa
 * completar. Arbitrar um valor aqui seria inventar o fato que a defesa inteira
 * vai citar depois.
 *
 * A procedencia fica na auditoria: `source: 'EMAIL'` e o id da mensagem no
 * Gmail, que e o caminho de volta ao original.
 */

import type { AuthContext } from '@/infra/auth/context';
import type { CreateMedInput } from '@/domain/schemas';
import { createMedSchema } from '@/domain/schemas';
import { readMedNotice, type MedNoticeDraft, type MedNoticeReading } from '@/domain/email/medNotice';
import { createMedWithOutcome } from '@/services/medService';
import { readRawMessage } from '@/services/gmailService';
import { getRepository } from '@/infra/container';
import { recordAudit } from '@/services/audit';
import { assertCan } from '@/infra/auth/rbac';

/** Sem estes quatro, `createMedSchema` recusa — e com razao. */
const REQUIRED: (keyof MedNoticeDraft)[] = ['medId', 'amountCents', 'openedAt', 'reason'];

export interface NoticePreview {
  messageId: string;
  subject: string | null;
  reading: MedNoticeReading;
  /** Campos obrigatorios que o aviso nao trouxe. Vazio = da para criar. */
  blocking: (keyof MedNoticeDraft)[];
  /** MED que ja existe com este identificador, se existir. */
  existingMedId: string | null;
}

function blockingFields(draft: MedNoticeDraft): (keyof MedNoticeDraft)[] {
  return REQUIRED.filter((field) => draft[field] === null);
}

/** Le a mensagem e diz o que daria para criar, sem gravar nada. */
export async function previewNotice(
  auth: AuthContext,
  messageId: string,
): Promise<{ ok: true; preview: NoticePreview } | { ok: false; reason: string }> {
  const raw = await readRawMessage(auth.organizationId, messageId);
  if (!raw.ok) return { ok: false, reason: raw.reason };

  const { subject, ...reading } = readMedNotice(raw.raw);
  const repository = await getRepository();
  const existing = reading.draft.medId
    ? await repository.findMedByExternalId(auth.organizationId, reading.draft.medId)
    : null;

  return {
    ok: true,
    preview: {
      messageId,
      subject,
      reading,
      blocking: blockingFields(reading.draft),
      existingMedId: existing?.id ?? null,
    },
  };
}

export type IntakeResult =
  | { ok: true; medId: string; created: boolean }
  | { ok: false; reason: string; blocking?: (keyof MedNoticeDraft)[] };

/**
 * Cria o MED a partir da mensagem.
 *
 * Idempotente pelo identificador do aviso: a mesma mensagem lida duas vezes
 * devolve o caso que ja existe, e nao um segundo. Quem garante isso e
 * `createMedWithOutcome`, que ja e a porta unica de criacao.
 */
export async function createMedFromMessage(
  auth: AuthContext,
  messageId: string,
): Promise<IntakeResult> {
  assertCan(auth.role, 'med:write');

  const preview = await previewNotice(auth, messageId);
  if (!preview.ok) return { ok: false, reason: preview.reason };

  const { reading } = preview.preview;
  if (!reading.recognized) {
    return {
      ok: false,
      reason: 'Esta mensagem não tem a forma de um aviso de MED: não encontrei o identificador.',
    };
  }
  if (preview.preview.blocking.length > 0) {
    return {
      ok: false,
      reason:
        'O aviso não trouxe tudo que um MED exige. Complete os campos na tela — nada é preenchido por conta própria.',
      blocking: preview.preview.blocking,
    };
  }

  const draft = reading.draft;
  const candidate = {
    medId: draft.medId ?? undefined,
    transactionId: draft.transactionId ?? undefined,
    endToEndId: draft.endToEndId ?? undefined,
    pixId: draft.pixId ?? undefined,
    amount: draft.amountCents ?? undefined,
    currency: draft.currency ?? 'BRL',
    transactionAt: draft.transactionAt ?? undefined,
    openedAt: draft.openedAt ?? undefined,
    responseDeadlineAt: draft.responseDeadlineAt ?? undefined,
    reason: draft.reason ?? undefined,
    reasonDescription: draft.reasonDescription ?? undefined,
    requestingInstitution: draft.requestingInstitution ?? undefined,
    productType: draft.productType ?? undefined,
    merchantName: draft.merchantName ?? undefined,
    additionalInformation: draft.additionalInformation ?? undefined,
    payer: {
      name: draft.payerName ?? undefined,
      document: draft.payerDocument ?? undefined,
      email: draft.payerEmail ?? undefined,
      phone: draft.payerPhone ?? undefined,
    },
  };

  const parsed = createMedSchema.safeParse(candidate);
  if (!parsed.success) {
    // O schema e a ultima palavra sobre o que e um MED valido. Se ele recusa,
    // dizemos o que ele recusou em vez de contornar.
    return {
      ok: false,
      reason: `O aviso não passou na validação: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.')} ${issue.message}`)
        .join('; ')}`,
    };
  }

  const outcome = await createMedWithOutcome(auth, parsed.data as CreateMedInput);

  // Procedencia: de qual mensagem este caso saiu, e o que ficou por confirmar.
  // Vai na auditoria porque o aviso e a **entrada** do caso, nao evidencia da
  // defesa — tratar um do outro jeito confundiria as duas coisas.
  const repository = await getRepository();
  await recordAudit(repository, auth, {
    action: 'MED_INTAKE_FROM_EMAIL',
    entityType: 'Med',
    entityId: outcome.med.id,
    medId: outcome.med.id,
    source: 'EMAIL',
    newValue: {
      gmailMessageId: messageId,
      // Falso quando a mensagem apontou para um caso que ja existia: a leitura
      // aconteceu, a criacao nao.
      created: outcome.created,
      subject: preview.preview.subject,
      // O que o leitor assumiu e o que nao soube ler fica registrado: quem
      // conferir o prazo depois precisa saber que o fuso foi assumido.
      assumedTimezone: reading.assumedTimezone,
      unmapped: reading.unmapped,
    },
  });

  return { ok: true, medId: outcome.med.id, created: outcome.created };
}
