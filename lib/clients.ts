import { formatISODate, monthKey, parseMonthKey } from '@sainsw/invoice-pdf';
import type { InvoiceData } from '@sainsw/invoice-pdf';
import { createWorkBlockId } from '@/lib/defaults';

export const CLIENTS_KEY = 'simpleInvoice.clients';

// Stable, per-client details that pre-fill an invoice.
export type ClientProfile = {
  id: string;
  label: string;
  clientName: string;
  clientAddress: string;
  remittanceEmail: string;
  notes: string;
  taxRate: number;
  dailyRate: number;
  // Most recent invoice worked on for this client, restored when switching back.
  lastInvoice?: InvoiceData;
};

export type ClientsState = {
  activeId: string | null;
  clients: ClientProfile[];
};

export const defaultClientsState = (): ClientsState => ({ activeId: null, clients: [] });

export const createClientId = () => `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const PROFILE_FIELDS = ['clientName', 'clientAddress', 'remittanceEmail', 'notes', 'taxRate'] as const;

export const firstDailyRate = (invoice: InvoiceData, fallback: number) =>
  invoice.workBlocks.find((block) => block.billingMode !== 'block')?.dailyRate ?? fallback;

export const profileFromInvoice = (
  invoice: InvoiceData,
  label: string,
  fallbackRate: number,
  id = createClientId()
): ClientProfile => ({
  id,
  label,
  clientName: invoice.clientName,
  clientAddress: invoice.clientAddress,
  remittanceEmail: invoice.remittanceEmail || '',
  notes: invoice.notes,
  taxRate: invoice.taxRate || 0,
  dailyRate: firstDailyRate(invoice, fallbackRate),
  lastInvoice: invoice,
});

export const profileDiffers = (profile: ClientProfile, invoice: InvoiceData) =>
  PROFILE_FIELDS.some((field) => (profile[field] ?? '') !== (invoice[field] ?? ''));

/**
 * Build the invoice to show when switching to a client. A draft from the current
 * month is restored as-is; an older one is rolled forward to this month, keeping
 * the block descriptions and rates but clearing the number, PO and expenses.
 */
export const invoiceForClient = (profile: ClientProfile, base: InvoiceData): InvoiceData => {
  const { key } = monthKey(new Date());
  const last = profile.lastInvoice;
  if (last && last.invoiceMonth === key) {
    return last;
  }
  const { startOfMonth, endOfMonth } = parseMonthKey(key);
  const blocks = last?.workBlocks.length ? last.workBlocks : base.workBlocks;
  return {
    ...base,
    invoiceMonth: key,
    invoiceNumber: '',
    issueDate: formatISODate(new Date()),
    clientName: profile.clientName,
    clientAddress: profile.clientAddress,
    purchaseOrder: '',
    remittanceEmail: profile.remittanceEmail,
    notes: profile.notes,
    taxRate: profile.taxRate,
    workBlocks: blocks.map((block) => ({
      ...block,
      id: createWorkBlockId(),
      startDate: startOfMonth,
      endDate: endOfMonth,
      billingMode: 'daily',
      dailyRate: block.billingMode === 'block' ? profile.dailyRate : block.dailyRate,
      blockTotal: 0,
    })),
    expenses: [],
  };
};
