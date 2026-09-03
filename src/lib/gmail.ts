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

export function gmailRedirectUri(appUrl: string): string {
  return `${appUrl.replace(/\/$/, '')}/api/integrations/gmail/callback`;
}
