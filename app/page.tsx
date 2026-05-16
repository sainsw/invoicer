'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExpensesTable } from '@/components/ExpensesTable';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { WorkBlocksTable } from '@/components/WorkBlocksTable';
import { usePersistentState } from '@/hooks/usePersistentState';
import {
  createWorkBlockId,
  defaultInvoice,
  defaultSettings,
  emptyExpense,
  emptyWorkBlock,
  INVOICE_KEY,
  SETTINGS_KEY,
} from '@/lib/defaults';
import {
  countWeekdaysInclusive,
  isValidDateRange,
  detectCurrencySymbol,
  resolveFilename,
  generateInvoicePdf,
} from '@sainsw/invoice-pdf';
import type { ComputedWorkBlock, Expense, InvoiceData, Settings, WorkBlock } from '@sainsw/invoice-pdf';

const disablePdf = (blocks: ComputedWorkBlock[]) =>
  blocks.length === 0 || blocks.some((block) => block.hasError || block.days === 0);

const cardClass =
  'w-full rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-900/5 transition-colors sm:p-8 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none';
const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60';
const buttonPrimary = `${buttonBase} bg-slate-900 text-white shadow-lg shadow-slate-900/10 ring-1 ring-slate-900 hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:ring-white/70 dark:shadow-white/10 dark:hover:-translate-y-0.5 dark:hover:bg-slate-100`;
const buttonSecondary = `${buttonBase} bg-white text-slate-900 ring-1 ring-slate-300 shadow-sm hover:-translate-y-0.5 hover:ring-slate-400 dark:bg-slate-900 dark:text-white dark:ring-slate-700`;
const buttonGhost = `${buttonBase} bg-transparent text-slate-700 ring-1 ring-transparent hover:-translate-y-0.5 hover:ring-slate-200 dark:text-slate-200 dark:hover:ring-slate-700`;
const iconButton =
  'inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-slate-200 text-base font-semibold text-slate-700 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-slate-100 hover:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:ring-slate-700 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:ring-slate-600';

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showSettingsReminder, setShowSettingsReminder] = useState(false);
  const [trackingLink, setTrackingLink] = useState<string | null>(null);

  const {
    value: settings,
    setValue: setSettings,
    ready: settingsReady,
    hasStoredValue: hasStoredSettings,
  } = usePersistentState(SETTINGS_KEY, defaultSettings);

  const {
    value: invoice,
    setValue: setInvoice,
    ready: invoiceReady,
  } = usePersistentState(INVOICE_KEY, () => defaultInvoice(settings));

  const computedBlocks = useMemo<ComputedWorkBlock[]>(
    () =>
      invoice.workBlocks.map((block) => {
        const validRange = isValidDateRange(block.startDate, block.endDate);
        const days = validRange ? countWeekdaysInclusive(block.startDate, block.endDate) : 0;
        const dailyRate = Math.max(0, block.dailyRate || 0);
        const lineTotal = Number((days * dailyRate).toFixed(2));
        const blockTotal = block.billingMode === 'block'
          ? Math.max(0, block.blockTotal || 0)
          : lineTotal;
        return {
          ...block,
          billingMode: block.billingMode === 'block' ? 'block' : 'daily',
          blockTotal,
          days,
          effectiveDailyRate: dailyRate,
          lineTotal,
          hasError: !validRange,
        };
      }),
    [invoice.workBlocks]
  );

  const expenses = useMemo(() => (Array.isArray(invoice.expenses) ? invoice.expenses : []), [invoice.expenses]);

  const totals = useMemo(() => {
    const workSubtotal = Number(
      computedBlocks.reduce((acc, block) => acc + (block.hasError ? 0 : block.lineTotal), 0).toFixed(2)
    );
    const expensesSubtotal = Number(
      expenses
        .reduce((acc, expense) => acc + (Number.isFinite(expense.value) ? Math.max(0, expense.value) : 0), 0)
        .toFixed(2)
    );
    const preTaxSubtotal = Number((workSubtotal + expensesSubtotal).toFixed(2));
    const taxAmount = Number(((preTaxSubtotal * (invoice.taxRate || 0)) / 100).toFixed(2));
    const total = Number((preTaxSubtotal + taxAmount).toFixed(2));
    return { workSubtotal, expensesSubtotal, preTaxSubtotal, taxAmount, total };
  }, [computedBlocks, expenses, invoice.taxRate]);

  const usingPlaceholderSettings = useMemo(() => {
    const defaults = defaultSettings();
    const keys: Array<keyof Settings> = ['businessName', 'businessAddress', 'email', 'phone', 'bankDetails'];
    const normalize = (value: Settings[typeof keys[number]]) => (typeof value === 'string' ? value.trim() : String(value));
    return keys.every((key) => normalize(settings[key]) === normalize(defaults[key]));
  }, [settings]);

  const ready = settingsReady && invoiceReady;

  useEffect(() => {
    if (!settingsReady || hasStoredSettings) {
      return;
    }
    const symbol = detectCurrencySymbol();
    if (!symbol || symbol === settings.currencySymbol) {
      return;
    }
    setSettings((prev) => ({ ...prev, currencySymbol: symbol }));
  }, [hasStoredSettings, setSettings, settings.currencySymbol, settingsReady]);

  useEffect(() => {
    if (!settingsReady) {
      return;
    }
    const defaults = defaultSettings();
    const patch: Partial<Settings> = {};
    if (!settings.headerColor) {
      patch.headerColor = defaults.headerColor;
    }
    if (!settings.bodyColor) {
      patch.bodyColor = defaults.bodyColor;
    }
    if (!Array.isArray(settings.extraReferences)) {
      patch.extraReferences = defaults.extraReferences;
    }
    if (typeof settings.filenameTemplate !== 'string') {
      patch.filenameTemplate = defaults.filenameTemplate;
    }
    if (Object.keys(patch).length > 0) {
      setSettings((prev) => ({ ...prev, ...patch }));
    }
  }, [
    setSettings,
    settings.bodyColor,
    settings.extraReferences,
    settings.filenameTemplate,
    settings.headerColor,
    settingsReady,
  ]);

  useEffect(() => {
    if (!invoiceReady) {
      return;
    }
    setInvoice((prev) => {
      let changed = false;
      const nextBlocks = prev.workBlocks.map((block) => {
        const billingMode: WorkBlock['billingMode'] = block.billingMode === 'block' ? 'block' : 'daily';
        const blockTotal = Number.isFinite(block.blockTotal) ? Math.max(0, block.blockTotal) : 0;
        if (billingMode !== block.billingMode || blockTotal !== block.blockTotal) {
          changed = true;
        }
        return { ...block, billingMode, blockTotal };
      });
      const nextExpenses = Array.isArray(prev.expenses)
        ? prev.expenses.map((expense) => {
            const nextValue = Number.isFinite(expense.value) ? Math.max(0, expense.value) : 0;
            if (nextValue !== expense.value) {
              changed = true;
            }
            return { ...expense, value: nextValue };
          })
        : [];
      if (!Array.isArray(prev.expenses)) {
        changed = true;
      }
      if (!changed) {
        return prev;
      }
      return { ...prev, workBlocks: nextBlocks, expenses: nextExpenses };
    });
  }, [invoiceReady, setInvoice]);

  const localeDefaultSettings = () => {
    const base = defaultSettings();
    const symbol = detectCurrencySymbol();
    return {
      ...base,
      currencySymbol: symbol || base.currencySymbol,
    };
  };

  const updateInvoice = (patch: Partial<InvoiceData>) => {
    setInvoice((prev) => ({ ...prev, ...patch }));
  };

  const handleWorkBlockChange = (id: string, patch: Partial<WorkBlock>) => {
    setInvoice((prev) => ({
      ...prev,
      workBlocks: prev.workBlocks.map((block) => {
        if (block.id !== id) {
          return block;
        }

        const next = { ...block, ...patch };
        const validRange = isValidDateRange(next.startDate, next.endDate);
        const days = validRange ? countWeekdaysInclusive(next.startDate, next.endDate) : 0;
        const isDailyEdit = Object.prototype.hasOwnProperty.call(patch, 'dailyRate')
          && !Object.prototype.hasOwnProperty.call(patch, 'blockTotal');
        const isBlockEdit = Object.prototype.hasOwnProperty.call(patch, 'blockTotal')
          && !Object.prototype.hasOwnProperty.call(patch, 'dailyRate');
        const isDateEdit = Object.prototype.hasOwnProperty.call(patch, 'startDate')
          || Object.prototype.hasOwnProperty.call(patch, 'endDate');

        if (isDailyEdit) {
          const dailyRate = Math.max(0, Number(next.dailyRate) || 0);
          return {
            ...next,
            billingMode: 'daily',
            dailyRate,
            blockTotal: Number((dailyRate * days).toFixed(2)),
          };
        }

        if (isBlockEdit) {
          const blockTotal = Math.max(0, Number(next.blockTotal) || 0);
          const dailyRate = days > 0 ? blockTotal / days : 0;
          return {
            ...next,
            billingMode: 'block',
            blockTotal,
            dailyRate: Number(dailyRate.toFixed(4)),
          };
        }

        if (isDateEdit) {
          const dailyRate = Math.max(0, Number(next.dailyRate) || 0);
          return {
            ...next,
            dailyRate,
            blockTotal: Number((dailyRate * days).toFixed(2)),
          };
        }

        return next;
      }),
    }));
  };

  const addWorkBlock = () => {
    setInvoice((prev) => ({
      ...prev,
      workBlocks: [...prev.workBlocks, emptyWorkBlock(settings.defaultDailyRate || 0, prev.invoiceMonth)],
    }));
  };

  const duplicateBlock = (id: string) => {
    setInvoice((prev) => {
      const target = prev.workBlocks.find((block) => block.id === id);
      if (!target) {
        return prev;
      }
      const clone = { ...target, id: createWorkBlockId() };
      return { ...prev, workBlocks: [...prev.workBlocks, clone] };
    });
  };

  const removeBlock = (id: string) => {
    setInvoice((prev) => ({
      ...prev,
      workBlocks: prev.workBlocks.filter((block) => block.id !== id),
    }));
  };

  const reorderBlocks = (orderedIds: string[]) => {
    setInvoice((prev) => {
      const byId = new Map(prev.workBlocks.map((block) => [block.id, block]));
      const reordered = orderedIds
        .map((id) => byId.get(id))
        .filter((block): block is WorkBlock => Boolean(block));
      if (reordered.length !== prev.workBlocks.length) {
        return prev;
      }
      return { ...prev, workBlocks: reordered };
    });
  };

  const handleSettingsChange = (value: Settings) => {
    setSettings(value);
  };

  const addExpense = () => {
    setInvoice((prev) => ({
      ...prev,
      expenses: [
        ...(Array.isArray(prev.expenses) ? prev.expenses : []),
        emptyExpense(prev.issueDate),
      ],
    }));
  };

  const handleExpenseChange = (id: string, patch: Partial<Expense>) => {
    setInvoice((prev) => ({
      ...prev,
      expenses: (Array.isArray(prev.expenses) ? prev.expenses : []).map((expense) =>
        expense.id === id ? { ...expense, ...patch } : expense
      ),
    }));
  };

  const removeExpense = (id: string) => {
    setInvoice((prev) => ({
      ...prev,
      expenses: (Array.isArray(prev.expenses) ? prev.expenses : []).filter((expense) => expense.id !== id),
    }));
  };

  const reorderExpenses = (orderedIds: string[]) => {
    setInvoice((prev) => {
      const source = Array.isArray(prev.expenses) ? prev.expenses : [];
      const byId = new Map(source.map((expense) => [expense.id, expense]));
      const reordered = orderedIds
        .map((id) => byId.get(id))
        .filter((expense): expense is Expense => Boolean(expense));
      if (reordered.length !== source.length) {
        return prev;
      }
      return { ...prev, expenses: reordered };
    });
  };

  const resetSettingsToDefaults = () => {
    setSettings(localeDefaultSettings());
  };

  const clearAllData = () => {
    const defaults = localeDefaultSettings();
    setSettings(defaults);
    const invoiceDefaults = defaultInvoice(defaults);
    setInvoice(invoiceDefaults);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SETTINGS_KEY);
      window.localStorage.removeItem(INVOICE_KEY);
    }
    setSettingsOpen(false);
  };

  const confirmAndClearAll = () => {
    const message =
      'Reset stored data? This will clear all saved settings and invoice details from this device.';
    if (typeof window !== 'undefined' && !window.confirm(message)) {
      return;
    }
    clearAllData();
  };

  const handleGenerate = () => {
    setShowSettingsReminder(false);
    if (usingPlaceholderSettings) {
      setShowSettingsReminder(true);
      setSettingsOpen(true);
      return;
    }
    generateInvoicePdf({ settings, invoice, lineItems: computedBlocks, totals });

    // Build "Track in Accounts" link
    const dueDate = invoice.issueDate
      ? (() => {
          const d = new Date(invoice.issueDate);
          d.setDate(d.getDate() + (settings.defaultPaymentTerms || 30));
          return d.toISOString().split('T')[0];
        })()
      : '';
    const payload = {
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      issueDate: invoice.issueDate,
      dueDate,
      amount: totals.total,
      status: 'sent' as const,
      notes: invoice.notes,
      purchaseOrder: invoice.purchaseOrder,
      taxRate: invoice.taxRate,
      workBlocks: invoice.workBlocks.map((wb) => ({
        id: wb.id,
        description: wb.description,
        startDate: wb.startDate,
        endDate: wb.endDate,
        billingMode: wb.billingMode,
        dailyRate: wb.dailyRate,
        blockTotal: wb.blockTotal,
      })),
      expenses: invoice.expenses.map((ex) => ({
        id: ex.id,
        date: ex.date,
        notes: ex.notes,
        amount: ex.value,
      })),
    };
    const encoded = btoa(JSON.stringify(payload));
    setTrackingLink(`https://accounts.ainsworth.dev/invoices?import=${encoded}`);
  };

  const disableGenerate = !ready || disablePdf(computedBlocks);

  return (
    <>
    <main className="min-h-screen pb-12 pt-10 sm:pt-14">
      <div className="mx-auto flex w-full max-w-[1570px] flex-col gap-6 px-4 sm:px-6 lg:px-8">
        <section className={`${cardClass} space-y-6`}>
          <div className="flex flex-col gap-6">
            <div className="flex-1 space-y-4">
              <span className="inline-flex items-center gap-2 self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                Private · Browser-based · PDF ready
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                Invoicer 🧾
              </h1>
              <p className="max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
                A clean, lightweight builder for freelancers: log your work, keep totals accurate, and download a
                ready-to-send PDF in seconds.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {ready ? 'Settings stored locally on your device. Changes save automatically.' : 'Loading saved preferences…'}
          </p>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className={`${cardClass} space-y-8`}>
            <MetadataForm invoice={invoice} onChange={updateInvoice} />

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Work blocks</h3>
                <button type="button" className={buttonSecondary} onClick={addWorkBlock}>
                  + Add block
                </button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Only Monday–Friday days count towards totals. Weekends are skipped automatically.
              </p>
            </div>

            <WorkBlocksTable
              blocks={computedBlocks}
              currencySymbol={settings.currencySymbol}
              onBlockChange={handleWorkBlockChange}
              onRemove={removeBlock}
              onDuplicate={duplicateBlock}
              onReorder={reorderBlocks}
            />

            {computedBlocks.length > 1 && (
              <div className="flex justify-center">
                <button type="button" className={buttonSecondary} onClick={addWorkBlock}>
                  + Add block
                </button>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Expenses (optional)</h3>
                <button type="button" className={buttonSecondary} onClick={addExpense}>
                  + Add expense
                </button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Expenses are added to the invoice subtotal before tax.
              </p>
            </div>

            <ExpensesTable
              expenses={expenses}
              currencySymbol={settings.currencySymbol}
              onExpenseChange={handleExpenseChange}
              onRemove={removeExpense}
              onReorder={reorderExpenses}
            />

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Notes
              </label>
              <div className="relative">
                <textarea
                  id="notes"
                  className="w-full min-h-[120px] rounded-3xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm shadow-slate-900/5 transition hover:border-slate-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/20 dark:hover:border-slate-700 dark:focus:bg-slate-900"
                  value={invoice.notes}
                  onChange={(event) => updateInvoice({ notes: event.target.value })}
                  placeholder="Purchase orders, payment expectations, or a short thank-you message."
                  rows={4}
                />
                <button
                  type="button"
                  className={`${iconButton} absolute bottom-3 right-3 h-10 w-10 rounded-full`}
                  onClick={() => updateInvoice({ notes: settings.defaultNotes })}
                  aria-label="Apply notes template"
                >
                  🔄
                </button>
              </div>
            </div>
          </section>

          <aside className={`${cardClass} flex flex-col gap-6`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Quick actions</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Adjust settings or clear local data.</p>
              </div>
              <div className="flex items-center gap-2">
                <button className={iconButton} onClick={() => setSettingsOpen(true)} aria-label="Open settings">
                  ⚙️
                </button>
                <button
                  className={`${iconButton} text-rose-600 hover:ring-rose-200 dark:text-rose-200 dark:hover:ring-rose-400/60`}
                  onClick={confirmAndClearAll}
                  aria-label="Reset stored data"
                >
                  🔄
                </button>
              </div>
            </div>

            <TotalsPanel
              totals={totals}
              taxRate={invoice.taxRate}
              setTaxRate={(taxRate) => updateInvoice({ taxRate })}
              currency={settings.currencySymbol}
            />
            <button className={buttonPrimary} onClick={handleGenerate} disabled={disableGenerate}>
              Generate PDF
            </button>
            {!ready && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Please wait for your saved details to finish loading.</p>
            )}
          </aside>
        </div>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onChange={handleSettingsChange}
        onReset={resetSettingsToDefaults}
        onClearAll={confirmAndClearAll}
        buttonClasses={{ primary: buttonPrimary, secondary: buttonSecondary, ghost: buttonGhost }}
        reminderMessage={
          showSettingsReminder && usingPlaceholderSettings
            ? 'Add your business details before generating your first invoice.'
            : undefined
        }
        resolveFilenamePreview={(template) => resolveFilename(template, { settings, invoice, totals })}
      />

    </main>

      {/* Track in Accounts toast — outside <main> to avoid transform/overflow ancestors breaking fixed positioning */}
      {trackingLink && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-3 shadow-xl shadow-slate-900/10 animate-fade-in dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
          <p className="text-sm text-slate-700 dark:text-slate-200">PDF downloaded.</p>
          <a
            href={trackingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-600 dark:bg-brand-400 dark:text-slate-900 dark:hover:bg-brand-300"
          >
            Track in Accounts
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
          <button
            onClick={() => setTrackingLink(null)}
            className="ml-1 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

function MetadataForm({
  invoice,
  onChange,
}: {
  invoice: InvoiceData;
  onChange: (patch: Partial<InvoiceData>) => void;
}) {
  const fieldClass =
    'w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm shadow-slate-900/5 transition hover:border-slate-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/20 dark:hover:border-slate-700 dark:focus:bg-slate-900';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="invoiceMonth" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Invoice month
          </label>
          <input
            type="month"
            id="invoiceMonth"
            className={fieldClass}
            value={invoice.invoiceMonth}
            onChange={(event) => onChange({ invoiceMonth: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="invoiceNumber" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Invoice number
          </label>
          <input
            id="invoiceNumber"
            className={fieldClass}
            value={invoice.invoiceNumber}
            onChange={(event) => onChange({ invoiceNumber: event.target.value })}
            placeholder="Invoice #14"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="issueDate" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Invoice date
          </label>
          <input
            type="date"
            id="issueDate"
            className={fieldClass}
            value={invoice.issueDate}
            onChange={(event) => onChange({ issueDate: event.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="purchaseOrder" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Purchase order / contact
          </label>
          <input
            id="purchaseOrder"
            className={fieldClass}
            value={invoice.purchaseOrder || ''}
            onChange={(event) => onChange({ purchaseOrder: event.target.value })}
            placeholder="PO-123 or Jane Doe"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="remittanceEmail" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Remittance email
          </label>
          <input
            type="email"
            id="remittanceEmail"
            className={fieldClass}
            value={invoice.remittanceEmail || ''}
            onChange={(event) => onChange({ remittanceEmail: event.target.value })}
            placeholder="accounts@yourcompany.com"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="clientName" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Client
          </label>
          <input
            id="clientName"
            className={fieldClass}
            value={invoice.clientName}
            onChange={(event) => onChange({ clientName: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="clientAddress" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Client address
          </label>
          <textarea
            id="clientAddress"
            className={`${fieldClass} min-h-[120px]`}
            value={invoice.clientAddress}
            onChange={(event) => onChange({ clientAddress: event.target.value })}
            placeholder={'Company name\nStreet\nCity, ZIP'}
          />
        </div>
      </div>
    </div>
  );
}

function TotalsPanel({
  totals,
  taxRate,
  setTaxRate,
  currency,
}: {
  totals: { workSubtotal: number; expensesSubtotal: number; preTaxSubtotal: number; taxAmount: number; total: number };
  taxRate: number;
  setTaxRate: (tax: number) => void;
  currency: string;
}) {
  const rowClass = 'flex items-center justify-between text-base text-slate-700 dark:text-slate-200';
  const showTaxLine = taxRate > 0 && totals.taxAmount > 0;
  const showPreTaxLine = showTaxLine;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="taxRate" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Tax / VAT percentage
        </label>
        <input
          type="number"
          id="taxRate"
          min={0}
          className="w-full rounded-2xl border border-slate-200/80 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/5 transition hover:border-slate-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/20 dark:hover:border-slate-700 dark:focus:bg-slate-900"
          value={taxRate}
          onChange={(event) => setTaxRate(Number(event.target.value) || 0)}
        />
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-4 shadow-inner shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <div className={rowClass}>
          <span>Work subtotal</span>
          <strong className="text-lg text-slate-900 dark:text-white">
            {currency}
            {totals.workSubtotal.toFixed(2)}
          </strong>
        </div>
        <div className={rowClass}>
          <span>Expenses</span>
          <strong className="text-lg text-slate-900 dark:text-white">
            {currency}
            {totals.expensesSubtotal.toFixed(2)}
          </strong>
        </div>
        {showPreTaxLine && (
          <div className={rowClass}>
            <span>Subtotal before tax</span>
            <strong className="text-lg text-slate-900 dark:text-white">
              {currency}
              {totals.preTaxSubtotal.toFixed(2)}
            </strong>
          </div>
        )}
        {showTaxLine && (
          <div className={rowClass}>
            <span>Tax</span>
            <strong className="text-lg text-slate-900 dark:text-white">
              {currency}
              {totals.taxAmount.toFixed(2)}
            </strong>
          </div>
        )}
        <div className={`${rowClass} border-t border-slate-200 pt-3 text-lg font-semibold text-slate-900 dark:border-slate-700 dark:text-white`}>
          <span>Total</span>
          <strong className="text-2xl text-slate-900 dark:text-white">
            {currency}
            {totals.total.toFixed(2)}
          </strong>
        </div>
      </div>
    </div>
  );
}
