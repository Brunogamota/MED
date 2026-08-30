import { jsonError, mapError } from '@/lib/api';
import { getConfig } from '@/lib/env';
import { verifySignedDocumentUrl } from '@/infra/storage/signedUrl';
import { readVerifiedDocument } from '@/services/medService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Serves a document from a signed link.
 *
 * Authorisation comes from the signature alone: the organization is taken from
 * the verified payload, never from a header or query parameter the caller could
 * choose. An unsigned request is refused outright.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = getConfig();

  if (!config.documentUrlSigningSecret) {
    return jsonError(503, 'Download de documentos indisponível: DOCUMENT_URL_SIGNING_SECRET ausente');
  }

  const url = new URL(request.url);
  const verification = verifySignedDocumentUrl(
    {
      documentId: id,
      organizationId: url.searchParams.get('org'),
      expiresAt: url.searchParams.get('exp'),
      signature: url.searchParams.get('sig'),
    },
    config.documentUrlSigningSecret,
  );

  if (!verification.ok) {
    const status = verification.reason === 'EXPIRED' ? 410 : 403;
    const message =
      verification.reason === 'EXPIRED' ? 'Link expirado' : 'Link inválido';
    return jsonError(status, message);
  }

  try {
    const { document, blob } = await readVerifiedDocument(
      verification.organizationId,
      verification.documentId,
    );

    return new Response(blob.bytes as BodyInit, {
      headers: {
        'content-type': blob.contentType,
        'content-disposition': `inline; filename="${document.filename.replace(/"/g, '')}"`,
        'cache-control': 'private, no-store',
      },
    });
  } catch (error) {
    return mapError(error);
  }
}
