'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CloudUpload, FileSpreadsheet, FileArchive, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Área de arquivos da Central Master (a partir do "Upload Dropzone Empty
 * State", 21st.dev 29988): soltar em qualquer ponto do painel, escolher do
 * computador, ver cada arquivo com o tamanho e tirar o que entrou errado.
 *
 * Não envia nada: guarda os `File` e devolve ao formulário de quem usa.
 */

const SPRING = { type: 'spring', stiffness: 520, damping: 34, mass: 0.6 } as const;

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1).replace('.', ',')} MB`;
  if (bytes >= 1000) return `${Math.round(bytes / 1000)} KB`;
  return `${bytes} B`;
}

export function MasterDropzone({
  files,
  onChange,
  title,
  hint,
  accept = '.csv,.tsv,.txt,.xlsx,.zip',
  disabled = false,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  title: string;
  hint: string;
  accept?: string;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [over, setOver] = useState(false);
  const reduced = useReducedMotion();

  const add = (incoming: File[]) => {
    if (incoming.length === 0) return;
    const known = new Set(files.map((file) => `${file.name}:${file.size}`));
    onChange([...files, ...incoming.filter((file) => !known.has(`${file.name}:${file.size}`))]);
  };

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        if (disabled) return;
        // dragenter dispara de novo em cada filho: o contador diz quando saiu de fato.
        depth.current += 1;
        setOver(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setOver(false);
        if (!disabled) add(Array.from(event.dataTransfer.files));
      }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-dashed bg-muted/30 transition-colors',
        over ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/25',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      {/* Feixe de luz atrás do ícone */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-56 w-[70%] rounded-full bg-[radial-gradient(closest-side,var(--color-primary),transparent)] opacity-[0.08]"
      />
      <div className="relative flex flex-col items-center gap-4 px-6 py-10 text-center">
        <motion.span
          animate={over && !reduced ? { y: -4, scale: 1.06 } : { y: 0, scale: 1 }}
          transition={SPRING}
          className="flex size-14 items-center justify-center rounded-2xl border bg-card shadow-sm"
        >
          <CloudUpload className={cn('size-6', over ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
        </motion.span>
        <div className="space-y-1">
          <p className="text-[15px] font-semibold">{over ? 'Pode soltar' : title}</p>
          <p className="max-w-md text-[13px] text-muted-foreground">{hint}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3.5 text-[13px] font-medium shadow-xs transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Escolher arquivos
          </button>
          {files.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="inline-flex h-9 items-center rounded-lg px-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Limpar
            </button>
          ) : null}
        </div>

        <AnimatePresence initial={false}>
          {files.length > 0 ? (
            <motion.ul
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid w-full max-w-2xl gap-1.5 sm:grid-cols-2"
            >
              {files.map((file) => {
                const zip = /\.zip$/i.test(file.name);
                const Icon = zip ? FileArchive : FileSpreadsheet;
                return (
                  <motion.li
                    key={`${file.name}:${file.size}`}
                    layout
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={SPRING}
                    className="flex min-w-0 items-center gap-2.5 rounded-xl border bg-card px-3 py-2 text-left shadow-xs"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{file.name}</span>
                      <span className="block font-mono text-[11.5px] text-muted-foreground">{formatSize(file.size)}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Tirar ${file.name}`}
                      onClick={() => onChange(files.filter((candidate) => candidate !== file))}
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          add(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
    </div>
  );
}
