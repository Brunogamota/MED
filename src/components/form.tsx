import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/cn';

/**
 * Campos dos formulários do caso, sobre shadcn/ui.
 *
 * Data/hora, dinheiro e select vêm de `components/fields.tsx` (controles
 * próprios — nenhum input nativo cru chega à tela). Número genérico vira
 * texto com `inputMode` numérico: sem spinner, teclado certo no toque.
 *
 * Campo em branco continua produzindo dado ausente, nunca default.
 */

export { DateTimeField, MoneyField, SelectField as Select } from '@/components/fields';

export function Field({
  label,
  name,
  type = 'text',
  required = false,
  placeholder,
  defaultValue,
  hint,
  className = '',
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  hint?: string;
  className?: string;
}) {
  const id = `field-${name}`;
  const numeric = type === 'number';

  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input
        id={id}
        name={name}
        type={numeric ? 'text' : type}
        inputMode={numeric ? 'decimal' : undefined}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={numeric ? 'tabular-nums' : undefined}
      />
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

/** Ação primária do formulário. */
export function SubmitButton({ children }: { children: ReactNode }) {
  return <Button type="submit">{children}</Button>;
}

/** Ação secundária. */
export function SecondaryButton({
  children,
  type = 'submit',
}: {
  children: ReactNode;
  type?: 'submit' | 'button';
}) {
  return (
    <Button type={type} variant="outline">
      {children}
    </Button>
  );
}
