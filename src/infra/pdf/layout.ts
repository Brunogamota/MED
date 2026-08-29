import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

/**
 * Minimal layout engine over pdf-lib.
 *
 * pdf-lib is pure JavaScript, so PDF generation runs inside a Vercel function
 * with no headless browser and no binary dependency. That constraint is the
 * reason this small layout layer exists instead of an HTML-to-PDF pipeline.
 */

export const A4 = { width: 595.28, height: 841.89 };
export const MARGIN = 48;
export const CONTENT_WIDTH = A4.width - MARGIN * 2;

export const COLORS = {
  text: rgb(0.11, 0.13, 0.16),
  muted: rgb(0.42, 0.46, 0.52),
  line: rgb(0.85, 0.87, 0.9),
  accent: rgb(0.05, 0.35, 0.55),
  danger: rgb(0.7, 0.15, 0.15),
  success: rgb(0.11, 0.45, 0.28),
  panel: rgb(0.96, 0.97, 0.98),
};

/**
 * The standard PDF fonts use WinAnsi, which cannot encode every character a
 * merchant might have stored. Unsupported characters are transliterated rather
 * than dropped, so a value is never silently altered into a different one.
 */
export function sanitize(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '-')
    .split('')
    .map((character) => (character.charCodeAt(0) <= 0xff ? character : '?'))
    .join('');
}

export interface DocumentContext {
  pdf: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
  pages: PDFPage[];
}

export async function createDocument(): Promise<DocumentContext> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([A4.width, A4.height]);
  return { pdf, page, y: A4.height - MARGIN, regular, bold, pages: [page] };
}

export function addPage(context: DocumentContext): void {
  const page = context.pdf.addPage([A4.width, A4.height]);
  context.pages.push(page);
  context.page = page;
  context.y = A4.height - MARGIN;
}

export function ensureSpace(context: DocumentContext, needed: number): void {
  if (context.y - needed < MARGIN + 24) addPage(context);
}

export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    // A single word longer than the line is hard-split so nothing is lost.
    let remainder = word;
    while (font.widthOfTextAtSize(remainder, size) > maxWidth && remainder.length > 1) {
      let cut = remainder.length;
      while (cut > 1 && font.widthOfTextAtSize(remainder.slice(0, cut), size) > maxWidth) {
        cut -= 1;
      }
      lines.push(remainder.slice(0, cut));
      remainder = remainder.slice(cut);
    }
    current = remainder;
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

export interface TextOptions {
  size?: number;
  bold?: boolean;
  color?: ReturnType<typeof rgb>;
  x?: number;
  maxWidth?: number;
  lineHeight?: number;
}

export function drawParagraph(
  context: DocumentContext,
  text: string,
  options: TextOptions = {},
): void {
  const size = options.size ?? 10;
  const font = options.bold ? context.bold : context.regular;
  const color = options.color ?? COLORS.text;
  const x = options.x ?? MARGIN;
  const maxWidth = options.maxWidth ?? CONTENT_WIDTH - (x - MARGIN);
  const lineHeight = options.lineHeight ?? size * 1.45;

  for (const line of wrapText(text, font, size, maxWidth)) {
    ensureSpace(context, lineHeight);
    context.page.drawText(line, { x, y: context.y - size, size, font, color });
    context.y -= lineHeight;
  }
}

export function drawSectionTitle(context: DocumentContext, title: string): void {
  ensureSpace(context, 40);
  context.y -= 10;
  context.page.drawText(sanitize(title.toUpperCase()), {
    x: MARGIN,
    y: context.y - 11,
    size: 11,
    font: context.bold,
    color: COLORS.accent,
  });
  context.y -= 18;
  context.page.drawLine({
    start: { x: MARGIN, y: context.y },
    end: { x: A4.width - MARGIN, y: context.y },
    thickness: 0.7,
    color: COLORS.line,
  });
  context.y -= 12;
}

export function drawKeyValueGrid(
  context: DocumentContext,
  entries: { label: string; value: string }[],
  columns = 2,
): void {
  const columnWidth = CONTENT_WIDTH / columns;
  let column = 0;
  let rowTop = context.y;
  let rowHeight = 0;

  for (const entry of entries) {
    const x = MARGIN + column * columnWidth;
    const width = columnWidth - 12;
    const valueLines = wrapText(entry.value, context.regular, 9.5, width);
    const entryHeight = 12 + valueLines.length * 12 + 6;

    if (column === 0) {
      ensureSpace(context, entryHeight);
      rowTop = context.y;
      rowHeight = 0;
    }

    context.page.drawText(sanitize(entry.label), {
      x,
      y: rowTop - 9,
      size: 7.5,
      font: context.bold,
      color: COLORS.muted,
    });

    let lineY = rowTop - 22;
    for (const line of valueLines) {
      context.page.drawText(line, {
        x,
        y: lineY,
        size: 9.5,
        font: context.regular,
        color: COLORS.text,
      });
      lineY -= 12;
    }

    rowHeight = Math.max(rowHeight, entryHeight);
    column += 1;
    if (column === columns) {
      column = 0;
      context.y = rowTop - rowHeight;
    }
  }

  if (column !== 0) context.y = rowTop - rowHeight;
  context.y -= 4;
}

export interface TableColumn {
  header: string;
  width: number;
}

export function drawTable(
  context: DocumentContext,
  columns: TableColumn[],
  rows: string[][],
): void {
  const drawHeader = () => {
    ensureSpace(context, 26);
    let x = MARGIN;
    context.page.drawRectangle({
      x: MARGIN,
      y: context.y - 16,
      width: CONTENT_WIDTH,
      height: 16,
      color: COLORS.panel,
    });
    for (const column of columns) {
      context.page.drawText(sanitize(column.header), {
        x: x + 4,
        y: context.y - 12,
        size: 8,
        font: context.bold,
        color: COLORS.muted,
      });
      x += column.width;
    }
    context.y -= 20;
  };

  drawHeader();

  for (const row of rows) {
    const cellLines = row.map((cell, index) =>
      wrapText(cell, context.regular, 8.5, (columns[index]?.width ?? 100) - 8),
    );
    const height = Math.max(...cellLines.map((lines) => lines.length)) * 11 + 6;

    if (context.y - height < MARGIN + 24) {
      addPage(context);
      drawHeader();
    }

    let x = MARGIN;
    cellLines.forEach((lines, index) => {
      let lineY = context.y - 8;
      for (const line of lines) {
        context.page.drawText(line, {
          x: x + 4,
          y: lineY,
          size: 8.5,
          font: context.regular,
          color: COLORS.text,
        });
        lineY -= 11;
      }
      x += columns[index]?.width ?? 100;
    });

    context.y -= height;
    context.page.drawLine({
      start: { x: MARGIN, y: context.y + 2 },
      end: { x: A4.width - MARGIN, y: context.y + 2 },
      thickness: 0.4,
      color: COLORS.line,
    });
  }

  context.y -= 6;
}

export function drawFooters(context: DocumentContext, label: string): void {
  const total = context.pages.length;
  context.pages.forEach((page, index) => {
    page.drawText(sanitize(label), {
      x: MARGIN,
      y: MARGIN - 18,
      size: 7.5,
      font: context.regular,
      color: COLORS.muted,
    });
    const pageLabel = `${index + 1}/${total}`;
    const width = context.regular.widthOfTextAtSize(pageLabel, 7.5);
    page.drawText(pageLabel, {
      x: A4.width - MARGIN - width,
      y: MARGIN - 18,
      size: 7.5,
      font: context.regular,
      color: COLORS.muted,
    });
  });
}
