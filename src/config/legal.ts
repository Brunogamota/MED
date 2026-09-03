/**
 * Quem responde pela plataforma, para a politica de privacidade.
 *
 * Fica no repositorio, e nao em variavel de ambiente, porque nada aqui e
 * segredo: sao exatamente os dados que a pagina publica imprime. Variavel de
 * ambiente serve para o que nao pode aparecer no codigo — nao e o caso — e
 * cobrava uma configuracao a mais para publicar o app OAuth.
 *
 * As variaveis continuam valendo como sobrescrita, para quem rodar este
 * codigo sob outra razao social sem tocar no fonte.
 */
export const LEGAL_CONFIG = {
  /** Razao social do responsavel pela operacao. */
  controllerName:
    process.env.PRIVACY_CONTROLLER_NAME?.trim() ||
    'Ironpay Tecnologia Serviços e Pagamentos LTDA',
  /**
   * Encarregado pelo tratamento de dados (LGPD, art. 41) — a pessoa a quem o
   * titular escreve.
   */
  contactName: process.env.PRIVACY_CONTACT_NAME?.trim() || 'Elizio',
  contactEmail: process.env.PRIVACY_CONTACT_EMAIL?.trim() || 'ironpaypj02@gmail.com',
  /**
   * CNPJ, quando informado. Nao inventamos um: a politica sai sem o numero
   * ate alguem colocar o verdadeiro aqui ou em `PRIVACY_CONTROLLER_DOCUMENT`.
   */
  controllerDocument: process.env.PRIVACY_CONTROLLER_DOCUMENT?.trim() || null,
} as const;
