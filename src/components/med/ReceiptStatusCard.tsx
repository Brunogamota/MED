import { CheckCircle2, FileText, Mail, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Evidence } from '@/domain/types';
import { formatDateTimeSmart } from '@/lib/format';

/**
 * Estado dos comprovantes de comunicação do caso.
 *
 * Diz de relance se já existe peça gerada e leva à última para imprimir. O
 * bloco de ajuda repete o que o comprovante é e o que ele não é — a mesma
 * ressalva do selo, no lugar onde a peça é criada, e não só depois de pronta.
 */
export function ReceiptStatusCard({
  medId,
  reconstructions,
}: {
  medId: string;
  reconstructions: Evidence[];
}) {
  const latest = reconstructions[reconstructions.length - 1];
  const generatedAt = latest ? formatDateTimeSmart(latest.receivedAt) : null;

  return (
    <Card className="w-full max-w-sm shadow-xs">
      <CardHeader>
        <CardTitle>
          {latest
            ? `${reconstructions.length} comprovante${reconstructions.length > 1 ? 's' : ''} gerado${reconstructions.length > 1 ? 's' : ''}`
            : 'Nenhum comprovante gerado'}
        </CardTitle>
        <CardDescription>
          {latest
            ? `O último foi montado ${generatedAt ?? 'sem data registrada'} e já consta como evidência do caso.`
            : 'Monte abaixo a reconstrução da mensagem que o estabelecimento enviou ao cliente. Ela entra no caso como evidência documental.'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col items-center gap-6">
          <span
            aria-hidden
            className={
              latest
                ? 'flex size-16 items-center justify-center rounded-full bg-emerald-600/10'
                : 'flex size-16 items-center justify-center rounded-full bg-muted'
            }
          >
            {latest ? (
              <CheckCircle2 className="size-8 text-emerald-700 dark:text-emerald-400" />
            ) : (
              <Mail className="size-8 text-muted-foreground" />
            )}
          </span>

          <div className="flex w-full flex-col gap-4">
            <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-4">
              <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-col gap-1">
                <p className="font-medium text-sm">O que sai daqui</p>
                <p className="text-muted-foreground text-xs">
                  Uma representação do painel de envios, montada com os dados do caso e com selo
                  de reconstrução. Não é captura do painel real, e nada é preenchido por
                  suposição.
                </p>
              </div>
            </div>

            {latest ? (
              <Button asChild variant="outline" className="w-full">
                <a
                  href={`/meds/${medId}/comprovante/${latest.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Printer data-icon="inline-start" />
                  Abrir o último para imprimir
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
