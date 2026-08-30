import { serverPageContext } from '@/infra/auth/context';
import { computeAutoFillStats } from '@/services/medService';
import { CONNECTOR_GROUPS, CONNECTORS } from '@/lib/connectors';
import { ConnectorCard } from '@/components/ConnectorCard';
import { MetricCell, MetricStrip } from '@/components/ui';

export const dynamic = 'force-dynamic';

/**
 * Integrações — a segunda página mais importante do produto (briefing 3.7):
 * é daqui que sai o preenchimento automático. O indicador do topo é o
 * argumento de venda: quantas fontes conectadas e quanto do preenchimento
 * recente chegou sem digitação.
 */
export default async function IntegracoesPage() {
  const auth = serverPageContext();
  const stats = await computeAutoFillStats(auth);

  const connected = CONNECTORS.filter((connector) => connector.state === 'CONNECTED').length;
  const total = CONNECTORS.length;
  const autoRate =
    stats.totalEvidences === 0
      ? null
      : Math.round((stats.automaticEvidences / stats.totalEvidences) * 100);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Integrações</h1>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Cada fonte conectada é um conjunto de campos que você deixa de digitar. O formulário é o
          último recurso.
        </p>
      </div>

      <MetricStrip>
        <MetricCell label="Fontes conectadas" value={connected} unit={`de ${total}`} />
        <MetricCell
          label="Preenchimento automático (30 dias)"
          value={autoRate === null ? '—' : `${autoRate}%`}
          tone={autoRate !== null && autoRate >= 50 ? 'success' : 'neutral'}
        />
        <MetricCell label="Evidências recebidas (30 dias)" value={stats.totalEvidences} />
        <MetricCell label="Sem digitação" value={stats.automaticEvidences} />
      </MetricStrip>

      {CONNECTOR_GROUPS.map((group) => {
        const items = CONNECTORS.filter((connector) => connector.group === group);
        return (
          <section key={group}>
            <h2 className="mb-2 mt-6 text-[13px] font-semibold text-[var(--color-text)]">
              {group}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((connector) => (
                <ConnectorCard key={connector.id} connector={connector} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
