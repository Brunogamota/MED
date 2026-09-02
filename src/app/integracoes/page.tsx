import { serverPageContext } from '@/infra/auth/context';
import { computeAutoFillStats } from '@/services/medService';
import { CONNECTOR_GROUPS, CONNECTORS } from '@/lib/connectors';
import { ConnectorCard } from '@/components/ConnectorCard';
import { MetricCell, MetricStrip } from '@/components/ui';
import { PageHeader } from '@/components/layout/page-header';

export const dynamic = 'force-dynamic';

/**
 * Âncora de cada grupo, para a navegação lateral cair direto nele. Derivada do
 * próprio rótulo: um id escrito à mão sairia do ar no dia em que o grupo for
 * renomeado.
 */
function groupAnchor(group: string): string {
  return group
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

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
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="Integrações"
        description="Cada fonte conectada é um conjunto de campos que você deixa de digitar. O formulário é o último recurso."
      />

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
          <section key={group} id={groupAnchor(group)} className="scroll-mt-6">
            <h2 className="mb-3 font-semibold text-base">{group}</h2>
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
