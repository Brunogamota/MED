import Link from 'next/link';
import { serverPageContext } from '@/infra/auth/context';
import { getCase, listMeds } from '@/services/medService';
import { NotFoundError } from '@/services/errors';
import { parseCommunicationReceipt } from '@/domain/communication/receipt';
import { ClientEmailView } from '@/components/ClientEmailView';
import { resolveEndToEndId } from '@/domain/identifiers';
import type { MedCase } from '@/domain/case';
import type { Evidence } from '@/domain/types';

export const dynamic = 'force-dynamic';

/**
 * Todos os comprovantes de uma selecao, numa pagina so, pronta para imprimir.
 *
 * A pagina de um comprovante ja existia, e era o suficiente enquanto o caso era
 * um. Com vinte e sete, "Abrir para imprimir" vinte e sete vezes e o trabalho
 * que a ferramenta deveria estar poupando — e era o que vinha sendo resolvido
 * por fora, com alguem gerando o pacote a mao e mandando de volta.
 *
 * Imprimir daqui (Ctrl/Cmd+P, salvar em PDF) produz o anexo do lote inteiro,
 * um comprovante por pagina. Sem servidor de imagem e sem navegador headless: o
 * proprio navegador de quem opera faz o PDF, e por isso isto roda em qualquer
 * deploy.
 *
 * Cada peca continua saindo pelo `ClientEmailView`, com a declaracao de origem
 * junto. Nao ha caminho aqui que produza uma peca sem ela.
 */

interface Peca {
  medId: string;
  caseId: string;
  evidence: Evidence;
}

/**
 * Uma peca por envio, e nao uma por evidencia.
 *
 * Reimportar o log regrava o comprovante, e o caso acumula varias evidencias do
 * **mesmo** e-mail. Impressas todas, o anexo sai com a mesma peca repetida — o
 * que na conferencia parece varios envios onde houve um.
 *
 * A chave e o message-id, como na importacao: ele e atribuido uma vez, quando a
 * mensagem entra na fila, e nao muda. Dois envios de verdade (a confirmacao da
 * compra e a liberacao do acesso) tem message-ids proprios e continuam os dois
 * no lote — desduplicar por caso perderia um deles.
 *
 * Entre as do mesmo envio vence a que tem link: e a peca completa. A antiga,
 * gravada antes de o log trazer a URL, sai com o texto de preenchimento no
 * corpo, e nao e ela que vai para a instituicao.
 */
function pecasDoCaso(medCase: MedCase): Peca[] {
  const porEnvio = new Map<string, Evidence>();
  for (const evidence of medCase.evidences) {
    if (evidence.type !== 'DELIVERY_COMMUNICATION') continue;
    // Sem message-id nao da para afirmar que e o mesmo envio: cada uma entra.
    const chave = evidence.sourceReference?.trim() || `evidencia:${evidence.id}`;
    const atual = porEnvio.get(chave);
    if (!atual || melhor(evidence, atual)) porEnvio.set(chave, evidence);
  }
  return [...porEnvio.values()].map((evidence) => ({
    medId: medCase.med.medId,
    caseId: medCase.med.id,
    evidence,
  }));
}

/** Tem link ganha de nao tem; empatado, a mais recente. */
function melhor(candidata: Evidence, atual: Evidence): boolean {
  const comLink = (evidence: Evidence) =>
    Boolean(parseCommunicationReceipt(evidence.value)?.reference);
  if (comLink(candidata) !== comLink(atual)) return comLink(candidata);
  return candidata.createdAt > atual.createdAt;
}

export default async function ComprovantesEmLotePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; de?: string; ate?: string }>;
}) {
  const { ids, de, ate } = await searchParams;
  const auth = serverPageContext();

  // Dois caminhos de entrada: a selecao da fila (`ids`) e o recorte por data,
  // que e como o lote costuma ser pensado — "os do dia 24".
  let alvos: string[];
  if (ids) {
    alvos = ids.split(',').map((value) => value.trim()).filter(Boolean);
  } else if (de || ate) {
    const rows = await listMeds(auth, {
      limit: 500,
      openedFrom: de ? `${de}T00:00:00.000Z` : undefined,
      openedTo: ate ? `${ate}T23:59:59.999Z` : undefined,
    });
    alvos = rows.map((row) => row.med.id);
  } else {
    alvos = [];
  }

  const casos: MedCase[] = [];
  for (const id of alvos) {
    try {
      casos.push(await getCase(auth, id));
    } catch (error) {
      // Caso fora da organizacao ou apagado no meio do caminho: sai da lista
      // em vez de derrubar a pagina inteira do lote.
      if (!(error instanceof NotFoundError)) throw error;
    }
  }

  const pecas = casos.flatMap(pecasDoCaso);
  const semPeca = casos.filter((medCase) => pecasDoCaso(medCase).length === 0);

  return (
    <div className="mx-auto max-w-[680px] py-4">
      <div className="mb-4 print:hidden">
        <div className="flex items-center justify-between">
          <Link href="/meds" className="text-xs text-muted-foreground hover:text-foreground">
            ← Voltar à fila
          </Link>
          <span className="text-xs text-muted-foreground">
            Ctrl/Cmd+P para salvar o lote em PDF.
          </span>
        </div>
        <p className="mt-3 text-sm">
          {pecas.length} comprovante{pecas.length === 1 ? '' : 's'} de {casos.length} caso
          {casos.length === 1 ? '' : 's'}.
        </p>
        {semPeca.length > 0 ? (
          <div className="mt-2 rounded-md bg-amber-600/10 px-3 py-2 text-amber-800 text-xs dark:text-amber-300">
            <p className="font-medium">
              {semPeca.length} caso{semPeca.length === 1 ? '' : 's'} sem comprovante, fora do lote:
            </p>
            <p className="mt-1">
              {semPeca.map((medCase) => medCase.med.medId).join(', ')}
            </p>
            <p className="mt-1">
              Ou não houve envio registrado, ou o envio não foi concluído. Sem registro não há peça
              — e afirmar entrega que o log não mostra é o que derruba o lote inteiro na conferência.
            </p>
          </div>
        ) : null}
      </div>

      {pecas.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhum comprovante nesta seleção. Selecione os casos na fila e use “Comprovantes”, ou
          registre os envios no passo 2.
        </p>
      ) : null}

      {pecas.map((peca, index) => {
        const receipt = parseCommunicationReceipt(peca.evidence.value);
        if (!receipt) return null;
        const medCase = casos.find((item) => item.med.id === peca.caseId);
        return (
          <div
            key={peca.evidence.id}
            // Um comprovante por pagina: o anexo chega a instituicao com uma
            // peca por folha, como um documento, e nao emendado no seguinte.
            className={index > 0 ? 'break-before-page pt-6 print:pt-0' : ''}
          >
            <p className="mb-2 font-mono text-[11px] text-muted-foreground">{peca.medId}</p>
            <ClientEmailView
              receipt={receipt}
              sourceReference={peca.evidence.sourceReference}
              endToEndId={medCase ? resolveEndToEndId(medCase) : null}
            />
          </div>
        );
      })}
    </div>
  );
}
