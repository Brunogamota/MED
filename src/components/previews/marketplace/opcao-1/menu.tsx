'use client';

import * as React from 'react';
import { DropdownMenu as Primitive } from 'radix-ui';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { usePortalContainer } from './theme-root';

/**
 * Menu suspenso da Opção 1. Igual ao do shadcn, mas montado dentro do
 * invólucro da prévia — senão o menu sairia com a paleta global.
 */
export const Menu = Primitive.Root;
export const MenuTrigger = Primitive.Trigger;
export const MenuRadioGroup = Primitive.RadioGroup;

export function MenuContent({
  className,
  align = 'start',
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  const container = usePortalContainer();
  return (
    <Primitive.Portal container={container ?? undefined}>
      <Primitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-48 overflow-hidden rounded-[10px] border border-border bg-popover p-1 text-popover-foreground shadow-(--o1-shadow-lg)',
          'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}

const itemBase =
  'relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-foreground outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-(--o1-ink-3) focus:[&_svg]:text-accent-foreground';

export function MenuItem({ className, ...props }: React.ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item className={cn(itemBase, className)} {...props} />;
}

export function MenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.RadioItem>) {
  return (
    <Primitive.RadioItem className={cn(itemBase, 'pr-8', className)} {...props}>
      {children}
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <Primitive.ItemIndicator>
          <CheckIcon className="text-primary!" />
        </Primitive.ItemIndicator>
      </span>
    </Primitive.RadioItem>
  );
}

export function MenuLabel({ className, ...props }: React.ComponentProps<typeof Primitive.Label>) {
  return (
    <Primitive.Label
      className={cn(
        'px-2 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-(--o1-ink-3) uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Separator>) {
  return <Primitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}
