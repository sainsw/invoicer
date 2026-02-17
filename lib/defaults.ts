import { FALLBACK_CURRENCY } from './currency';
import { formatISODate, monthKey, parseMonthKey } from './date';
import { Expense, InvoiceData, Settings, WorkBlock } from './types';

export const SETTINGS_KEY = 'simpleInvoice.settings';
export const INVOICE_KEY = 'simpleInvoice.lastInvoice';

export const createWorkBlockId = () => `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export const createExpenseId = () => `expense-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const defaultSettings = (): Settings => ({
  businessName: 'Your Name or Company',
  businessAddress: '123 Sample Street\nCity, Country',
  email: 'you@example.com',
  phone: '+00 1234 567890',
  defaultClientName: '',
  defaultDailyRate: 150,
  currencySymbol: FALLBACK_CURRENCY.symbol,
  defaultPaymentTerms: 14,
  bankDetails: `Bank Name:
Bank Address:
Sort Code:
Account Number:
Account Holder Name (as shown on cheques):`,
  headerColor: '#ffffff',
  bodyColor: '#ffffff',
  defaultNotes: 'Thank you for your business! Payment is appreciated within the agreed terms.',
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
