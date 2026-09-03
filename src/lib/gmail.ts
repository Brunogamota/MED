/**
 * Constantes do fluxo de consentimento do Gmail, num lugar so.
 *
 * A URL de retorno tem de bater **exatamente** com a cadastrada no Google
 * Cloud, incluindo esquema e ausencia de barra final. Deriva-la aqui, do
 * `appUrl`, evita a divergencia entre a que o `connect` envia e a que o
 * `callback` usa para trocar o codigo — que o Google recusa com
 * `redirect_uri_mismatch`, sem dizer qual das duas estava errada.
 */
export const GMAIL_STATE_COOKIE = 'gmail_oauth_state';

/**
 * Quanto tempo o `state` vale, em segundos.
 *
 * Trinta minutos, e nao dez: autorizar raramente e uma ida e volta limpa. O
 * operador descobre no meio do caminho que a tela de consentimento esta como
 * Interna, ou que o app esta em Testes, sai para arrumar isso no Google Cloud
 * e so entao conclui. Com uma janela curta o cookie morre nessa escala, e a
 * volta falha com "state invalido" — que parece um ataque e e so demora.
 */
export const GMAIL_STATE_MAX_AGE_SECONDS = 30 * 60;

export function gmailRedirectUri(appUrl: string): string {
  return `${appUrl.replace(/\/$/, '')}/api/integrations/gmail/callback`;
}
