'use client';

import { useId, useRef, useState } from 'react';
import { FileSpreadsheet, Upload, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

/**
 * Campo de arquivo com area de arrastar e soltar.
 *
 * O `<input type="file">` continua sendo o campo de verdade: o que a area faz e
 * escrever nele (`input.files = ...`), entao o formulario envia o arquivo do
 * jeito nativo, sem estado paralelo que possa divergir do que sera enviado.
 *
 * A validacao acontece na hora de escolher, e nao no envio: arquivo do tipo
 * errado ou grande demais nao chega a ser anexado, e o motivo aparece ali
 * mesmo. Descobrir isso depois de esperar o envio e a pior ordem possivel.
 *
 * Com `multiple`, os arquivos se acumulam a cada escolha em vez de o ultimo
 * substituir o anterior: quem esta juntando duas metades de um export escolhe
 * uma, depois a outra, e espera que as duas fiquem.
 */

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

export function FileDropField({
  name,
  label,
  /** Extensoes aceitas, com ponto: `['.csv', '.tsv']`. */
  extensions,
  maxBytes,
  hint,
  multiple = false,
  className,
}: {
  name: string;
  label: string;
  extensions: string[];
  maxBytes: number;
  hint?: string;
  multiple?: boolean;
  className?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const accept = extensions.join(',');

  /** Devolve o motivo da recusa, ou `null` quando o arquivo serve. */
  function reasonToReject(candidate: File): string | null {
    if (!extensions.includes(extensionOf(candidate.name))) {
      return `${extensionOf(candidate.name) || 'Arquivo sem extensão'} não é aceito aqui. Envie ${extensions.join(', ')}.`;
    }
    if (candidate.size > maxBytes) {
      return `O arquivo tem ${formatBytes(candidate.size)} e o limite é ${formatBytes(maxBytes)}.`;
    }
    if (candidate.size === 0) return 'O arquivo está vazio.';
    return null;
  }

  /** Escreve a lista no input de verdade — e ele que o formulario envia. */
  function write(lista: File[]) {
    const transfer = new DataTransfer();
    for (const item of lista) transfer.items.add(item);
    if (inputRef.current) inputRef.current.files = transfer.files;
    setFiles(lista);
  }

  function attach(candidatos: File[]) {
    if (candidatos.length === 0) return;
    for (const candidato of candidatos) {
      const reason = reasonToReject(candidato);
      if (reason) {
        clear();
        setError(reason);
        return;
      }
    }
    setError(null);
    // O mesmo arquivo escolhido duas vezes entra uma vez so.
    const anteriores = multiple
      ? files.filter((atual) => !candidatos.some((novo) => novo.name === atual.name))
      : [];
    write([...anteriores, ...candidatos]);
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = '';
    setFiles([]);
    setError(null);
  }

  function remove(alvo: File) {
    write(files.filter((atual) => atual !== alvo));
  }

  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5">
        {label}
      </Label>

      {/* biome/eslint: a area e um atalho para o input, que continua sendo o
          alvo de teclado e de leitor de tela. */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const soltos = Array.from(event.dataTransfer.files);
          attach(multiple ? soltos : soltos.slice(0, 1));
        }}
        className={cn(
          'flex justify-center rounded-lg border border-dashed px-6 py-10 transition-colors',
          'has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/24',
          dragging ? 'border-primary bg-accent' : 'border-input',
          error ? 'border-destructive' : '',
        )}
      >
        <div className="sm:flex sm:items-center sm:gap-x-3">
          <Upload
            aria-hidden
            className="mx-auto h-8 w-8 text-muted-foreground sm:mx-0 sm:h-6 sm:w-6"
          />
          <div className="mt-4 flex text-sm leading-6 sm:mt-0">
            <Label
              htmlFor={id}
              className="cursor-pointer rounded-sm pl-1 font-medium text-primary hover:underline hover:underline-offset-4"
            >
              {multiple
                ? 'Arraste os arquivos aqui ou clique para escolher'
                : 'Arraste o arquivo aqui ou clique para escolher'}
            </Label>
          </div>
        </div>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(event) => attach(Array.from(event.target.files ?? []))}
        />
      </div>

      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}

      {error ? (
        <p role="status" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {files.map((file) => (
        <div key={file.name} className="relative mt-3 rounded-lg bg-muted p-3">
          <div className="absolute top-1 right-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-sm p-2 text-muted-foreground hover:text-foreground"
              aria-label={`Remover ${file.name}`}
              onClick={() => (multiple ? remove(file) : clear())}
            >
              <X aria-hidden className="size-4 shrink-0" />
            </Button>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-background shadow-sm ring-1 ring-input ring-inset">
              <FileSpreadsheet aria-hidden className="size-5" />
            </span>
            <div className="min-w-0 pr-8">
              <p className="truncate font-medium text-xs">{file.name}</p>
              {/* Nao existe barra de progresso porque nao existe upload em
                  segundo plano: o arquivo sobe junto com o formulário. */}
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {formatBytes(file.size)} · anexado
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
