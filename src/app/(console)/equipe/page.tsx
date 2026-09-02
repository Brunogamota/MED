import { KeyRound, MonitorCog } from 'lucide-react';
import { serverPageContext } from '@/infra/auth/context';
import { getConfig } from '@/lib/env';
import { buildAccessList, type AccessEntry } from '@/lib/team';
import { PERMISSION_LABEL, ROLE_LABEL } from '@/lib/labels';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { MonoId, SubtleBadge } from '@/components/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

/**
 * Equipe — quem tem acesso a esta organização.
 *
 * Não é uma lista de pessoas, e não poderia ser: o produto não tem cadastro de
 * usuário. Quem autentica é uma chave de API, cada uma com o seu papel, ou a
 * senha única do console. Então a tela lista credenciais reais em vez de nomes,
 * fotos e datas de entrada que ninguém cadastrou.
 *
 * A coluna "Pode fazer" sai da mesma tabela que o backend consulta a cada
 * requisição (`src/infra/auth/rbac.ts`) — se ela mudar lá, muda aqui.
 */

const KIND_LABEL: Record<AccessEntry['kind'], string> = {
  CONSOLE: 'Login do console',
  API_KEY: 'Chave de API',
};

const KIND_HINT: Record<AccessEntry['kind'], string> = {
  CONSOLE: 'Senha única, usada para entrar nestas telas',
  API_KEY: 'Integrações e chamadas de servidor',
};

function KindIcon({ kind }: { kind: AccessEntry['kind'] }) {
  const Icon = kind === 'CONSOLE' ? MonitorCog : KeyRound;
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground">
      <Icon aria-hidden className="size-4" />
    </span>
  );
}

export default function EquipePage() {
  const auth = serverPageContext();
  const access = buildAccessList(getConfig(), auth.organizationId);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="Equipe"
        description={
          <>
            Quem tem acesso a <MonoId value={auth.organizationId} />. O produto não tem cadastro de
            pessoas: quem autentica é uma chave de API ou a senha do console, e é isso que a
            auditoria grava como autor de cada ação.
          </>
        }
      />

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-9 pl-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Acesso
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Papel
              </TableHead>
              <TableHead className="h-9 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pode fazer
              </TableHead>
              <TableHead className="h-9 pr-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Situação
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {access.map((entry) => (
              <TableRow key={entry.id} className="border-b transition-colors last:border-b-0">
                <TableCell className="py-3 pl-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <KindIcon kind={entry.kind} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium leading-tight">
                        {KIND_LABEL[entry.kind]}
                        {entry.reference ? (
                          <span className="font-mono text-muted-foreground text-xs tabular-nums">
                            {entry.reference}
                          </span>
                        ) : null}
                        {entry.foreignOrganization ? (
                          <SubtleBadge tone="warning">Outra organização</SubtleBadge>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {KIND_HINT[entry.kind]} · autor <span className="font-mono">{entry.actor}</span>
                        {entry.foreignOrganization ? ` · ${entry.organizationId}` : ''}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant={entry.role === 'OWNER' ? 'default' : 'secondary'}>
                    {ROLE_LABEL[entry.role]}
                  </Badge>
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex flex-wrap gap-1">
                    {entry.permissions.map((permission) => (
                      <Badge key={permission} variant="outline" className="font-normal">
                        {PERMISSION_LABEL[permission]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="py-3 pr-4 text-right">
                  {entry.active ? (
                    <SubtleBadge tone="success">Ativo</SubtleBadge>
                  ) : (
                    <SubtleBadge tone="warning">Desligado</SubtleBadge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{access.length}</span>{' '}
            {access.length === 1 ? 'acesso configurado' : 'acessos configurados'}
          </p>
          <p className="text-xs text-muted-foreground">
            Acesso se concede pelas variáveis <span className="font-mono">API_KEYS</span> e{' '}
            <span className="font-mono">ADMIN_PASSWORD_HASH</span> — ver{' '}
            <span className="font-mono">docs/DEPLOYMENT.md</span>.
          </p>
        </div>
      </div>

      {access.some((entry) => !entry.active) ? (
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          {access
            .filter((entry) => entry.inactiveReason)
            .map((entry) => (
              <li key={entry.id}>
                <span className="font-medium text-foreground">{KIND_LABEL[entry.kind]}:</span>{' '}
                {entry.inactiveReason}
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}
