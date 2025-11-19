import { FALLBACK_CURRENCY } from './currency';
import { addDays, formatISODate, monthKey, parseMonthKey } from './date';
import { InvoiceData, Settings, WorkBlock } from './types';

export const SETTINGS_KEY = 'simpleInvoice.settings';
export const INVOICE_KEY = 'simpleInvoice.lastInvoice';

export const createWorkBlockId = () => `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const defaultSettings = (): Settings => ({
  businessName: 'Your Name or Company',
  businessAddress: '123 Sample Street\nCity, Country',
  email: 'you@example.com',
  phone: '+00 1234 567890',
  defaultClientName: '',
  defaultDailyRate: 150,
  currencySymbol: FALLBACK_CURRENCY.symbol,
  defaultPaymentTerms: 14,
  bankDetails: 'Bank Name: \nAccount Number\; \nSort Code: ',
  defaultNotes: 'Thank you for your business! Payment is appreciated within the agreed terms.',
});

export const emptyWorkBlock = (dailyRate: number, month: string): WorkBlock => {
  const { startOfMonth, endOfMonth } = parseMonthKey(month);
  return {
    id: createWorkBlockId(),
    description: '',
    startDate: startOfMonth,
    endDate: endOfMonth,
    dailyRate,
  };
};

export const defaultInvoice = (settings: Settings): InvoiceData => {
  const { key } = monthKey(new Date());
  const today = formatISODate(new Date());
  return {
    invoiceMonth: key,
    invoiceNumber: '',
    issueDate: today,
    dueDate: addDays(today, settings.defaultPaymentTerms),
    clientName: settings.defaultClientName || '',
    clientAddress: '',
    notes: settings.defaultNotes,
    taxRate: 0,
    workBlocks: [emptyWorkBlock(settings.defaultDailyRate, key)],
  };
};
