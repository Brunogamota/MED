'use client';

import { useId } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';

/**
 * Sparkline da tabela de mercados (21st.dev 9045), reescrita para a paleta
 * roxa: linha em degradê, área esmaecida e um ponto no último valor.
 */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  className,
  label,
}: {
  data: readonly number[];
  width?: number;
  height?: number;
  className?: string;
  /** Descrição para leitor de tela. */
  label: string;
}) {
  const gid = useId().replace(/:/g, '');
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 3;

  const pts = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = pad + (1 - (value - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `0,${height} ${line} ${width},${height}`;
  const [lx, ly] = pts[pts.length - 1] ?? [width, height];

  return (
    <svg
      role="img"
      aria-label={label}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
    >
      <defs>
        <linearGradient id={`s-line-${gid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--o5-violet)" />
          <stop offset="100%" stopColor="var(--o5-lilac)" />
        </linearGradient>
        <linearGradient id={`s-fill-${gid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--o5-brand)" stopOpacity={0.35} />
          <stop offset="100%" stopColor="var(--o5-brand)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.polygon
        points={area}
        fill={`url(#s-fill-${gid})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      />
      <motion.polyline
        points={line}
        fill="none"
        stroke={`url(#s-line-${gid})`}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
      />
      <circle cx={lx} cy={ly} r={5} fill="var(--o5-lilac)" opacity={0.2} />
      <circle cx={lx} cy={ly} r={2.25} fill="var(--o5-lilac)" />
    </svg>
  );
}
