import { serverPageContext } from '@/infra/auth/context';
import { getConfig } from '@/lib/env';
import { computeAutoFillStats } from '@/services/medService';
import { CONNECTOR_GROUPS, CONNECTORS, groupAnchor, resolveState } from '@/lib/connectors';
import { ConnectorRow } from '@/components/ConnectorRow';
import { ItemGroup } from '@/components/ui/item';
import { MetricCell, MetricStrip } from '@/components/ui';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { connectorStatus } from '@/services/credentialService';
import { disconnectGmailAction } from './actions';

export const dynamic = 'force-dynamic';

/**
 * Integrações — a segunda página mais importante do produto (briefing 3.7):
 * é daqui que sai o preenchimento automático. O indicador do topo é o
 * argumento de venda: quantas fontes conectadas e quanto do preenchimento
 * recente chegou sem digitação.
 */
export default async function IntegracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string; motivo?: string }>;
}) {
  const { gmail: gmailResult, motivo } = await searchParams;
  const auth = serverPageContext();
  const stats = await computeAutoFillStats(auth);
  const config = getConfig();
  const gmail = await connectorStatus(auth.organizationId, 'GMAIL');
  const runtime = {
    llmConfigured: config.llm.apiKey !== null,
    gmailConfigured: config.gmail.configured,
    // O banco manda; a variavel de ambiente sobrevive so para o deploy que ja
    // guardava o token assim, e some quando ele reconectar pela tela.
    gmailConnected: gmail.connected || config.gmail.connected,
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

      {gmailResult === 'conectado' ? (
        <Alert>
          <AlertTitle>Gmail conectado</AlertTitle>
          <AlertDescription>
            A caixa já pode ser lida. Nenhuma credencial foi mostrada nem precisa ser guardada
            por você.
          </AlertDescription>
        </Alert>
      ) : gmailResult === 'erro' ? (
        <Alert variant="destructive">
          <AlertTitle>Não deu para conectar o Gmail</AlertTitle>
          <AlertDescription>{motivo ?? 'Tente conectar novamente.'}</AlertDescription>
        </Alert>
      ) : null}

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
                  accountLabel={connector.runtime === 'gmail' ? gmail.accountLabel : null}
                  onDisconnect={
                    connector.runtime === 'gmail' && gmail.connected ? (
                      <form action={disconnectGmailAction}>
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          title="Apaga a credencial guardada aqui. A autorização no Google continua até ser revogada lá."
                        >
                          Desconectar
                        </Button>
                      </form>
                    ) : null
                  }
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
