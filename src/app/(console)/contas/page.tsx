import { PageHeader } from '@/components/layout/page-header';
import { SKINS } from '@/config/skins';
import { getActiveAccount, listAccounts } from '@/services/accountService';
import Link from 'next/link';
import { saveAccountAliasesAction, switchAccountAction } from './actions';
import { CreateAccountForm } from './CreateAccountForm';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

/**
 * Contas: cada uma é um cliente, com os próprios MEDs e o próprio ambiente.
 * Nada de uma aparece na outra — a conta é a organização que isola os dados.
 */
export default async function ContasPage() {
  const [accounts, active] = await Promise.all([listAccounts(), getActiveAccount()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contas"
        description="Cada conta é um cliente: MEDs, evidências e comprovantes separados, e um ambiente visual próprio."
      />

      <section data-bulls-surface className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 text-card-foreground">
        <div>
          <h2 className="font-medium">Conta Master</h2>
          <p className="text-muted-foreground text-sm">
            Importa, registra envios e monta o lote de defesa de todas as empresas de uma vez, cada MED na sua conta.
          </p>
        </div>
        <Button asChild>
          <Link href="/master">Abrir a Master</Link>
        </Button>
      </section>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => {
          const ativa = account.id === active.id;
          return (
            <li
              key={account.id}
              data-bulls-surface
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{account.name}</p>
                <p className="text-muted-foreground text-sm">
                  Ambiente {SKINS[account.skin].label}
                  {account.isDefault ? ' · conta principal' : ''}
                </p>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">
                  Como a Master reconhece esta empresa ({account.aliases.length})
                </summary>
                <form action={saveAccountAliasesAction} className="mt-2 grid gap-2">
                  <input type="hidden" name="conta" value={account.id} />
                  <textarea
                    name="apelidos"
                    rows={4}
                    defaultValue={account.aliases.join('\n')}
                    aria-label={`Apelidos de ${account.name}`}
                    placeholder={'doc:12.345.678/0001-90\nprefixo:BLS-\nNome como vem na planilha'}
                    className="rounded-md border bg-background px-3 py-2 font-mono text-xs"
                  />
                  <p className="text-muted-foreground text-xs">
                    Um por linha. CNPJ ou chave Pix com <code>doc:</code>, prefixo do pedido com <code>prefixo:</code>;
                    o resto vale como nome. O nome da conta já conta.
                  </p>
                  <Button type="submit" variant="outline" size="sm">
                    Salvar
                  </Button>
                </form>
              </details>
              {ativa ? (
                <p className="text-sm">Você está nesta conta.</p>
              ) : (
                <form action={switchAccountAction}>
                  <input type="hidden" name="conta" value={account.id} />
                  <Button type="submit" variant="outline" className="w-full">
                    Entrar
                  </Button>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      <section data-bulls-surface className="rounded-xl border bg-card p-4 text-card-foreground">
        <h2 className="mb-3 font-medium">Nova conta</h2>
        <CreateAccountForm />
      </section>
    </div>
  );
}
