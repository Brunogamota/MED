import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/layout/page-header';
import { serverPageContext } from '@/infra/auth/context';
import { Panel } from '@/components/ui';
import { formatDateTimeSmart } from '@/lib/format';
import { DEFAULT_GMAIL_QUERY, readInbox } from '@/services/gmailService';

export const dynamic = 'force-dynamic';

/**
 * A caixa conectada, vista de dentro do produto.
 *
 * Esta tela nao cria MED e nao interpreta e-mail: ela mostra o que a
 * ferramenta enxerga e deixa baixar a mensagem crua. E o passo honesto antes
 * do parser — as regras de extracao vao ser escritas contra um aviso de MED
 * real, nao contra um formato imaginado.
 */
export default async function GmailInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const auth = serverPageContext();
  const result = await readInbox(auth.organizationId, q);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <PageHeader
        parent={{ href: '/integracoes', label: 'Integrações' }}
        title="Caixa do Gmail"
        description="O que a ferramenta enxerga na caixa conectada. Nada aqui vira MED ainda: baixe a mensagem crua de um aviso real e ela vira o insumo do leitor."
      />

      <Panel title="Busca">
        <form className="flex flex-wrap items-center gap-2" method="get">
          <Input
            name="q"
            defaultValue={result.query}
            placeholder={DEFAULT_GMAIL_QUERY}
            aria-label="Busca do Gmail"
            className="min-w-64 flex-1"
          />
          <Button type="submit">Buscar</Button>
        </form>
        <p className="mt-2 text-muted-foreground text-sm">
          Exemplos: <code>from:med@seubanco.com.br</code>, <code>assunto:devolução</code>,{' '}
          <code>newer_than:7d</code>. Defina <code>GMAIL_QUERY</code> no ambiente para fixar a busca
          padrão.
        </p>
      </Panel>

      {result.ok ? (
        result.messages.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Nenhuma mensagem para esta busca</EmptyTitle>
              <EmptyDescription>
                A conexão funciona — a busca <code>{result.query}</code> é que não encontrou nada.
                Confira a mesma busca no Gmail para ver se o resultado bate.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Panel
            flush
            title={`${result.messages.length} mensagem${result.messages.length === 1 ? '' : 's'}`}
            footer="Mais novas primeiro. Baixar o .eml de um aviso real é o que permite escrever o leitor contra o formato de verdade."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recebida</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead className="text-right">Original</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.messages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTimeSmart(message.receivedAt) ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-56 truncate">{message.from ?? '—'}</TableCell>
                    <TableCell className="max-w-96">
                      <span className="block truncate font-medium">{message.subject ?? '—'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={`/api/integrations/gmail/message?id=${encodeURIComponent(message.id)}`}
                        >
                          Baixar .eml
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        )
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Não deu para ler a caixa</AlertTitle>
          <AlertDescription>
            <p>{result.reason}</p>
            <p>
              <Link className="underline" href="/integracoes">
                Voltar para Integrações
              </Link>
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
