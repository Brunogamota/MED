import { describe, expect, it } from 'vitest';
import { firstNameForGreeting, personEmail, personName } from '@/domain/person';

describe('nome de pessoa', () => {
  it('aceita nomes de verdade', () => {
    for (const nome of ['Maria', 'Maria Silva', 'JOSÉ DA SILVA', "Ana d'Ávila", 'Maria de Sá', 'Luiz Stone']) {
      expect(personName(nome)).toBe(nome);
    }
  });
  it('recusa o que não é nome', () => {
    for (const lixo of [
      'Transação', 'Usuário', 'Simulação', 'Teste', 'Cliente', 'Comprador', 'usuario teste',
      'BANCO INTER S.A.', 'CLOUD WALK MEIOS DE PAGAMENTOS E SERVICOS LTDA', 'NU PAGAMENTOS S.A.',
      'Pagamento confirmado', 'Pedido recebido', 'maria@exemplo.com', '12345', '', 'N/A', 'null',
    ]) {
      expect(personName(lixo)).toBeNull();
    }
  });
  it('saudação com o primeiro nome bem escrito', () => {
    expect(firstNameForGreeting('MARIA DA SILVA')).toBe('Maria');
    expect(firstNameForGreeting('Transação')).toBeNull();
  });
  it('e-mail', () => {
    expect(personEmail(' Maria@Exemplo.com ')).toBe('maria@exemplo.com');
    expect(personEmail('Maria Silva')).toBeNull();
  });
});
