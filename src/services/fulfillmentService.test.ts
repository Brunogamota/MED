import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryMedRepository } from '@/infra/repositories/memory';
import { __setRepositoryForTests } from '@/infra/container';
import { ValidationError } from '@/services/errors';
import type { AuthContext } from '@/infra/auth/context';
import { recordDigitalDelivery, recordShipment } from '@/services/fulfillmentService';
import {
  createMed,
  generateDefenseForMed,
  getCase,
  upsertTracking,
} from '@/services/medService';
import type { CreateMedInput } from '@/domain/schemas';

const auth: AuthContext = { organizationId: 'org_a', role: 'OWNER', actor: 'test:a' };

function medInput(overrides: Partial<CreateMedInput> = {}): CreateMedInput {
  return {
    medId: 'MED-1',
    amount: 349.9,
    currency: 'BRL',
    openedAt: '2026-08-20T12:00:00.000Z',
    transactionAt: '2026-08-10T17:32:00.000Z',
    responseDeadlineAt: '2026-09-05T12:00:00.000Z',
    reason: 'PRODUCT_NOT_RECEIVED',
    endToEndId: 'E12345678202608101432abcdef01',
    productType: 'PHYSICAL',
    payer: { document: '12345678909', name: 'Maria Souza', email: 'maria@example.com' },
    ...overrides,
  } as CreateMedInput;
}

beforeEach(() => {
  __setRepositoryForTests(new InMemoryMedRepository());
});

describe('entrega de produto fisico', () => {
  it('transforma cada marco informado em evento datado da timeline', async () => {
    const med = await createMed(auth, medInput());

    const tracking = await recordShipment(auth, med.id, {
      status: 'DELIVERED',
      trackingCode: 'AA123456789BR',
      carrier: 'Correios',
      receiverName: 'Maria Souza',
      inProductionAt: '2026-08-11T12:00:00.000Z',
      postedAt: '2026-08-11T19:42:00.000Z',
      inTransitAt: '2026-08-12T08:00:00.000Z',
      deliveredAt: '2026-08-14T16:17:00.000Z',
      source: 'MANUAL',
    });

    expect(tracking.events.map((event) => event.status)).toEqual([
      'IN_PRODUCTION',
      'POSTED',
      'IN_TRANSIT',
      'DELIVERED',
    ]);
    expect(tracking.events.every((event) => event.source === 'MANUAL')).toBe(true);
    expect(tracking.events.at(-1)?.description).toContain('recebido por Maria Souza');
  });

  it('nao cria evento para marco sem data', async () => {
    const med = await createMed(auth, medInput());
    const tracking = await recordShipment(auth, med.id, {
      status: 'IN_TRANSIT',
      trackingCode: 'AA123456789BR',
      postedAt: '2026-08-11T19:42:00.000Z',
      source: 'MANUAL',
    });

    expect(tracking.events).toHaveLength(1);
    expect(tracking.events[0]?.status).toBe('POSTED');
  });

  it('recusa "entregue" sem data da entrega', async () => {
    const med = await createMed(auth, medInput());
    await expect(
      recordShipment(auth, med.id, { status: 'DELIVERED', source: 'MANUAL' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('aceita "em producao" antes de existir codigo de rastreio', async () => {
    const med = await createMed(auth, medInput());
    const tracking = await recordShipment(auth, med.id, {
      status: 'IN_PRODUCTION',
      inProductionAt: '2026-08-11T12:00:00.000Z',
      source: 'MANUAL',
    });

    expect(tracking.trackingCode).toBeNull();
    expect(tracking.events[0]?.status).toBe('IN_PRODUCTION');
  });

  it('preserva eventos vindos da transportadora ao registrar marcos manuais', async () => {
    const med = await createMed(auth, medInput());

    await upsertTracking(auth, med.id, {
      trackingCode: 'AA123456789BR',
      status: 'IN_TRANSIT',
      source: 'TRACKING_PROVIDER',
      sourceReference: 'AA123456789BR',
      events: [
        {
          occurredAt: '2026-08-12T10:00:00.000Z',
          status: 'IN_TRANSIT',
          description: 'Objeto em transito - CD Sao Paulo',
          source: 'TRACKING_PROVIDER',
          sourceReference: 'AA123456789BR',
        },
      ],
    });

    const tracking = await recordShipment(auth, med.id, {
      status: 'DELIVERED',
      deliveredAt: '2026-08-14T16:17:00.000Z',
      source: 'MANUAL',
    });

    const sources = tracking.events.map((event) => event.source);
    expect(sources).toContain('TRACKING_PROVIDER');
    expect(sources).toContain('MANUAL');
    expect(tracking.events).toHaveLength(2);
  });

  it('nao afirma entrega quando o status e "nao entregue"', async () => {
    const med = await createMed(auth, medInput());
    await recordShipment(auth, med.id, {
      status: 'NOT_DELIVERED',
      trackingCode: 'AA123456789BR',
      postedAt: '2026-08-11T19:42:00.000Z',
      notDeliveredAt: '2026-08-15T10:00:00.000Z',
      source: 'MANUAL',
    });

    const defense = await generateDefenseForMed(auth, med.id);
    const claimIds = defense.claims.map((claim) => claim.id);

    expect(claimIds).toContain('delivery.shipped');
    expect(claimIds).not.toContain('delivery.delivered');
    expect(defense.riskFlags.map((flag) => flag.code)).toContain('NO_DELIVERY_PROOF');
  });
});

describe('entrega digital', () => {
  it('sustenta a defesa pelo envio do acesso, sem depender do comprador', async () => {
    const med = await createMed(auth, medInput({ medId: 'MED-D1', productType: 'INFOPRODUCT' }));

    await recordDigitalDelivery(auth, med.id, {
      channel: 'EMAIL',
      sentTo: 'maria@example.com',
      sentAt: '2026-08-10T17:35:00.000Z',
      platform: 'Area de membros',
      source: 'MERCHANT',
      sourceReference: 'msg-9931',
    });

    const defense = await generateDefenseForMed(auth, med.id);
    const claim = defense.claims.find((entry) => entry.id === 'digital.access_sent');

    expect(claim).toBeDefined();
    expect(claim?.statement).toContain('maria@example.com');
    expect(claim?.statement).toContain('por e-mail');
    expect(claim?.evidenceIds.length).toBeGreaterThan(0);
  });

  it('coloca o envio do acesso na timeline', async () => {
    const med = await createMed(auth, medInput({ medId: 'MED-D2', productType: 'DIGITAL' }));
    await recordDigitalDelivery(auth, med.id, {
      channel: 'EMAIL',
      sentTo: 'maria@example.com',
      sentAt: '2026-08-10T17:35:00.000Z',
      firstAccessAt: '2026-08-10T18:02:00.000Z',
      accessCount: 7,
      source: 'MERCHANT',
    });

    const medCase = await getCase(auth, med.id);
    expect(medCase.digitalDelivery?.accessCount).toBe(7);

    const defense = await generateDefenseForMed(auth, med.id);
    expect(defense.claims.map((claim) => claim.id)).toContain('digital.first_access');
  });

  it('recusa destino sem data de envio', async () => {
    const med = await createMed(auth, medInput({ medId: 'MED-D3', productType: 'DIGITAL' }));
    await expect(
      recordDigitalDelivery(auth, med.id, {
        channel: 'EMAIL',
        sentTo: 'maria@example.com',
        source: 'MERCHANT',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
