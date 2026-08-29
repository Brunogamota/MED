import { describe, expect, it } from 'vitest';
import {
  buildSignedDocumentPath,
  verifySignedDocumentUrl,
} from '@/infra/storage/signedUrl';

const SECRET = 'test-secret-value';
const NOW = new Date('2026-08-29T12:00:00.000Z');

function issue(overrides: { organizationId?: string; documentId?: string } = {}) {
  const params = {
    organizationId: overrides.organizationId ?? 'org_a',
    documentId: overrides.documentId ?? 'doc_1',
  };
  const result = buildSignedDocumentPath(params, SECRET, 300, NOW);
  const url = new URL(`http://example.test${result.path}`);
  return {
    ...params,
    expiresAt: url.searchParams.get('exp'),
    signature: url.searchParams.get('sig'),
  };
}

describe('signed document urls', () => {
  it('accepts a link it just issued', () => {
    const link = issue();
    const result = verifySignedDocumentUrl(link, SECRET, NOW);
    expect(result).toEqual({ ok: true, organizationId: 'org_a', documentId: 'doc_1' });
  });

  it('rejects a link after it expires', () => {
    const link = issue();
    const later = new Date(NOW.getTime() + 301_000);
    expect(verifySignedDocumentUrl(link, SECRET, later)).toEqual({ ok: false, reason: 'EXPIRED' });
  });

  it('rejects a link whose document id was swapped', () => {
    const link = issue();
    const tampered = { ...link, documentId: 'doc_2' };
    expect(verifySignedDocumentUrl(tampered, SECRET, NOW)).toEqual({
      ok: false,
      reason: 'BAD_SIGNATURE',
    });
  });

  it('rejects a link whose organization was swapped', () => {
    const link = issue();
    const tampered = { ...link, organizationId: 'org_b' };
    expect(verifySignedDocumentUrl(tampered, SECRET, NOW)).toEqual({
      ok: false,
      reason: 'BAD_SIGNATURE',
    });
  });

  it('rejects an extended expiry', () => {
    const link = issue();
    const tampered = { ...link, expiresAt: String(Number(link.expiresAt) + 86_400) };
    expect(verifySignedDocumentUrl(tampered, SECRET, NOW)).toEqual({
      ok: false,
      reason: 'BAD_SIGNATURE',
    });
  });

  it('rejects a link signed with a different secret', () => {
    const link = issue();
    expect(verifySignedDocumentUrl(link, 'other-secret', NOW)).toEqual({
      ok: false,
      reason: 'BAD_SIGNATURE',
    });
  });

  it('rejects a link with missing parameters', () => {
    expect(
      verifySignedDocumentUrl(
        { documentId: 'doc_1', organizationId: null, expiresAt: null, signature: null },
        SECRET,
        NOW,
      ),
    ).toEqual({ ok: false, reason: 'MISSING_PARAMS' });
  });
});
