import type { CSSProperties, ReactNode } from 'react';
import { COMMUNICATION_TEMPLATE_LABEL, type ClientEmailView } from '@/domain/communication/receipt';
import type { AutoLayout } from '@/domain/master/company';

/**
 * Comprovante do modelo automático — empresa criada pela conta Master, sem
 * ambiente desenhado.
 *
 * Seis desenhos, e cada empresa nova fica com um que as outras ainda não
 * usam, além da própria cor: a peça de uma empresa não é a de outra pintada
 * de outra cor. Faixa, Recibo, Carta, Painel, Janela e Selo mudam estrutura,
 * tipografia e composição. Todos mostram a mesma coisa: a ficha do envio, a
 * mensagem enviada e a declaração de origem — só a mensagem, sem etapas do
 * pedido, como nos outros ambientes.
 *
 * Cor literal porque a peça vai impressa e representa documento externo. A
 * cor da marca entra por variável de estilo, validada como `#rrggbb`.
 *
 * Só dado real: tudo sai do `view` (a evidência gravada), do end-to-end do
 * caso e do id da mensagem, quando registrado. O destino do botão segue no
 * link e não é impresso. A declaração de origem é parte da peça. Nunca remova.
 */

const FALLBACK = '#334155';
const SERIF = "ui-serif, Georgia, 'Times New Roman', serif";

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

interface Field {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

const MISSING = <span className="text-[#78716c]">não informado</span>;

/** A ficha do envio, igual em todos os desenhos; muda só como é desenhada. */
function fields({ view, sourceReference, endToEndId }: Props): Field[] {
  const list: Field[] = [
    { label: 'Remetente', value: view.from },
    {
      label: 'Destinatário',
      value:
        view.toName || view.to ? (
          <>
            {view.toName ? <span className="block font-medium">{view.toName}</span> : null}
            {view.to ? <span className="block break-all opacity-80">{view.to}</span> : null}
          </>
        ) : (
          MISSING
        ),
    },
    { label: 'Canal', value: 'E-mail' },
    { label: 'Tipo', value: COMMUNICATION_TEMPLATE_LABEL[view.template] },
    { label: 'Enviado em', value: view.sentAtLabel ?? MISSING },
    // Sempre presente: "não informado" é honesto; o campo sumir não.
    { label: 'End-to-end', value: endToEndId ?? MISSING, mono: Boolean(endToEndId) },
  ];
  if (sourceReference) list.push({ label: 'ID da mensagem', value: sourceReference, mono: true });
  return list;
}

function Paragraphs({ view, className }: { view: ClientEmailView; className?: string }) {
  return (
    <div className={className}>
      {view.paragraphs.length > 0 ? (
        view.paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))
      ) : (
        <p className="text-[#78716c]">Sem conteúdo.</p>
      )}
    </div>
  );
}

/** O botão (ou a nota) que a mensagem trazia, no estilo de cada desenho. */
function Action({ view, className }: { view: ClientEmailView; className: string }) {
  const action = view.action;
  if (!action) return null;
  if (action.kind === 'NOTE') {
    return (
      <div className="mt-6 inline-flex max-w-full flex-col rounded-[8px] border border-[#e7e5e4] bg-white px-4 py-3">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-[#78716c] uppercase">{action.valueLabel}</span>
        <span className="mt-1 font-mono text-[14px] break-all text-[#1c1917]">{action.value}</span>
      </div>
    );
  }
  return action.href ? (
    <a href={action.href} target="_blank" rel="noopener noreferrer" className={`no-underline ${className}`}>
      {action.label}
    </a>
  ) : (
    <span className={className}>{action.label}</span>
  );
}

function Stamp({ view, className }: { view: ClientEmailView; className: string }) {
  // Declaração de origem — inseparável da peça. Nunca remova.
  return <p className={className}>{view.stamp}</p>;
}

function Shell({
  color,
  className,
  font = 'font-sans',
  children,
}: {
  color: string;
  className: string;
  font?: 'font-sans' | 'font-mono';
  children: ReactNode;
}) {
  return (
    <article
      aria-label="Comprovante de envio"
      style={{ '--marca': color } as CSSProperties}
      className={`@container overflow-hidden bg-white text-[#1c1917] [print-color-adjust:exact] print:shadow-none ${font} ${className}`}
    >
      {children}
    </article>
  );
}

// ---------------------------------------------------------------------------
// 1. Faixa — faixa da marca no topo, ficha em lista, mensagem com fio lateral
// ---------------------------------------------------------------------------

function Faixa(props: Props & { color: string }) {
  const { view } = props;
  return (
    <Shell color={props.color} className="rounded-[10px] border border-[#e7e5e4] shadow-[0_18px_40px_-28px_rgb(28_25_23/0.35)]">
      <header className="flex flex-wrap items-end justify-between gap-3 bg-(--marca) px-6 pt-7 pb-6 text-white @[620px]:px-10">
        <div className="min-w-0">
          <p className="text-[12px] font-medium tracking-[0.12em] text-white/80 uppercase">Comprovante de envio</p>
          <p className="mt-1 truncate text-[26px] leading-tight font-semibold tracking-[-0.02em]">{view.from}</p>
        </div>
        <p className="text-[13px] text-white/85">{COMMUNICATION_TEMPLATE_LABEL[view.template]}</p>
      </header>
      <dl className="px-6 py-3 @[620px]:px-10">
        {fields(props).map((field) => (
          <div key={field.label} className="grid gap-1 border-b border-[#e7e5e4] py-3 last:border-b-0 @[560px]:grid-cols-[150px_minmax(0,1fr)] @[560px]:gap-4">
            <dt className="text-[11px] font-semibold tracking-[0.08em] text-[#78716c] uppercase">{field.label}</dt>
            <dd className={`min-w-0 text-[14px] ${field.mono ? 'font-mono text-[13px] break-all' : ''}`}>{field.value}</dd>
          </div>
        ))}
      </dl>
      <section aria-label="Mensagem enviada" className="px-6 pb-9 @[620px]:px-10">
        <h3 className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-[#78716c] uppercase">Mensagem enviada</h3>
        <div className="rounded-[10px] border border-l-[5px] border-[#e7e5e4] border-l-(--marca) bg-[#fafaf9] px-6 py-7 @[620px]:px-9">
          <p className="text-[27px] leading-[1.15] font-semibold tracking-[-0.02em] @[620px]:text-[32px]">{view.subject || 'Sem assunto'}</p>
          <Paragraphs
            view={view}
            className="mt-5 max-w-[60ch] space-y-3 text-[15px] leading-relaxed text-[#44403c] [&>p:first-child]:font-medium [&>p:first-child]:text-[#1c1917]"
          />
          <Action view={view} className="mt-7 inline-flex h-11 items-center rounded-[8px] bg-(--marca) px-6 text-[14px] font-semibold text-white" />
        </div>
      </section>
      <footer className="border-t border-[#e7e5e4] px-6 py-4 @[620px]:px-10">
        <Stamp view={view} className="text-[12px] text-[#78716c]" />
      </footer>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// 2. Recibo — fita de caixa: estreita, monoespaçada, picote e linhas tracejadas
// ---------------------------------------------------------------------------

function Recibo(props: Props & { color: string }) {
  const { view } = props;
  return (
    <div className="flex justify-center bg-white py-4">
      <Shell color={props.color} font="font-mono" className="w-full max-w-[560px] border border-[#e7e5e4] shadow-[0_10px_30px_-20px_rgb(0_0_0/0.4)]">
        {/* Picote do topo */}
        <div aria-hidden="true" className="h-3 bg-[radial-gradient(circle_at_6px_0,transparent_6px,var(--marca)_6.5px)] bg-[length:12px_12px]" />
        <header className="px-7 pt-6 pb-5 text-center">
          <p className="mx-auto inline-flex size-12 items-center justify-center rounded-full border-2 border-(--marca) text-[15px] font-bold text-(--marca)">
            {initials(view.from)}
          </p>
          <p className="mt-3 text-[18px] font-bold tracking-[0.04em] uppercase">{view.from}</p>
          <p className="mt-1 text-[11.5px] tracking-[0.25em] text-[#78716c] uppercase">Comprovante de envio</p>
        </header>
        <div className="mx-7 border-t-2 border-dashed border-[#d6d3d1]" />
        <dl className="space-y-2.5 px-7 py-5 text-[12.5px]">
          {fields(props).map((field) => (
            <div key={field.label} className="flex items-baseline gap-2">
              <dt className="shrink-0 text-[#78716c] uppercase">{field.label}</dt>
              <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-[#d6d3d1]" />
              <dd className="max-w-[62%] text-right break-all text-[#1c1917]">{field.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mx-7 border-t-2 border-dashed border-[#d6d3d1]" />
        <section aria-label="Mensagem enviada" className="px-7 py-6">
          <p className="text-[11px] tracking-[0.25em] text-[#78716c] uppercase">Mensagem enviada</p>
          <p className="mt-3 text-[22px] leading-tight font-bold">{view.subject || 'Sem assunto'}</p>
          <Paragraphs view={view} className="mt-4 space-y-2.5 text-[13px] leading-relaxed text-[#44403c]" />
          <Action view={view} className="mt-6 flex h-11 w-full items-center justify-center bg-(--marca) text-[13px] font-bold tracking-[0.12em] text-white uppercase" />
        </section>
        <div className="mx-7 border-t-2 border-dashed border-[#d6d3d1]" />
        <footer className="px-7 py-4 text-center">
          <Stamp view={view} className="text-[11px] text-[#78716c]" />
        </footer>
        <div aria-hidden="true" className="h-3 bg-[radial-gradient(circle_at_6px_12px,transparent_6px,var(--marca)_6.5px)] bg-[length:12px_12px]" />
      </Shell>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Carta — papel timbrado: serifa, monograma, ficha em três colunas, aspas
// ---------------------------------------------------------------------------

function Carta(props: Props & { color: string }) {
  const { view } = props;
  return (
    <Shell color={props.color} className="border border-[#e7e5e4] bg-[#fffdf9]">
      <div style={{ fontFamily: SERIF }}>
        <header className="flex items-center justify-between gap-4 border-b-2 border-(--marca) px-8 pt-9 pb-5 @[620px]:px-12">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-(--marca) text-[18px] text-white italic">
              {initials(view.from)}
            </span>
            <p className="truncate text-[26px] leading-tight text-[#1c1917]">{view.from}</p>
          </div>
          <p className="hidden text-right text-[13px] text-[#78716c] italic @[560px]:block">Comprovante de envio</p>
        </header>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 px-8 py-7 @[560px]:grid-cols-3 @[620px]:px-12">
          {fields(props).map((field) => (
            <div key={field.label} className="min-w-0">
              <dt className="text-[11.5px] tracking-[0.14em] text-(--marca) uppercase">{field.label}</dt>
              <dd className={`mt-1 text-[14.5px] text-[#292524] ${field.mono ? 'font-mono text-[12.5px] break-all' : ''}`}>{field.value}</dd>
            </div>
          ))}
        </dl>
        <section aria-label="Mensagem enviada" className="px-8 pb-10 @[620px]:px-12">
          <div className="relative border-y border-[#e7e5e4] py-8 pl-10">
            <span aria-hidden="true" className="absolute top-3 left-0 text-[64px] leading-none text-(--marca) opacity-40">
              &ldquo;
            </span>
            <p className="text-[30px] leading-[1.15] text-[#1c1917] italic">{view.subject || 'Sem assunto'}</p>
            <Paragraphs view={view} className="mt-5 max-w-[58ch] space-y-3 text-[16px] leading-[1.7] text-[#44403c]" />
            <Action view={view} className="mt-7 inline-flex items-center border-b-2 border-(--marca) pb-1 text-[16px] text-(--marca) italic" />
          </div>
        </section>
        <footer className="px-8 pb-8 @[620px]:px-12">
          <Stamp view={view} className="text-[12.5px] text-[#78716c] italic" />
        </footer>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// 4. Painel — coluna da marca à esquerda com a ficha; mensagem à direita
// ---------------------------------------------------------------------------

function Painel(props: Props & { color: string }) {
  const { view } = props;
  return (
    <Shell color={props.color} className="rounded-[20px] border border-[#e7e5e4] shadow-[0_24px_48px_-32px_rgb(0_0_0/0.45)]">
      <div className="grid @[680px]:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="bg-(--marca) px-7 py-8 text-white">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/15 text-[14px] font-bold ring-1 ring-white/30">
            {initials(view.from)}
          </span>
          <p className="mt-4 text-[22px] leading-tight font-bold">{view.from}</p>
          <p className="mt-1 text-[13px] text-white/75">Comprovante de envio</p>
          <dl className="mt-8 space-y-4">
            {fields(props).map((field) => (
              <div key={field.label}>
                <dt className="text-[10.5px] font-semibold tracking-[0.14em] text-white/65 uppercase">{field.label}</dt>
                <dd className={`mt-0.5 text-[13.5px] text-white ${field.mono ? 'font-mono text-[12px] break-all' : ''}`}>{field.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
        <section aria-label="Mensagem enviada" className="flex flex-col px-7 py-8 @[680px]:px-10">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f5f5f4] px-3 py-1 text-[11.5px] font-semibold tracking-[0.06em] text-[#57534e] uppercase">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-(--marca)" />
            Mensagem enviada
          </p>
          <p className="mt-6 text-[30px] leading-[1.1] font-extrabold tracking-[-0.03em] @[680px]:text-[38px]">{view.subject || 'Sem assunto'}</p>
          <Paragraphs
            view={view}
            className="mt-5 max-w-[52ch] space-y-3 text-[15.5px] leading-relaxed text-[#44403c] [&>p:first-child]:text-[17px] [&>p:first-child]:font-semibold [&>p:first-child]:text-[#1c1917]"
          />
          <Action view={view} className="mt-8 inline-flex h-12 w-fit items-center rounded-full bg-(--marca) px-7 text-[14.5px] font-bold text-white" />
          <Stamp view={view} className="mt-auto pt-10 text-[12px] text-[#78716c]" />
        </section>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// 5. Janela — ficha como tabela de cabeçalho colorido; mensagem num leitor
// ---------------------------------------------------------------------------

function Janela(props: Props & { color: string }) {
  const { view } = props;
  const list = fields(props);
  return (
    <Shell color={props.color} className="rounded-[6px] border-2 border-[#1c1917]">
      <header className="flex items-center justify-between gap-3 border-b-2 border-[#1c1917] px-6 py-4">
        <p className="text-[20px] font-black tracking-[-0.02em] uppercase">{view.from}</p>
        <p className="rounded-[4px] bg-(--marca) px-2.5 py-1 text-[11px] font-bold tracking-[0.1em] text-white uppercase">Comprovante de envio</p>
      </header>
      <table className="w-full border-collapse text-left text-[13.5px]">
        <tbody>
          {list.map((field, index) => (
            <tr key={field.label} className={index % 2 === 0 ? 'bg-[#fafaf9]' : 'bg-white'}>
              <th scope="row" className="w-[34%] border-b border-[#e7e5e4] px-6 py-3 align-top text-[11.5px] font-bold tracking-[0.06em] text-(--marca) uppercase">
                {field.label}
              </th>
              <td className={`border-b border-[#e7e5e4] px-6 py-3 ${field.mono ? 'font-mono text-[12.5px] break-all' : ''}`}>{field.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section aria-label="Mensagem enviada" className="p-6">
        <div className="overflow-hidden rounded-[6px] border-2 border-[#1c1917]">
          <div className="border-b-2 border-[#1c1917] bg-(--marca) px-5 py-3 text-white">
            <p className="text-[11px] font-bold tracking-[0.1em] text-white/80 uppercase">Assunto</p>
            <p className="mt-0.5 text-[20px] leading-tight font-bold">{view.subject || 'Sem assunto'}</p>
          </div>
          <div className="px-5 py-6">
            <Paragraphs view={view} className="max-w-[60ch] space-y-3 text-[15px] leading-relaxed text-[#292524]" />
            <Action view={view} className="mt-6 inline-flex h-11 items-center rounded-[4px] border-2 border-[#1c1917] bg-(--marca) px-6 text-[14px] font-bold text-white shadow-[3px_3px_0_#1c1917]" />
          </div>
        </div>
      </section>
      <footer className="border-t-2 border-[#1c1917] px-6 py-3">
        <Stamp view={view} className="text-[12px] text-[#57534e]" />
      </footer>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// 6. Selo — centrado: monograma grande, ficha em pares, mensagem em cartão
// ---------------------------------------------------------------------------

function Selo(props: Props & { color: string }) {
  const { view } = props;
  return (
    <Shell color={props.color} className="rounded-[28px] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--marca)_9%,white)_0%,white_45%)] ring-1 ring-[#e7e5e4]">
      <header className="px-8 pt-10 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-(--marca) text-[20px] font-bold text-white shadow-[0_12px_28px_-12px_var(--marca)] ring-[6px] ring-white">
          {initials(view.from)}
        </span>
        <p className="mt-4 text-[24px] font-semibold tracking-[-0.02em]">{view.from}</p>
        <p className="mt-1 text-[13px] text-[#78716c]">Comprovante de envio</p>
      </header>
      <dl className="mx-auto mt-8 grid max-w-[720px] grid-cols-1 gap-3 px-8 @[560px]:grid-cols-2">
        {fields(props).map((field) => (
          <div key={field.label} className="rounded-2xl bg-white px-4 py-3 text-center ring-1 ring-[#e7e5e4]">
            <dt className="text-[11px] font-semibold tracking-[0.1em] text-[#78716c] uppercase">{field.label}</dt>
            <dd className={`mt-1 text-[14px] ${field.mono ? 'font-mono text-[12.5px] break-all' : ''}`}>{field.value}</dd>
          </div>
        ))}
      </dl>
      <section aria-label="Mensagem enviada" className="px-8 py-9">
        <div className="mx-auto max-w-[720px] rounded-[24px] bg-white px-8 py-9 text-center shadow-[0_20px_44px_-30px_rgb(0_0_0/0.5)] ring-1 ring-[#e7e5e4]">
          <p className="text-[11.5px] font-semibold tracking-[0.14em] text-(--marca) uppercase">Mensagem enviada</p>
          <p className="mt-3 text-[28px] leading-tight font-semibold tracking-[-0.02em]">{view.subject || 'Sem assunto'}</p>
          <Paragraphs view={view} className="mx-auto mt-4 max-w-[52ch] space-y-3 text-[15px] leading-relaxed text-[#44403c]" />
          <Action view={view} className="mt-7 inline-flex h-12 items-center rounded-full border-2 border-(--marca) px-8 text-[14.5px] font-semibold text-(--marca)" />
        </div>
      </section>
      <footer className="pb-8 text-center">
        <Stamp view={view} className="text-[12px] text-[#78716c]" />
      </footer>
    </Shell>
  );
}

const LAYOUTS: Record<AutoLayout, (props: Props & { color: string }) => ReactNode> = {
  faixa: Faixa,
  recibo: Recibo,
  carta: Carta,
  painel: Painel,
  janela: Janela,
  selo: Selo,
};

export function AutoReceipt({
  brandColor,
  brandLayout,
  ...props
}: Props & { brandColor?: string | null; brandLayout?: AutoLayout | null }) {
  const Layout = LAYOUTS[brandLayout ?? 'faixa'];
  return <Layout {...props} color={brand(brandColor)} />;
}
