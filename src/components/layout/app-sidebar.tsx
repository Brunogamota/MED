'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { APP_CONFIG } from '@/config/app';
import { NavMain, type NavCounts } from '@/components/layout/nav-main';
import { NavUser } from '@/components/layout/nav-user';

export function AppSidebar({
  counts,
  organization,
  demoMode,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  counts: NavCounts;
  organization: string;
  demoMode: boolean;
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <ShieldCheck />
                <span className="font-semibold text-base">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain counts={counts} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser organization={organization} demoMode={demoMode} />
      </SidebarFooter>
    </Sidebar>
  );
}
