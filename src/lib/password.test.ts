import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';

describe('senha do console', () => {
  it('aceita a senha certa e recusa a errada', async () => {
    const stored = await hashPassword('senha-do-operador');
    expect(await verifyPassword('senha-do-operador', stored)).toBe(true);
    expect(await verifyPassword('senha-do-operadoR', stored)).toBe(false);
    expect(await verifyPassword('', stored)).toBe(false);
  });

  it('a mesma senha gera hashes diferentes — o salt e por senha', async () => {
    expect(await hashPassword('igual')).not.toBe(await hashPassword('igual'));
  });

  it('o hash nao usa $ — o valor vai para variavel de ambiente e seria expandido', async () => {
    expect(await hashPassword('qualquer')).not.toContain('$');
  });

  it('hash malformado nunca autentica', async () => {
    for (const stored of ['', 'senha-em-texto', 'bcrypt:a:b', 'scrypt:', 'scrypt:ab:cd']) {
      expect(await verifyPassword('qualquer', stored)).toBe(false);
    }
  });
});
