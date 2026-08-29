import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** Liveness probe used to verify a deployment is actually serving. */
export async function GET() {
  const config = getConfig();
  return NextResponse.json({
    status: 'ok',
    appEnv: config.appEnv,
    persistence: config.demoMode ? 'in-memory (demo)' : 'postgres',
    llm: config.llm.apiKey ? 'configured' : 'not configured',
    time: new Date().toISOString(),
  });
}
