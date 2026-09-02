import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

/**
 * Cabeçalho de página: trilha, título, uma linha de contexto e as ações.
 *
 * Um lugar só para isso — antes cada tela desenhava o próprio, e elas
 * discordavam no tamanho do título e no espaçamento.
 */
export function PageHeader({
  title,
  description,
  parent,
  actions,
}: {
  title: string;
  description?: ReactNode;
  /** Tela anterior na trilha, quando esta é uma subtela. */
  parent?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {parent ? (
          <Breadcrumb className="mb-1">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={parent.href}>{parent.label}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
        <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-[75ch] text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
