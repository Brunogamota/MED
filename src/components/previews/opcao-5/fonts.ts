import { JetBrains_Mono, Manrope, Sora } from 'next/font/google';

const sora = Sora({ subsets: ['latin'], variable: '--o5-sora', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--o5-manrope', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--o5-mono', display: 'swap' });

/** Classes que definem as variáveis de fonte. Vão no wrapper e em todo portal. */
export const O5_FONT_VARS = `${sora.variable} ${manrope.variable} ${mono.variable}`;
