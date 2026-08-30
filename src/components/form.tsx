import type { ReactNode } from 'react';

/**
 * Campos do padrao console: 32px de altura, borda 1px strong, raio 6px,
 * rotulo acima em 12px/500 sentence case.
 *
 * Data/hora, dinheiro e select vem de components/fields.tsx (controles
 * proprios — nenhum input nativo cru chega a tela). Numero generico vira
 * texto com inputMode numerico: sem spinner, teclado certo no toque.
 *
 * Campo em branco continua produzindo dado ausente, nunca default.
 */

export { DateTimeField, MoneyField, SelectField as Select } from '@/components/fields';

const FIELD_CLASS =
  'h-8 w-full rounded-md border border-[var(--color-border-strong)] bg-white px-2.5 text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]';

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
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
      >
        {label}
        {required ? <span className="text-[var(--color-danger)]"> *</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type={numeric ? 'text' : type}
        inputMode={numeric ? 'decimal' : undefined}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={`${FIELD_CLASS}${numeric ? ' tabular' : ''}`}
      />
      {hint ? (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

/** Acao primaria: preta, 32px. Uma por tela. */
export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="inline-flex h-8 items-center rounded-md bg-[var(--color-primary)] px-3 text-[13px] font-medium text-[var(--color-primary-fg)] transition-colors duration-[120ms] hover:bg-[var(--color-primary-hover)]"
    >
      {children}
    </button>
  );
}

/** Acao secundaria: branca com borda strong. */
export function SecondaryButton({
  children,
  type = 'submit',
}: {
  children: ReactNode;
  type?: 'submit' | 'button';
}) {
  return (
    <button
      type={type}
      className="inline-flex h-8 items-center rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-[13px] font-medium text-[var(--color-text)] transition-colors duration-[120ms] hover:bg-[var(--color-surface-hover)]"
    >
      {children}
    </button>
  );
}
