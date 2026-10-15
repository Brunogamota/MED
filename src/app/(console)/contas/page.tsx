import { PageHeader } from '@/components/layout/page-header';
import { SKINS } from '@/config/skins';
import { getActiveAccount, listAccounts } from '@/services/accountService';
import { switchAccountAction } from './actions';
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

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => {
          const ativa = account.id === active.id;
          return (
            <li
              key={account.id}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{account.name}</p>
                <p className="text-muted-foreground text-sm">
                  Ambiente {SKINS[account.skin].label}
                  {account.isDefault ? ' · conta principal' : ''}
                </p>
              </div>
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

      <section className="rounded-xl border bg-card p-4 text-card-foreground">
        <h2 className="mb-3 font-medium">Nova conta</h2>
        <CreateAccountForm />
      </section>
    </div>
  );
}
