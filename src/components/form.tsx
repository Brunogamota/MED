import type { ReactNode } from 'react';

/**
 * Campos do padrao console: 32px de altura, borda 1px strong, raio 6px,
 * rotulo acima em 12px/500 sentence case. Select nao usa o chrome nativo:
 * appearance-none + chevron proprio, mesma altura e borda dos demais campos.
 *
 * Campo em branco continua produzindo dado ausente, nunca default.
 */

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
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        step={type === 'number' ? 'any' : undefined}
        className={FIELD_CLASS}
      />
      {hint ? (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

/** Chevron proprio: o select nativo cru e proibido pela direcao. */
const CHEVRON =
  "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238a8a8a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export function Select({
  label,
  name,
  options,
  labels,
  required = false,
  defaultValue,
  includeBlank = false,
  className = '',
}: {
  label: string;
  name: string;
  options: readonly string[];
  /** Traducao valor tecnico -> rotulo. Enum bruto nunca chega ao usuario. */
  labels?: Partial<Record<string, string>>;
  required?: boolean;
  defaultValue?: string;
  includeBlank?: boolean;
  className?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
      >
        {label}
        {required ? <span className="text-[var(--color-danger)]"> *</span> : null}
      </label>
      <select
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue ?? (includeBlank ? '' : undefined)}
        className={`${FIELD_CLASS} appearance-none bg-no-repeat pr-8`}
        style={{ backgroundImage: CHEVRON, backgroundPosition: 'right 8px center' }}
      >
        {includeBlank ? <option value="">—</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
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
