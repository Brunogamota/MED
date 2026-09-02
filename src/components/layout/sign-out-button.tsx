'use client';

import { useFormStatus } from 'react-dom';
import { LogOut } from 'lucide-react';
import { signOutAction } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Sair, no cabeçalho.
 *
 * O mesmo `signOutAction` do menu do rodapé — a diferença é só onde fica. Sair
 * estava a três cliques dentro de um menu, e é a primeira coisa que se procura
 * no canto superior direito.
 */

function Trigger() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="icon" loading={pending} aria-label="Sair">
      <LogOut aria-hidden />
    </Button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Trigger />
          </span>
        </TooltipTrigger>
        <TooltipContent>Sair</TooltipContent>
      </Tooltip>
    </form>
  );
}
