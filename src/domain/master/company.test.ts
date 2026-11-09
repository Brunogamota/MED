import { describe, expect, it } from 'vitest';
import {
  AUTO_BRAND_COLORS,
  buildCompanyIndex,
  companyKey,
  documentKey,
  identifyCompany,
  learnAliases,
  orderPrefix,
  pickBrandColor,
  pickBrandLayout,
  resolveBrandLayout,
  AUTO_LAYOUTS,
  type CompanyHints,
} from '@/domain/master/company';

const accounts = [
  { id: 'org_jade', name: 'Jade', aliases: [] },
  { id: 'org_bulls', name: 'Bulls Cash', aliases: ['doc:12.345.678/0001-90', 'prefixo:BLS'] },
  { id: 'org_mkv', name: 'Marketplace Verificado', aliases: ['nome:MKV Comércio', 'doc:pix@mkv.com.br'] },
];
const index = buildCompanyIndex(accounts);

function hints(overrides: Partial<CompanyHints>): CompanyHints {
  return { merchantName: null, merchantDocument: null, orderReference: null, fileName: null, ...overrides };
}

describe('identifyCompany', () => {
  it('reconhece pelo CNPJ, formatado ou não', () => {
    expect(identifyCompany(hints({ merchantDocument: '12345678000190' }), index)).toEqual({
      kind: 'ACCOUNT',
      accountId: 'org_bulls',
      via: 'DOCUMENTO',
    });
  });

  it('reconhece pela chave Pix', () => {
    expect(identifyCompany(hints({ merchantDocument: ' PIX@mkv.com.br ' }), index)).toMatchObject({
      accountId: 'org_mkv',
      via: 'DOCUMENTO',
    });
  });

  it('reconhece pelo nome, sem acento, caixa nem sufixo societário', () => {
    expect(identifyCompany(hints({ merchantName: 'BULLS CASH LTDA.' }), index)).toMatchObject({
      accountId: 'org_bulls',
      via: 'NOME',
    });
    expect(identifyCompany(hints({ merchantName: 'mkv comercio s.a.' }), index)).toMatchObject({
      accountId: 'org_mkv',
      via: 'NOME',
    });
  });

  it('reconhece pelo prefixo do pedido', () => {
    expect(identifyCompany(hints({ orderReference: 'bls-1029' }), index)).toMatchObject({
      accountId: 'org_bulls',
      via: 'PREFIXO',
    });
  });

  it('reconhece pelo nome do arquivo, palavra inteira', () => {
    expect(identifyCompany(hints({ fileName: 'MEDs Bulls Cash - outubro.xlsx' }), index)).toMatchObject({
      accountId: 'org_bulls',
      via: 'ARQUIVO',
    });
    expect(identifyCompany(hints({ fileName: 'jadeite.csv' }), index)).toEqual({ kind: 'UNKNOWN' });
  });

  it('o documento vence o nome', () => {
    expect(
      identifyCompany(hints({ merchantName: 'Marketplace Verificado', merchantDocument: '12345678000190' }), index),
    ).toMatchObject({ accountId: 'org_bulls' });
  });

  it('nome que não é de nenhuma conta vira empresa nova', () => {
    expect(identifyCompany(hints({ merchantName: 'Loja Nova Ltda' }), index)).toEqual({
      kind: 'NEW',
      key: 'loja nova',
      name: 'Loja Nova Ltda',
    });
  });

  it('sem pista nenhuma, a linha fica sem dono — nunca na conta "mais parecida"', () => {
    expect(identifyCompany(hints({ merchantDocument: '99999999000199' }), index)).toEqual({ kind: 'UNKNOWN' });
  });
});

describe('aprender apelidos', () => {
  it('guarda o CNPJ e o prefixo de quem foi reconhecido pelo nome', () => {
    const rows = [1, 2, 3].map((n) => ({
      company: 'nova',
      hints: hints({ merchantName: 'Loja Nova', merchantDocument: '11.111.111/0001-11', orderReference: `LNV-${n}` }),
    }));
    expect(learnAliases(rows, index).get('nova')).toEqual(['doc:11111111000111', 'prefixo:LNV-']);
  });

  it('não aprende documento dividido entre empresas nem prefixo com poucas linhas', () => {
    const rows = [
      { company: 'a', hints: hints({ merchantDocument: '22222222000122', orderReference: 'XY-1' }) },
      { company: 'b', hints: hints({ merchantDocument: '22222222000122' }) },
    ];
    expect(learnAliases(rows, index).size).toBe(0);
  });
});

describe('normalização', () => {
  it('chaves', () => {
    expect(companyKey('Bulls Cash S/A')).toBe('bulls cash');
    expect(documentKey('(11) 98888-7777')).toBe('11988887777');
    expect(documentKey('')).toBeNull();
    expect(orderPrefix('PED_44')).toBe('PED-');
    expect(orderPrefix('12345')).toBeNull();
  });

  it('cor da marca: a primeira livre, depois a menos usada', () => {
    expect(pickBrandColor([])).toBe(AUTO_BRAND_COLORS[0]);
    expect(pickBrandColor([AUTO_BRAND_COLORS[0], null])).toBe(AUTO_BRAND_COLORS[1]);
    expect(pickBrandColor([...AUTO_BRAND_COLORS])).toBe(AUTO_BRAND_COLORS[0]);
  });
});

describe('desenho do comprovante', () => {
  it('cada empresa nova ganha um desenho que as outras não usam', () => {
    const used: string[] = [];
    for (let i = 0; i < AUTO_LAYOUTS.length; i += 1) used.push(pickBrandLayout(used));
    expect(new Set(used).size).toBe(AUTO_LAYOUTS.length);
    expect(pickBrandLayout(used)).toBe(AUTO_LAYOUTS[0]);
  });

  it('conta antiga sem desenho gravado fica sempre com o mesmo', () => {
    expect(resolveBrandLayout(null, 'org_x')).toBe(resolveBrandLayout(null, 'org_x'));
    expect(resolveBrandLayout('carta', 'org_x')).toBe('carta');
  });
});
