import { cn } from '@/lib/cn';

/**
 * Marca do ambiente Marketplace Verificado, ao lado do nome da conta.
 *
 * É só a marca do console. Não vai no comprovante: lá ela leria como selo de
 * autenticidade do registro, e o registro não afirma isso.
 */
export function BrandSeal({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary shadow-(--mkv-shadow)',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[22px] fill-primary-foreground" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.575 9.55.7 10.92.7 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238 1.25 1.273 2.62 2.148 4.2 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-1.25 2.148-2.62 2.148-4.2zM9.7 16.6L5.4 12.3l1.4-1.4 2.9 2.9 7.3-7.3 1.4 1.4-8.7 8.7z" />
      </svg>
    </span>
  );
}

/** "Camila Duarte" → "CD"; um nome só → as duas primeiras letras. */
export function initials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  if (words.length === 1) return (words[0] ?? '').slice(0, 2).toUpperCase();
  return `${words[0]?.[0] ?? ''}${words[words.length - 1]?.[0] ?? ''}`.toUpperCase();
}
