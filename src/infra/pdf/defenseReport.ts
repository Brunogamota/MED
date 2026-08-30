import type { EvidencePack } from '@/domain/types';
import { getEvidenceDefinition } from '@/domain/evidence/catalog';
import { evaluateStrength } from '@/domain/evidence/strength';
import { formatAddress, formatAmount, formatDate, formatDateTime } from '@/lib/format';
import { DELIVERY_CHANNEL_LABEL, SHIPMENT_STATUS_LABEL } from '@/lib/labels';
import {
  A4,
  COLORS,
  CONTENT_WIDTH,
  MARGIN,
  addPage,
  createDocument,
  drawFooters,
  drawKeyValueGrid,
  drawParagraph,
  drawSectionTitle,
  drawTable,
  ensureSpace,
  sanitize,
  wrapText,
  type DocumentContext,
} from '@/infra/pdf/layout';

/**
 * MED Defense Report.
 *
 * Renders an Evidence Pack as the document sent to the requesting institution.
 * It is a projection: it shows what the pack contains and nothing else. Sections
 * with no data are rendered as explicitly empty rather than omitted, só a reader
 * can tell "we have nothing here" apart from "this was left out".
 */

const REASON_LABEL: Record<string, string> = {
  UNRECOGNIZED_TRANSACTION: 'Não reconhecimento da transação',
  PRODUCT_NOT_RECEIVED: 'Produto ou serviço não recebido',
  PRODUCT_NOT_AS_DESCRIBED: 'Produto ou serviço diferente do anunciado',
  FRAUD_SCAM: 'Suspeita de golpe',
  FRAUD_COERCION: 'Transação sob coação',
  FRAUD_ACCOUNT_TAKEOVER: 'Suspeita de invasão de conta',
  DUPLICATE_CHARGE: 'Cobranca em duplicidade',
  OPERATIONAL_ERROR: 'Erro operacional',
  OTHER: 'Outro',
};

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: 'Manual',
  API: 'API',
  WEBHOOK: 'Webhook',
  SHOPIFY: 'Shopify',
  TRACKING_PROVIDER: 'Transportadora',
  PAYMENT_PROVIDER: 'Provedor de pagamento',
  ANTIFRAUD: 'Antifraude',
  ERP: 'ERP',
  MERCHANT: 'Estabelecimento',
  SYSTEM_DERIVED: 'Derivado pelo sistema',
};

function drawCover(context: DocumentContext, pack: EvidencePack): void {
  const { med } = pack;

  context.page.drawRectangle({
    x: 0,
    y: A4.height - 96,
    width: A4.width,
    height: 96,
    color: COLORS.accent,
  });
  context.page.drawText('MED DEFENSE REPORT', {
    x: MARGIN,
    y: A4.height - 52,
    size: 20,
    font: context.bold,
    color: COLORS.panel,
  });
  context.page.drawText(sanitize(med.merchantName ?? 'Estabelecimento'), {
    x: MARGIN,
    y: A4.height - 74,
    size: 10,
    font: context.regular,
    color: COLORS.panel,
  });

  context.y = A4.height - 120;

  drawKeyValueGrid(
    context,
    [
      { label: 'MED ID', value: med.medId },
      { label: 'TRANSACTION ID', value: med.transactionId ?? 'Não informado' },
      { label: 'END-TO-END ID', value: med.endToEndId ?? 'Não informado' },
      { label: 'VALOR', value: formatAmount(med.amount, med.currency) },
      { label: 'DATA DA TRANSAÇÃO', value: formatDateTime(med.transactionAt) ?? 'Não informada' },
      { label: 'ABERTURA DO MED', value: formatDateTime(med.openedAt) ?? 'Não informada' },
      {
        label: 'PRAZO DE RESPOSTA',
        value: formatDateTime(med.responseDeadlineAt) ?? 'Não informado',
      },
      { label: 'INSTITUIÇÃO SOLICITANTE', value: med.requestingInstitution ?? 'Não informada' },
      { label: 'MOTIVO', value: REASON_LABEL[med.reason] ?? med.reason },
      { label: 'STATUS', value: med.status },
    ],
    2,
  );

  drawScorePanel(context, pack);
}

function drawScorePanel(context: DocumentContext, pack: EvidencePack): void {
  const { score } = pack.defense;
  ensureSpace(context, 120);

  const panelTop = context.y;
  const panelHeight = 40 + score.components.length * 14;
  context.page.drawRectangle({
    x: MARGIN,
    y: panelTop - panelHeight,
    width: CONTENT_WIDTH,
    height: panelHeight,
    color: COLORS.panel,
  });

  context.page.drawText('DOCUMENTATION SCORE', {
    x: MARGIN + 12,
    y: panelTop - 18,
    size: 8,
    font: context.bold,
    color: COLORS.muted,
  });
  context.page.drawText(`${score.total}/${score.max}`, {
    x: MARGIN + 12,
    y: panelTop - 36,
    size: 16,
    font: context.bold,
    color: COLORS.accent,
  });

  let lineY = panelTop - 20;
  for (const component of score.components) {
    const label = `${component.category}: ${component.earned}/${component.max}`;
    context.page.drawText(sanitize(label), {
      x: MARGIN + 160,
      y: lineY,
      size: 8.5,
      font: context.regular,
      color: COLORS.text,
    });
    const barX = MARGIN + 300;
    const barWidth = CONTENT_WIDTH - 320;
    context.page.drawRectangle({
      x: barX,
      y: lineY - 1,
      width: barWidth,
      height: 6,
      color: COLORS.line,
    });
    const ratio = component.max === 0 ? 0 : component.earned / component.max;
    context.page.drawRectangle({
      x: barX,
      y: lineY - 1,
      width: Math.max(0, barWidth * ratio),
      height: 6,
      color: ratio >= 0.8 ? COLORS.success : COLORS.accent,
    });
    lineY -= 14;
  }

  context.y = panelTop - panelHeight - 8;
  drawParagraph(
    context,
    'Este indicador mede exclusivamente a completude e a força documental do conjunto de evidências segundo as regras internas do sistema. Não representa probabilidade de exito na contestação.',
    { size: 7.5, color: COLORS.muted },
  );
}

function drawTimeline(context: DocumentContext, pack: EvidencePack): void {
  drawSectionTitle(context, 'Linha do tempo da transação');

  if (pack.timeline.length === 0) {
    drawParagraph(context, 'Nenhum evento datado foi registrado para esta transação.', {
      color: COLORS.muted,
    });
    return;
  }

  for (const event of pack.timeline) {
    const descriptionLines = wrapText(event.description, context.regular, 9.5, CONTENT_WIDTH - 150);
    const blockHeight = Math.max(26, descriptionLines.length * 12 + 14);
    ensureSpace(context, blockHeight);

    const top = context.y;
    const dotX = MARGIN + 96;

    context.page.drawText(sanitize(formatDateTime(event.occurredAt) ?? event.occurredAt), {
      x: MARGIN,
      y: top - 10,
      size: 8.5,
      font: context.bold,
      color: COLORS.muted,
    });

    context.page.drawCircle({ x: dotX, y: top - 7, size: 3, color: COLORS.accent });
    context.page.drawLine({
      start: { x: dotX, y: top - 10 },
      end: { x: dotX, y: top - blockHeight },
      thickness: 0.6,
      color: COLORS.line,
    });

    let lineY = top - 10;
    for (const line of descriptionLines) {
      context.page.drawText(line, {
        x: dotX + 12,
        y: lineY,
        size: 9.5,
        font: context.regular,
        color: COLORS.text,
      });
      lineY -= 12;
    }

    const origin = `${SOURCE_LABEL[event.source] ?? event.source}${
      event.sourceReference ? ` - ref. ${event.sourceReference}` : ''
    }`;
    context.page.drawText(sanitize(origin), {
      x: dotX + 12,
      y: lineY,
      size: 7.5,
      font: context.regular,
      color: COLORS.muted,
    });

    context.y = top - blockHeight;
  }

  context.y -= 6;
}

function drawEvidences(context: DocumentContext, pack: EvidencePack): void {
  drawSectionTitle(context, 'Evidências apresentadas');

  if (pack.evidences.length === 0) {
    drawParagraph(context, 'Nenhuma evidência registrada.', { color: COLORS.muted });
    return;
  }

  drawTable(
    context,
    [
      { header: 'Evidência', width: 130 },
      { header: 'Valor', width: 165 },
      { header: 'Origem', width: 110 },
      { header: 'Verificação', width: 55 },
      { header: 'Força', width: 39 },
    ],
    pack.evidences.map((evidence) => {
      const definition = getEvidenceDefinition(evidence.type);
      const value =
        evidence.displayValue ??
        (typeof evidence.value === 'string' || typeof evidence.value === 'number'
          ? String(evidence.value)
          : 'Registro estruturado anexo');
      const origin = `${SOURCE_LABEL[evidence.source] ?? evidence.source}${
        evidence.sourceReference ? `\nref. ${evidence.sourceReference}` : ''
      }`;
      return [
        definition.label,
        value,
        origin,
        evidence.verificationStatus,
        evaluateStrength(evidence).strength,
      ];
    }),
  );
}

function drawMissing(context: DocumentContext, pack: EvidencePack): void {
  drawSectionTitle(context, 'Evidências não disponíveis');

  if (pack.defense.missingEvidences.length === 0) {
    drawParagraph(context, 'Todas as evidências previstas para este caso estao disponíveis.', {
      color: COLORS.success,
    });
    return;
  }

  drawParagraph(
    context,
    'Os itens abaixo não constam nos registros e, por isso, não são afirmados em nenhum ponto desta defesa.',
    { size: 9, color: COLORS.muted },
  );

  drawTable(
    context,
    [
      { header: 'Evidência', width: 170 },
      { header: 'Situação', width: 90 },
      { header: 'Relevância', width: 90 },
      { header: 'Motivo', width: 149 },
    ],
    pack.defense.missingEvidences.map((missing) => [
      missing.label,
      missing.status,
      missing.necessity,
      missing.rationale,
    ]),
  );
}

function drawParties(context: DocumentContext, pack: EvidencePack): void {
  const { med, customer, order, transaction, tracking } = pack;

  drawSectionTitle(context, 'Dados do cliente');
  drawKeyValueGrid(context, [
    { label: 'NOME', value: customer?.identification.name ?? med.payer.name ?? 'Não informado' },
    {
      label: 'CPF/CNPJ',
      value: customer?.identification.document ?? med.payer.document ?? 'Não informado',
    },
    { label: 'E-MAIL', value: customer?.identification.email ?? med.payer.email ?? 'Não informado' },
    {
      label: 'TELEFONE',
      value: customer?.identification.phone ?? med.payer.phone ?? 'Não informado',
    },
    {
      label: 'ENDEREÇO',
      value: formatAddress(customer?.address ?? med.payerAddress) ?? 'Não informado',
    },
    {
      label: 'CLIENTE DESDE',
      value: formatDate(customer?.accountCreatedAt) ?? 'Não informado',
    },
  ]);

  drawSectionTitle(context, 'Dados da compra');
  drawKeyValueGrid(context, [
    { label: 'PEDIDO', value: order?.externalId ?? order?.id ?? 'Não informado' },
    { label: 'TIPO DE PRODUTO', value: order?.productType ?? med.productType ?? 'Não informado' },
    { label: 'DATA DA COMPRA', value: formatDateTime(order?.placedAt) ?? 'Não informada' },
    {
      label: 'VALOR DO PEDIDO',
      value:
        order?.totalAmount === null || order?.totalAmount === undefined
          ? 'Não informado'
          : formatAmount(order.totalAmount, med.currency),
    },
  ]);

  if (order && order.items.length > 0) {
    drawTable(
      context,
      [
        { header: 'Item', width: 240 },
        { header: 'SKU', width: 110 },
        { header: 'Qtd.', width: 49 },
        { header: 'Valor unitário', width: 100 },
      ],
      order.items.map((item) => [
        item.name,
        item.sku ?? '-',
        String(item.quantity),
        item.unitAmount === null || item.unitAmount === undefined
          ? '-'
          : formatAmount(item.unitAmount, med.currency),
      ]),
    );
  }

  drawSectionTitle(context, 'Dados do pagamento');
  drawKeyValueGrid(context, [
    { label: 'MÉTODO', value: transaction?.method ?? 'Não informado' },
    { label: 'STATUS', value: transaction?.status ?? 'Não informado' },
    { label: 'AUTORIZADO EM', value: formatDateTime(transaction?.authorizedAt) ?? 'Não informado' },
    { label: 'PROVEDOR', value: transaction?.provider ?? 'Não informado' },
    { label: 'REFERÊNCIA', value: transaction?.providerReference ?? 'Não informada' },
    { label: 'END-TO-END ID', value: transaction?.endToEndId ?? med.endToEndId ?? 'Não informado' },
  ]);

  drawSectionTitle(context, 'Dados técnicos da compra');
  drawKeyValueGrid(context, [
    { label: 'IP DO CHECKOUT', value: order?.checkoutIp ?? 'Não informado' },
    { label: 'DEVICE', value: order?.deviceFingerprint ?? 'Não informado' },
    { label: 'USER AGENT', value: order?.userAgent ?? 'Não informado' },
    { label: 'IP INFORMADO NO MED', value: med.payerIp ?? 'Não informado' },
  ]);

  const digitalDelivery = pack.digitalDelivery;

  drawSectionTitle(context, 'Dados de entrega');

  if (!tracking && !digitalDelivery) {
    drawParagraph(context, 'Não ha dados de entrega registrados para este caso.', {
      color: COLORS.muted,
    });
    return;
  }

  if (tracking) {
    drawKeyValueGrid(context, [
      { label: 'TRANSPORTADORA', value: tracking.carrier ?? 'Não informada' },
      { label: 'CÓDIGO DE RASTREIO', value: tracking.trackingCode ?? 'Não informado' },
      { label: 'STATUS', value: SHIPMENT_STATUS_LABEL[tracking.status] },
      { label: 'POSTAGEM', value: formatDateTime(tracking.postedAt) ?? 'Não informada' },
      { label: 'ENTREGA', value: formatDateTime(tracking.deliveredAt) ?? 'Não registrada' },
      { label: 'RECEBIDO POR', value: tracking.receiverName ?? 'Não informado' },
      {
        label: 'ENDEREÇO DE ENTREGA',
        value: formatAddress(order?.shippingAddress) ?? 'Não informado',
      },
    ]);

    if (tracking.events.length > 0) {
      drawTable(
        context,
        [
          { header: 'Data e hora', width: 120 },
          { header: 'Etapa', width: 120 },
          { header: 'Descrição', width: 150 },
          { header: 'Origem', width: 109 },
        ],
        tracking.events.map((event) => [
          formatDateTime(event.occurredAt) ?? event.occurredAt,
          SHIPMENT_STATUS_LABEL[event.status],
          event.location ? `${event.description} - ${event.location}` : event.description,
          `${SOURCE_LABEL[event.source] ?? event.source}${
            event.sourceReference ? `\n${event.sourceReference}` : ''
          }`,
        ]),
      );
    }
  }

  if (digitalDelivery) {
    drawKeyValueGrid(context, [
      { label: 'CANAL DE ENTREGA', value: DELIVERY_CHANNEL_LABEL[digitalDelivery.channel] },
      { label: 'ENVIADO PARA', value: digitalDelivery.sentTo ?? 'Não informado' },
      { label: 'ENVIADO EM', value: formatDateTime(digitalDelivery.sentAt) ?? 'Não informado' },
      { label: 'PLATAFORMA', value: digitalDelivery.platform ?? 'Não informada' },
      {
        label: 'PRIMEIRO ACESSO',
        value: formatDateTime(digitalDelivery.firstAccessAt) ?? 'Não registrado',
      },
      {
        label: 'NÚMERO DE ACESSOS',
        value:
          digitalDelivery.accessCount === null || digitalDelivery.accessCount === undefined
            ? 'Não registrado'
            : String(digitalDelivery.accessCount),
      },
      {
        label: 'ORIGEM DO REGISTRO',
        value: `${SOURCE_LABEL[digitalDelivery.source] ?? digitalDelivery.source}${
          digitalDelivery.sourceReference ? ` - ${digitalDelivery.sourceReference}` : ''
        }`,
      },
    ]);
  }
}

function drawDocuments(context: DocumentContext, pack: EvidencePack): void {
  drawSectionTitle(context, 'Documentos anexados');
  if (pack.documents.length === 0) {
    drawParagraph(context, 'Nenhum documento anexado a este caso.', { color: COLORS.muted });
    return;
  }
  drawTable(
    context,
    [
      { header: '#', width: 24 },
      { header: 'Documento', width: 200 },
      { header: 'Tipo', width: 130 },
      { header: 'Origem', width: 145 },
    ],
    pack.documents.map((document, index) => [
      String(index + 1),
      document.filename,
      document.kind,
      `${SOURCE_LABEL[document.source] ?? document.source}${
        document.sourceReference ? ` - ${document.sourceReference}` : ''
      }`,
    ]),
  );
}

function drawClaims(context: DocumentContext, pack: EvidencePack): void {
  drawSectionTitle(context, 'Afirmações e evidências que as sustentam');

  if (pack.defense.claims.length === 0) {
    drawParagraph(
      context,
      'Nenhuma afirmação factual pode ser sustentada com as evidências atualmente disponíveis.',
      { color: COLORS.danger },
    );
    return;
  }

  const evidenceById = new Map(pack.evidences.map((evidence) => [evidence.id, evidence]));

  for (const claim of pack.defense.claims) {
    ensureSpace(context, 46);
    drawParagraph(context, claim.statement, { size: 9.5, bold: true });
    const references = claim.evidenceIds
      .map((id) => {
        const evidence = evidenceById.get(id);
        if (!evidence) return id;
        const definition = getEvidenceDefinition(evidence.type);
        return `${definition.label} (${SOURCE_LABEL[evidence.source] ?? evidence.source}${
          evidence.sourceReference ? `, ref. ${evidence.sourceReference}` : ''
        })`;
      })
      .join('; ');
    drawParagraph(context, `Evidências: ${references}`, { size: 8, color: COLORS.muted });
    context.y -= 4;
  }
}

export async function renderDefenseReport(pack: EvidencePack): Promise<Uint8Array> {
  const context = await createDocument();

  drawCover(context, pack);

  drawSectionTitle(context, 'Resumo da defesa');
  drawParagraph(context, pack.defense.summary, { size: 9.5 });
  context.y -= 4;
  for (const paragraph of pack.defense.narrative.body.split('\n\n')) {
    drawParagraph(context, paragraph, { size: 9.5 });
    context.y -= 4;
  }

  addPage(context);
  drawTimeline(context, pack);
  drawParties(context, pack);
  drawClaims(context, pack);
  drawEvidences(context, pack);
  drawMissing(context, pack);
  drawDocuments(context, pack);

  drawSectionTitle(context, 'Conclusão');
  drawParagraph(
    context,
    'Todas as afirmações desta defesa estao vinculadas a evidências registradas, com identificação da origem de cada dado. Informacoes não disponíveis foram declaradas como indisponiveis e não foram objeto de afirmação.',
    { size: 9.5 },
  );
  drawParagraph(
    context,
    `Documento gerado automaticamente em ${formatDateTime(pack.generatedAt)} a partir do Evidence Pack ${pack.packVersion}, defesa versão ${pack.defense.version}.`,
    { size: 8, color: COLORS.muted },
  );

  drawFooters(context, `MED ${pack.med.medId} - defesa v${pack.defense.version}`);
  return context.pdf.save();
}
