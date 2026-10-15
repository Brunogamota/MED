/** Itens da barra lateral do ambiente Bulls Cash. */
export type NavId =
  | 'visao-geral'
  | 'contestacoes'
  | 'vencendo'
  | 'importar-meds'
  | 'importar-envios'
  | 'comprovantes'
  | 'conexoes'
  | 'equipe';

/** Qual item acende, pela rota e pela visão da fila. */
export function activeNavFor(pathname: string, view: string | null): NavId | null {
  if (pathname === '/') return 'visao-geral';
  if (pathname.startsWith('/meds/import')) return 'importar-meds';
  if (pathname.startsWith('/meds/entregas')) return 'importar-envios';
  if (pathname.startsWith('/meds/comprovantes') || /^\/meds\/[^/]+\/comprovante/.test(pathname)) {
    return 'comprovantes';
  }
  if (pathname === '/meds' && view === 'vencendo') return 'vencendo';
  if (pathname.startsWith('/meds')) return 'contestacoes';
  if (pathname.startsWith('/integracoes')) return 'conexoes';
  if (pathname.startsWith('/equipe')) return 'equipe';
  return null;
}
