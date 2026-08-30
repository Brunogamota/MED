import type { Defense, DefenseSubmission, Med, MissingEvidence } from '@/domain/types';
import type { EvidenceAssessment } from '@/domain/evidence/engine';

/**
 * Próxima ação (briefing 3.4): a única pergunta que o operador tem é
 * "o que eu faço agora?". Esta função responde com UM estado por vez,
 * nunca uma lista de possibilidades. Pura e determinística — recebe o
 * que o caso tem e devolve a decisão de apresentação.
 */

export interface MissingAction {
  label: string;
  necessity: 'REQUIRED' | 'RECOMMENDED';
  /** Ação direta: leva o operador ao campo, nunca manda procurar. */
  actionLabel: string;
  href: string;
}

export type NextAction =
  | {
      kind: 'submitted';
      submittedAt: string | null;
      provider: string | null;
      /** O que esperar em seguida, em uma linha. */
      expectation: string;
    }
  | { kind: 'expired'; deadlineAt: string | null }
  | {
      kind: 'critical';
      hoursLeft: number;
      missing: MissingAction[];
      /** Impacto de enviar incompleto, em uma linha. */
      impact: string;
    }
  | {
      kind: 'ready';
      score: number;
      max: number;
      /** Resumo em uma linha do que será enviado. */
      summary: string;
      /** Evidência entrou depois da última minuta — sugerir regenerar. */
      stale: boolean;
    }
  | { kind: 'missing'; items: MissingAction[]; requiredCount: number };

/** Para cada evidência faltante, a ação que leva direto ao campo. */
function missingAction(medId: string, missing: MissingEvidence): MissingAction {
  const base = `/meds/${medId}`;
  let actionLabel: string;
  let href: string;
  switch (missing.category) {
    case 'DELIVERY':
      actionLabel = 'Registrar entrega';
      href = `${base}?tab=resumo#entrega`;
      break;
    case 'TRANSACTION':
      actionLabel = 'Preencher transação';
      href = `${base}?tab=evidencias#registro-transacao`;
      break;
    case 'IDENTITY':
      actionLabel = 'Preencher dados do cliente';
      href = `${base}?tab=evidencias#registro-cliente`;
      break;
    case 'TECHNICAL':
      actionLabel = 'Preencher dados do pedido';
      href = `${base}?tab=evidencias#registro-pedido`;
      break;
    case 'DOCUMENTATION':
      actionLabel = 'Anexar documento';
      href = `${base}?tab=evidencias#documentos`;
      break;
  }
  return {
    label: missing.label,
    necessity: missing.necessity as 'REQUIRED' | 'RECOMMENDED',
    actionLabel,
    href,
  };
}

export interface NextActionInput {
  med: Med;
  assessment: EvidenceAssessment;
  latestDefense: Defense | null;
  submissions: DefenseSubmission[];
  /** Horas até o prazo (negativo = vencido; null = sem prazo). */
  hoursRemaining: number | null;
  /** Momento da evidência mais recente, para detectar minuta desatualizada. */
  lastEvidenceAt: string | null;
}

export function nextAction(input: NextActionInput): NextAction {
  const { med, assessment, latestDefense, submissions, hoursRemaining, lastEvidenceAt } = input;

  if (['SUBMITTED', 'ACCEPTED', 'REJECTED'].includes(med.status)) {
    const lastSubmission = submissions[submissions.length - 1] ?? null;
    return {
      kind: 'submitted',
      submittedAt: lastSubmission?.submittedAt ?? lastSubmission?.createdAt ?? null,
      provider: lastSubmission?.provider ?? null,
      expectation:
        med.status === 'SUBMITTED'
          ? 'A instituição analisa a defesa dentro do prazo do MED; o desfecho será registrado aqui.'
          : med.status === 'ACCEPTED'
            ? 'Defesa aceita pela instituição. Nada a fazer.'
            : 'Defesa rejeitada pela instituição. Registre o desfecho e avalie os aprendizados do caso.',
    };
  }

  if (med.status === 'EXPIRED' || (hoursRemaining !== null && hoursRemaining < 0)) {
    return { kind: 'expired', deadlineAt: med.responseDeadlineAt ?? null };
  }

  const missingRequired = assessment.missingEvidences.filter(
    (item) => item.necessity === 'REQUIRED',
  );
  const missingRecommended = assessment.missingEvidences.filter(
    (item) => item.necessity === 'RECOMMENDED',
  );

  if (hoursRemaining !== null && hoursRemaining < 24 && missingRequired.length > 0) {
    return {
      kind: 'critical',
      hoursLeft: Math.max(0, Math.floor(hoursRemaining)),
      missing: missingRequired.map((item) => missingAction(med.id, item)),
      impact: `Enviar agora protocola a defesa com score ${assessment.score.total}/${assessment.score.max}; as evidências faltantes deixam de contar.`,
    };
  }

  if (missingRequired.length === 0) {
    const stale =
      latestDefense !== null &&
      lastEvidenceAt !== null &&
      Date.parse(lastEvidenceAt) > Date.parse(latestDefense.generatedAt);
    const claims = latestDefense?.claims.length ?? 0;
    return {
      kind: 'ready',
      score: latestDefense?.score.total ?? assessment.score.total,
      max: latestDefense?.score.max ?? assessment.score.max,
      summary: latestDefense
        ? `Defesa v${latestDefense.version} com ${claims} afirmaç${claims === 1 ? 'ão' : 'ões'} sustentada${claims === 1 ? '' : 's'} por evidência, pronta para conferência e envio.`
        : 'Evidências completas; a minuta será gerada no envio.',
      stale,
    };
  }

  return {
    kind: 'missing',
    items: [...missingRequired, ...missingRecommended]
      .slice(0, 3)
      .map((item) => missingAction(med.id, item)),
    requiredCount: missingRequired.length,
  };
}
