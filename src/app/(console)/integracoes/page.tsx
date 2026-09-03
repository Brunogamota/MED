import { serverPageContext } from '@/infra/auth/context';
import { getConfig } from '@/lib/env';
import { computeAutoFillStats } from '@/services/medService';
import { CONNECTOR_GROUPS, CONNECTORS, groupAnchor, resolveState } from '@/lib/connectors';
import { ConnectorRow } from '@/components/ConnectorRow';
import { ItemGroup } from '@/components/ui/item';
import { MetricCell, MetricStrip } from '@/components/ui';
import { PageHeader } from '@/components/layout/page-header';

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
  const config = getConfig();
  const runtime = {
    llmConfigured: config.llm.apiKey !== null,
    gmailConfigured: config.gmail.configured,
    gmailConnected: config.gmail.connected,
  };

  const connected = CONNECTORS.filter(
    (connector) => resolveState(connector, runtime) === 'CONNECTED',
  ).length;
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
            <ItemGroup className="gap-3">
              {items.map((connector) => (
                <ConnectorRow
                  key={connector.id}
                  connector={connector}
                  state={resolveState(connector, runtime)}
                  blockedReason={
                    connector.runtime === 'gmail' && !config.gmail.configured
                      ? 'Falta GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET no ambiente.'
                      : undefined
                  }
                />
              ))}
            </ItemGroup>
          </section>
        );
      })}
    </div>
  );
}
