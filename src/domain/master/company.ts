/**
 * De qual empresa é cada MED, numa planilha que mistura várias (conta Master).
 *
 * Quatro pistas, nesta ordem de confiança:
 *
 * 1. **Documento** — CNPJ ou chave Pix de quem recebeu. É único por empresa.
 * 2. **Nome** — a coluna da empresa/loja/recebedor, comparada sem acento,
 *    caixa, pontuação nem sufixo societário ("Ltda", "S.A.").
 * 3. **Prefixo do pedido** — "BLS-123" é da conta que tem o prefixo "BLS-".
 * 4. **Nome do arquivo** — quem sobe um arquivo por empresa ("Bulls.xlsx").
 *
 * O que não casa com nenhuma conta e tem nome de empresa vira empresa nova,
 * criada com o nome que veio. Sem nome, a linha fica sem dono e é reportada —
 * nunca encaixada na conta "mais parecida".
 *
 * Puro: sem I/O. Os apelidos ficam na conta como "nome:…", "doc:…" e
 * "prefixo:…"; apelido sem tipo vale como nome.
 */

export interface CompanyAccount {
  id: string;
  name: string;
  aliases: string[];
}

export interface CompanyHints {
  merchantName: string | null;
  merchantDocument: string | null;
  orderReference: string | null;
  fileName: string | null;
}

export type CompanyVia = 'DOCUMENTO' | 'NOME' | 'PREFIXO' | 'ARQUIVO';

export type CompanyMatch =
  | { kind: 'ACCOUNT'; accountId: string; via: CompanyVia }
  | { kind: 'NEW'; key: string; name: string }
  | { kind: 'UNKNOWN' };

export const VIA_LABEL: Record<CompanyVia, string> = {
  DOCUMENTO: 'CNPJ ou chave Pix',
  NOME: 'nome da empresa',
  PREFIXO: 'prefixo do pedido',
  ARQUIVO: 'nome do arquivo',
};

const SUFIXOS = new Set(['ltda', 'sa', 's', 'a', 'me', 'mei', 'epp', 'eireli', 'cia', 'inc', 'llc']);

/** "Bulls Cash LTDA." → "bulls cash". */
export function companyKey(raw: string | null | undefined): string {
  const words = (raw ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  while (words.length > 1 && SUFIXOS.has(words[words.length - 1] ?? '')) words.pop();
  return words.join(' ');
}

/**
 * CNPJ/CPF só com dígitos; chave Pix (e-mail, telefone, aleatória) em
 * minúsculas e sem espaço. Vazio vira `null`.
 */
export function documentKey(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim();
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  // CNPJ/CPF formatado ("12.345.678/0001-90") ou telefone: os dígitos decidem.
  if (/^[\d.\-/ ()+]+$/.test(value) && digits.length >= 8) return digits;
  return value.toLowerCase().replace(/\s+/g, '');
}

/** "BLS-1029" → "BLS-"; sem prefixo de letras, `null`. */
export function orderPrefix(reference: string | null | undefined): string | null {
  const match = /^([A-Za-z]{2,8})[-_/]/.exec((reference ?? '').trim());
  return match ? `${match[1]!.toUpperCase()}-` : null;
}

interface ParsedAliases {
  names: string[];
  docs: string[];
  prefixes: string[];
}

export function parseAliases(aliases: string[]): ParsedAliases {
  const out: ParsedAliases = { names: [], docs: [], prefixes: [] };
  for (const raw of aliases) {
    const [kind, ...rest] = raw.split(':');
    const value = rest.join(':').trim();
    if (rest.length > 0 && kind?.trim().toLowerCase() === 'doc') {
      const key = documentKey(value);
      if (key) out.docs.push(key);
    } else if (rest.length > 0 && kind?.trim().toLowerCase() === 'prefixo') {
      const prefix = value.toUpperCase().replace(/[-_/]?$/, '-');
      if (prefix.length > 1) out.prefixes.push(prefix);
    } else {
      const key = companyKey(rest.length > 0 && kind?.trim().toLowerCase() === 'nome' ? value : raw);
      if (key) out.names.push(key);
    }
  }
  return out;
}

interface Index {
  account: CompanyAccount;
  names: string[];
  docs: string[];
  prefixes: string[];
}

export function buildCompanyIndex(accounts: CompanyAccount[]): Index[] {
  return accounts.map((account) => {
    const parsed = parseAliases(account.aliases);
    return {
      account,
      names: [companyKey(account.name), ...parsed.names].filter(Boolean),
      docs: parsed.docs,
      prefixes: parsed.prefixes,
    };
  });
}

export function identifyCompany(hints: CompanyHints, index: Index[]): CompanyMatch {
  const doc = documentKey(hints.merchantDocument);
  if (doc) {
    const hit = index.find((entry) => entry.docs.includes(doc));
    if (hit) return { kind: 'ACCOUNT', accountId: hit.account.id, via: 'DOCUMENTO' };
  }

  const name = companyKey(hints.merchantName);
  if (name) {
    const hit = index.find((entry) => entry.names.includes(name));
    if (hit) return { kind: 'ACCOUNT', accountId: hit.account.id, via: 'NOME' };
  }

  const reference = (hints.orderReference ?? '').trim().toUpperCase();
  if (reference) {
    let best: { entry: Index; length: number } | null = null;
    for (const entry of index) {
      for (const prefix of entry.prefixes) {
        if (reference.startsWith(prefix) && (!best || prefix.length > best.length)) {
          best = { entry, length: prefix.length };
        }
      }
    }
    if (best) return { kind: 'ACCOUNT', accountId: best.entry.account.id, via: 'PREFIXO' };
  }

  const file = companyKey((hints.fileName ?? '').replace(/\.[a-z0-9]{2,4}$/i, ''));
  if (file) {
    let best: { entry: Index; length: number } | null = null;
    const padded = ` ${file} `;
    for (const entry of index) {
      for (const candidate of entry.names) {
        // Palavra inteira: "jade" não casa com "jadeite".
        if (candidate.length >= 3 && padded.includes(` ${candidate} `) && (!best || candidate.length > best.length)) {
          best = { entry, length: candidate.length };
        }
      }
    }
    if (best) return { kind: 'ACCOUNT', accountId: best.entry.account.id, via: 'ARQUIVO' };
  }

  if (name && hints.merchantName) return { kind: 'NEW', key: name, name: hints.merchantName.trim() };
  return { kind: 'UNKNOWN' };
}

/**
 * O que dá para aprender de um lote já atribuído, para o próximo arquivo
 * (que talvez só traga o CNPJ, ou só o pedido) cair na conta certa.
 *
 * - Documento: quando todas as linhas com aquele CNPJ/chave foram para a mesma
 *   empresa e ele não é de outra conta.
 * - Prefixo: quando ao menos três linhas da empresa usam o mesmo prefixo,
 *   nenhuma outra empresa do lote usa e nenhuma conta já o tem.
 *
 * Devolve por empresa (id da conta ou chave da empresa nova) os apelidos novos.
 */
export function learnAliases(
  rows: { company: string; hints: CompanyHints }[],
  index: Index[],
): Map<string, string[]> {
  const docOwners = new Map<string, Set<string>>();
  const prefixRows = new Map<string, Map<string, number>>();
  for (const { company, hints } of rows) {
    const doc = documentKey(hints.merchantDocument);
    if (doc) docOwners.set(doc, (docOwners.get(doc) ?? new Set()).add(company));
    const prefix = orderPrefix(hints.orderReference);
    if (prefix) {
      const byCompany = prefixRows.get(prefix) ?? new Map<string, number>();
      byCompany.set(company, (byCompany.get(company) ?? 0) + 1);
      prefixRows.set(prefix, byCompany);
    }
  }

  const knownDocs = new Set(index.flatMap((entry) => entry.docs));
  const knownPrefixes = new Set(index.flatMap((entry) => entry.prefixes));
  const learned = new Map<string, string[]>();
  const add = (company: string, alias: string) => learned.set(company, [...(learned.get(company) ?? []), alias]);

  for (const [doc, owners] of docOwners) {
    if (owners.size !== 1 || knownDocs.has(doc)) continue;
    add([...owners][0]!, `doc:${doc}`);
  }
  for (const [prefix, byCompany] of prefixRows) {
    if (byCompany.size !== 1 || knownPrefixes.has(prefix)) continue;
    const [only] = [...byCompany];
    if (only && only[1] >= 3) add(only[0], `prefixo:${prefix}`);
  }
  return learned;
}

/**
 * Cores do modelo automático: distintas entre si e longe das marcas que já
 * têm ambiente desenhado (o verde do Jade, o roxo da Bulls, o azul do
 * Marketplace). Todas passam de 4,5:1 com texto branco.
 */
export const AUTO_BRAND_COLORS = [
  '#C2410C', // terracota
  '#BE123C', // rosa-escuro
  '#0F766E', // petróleo
  '#B45309', // âmbar
  '#334155', // grafite
  '#9D174D', // magenta
  '#0E7490', // ciano
  '#7C2D12', // marrom
  '#4D7C0F', // oliva
  '#A21CAF', // fúcsia
  '#1E3A8A', // marinho
  '#854D0E', // mostarda
] as const;

/** A primeira cor que nenhuma conta usa; acabadas, recomeça pela menos usada. */
export function pickBrandColor(used: (string | null)[]): string {
  const counts = new Map<string, number>(AUTO_BRAND_COLORS.map((color) => [color, 0]));
  for (const color of used) {
    const key = (color ?? '').toUpperCase();
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: string = AUTO_BRAND_COLORS[0];
  for (const color of AUTO_BRAND_COLORS) {
    if ((counts.get(color) ?? 0) < (counts.get(best) ?? 0)) best = color;
  }
  return best;
}
