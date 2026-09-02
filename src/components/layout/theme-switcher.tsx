'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';

const CYCLE = ['light', 'dark', 'system'] as const;
type ThemeMode = (typeof CYCLE)[number];

const LABEL: Record<ThemeMode, string> = {
  light: 'claro',
  dark: 'escuro',
  system: 'do sistema',
};

const noop = () => () => {};

/**
 * Alterna claro / escuro / sistema em ciclo.
 *
 * O tema real só existe no cliente, então antes da hidratação o botão mostra
 * o ícone do sistema: `useSyncExternalStore` dá esse "já hidratou?" sem
 * efeito com `setState`, que renderiza duas vezes no primeiro paint.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  const current: ThemeMode =
    hydrated && (CYCLE as readonly string[]).includes(theme ?? '') ? (theme as ThemeMode) : 'system';
  const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length] ?? 'system';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={`Tema ${LABEL[current]}. Clique para usar o tema ${LABEL[next]}.`}
      title={`Tema: ${LABEL[current]}`}
    >
      {current === 'system' ? <Monitor /> : current === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}
