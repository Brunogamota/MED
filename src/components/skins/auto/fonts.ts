import { Archivo_Narrow, Arimo, Bricolage_Grotesque, IBM_Plex_Mono, Manrope, Newsreader } from 'next/font/google';

/**
 * Uma família por desenho do modelo automático — é a tipografia, antes da
 * cor, que faz cada comprovante parecer peça de uma empresa diferente.
 *
 * `preload: false`: o arquivo só é baixado quando um comprovante daquele
 * desenho aparece na tela. O resto do console não paga por elas.
 */
export const serif = Newsreader({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', preload: false });
export const thermal = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', preload: false });
export const webmail = Arimo({ subsets: ['latin'], display: 'swap', preload: false });
export const narrow = Archivo_Narrow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', preload: false });
export const app = Manrope({ subsets: ['latin'], display: 'swap', preload: false });
export const display = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap', preload: false });
