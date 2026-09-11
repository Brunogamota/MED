'use client';

import { useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { ptBR } from 'react-day-picker/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/**
 * Recorte por data de abertura.
 *
 * Envia por GET, entao o recorte fica no endereco: da para recarregar, marcar
 * nos favoritos e mandar o link para outra pessoa ver a mesma coisa. Estado em
 * memoria nao sobreviveria a nenhuma dessas tres.
 *
 * As datas vao como `AAAA-MM-DD` — dia, nao instante. Quem interpreta o
 * comeco e o fim do dia e o servidor, num lugar so.
 */

function toIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromIsoDay(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function DayPicker({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <input type="hidden" name={name} value={value ? toIsoDay(value) : ''} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="font-normal">
            <CalendarDays data-icon="inline-start" />
            {value ? value.toLocaleDateString('pt-BR') : label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={ptBR}
            selected={value}
            defaultMonth={value}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}

export function QueueDateFilter({
  view,
  from,
  to,
}: {
  view?: string;
  from?: string;
  to?: string;
}) {
  const [fromDate, setFromDate] = useState<Date | undefined>(fromIsoDay(from));
  const [toDate, setToDate] = useState<Date | undefined>(fromIsoDay(to));
  const active = fromDate !== undefined || toDate !== undefined;

  return (
    <form method="get" action="/meds" className="flex flex-wrap items-center gap-2">
      {/* A visão escolhida sobrevive ao filtro, em vez de voltar para a Fila. */}
      {view ? <input type="hidden" name="view" value={view} /> : null}
      <span className="text-muted-foreground text-sm">Aberto entre</span>
      <DayPicker name="de" label="início" value={fromDate} onChange={setFromDate} />
      <span className="text-muted-foreground text-sm">e</span>
      <DayPicker name="ate" label="fim" value={toDate} onChange={setToDate} />
      <Button type="submit" size="sm" variant="secondary">
        Aplicar
      </Button>
      {active ? (
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          // Limpa de verdade: zera os campos antes do envio, em vez de
          // depender de um link que perderia a visão escolhida.
          onClick={() => {
            setFromDate(undefined);
            setToDate(undefined);
          }}
        >
          <X data-icon="inline-start" />
          Limpar
        </Button>
      ) : null}
    </form>
  );
}
