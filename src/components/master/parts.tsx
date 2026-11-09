'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';
import type { SkinId } from '@/config/skins';
import { cn } from '@/lib/cn';

/**
 * Peças da Central Master: a marca de cada empresa e o número que rola.
 *
 * A cor da empresa é dado (vem da conta), não decoração da tela: os
 * ambientes desenhados têm a cor da marca deles, e o modelo automático a cor
 * que a conta ganhou ao ser criada.
 */

const DESIGNED: Partial<Record<SkinId, string>> = {
  bulls: '#9333ea',
  marketplace: '#1d4ed8',
  jade: '#0f172a',
};

export function companyColor(skin: SkinId, brandColor: string | null): string {
  if (skin === 'auto' && brandColor && /^#[0-9a-f]{6}$/i.test(brandColor)) return brandColor;
  return DESIGNED[skin] ?? '#334155';
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  if (words.length === 1) return (words[0] ?? '').slice(0, 2).toUpperCase();
  return `${words[0]?.[0] ?? ''}${words[words.length - 1]?.[0] ?? ''}`.toUpperCase();
}

export function CompanyAvatar({
  name,
  color,
  size = 'md',
  className,
}: {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ '--empresa': color } as CSSProperties}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center bg-(--empresa) font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_6px_16px_-8px_var(--empresa)]',
        size === 'sm' && 'size-7 rounded-lg text-[11px]',
        size === 'md' && 'size-10 rounded-xl text-[13px]',
        size === 'lg' && 'size-12 rounded-2xl text-[15px]',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Número que rola até o valor quando entra na tela. Escreve direto no nó, sem
 * render por quadro; sem animação (ou antes dela) o valor já está lá.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const from = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!inView || reduced || !node) return;
    const controls = animate(from.current, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        node.textContent = Math.round(latest).toLocaleString('pt-BR');
      },
    });
    from.current = value;
    return () => controls.stop();
  }, [inView, value, reduced]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {value.toLocaleString('pt-BR')}
    </span>
  );
}
