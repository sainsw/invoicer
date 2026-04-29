import { DEFAULT_FILENAME_TEMPLATE } from './defaults';
import { formatISODate } from './date';
import { InvoiceData, Settings, Totals } from './types';

export type FilenameToken = {
  id: string;
  label: string;
  description: string;
  resolve: (ctx: FilenameContext) => string;
};

export type FilenameContext = {
  settings: Settings;
  invoice: InvoiceData;
  totals?: Totals;
};

export const FILENAME_TOKENS: FilenameToken[] = [
  {
    id: 'businessname',
    label: 'Business name',
    description: 'Your business / trading name from settings',
    resolve: ({ settings }) => settings.businessName || '',
  },
  {
    id: 'clientname',
    label: 'Client name',
    description: 'Client on the current invoice',
    resolve: ({ invoice }) => invoice.clientName || '',
  },
  {
    id: 'invoicenumber',
    label: 'Invoice number',
    description: 'Invoice number field',
    resolve: ({ invoice }) => invoice.invoiceNumber || '',
  },
  {
    id: 'invoicemonth',
    label: 'Invoice month',
    description: 'YYYY-MM key for the invoice month',
    resolve: ({ invoice }) => invoice.invoiceMonth || '',
  },
  {
    id: 'issuedate',
    label: 'Invoice date',
    description: 'Invoice date as YYYY-MM-DD',
    resolve: ({ invoice }) => invoice.issueDate || '',
  },
  {
    id: 'currentdate',
    label: "Today's date",
    description: 'Date when the PDF is generated',
    resolve: () => formatISODate(new Date()),
  },
  {
    id: 'purchaseorder',
    label: 'Purchase order',
    description: 'Purchase order / contact field',
    resolve: ({ invoice }) => invoice.purchaseOrder || '',
  },
  {
    id: 'total',
    label: 'Grand total',
    description: 'Final invoice total (no currency symbol)',
    resolve: ({ totals }) => (totals ? totals.total.toFixed(2) : ''),
  },
];

const TOKEN_LOOKUP = new Map(FILENAME_TOKENS.map((token) => [token.id.toLowerCase(), token]));

const TEMPLATE_PATTERN = /\[([a-zA-Z]+)\]/g;

export const substituteTemplate = (template: string, ctx: FilenameContext) =>
  template.replace(TEMPLATE_PATTERN, (match, name: string) => {
    const token = TOKEN_LOOKUP.get(name.toLowerCase());
    return token ? token.resolve(ctx) : match;
  });

const MAX_BASENAME_LENGTH = 200;

const sanitiseFilename = (raw: string) =>
  raw
    .replace(/[\\/:"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_.\s]+|[-_.\s]+$/g, '');

const capLength = (raw: string) =>
  raw.length <= MAX_BASENAME_LENGTH
    ? raw
    : raw.slice(0, MAX_BASENAME_LENGTH).replace(/[-_.\s]+$/g, '');

export const resolveFilename = (template: string, ctx: FilenameContext) => {
  const trimmed = (template || '').trim();
  const effective = trimmed || DEFAULT_FILENAME_TEMPLATE;
  const substituted = substituteTemplate(effective, ctx);
  const sanitised = sanitiseFilename(substituted);
  const base = sanitised || sanitiseFilename(substituteTemplate(DEFAULT_FILENAME_TEMPLATE, ctx)) || 'invoice';
  const capped = capLength(base);
  return /\.pdf$/i.test(capped) ? capped : `${capped}.pdf`;
};
