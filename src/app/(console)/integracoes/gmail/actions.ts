'use server';

import { redirect } from 'next/navigation';
import { serverPageContext } from '@/infra/auth/context';
import { createMedFromMessage } from '@/services/emailIntakeService';

/**
 * Cria o MED a partir de uma mensagem da caixa.
 *
 * Sucesso leva direto ao caso — e la que o trabalho continua. Falha volta para
 * a lista com o motivo no endereco, porque o motivo importa: "faltou o valor" e
 * "nao e um aviso de MED" pedem coisas diferentes de quem esta lendo.
 */
export async function createMedFromMessageAction(formData: FormData): Promise<void> {
  const messageId = String(formData.get('messageId') ?? '').trim();
  if (!messageId) redirect('/integracoes/gmail?erro=Mensagem+não+informada');

  const result = await createMedFromMessage(serverPageContext(), messageId);
  if (!result.ok) {
    const detail = result.blocking?.length ? ` Faltou: ${result.blocking.join(', ')}.` : '';
    redirect(`/integracoes/gmail?erro=${encodeURIComponent(result.reason + detail)}`);
  }
  redirect(`/meds/${result.medId}${result.created ? '' : '?aviso=ja-existia'}`);
}
