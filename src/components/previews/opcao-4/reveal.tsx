'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

/** Entrada curta, em escada. Quem pede menos movimento recebe só a opacidade (MotionConfig na raiz). */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}
