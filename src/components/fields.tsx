'use client';

import { useId, useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as RadixSelect from '@radix-ui/react-select';

/**
 * Controles próprios do console (briefing 2.1): nenhum input nativo de data,
 * número-com-spinner ou select cru chega à tela.
 *
 * - `DateTimeField`: texto humano `dd/mm/aaaa · HH:mm`, aceita colagem em
 *   formatos comuns, popover de calendário com Hoje/Ontem/Agora. O valor
 *   segue para o backend como ISO num hidden — meia-noite exata significa
 *   "hora desconhecida" e as telas exibem só a data (nunca um 00:00 falso).
 * - `MoneyField`: exibe `R$ 1.899,90` com tabular-nums; o hidden carrega o
 *   decimal normalizado.
 * - `SelectField`: Radix Select com chevron próprio e popover com a sombra do
 *   sistema; integra com formulário via hidden nativo do Radix e avisa o
 *   AutoSaveForm disparando um evento `input` que borbulha.
 */

const FIELD_CLASS =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30';

function LabelRow({ id, label, required }: { id: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Data e hora
// ---------------------------------------------------------------------------

const pad = (value: number) => String(value).padStart(2, '0');

function toDisplay(date: Date): string {
  const base = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  if (date.getHours() === 0 && date.getMinutes() === 0) return base;
  return `${base} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Aceita dd/mm/aaaa [hh:mm], dd/mm/aa e ISO — digitado ou colado. */
function parseHuman(raw: string): Date | null {
  const text = raw.trim().replace(/\s*·\s*/, ' ');
  if (text.length === 0) return null;

  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T]+(\d{1,2}):(\d{2}))?$/);
  if (br) {
    const [, dayRaw, monthRaw, yearRaw, hourRaw, minuteRaw] = br;
    const year = yearRaw!.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
    const date = new Date(
      year,
      Number(monthRaw) - 1,
      Number(dayRaw),
      hourRaw ? Number(hourRaw) : 0,
      minuteRaw ? Number(minuteRaw) : 0,
    );
    return Number.isNaN(date.getTime()) || date.getMonth() !== Number(monthRaw) - 1
      ? null
      : date;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const iso = new Date(text);
    return Number.isNaN(iso.getTime()) ? null : iso;
  }
  return null;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function MonthGrid({
  selected,
  onPick,
}: {
  selected: Date | null;
  onPick: (day: Date) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const list: (Date | null)[] = [];
    for (let index = 0; index < start; index += 1) list.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      list.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    }
    return list;
  }, [cursor]);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const today = new Date();

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
        >
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <span className="text-sm font-medium">
          {MONTHS[cursor.getMonth()]} de {cursor.getFullYear()}
        </span>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
        >
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((weekday, index) => (
          <span key={`${weekday}-${index}`} className="h-6 text-xs leading-6 text-muted-foreground">
            {weekday}
          </span>
        ))}
        {cells.map((cell, index) =>
          cell ? (
            <button
              key={cell.toISOString()}
              type="button"
              onClick={() => onPick(cell)}
              className={`h-7 w-7 rounded-md text-xs tabular-nums ${
                selected && isSameDay(cell, selected)
                  ? 'bg-primary font-medium text-primary-foreground'
                  : isSameDay(cell, today)
                    ? 'bg-accent font-medium'
                    : 'hover:bg-accent'
              }`}
            >
              {cell.getDate()}
            </button>
          ) : (
            <span key={`empty-${index}`} className="h-7 w-7" />
          ),
        )}
      </div>
    </div>
  );
}

export function DateTimeField({
  label,
  name,
  required = false,
  defaultValue,
  hint,
  className = '',
}: {
  label: string;
  name: string;
  required?: boolean;
  /** ISO vindo do registro; ausente = campo vazio. */
  defaultValue?: string | null;
  hint?: string;
  className?: string;
}) {
  const id = useId();
  const initial = defaultValue ? new Date(defaultValue) : null;
  const validInitial = initial && !Number.isNaN(initial.getTime()) ? initial : null;
  const [value, setValue] = useState<Date | null>(validInitial);
  const [text, setText] = useState(validInitial ? toDisplay(validInitial) : '');
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const commit = (next: Date | null) => {
    setValue(next);
    setText(next ? toDisplay(next) : '');
    setInvalid(false);
    // O hidden muda por script: avisa o AutoSaveForm que o formulário sujou.
    requestAnimationFrame(() => {
      hiddenRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  const onBlur = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      if (value !== null) commit(null);
      setInvalid(false);
      return;
    }
    const parsed = parseHuman(trimmed);
    if (parsed) {
      commit(parsed);
    } else {
      setInvalid(true);
    }
  };

  const withTime = (day: Date): Date => {
    // Mantém a hora já escolhida ao trocar só o dia.
    if (value && (value.getHours() !== 0 || value.getMinutes() !== 0)) {
      return new Date(day.getFullYear(), day.getMonth(), day.getDate(), value.getHours(), value.getMinutes());
    }
    return day;
  };

  const shortcuts: { label: string; make: () => Date }[] = [
    {
      label: 'Hoje',
      make: () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      },
    },
    {
      label: 'Ontem',
      make: () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      },
    },
    { label: 'Agora', make: () => new Date() },
  ];

  return (
    <div className={className}>
      <LabelRow id={id} label={label} required={required} />
      <div className="relative">
        <input
          id={id}
          type="text"
          value={text}
          required={required}
          onChange={(event) => setText(event.target.value)}
          onBlur={onBlur}
          placeholder="dia/mês/ano hora:min"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`${FIELD_CLASS} tabular-nums pr-9 ${invalid ? 'border-destructive' : ''}`}
        />
        <input ref={hiddenRef} type="hidden" name={name} value={value ? value.toISOString() : ''} />
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label={`Abrir calendário de ${label}`}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" />
              </svg>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={4}
              className="z-50 w-[248px] rounded-lg border bg-popover p-3 shadow-md"
            >
              <div className="mb-2 flex gap-1.5">
                {shortcuts.map((shortcut) => (
                  <button
                    key={shortcut.label}
                    type="button"
                    onClick={() => {
                      commit(shortcut.make());
                      setOpen(false);
                    }}
                    className="inline-flex h-6 items-center rounded-lg border border-input bg-background px-2 text-xs font-medium hover:bg-accent"
                  >
                    {shortcut.label}
                  </button>
                ))}
              </div>
              <MonthGrid
                selected={value}
                onPick={(day) => {
                  commit(withTime(day));
                  setOpen(false);
                }}
              />
              <div className="mt-2 flex items-center gap-2 border-t pt-2">
                <label htmlFor={`${id}-time`} className="text-xs text-muted-foreground">
                  Hora
                </label>
                <input
                  id={`${id}-time`}
                  type="text"
                  inputMode="numeric"
                  placeholder="hh:mm"
                  defaultValue={
                    value && (value.getHours() !== 0 || value.getMinutes() !== 0)
                      ? `${pad(value.getHours())}:${pad(value.getMinutes())}`
                      : ''
                  }
                  onBlur={(event) => {
                    const match = event.target.value.trim().match(/^(\d{1,2}):(\d{2})$/);
                    if (match && value) {
                      const next = new Date(value);
                      next.setHours(Number(match[1]), Number(match[2]));
                      commit(next);
                    }
                  }}
                  className="h-6 w-16 rounded-md border border-input px-1.5 text-center text-xs tabular-nums"
                />
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
      {invalid ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-destructive">
          Data não reconhecida — use dia/mês/ano, com hora opcional.
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dinheiro
// ---------------------------------------------------------------------------

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[R$\s]/g, '');
  if (cleaned.length === 0) return null;
  // "1.899,90" -> 1899.90; "89.9" -> 89.9; "89,9" -> 89.9
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function MoneyField({
  label,
  name,
  required = false,
  defaultValue,
  hint,
  className = '',
}: {
  label: string;
  name: string;
  required?: boolean;
  /** Valor numérico do registro; ausente = campo vazio. */
  defaultValue?: number | null;
  hint?: string;
  className?: string;
}) {
  const id = useId();
  const initial = typeof defaultValue === 'number' ? defaultValue : null;
  const [amount, setAmount] = useState<number | null>(initial);
  const [text, setText] = useState(initial === null ? '' : moneyFormatter.format(initial));
  const [invalid, setInvalid] = useState(false);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const onBlur = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      setAmount(null);
      setInvalid(false);
      return;
    }
    const parsed = parseMoney(trimmed);
    if (parsed === null) {
      setInvalid(true);
      return;
    }
    setAmount(parsed);
    setText(moneyFormatter.format(parsed));
    setInvalid(false);
    requestAnimationFrame(() => {
      hiddenRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  return (
    <div className={className}>
      <LabelRow id={id} label={label} required={required} />
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
        >
          R$
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={text}
          required={required}
          onChange={(event) => setText(event.target.value)}
          onBlur={onBlur}
          placeholder="0,00"
          aria-invalid={invalid || undefined}
          className={`${FIELD_CLASS} tabular-nums pl-8 text-right ${invalid ? 'border-destructive' : ''}`}
        />
        <input
          ref={hiddenRef}
          type="hidden"
          name={name}
          value={amount === null ? '' : String(amount)}
        />
      </div>
      {invalid ? (
        <p className="mt-1 text-xs text-destructive">
          Valor não reconhecido — use vírgula para centavos.
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------

export function SelectField({
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
  /** Tradução valor técnico -> rótulo. Enum bruto nunca chega ao usuário. */
  labels?: Partial<Record<string, string>>;
  required?: boolean;
  defaultValue?: string;
  includeBlank?: boolean;
  className?: string;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState(defaultValue ?? (includeBlank ? '' : options[0] ?? ''));

  return (
    <div className={className}>
      <LabelRow id={id} label={label} required={required} />
      <RadixSelect.Root
        name={name}
        value={value}
        onValueChange={(next) => {
          setValue(next === '__blank__' ? '' : next);
          requestAnimationFrame(() => {
            triggerRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
          });
        }}
        required={required}
      >
        <RadixSelect.Trigger
          ref={triggerRef}
          id={id}
          aria-label={label}
          className={`${FIELD_CLASS} flex items-center justify-between gap-2 text-left data-[placeholder]:text-muted-foreground`}
        >
          <span className="truncate">
            {value === '' ? '—' : (labels?.[value] ?? value)}
          </span>
          <RadixSelect.Icon>
            <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="z-50 max-h-[280px] min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-lg border bg-popover p-1 shadow-md"
          >
            <RadixSelect.Viewport>
              {includeBlank ? (
                <RadixSelect.Item
                  value="__blank__"
                  className="flex h-8 cursor-default items-center rounded-md px-2.5 text-sm text-muted-foreground outline-none data-[highlighted]:bg-accent"
                >
                  <RadixSelect.ItemText>—</RadixSelect.ItemText>
                </RadixSelect.Item>
              ) : null}
              {options.map((option) => (
                <RadixSelect.Item
                  key={option}
                  value={option}
                  className="flex h-8 cursor-default items-center justify-between gap-2 rounded-md px-2.5 text-sm outline-none data-[highlighted]:bg-accent data-[state=checked]:font-medium"
                >
                  <RadixSelect.ItemText>{labels?.[option] ?? option}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}
