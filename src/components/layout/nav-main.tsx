'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { NAV_GROUPS, type NavItem } from '@/navigation/sidebar-items';

export interface NavCounts {
  open: number;
  dueSoon: number;
  submitted: number;
  /** Algum MED com menos de 24h de prazo — tinge o contador de "Vencendo". */
  hasUrgent: boolean;
}

function NavItems({ counts }: { counts: NavCounts }) {
  const pathname = usePathname();
  const view = useSearchParams().get('view');

  const isActive = (item: NavItem): boolean => {
    if (!item.url) return false;
    const path = item.url.split('?')[0];
    if (pathname !== path) return false;
    // "Todos" e "Vencendo" apontam para /meds: o que separa os dois é a view.
    return (item.view ?? null) === (path === '/meds' ? view : null);
  };

  return (
    <>
      {NAV_GROUPS.map((group) => (
        <SidebarGroup key={group.id}>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
            {group.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon;
                const count = item.countKey ? counts[item.countKey] : 0;

                return (
                  <SidebarMenuItem key={item.id}>
                    {item.url ? (
                      <SidebarMenuButton asChild tooltip={item.title} isActive={isActive(item)}>
                        <Link href={item.url}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton tooltip={item.title} className="cursor-default">
                        <Icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    )}

                    {item.badge ? (
                      <SidebarMenuBadge className="rounded-sm border border-muted-foreground/40 text-[10px] text-muted-foreground capitalize">
                        {item.badge}
                      </SidebarMenuBadge>
                    ) : null}

                    {!item.badge && count > 0 ? (
                      <SidebarMenuBadge
                        className={
                          item.countKey === 'dueSoon' && counts.hasUrgent
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        }
                      >
                        {count}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

export function NavMain({ counts }: { counts: NavCounts }) {
  // useSearchParams exige limite de Suspense para nao optar a rota inteira
  // para renderizacao dinamica.
  return (
    <Suspense fallback={null}>
      <NavItems counts={counts} />
    </Suspense>
  );
}
