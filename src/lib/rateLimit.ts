/**
 * Fixed-window rate limiter.
 *
 * In-process only: on Vercel each serverless instance keeps its own counters,
 * so this bounds a single instance rather than the fleet. It is a guard against
 * accidental hammering, not a security control. A shared limiter (Redis or the
 * platform edge) is the documented follow-up before production traffic.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    const fresh: Window = { count: 1, resetAt: now + windowMs };
    windows.set(key, fresh);
    return { allowed: true, remaining: limit - 1, resetAt: fresh.resetAt };
  }

  current.count += 1;
  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}
