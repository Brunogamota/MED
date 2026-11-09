import type { CSSProperties, ReactNode } from 'react';
import { COMMUNICATION_TEMPLATE_LABEL, type ClientEmailView } from '@/domain/communication/receipt';
import type { AutoLayout } from '@/domain/master/company';

/**
 * Comprovante do modelo automático — empresa criada pela conta Master, sem
 * ambiente desenhado.
 *
 * Seis desenhos, e cada empresa nova fica com um que as outras ainda não
 * usam, além da própria cor. Cada um segue um gênero de documento que quem
 * recebe já conhece e em que confia — extrato de banco, recibo de pagamento,
 * e-mail impresso, formulário, comprovante de aplicativo, recibo enxuto —, e
 * não um enfeite inventado: tipografia sóbria, filetes finos, a cor da marca
 * só na marca e no botão que o e-mail tinha.
 *
 * Todos mostram a mesma coisa: a ficha do envio, a mensagem enviada e a
 * declaração de origem — só a mensagem, sem etapas do pedido, como nos outros
 * ambientes. Nenhum selo de autenticidade: o registro não afirma isso.
 *
 * Cor literal porque a peça vai impressa e representa documento externo. A
 * cor da marca entra por variável de estilo, validada como `#rrggbb`.
 *
 * Só dado real: tudo sai do `view` (a evidência gravada), do end-to-end do
 * caso e do id da mensagem, quando registrado. O destino do botão segue no
 * link e não é impresso. A declaração de origem é parte da peça. Nunca remova.
 */

const FALLBACK = '#334155';

function brand(color: string | null | undefined): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : FALLBACK;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  if (words.length === 1) return (words[0] ?? '').slice(0, 2).toUpperCase();
  return `${words[0]?.[0] ?? ''}${words[words.length - 1]?.[0] ?? ''}`.toUpperCase();
}

interface Props {
  view: ClientEmailView;
  sourceReference?: string | null;
  endToEndId?: string | null;
}

type LayoutProps = Props & { color: string };

const MISSING = <span className="text-[#9ca3af]">não informado</span>;

function recipient(view: ClientEmailView): ReactNode {
  if (!view.toName && !view.to) return MISSING;
  return (
    <>
      {view.toName ? <span className="text-[#111827]">{view.toName}</span> : null}
      {view.toName && view.to ? ' ' : null}
      {view.to ? <span className="break-all text-[#4b5563]">{view.toName ? `<${view.to}>` : view.to}</span> : null}
    </>
  );
}

function e2e(endToEndId: string | null | undefined): ReactNode {
  // Sempre presente: "não informado" é honesto; o campo sumir não.
  return endToEndId ? <span className="font-mono text-[12.5px] break-all">{endToEndId}</span> : MISSING;
}

/** A marca da empresa: quadrado com as iniciais, como o logo de quem não mandou logo. */
function Mark({ name, size = 32, radius = 7 }: { name: string; size?: number; radius?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, borderRadius: radius, fontSize: Math.round(size * 0.36) }}
      className="inline-flex shrink-0 items-center justify-center bg-(--marca) font-semibold tracking-[0.02em] text-white"
    >
      {initials(name)}
    </span>
  );
}

function Body({ view, className = '' }: { view: ClientEmailView; className?: string }) {
  return (
    <div className={`space-y-3 text-[14.5px] leading-[1.65] text-[#374151] [&>p:first-child]:text-[#111827] ${className}`}>
      {view.paragraphs.length > 0 ? (
        view.paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))
      ) : (
        <p className="text-[#9ca3af]">Sem conteúdo.</p>
      )}
    </div>
  );
}

/** O botão (ou a nota) que a mensagem trazia, como o e-mail mostrava. */
function Action({ view, className = '' }: { view: ClientEmailView; className?: string }) {
  const action = view.action;
  if (!action) return null;
  if (action.kind === 'NOTE') {
    return (
      <div className={`inline-flex max-w-full flex-col rounded-[6px] border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 ${className}`}>
        <span className="text-[12px] text-[#6b7280]">{action.valueLabel}</span>
        <span className="mt-0.5 font-mono text-[13.5px] break-all text-[#111827]">{action.value}</span>
      </div>
    );
  }
  const look = `inline-flex h-10 items-center rounded-[6px] bg-(--marca) px-5 text-[14px] font-semibold text-white no-underline ${className}`;
  return action.href ? (
    <a href={action.href} target="_blank" rel="noopener noreferrer" className={look}>
      {action.label}
    </a>
  ) : (
    <span className={look}>{action.label}</span>
  );
}

/** O e-mail como chegou: assunto, texto e botão. */
function Email({ view, className = '' }: { view: ClientEmailView; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[18px] leading-snug font-semibold text-[#111827]">{view.subject || 'Sem assunto'}</p>
      <Body view={view} className="mt-3" />
      <Action view={view} className="mt-5" />
    </div>
  );
}

function Shell({ color, className, children }: { color: string; className: string; children: ReactNode }) {
  return (
    <article
      aria-label="Comprovante de envio"
      style={{ '--marca': color } as CSSProperties}
      className={`@container bg-white font-sans text-[#111827] antialiased [print-color-adjust:exact] print:shadow-none ${className}`}
    >
      {children}
    </article>
  );
}

function Row({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="grid gap-0.5 py-2.5 @[560px]:grid-cols-[170px_minmax(0,1fr)] @[560px]:gap-6">
      <dt className="text-[13px] text-[#6b7280]">{label}</dt>
      <dd className={`min-w-0 text-[13.5px] text-[#111827] ${mono ? 'font-mono text-[12.5px] break-all' : ''}`}>{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extrato — comprovante de banco: data em destaque, linhas com filete fino
// ---------------------------------------------------------------------------

function Extrato({ view, sourceReference, endToEndId, color }: LayoutProps) {
  return (
    <Shell color={color} className="border border-[#e5e7eb] border-t-[3px] border-t-(--marca)">
      <header className="flex items-center justify-between gap-4 px-8 pt-7 pb-6 @[620px]:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <Mark name={view.from} />
          <span className="truncate text-[15px] font-semibold">{view.from}</span>
        </div>
        <span className="text-[13px] text-[#6b7280]">{COMMUNICATION_TEMPLATE_LABEL[view.template]}</span>
      </header>
      <div className="border-t border-[#e5e7eb] px-8 py-7 @[620px]:px-10">
        <p className="text-[13px] text-[#6b7280]">Comprovante de envio de e-mail</p>
        <p className="mt-1 text-[26px] leading-tight font-semibold tracking-[-0.01em] tabular-nums">
          {view.sentAtLabel ?? 'Data de envio não informada'}
        </p>
        <dl className="mt-6 divide-y divide-[#f0f1f3] border-y border-[#e5e7eb]">
          <Row label="Para">{recipient(view)}</Row>
          <Row label="De">{view.from}</Row>
          <Row label="Canal">E-mail</Row>
          <Row label="End-to-end da transação">{e2e(endToEndId)}</Row>
          {sourceReference ? (
            <Row label="ID da mensagem" mono>
              {sourceReference}
            </Row>
          ) : null}
        </dl>
      </div>
      <section aria-label="Mensagem enviada" className="px-8 pb-8 @[620px]:px-10">
        <p className="mb-3 text-[13px] font-semibold text-[#111827]">Conteúdo enviado</p>
        <Email view={view} className="rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] px-6 py-6" />
      </section>
      <footer className="border-t border-[#e5e7eb] px-8 py-4 @[620px]:px-10">
        <p className="text-[12px] text-[#6b7280]">{view.stamp}</p>
      </footer>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Recibo — recibo de pagamento: cartão estreito, resumo em três colunas
// ---------------------------------------------------------------------------

function Recibo({ view, sourceReference, endToEndId, color }: LayoutProps) {
  const label = 'text-[11px] font-semibold tracking-[0.06em] text-[#8792a2] uppercase';
  return (
    <div className="bg-[#f6f8fa] px-4 py-8">
      <Shell color={color} className="mx-auto w-full max-w-[620px] rounded-[8px] shadow-[0_1px_3px_rgb(16_24_40/0.08),0_8px_24px_-12px_rgb(16_24_40/0.12)]">
        <div className="px-9 pt-9 pb-7 text-center">
          <Mark name={view.from} size={44} radius={10} />
          <p className="mt-4 text-[15px] text-[#4b5563]">{view.from}</p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.01em]">Comprovante de envio</h2>
        </div>
        <dl className="mx-9 grid grid-cols-1 gap-4 border-y border-[#e6ebf1] py-5 @[520px]:grid-cols-3">
          <div>
            <dt className={label}>Enviado em</dt>
            <dd className="mt-1 text-[13.5px] tabular-nums">{view.sentAtLabel ?? MISSING}</dd>
          </div>
          <div>
            <dt className={label}>Canal</dt>
            <dd className="mt-1 text-[13.5px]">E-mail</dd>
          </div>
          <div className="min-w-0">
            <dt className={label}>Tipo</dt>
            <dd className="mt-1 text-[13.5px]">{COMMUNICATION_TEMPLATE_LABEL[view.template]}</dd>
          </div>
        </dl>
        <section aria-label="Mensagem enviada" className="px-9 py-7">
          <p className={label}>Mensagem</p>
          <p className="mt-2 text-[13px] text-[#4b5563]">Para {recipient(view)}</p>
          <Email view={view} className="mt-4 rounded-[6px] border border-[#e6ebf1] px-6 py-6" />
        </section>
        <section aria-label="Registro" className="px-9 pb-8">
          <p className={label}>Registro</p>
          <dl className="mt-2 divide-y divide-[#e6ebf1] text-[13.5px]">
            <div className="flex justify-between gap-6 py-2.5">
              <dt className="text-[#4b5563]">Remetente</dt>
              <dd className="text-right">{view.from}</dd>
            </div>
            <div className="flex justify-between gap-6 py-2.5">
              <dt className="shrink-0 text-[#4b5563]">End-to-end</dt>
              <dd className="text-right">{e2e(endToEndId)}</dd>
            </div>
            {sourceReference ? (
              <div className="flex justify-between gap-6 py-2.5">
                <dt className="shrink-0 text-[#4b5563]">ID da mensagem</dt>
                <dd className="text-right font-mono text-[12.5px] break-all">{sourceReference}</dd>
              </div>
            ) : null}
          </dl>
        </section>
        <footer className="rounded-b-[8px] border-t border-[#e6ebf1] bg-[#fafbfc] px-9 py-4 text-center">
          <p className="text-[12px] text-[#8792a2]">{view.stamp}</p>
        </footer>
      </Shell>
    </div>
  );
}

// ---------------------------------------------------------------------------
// E-mail impresso — como sai a impressão de um e-mail: cabeçalho De/Para/Data
// ---------------------------------------------------------------------------

function EmailImpresso({ view, sourceReference, endToEndId, color }: LayoutProps) {
  return (
    <Shell color={color} className="px-10 py-9">
      <header className="flex items-end justify-between gap-4 border-b-2 border-[#111827] pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Mark name={view.from} size={26} radius={5} />
          <span className="truncate text-[16px] font-bold">{view.from}</span>
        </div>
        <span className="text-[12.5px] text-[#4b5563]">Comprovante de envio</span>
      </header>
      <h2 className="mt-6 text-[21px] leading-snug font-bold">{view.subject || 'Sem assunto'}</h2>
      <div className="mt-5 border-t border-[#d1d5db] pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="text-[14px]">
            <span className="font-bold">{view.from}</span>
          </p>
          <p className="text-[12.5px] text-[#4b5563] tabular-nums">{view.sentAtLabel ?? 'data não informada'}</p>
        </div>
        <p className="mt-0.5 text-[12.5px] text-[#4b5563]">Para: {recipient(view)}</p>
        <Body view={view} className="mt-6" />
        <Action view={view} className="mt-5" />
      </div>
      <dl className="mt-9 grid grid-cols-1 gap-x-8 gap-y-2 border-t border-[#d1d5db] pt-4 text-[12.5px] @[560px]:grid-cols-[auto_minmax(0,1fr)]">
        <dt className="text-[#6b7280]">Canal</dt>
        <dd>E-mail · {COMMUNICATION_TEMPLATE_LABEL[view.template]}</dd>
        <dt className="text-[#6b7280]">End-to-end da transação</dt>
        <dd>{e2e(endToEndId)}</dd>
        {sourceReference ? (
          <>
            <dt className="text-[#6b7280]">ID da mensagem</dt>
            <dd className="font-mono break-all">{sourceReference}</dd>
          </>
        ) : null}
      </dl>
      <p className="mt-6 text-[11.5px] text-[#6b7280]">{view.stamp}</p>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Formulário — documento oficial: grade de campos, rótulo pequeno em cada caixa
// ---------------------------------------------------------------------------

function Cell({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 border-[#9ca3af] px-3 pt-1.5 pb-2 ${className}`}>
      <p className="text-[9.5px] font-semibold tracking-[0.06em] text-[#4b5563] uppercase">{label}</p>
      <div className="mt-0.5 text-[13px] text-[#111827]">{children}</div>
    </div>
  );
}

function Formulario({ view, sourceReference, endToEndId, color }: LayoutProps) {
  return (
    <Shell color={color} className="p-8">
      <div className="border border-[#9ca3af]">
        <div className="grid grid-cols-1 border-b border-[#9ca3af] @[560px]:grid-cols-[minmax(0,1fr)_260px]">
          <div className="flex items-center gap-3 px-3 py-3 @[560px]:border-r @[560px]:border-[#9ca3af]">
            <Mark name={view.from} size={38} radius={4} />
            <div className="min-w-0">
              <p className="truncate text-[16px] font-bold">{view.from}</p>
              <p className="text-[12px] text-[#4b5563]">Remetente da comunicação</p>
            </div>
          </div>
          <div className="flex flex-col justify-center px-3 py-3">
            <p className="text-[14px] font-bold tracking-[0.02em] uppercase">Comprovante de envio</p>
            <p className="text-[12px] text-[#4b5563]">{COMMUNICATION_TEMPLATE_LABEL[view.template]}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 @[560px]:grid-cols-2">
          <Cell label="Destinatário" className="border-b @[560px]:col-span-2">
            {recipient(view)}
          </Cell>
          <Cell label="Data e hora do envio" className="border-b @[560px]:border-r">
            <span className="tabular-nums">{view.sentAtLabel ?? MISSING}</span>
          </Cell>
          <Cell label="Canal" className="border-b">
            E-mail
          </Cell>
          <Cell label="End-to-end da transação" className={`border-b ${sourceReference ? '@[560px]:border-r' : '@[560px]:col-span-2'}`}>
            {e2e(endToEndId)}
          </Cell>
          {sourceReference ? (
            <Cell label="ID da mensagem" className="border-b">
              <span className="font-mono text-[12.5px] break-all">{sourceReference}</span>
            </Cell>
          ) : null}
          <Cell label="Conteúdo da mensagem" className="border-b @[560px]:col-span-2">
            <Email view={view} className="py-3" />
          </Cell>
          <Cell label="Origem do documento" className="@[560px]:col-span-2">
            <span className="text-[12px] text-[#4b5563]">{view.stamp}</span>
          </Cell>
        </div>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Comprovante de aplicativo — coluna estreita, blocos separados por faixa cinza
// ---------------------------------------------------------------------------

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-6 py-5">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[12.5px] text-[#6b7280]">{label}</p>
      <div className="text-[14px] text-[#111827]">{children}</div>
    </div>
  );
}

function Aplicativo({ view, sourceReference, endToEndId, color }: LayoutProps) {
  const gap = <div aria-hidden="true" className="h-2 bg-[#f2f3f5]" />;
  return (
    <div className="bg-white py-4">
      <Shell color={color} className="mx-auto w-full max-w-[520px] border border-[#e5e7eb]">
        <header className="px-6 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <Mark name={view.from} size={36} radius={18} />
            <span className="truncate text-[14px] font-medium text-[#374151]">{view.from}</span>
          </div>
          <h2 className="mt-5 text-[24px] leading-tight font-semibold tracking-[-0.01em]">Comprovante de envio</h2>
          <p className="mt-1 text-[14px] text-[#6b7280] tabular-nums">{view.sentAtLabel ?? 'Data de envio não informada'}</p>
        </header>
        {gap}
        <Block title="Destinatário">
          <Item label="Nome e e-mail">{recipient(view)}</Item>
          <Item label="Canal">E-mail</Item>
        </Block>
        {gap}
        <Block title="Mensagem">
          <Email view={view} />
        </Block>
        {gap}
        <Block title="Registro">
          <Item label="Remetente">{view.from}</Item>
          <Item label="Tipo">{COMMUNICATION_TEMPLATE_LABEL[view.template]}</Item>
          <Item label="End-to-end da transação">{e2e(endToEndId)}</Item>
          {sourceReference ? (
            <Item label="ID da mensagem">
              <span className="font-mono text-[12.5px] break-all">{sourceReference}</span>
            </Item>
          ) : null}
        </Block>
        {gap}
        <footer className="px-6 py-4">
          <p className="text-[12px] text-[#6b7280]">{view.stamp}</p>
        </footer>
      </Shell>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enxuto — recibo de loja grande: muito branco, título largo, filete de citação
// ---------------------------------------------------------------------------

function Enxuto({ view, sourceReference, endToEndId, color }: LayoutProps) {
  const pair = (label: string, value: ReactNode) => (
    <div className="min-w-0">
      <dt className="text-[12.5px] text-[#86868b]">{label}</dt>
      <dd className="mt-0.5 text-[14px] text-[#1d1d1f]">{value}</dd>
    </div>
  );
  return (
    <Shell color={color} className="px-10 py-10 @[620px]:px-14">
      <div className="flex items-center justify-between gap-4">
        <Mark name={view.from} size={30} radius={8} />
        <span className="text-[13px] text-[#86868b]">{view.from}</span>
      </div>
      <h2 className="mt-10 text-[32px] leading-tight font-semibold tracking-[-0.02em] text-[#1d1d1f]">Comprovante de envio</h2>
      <p className="mt-1 text-[15px] text-[#86868b] tabular-nums">{view.sentAtLabel ?? 'Data de envio não informada'}</p>
      <dl className="mt-9 grid grid-cols-1 gap-x-10 gap-y-5 border-t border-[#d2d2d7] pt-6 @[560px]:grid-cols-2">
        {pair('Para', recipient(view))}
        {pair('De', view.from)}
        {pair('Canal', 'E-mail')}
        {pair('Tipo', COMMUNICATION_TEMPLATE_LABEL[view.template])}
        {pair('End-to-end da transação', e2e(endToEndId))}
        {sourceReference ? pair('ID da mensagem', <span className="font-mono text-[12.5px] break-all">{sourceReference}</span>) : null}
      </dl>
      <section aria-label="Mensagem enviada" className="mt-9 border-t border-[#d2d2d7] pt-6">
        <p className="text-[12.5px] text-[#86868b]">Mensagem enviada</p>
        <Email view={view} className="mt-4 border-l-2 border-(--marca) pl-6" />
      </section>
      <p className="mt-10 border-t border-[#d2d2d7] pt-4 text-[12px] text-[#86868b]">{view.stamp}</p>
    </Shell>
  );
}

/**
 * As chaves são as gravadas na conta (`brandLayout`); os nomes de cada
 * desenho ficam em `AUTO_LAYOUT_LABEL`.
 */
const LAYOUTS: Record<AutoLayout, (props: LayoutProps) => ReactNode> = {
  faixa: Extrato,
  recibo: Recibo,
  carta: EmailImpresso,
  painel: Formulario,
  janela: Aplicativo,
  selo: Enxuto,
};

export function AutoReceipt({
  brandColor,
  brandLayout,
  ...props
}: Props & { brandColor?: string | null; brandLayout?: AutoLayout | null }) {
  const Layout = LAYOUTS[brandLayout ?? 'faixa'];
  return <Layout {...props} color={brand(brandColor)} />;
}
