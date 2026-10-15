import { describe, expect, it } from 'vitest';
import { activeNavFor } from '@/components/skins/bulls/nav';

describe('activeNavFor', () => {
  it('acende o item pela rota', () => {
    expect(activeNavFor('/', null)).toBe('visao-geral');
    expect(activeNavFor('/meds', null)).toBe('contestacoes');
    expect(activeNavFor('/meds/med_1', null)).toBe('contestacoes');
    expect(activeNavFor('/meds/import', null)).toBe('importar-meds');
    expect(activeNavFor('/meds/entregas', null)).toBe('importar-envios');
    expect(activeNavFor('/meds/comprovantes', null)).toBe('comprovantes');
    expect(activeNavFor('/meds/med_1/comprovante/ev_1', null)).toBe('comprovantes');
    expect(activeNavFor('/integracoes/gmail', null)).toBe('conexoes');
    expect(activeNavFor('/equipe', null)).toBe('equipe');
    expect(activeNavFor('/contas', null)).toBeNull();
  });

  it('a visão "vencendo" da fila acende Vencendo, as outras ficam em Contestações', () => {
    expect(activeNavFor('/meds', 'vencendo')).toBe('vencendo');
    expect(activeNavFor('/meds', 'prontos')).toBe('contestacoes');
  });
});
