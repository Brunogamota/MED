import type { ReactNode } from 'react';

/**
 * Form primitives for the operational screens.
 *
 * Every field is optional unless the domain genuinely requires it: leaving an
 * input blank must produce absent data, not an empty value, so the Evidence
 * Engine can report it as missing.
 */

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
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        step={type === 'number' ? 'any' : undefined}
        className="mt-1 w-full rounded border border-[var(--color-border-subtle)] bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
      />
      {hint ? <span className="mt-0.5 block text-[11px] text-[var(--color-ink-muted)]">{hint}</span> : null}
    </label>
  );
}

export function Select({
  label,
  name,
  options,
  required = false,
  defaultValue,
  includeBlank = false,
  className = '',
}: {
  label: string;
  name: string;
  options: readonly string[];
  required?: boolean;
  defaultValue?: string;
  includeBlank?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? (includeBlank ? '' : undefined)}
        className="mt-1 w-full rounded border border-[var(--color-border-subtle)] bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
      >
        {includeBlank ? <option value="">Nao informado</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{children}</div>;
}

export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded bg-[var(--color-brand)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
    >
      {children}
    </button>
  );
}
