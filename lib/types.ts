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
};

export type WorkBlock = {
  id: string;
  description: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
};

export type ComputedWorkBlock = WorkBlock & {
  days: number;
  lineTotal: number;
  hasError: boolean;
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
};

export type Totals = {
  subtotal: number;
  tax: number;
  total: number;
};
