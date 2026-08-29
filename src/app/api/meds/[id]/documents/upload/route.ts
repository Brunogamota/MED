import { NextResponse } from 'next/server';
import { DOCUMENT_KINDS, EVIDENCE_SOURCES } from '@/domain/types';
import type { DocumentKind, EvidenceSource } from '@/domain/types';
import { authenticate } from '@/infra/auth/context';
import { jsonError, mapError } from '@/lib/api';
import { rateLimit } from '@/lib/rateLimit';
import { ValidationError } from '@/services/errors';
import { MAX_DOCUMENT_BYTES, uploadDocument } from '@/services/medService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Multipart upload of an evidence document. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = authenticate(request.headers);

    const limit = rateLimit(`upload:${auth.organizationId}`, 60, 60_000);
    if (!limit.allowed) return jsonError(429, 'Limite de uploads excedido');

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new ValidationError('Campo "file" ausente');
    if (file.size > MAX_DOCUMENT_BYTES) {
      throw new ValidationError(
        `Arquivo excede o limite de ${Math.floor(MAX_DOCUMENT_BYTES / (1024 * 1024))} MB`,
      );
    }

    const kind = String(form.get('kind') ?? 'OTHER');
    if (!DOCUMENT_KINDS.includes(kind as DocumentKind)) {
      throw new ValidationError('Tipo de documento invalido');
    }
    const source = String(form.get('source') ?? 'MERCHANT');
    if (!EVIDENCE_SOURCES.includes(source as EvidenceSource)) {
      throw new ValidationError('Origem invalida');
    }

    const document = await uploadDocument(auth, id, {
      kind: kind as DocumentKind,
      filename: file.name || 'documento',
      contentType: file.type || 'application/octet-stream',
      bytes: new Uint8Array(await file.arrayBuffer()),
      source: source as EvidenceSource,
      sourceReference: (form.get('sourceReference') as string | null)?.trim() || null,
    });

    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) {
    return mapError(error);
  }
}
