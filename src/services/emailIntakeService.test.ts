import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __setRepositoryForTests, getRepository } from '@/infra/container';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import { ForbiddenError } from '@/infra/auth/rbac';
import type { AuthContext } from '@/infra/auth/context';
import { createMedFromMessage, previewNotice } from '@/services/emailIntakeService';

const RAW = readFileSync(join(__dirname, '../domain/email/fixtures/aviso-med.eml'), 'utf8');
const auth: AuthContext = { organizationId: 'org_a', role: 'OWNER', actor: 'teste' };

/** A leitura da caixa e I/O; o que testamos aqui e a decisao sobre o texto. */
vi.mock('@/services/gmailService', () => ({
  readRawMessage: vi.fn(),
}));
const { readRawMessage } = await import('@/services/gmailService');
const mockedRead = vi.mocked(readRawMessage);

function replyWith(raw: string) {
  mockedRead.mockResolvedValue({ ok: true, raw });
}

beforeEach(() => {
  __setRepositoryForTests(new InMemoryMedRepository());
  mockedRead.mockReset();
});

afterEach(() => {
  __setRepositoryForTests(null);
});

describe('previewNotice', () => {
  it('nao grava nada, so conta o que leu', async () => {
    replyWith(RAW);
    const result = await previewNotice(auth, 'msg-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.reading.draft.medId).toBe('MED-2026-000481');
    expect(result.preview.blocking).toEqual([]);
    expect(result.preview.existingMedId).toBeNull();
    expect(await (await getRepository()).listMeds('org_a', {})).toHaveLength(0);
  });

  it('devolve o motivo quando a caixa nao responde', async () => {
    mockedRead.mockResolvedValue({ ok: false, reason: 'Caixa não autorizada.', status: 409 });
    const result = await previewNotice(auth, 'msg-1');
    expect(result).toEqual({ ok: false, reason: 'Caixa não autorizada.' });
  });
});

describe('createMedFromMessage', () => {
  it('cria o caso com o que o aviso trouxe', async () => {
    replyWith(RAW);
    const result = await createMedFromMessage(auth, 'msg-1');
    expect(result).toMatchObject({ ok: true, created: true });
    if (!result.ok) return;

    const med = await (await getRepository()).getMed('org_a', result.medId);
    expect(med?.medId).toBe('MED-2026-000481');
    expect(med?.amount).toBe(34990);
    expect(med?.reason).toBe('PRODUCT_NOT_RECEIVED');
    expect(med?.payer.document).toBe('11111111111');
  });

  it('a mesma mensagem duas vezes nao vira dois casos', async () => {
    replyWith(RAW);
    const first = await createMedFromMessage(auth, 'msg-1');
    const second = await createMedFromMessage(auth, 'msg-1');
    expect(first).toMatchObject({ ok: true, created: true });
    expect(second).toMatchObject({ ok: true, created: false });
    if (first.ok && second.ok) expect(second.medId).toBe(first.medId);
    expect(await (await getRepository()).listMeds('org_a', {})).toHaveLength(1);
  });

  it('registra de qual mensagem o caso saiu, e o que foi assumido', async () => {
    replyWith(RAW);
    const result = await createMedFromMessage(auth, 'msg-abc');
    if (!result.ok) throw new Error('esperava sucesso');

    const audit = await (await getRepository()).listAudit('org_a', result.medId);
    const entry = audit.find((row) => row.action === 'MED_INTAKE_FROM_EMAIL');
    expect(entry?.source).toBe('EMAIL');
    expect(entry?.newValue).toMatchObject({ gmailMessageId: 'msg-abc', created: true });
    // O fuso foi assumido, e quem conferir o prazo depois precisa saber.
    expect((entry?.newValue as { assumedTimezone: string[] }).assumedTimezone).toContain(
      'responseDeadlineAt',
    );
  });

  it('recusa criar quando falta campo obrigatorio, em vez de completar', async () => {
    replyWith(
      [
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        'ID do MED: MED-SEM-VALOR',
        'Data de abertura: 03/09/2026 14:32',
        'Motivo: Produto não recebido',
      ].join('\n'),
    );
    const result = await createMedFromMessage(auth, 'msg-2');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.blocking).toEqual(['amountCents']);
    expect(await (await getRepository()).listMeds('org_a', {})).toHaveLength(0);
  });

  it('recusa mensagem que nao e aviso de MED', async () => {
    replyWith(['Content-Type: text/plain; charset="UTF-8"', '', 'Oi, segue o boleto.'].join('\n'));
    const result = await createMedFromMessage(auth, 'msg-3');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/não tem a forma de um aviso/);
  });

  it('quem nao pode escrever MED nao cria caso por e-mail', async () => {
    replyWith(RAW);
    const viewer: AuthContext = { organizationId: 'org_a', role: 'VIEWER', actor: 'teste' };
    await expect(createMedFromMessage(viewer, 'msg-1')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('caso de uma organizacao nao bloqueia a criacao em outra', async () => {
    replyWith(RAW);
    await createMedFromMessage(auth, 'msg-1');
    const other: AuthContext = { organizationId: 'org_b', role: 'OWNER', actor: 'teste' };
    const result = await createMedFromMessage(other, 'msg-1');
    expect(result).toMatchObject({ ok: true, created: true });
  });
});
