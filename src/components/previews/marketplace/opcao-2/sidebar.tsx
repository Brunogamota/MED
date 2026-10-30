'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronsUpDown,
  FileUp,
  Hourglass,
  Inbox,
  LayoutDashboard,
  Menu,
  Plug,
  ScrollText,
  Send,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { RESUMO } from '@/components/previews/marketplace/fixtures';
import { BASE_HREF, eyebrow, serif } from './tokens';

/*
 * Navegação vertical adaptada do "Vertical Icon Tabs" (21st.dev #29794):
 * ícone + rótulo + contagem, e o indicador em linha no item ativo. Aqui são
 * links (é navegação entre telas, não abas de um mesmo painel), com
 * aria-current no ativo.
 */

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  count?: number;
  tone?: 'neutral' | 'alert';
}

const GRUPOS: { titulo: string; itens: NavItem[] }[] = [
  {
    titulo: 'Operação',
    itens: [
      { id: 'visao', label: 'Visão geral', icon: LayoutDashboard, href: '#' },
      { id: 'contestacoes', label: 'Contestações', icon: Inbox, href: BASE_HREF, count: RESUMO.emAberto },
      { id: 'vencendo', label: 'Vencendo', icon: Hourglass, href: '#', count: RESUMO.vencendo24h, tone: 'alert' },
    ],
  },
  {
    titulo: 'Entrada',
    itens: [
      { id: 'importar-meds', label: 'Importar MEDs', icon: FileUp, href: '#' },
      { id: 'importar-envios', label: 'Importar envios', icon: Send, href: '#' },
    ],
  },
  {
    titulo: 'Registros',
    itens: [{ id: 'comprovantes', label: 'Comprovantes', icon: ScrollText, href: `${BASE_HREF}/comprovante` }],
  },
  {
    titulo: 'Configuração',
    itens: [
      { id: 'conexoes', label: 'Conexões', icon: Plug, href: '#' },
      { id: 'equipe', label: 'Equipe', icon: Users, href: '#' },
    ],
  },
];

const fmt = new Intl.NumberFormat('pt-BR');

function Marca({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-[6px] bg-(--ed-brand) text-(--ed-surface)',
        className,
      )}
    >
      <ShieldCheck className="size-[18px]" strokeWidth={1.75} />
    </span>
  );
}

function SeletorDeConta() {
  return (
    <button
      type="button"
      aria-label="Trocar de conta — conta atual: Marketplace Verificado"
      className="group flex w-full items-center gap-3 rounded-[6px] border border-(--ed-rule) bg-(--ed-surface) p-2.5 text-left transition-colors hover:border-(--ed-rule-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ed-brand)"
    >
      <Marca />
      <span className="min-w-0 flex-1">
        <span className={cn(serif, 'block truncate text-[15px] leading-tight font-medium')}>
          Marketplace Verificado
        </span>
        <span className="mt-0.5 block text-[12px] text-(--ed-ink-2)">Conta ativa</span>
      </span>
      <ChevronsUpDown className="size-4 shrink-0 text-(--ed-ink-3) group-hover:text-(--ed-ink-2)" />
    </button>
  );
}

function ListaDeNavegacao({ ativo, onNavigate }: { ativo: string; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col gap-7">
      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo}>
          <p className={cn(eyebrow, 'mb-2 px-3.5 text-[10.5px] text-(--ed-ink-3)')}>{grupo.titulo}</p>
          <ul className="flex flex-col gap-0.5">
            {grupo.itens.map((item) => {
              const Icone = item.icon;
              const isAtivo = item.id === ativo;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isAtivo ? 'page' : undefined}
                    className={cn(
                      'relative flex h-9 items-center gap-3 rounded-[4px] pr-2.5 pl-3.5 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--ed-brand)',
                      isAtivo
                        ? 'font-medium text-(--ed-ink)'
                        : 'text-(--ed-ink-2) hover:bg-(--ed-hover) hover:text-(--ed-ink)',
                    )}
                  >
                    {isAtivo && (
                      <span
                        aria-hidden
                        className="absolute top-1.5 bottom-1.5 left-0 w-[2px] rounded-full bg-(--ed-brand)"
                      />
                    )}
                    <Icone
                      className={cn('size-[17px] shrink-0', isAtivo ? 'text-(--ed-brand)' : 'text-(--ed-ink-3)')}
                      strokeWidth={1.75}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.count !== undefined && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-px text-[11.5px] font-medium tabular-nums',
                          item.tone === 'alert'
                            ? 'bg-(--ed-amber-soft) text-(--ed-amber-ink)'
                            : isAtivo
                              ? 'bg-(--ed-brand-soft) text-(--ed-brand-hover)'
                              : 'bg-(--ed-muted) text-(--ed-ink-2)',
                        )}
                      >
                        {fmt.format(item.count)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function Sidebar({ ativo = 'contestacoes' }: { ativo?: string }) {
  const [aberto, setAberto] = useState(false);
  const painelId = useId();

  return (
    <>
      {/* Desktop: trilho largo sobre o papel */}
      <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 flex-col border-r border-(--ed-rule) bg-(--ed-paper) lg:flex">
        <div className="px-4 pt-5 pb-6">
          <SeletorDeConta />
        </div>
        <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 pb-6">
          <ListaDeNavegacao ativo={ativo} />
        </nav>
        <div className="border-t border-(--ed-rule) px-6 py-4">
          <p className={cn(serif, 'text-[13px] text-(--ed-ink-2) italic')}>Defesa de MED</p>
        </div>
      </aside>

      {/* Celular: barra superior e menu em gaveta inline */}
      <div className="sticky top-0 z-30 border-b border-(--ed-rule) bg-(--ed-paper)/95 backdrop-blur-sm lg:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <Marca className="size-8" />
          <span className={cn(serif, 'flex-1 truncate text-[16px] font-medium')}>Marketplace Verificado</span>
          <button
            type="button"
            aria-expanded={aberto}
            aria-controls={painelId}
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setAberto((v) => !v)}
            className="grid size-9 place-items-center rounded-[6px] border border-(--ed-rule) bg-(--ed-surface) text-(--ed-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ed-brand)"
          >
            {aberto ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {aberto && (
            <motion.nav
              id={painelId}
              aria-label="Principal"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
              className="overflow-hidden border-t border-(--ed-rule)"
            >
              <div className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto px-3 py-5">
                <ListaDeNavegacao ativo={ativo} onNavigate={() => setAberto(false)} />
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
