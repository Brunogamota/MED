'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

/**
 * Botão de envio que sabe sozinho quando o formulário está em voo.
 *
 * `useFormStatus` lê o estado do `<form>` que envolve o botão, então nenhuma
 * tela precisa carregar um `isPending` só para isso — e o botão desabilita
 * durante o envio, o que resolve o clique duplo que gravaria duas vezes.
 */
export function SubmitButton({
  children,
  variant,
}: {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} loading={pending}>
      {children}
    </Button>
  );
}
