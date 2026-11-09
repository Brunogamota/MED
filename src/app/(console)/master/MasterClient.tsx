'use client';

import { useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { flushSync } from 'react-dom';
import { Building2, CheckCircle2, Download, FileStack, Loader2, Sparkles, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { FileDropField } from '@/components/ui/file-drop';
import { ClientEmailView } from '@/components/ClientEmailView';
import { MED_STATUS_LABEL } from '@/lib/labels';
import { VIA_LABEL, type CompanyVia } from '@/domain/master/company';
import type { SkinId } from '@/config/skins';
import type { MasterDeliveryResult, MasterLotResult, MasterPreview } from '@/services/masterService';
import {
  masterApplyGroupsAction,
  masterDeliveriesAction,
  masterGenerateChunkAction,
  masterImportChunkAction,
  masterLotListAction,
  masterMarkSubmittedAction,
  masterPreviewAction,
} from './actions';

export interface MasterAccount {
  id: string;
  name: string;
  skin: SkinId;
  brandColor: string | null;
}

const FILE_TYPES = ['.csv', '.tsv', '.txt', '.xlsx', '.zip'];
const MAX_BYTES = 20 * 1024 * 1024;

function ColorDot({ color, skin }: { color: string | null; skin: SkinId }) {
  const fixed: Partial<Record<SkinId, string>> = { bulls: '#9333ea', marketplace: '#1d4ed8', jade: '#0f172a' };
  const value = skin === 'auto' ? (color ?? '#334155') : (fixed[skin] ?? '#0f172a');
  return <span aria-hidden="true" className="inline-block size-3 shrink-0 rounded-full" style={{ background: value }} />;
}

// ---------------------------------------------------------------------------
// 1. MEDs
// ---------------------------------------------------------------------------

function ImportMeds({ onDone }: { onDone: () => void }) {
  const [preview, setPreview] = useState<MasterPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<
    { name: string; created: number; duplicated: number; skipped: number; failed: number; problems: { line: number; medId: string | null; message: string }[] }[] | null
  >(null);

  async function analyze(form: FormData) {
    setBusy(true);
    setError(null);
    setSummary(null);
    const result = await masterPreviewAction(form);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setPreview(result.data);
  }

  async function confirm() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    const mapping = await masterApplyGroupsAction(
      preview.groups.map((group) => ({
        key: group.key,
        accountId: group.accountId,
        name: group.name,
        brandColor: group.brandColor,
        learned: group.learned,
      })),
    );
    if (!mapping.ok) {
      setBusy(false);
      return setError(mapping.error);
    }
    const total = preview.groups.reduce((acc, group) => acc + group.chunks.length, 0);
    let done = 0;
    setProgress({ done, total });
    const out: NonNullable<typeof summary> = [];
    for (const group of preview.groups) {
      const accountId = mapping.data[group.key];
      const line = { name: group.name, created: 0, duplicated: 0, skipped: 0, failed: 0, problems: [] as { line: number; medId: string | null; message: string }[] };
      for (const chunk of group.chunks) {
        if (!accountId) break;
        const result = await masterImportChunkAction(accountId, chunk);
        if (result.ok) {
          line.created += result.data.created;
          line.duplicated += result.data.duplicated;
          line.skipped += result.data.skipped;
          line.failed += result.data.failed;
          line.problems.push(...result.data.problems);
        } else {
          line.failed += 1;
          line.problems.push({ line: 0, medId: null, message: result.error });
        }
        done += 1;
        setProgress({ done, total });
      }
      out.push(line);
    }
    setSummary(out);
    setPreview(null);
    setBusy(false);
    setProgress(null);
    onDone();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. MEDs de todas as empresas</CardTitle>
        <CardDescription>
          Suba a planilha misturada (ou um arquivo por empresa). Cada MED vai para a conta da empresa dele — pelo CNPJ
          ou chave Pix do recebedor, pelo nome da empresa, pelo prefixo do pedido ou pelo nome do arquivo. Empresa que
          ainda não existe é criada com modelo automático.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form action={analyze} className="space-y-4">
          <FileDropField
            name="file"
            label="Arquivos de MEDs"
            extensions={FILE_TYPES}
            maxBytes={MAX_BYTES}
            multiple
            hint="CSV, XLSX (todas as abas) ou ZIP. Pode subir vários de uma vez."
          />
          <Button type="submit" variant="outline" disabled={busy}>
            {busy && !progress ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
            Analisar
          </Button>
        </form>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        {preview ? (
          <div className="space-y-4">
            {preview.files.some((file) => file.error) ? (
              <ul className="space-y-1 text-sm">
                {preview.files
                  .filter((file) => file.error)
                  .map((file) => (
                    <li key={file.name} className="text-destructive">
                      {file.name}: {file.error}
                    </li>
                  ))}
              </ul>
            ) : null}
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Empresa</th>
                    <th className="px-3 py-2 text-right font-medium">MEDs</th>
                    <th className="px-3 py-2 font-medium">Reconhecida por</th>
                    <th className="px-3 py-2 font-medium">Aprende</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.groups.map((group) => (
                    <tr key={group.key} className="border-t">
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2">
                          <ColorDot color={group.brandColor} skin={group.skin} />
                          <span className="font-medium">{group.name}</span>
                          {group.isNew ? <Badge variant="secondary">nova · modelo automático</Badge> : null}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{group.rows}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {group.isNew
                          ? 'nome da empresa (nova)'
                          : Object.entries(group.via)
                              .map(([via, count]) => `${VIA_LABEL[via as CompanyVia]} (${count})`)
                              .join(', ')}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {group.learned.length > 0 ? group.learned.join(', ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.unknown.length > 0 ? (
              <div className="rounded-lg border border-dashed p-3 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <TriangleAlert className="size-4 text-destructive" aria-hidden="true" />
                  {preview.unknown.length} {preview.unknown.length === 1 ? 'linha sem empresa' : 'linhas sem empresa'} — ficam
                  de fora
                </p>
                <p className="mt-1 text-muted-foreground">
                  Nem CNPJ/chave, nem nome, nem prefixo, nem nome do arquivo bateram com uma empresa. Cadastre o
                  CNPJ ou o prefixo na empresa certa em Contas e suba de novo.
                </p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {preview.unknown
                    .slice(0, 12)
                    .map((row) => `${row.file} linha ${row.line}${row.medId ? ` (${row.medId})` : ''}`)
                    .join(' · ')}
                  {preview.unknown.length > 12 ? ' …' : ''}
                </p>
              </div>
            ) : null}
            <Button type="button" onClick={confirm} disabled={busy || preview.groups.length === 0}>
              Importar {preview.groups.reduce((acc, group) => acc + group.rows, 0)} MEDs em {preview.groups.length}{' '}
              {preview.groups.length === 1 ? 'empresa' : 'empresas'}
            </Button>
          </div>
        ) : null}

        {progress ? (
          <div className="space-y-1.5" aria-live="polite">
            <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
            <p className="text-muted-foreground text-xs">
              Importando bloco {progress.done} de {progress.total}…
            </p>
          </div>
        ) : null}

        {summary ? (
          <div className="space-y-2 text-sm">
            {summary.map((line) => (
              <div key={line.name} className="rounded-lg border p-3">
                <p className="font-medium">{line.name}</p>
                <p className="text-muted-foreground">
                  {line.created} novos · {line.duplicated} já existiam · {line.skipped} com erro na linha
                  {line.failed > 0 ? ` · ${line.failed} falharam` : ''}
                </p>
                {line.problems.length > 0 ? (
                  <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                    {line.problems.slice(0, 8).map((problem, index) => (
                      <li key={index}>
                        {problem.line ? `Linha ${problem.line}` : 'Bloco'}
                        {problem.medId ? ` (${problem.medId})` : ''}: {problem.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 2. Envios
// ---------------------------------------------------------------------------

function ImportDeliveries() {
  const [result, setResult] = useState<MasterDeliveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(form: FormData) {
    setBusy(true);
    setError(null);
    setResult(null);
    const response = await masterDeliveriesAction(form);
    setBusy(false);
    if (!response.ok) return setError(response.error);
    setResult(response.data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Envios e comprovantes</CardTitle>
        <CardDescription>
          Logs de envio, planilhas de pedidos e linhas do tempo de todas as empresas juntos. Cada linha vai para a
          empresa que tem aquele MED, e o comprovante sai no modelo dela.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={send} className="space-y-4">
          <FileDropField name="file" label="Arquivos de envio" extensions={FILE_TYPES} maxBytes={MAX_BYTES} multiple />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="gerarComprovantes" defaultChecked className="size-4" />
            Gerar o comprovante de cada entrega registrada
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="substituirComprovantes" className="size-4" />
            Substituir os comprovantes antigos destes casos
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
            {busy ? 'Registrando…' : 'Importar envios'}
          </Button>
        </form>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        {result ? (
          <div className="space-y-2 text-sm">
            {result.companies.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma linha casou com MED de nenhuma empresa.</p>
            ) : null}
            {result.companies.map((company) => (
              <div key={company.accountId} className="rounded-lg border p-3">
                <p className="font-medium">{company.name}</p>
                <p className="text-muted-foreground">
                  {company.recorded} registrados · {company.receipts} comprovantes gerados
                  {company.invalid > 0 ? ` · ${company.invalid} linhas inválidas` : ''}
                </p>
              </div>
            ))}
            {result.unmatched.length > 0 ? (
              <p className="text-muted-foreground">
                {result.unmatched.length} {result.unmatched.length === 1 ? 'linha não achou' : 'linhas não acharam'} MED em
                nenhuma empresa (ex.: {result.unmatched.slice(0, 3).map((line) => line.medId ?? `linha ${line.line}`).join(', ')}).
                Importe os MEDs primeiro.
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 3. Lote de defesa
// ---------------------------------------------------------------------------

interface Part {
  name: string;
  url: string;
  meds: number;
}

interface Rendered {
  key: string;
  result: MasterLotResult;
  account: MasterAccount;
  receiptIndex: number;
}

const PART_SIZE = 150;
const CHUNK = 10;

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'empresa';
}

function csvLine(values: (string | number | null)[]): string {
  return values
    .map((value) => {
      const text = value === null ? '' : String(value);
      return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    })
    .join(';');
}

function deadlineLabel(iso: string | null): string {
  if (!iso) return 'sem prazo';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Fonte da peça de cada ambiente: o print sai igual ao que a tela mostra. */
function fontFor(skin: SkinId): CSSProperties {
  return skin === 'bulls'
    ? ({ '--font-sans': "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif" } as CSSProperties)
    : ({ '--font-sans': "var(--font-inter), ui-sans-serif, system-ui, sans-serif" } as CSSProperties);
}

function DefenseLot({ accounts }: { accounts: MasterAccount[] }) {
  const today = useMemo(() => new Date(), []);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const [from, setFrom] = useState(iso(new Date(today.getTime() - 21 * 86400000)));
  const [to, setTo] = useState(iso(today));
  const [selected, setSelected] = useState<string[]>(accounts.map((account) => account.id));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [pending, setPending] = useState<{ account: string; result: MasterLotResult }[]>([]);
  const [included, setIncluded] = useState<{ accountId: string; id: string }[]>([]);
  const [rendered, setRendered] = useState<Rendered[]>([]);
  const [marked, setMarked] = useState<number | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  const byId = new Map(accounts.map((account) => [account.id, account]));

  async function run() {
    setBusy(true);
    setParts([]);
    setPending([]);
    setIncluded([]);
    setMarked(null);
    setStatus('Buscando os MEDs do período…');
    const list = await masterLotListAction({ from: from || null, to: to || null, accountIds: selected });
    if (!list.ok) {
      setBusy(false);
      return setStatus(list.error);
    }
    const items = list.data;
    if (items.length === 0) {
      setBusy(false);
      return setStatus('Nenhum MED em aberto no período, nas empresas escolhidas.');
    }

    const [{ toBlob, getFontEmbedCSS }, { default: JSZip }] = await Promise.all([
      import('html-to-image'),
      import('jszip'),
    ]);
    const fontCss = new Map<SkinId, string>();
    const allPending: { account: string; result: MasterLotResult }[] = [];
    const allIncluded: { accountId: string; id: string }[] = [];
    const newParts: Part[] = [];
    let done = 0;
    setProgress({ done, total: items.length });

    // Por empresa, na ordem de prazo; um ZIP a cada 150 MEDs.
    const companies = [...new Set(items.map((item) => item.accountId))];
    for (const accountId of companies) {
      const account = byId.get(accountId);
      if (!account) continue;
      const ids = items.filter((item) => item.accountId === accountId).map((item) => item.id);
      const folder = slug(account.name);
      let zip = new JSZip();
      let index: string[] = [csvLine(['Empresa', 'MED', 'End-to-end', 'Valor', 'Prazo', 'Score', 'Situação', 'Arquivos', 'Pendências'])];
      let inPart = 0;
      let partNumber = 1;

      const closePart = async () => {
        if (inPart === 0) return;
        zip.file('indice.csv', `﻿${index.join('\n')}\n`);
        const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
        const name = `lote-${folder}-parte-${partNumber}.zip`;
        const url = URL.createObjectURL(blob);
        newParts.push({ name, url, meds: inPart });
        setParts([...newParts]);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        partNumber += 1;
        zip = new JSZip();
        index = [index[0]!];
        inPart = 0;
      };

      for (let start = 0; start < ids.length; start += CHUNK) {
        setStatus(`${account.name}: gerando defesas ${start + 1}–${Math.min(start + CHUNK, ids.length)} de ${ids.length}…`);
        const chunk = await masterGenerateChunkAction(accountId, ids.slice(start, start + CHUNK));
        const results = chunk.ok ? chunk.data : [];
        if (!chunk.ok) setStatus(chunk.error);

        // Prints dos comprovantes: a peça no modelo da empresa, fora da tela.
        const toRender: Rendered[] = results
          .filter((result) => result.include)
          .flatMap((result) =>
            result.receipts.map((_, receiptIndex) => ({
              key: `${result.id}-${receiptIndex}`,
              result,
              account,
              receiptIndex,
            })),
          );
        flushSync(() => setRendered(toRender));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const shots = new Map<string, Blob>();
        const nodes = [...(stage.current?.querySelectorAll<HTMLElement>('[data-print-key]') ?? [])];
        if (nodes.length > 0 && !fontCss.has(account.skin)) fontCss.set(account.skin, await getFontEmbedCSS(nodes[0]!));
        for (const node of nodes) {
          const blob = await toBlob(node, {
            pixelRatio: 1.5,
            fontEmbedCSS: fontCss.get(account.skin),
            skipAutoScale: true,
            backgroundColor: '#ffffff',
          });
          if (blob) shots.set(node.dataset.printKey ?? '', blob);
        }

        // PDFs da defesa, quatro por vez.
        const pdfs = new Map<string, Blob>();
        const queue = results.filter((result) => result.include);
        await Promise.all(
          Array.from({ length: Math.min(4, queue.length) }, async () => {
            for (let item = queue.shift(); item; item = queue.shift()) {
              const response = await fetch(`/master/pdf?conta=${encodeURIComponent(accountId)}&id=${encodeURIComponent(item.id)}`);
              if (response.ok) pdfs.set(item.id, await response.blob());
            }
          }),
        );

        for (const result of results) {
          done += 1;
          if (!result.include) {
            allPending.push({ account: account.name, result });
            continue;
          }
          const dir = `${folder}/${slug(result.endToEndId ?? result.medId)}`;
          const files: string[] = [];
          const pdf = pdfs.get(result.id);
          if (pdf) {
            zip.file(`${dir}/defesa.pdf`, pdf);
            files.push('defesa.pdf');
          }
          result.receipts.forEach((_, receiptIndex) => {
            const shot = shots.get(`${result.id}-${receiptIndex}`);
            if (!shot) return;
            const name = `comprovante-${receiptIndex + 1}.png`;
            zip.file(`${dir}/${name}`, shot);
            files.push(name);
          });
          index.push(
            csvLine([
              account.name,
              result.medId,
              result.endToEndId,
              result.amountLabel,
              deadlineLabel(result.deadline),
              result.score,
              MED_STATUS_LABEL[result.status],
              files.join(', '),
              result.missing.join(', '),
            ]),
          );
          allIncluded.push({ accountId, id: result.id });
          inPart += 1;
          if (inPart >= PART_SIZE) await closePart();
        }
        setProgress({ done, total: items.length });
      }
      await closePart();
    }

    flushSync(() => setRendered([]));
    setPending(allPending);
    setIncluded(allIncluded);
    setProgress(null);
    setBusy(false);
    setStatus(
      `${allIncluded.length} ${allIncluded.length === 1 ? 'MED no lote' : 'MEDs no lote'}, em ${newParts.length} ${
        newParts.length === 1 ? 'arquivo' : 'arquivos'
      }. ${allPending.length} ${allPending.length === 1 ? 'ficou pendente' : 'ficaram pendentes'}.`,
    );
  }

  function downloadPending() {
    const lines = [csvLine(['Empresa', 'MED', 'Situação', 'O que falta', 'Erro'])];
    for (const { account, result } of pending) {
      lines.push(csvLine([account, result.medId, MED_STATUS_LABEL[result.status], result.missing.join(', '), result.error]));
    }
    const url = URL.createObjectURL(new Blob([`﻿${lines.join('\n')}\n`], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pendentes.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function markSubmitted() {
    setBusy(true);
    let total = 0;
    const companies = [...new Set(included.map((item) => item.accountId))];
    for (const accountId of companies) {
      const ids = included.filter((item) => item.accountId === accountId).map((item) => item.id);
      for (let start = 0; start < ids.length; start += 50) {
        const result = await masterMarkSubmittedAction(accountId, ids.slice(start, start + 50));
        if (result.ok) total += result.data;
      }
    }
    setMarked(total);
    setBusy(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>3. Lote de defesa</CardTitle>
        <CardDescription>
          Gera a defesa de cada MED em aberto no período e baixa um ZIP por empresa: uma pasta por MED (pelo
          end-to-end) com o PDF da defesa e os prints dos comprovantes no modelo da empresa, mais o índice. MED sem
          prova de envio e com evidência obrigatória faltando não entra: vai para a lista de pendências.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="lote-de">Abertos de</Label>
            <Input id="lote-de" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lote-ate">até</Label>
            <Input id="lote-ate" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Empresas</legend>
          <div className="flex flex-wrap gap-2">
            {accounts.map((account) => {
              const on = selected.includes(account.id);
              return (
                <label
                  key={account.id}
                  className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                >
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={on}
                    onChange={() =>
                      setSelected(on ? selected.filter((id) => id !== account.id) : [...selected, account.id])
                    }
                  />
                  <ColorDot color={account.brandColor} skin={account.skin} />
                  {account.name}
                </label>
              );
            })}
          </div>
        </fieldset>
        <Button type="button" onClick={run} disabled={busy || selected.length === 0}>
          {busy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <FileStack data-icon="inline-start" />}
          {busy ? 'Montando o lote…' : 'Gerar lote de defesa'}
        </Button>

        {progress ? (
          <div className="space-y-1.5" aria-live="polite">
            <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
            <p className="text-muted-foreground text-xs">
              {progress.done} de {progress.total} MEDs
            </p>
          </div>
        ) : null}
        {status ? (
          <p className="text-sm" aria-live="polite">
            {status}
          </p>
        ) : null}

        {parts.length > 0 ? (
          <ul className="space-y-1.5">
            {parts.map((part) => (
              <li key={part.name}>
                <a href={part.url} download={part.name} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                  <Download className="size-4" aria-hidden="true" />
                  {part.name} ({part.meds} MEDs)
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        {!busy && (pending.length > 0 || included.length > 0) ? (
          <div className="flex flex-wrap items-center gap-2">
            {pending.length > 0 ? (
              <Button type="button" variant="outline" onClick={downloadPending}>
                <TriangleAlert data-icon="inline-start" />
                Pendências ({pending.length})
              </Button>
            ) : null}
            {included.length > 0 && marked === null ? (
              <Button type="button" variant="outline" onClick={markSubmitted}>
                <CheckCircle2 data-icon="inline-start" />
                Já enviei: marcar os {included.length} como enviados
              </Button>
            ) : null}
            {marked !== null ? (
              <span className="text-sm text-muted-foreground">{marked} marcados como enviados.</span>
            ) : null}
          </div>
        ) : null}

        {/* Palco dos prints: fora da tela, na largura da peça impressa. */}
        <div ref={stage} aria-hidden="true" className="pointer-events-none fixed top-0 -left-[12000px] w-[1000px]">
          {rendered.map((item) => {
            const entry = item.result.receipts[item.receiptIndex];
            if (!entry) return null;
            return (
              <div key={item.key} data-print-key={item.key} style={fontFor(item.account.skin)} className="bg-white p-4">
                <ClientEmailView
                  receipt={entry.receipt}
                  skin={item.account.skin}
                  brandColor={item.account.brandColor}
                  sourceReference={entry.sourceReference}
                  endToEndId={item.result.endToEndId}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function MasterClient({ accounts }: { accounts: MasterAccount[] }) {
  const router = useRouter();
  const [version, setVersion] = useState(0);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Conta Master
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Todas as empresas</h1>
          <p className="text-muted-foreground text-sm">
            Importa, registra envios e monta o lote de defesa de todas as empresas de uma vez. Cada MED segue na conta
            da sua empresa, com o modelo dela.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/contas">
            <Building2 data-icon="inline-start" />
            Empresas e como reconhecê-las
          </Link>
        </Button>
      </div>
      <ImportMeds
        onDone={() => {
          setVersion(version + 1);
          router.refresh();
        }}
      />
      <ImportDeliveries />
      <DefenseLot key={version} accounts={accounts} />
    </div>
  );
}
