/**
 * Marca da Bulls Cash: cabeça de touro geométrica, chifres em arco.
 * Desenhada aqui até chegar o logo oficial — troca-se este arquivo só.
 */
export function BullsMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Bulls Cash"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="bulls-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C084FC" />
          <stop offset="0.55" stopColor="#A855F7" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#bulls-g)" />
      <path
        d="M7 11c1.5 5 4.5 7.5 9 8M33 11c-1.5 5-4.5 7.5-9 8"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M14 18.5h12l-1.6 9.2A3.6 3.6 0 0 1 20.9 31h-1.8a3.6 3.6 0 0 1-3.5-3.3L14 18.5Z"
        fill="#fff"
      />
      <circle cx="17.6" cy="23" r="1.2" fill="#7C3AED" />
      <circle cx="22.4" cy="23" r="1.2" fill="#7C3AED" />
    </svg>
  );
}
