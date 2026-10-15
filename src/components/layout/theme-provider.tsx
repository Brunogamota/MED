'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * `forcedTheme` prende o tema num valor: o ambiente Bulls Cash é só claro, e
 * sem isso a classe `.dark` no <html> ligaria as variantes `dark:` das
 * primitivas por baixo da paleta clara.
 */
export function ThemeProvider({
  children,
  forcedTheme,
}: {
  children: React.ReactNode;
  forcedTheme?: string;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={forcedTheme}
    >
      {children}
    </NextThemesProvider>
  );
}
