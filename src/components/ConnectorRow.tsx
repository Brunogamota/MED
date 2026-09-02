'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import {
  Banknote,
  CreditCard,
  FileSpreadsheet,
  Mail,
  ShoppingBag,
  ShoppingCart,
  Store,
  Users,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import {
  CONNECTOR_STATE_LABEL,
  type Connector,
  type ConnectorIcon,
} from '@/lib/connectors';
import { formatDateTime } from '@/lib/format';

/**
 * Uma fonte de dados, em linha.
 *
 * A chave não é enfeite: em fonte já ativa ela mostra o estado e não desliga
 * (não existe backend para desligar, e chave que não faz nada é pior que
 * chave nenhuma); em fonte disponível, ligar abre o fluxo de conexão.
 *
 * O formulário valida e confirma o recebimento, mas é honesto sobre o estado
 * do backend: a sincronização automática ainda não existe (TODO(api) em
 * docs/api-gaps.md) e nenhuma credencial é armazenada até lá.
 */
const ICONS: Record<ConnectorIcon, LucideIcon> = {
  gateway: Banknote,
  card: CreditCard,
  digital: ShoppingBag,
  members: Users,
  store: Store,
  cart: ShoppingCart,
  webhook: Webhook,
  csv: FileSpreadsheet,
  email: Mail,
};

export function ConnectorRow({ connector }: { connector: Connector }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const Icon = ICONS[connector.icon];
  const connected = connector.state === 'CONNECTED';

  return (
    // O contorno fica no invólucro, não no Item: o formulário de conexão é
    // irmão da linha, e dentro do Item ele disputaria espaço com as ações.
    <div className="rounded-lg border">
      <Item>
        <ItemMedia variant="icon" className="size-9 rounded-lg border bg-muted">
          <Icon className="text-muted-foreground" />
        </ItemMedia>

        <ItemContent>
          <ItemTitle>
            {connector.name}
            <Badge
              variant={connected ? 'secondary' : 'outline'}
              className={
                connected
                  ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
                  : ''
              }
            >
              {CONNECTOR_STATE_LABEL[connector.state]}
            </Badge>
          </ItemTitle>
          <ItemDescription>{connector.fills}</ItemDescription>
        </ItemContent>

        <ItemActions>
          <Switch
            checked={connected || open || submitted}
            disabled={connected}
            onCheckedChange={(value) => {
              if (connected) return;
              setOpen(value);
              if (!value) setSubmitted(false);
            }}
            aria-label={connected ? `${connector.name} ativo` : `Conectar ${connector.name}`}
            title={
              connected
                ? connector.lastSyncAt
                  ? `Última sincronização ${formatDateTime(connector.lastSyncAt)}`
                  : 'Ativo — recebe dados conforme chegam'
                : undefined
            }
          />
        </ItemActions>
      </Item>

      {submitted ? (
        <p className="border-t bg-amber-600/10 px-3 py-2.5 text-amber-700 text-xs dark:text-amber-400">
          Credenciais validadas. A sincronização automática deste conector ainda não está
          disponível — nada foi armazenado. Você será avisado quando a conexão for liberada.
        </p>
      ) : open ? (
        <form
          className="space-y-3 border-t px-3 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          {connector.credentials.map((credential) => (
            <div key={credential.name} className="grid gap-1.5">
              <Label htmlFor={`${connector.id}-${credential.name}`}>{credential.label}</Label>
              <Input
                id={`${connector.id}-${credential.name}`}
                name={credential.name}
                type={credential.kind === 'secret' ? 'password' : 'text'}
                required
                autoComplete="off"
              />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm">
              Validar conexão
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
