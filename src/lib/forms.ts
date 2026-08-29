/**
 * FormData helpers.
 *
 * An empty input is `undefined`, never an empty string and never a default.
 * A field the operator left blank must reach the domain as absent so it is
 * reported as missing evidence instead of becoming a fabricated value.
 */

export function text(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function number(form: FormData, name: string): number | undefined {
  const raw = text(form, name);
  if (raw === undefined) return undefined;
  const parsed = Number(raw.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function integer(form: FormData, name: string): number | undefined {
  const value = number(form, name);
  return value === undefined ? undefined : Math.trunc(value);
}

/**
 * `datetime-local` inputs have no timezone. They are interpreted in the
 * operator's own timezone by the browser, so the value is converted to a full
 * ISO instant here rather than stored ambiguously.
 */
export function dateTime(form: FormData, name: string): string | undefined {
  const raw = text(form, name);
  if (raw === undefined) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/** Drops undefined keys so optional schema fields stay truly absent. */
export function compact<T extends Record<string, unknown>>(input: T): Partial<T> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) output[key] = value;
  }
  return output as Partial<T>;
}

/** Builds an address object, or undefined when every field is blank. */
export function address(form: FormData, prefix: string) {
  const built = compact({
    street: text(form, `${prefix}Street`),
    number: text(form, `${prefix}Number`),
    complement: text(form, `${prefix}Complement`),
    district: text(form, `${prefix}District`),
    city: text(form, `${prefix}City`),
    state: text(form, `${prefix}State`),
    postalCode: text(form, `${prefix}PostalCode`),
    country: text(form, `${prefix}Country`),
  });
  return Object.keys(built).length > 0 ? built : undefined;
}
