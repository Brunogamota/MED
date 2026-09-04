'use server';

import { revalidatePath } from 'next/cache';
import { serverPageContext } from '@/infra/auth/context';
import { deleteConnectorCredential } from '@/services/credentialService';

/**
 * Desliga o Gmail desta organizacao.
 *
 * Apaga a credencial guardada aqui. A autorizacao do lado do Google continua
 * de pe ate ser revogada la — dizemos isso na tela, para ninguem achar que
 * este botao cortou o acesso na origem.
 */
export async function disconnectGmailAction(): Promise<void> {
  await deleteConnectorCredential(serverPageContext(), 'GMAIL');
  revalidatePath('/integracoes');
}
