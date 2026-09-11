import { describe, expect, it } from 'vitest';
import { generateDefense } from '@/domain/defense/engine';
import { buildEvidencePack } from '@/domain/pack/builder';
import { resolveEndToEndId } from '@/domain/identifiers';
import { buildPaymentReceiptView } from '@/domain/receipt/payment';
import { genericJsonAdapter } from '@/infra/adapters/submission';
import { makeCompleteCase } from '@/test/fixtures';

const E2E = 'E00000000202608281047ABCDEF12345';

function onlyOnTransaction() {
  const base = makeCompleteCase();
  return {
    ...base,
    med: { ...base.med, endToEndId: null },
    transaction: base.transaction ? { ...base.transaction, endToEndId: E2E } : null,
  };
}

describe('resolveEndToEndId', () => {
  it('usa o do MED quando existe', () => {
    expect(
      resolveEndToEndId({ med: { endToEndId: 'DO-MED' }, transaction: { endToEndId: 'DA-TX' } }),
    ).toBe('DO-MED');
  });

  it('cai para o da transacao quando o MED nao trouxe', () => {
    expect(resolveEndToEndId({ med: { endToEndId: null }, transaction: { endToEndId: E2E } })).toBe(
      E2E,
    );
  });

  it('sem os dois, nao inventa: devolve null', () => {
    expect(resolveEndToEndId({ med: { endToEndId: null }, transaction: null })).toBeNull();
  });
});

describe('E2E digitado no formulario da transacao', () => {
  it('chega ao payload que vai para a instituicao', () => {
    // Sem isto a defesa chegava com endToEndId: null, e o banco ficava sem o
    // unico numero que acha a transacao no SPI.
    const medCase = onlyOnTransaction();
    const { defense } = generateDefense({ medCase, version: 1, defenseId: 'def_1' });
    const pack = buildEvidencePack(medCase, defense);
    const payload = genericJsonAdapter.buildPayload(pack) as { med: { endToEndId: unknown } };
    expect(payload.med.endToEndId).toBe(E2E);
  });

  it('aparece no comprovante', () => {
    const view = buildPaymentReceiptView(onlyOnTransaction());
    expect(view.rows.find((row) => row.label === 'End-to-end')?.value).toBe(E2E);
  });

  it('o texto da defesa cita o identificador', () => {
    const medCase = onlyOnTransaction();
    const { defense } = generateDefense({ medCase, version: 1, defenseId: 'def_1' });
    expect(defense.narrative.body).toContain(E2E);
  });
});
