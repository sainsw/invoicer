import jsPDF from 'jspdf';
import { formatHumanDate } from './date';
import { ComputedWorkBlock, InvoiceData, Settings, Totals } from './types';

const lineHeight = 16;

const drawMultiline = (pdf: jsPDF, text: string, x: number, y: number, maxWidth: number) => {
  if (!text) {
    return y;
  }
  const lines = pdf.splitTextToSize(text, maxWidth);
  lines.forEach((line: string) => {
    pdf.text(line, x, y);
    y += lineHeight;
  });
  return y;
};

const formatCurrency = (symbol: string, value: number) => `${symbol}${value.toFixed(2)}`;

const parseHexColor = (value: string) => {
  const match = /^#?([a-fA-F0-9]{6})$/.exec((value || '').trim());
  if (!match) {
    return { r: 245, g: 247, b: 251 };
  }
  const int = parseInt(match[1], 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const isDarkColor = (r: number, g: number, b: number) => {
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.6;
};

type PdfInput = {
  settings: Settings;
  invoice: InvoiceData;
  lineItems: ComputedWorkBlock[];
  totals: Totals;
};

export const generateInvoicePdf = ({ settings, invoice, lineItems, totals }: PdfInput) => {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 48;
  const headerColor = parseHexColor(settings.headerColor);
  const billToText = [invoice.clientName, invoice.clientAddress].filter(Boolean).join('\n');
  const contact = [settings.email, settings.phone].filter(Boolean).join('  ·  ');

  const measureMultiline = (text: string, maxWidth: number) =>
    text ? pdf.splitTextToSize(text, maxWidth).length * lineHeight : 0;

  // Pre-compute header height (everything through Bill To)
  let headerCursor = margin;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  headerCursor += lineHeight; // after business name
  headerCursor += measureMultiline(settings.businessAddress, 200);
  if (contact) {
    headerCursor += lineHeight;
  }
  headerCursor += lineHeight; // spacing before Bill To heading
  headerCursor += lineHeight; // Bill To heading line
  headerCursor += measureMultiline(billToText, pageWidth - margin * 2);
  headerCursor += lineHeight / 2; // padding after Bill To block

  const headerTop = 0;
  const headerHeight = headerCursor - headerTop;

  pdf.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  pdf.rect(0, headerTop, pageWidth, headerHeight, 'F');

  const headerTextIsDark = isDarkColor(headerColor.r, headerColor.g, headerColor.b);
  const headerTextColor = headerTextIsDark ? 255 : 0;
  pdf.setTextColor(headerTextColor, headerTextColor, headerTextColor);

  let cursorY = margin;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(settings.businessName || 'Invoice', margin, cursorY);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  cursorY += lineHeight;
  cursorY = drawMultiline(pdf, settings.businessAddress, margin, cursorY, 200);

  if (contact) {
    pdf.text(contact, margin, cursorY);
    cursorY += lineHeight;
  }

  // Invoice metadata
  const metaX = pageWidth - margin - 200;
  const metaY = margin;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Invoice Details', metaX, metaY);
  pdf.setFont('helvetica', 'normal');
  const metaLines = [
    ['Invoice #:', invoice.invoiceNumber || '—'],
    ['PO / Contact:', invoice.purchaseOrder || '—'],
    ['Invoice date:', formatHumanDate(invoice.issueDate)],
    ['Remittance email:', invoice.remittanceEmail || settings.email || '—'],
  ];
  let metaCursor = metaY + lineHeight;
  metaLines.forEach(([label, value]) => {
    pdf.text(label, metaX, metaCursor);
    pdf.text(value, metaX + 90, metaCursor);
    metaCursor += lineHeight;
  });

  cursorY += lineHeight;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Bill To', margin, cursorY);
  pdf.setFont('helvetica', 'normal');
  cursorY += lineHeight;
  cursorY = drawMultiline(pdf, billToText, margin, cursorY, pageWidth - margin * 2);
  cursorY += lineHeight / 2;
  cursorY += lineHeight; // gap between header block and table

  // Reset text color for the main body
  pdf.setTextColor(0, 0, 0);

  // Table header
  const tableX = margin;
  const tableWidth = pageWidth - margin * 2;
  const columns = [
    { label: 'Description', width: 160, key: 'description' },
    { label: 'Start', width: 80, key: 'startDate' },
    { label: 'End', width: 80, key: 'endDate' },
    { label: 'Days', width: 50, key: 'days' },
    { label: 'Daily rate', width: 80, key: 'dailyRate' },
    { label: 'Total', width: 90, key: 'lineTotal' },
  ];
  const columnX: number[] = [];
  let x = tableX;
  columns.forEach((col) => {
    columnX.push(x);
    x += col.width;
  });

  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(240, 242, 248);
  pdf.rect(tableX, cursorY, tableWidth, lineHeight, 'F');
  columns.forEach((col, index) => {
    pdf.text(col.label, columnX[index] + 4, cursorY + lineHeight - 5);
  });
  cursorY += lineHeight + 4;

  pdf.setFont('helvetica', 'normal');
  lineItems.forEach((item) => {
    const rowY = cursorY;
    const lines = pdf.splitTextToSize(item.description || 'Work', columns[0].width - 8);
    let rowHeight = Math.max(lineHeight, lines.length * lineHeight);
    pdf.text(lines, columnX[0] + 4, cursorY + lineHeight - 5);

    pdf.text(formatHumanDate(item.startDate), columnX[1] + 4, cursorY + lineHeight - 5);
    pdf.text(formatHumanDate(item.endDate), columnX[2] + 4, cursorY + lineHeight - 5);
    pdf.text(String(item.days), columnX[3] + 4, cursorY + lineHeight - 5);
    pdf.text(formatCurrency(settings.currencySymbol, item.dailyRate), columnX[4] + 4, cursorY + lineHeight - 5);
    pdf.text(formatCurrency(settings.currencySymbol, item.lineTotal), columnX[5] + 4, cursorY + lineHeight - 5);

    pdf.line(tableX, rowY - 2, tableX + tableWidth, rowY - 2);
    cursorY += rowHeight;
  });
  pdf.line(tableX, cursorY, tableX + tableWidth, cursorY);

  cursorY += lineHeight;
  const totalsX = tableX + tableWidth - 200;
  ['Subtotal', 'Tax', 'Grand total'].forEach((label, index) => {
    const value = [
      totals.subtotal,
      totals.tax,
      totals.total,
    ][index];
    const isBold = label === 'Grand total';
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.text(label, totalsX, cursorY);
    pdf.text(formatCurrency(settings.currencySymbol, value), totalsX + 100, cursorY);
    cursorY += lineHeight;
  });

  cursorY += lineHeight;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Notes', margin, cursorY);
  cursorY += lineHeight;
  pdf.setFont('helvetica', 'normal');
  cursorY = drawMultiline(pdf, invoice.notes || '—', margin, cursorY, pageWidth - margin * 2);

  cursorY += lineHeight / 2;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Payment Details', margin, cursorY);
  cursorY += lineHeight;
  pdf.setFont('helvetica', 'normal');
  cursorY = drawMultiline(pdf, settings.bankDetails, margin, cursorY, pageWidth - margin * 2);

  const filename = invoice.invoiceNumber
    ? `invoice-${invoice.invoiceNumber}.pdf`
    : `invoice-${invoice.issueDate}.pdf`;

  pdf.save(filename.replace(/\s+/g, '-'));
};
