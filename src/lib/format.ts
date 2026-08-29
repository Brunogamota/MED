import type { Address, IsoDateTime } from '@/domain/types';

const TIME_ZONE = 'America/Sao_Paulo';

/**
 * Formatting helpers shared by the UI, the PDF renderer and the narrative
 * generator, so a date rendered in the defense text is byte-identical to the
 * one rendered in the document — the LLM fact guard depends on that.
 */

export function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: IsoDateTime | null | undefined): string | null {
  const date = parseIso(value);
  if (!date) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: IsoDateTime | null | undefined): string | null {
  const date = parseIso(value);
  if (!date) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatAmount(amount: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount);
}

export function formatAddress(address: Address | null | undefined): string | null {
  if (!address) return null;
  const line = [
    [address.street, address.number].filter(Boolean).join(', '),
    address.complement,
    address.district,
    [address.city, address.state].filter(Boolean).join('/'),
    address.postalCode,
    address.country,
  ]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part.length > 0)
    .join(' - ');
  return line.length > 0 ? line : null;
}

export function daysUntil(value: IsoDateTime | null | undefined, now = new Date()): number | null {
  const date = parseIso(value);
  if (!date) return null;
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((date.getTime() - now.getTime()) / millisecondsPerDay);
}

// ---------------------------------------------------------------------------
// Masking
// ---------------------------------------------------------------------------
//
// Masked values are used in list views, logs and anywhere the full value is not
// operationally necessary. The Evidence Pack and the defense document render
// full values on purpose: producing them for the requesting institution is the
// entire point of the product.

export function maskDocument(document: string | null | undefined): string | null {
  if (!document) return null;
  const digits = document.replace(/\D/g, '');
  if (digits.length < 5) return '***';
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const head = local.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

export function maskIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  if (ip.includes(':')) {
    const groups = ip.split(':');
    return `${groups.slice(0, 2).join(':')}:***`;
  }
  const octets = ip.split('.');
  if (octets.length !== 4) return '***';
  return `${octets[0]}.${octets[1]}.***.***`;
}
