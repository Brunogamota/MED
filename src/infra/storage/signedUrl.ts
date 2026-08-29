import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed document URLs.
 *
 * A document link carries the organization, the document id and an expiry, all
 * covered by an HMAC. Nothing about the link is guessable or editable: changing
 * the document id or extending the expiry invalidates the signature, which is
 * what stops a link from becoming an IDOR against another tenant's evidence.
 *
 * Links are short-lived by design — they end up in browsers, e-mails and,
 * eventually, in packages sent to institutions.
 */

export const DEFAULT_TTL_SECONDS = 300;

export interface SignedUrlParams {
  organizationId: string;
  documentId: string;
  expiresAt: number;
}

function payloadOf(params: SignedUrlParams): string {
  return `${params.organizationId}:${params.documentId}:${params.expiresAt}`;
}

export function signDocumentUrl(params: SignedUrlParams, secret: string): string {
  return createHmac('sha256', secret).update(payloadOf(params)).digest('hex');
}

export interface SignedUrlResult {
  path: string;
  expiresAt: number;
  signature: string;
}

export function buildSignedDocumentPath(
  params: Omit<SignedUrlParams, 'expiresAt'>,
  secret: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  now: Date = new Date(),
): SignedUrlResult {
  const expiresAt = Math.floor(now.getTime() / 1000) + ttlSeconds;
  const signature = signDocumentUrl({ ...params, expiresAt }, secret);
  const query = new URLSearchParams({
    org: params.organizationId,
    exp: String(expiresAt),
    sig: signature,
  });
  return {
    path: `/api/documents/${params.documentId}?${query.toString()}`,
    expiresAt,
    signature,
  };
}

export type VerificationFailure = 'MISSING_PARAMS' | 'EXPIRED' | 'BAD_SIGNATURE';

export type VerifyResult =
  | { ok: true; organizationId: string; documentId: string }
  | { ok: false; reason: VerificationFailure };

export function verifySignedDocumentUrl(
  input: { documentId: string; organizationId: string | null; expiresAt: string | null; signature: string | null },
  secret: string,
  now: Date = new Date(),
): VerifyResult {
  const { documentId, organizationId, expiresAt, signature } = input;
  if (!organizationId || !expiresAt || !signature) {
    return { ok: false, reason: 'MISSING_PARAMS' };
  }

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry)) return { ok: false, reason: 'MISSING_PARAMS' };

  // Expiry is checked before the signature so an expired-but-valid link is
  // reported as expired rather than as tampering.
  if (expiry * 1000 <= now.getTime()) return { ok: false, reason: 'EXPIRED' };

  const expected = signDocumentUrl({ organizationId, documentId, expiresAt: expiry }, secret);
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const presentedBuffer = Buffer.from(signature, 'utf8');
  if (expectedBuffer.length !== presentedBuffer.length) {
    return { ok: false, reason: 'BAD_SIGNATURE' };
  }
  if (!timingSafeEqual(expectedBuffer, presentedBuffer)) {
    return { ok: false, reason: 'BAD_SIGNATURE' };
  }

  return { ok: true, organizationId, documentId };
}
