import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { UnauthorizedError, authenticate, type AuthContext } from '@/infra/auth/context';
import { ForbiddenError } from '@/infra/auth/rbac';
import { ConflictError, NotFoundError, ValidationError } from '@/services/errors';
import { rateLimit } from '@/lib/rateLimit';

/**
 * HTTP boundary helpers.
 *
 * Responsibilities kept here so route handlers stay thin: authenticate, parse
 * and validate the body, map domain errors onto status codes, and make sure no
 * internal detail (stack traces, connection strings, key material) leaves the
 * process in an error body.
 */

export interface ApiErrorBody {
  error: string;
  details?: unknown;
}

export function jsonError(status: number, message: string, details?: unknown) {
  const body: ApiErrorBody = { error: message };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

export function mapError(error: unknown) {
  if (error instanceof UnauthorizedError) return jsonError(401, error.message);
  if (error instanceof ForbiddenError) return jsonError(403, error.message);
  if (error instanceof NotFoundError) return jsonError(404, error.message);
  if (error instanceof ConflictError) return jsonError(409, error.message);
  if (error instanceof ValidationError) return jsonError(422, error.message, error.details);
  if (error instanceof ZodError) {
    return jsonError(422, 'Dados invalidos', error.issues);
  }

  // Anything else is unexpected: log server-side, return an opaque message.
  console.error('[api] unhandled error', error instanceof Error ? error.message : error);
  return jsonError(500, 'Erro interno');
}

/**
 * Guards writes against accidental hammering. In-process, therefore per
 * instance — see `src/lib/rateLimit.ts`. Reads are not limited here.
 */
const WRITE_LIMIT_PER_MINUTE = 120;

function enforceWriteLimit(request: Request, auth: AuthContext): NextResponse | null {
  if (request.method === 'GET' || request.method === 'HEAD') return null;
  const path = new URL(request.url).pathname;
  const limit = rateLimit(
    `${auth.organizationId}:${request.method}:${path}`,
    WRITE_LIMIT_PER_MINUTE,
    60_000,
  );
  return limit.allowed ? null : jsonError(429, 'Limite de requisicoes excedido');
}

async function respond<T>(
  request: Request,
  handler: (auth: AuthContext) => Promise<T>,
  status: number,
): Promise<NextResponse> {
  try {
    const auth = authenticate(request.headers);
    const limited = enforceWriteLimit(request, auth);
    if (limited) return limited;
    const result = await handler(auth);
    return NextResponse.json(result as object, { status });
  } catch (error) {
    return mapError(error);
  }
}

export async function withAuth<T>(
  request: Request,
  handler: (auth: AuthContext) => Promise<T>,
): Promise<NextResponse> {
  return respond(request, handler, 200);
}

export async function withAuthCreated<T>(
  request: Request,
  handler: (auth: AuthContext) => Promise<T>,
): Promise<NextResponse> {
  return respond(request, handler, 201);
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError('Corpo da requisicao nao e um JSON valido');
  }
  return schema.parse(raw);
}

/** Idempotency key supplied by the caller, if any. */
export function idempotencyKey(request: Request): string | null {
  return request.headers.get('idempotency-key')?.trim() || null;
}
