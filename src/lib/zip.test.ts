import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { looksZipped, readZipEntries, ZipError } from '@/lib/zip';

/**
 * Os zips do teste sao feitos pelo `zip` do sistema, e nao por um fixture
 * gravado: o que se quer verificar e que o leitor entende o que uma ferramenta
 * de verdade produz, e um fixture so provaria que ele entende a si mesmo.
 */
const pasta = mkdtempSync(join(tmpdir(), 'zip-test-'));
afterAll(() => rmSync(pasta, { recursive: true, force: true }));

function zipar(arquivos: Record<string, string>, opcoes: string[] = []): Uint8Array {
  const nome = `z${Math.random().toString(36).slice(2)}.zip`;
  for (const [arquivo, conteudo] of Object.entries(arquivos)) {
    writeFileSync(join(pasta, arquivo), conteudo, 'utf8');
  }
  execFileSync('zip', ['-q', ...opcoes, nome, ...Object.keys(arquivos)], { cwd: pasta });
  return readFileSync(join(pasta, nome));
}

describe('leitura de zip', () => {
  it('le os arquivos de dentro, na ordem', () => {
    const zip = zipar({ 'a.csv': 'nome,valor\nfulano,10', 'b.csv': 'x\n1' });
    const entries = readZipEntries(zip, 1024 * 1024);
    expect(entries.map((entry) => entry.name)).toEqual(['a.csv', 'b.csv']);
    expect(entries[0]?.bytes.toString('utf8')).toBe('nome,valor\nfulano,10');
  });

  it('le tambem o que foi guardado sem compressao', () => {
    // `-0` guarda sem deflate: e o que algumas ferramentas fazem com arquivo
    // pequeno, porque comprimir sairia maior.
    const zip = zipar({ 'curto.csv': 'a' }, ['-0']);
    expect(readZipEntries(zip, 1024)[0]?.bytes.toString('utf8')).toBe('a');
  });

  it('acentos no conteudo sobrevivem', () => {
    const zip = zipar({ 'acento.csv': 'José Felipe,Conceição' });
    expect(readZipEntries(zip, 1024)[0]?.bytes.toString('utf8')).toBe('José Felipe,Conceição');
  });

  it('recusa quando o conteudo descompactado passa do limite', () => {
    // Um zip pequeno pode carregar muito: o limite do upload nao cobre isso.
    const zip = zipar({ 'grande.csv': 'a'.repeat(50_000) });
    expect(() => readZipEntries(zip, 1_000)).toThrow(ZipError);
  });

  it('recusa arquivo com senha, em vez de devolver lixo', () => {
    const zip = zipar({ 'secreto.csv': 'a,b' }, ['-P', 'senha']);
    expect(() => readZipEntries(zip, 1024)).toThrow(/senha/);
  });

  it('recusa o que nao e zip', () => {
    expect(() => readZipEntries(Buffer.from('nome,valor\n1,2'), 1024)).toThrow(ZipError);
  });

  it('reconhece a assinatura', () => {
    expect(looksZipped(zipar({ 'c.csv': 'a' }))).toBe(true);
    expect(looksZipped(Buffer.from('nome,valor'))).toBe(false);
  });
});
