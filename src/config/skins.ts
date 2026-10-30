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
    description: 'Barra lateral recolhível, bento claro em lavanda e roxo, Plus Jakarta Sans.',
  },
  marketplace: {
    label: 'Marketplace Verificado',
    description: 'Navegação no topo, branco e azul de confiança, Inter.',
  },
} as const;

/** Ambientes que são só claros: o tema do sistema não escurece a paleta. */
export const LIGHT_ONLY_SKINS: readonly SkinId[] = ['bulls', 'marketplace'];

export type SkinId = keyof typeof SKINS;

export const DEFAULT_SKIN: SkinId = 'jade';

export function resolveSkin(value: string | null | undefined): SkinId {
  return value && value in SKINS ? (value as SkinId) : DEFAULT_SKIN;
}
