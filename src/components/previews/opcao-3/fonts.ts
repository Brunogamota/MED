import { Inter_Tight } from 'next/font/google';

/**
 * Família da Opção 3. Inter Tight tem o desenho apertado de app de banco e
 * algarismos tabulares, o que segura o número grande do saldo em contestação.
 */
export const op3Sans = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-op3',
  display: 'swap',
});
