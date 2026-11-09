import type { CSSProperties, ReactNode } from 'react';
import { COMMUNICATION_TEMPLATE_LABEL, type ClientEmailView } from '@/domain/communication/receipt';
import type { AutoLayout } from '@/domain/master/company';
import { app, display, narrow, serif, thermal, webmail } from './fonts';

/**
 * Comprovante do modelo automático — empresa criada pela conta Master, sem
 * ambiente desenhado.
 *
 * Seis desenhos, e cada empresa nova fica com um que as outras ainda não
 * usam, além da própria cor. Cada um é um gênero de papel que quem lê já
 * conhece — carta timbrada, cupom de impressora térmica, e-mail impresso,
 * formulário, comprovante de aplicativo de banco, e-mail de marca — com a
 * tipografia e as convenções do gênero (filete duplo, picote, pontilhado,
 * caixa de campo, faixa de seção), não um enfeite inventado. A marca é o nome
 * da empresa composto em cada fonte, como logotipo de quem não mandou logo.
 *
 * Todos mostram a mesma coisa: a ficha do envio, a mensagem enviada e a
 * declaração de origem — só a mensagem, sem etapas do pedido, como nos outros
 * ambientes. Nenhum selo de autenticidade: o registro não afirma isso.
 *
 * Cor literal porque a peça vai impressa e representa documento externo. A
 * cor da marca entra por variável de estilo, validada como `#rrggbb`.
 *
 * Só dado real: tudo sai do `view` (a evidência gravada), do end-to-end do
 * caso e do id da mensagem, quando registrado. Nada de endereço, assinatura,
 * rodapé de descadastro ou texto que a mensagem não tinha. O destino do botão
 * segue no link e não é impresso. A declaração de origem é parte da peça.
 * Nunca remova.
 */

const FALLBACK = '#334155';

function brand(color: string | null | undefined): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : FALLBACK;
}

interface Props {
  view: ClientEmailView;
  sourceReference?: string | null;
  endToEndId?: string | null;
}

type LayoutProps = Props & { color: string };

// ---------------------------------------------------------------------------
// Data: o rótulo gravado ("02/11/2026, 09:30") dito como cada papel diz
// ---------------------------------------------------------------------------

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const SEMANA = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

interface Moment {
  day: number;
  month: number;
  year: number;
  time: string | null;
}

export function parseSentAt(label: string | null | undefined): Moment | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s+(\d{2}:\d{2}))?/.exec(label ?? '');
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { day: Number(match[1]), month, year: Number(match[3]), time: match[4] ?? null };
}

/** "2 de novembro de 2026, às 09:30". */
export function longDate(label: string | null | undefined): string | null {
  const moment = parseSentAt(label);
  if (!moment) return label ?? null;
  const date = `${moment.day} de ${MESES[moment.month - 1]} de ${moment.year}`;
  return moment.time ? `${date}, às ${moment.time}` : date;
}

/** "seg., 2 de nov. de 2026, 09:30" — como o webmail imprime. */
export function mailDate(label: string | null | undefined): string | null {
  const moment = parseSentAt(label);
  if (!moment) return label ?? null;
  const weekday = SEMANA[new Date(Date.UTC(moment.year, moment.month - 1, moment.day)).getUTCDay()];
  const month = (MESES[moment.month - 1] ?? '').slice(0, 3);
  return `${weekday}, ${moment.day} de ${month}. de ${moment.year}${moment.time ? `, ${moment.time}` : ''}`;
}

// ---------------------------------------------------------------------------
// Peças comuns
// ---------------------------------------------------------------------------

function Shell({
  color,
  font,
  className,
  children,
}: {
  color: string;
  font: { style: { fontFamily: string } };
  className: string;
  children: ReactNode;
}) {
  return (
    <article
      aria-label="Comprovante de envio"
      style={{ '--marca': color, fontFamily: font.style.fontFamily } as CSSProperties}
      className={`@container antialiased [print-color-adjust:exact] ${className}`}
    >
      {children}
    </article>
  );
}

function Paragraphs({ view, className = '', empty }: { view: ClientEmailView; className?: string; empty: string }) {
  return (
    <div className={className}>
      {view.paragraphs.length > 0 ? (
        view.paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))
      ) : (
        <p className={empty}>Sem conteúdo.</p>
      )}
    </div>
  );
}

/**
 * O botão (ou a nota) que a mensagem trazia. Cada desenho passa o próprio
 * acabamento; o comportamento é um só — clicável só com URL de verdade.
 */
function Action({
  view,
  button,
  note,
  noteLabel,
  noteValue,
}: {
  view: ClientEmailView;
  button: string;
  note: string;
  noteLabel: string;
  noteValue: string;
}) {
  const action = view.action;
  if (!action) return null;
  if (action.kind === 'NOTE') {
    return (
      <div className={note}>
        <span className={noteLabel}>{action.valueLabel}</span>
        <span className={noteValue}>{action.value}</span>
      </div>
    );
  }
  return action.href ? (
    <a href={action.href} target="_blank" rel="noopener noreferrer" className={`no-underline ${button}`}>
      {action.label}
    </a>
  ) : (
    <span className={button}>{action.label}</span>
  );
}

function hasRecipient(view: ClientEmailView): boolean {
  return Boolean(view.toName || view.to);
}

// ---------------------------------------------------------------------------
// Carta timbrada — papel de carta: nome composto em versal, filete duplo,
// data por extenso, bloco do destinatário e o texto em serifa.
// ---------------------------------------------------------------------------

function CartaTimbrada({ view, sourceReference, endToEndId, color }: LayoutProps) {
  const small = 'text-[11px] tracking-[0.14em] text-[#7a7266] uppercase';
  return (
    <Shell color={color} font={serif} className="bg-[#fbf9f4] text-[#221f1a]">
      <div className="px-10 pt-12 pb-10 @[700px]:px-20 @[700px]:pt-14">
        <header className="text-center">
          <p className="text-[26px] leading-none font-medium tracking-[0.2em] text-(--marca) uppercase @[700px]:text-[30px]">{view.from}</p>
          <div aria-hidden="true" className="mt-6 border-t-[1.5px] border-(--marca)" />
          <div aria-hidden="true" className="mt-[3px] border-t border-(--marca) opacity-60" />
        </header>

        <p className="mt-9 text-right text-[15px] text-[#4a443b] italic">{longDate(view.sentAtLabel) ?? 'Data de envio não informada'}</p>

        <address className="mt-6 text-[15.5px] leading-[1.55] not-italic">
          {view.toName ? <span className="block">{view.toName}</span> : null}
          {view.to ? <span className="block break-all text-[#5d564b]">{view.to}</span> : null}
          {!hasRecipient(view) ? <span className="block text-[#9a9182]">Destinatário não informado</span> : null}
        </address>

        <p className="mt-7 text-[15.5px]">
          <span className={`${small} mr-2 align-[1px]`}>Assunto</span>
          <span className="font-semibold">{view.subject || 'Sem assunto'}</span>
        </p>

        <Paragraphs
          view={view}
          empty="text-[#9a9182]"
          className="mt-6 max-w-[62ch] space-y-4 text-[17px] leading-[1.7] text-[#2e2a24]"
        />

        <div className="mt-8">
          <Action
            view={view}
            button="inline-flex h-11 items-center border border-(--marca) bg-(--marca) px-7 text-[13px] font-medium tracking-[0.12em] text-white uppercase"
            note="inline-flex max-w-full flex-col border-l-2 border-(--marca) pl-4"
            noteLabel={small}
            noteValue="mt-1 text-[16px] break-all"
          />
        </div>

        <footer className="mt-14">
          <div aria-hidden="true" className="border-t border-[#d9d2c4]" />
          <dl className="grid grid-cols-1 gap-x-10 gap-y-4 pt-5 @[600px]:grid-cols-[auto_auto_minmax(0,1fr)]">
            <div>
              <dt className={small}>Canal</dt>
              <dd className="mt-1 text-[14.5px]">E-mail</dd>
            </div>
            <div>
              <dt className={small}>Natureza</dt>
              <dd className="mt-1 text-[14.5px]">{COMMUNICATION_TEMPLATE_LABEL[view.template]}</dd>
            </div>
            <div className="min-w-0">
              <dt className={small}>End-to-end da transação</dt>
              <dd className="mt-1 text-[14.5px] break-all">{endToEndId ?? <span className="text-[#9a9182]">não informado</span>}</dd>
            </div>
            {sourceReference ? (
              <div className="min-w-0 @[600px]:col-span-3">
                <dt className={small}>Identificação da mensagem</dt>
                <dd className="mt-1 text-[14.5px] break-all">{sourceReference}</dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-8 text-center text-[13px] text-[#7a7266] italic">{view.stamp}</p>
        </footer>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Cupom — impressora térmica: bobina estreita com picote, tudo em versal
// monoespaçada, pontilhado entre o campo e o valor.
// ---------------------------------------------------------------------------

const PAPEL = '#fffdf7';

function Leader({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <span className="shrink-0">{label}</span>
      <span aria-hidden="true" className="mb-[5px] min-w-4 flex-1 border-b-2 border-dotted border-[#b9b5ab]" />
      <span className="min-w-0 text-right break-all">{children}</span>
    </div>
  );
}

function Picote({ side }: { side: 'top' | 'bottom' }) {
  const background =
    side === 'top'
      ? `conic-gradient(from 135deg at 50% 0, ${PAPEL} 90deg, transparent 0) 0 0 / 14px 100% repeat-x`
      : `conic-gradient(from -45deg at 50% 100%, ${PAPEL} 90deg, transparent 0) 0 0 / 14px 100% repeat-x`;
  return <div aria-hidden="true" className="h-[7px]" style={{ background }} />;
}

function Cupom({ view, sourceReference, endToEndId, color }: LayoutProps) {
  const moment = parseSentAt(view.sentAtLabel);
  const dash = <div aria-hidden="true" className="my-4 border-t-2 border-dashed border-[#c9c5bb]" />;
  return (
    <Shell color={color} font={thermal} className="bg-[#ecebe6] px-4 py-10 text-[#1d1c1a]">
      <div className="mx-auto w-full max-w-[400px] drop-shadow-[0_10px_18px_rgb(40_36_28/0.14)]">
        <Picote side="bottom" />
        <div className="px-7 pt-7 pb-8 text-[13px] leading-[1.6] uppercase" style={{ background: PAPEL }}>
          <header className="text-center">
            <p className="text-[19px] leading-tight font-bold tracking-[0.06em] text-(--marca)">{view.from}</p>
            <p className="mt-2 text-[11.5px] tracking-[0.1em] text-[#5b5850]">Comprovante de envio de e-mail</p>
          </header>
          <div aria-hidden="true" className="mt-5 border-t-[3px] border-double border-[#1d1c1a]" />

          <div className="mt-4 space-y-0.5">
            <Leader label="Data">{moment ? `${String(moment.day).padStart(2, '0')}/${String(moment.month).padStart(2, '0')}/${moment.year}` : (view.sentAtLabel ?? 'Não informada')}</Leader>
            {moment?.time ? <Leader label="Hora">{moment.time}</Leader> : null}
            <Leader label="Canal">E-mail</Leader>
            <Leader label="Tipo">{COMMUNICATION_TEMPLATE_LABEL[view.template]}</Leader>
          </div>

          {dash}
          <p className="text-[11.5px] tracking-[0.1em] text-[#5b5850]">Para</p>
          {view.toName ? <p className="font-semibold">{view.toName}</p> : null}
          {view.to ? <p className="break-all normal-case">{view.to}</p> : null}
          {!hasRecipient(view) ? <p className="text-[#8a867c]">Não informado</p> : null}

          {dash}
          <p className="text-[11.5px] tracking-[0.1em] text-[#5b5850]">Mensagem</p>
          <p className="mt-1 font-bold">{view.subject || 'Sem assunto'}</p>
          <Paragraphs view={view} empty="text-[#8a867c]" className="mt-3 space-y-3 normal-case" />
          <div className="mt-5 text-center">
            <Action
              view={view}
              button="inline-flex min-h-10 items-center justify-center bg-(--marca) px-5 py-2 text-[12.5px] font-semibold tracking-[0.08em] text-white uppercase"
              note="flex flex-col border-2 border-[#1d1c1a] px-3 py-2 text-left"
              noteLabel="text-[11px] tracking-[0.1em] text-[#5b5850]"
              noteValue="mt-0.5 font-semibold break-all normal-case"
            />
          </div>

          {dash}
          <p className="text-[11.5px] tracking-[0.1em] text-[#5b5850]">End-to-end da transação</p>
          <p className="mt-0.5 font-medium break-all normal-case">{endToEndId ?? <span className="text-[#8a867c] uppercase">Não informado</span>}</p>
          {sourceReference ? (
            <div className="mt-3">
              <Leader label="ID msg">
                <span className="normal-case">{sourceReference}</span>
              </Leader>
            </div>
          ) : null}

          <div aria-hidden="true" className="mt-5 border-t-[3px] border-double border-[#1d1c1a]" />
          <p className="mt-4 text-center text-[11px] leading-[1.5] tracking-[0.04em] text-[#5b5850] normal-case">{view.stamp}</p>
        </div>
        <Picote side="top" />
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// E-mail impresso — a página que o webmail imprime: assunto, remetente com a
// data à direita, "para", e a mensagem HTML da loja dentro, como chegou.
// ---------------------------------------------------------------------------

function EmailImpresso({ view, sourceReference, endToEndId, color }: LayoutProps) {
  return (
    <Shell color={color} font={webmail} className="bg-white px-8 py-8 text-[#202124] @[700px]:px-12">
      <header className="flex items-baseline justify-between gap-4 border-b border-[#dadce0] pb-3">
        <span className="truncate text-[17px] font-bold text-(--marca)">{view.from}</span>
        <span className="shrink-0 text-[12px] text-[#5f6368]">Comprovante de envio</span>
      </header>

      <h2 className="mt-6 text-[21px] leading-snug">{view.subject || 'Sem assunto'}</h2>
      <div className="mt-4 border-t border-[#dadce0]" />

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-[14px] font-bold">{view.from}</p>
        <p className="text-[12px] text-[#5f6368]">{mailDate(view.sentAtLabel) ?? 'data não informada'}</p>
      </div>
      <p className="mt-0.5 text-[12px] text-[#5f6368]">
        Para:{' '}
        {hasRecipient(view) ? (
          <>
            {view.toName ? <span>{view.toName} </span> : null}
            {view.to ? <span className="break-all">{view.toName ? `<${view.to}>` : view.to}</span> : null}
          </>
        ) : (
          'não informado'
        )}
      </p>

      {/* A mensagem HTML da loja, na largura em que o e-mail foi montado. */}
      <div className="mt-6 max-w-[600px] border border-[#e3e3e3]">
        <div className="bg-(--marca) px-7 py-5">
          <span className="text-[19px] font-bold tracking-[-0.01em] text-white">{view.from}</span>
        </div>
        <div className="px-7 pt-7 pb-8">
          <Paragraphs view={view} empty="text-[#80868b]" className="space-y-3.5 text-[14.5px] leading-[1.6] text-[#3c4043]" />
          <div className="mt-6">
            <Action
              view={view}
              button="inline-flex h-11 items-center rounded-[4px] bg-(--marca) px-6 text-[14px] font-bold text-white"
              note="inline-flex max-w-full flex-col rounded-[4px] bg-[#f1f3f4] px-4 py-3"
              noteLabel="text-[12px] text-[#5f6368]"
              noteValue="mt-0.5 text-[14px] font-bold break-all"
            />
          </div>
        </div>
      </div>

      <dl className="mt-8 space-y-1 border-t border-[#dadce0] pt-4 text-[12px] text-[#5f6368]">
        <div className="flex flex-wrap gap-x-1.5">
          <dt>Tipo de mensagem:</dt>
          <dd className="text-[#202124]">{COMMUNICATION_TEMPLATE_LABEL[view.template]}</dd>
        </div>
        <div className="flex flex-wrap gap-x-1.5">
          <dt>End-to-end da transação:</dt>
          <dd className="break-all text-[#202124]">{endToEndId ?? 'não informado'}</dd>
        </div>
        {sourceReference ? (
          <div className="flex flex-wrap gap-x-1.5">
            <dt>ID da mensagem:</dt>
            <dd className="break-all text-[#202124]">{sourceReference}</dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-4 text-[11.5px] text-[#80868b]">{view.stamp}</p>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Formulário — impresso de repartição: caixas de campo com rótulo miúdo,
// faixas de seção na cor da empresa, letra condensada.
// ---------------------------------------------------------------------------

function Faixa({ children }: { children: ReactNode }) {
  return (
    <p className="bg-(--marca) px-2.5 py-[3px] text-[10.5px] font-bold tracking-[0.12em] text-white uppercase">{children}</p>
  );
}

function Caixa({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 border-[#1a1a1a] px-2.5 pt-1 pb-1.5 ${className}`}>
      <p className="text-[9.5px] font-semibold tracking-[0.06em] text-[#3d3d3d] uppercase">{label}</p>
      <div className="mt-0.5 min-h-5 text-[15px] leading-snug text-[#0d0d0d]">{children}</div>
    </div>
  );
}

function Formulario({ view, sourceReference, endToEndId, color }: LayoutProps) {
  const vazio = <span className="text-[#8a8a8a]">não informado</span>;
  return (
    <Shell color={color} font={narrow} className="bg-white p-7 text-[#0d0d0d]">
      <div className="border-[1.5px] border-[#1a1a1a]">
        <div className="grid grid-cols-1 border-b-[1.5px] border-[#1a1a1a] @[640px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_170px]">
          <div className="flex min-w-0 items-stretch border-b border-[#1a1a1a] @[640px]:border-r @[640px]:border-b-0">
            <span aria-hidden="true" className="w-2 shrink-0 bg-(--marca)" />
            <div className="min-w-0 px-3 py-2.5">
              <p className="text-[9.5px] font-semibold tracking-[0.06em] text-[#3d3d3d] uppercase">Remetente</p>
              <p className="mt-0.5 text-[22px] leading-tight font-bold tracking-[0.01em] uppercase">{view.from}</p>
            </div>
          </div>
          <div className="flex flex-col justify-center border-b border-[#1a1a1a] px-3 py-2.5 text-center @[640px]:border-r @[640px]:border-b-0">
            <p className="text-[14px] leading-tight font-bold tracking-[0.04em] uppercase">Comprovante de envio</p>
            <p className="text-[12px] tracking-[0.04em] text-[#3d3d3d] uppercase">Comunicação por e-mail</p>
          </div>
          <Caixa label="Nº da mensagem" className="flex flex-col justify-center">
            {sourceReference ? <span className="break-all">{sourceReference}</span> : vazio}
          </Caixa>
        </div>

        <Faixa>Dados do envio</Faixa>
        <div className="grid grid-cols-1 border-b-[1.5px] border-[#1a1a1a] @[640px]:grid-cols-3">
          <Caixa label="Data" className="border-b @[640px]:border-r @[640px]:border-b-0">
            {(() => {
              const moment = parseSentAt(view.sentAtLabel);
              return moment
                ? `${String(moment.day).padStart(2, '0')}/${String(moment.month).padStart(2, '0')}/${moment.year}`
                : (view.sentAtLabel ?? vazio);
            })()}
          </Caixa>
          <Caixa label="Hora" className="border-b @[640px]:border-r @[640px]:border-b-0">
            {parseSentAt(view.sentAtLabel)?.time ?? vazio}
          </Caixa>
          <Caixa label="Natureza da comunicação">{COMMUNICATION_TEMPLATE_LABEL[view.template]}</Caixa>
        </div>

        <Faixa>Destinatário</Faixa>
        <div className="grid grid-cols-1 border-b-[1.5px] border-[#1a1a1a] @[640px]:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Caixa label="Nome" className="border-b @[640px]:border-r @[640px]:border-b-0">
            {view.toName ?? vazio}
          </Caixa>
          <Caixa label="Endereço eletrônico">{view.to ? <span className="break-all">{view.to}</span> : vazio}</Caixa>
        </div>

        <Faixa>Conteúdo da mensagem</Faixa>
        <Caixa label="Assunto" className="border-b border-[#1a1a1a]">
          <span className="font-bold">{view.subject || 'Sem assunto'}</span>
        </Caixa>
        <Caixa label="Texto" className="border-b-[1.5px]">
          <Paragraphs view={view} empty="text-[#8a8a8a]" className="space-y-2.5 py-1.5 text-[15px] leading-[1.5]" />
          <div className="mt-3 mb-2">
            <Action
              view={view}
              button="inline-flex h-10 items-center bg-(--marca) px-5 text-[13px] font-bold tracking-[0.08em] text-white uppercase"
              note="inline-flex max-w-full flex-col border border-[#1a1a1a] px-3 py-1.5"
              noteLabel="text-[9.5px] font-semibold tracking-[0.06em] text-[#3d3d3d] uppercase"
              noteValue="text-[15px] break-all"
            />
          </div>
        </Caixa>

        <Faixa>Transação</Faixa>
        <Caixa label="End-to-end (Pix)" className="border-b-[1.5px]">
          {endToEndId ? <span className="tracking-[0.02em] break-all">{endToEndId}</span> : vazio}
        </Caixa>
        <Caixa label="Observações">
          <span className="text-[13px] text-[#3d3d3d]">{view.stamp}</span>
        </Caixa>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Aplicativo — comprovante de app de banco: topo na cor da empresa, rótulo
// pequeno sobre valor forte, divisórias finas, tudo numa coluna de celular.
// ---------------------------------------------------------------------------

function Linha({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-[#eceef1] py-3.5 last:border-b-0">
      <p className="text-[12.5px] text-[#6e7380]">{label}</p>
      <div className="mt-0.5 text-[15px] font-semibold text-[#14161a]">{children}</div>
    </div>
  );
}

function Aplicativo({ view, sourceReference, endToEndId, color }: LayoutProps) {
  return (
    <Shell color={color} font={app} className="bg-[#eef0f3] px-4 py-10 text-[#14161a]">
      <div className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[22px] bg-white shadow-[0_1px_2px_rgb(20_22_26/0.06),0_18px_40px_-20px_rgb(20_22_26/0.25)]">
        <header className="bg-(--marca) px-6 pt-6 pb-7 text-white">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-[16px] font-extrabold tracking-[-0.01em]">{view.from}</span>
            <span className="shrink-0 text-[12.5px] font-medium text-white/75">Comprovante</span>
          </div>
          <span aria-hidden="true" className="mt-8 flex size-11 items-center justify-center rounded-full bg-white/18">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <path d="m3.5 7.5 8.5 6 8.5-6" />
            </svg>
          </span>
          <h2 className="mt-4 text-[25px] leading-tight font-extrabold tracking-[-0.02em]">E-mail enviado</h2>
          <p className="mt-1 text-[14px] font-medium text-white/80">{view.sentAtLabel ?? 'Data de envio não informada'}</p>
        </header>

        <div className="px-6 pt-2">
          <Linha label="Para">
            {view.toName ? <span className="block">{view.toName}</span> : null}
            {view.to ? <span className={view.toName ? 'block text-[13.5px] font-medium break-all text-[#6e7380]' : 'block break-all'}>{view.to}</span> : null}
            {!hasRecipient(view) ? <span className="font-medium text-[#9ba0aa]">Não informado</span> : null}
          </Linha>
          <Linha label="Tipo">{COMMUNICATION_TEMPLATE_LABEL[view.template]}</Linha>
          <Linha label="Canal">E-mail</Linha>
        </div>

        <section aria-label="Mensagem enviada" className="px-6 pt-4 pb-2">
          <h3 className="text-[13px] font-bold text-[#6e7380]">Mensagem</h3>
          <div className="mt-2.5 rounded-[16px] bg-[#f5f6f8] p-5">
            <p className="text-[16.5px] leading-snug font-bold tracking-[-0.01em]">{view.subject || 'Sem assunto'}</p>
            <Paragraphs view={view} empty="text-[#9ba0aa]" className="mt-3 space-y-3 text-[14px] leading-[1.6] text-[#3d424d]" />
            <div className="mt-5">
              <Action
                view={view}
                button="flex h-12 w-full items-center justify-center rounded-[14px] bg-(--marca) px-5 text-[14.5px] font-bold text-white"
                note="flex flex-col rounded-[12px] bg-white px-4 py-3"
                noteLabel="text-[12px] text-[#6e7380]"
                noteValue="mt-0.5 text-[14.5px] font-bold break-all"
              />
            </div>
          </div>
        </section>

        <div className="px-6 pt-3 pb-2">
          <Linha label="End-to-end da transação">
            {endToEndId ? <span className="text-[13.5px] break-all">{endToEndId}</span> : <span className="font-medium text-[#9ba0aa]">Não informado</span>}
          </Linha>
          {sourceReference ? (
            <Linha label="ID da mensagem">
              <span className="text-[13.5px] break-all">{sourceReference}</span>
            </Linha>
          ) : null}
        </div>

        <footer className="border-t border-dashed border-[#d9dce2] px-6 py-5 text-center">
          <p className="text-[12px] text-[#8a8f9a]">{view.stamp}</p>
        </footer>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Vitrine — e-mail de marca: o nome em letra grande no bloco de cor, assunto
// como manchete, botão em pílula e a ficha num quadro de papel.
// ---------------------------------------------------------------------------

function Vitrine({ view, sourceReference, endToEndId, color }: LayoutProps) {
  const label = 'text-[12.5px] text-[#77716a]';
  const value = 'mt-0.5 text-[15px] font-semibold text-[#1b1916]';
  return (
    <Shell color={color} font={display} className="bg-white text-[#1b1916]">
      <header className="flex items-end justify-between gap-6 bg-(--marca) px-8 pt-12 pb-8 @[700px]:px-12">
        <span className="min-w-0 text-[40px] leading-[0.95] font-extrabold tracking-[-0.045em] break-words text-white lowercase @[700px]:text-[52px]">
          {view.from}
        </span>
        <span className="shrink-0 pb-1 text-[13px] font-medium text-white/80">comprovante de envio</span>
      </header>

      <section aria-label="Mensagem enviada" className="px-8 pt-10 pb-2 @[700px]:px-12">
        <p className="text-[13px] font-medium text-[#77716a]">
          {view.sentAtLabel ?? 'Data não informada'} · para {view.toName ?? view.to ?? 'destinatário não informado'}
        </p>
        <h2 className="mt-3 max-w-[22ch] text-[36px] leading-[1.04] font-bold tracking-[-0.035em] @[700px]:text-[44px]">
          {view.subject || 'Sem assunto'}
        </h2>
        <Paragraphs
          view={view}
          empty="text-[#9a948c]"
          className="mt-6 max-w-[58ch] space-y-3.5 text-[16.5px] leading-[1.6] text-[#45403a]"
        />
        <div className="mt-8">
          <Action
            view={view}
            button="inline-flex h-12 items-center rounded-full bg-(--marca) px-8 text-[15px] font-semibold text-white"
            note="inline-flex max-w-full flex-col rounded-[14px] bg-[#f4f1ec] px-5 py-3.5"
            noteLabel={label}
            noteValue="mt-0.5 text-[16px] font-semibold break-all"
          />
        </div>
      </section>

      <dl className="mx-8 mt-10 grid grid-cols-1 gap-x-8 gap-y-4 rounded-[20px] bg-[#f4f1ec] p-6 @[600px]:grid-cols-2 @[700px]:mx-12">
        <div className="min-w-0">
          <dt className={label}>Destinatário</dt>
          <dd className={value}>
            {view.toName ? <span className="block">{view.toName}</span> : null}
            {view.to ? <span className={view.toName ? 'block font-normal break-all text-[#5f5952]' : 'block break-all'}>{view.to}</span> : null}
            {!hasRecipient(view) ? <span className="font-normal text-[#9a948c]">não informado</span> : null}
          </dd>
        </div>
        <div>
          <dt className={label}>Tipo · canal</dt>
          <dd className={value}>{COMMUNICATION_TEMPLATE_LABEL[view.template]} · e-mail</dd>
        </div>
        <div className="min-w-0">
          <dt className={label}>End-to-end da transação</dt>
          <dd className={`${value} break-all`}>{endToEndId ?? <span className="font-normal text-[#9a948c]">não informado</span>}</dd>
        </div>
        {sourceReference ? (
          <div className="min-w-0">
            <dt className={label}>ID da mensagem</dt>
            <dd className={`${value} break-all`}>{sourceReference}</dd>
          </div>
        ) : null}
      </dl>

      <footer className="px-8 pt-6 pb-9 @[700px]:px-12">
        <p className="text-[12.5px] text-[#77716a]">{view.stamp}</p>
      </footer>
    </Shell>
  );
}

/**
 * As chaves são as gravadas na conta (`brandLayout`); os nomes de cada
 * desenho ficam em `AUTO_LAYOUT_LABEL`.
 */
const LAYOUTS: Record<AutoLayout, (props: LayoutProps) => ReactNode> = {
  faixa: CartaTimbrada,
  recibo: Cupom,
  carta: EmailImpresso,
  painel: Formulario,
  janela: Aplicativo,
  selo: Vitrine,
};

export function AutoReceipt({
  brandColor,
  brandLayout,
  ...props
}: Props & { brandColor?: string | null; brandLayout?: AutoLayout | null }) {
  const Layout = LAYOUTS[brandLayout ?? 'faixa'];
  return <Layout {...props} color={brand(brandColor)} />;
}
