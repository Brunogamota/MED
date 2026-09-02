'use client';

import { MotionConfig } from 'motion/react';

/**
 * Preferencia de movimento do sistema, aplicada uma vez para toda a interface.
 *
 * `reducedMotion="user"` faz a propria biblioteca ler `prefers-reduced-motion` e
 * descartar transformacoes (deslocamento, escala, rotacao) de quem pediu menos
 * movimento, deixando so a variacao de opacidade.
 *
 * Isso e feito aqui, e nao dentro de cada componente, porque um componente que
 * decide sozinho o que renderizar a partir dessa preferencia produz marcacao
 * diferente no servidor (que nao conhece a preferencia) e no navegador — e a
 * hidratacao quebra silenciosamente para exatamente quem pediu acessibilidade.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
