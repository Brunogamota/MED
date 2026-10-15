/**
 * Ambientes visuais das contas.
 *
 * Cada conta escolhe um. Ambiente não é tema: muda o cromo inteiro (estrutura
 * da navegação, tipografia, cores, raio, densidade) e a peça do comprovante.
 * Um ambiente novo é código novo — por isso o catálogo é fechado, e a tela de
 * contas só oferece o que existe aqui.
 */
export const SKINS = {
  jade: {
    label: 'Jade',
    description: 'Trilho lateral em dois níveis, neutros, Inter.',
  },
  bulls: {
    label: 'Bulls Cash',
    description: 'Barra de comando no topo, roxo profundo, Sora e Manrope.',
  },
} as const;

export type SkinId = keyof typeof SKINS;

export const DEFAULT_SKIN: SkinId = 'jade';

export function resolveSkin(value: string | null | undefined): SkinId {
  return value && value in SKINS ? (value as SkinId) : DEFAULT_SKIN;
}
