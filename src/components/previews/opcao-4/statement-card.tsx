/*
 * Adaptado do 21st.dev 3257 "Card" (HextaUI): Card / CardHeader / CardTitle /
 * CardDescription / CardContent / CardFooter com variantes por `cva`.
 *
 * Ganhou a variante `document` — folha branca de extrato, impressa como peça
 * externa. Por ser comprovante, é o único lugar desta opção com cor literal
 * (regra do projeto): a folha precisa sair igual no papel, com qualquer tema.
 */

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/cn';

const cardVariants = cva('relative overflow-hidden rounded-[10px] transition-colors', {
  variants: {
    variant: {
      default: 'border border-border bg-card text-card-foreground',
      document:
        'border border-[#E4E4E7] bg-white text-[#18181B] shadow-[0_1px_0_rgb(255_255_255/0.04),0_24px_64px_-24px_rgb(0_0_0/0.7)] print:rounded-none print:border-0 print:shadow-none',
    },
    size: {
      sm: 'p-4',
      default: 'p-6',
      document: 'px-5 py-6 sm:px-10 sm:py-9',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export function Card({ className, variant, size, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant, size }), className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-2', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn('text-[18px] font-semibold leading-6 tracking-[-0.01em]', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-[13px] leading-5', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-between gap-4', className)} {...props} />;
}
