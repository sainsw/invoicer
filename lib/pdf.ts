import jsPDF from 'jspdf';
import { formatHumanDate } from './date';
import { ComputedWorkBlock, Expense, InvoiceData, Settings, Totals } from './types';

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
const safeExpenseDate = (value: string) => {
  try {
    return formatHumanDate(value);
  } catch {
    return '—';
  }
};

const parseHexColor = (value: string) => {
  const match = /^#?([a-fA-F0-9]{6})$/.exec((value || '').trim());
  if (!match) {
    return { r: 255, g: 255, b: 255 };
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
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const headerColor = parseHexColor(settings.headerColor);
  const bodyColor = parseHexColor(settings.bodyColor);
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
  pdf.setFillColor(bodyColor.r, bodyColor.g, bodyColor.b);
  pdf.rect(0, headerHeight, pageWidth, pageHeight - headerHeight, 'F');

  const headerTextIsDark = isDarkColor(headerColor.r, headerColor.g, headerColor.b);
  const headerTextColor = headerTextIsDark ? 255 : 0;
  pdf.setTextColor(headerTextColor, headerTextColor, headerTextColor);
  const bodyTextIsDark = isDarkColor(bodyColor.r, bodyColor.g, bodyColor.b);
  const bodyTextColor = bodyTextIsDark ? 255 : 0;

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
  pdf.setTextColor(bodyTextColor, bodyTextColor, bodyTextColor);
  pdf.setDrawColor(bodyTextColor, bodyTextColor, bodyTextColor);

  // Table header
  const tableX = margin;
  const tableWidth = pageWidth - margin * 2;
  const adjustColor = (component: number, delta: number) => Math.max(0, Math.min(255, component + delta));
  const tableHeaderFill = bodyTextIsDark
    ? {
        // Lighten slightly on dark bodies for separation
        r: adjustColor(bodyColor.r, 20),
        g: adjustColor(bodyColor.g, 20),
        b: adjustColor(bodyColor.b, 20),
      }
    : {
        // Darken slightly on light bodies so the header is visible even on white
        r: adjustColor(bodyColor.r, -14),
        g: adjustColor(bodyColor.g, -14),
        b: adjustColor(bodyColor.b, -14),
      };
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
  pdf.setFillColor(tableHeaderFill.r, tableHeaderFill.g, tableHeaderFill.b);
  pdf.rect(tableX, cursorY, tableWidth, lineHeight + 4, 'F');
  const headerLabelY = cursorY + lineHeight / 2;
  columns.forEach((col, index) => {
    pdf.text(col.label, columnX[index] + 4, headerLabelY, { baseline: 'middle' });
  });
  cursorY += lineHeight + 4;

  const bottomMargin = margin;

  const newPage = () => {
    pdf.addPage();
    pdf.setFillColor(bodyColor.r, bodyColor.g, bodyColor.b);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    pdf.setTextColor(bodyTextColor, bodyTextColor, bodyTextColor);
    pdf.setDrawColor(bodyTextColor, bodyTextColor, bodyTextColor);
    cursorY = margin;
  };

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > pageHeight - bottomMargin) {
      newPage();
    }
  };

  const renderLines = (lines: string[], x: number, topLineMiddleY: number) => {
    lines.forEach((line, i) => {
      pdf.text(line, x, topLineMiddleY + i * lineHeight, { baseline: 'middle' });
    });
  };

  pdf.setFont('helvetica', 'normal');
  lineItems.forEach((item) => {
    const lines = pdf.splitTextToSize(item.description || 'Work', columns[0].width - 8);
    const rowHeight = Math.max(lineHeight, lines.length * lineHeight);
    ensureSpace(rowHeight);
    const rowY = cursorY;
    const rowMiddle = rowY + rowHeight / 2;
    const textBaseline = { baseline: 'middle' } as const;
    renderLines(lines, columnX[0] + 4, rowY + lineHeight / 2);

    pdf.text(formatHumanDate(item.startDate), columnX[1] + 4, rowMiddle, textBaseline);
    pdf.text(formatHumanDate(item.endDate), columnX[2] + 4, rowMiddle, textBaseline);
    pdf.text(String(item.days), columnX[3] + 4, rowMiddle, textBaseline);
    pdf.text(formatCurrency(settings.currencySymbol, item.effectiveDailyRate), columnX[4] + 4, rowMiddle, textBaseline);
    pdf.text(formatCurrency(settings.currencySymbol, item.lineTotal), columnX[5] + 4, rowMiddle, textBaseline);

    pdf.line(tableX, rowY, tableX + tableWidth, rowY);
    cursorY += rowHeight;
  });
  pdf.line(tableX, cursorY, tableX + tableWidth, cursorY);

  const expenses = Array.isArray(invoice.expenses) ? invoice.expenses : [];
  if (expenses.length > 0) {
    ensureSpace(lineHeight * 3.75);
    cursorY += lineHeight * 1.75;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Expenses', margin, cursorY);
    cursorY += lineHeight;

    const expenseColumns = [
      { label: 'Date', width: 110 },
      { label: 'Notes', width: tableWidth - 230 },
      { label: 'Amount', width: 120 },
    ];
    const expenseX: number[] = [];
    let currentX = tableX;
    expenseColumns.forEach((col) => {
      expenseX.push(currentX);
      currentX += col.width;
    });

    pdf.setFillColor(tableHeaderFill.r, tableHeaderFill.g, tableHeaderFill.b);
    pdf.rect(tableX, cursorY, tableWidth, lineHeight + 4, 'F');
    const expenseHeaderY = cursorY + lineHeight / 2;
    expenseColumns.forEach((col, index) => {
      pdf.text(col.label, expenseX[index] + 4, expenseHeaderY, { baseline: 'middle' });
    });
    cursorY += lineHeight + 4;
    pdf.setFont('helvetica', 'normal');

    expenses.forEach((expense: Expense) => {
      const lines = pdf.splitTextToSize(expense.notes || 'Expense', expenseColumns[1].width - 8);
      const rowHeight = Math.max(lineHeight, lines.length * lineHeight);
      ensureSpace(rowHeight);
      const rowY = cursorY;
      const rowMiddle = rowY + rowHeight / 2;
      const textBaseline = { baseline: 'middle' } as const;
      pdf.text(safeExpenseDate(expense.date), expenseX[0] + 4, rowMiddle, textBaseline);
      renderLines(lines, expenseX[1] + 4, rowY + lineHeight / 2);
      pdf.text(formatCurrency(settings.currencySymbol, Math.max(0, expense.value || 0)), expenseX[2] + 4, rowMiddle, textBaseline);
      pdf.line(tableX, rowY, tableX + tableWidth, rowY);
      cursorY += rowHeight;
    });
    pdf.line(tableX, cursorY, tableX + tableWidth, cursorY);
  }

  const totalRows: Array<{ label: string; value: number; bold?: boolean }> = [
    { label: 'Work subtotal', value: totals.workSubtotal },
    { label: 'Expenses', value: totals.expensesSubtotal },
  ];
  const showTaxRows = (invoice.taxRate || 0) > 0 && totals.taxAmount > 0;
  if (showTaxRows) {
    totalRows.push({ label: 'Subtotal before tax', value: totals.preTaxSubtotal });
    totalRows.push({ label: 'Tax', value: totals.taxAmount });
  }
  totalRows.push({ label: 'Grand total', value: totals.total, bold: true });

  ensureSpace(lineHeight * (totalRows.length + 1));
  cursorY += lineHeight;
  const totalsX = tableX + tableWidth - 200;
  totalRows.forEach((row) => {
    const isBold = Boolean(row.bold);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.text(row.label, totalsX, cursorY);
    pdf.text(formatCurrency(settings.currencySymbol, row.value), totalsX + 100, cursorY);
    cursorY += lineHeight;
  });

  const notesLines = pdf.splitTextToSize(invoice.notes || '—', pageWidth - margin * 2);
  ensureSpace(lineHeight * 2 + notesLines.length * lineHeight);
  cursorY += lineHeight;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Notes', margin, cursorY);
  cursorY += lineHeight;
  pdf.setFont('helvetica', 'normal');
  cursorY = drawMultiline(pdf, invoice.notes || '—', margin, cursorY, pageWidth - margin * 2);

  const bankLines = pdf.splitTextToSize(settings.bankDetails || '', pageWidth - margin * 2);
  ensureSpace(lineHeight * 2 + bankLines.length * lineHeight);
  cursorY += lineHeight / 2;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Payment Details', margin, cursorY);
  cursorY += lineHeight;
  pdf.setFont('helvetica', 'normal');
  cursorY = drawMultiline(pdf, settings.bankDetails, margin, cursorY, pageWidth - margin * 2);

  const totalPages = pdf.getNumberOfPages();
  if (totalPages > 1) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const footerAlpha = bodyTextIsDark ? 140 : 160;
    pdf.setTextColor(footerAlpha, footerAlpha, footerAlpha);
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - margin / 2, { align: 'right', baseline: 'middle' });
    }
  }

  const filename = [settings.businessName, invoice.issueDate, invoice.invoiceNumber]
    .filter(Boolean)
    .join('-') + '.pdf';

  pdf.save(filename.replace(/\s+/g, '-'));
};
