/**
 * Fundo noturno: três brilhos roxos largos e uma grade quase invisível que some
 * para as bordas. Puramente decorativo — fora da árvore de acessibilidade e da
 * impressão.
 */
export function GlowBackdrop() {
  return (
    <div
      aria-hidden
      data-print-hide
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="absolute -top-[22rem] left-[-12rem] size-[52rem] rounded-full bg-(--o5-brand)/[0.18] blur-[160px]" />
      <div className="absolute top-[28%] right-[-16rem] size-[44rem] rounded-full bg-(--o5-violet)/[0.14] blur-[170px]" />
      <div className="absolute bottom-[-24rem] left-[30%] size-[46rem] rounded-full bg-(--o5-lilac)/[0.08] blur-[180px]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-size-[72px_72px] mask-[radial-gradient(ellipse_70%_55%_at_50%_0%,black_20%,transparent_80%)]" />
    </div>
  );
}
