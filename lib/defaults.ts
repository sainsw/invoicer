import { FALLBACK_CURRENCY, formatISODate, monthKey, parseMonthKey } from '@sainsw/invoice-pdf';
import type { Expense, ExtraReference, InvoiceData, Settings, WorkBlock } from '@sainsw/invoice-pdf';

export const SETTINGS_KEY = 'simpleInvoice.settings';
export const INVOICE_KEY = 'simpleInvoice.lastInvoice';
// Opt-in features still in early testing. Kept apart from Settings, whose type comes from @sainsw/invoice-pdf.
export const LABS_KEY = 'simpleInvoice.labs';

export type Labs = { accountsLink: boolean };

export const defaultLabs = (): Labs => ({ accountsLink: false });

export const DEFAULT_FILENAME_TEMPLATE = '[businessname]-[issuedate]-[invoicenumber]';

export const createWorkBlockId = () => `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export const createExpenseId = () => `expense-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export const createExtraReferenceId = () => `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const BANK_DETAILS_EXAMPLE = `Account name: Jane Smith
Sort code: 12-34-56
Account number: 12345678`;

// Sample values older versions stored as real settings; cleared on load so they show as placeholders instead.
export const LEGACY_PLACEHOLDER_SETTINGS: Partial<Record<keyof Settings, string>> = {
  businessName: 'Your Name or Company',
  businessAddress: '123 Sample Street\nCity, Country',
  email: 'you@example.com',
  phone: '+00 1234 567890',
  bankDetails: `Bank Name:
Bank Address:
Sort Code:
Account Number:
Account Holder Name (as shown on cheques):`,
};

export const defaultSettings = (): Settings => ({
  businessName: '',
  businessAddress: '',
  email: '',
  phone: '',
  defaultClientName: '',
  defaultDailyRate: 150,
  currencySymbol: FALLBACK_CURRENCY.symbol,
  defaultPaymentTerms: 14,
  bankDetails: '',
  headerColor: '#ffffff',
  bodyColor: '#ffffff',
  defaultNotes: 'Thank you for your business! Payment is appreciated within the agreed terms.',
  extraReferences: [],
  filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
});

export const emptyExtraReference = (): ExtraReference => ({
  id: createExtraReferenceId(),
  label: '',
  value: '',
  showAtTop: true,
  showAtBottom: false,
});

export const emptyWorkBlock = (dailyRate: number, month: string): WorkBlock => {
  const { startOfMonth, endOfMonth } = parseMonthKey(month);
  return {
    id: createWorkBlockId(),
    description: '',
    startDate: startOfMonth,
    endDate: endOfMonth,
    billingMode: 'daily',
    dailyRate,
    blockTotal: 0,
  };
};

export const emptyExpense = (date: string): Expense => ({
  id: createExpenseId(),
  date,
  value: 0,
  notes: '',
});

export const defaultInvoice = (settings: Settings): InvoiceData => {
  const { key } = monthKey(new Date());
  const today = formatISODate(new Date());
  return {
    invoiceMonth: key,
    invoiceNumber: '',
    purchaseOrder: '',
    issueDate: today,
    clientName: settings.defaultClientName || '',
    clientAddress: '',
    remittanceEmail: settings.email || '',
    notes: settings.defaultNotes,
    taxRate: 0,
    workBlocks: [emptyWorkBlock(settings.defaultDailyRate, key)],
    expenses: [],
  };
};
