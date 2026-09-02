import { describe, expect, it } from 'vitest';
import { signSession, verifySession, sessionExpiry } from '@/lib/session';

const SECRET = 'segredo-de-teste-suficientemente-longo';
const NOW = new Date('2026-09-02T12:00:00.000Z');

describe('sessão assinada', () => {
  it('aceita de volta o token que ela mesma assinou', async () => {
    const token = await signSession({ sub: 'operador', exp: sessionExpiry(NOW) }, SECRET);
    const payload = await verifySession(token, SECRET, NOW);
    expect(payload?.sub).toBe('operador');
  });

  it('recusa token assinado com outro segredo', async () => {
    const token = await signSession({ sub: 'operador', exp: sessionExpiry(NOW) }, SECRET);
    expect(await verifySession(token, 'outro-segredo', NOW)).toBeNull();
  });

  it('recusa payload adulterado — a assinatura cobre o conteudo', async () => {
    const token = await signSession({ sub: 'operador', exp: sessionExpiry(NOW) }, SECRET);
    const [, signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'admin', exp: sessionExpiry(NOW) }))
      .toString('base64url');
    expect(await verifySession(`${forged}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it('recusa sessao expirada', async () => {
    const token = await signSession({ sub: 'operador', exp: sessionExpiry(NOW) }, SECRET);
    const depois = new Date(NOW.getTime() + 9 * 60 * 60 * 1000);
    expect(await verifySession(token, SECRET, depois)).toBeNull();
  });

  it('recusa lixo sem explodir', async () => {
    for (const token of ['', 'abc', 'a.b', undefined, null]) {
      expect(await verifySession(token, SECRET, NOW)).toBeNull();
    }
  });
});
