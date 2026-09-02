'use client';

import { OverflowMenuHorizontal, User } from '@carbon/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/cn';

/**
 * Rodapé do painel: a organização em que o operador está.
 *
 * Sem autenticação de usuário final ainda, o que identifica a sessão é a
 * organização — inventar um nome de pessoa aqui seria dado falso na tela.
 */
export function NavUserMenu({
  organization,
  demoMode,
  collapsed,
}: {
  organization: string;
  demoMode: boolean;
  collapsed: boolean;
}) {
  const avatar = (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-neutral-50">
      <User size={16} />
    </span>
  );

  return (
    <div className={cn('w-full border-neutral-800 border-t pt-3', collapsed && 'flex justify-center')}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Organização ${organization}`}
            title={collapsed ? organization : undefined}
            className={cn(
              'flex h-12 items-center rounded-lg text-neutral-300 transition-colors hover:bg-neutral-800',
              collapsed ? 'w-10 min-w-10 justify-center' : 'w-full gap-2 px-2',
            )}
          >
            {avatar}
            {collapsed ? null : (
              <>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-neutral-50 text-sm">{organization}</span>
                  <span className="block truncate text-neutral-500 text-xs">
                    {demoMode ? 'Modo demo · dados em memória' : 'Operacional'}
                  </span>
                </span>
                <OverflowMenuHorizontal size={16} className="shrink-0" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="right" align="end" sideOffset={8} className="min-w-56">
          <DropdownMenuLabel className="font-normal">
            <span className="block font-medium">{organization}</span>
            <span className="block text-muted-foreground text-xs">
              {demoMode ? 'Modo demo' : 'Produção'}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem disabled>Conta</DropdownMenuItem>
            <DropdownMenuItem disabled>Preferências</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Sair</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
