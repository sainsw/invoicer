export type ExtraReference = {
  id: string;
  label: string;
  value: string;
  showAtTop: boolean;
  showAtBottom: boolean;
};

export type Settings = {
  businessName: string;
  businessAddress: string;
  email: string;
  phone: string;
  defaultClientName: string;
  defaultDailyRate: number;
  currencySymbol: string;
  defaultPaymentTerms: number;
  bankDetails: string;
  headerColor: string;
  bodyColor: string;
  defaultNotes: string;
  extraReferences: ExtraReference[];
  filenameTemplate: string;
};

export type WorkBlock = {
  id: string;
  description: string;
  startDate: string;
  endDate: string;
  billingMode: 'daily' | 'block';
  dailyRate: number;
  blockTotal: number;
};

export type ComputedWorkBlock = WorkBlock & {
  days: number;
  effectiveDailyRate: number;
  lineTotal: number;
  hasError: boolean;
};

export type Expense = {
  id: string;
  date: string;
  value: number;
  notes: string;
};

export type InvoiceData = {
  invoiceMonth: string;
  invoiceNumber: string;
  purchaseOrder: string;
  issueDate: string;
  clientName: string;
  clientAddress: string;
  remittanceEmail: string;
  notes: string;
  taxRate: number;
  workBlocks: WorkBlock[];
  expenses: Expense[];
};

export type Totals = {
  workSubtotal: number;
  expensesSubtotal: number;
  preTaxSubtotal: number;
  taxAmount: number;
  total: number;
};
