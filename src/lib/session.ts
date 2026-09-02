/**
 * Sessão do console: cookie assinado, sem estado no servidor.
 *
 * O token é `payload.assinatura`, com a assinatura em HMAC-SHA256 sobre o
 * payload. Não há sessão guardada em lugar nenhum — o servidor só verifica a
 * assinatura e a validade, o que funciona igual em serverless sem banco.
 *
 * Web Crypto de propósito, não `node:crypto`: o middleware roda no runtime de
 * borda, onde o módulo do Node não existe.
 */

export const SESSION_COOKIE = 'med_session';
/** Oito horas: um turno de trabalho, não uma sessão eterna. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface SessionPayload {
  /** Quem entrou — hoje sempre o operador único do console. */
  sub: string;
  /** Expiração em segundos desde a época. */
  exp: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  // Buffer proprio, e nao Uint8Array.from: `crypto.subtle` exige um
  // ArrayBuffer de verdade, nao o ArrayBufferLike que o `from` infere.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret),
    new TextEncoder().encode(body),
  );
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Devolve o payload apenas quando a assinatura confere e o prazo não passou.
 * Qualquer outra coisa — token torto, assinatura errada, expirado — é `null`:
 * o chamador não precisa distinguir, e distinguir só ajudaria quem ataca.
 */
export async function verifySession(
  token: string | undefined | null,
  secret: string,
  now: Date = new Date(),
): Promise<SessionPayload | null> {
  if (!token) return null;
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      fromBase64Url(signature),
      new TextEncoder().encode(body),
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { sub, exp } = parsed as Record<string, unknown>;
    if (typeof sub !== 'string' || typeof exp !== 'number') return null;
    if (exp * 1000 <= now.getTime()) return null;
    return { sub, exp };
  } catch {
    return null;
  }
}

export function sessionExpiry(now: Date = new Date()): number {
  return Math.floor(now.getTime() / 1000) + SESSION_TTL_SECONDS;
}
