import { COMPROVANTE } from '@/components/previews/marketplace/fixtures';

/**
 * Comprovante de envio — Opção 1, "Selo Azul".
 *
 * Peça impressa: cor literal aqui é permitida (representa documento externo).
 * Mostra só o que está no registro de envio. A mensagem segue a anatomia do
 * "Email Client Card" (21st.dev 8713): avatar do remetente, destinatário,
 * horário, assunto, corpo e botão — sem campo de resposta nem reações.
 */

function iniciais(nome: string): string {
  const partes = nome.split(' ').filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes[partes.length - 1]?.[0] ?? '')).toUpperCase();
}

function Campo({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 bg-white px-5 py-4 ${className}`}>
      <dt className="text-[10.5px] font-semibold tracking-[0.08em] text-[#6B7C93] uppercase">{label}</dt>
      <dd className="min-w-0 text-[14px] leading-snug font-medium text-[#0B1F3A]">{children}</dd>
    </div>
  );
}

export function Comprovante() {
  const sigla = iniciais(COMPROVANTE.remetente);
  return (
    <article
      aria-labelledby="o1-comp-titulo"
      className="mx-auto w-full max-w-[780px] overflow-hidden rounded-[6px] border border-[#E3E8EF] border-t-0 bg-white text-[#0B1F3A] shadow-[0_1px_2px_rgba(11,31,58,0.05),0_24px_48px_-24px_rgba(11,31,58,0.22)] print:max-w-none print:rounded-none print:border-0 print:shadow-none"
    >
      {/* Fio azul do topo */}
      <div aria-hidden="true" className="h-[5px] bg-[#1D4ED8] print:[print-color-adjust:exact]" />

      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-4 px-6 pt-8 pb-6 sm:px-10">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-[10px] bg-[#0B1F3A] text-[13px] font-semibold tracking-wide text-white print:[print-color-adjust:exact]"
          >
            {sigla}
          </span>
          <span className="text-[16px] font-semibold tracking-[-0.01em]">{COMPROVANTE.remetente}</span>
        </div>
        <h1
          id="o1-comp-titulo"
          className="text-[22px] leading-tight font-semibold tracking-[-0.02em] sm:pt-1.5 sm:text-right"
        >
          Comprovante de envio
        </h1>
      </header>

      {/* Campos do registro */}
      <div className="px-6 sm:px-10">
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-[#E3E8EF] bg-[#E3E8EF] sm:grid-cols-2">
          <Campo label="Remetente">{COMPROVANTE.remetente}</Campo>
          <Campo label="Destinatário">
            <span className="block">{COMPROVANTE.destinatarioNome}</span>
            <span className="block font-normal text-[#425466]">{COMPROVANTE.destinatarioEmail}</span>
          </Campo>
          <Campo label="Canal">{COMPROVANTE.canal}</Campo>
          <Campo label="Tipo">{COMPROVANTE.tipo}</Campo>
          <Campo label="Enviado em">
            <span className="font-mono text-[13.5px] tabular-nums">{COMPROVANTE.enviadoEm}</span>
          </Campo>
          <Campo label="ID da mensagem">
            <span className="font-mono text-[13.5px]">{COMPROVANTE.idMensagem}</span>
          </Campo>
          <Campo label="End-to-end" className="sm:col-span-2">
            <span className="font-mono text-[13.5px] break-all">{COMPROVANTE.e2e}</span>
          </Campo>
        </dl>
      </div>

      {/* Mensagem */}
      <section aria-labelledby="o1-comp-msg" className="px-6 pt-9 pb-10 sm:px-10">
        <div className="mb-4 flex items-center gap-3">
          <h2
            id="o1-comp-msg"
            className="text-[10.5px] font-semibold tracking-[0.12em] whitespace-nowrap text-[#6B7C93] uppercase"
          >
            Mensagem enviada
          </h2>
          <span aria-hidden="true" className="h-px flex-1 bg-[#E3E8EF]" />
        </div>

        <div className="overflow-hidden rounded-[14px] border border-[#CFDBF3] bg-white shadow-[0_1px_0_#E7EEFB,0_12px_28px_-18px_rgba(29,78,216,0.35)] print:shadow-none">
          {/* Barra do cliente de e-mail */}
          <div className="relative flex items-start gap-3.5 border-b border-[#DCE5F6] bg-[linear-gradient(180deg,#F3F7FF_0%,#FAFCFF_100%)] px-5 py-4 sm:px-6 print:[print-color-adjust:exact]">
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-[3px] bg-[linear-gradient(180deg,#0EA5E9,#1D4ED8)] print:[print-color-adjust:exact]"
            />
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1D4ED8,#0EA5E9)] text-[13px] font-semibold text-white ring-[3px] ring-white print:[print-color-adjust:exact]"
            >
              {sigla}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-[#0B1F3A]">{COMPROVANTE.remetente}</p>
              <p className="mt-0.5 text-[12.5px] text-[#425466]">
                <span className="text-[#6B7C93]">Para </span>
                {COMPROVANTE.destinatarioNome}{' '}
                <span className="break-all text-[#6B7C93]">&lt;{COMPROVANTE.destinatarioEmail}&gt;</span>
              </p>
            </div>
            <time className="hidden shrink-0 pt-0.5 font-mono text-[11.5px] text-[#6B7C93] tabular-nums sm:block">
              {COMPROVANTE.enviadoEm}
            </time>
          </div>

          {/* Corpo da mensagem */}
          <div className="px-6 pt-8 pb-9 sm:px-10">
            <time className="mb-3 block font-mono text-[11.5px] text-[#6B7C93] tabular-nums sm:hidden">
              {COMPROVANTE.enviadoEm}
            </time>
            <p className="text-[30px] leading-[1.15] font-semibold tracking-[-0.025em] text-[#0B1F3A] sm:text-[34px]">
              {COMPROVANTE.assunto}
            </p>
            <p className="mt-6 text-[15px] font-medium text-[#0B1F3A]">{COMPROVANTE.saudacao}</p>
            <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-[#425466]">{COMPROVANTE.corpo}</p>
            <a
              href={COMPROVANTE.linkPedido}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex h-11 items-center justify-center rounded-[10px] bg-[#1D4ED8] px-6 text-[14px] font-semibold text-white shadow-[0_1px_2px_rgba(11,31,58,0.15)] transition-colors hover:bg-[#1E40AF] focus-visible:ring-3 focus-visible:ring-[#1D4ED8]/30 focus-visible:outline-none print:[print-color-adjust:exact]"
            >
              {COMPROVANTE.botao}
            </a>
          </div>
        </div>
      </section>

      {/* Declaração de origem */}
      <footer className="border-t border-[#E3E8EF] bg-[#F8FAFC] px-6 py-4 sm:px-10 print:[print-color-adjust:exact]">
        <p className="text-[12px] text-[#6B7C93]">{COMPROVANTE.declaracao}</p>
      </footer>
    </article>
  );
}
