import { createHash } from 'node:crypto';
import type { EvidencePack } from '@/domain/types';
import {
  parseCommunicationReceipt,
  buildClientEmailView,
  COMMUNICATION_TEMPLATE_LABEL,
} from '@/domain/communication/receipt';
import { getEvidenceDefinition } from '@/domain/evidence/catalog';
import { evaluateStrength } from '@/domain/evidence/strength';
import { formatAddress, formatAmount, formatDate, formatDateTime } from '@/lib/format';
import {
  CATEGORY_LABEL,
  DELIVERY_CHANNEL_LABEL,
  DOCUMENT_KIND_LABEL,
  MED_STATUS_LABEL,
  PRODUCT_TYPE_LABEL,
  SHIPMENT_STATUS_LABEL,
  STRENGTH_LABEL,
  VERIFICATION_STATUS_LABEL,
} from '@/lib/labels';
import {
  A4,
  COLORS,
  CONTENT_WIDTH,
  MARGIN,
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

function drawCover(context: DocumentContext, pack: EvidencePack, defenseHash: string): void {
  const { med } = pack;
  const top = A4.height - MARGIN;

  // Letterhead: emissor a esquerda, natureza do documento a direita.
  context.page.drawText(sanitize((med.merchantName ?? 'Estabelecimento').toUpperCase()), {
    x: MARGIN,
    y: top - 9,
    size: 10,
    font: context.bold,
    color: COLORS.text,
  });
  const issued = `Emitido em ${formatDateTime(pack.generatedAt) ?? pack.generatedAt}`;
  context.page.drawText(sanitize(issued), {
    x: A4.width - MARGIN - context.regular.widthOfTextAtSize(issued, 8.5),
    y: top - 9,
    size: 8.5,
    font: context.regular,
    color: COLORS.muted,
  });

  context.page.drawLine({
    start: { x: MARGIN, y: top - 18 },
    end: { x: A4.width - MARGIN, y: top - 18 },
    thickness: 1.2,
    color: COLORS.rule,
  });

  // Titulo do documento, serif.
  context.page.drawText('Relatório de defesa de MED', {
    x: MARGIN,
    y: top - 46,
    size: 21,
    font: context.serifBold,
    color: COLORS.text,
  });

  // Linha de identificacao do documento: protocolo, versao, natureza.
  const docLine = `Documento nº ${med.medId}  ·  defesa versão ${pack.defense.version}  ·  peça de contestação de MED (Pix)`;
  context.page.drawText(sanitize(docLine), {
    x: MARGIN,
    y: top - 63,
    size: 9,
    font: context.regular,
    color: COLORS.muted,
  });

  // Ancora de autenticidade ja na capa: qualquer alteracao invalida o hash.
  context.page.drawText(sanitize(`Autenticação SHA-256: ${defenseHash}`), {
    x: MARGIN,
    y: top - 77,
    size: 7,
    font: context.regular,
    color: COLORS.faint,
  });

  context.page.drawLine({
    start: { x: MARGIN, y: top - 87 },
    end: { x: A4.width - MARGIN, y: top - 87 },
    thickness: 0.5,
    color: COLORS.hairline,
  });

  context.y = top - 104;

  drawKeyValueGrid(
    context,
    [
      { label: 'MED ID', value: med.medId },
      { label: 'ID DA TRANSAÇÃO', value: med.transactionId ?? 'Não informado' },
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
      { label: 'SITUAÇÃO', value: MED_STATUS_LABEL[med.status] },
    ],
    2,
  );

  drawScorePanel(context, pack);
}

function drawScorePanel(context: DocumentContext, pack: EvidencePack): void {
  const { score } = pack.defense;
  ensureSpace(context, 40 + score.components.length * 15);

  const top = context.y;
  context.page.drawText('Índice de completude documental', {
    x: MARGIN,
    y: top - 11,
    size: 9,
    font: context.bold,
    color: COLORS.text,
  });
  const total = `${score.total} de ${score.max}`;
  context.page.drawText(sanitize(total), {
    x: A4.width - MARGIN - context.serifBold.widthOfTextAtSize(total, 15),
    y: top - 13,
    size: 15,
    font: context.serifBold,
    color: COLORS.text,
  });
  context.y = top - 24;

  // Barras monocromaticas: tinta sobre trilho claro. Sem cor semantica.
  for (const component of score.components) {
    ensureSpace(context, 15);
    const rowTop = context.y;
    context.page.drawText(sanitize(CATEGORY_LABEL[component.category]), {
      x: MARGIN,
      y: rowTop - 8,
      size: 8.5,
      font: context.regular,
      color: COLORS.text,
    });
    const barX = MARGIN + 150;
    const barWidth = CONTENT_WIDTH - 210;
    context.page.drawRectangle({ x: barX, y: rowTop - 8, width: barWidth, height: 5, color: COLORS.hairline });
    const ratio = component.max === 0 ? 0 : component.earned / component.max;
    context.page.drawRectangle({
      x: barX,
      y: rowTop - 8,
      width: Math.max(0, barWidth * ratio),
      height: 5,
      color: COLORS.text,
    });
    const frac = `${component.earned}/${component.max}`;
    context.page.drawText(sanitize(frac), {
      x: A4.width - MARGIN - context.regular.widthOfTextAtSize(frac, 8.5),
      y: rowTop - 8,
      size: 8.5,
      font: context.regular,
      color: COLORS.muted,
    });
    context.y = rowTop - 15;
  }

  context.y -= 4;
  drawParagraph(
    context,
    'Índice interno de completude e força documental do conjunto de evidências, segundo as regras deste sistema. Não expressa probabilidade de êxito na contestação.',
    { size: 7.5, color: COLORS.muted },
  );
}

function drawTimeline(context: DocumentContext, pack: EvidencePack): void {
  drawSectionTitle(context, '2. Linha do tempo da transação');

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
  drawSectionTitle(context, '9. Evidências apresentadas');

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
      const displayed = /^\d{4}-\d{2}-\d{2}T/.test(value)
        ? (formatDateTime(value) ?? value)
        : value;
      return [
        definition.label,
        displayed,
        origin,
        VERIFICATION_STATUS_LABEL[evidence.verificationStatus],
        STRENGTH_LABEL[evaluateStrength(evidence).strength],
      ];
    }),
  );
}

function drawMissing(context: DocumentContext, pack: EvidencePack): void {
  drawSectionTitle(context, '10. Evidências não disponíveis');

  if (pack.defense.missingEvidences.length === 0) {
    drawParagraph(context, 'Todas as evidências previstas para este caso estão disponíveis.', {
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
      missing.status === 'PENDING' ? 'Pendente' : missing.status === 'CONFLICTING' ? 'Conflitante' : 'Faltante',
      missing.necessity === 'REQUIRED' ? 'Obrigatória' : missing.necessity === 'RECOMMENDED' ? 'Recomendada' : 'Opcional',
      missing.rationale,
    ]),
  );
}

function drawParties(context: DocumentContext, pack: EvidencePack): void {
  const { med, customer, order, transaction, tracking } = pack;

  drawSectionTitle(context, '3. Dados do cliente');
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

  drawSectionTitle(context, '4. Dados da compra');
  drawKeyValueGrid(context, [
    { label: 'PEDIDO', value: order?.externalId ?? order?.id ?? 'Não informado' },
    {
      label: 'TIPO DE PRODUTO',
      value: order?.productType
        ? PRODUCT_TYPE_LABEL[order.productType]
        : med.productType
          ? PRODUCT_TYPE_LABEL[med.productType]
          : 'Não informado',
    },
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

  drawSectionTitle(context, '5. Dados do pagamento');
  drawKeyValueGrid(context, [
    { label: 'MÉTODO', value: transaction?.method ?? 'Não informado' },
    { label: 'SITUAÇÃO', value: transaction?.status ?? 'Não informado' },
    { label: 'AUTORIZADO EM', value: formatDateTime(transaction?.authorizedAt) ?? 'Não informado' },
    { label: 'PROVEDOR', value: transaction?.provider ?? 'Não informado' },
    { label: 'REFERÊNCIA', value: transaction?.providerReference ?? 'Não informada' },
    { label: 'END-TO-END ID', value: transaction?.endToEndId ?? med.endToEndId ?? 'Não informado' },
  ]);

  drawSectionTitle(context, '6. Dados técnicos da compra');
  drawKeyValueGrid(context, [
    { label: 'IP DO CHECKOUT', value: order?.checkoutIp ?? 'Não informado' },
    { label: 'DEVICE', value: order?.deviceFingerprint ?? 'Não informado' },
    { label: 'USER AGENT', value: order?.userAgent ?? 'Não informado' },
    { label: 'IP INFORMADO NO MED', value: med.payerIp ?? 'Não informado' },
  ]);

  const digitalDelivery = pack.digitalDelivery;

  drawSectionTitle(context, '7. Dados de entrega');

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
      { label: 'SITUAÇÃO', value: SHIPMENT_STATUS_LABEL[tracking.status] },
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
  drawSectionTitle(context, '11. Documentos anexados');
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
      DOCUMENT_KIND_LABEL[document.kind],
      `${SOURCE_LABEL[document.source] ?? document.source}${
        document.sourceReference ? ` - ${document.sourceReference}` : ''
      }`,
    ]),
  );
}

function drawClaims(context: DocumentContext, pack: EvidencePack): void {
  drawSectionTitle(context, '8. Afirmações e evidências que as sustentam');

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

/**
 * Seção de verificação e integridade.
 *
 * Feita para o analista da instituição de pagamento: diz exatamente como cada
 * dado deste documento pode ser reconferido fora dele — na transportadora, no
 * SPI, no provedor — e amarra o conteúdo a um hash SHA-256 da defesa, que é
 * imutável e versionada no sistema de origem.
 */
function drawIntegrity(context: DocumentContext, pack: EvidencePack, defenseHash: string): void {
  drawSectionTitle(context, '13. Verificação e integridade');

  drawParagraph(
    context,
    'Cada afirmação deste documento referencia evidências identificadas individualmente, com origem e referência externa. Nenhum dado ausente foi preenchido por estimativa: o que não consta nos registros aparece como não disponível.',
    { size: 9.5 },
  );
  context.y -= 4;

  const byVerification = { VERIFIED: 0, UNVERIFIED: 0, PENDING: 0, CONFLICTING: 0 } as Record<string, number>;
  let machineSourced = 0;
  let withReference = 0;
  for (const evidence of pack.evidences) {
    byVerification[evidence.verificationStatus] = (byVerification[evidence.verificationStatus] ?? 0) + 1;
    if (evidence.source !== 'MANUAL') machineSourced += 1;
    if (evidence.sourceReference) withReference += 1;
  }

  drawKeyValueGrid(context, [
    { label: 'DEFESA', value: `${pack.defense.id} — versão ${pack.defense.version} (imutável)` },
    { label: 'GERADA EM', value: formatDateTime(pack.defense.generatedAt) ?? pack.defense.generatedAt },
    { label: 'SHA-256 DO JSON DA DEFESA', value: defenseHash },
    { label: 'PACOTE DE EVIDÊNCIAS', value: `versão ${pack.packVersion}` },
    {
      label: 'EVIDÊNCIAS',
      value: `${pack.evidences.length} no total — ${byVerification.VERIFIED} verificadas na origem, ${byVerification.UNVERIFIED} não verificadas, ${byVerification.PENDING} pendentes, ${byVerification.CONFLICTING} conflitantes (conflitantes não sustentam afirmação)`,
    },
    {
      label: 'PROCEDÊNCIA',
      value: `${machineSourced} de ${pack.evidences.length} vindas de sistema (integração ou provedor); ${withReference} com referência externa conferível`,
    },
  ], 2);

  if (pack.documents.length > 0) {
    drawParagraph(context, 'Integridade dos documentos anexados (SHA-256):', {
      size: 9,
      bold: true,
    });
    drawTable(
      context,
      [
        { header: 'Arquivo', width: 175 },
        { header: 'Checksum SHA-256', width: 324 },
      ],
      pack.documents.map((document) => [
        document.filename,
        document.checksumSha256 ?? 'não calculado no recebimento',
      ]),
    );
  }

  drawParagraph(context, 'Como reconferir os dados deste documento:', { size: 9, bold: true });
  const checks: string[] = [];
  if (pack.med.endToEndId) {
    checks.push(
      `- O end-to-end ID ${pack.med.endToEndId} identifica a transação no SPI e pode ser conferido pela própria instituição.`,
    );
  }
  if (pack.tracking?.trackingCode) {
    checks.push(
      `- O código de rastreio ${pack.tracking.trackingCode} pode ser consultado diretamente na transportadora${pack.tracking.carrier ? ` (${pack.tracking.carrier})` : ''}.`,
    );
  }
  checks.push(
    '- Cada evidência lista origem e referência na tabela de evidências; itens com procedência de sistema podem ser reconsultados na fonte.',
    '- O hash SHA-256 acima é recalculável a partir do JSON da defesa exportado pelo sistema de origem: qualquer alteração no conteúdo invalida o hash.',
  );
  for (const line of checks) {
    drawParagraph(context, line, { size: 9, color: COLORS.muted });
  }
  context.y -= 4;
}

function drawCommunications(context: DocumentContext, pack: EvidencePack): void {
  const receipts = pack.evidences
    .filter((evidence) => evidence.type === 'DELIVERY_COMMUNICATION')
    .map((evidence) => parseCommunicationReceipt(evidence.value))
    .filter((receipt): receipt is NonNullable<typeof receipt> => receipt !== null);

  if (receipts.length === 0) return;

  drawSectionTitle(context, '12. Comprovantes de comunicação (reconstrução)');
  drawParagraph(
    context,
    'Reconstrução das comunicações que o estabelecimento enviou ao cliente, apresentadas na visão do destinatário. Cada peça representa a mensagem enviada; não é captura da caixa de entrada do cliente.',
    { size: 9, color: COLORS.muted },
  );
  context.y -= 4;

  for (const receipt of receipts) {
    const view = buildClientEmailView(receipt);
    ensureSpace(context, 90);

    // Moldura da comunicacao
    drawParagraph(context, COMMUNICATION_TEMPLATE_LABEL[receipt.template], {
      size: 8,
      bold: true,
      color: COLORS.muted,
    });
    drawKeyValueGrid(context, [
      { label: 'DE', value: view.from },
      { label: 'PARA', value: view.to || 'Não informado' },
      { label: 'ASSUNTO', value: view.subject || 'Sem assunto' },
      { label: 'ENVIADO EM', value: view.sentAtLabel ?? 'Não informado' },
    ], 2);
    for (const paragraph of view.paragraphs) {
      drawParagraph(context, paragraph, { size: 9.5 });
      context.y -= 2;
    }
    if (view.reference) {
      drawParagraph(context, `Referência: ${view.reference}`, { size: 8.5, color: COLORS.muted });
    }
    drawParagraph(context, view.stamp, { size: 7.5, color: COLORS.danger });
    context.y -= 8;
  }
}

export async function renderDefenseReport(pack: EvidencePack): Promise<Uint8Array> {
  const context = await createDocument();

  const defenseHash = createHash('sha256')
    .update(JSON.stringify(pack.defense))
    .digest('hex');

  // Metadados do arquivo: quem gerou, sobre o quê, quando. Aparecem nas
  // propriedades do PDF e contam para a triagem de autenticidade da instituição.
  context.pdf.setTitle(`MED Defense Report — ${pack.med.medId}`);
  context.pdf.setSubject(
    `Defesa do MED ${pack.med.medId}, versão ${pack.defense.version}. SHA-256 da defesa: ${defenseHash}`,
  );
  context.pdf.setAuthor(pack.med.merchantName ?? 'MED Defense');
  context.pdf.setCreator('MED Defense');
  context.pdf.setProducer('MED Defense');
  const created = new Date(pack.generatedAt);
  if (!Number.isNaN(created.getTime())) context.pdf.setCreationDate(created);

  drawCover(context, pack, defenseHash);

  drawSectionTitle(context, '1. Resumo da defesa');
  drawParagraph(context, pack.defense.summary, { size: 9.5 });
  context.y -= 4;
  for (const paragraph of pack.defense.narrative.body.split('\n\n')) {
    drawParagraph(context, paragraph, { size: 9.5 });
    context.y -= 4;
  }

  drawTimeline(context, pack);
  drawParties(context, pack);
  drawClaims(context, pack);
  drawEvidences(context, pack);
  drawMissing(context, pack);
  drawDocuments(context, pack);
  drawCommunications(context, pack);

  drawIntegrity(context, pack, defenseHash);

  drawSectionTitle(context, '14. Conclusão');
  drawParagraph(
    context,
    'Todas as afirmações desta defesa estão vinculadas a evidências registradas, com identificação da origem de cada dado. Informações não disponíveis foram declaradas como indisponíveis e não foram objeto de afirmação.',
    { size: 9.5 },
  );
  drawParagraph(
    context,
    `Documento gerado automaticamente em ${formatDateTime(pack.generatedAt)} a partir do Evidence Pack ${pack.packVersion}, defesa versão ${pack.defense.version}.`,
    { size: 8, color: COLORS.muted },
  );

  drawFooters(
    context,
    `MED ${pack.med.medId} - defesa v${pack.defense.version} - SHA-256 ${defenseHash.slice(0, 20)}...`,
  );
  return context.pdf.save();
}
