'use client';

import { useActionState } from 'react';
import { createAccountAction } from './actions';
import { SKINS } from '@/config/skins';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateAccountForm() {
  const [state, action, pending] = useActionState(createAccountAction, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="nome">Nome da conta</Label>
        <Input id="nome" name="nome" placeholder="Ex.: Bulls Cash" required minLength={2} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ambiente">Ambiente</Label>
        <select
          id="ambiente"
          name="ambiente"
          defaultValue="bulls"
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          {Object.entries(SKINS).map(([id, skin]) => (
            <option key={id} value={id}>
              {skin.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Criando…' : 'Criar e entrar'}
      </Button>
      {state?.error ? (
        <p role="alert" className="text-destructive text-sm sm:col-span-3">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
