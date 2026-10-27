/**
 * Nome e e-mail de quem comprou, lidos de qualquer planilha.
 *
 * As planilhas trazem nome e e-mail em colunas que mudam de nome a cada
 * export — e às vezes trazem, na coluna "nome", o que não é nome de ninguém:
 * "Transação", "Usuário", "Simulação", o banco do pagador, a etapa do pedido.
 * Saudado assim, o comprovante sai "Olá, Transação". Aqui se decide o que é
 * nome de pessoa. O que não passa vira ausente — e ausente é "Olá", sem nome:
 * nunca um nome trocado.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function semAcento(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Palavras que, sozinhas ou abrindo o campo, não são nome de pessoa. */
const NAO_E_NOME = new Set([
  'transacao', 'transacoes', 'usuario', 'usuaria', 'simulacao', 'teste', 'test', 'testes',
  'cliente', 'comprador', 'compradora', 'pagador', 'pagadora', 'recebedor', 'destinatario',
  'nome', 'name', 'contato', 'conta', 'titular', 'desconhecido', 'anonimo',
  'anonima', 'exemplo', 'demo', 'mock', 'fake', 'null', 'undefined', 'none', 'nan',
  'pix', 'pedido', 'pagamento', 'pago', 'aprovado', 'pendente', 'cancelado', 'estornado',
  'fisico', 'digital', 'produto', 'servico', 'email', 'e-mail', 'n/a', 'na', 'nd', 'sem nome', 'nao informado',
]);

/** Marcas de empresa/instituição: nome de banco não é nome do comprador. */
const EMPRESA = /(\bltda\b|\bs\.\s?a\b|\bs\/a\b|\beireli\b|\bepp\b|\bbanco\b|\bbank\b|\bpagamentos?\b|\binstituicao\b|\bservicos\b|\bfinanceira\b|\bcooperativa\b|\bcredito\b|\binvestimentos\b|\bholding\b|\btecnologia\b|\bfintech\b|\bpicpay\b|\bmercado pago\b|\bcloud ?walk\b|\bcaixa economica\b|\bitau\b|\bbradesco\b|\bsantander\b|\bpagseguro\b|\bnubank\b|\bnu pagamentos\b)/;

/** Frase de etapa de pedido ("Pagamento confirmado", "Pedido recebido"…). */
const ETAPA = /^(pagamento|pedido|em preparacao|preparacao|encaminhad|enviad|entregue|postad|saiu para|em transito|transmitid|aguardando|despachad|coletad|devolvid|cancelad|separacao|faturad|recebid|criad|registrad)/;

/**
 * O valor como nome de pessoa, ou `null` quando não é um.
 *
 * Aceita "Maria", "Maria Silva", "JOSÉ DA SILVA", "d'Ávila". Recusa número,
 * e-mail, placeholder, banco/empresa e etapa de pedido.
 */
export function personName(raw: string | null | undefined): string | null {
  const value = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (value.length < 2 || value.length > 80) return null;
  if (EMAIL.test(value) || /\d/.test(value) || /[@#$%_=<>{}[\]|\\/]/.test(value)) return null;
  if (!/^[\p{L}][\p{L}' .-]*$/u.test(value)) return null;
  const norm = semAcento(value);
  if (EMPRESA.test(norm) || ETAPA.test(norm)) return null;
  const primeira = norm.split(/[\s.-]+/)[0] ?? '';
  if (NAO_E_NOME.has(norm) || NAO_E_NOME.has(primeira)) return null;
  return value;
}

/** E-mail válido, em minúsculas, ou `null`. */
export function personEmail(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim().toLowerCase();
  return EMAIL.test(value) ? value : null;
}

/** "MARIA DA SILVA" → "Maria": o primeiro nome como se escreve numa saudação. */
export function firstNameForGreeting(name: string | null | undefined): string | null {
  const valid = personName(name);
  if (!valid) return null;
  const first = valid.split(' ')[0] ?? '';
  if (!first) return null;
  return first
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|[-'])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toLocaleUpperCase('pt-BR'));
}
