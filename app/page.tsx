'use client';

import { useEffect, useMemo, useState } from 'react';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { WorkBlocksTable } from '@/components/WorkBlocksTable';
import { usePersistentState } from '@/hooks/usePersistentState';
import {
  createWorkBlockId,
  defaultInvoice,
  defaultSettings,
  emptyWorkBlock,
  INVOICE_KEY,
  SETTINGS_KEY,
} from '@/lib/defaults';
import { countWeekdaysInclusive, isValidDateRange } from '@/lib/date';
import { detectCurrencySymbol } from '@/lib/currency';
import { generateInvoicePdf } from '@/lib/pdf';
import { ComputedWorkBlock, InvoiceData, Settings, WorkBlock } from '@/lib/types';

const disablePdf = (blocks: ComputedWorkBlock[]) =>
  blocks.length === 0 || blocks.some((block) => block.hasError || block.days === 0);

const cardClass = 'w-full rounded-3xl bg-white p-6 sm:p-8 shadow-soft ring-1 ring-slate-100';
const buttonBase =
  'inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60 disabled:cursor-not-allowed';
const buttonPrimary = `${buttonBase} border-transparent bg-brand text-white hover:bg-indigo-600`;
const buttonSecondary = `${buttonBase} border-transparent bg-neutral-900/5 text-slate-700 hover:bg-neutral-900/10`;
const buttonGhost = `${buttonBase} border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100`;

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showSettingsReminder, setShowSettingsReminder] = useState(false);

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
        return {
          ...block,
          days,
          lineTotal: Number((days * (block.dailyRate || 0)).toFixed(2)),
          hasError: !validRange,
        };
      }),
    [invoice.workBlocks]
  );

  const totals = useMemo(() => {
    const subtotal = computedBlocks.reduce((acc, block) => acc + (block.hasError ? 0 : block.lineTotal), 0);
    const tax = Number(((subtotal * (invoice.taxRate || 0)) / 100).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));
    return { subtotal, tax, total };
  }, [computedBlocks, invoice.taxRate]);

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

  const localeDefaultSettings = () => {
    const base = defaultSettings();
    const symbol = detectCurrencySymbol();
    return {
      ...base,
      currencySymbol: symbol || base.currencySymbol,
    };
  };

  useEffect(() => {
    if (!usingPlaceholderSettings) {
      setShowSettingsReminder(false);
    }
  }, [usingPlaceholderSettings]);

  const updateInvoice = (patch: Partial<InvoiceData>) => {
    setInvoice((prev) => ({ ...prev, ...patch }));
  };

  const handleWorkBlockChange = (id: string, patch: Partial<WorkBlock>) => {
    setInvoice((prev) => ({
      ...prev,
      workBlocks: prev.workBlocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
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

  const handleSettingsChange = (value: Settings) => {
    setSettings(value);
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

  const handleGenerate = () => {
    if (usingPlaceholderSettings) {
      setShowSettingsReminder(true);
      setSettingsOpen(true);
      return;
    }
    generateInvoicePdf({ settings, invoice, lineItems: computedBlocks, totals });
  };

  const disableGenerate = !ready || disablePdf(computedBlocks);

  return (
    <main className="min-h-screen bg-slate-50 py-10 sm:py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:px-0">
        <section className={`${cardClass} space-y-6`}>
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Simple Invoice Generator
              </h1>
              <p className="max-w-2xl text-base text-slate-600">
                Capture work blocks, keep totals accurate, and export a polished PDF without leaving your
                browser.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className={`${buttonSecondary} gap-2`} onClick={() => setSettingsOpen(true)}>
                ⚙️ Settings
              </button>
              <button className={buttonGhost} onClick={clearAllData}>
                Reset data
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            {ready ? 'Settings stored locally. Changes save automatically.' : 'Loading saved preferences…'}
          </p>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className={`${cardClass} space-y-8`}>
            <MetadataForm invoice={invoice} settings={settings} onChange={updateInvoice} />

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-slate-900">Work blocks</h3>
                <button type="button" className={buttonSecondary} onClick={addWorkBlock}>
                  + Add block
                </button>
              </div>
              <p className="text-sm text-slate-500">
                Only Monday–Friday days count towards totals. Weekends are skipped automatically.
              </p>
            </div>

            <WorkBlocksTable
              blocks={computedBlocks}
              currencySymbol={settings.currencySymbol}
              onBlockChange={handleWorkBlockChange}
              onRemove={removeBlock}
              onDuplicate={duplicateBlock}
            />

            {computedBlocks.length > 1 && (
              <div className="flex justify-center">
                <button type="button" className={buttonSecondary} onClick={addWorkBlock}>
                  + Add block
                </button>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-semibold text-slate-700">
                Notes
              </label>
              <textarea
                id="notes"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition hover:border-slate-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                value={invoice.notes}
                onChange={(event) => updateInvoice({ notes: event.target.value })}
                placeholder="Purchase orders, payment expectations, or a short thank-you message."
                rows={4}
              />
              <div>
                <button
                  type="button"
                  className={buttonGhost}
                  onClick={() => updateInvoice({ notes: settings.defaultNotes })}
                >
                  Use notes template
                </button>
              </div>
            </div>
          </section>

          <aside className={`${cardClass} flex flex-col gap-6`}>
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
              <p className="text-sm text-slate-500">Please wait for your saved details to finish loading.</p>
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
        onClearAll={clearAllData}
        buttonClasses={{ primary: buttonPrimary, secondary: buttonSecondary, ghost: buttonGhost }}
        reminderMessage={
          showSettingsReminder ? 'Add your business details before generating your first invoice.' : undefined
        }
      />
    </main>
  );
}

function MetadataForm({
  invoice,
  settings,
  onChange,
}: {
  invoice: InvoiceData;
  settings: Settings;
  onChange: (patch: Partial<InvoiceData>) => void;
}) {
  const fieldClass =
    'w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="invoiceMonth" className="text-sm font-semibold text-slate-700">
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
          <label htmlFor="invoiceNumber" className="text-sm font-semibold text-slate-700">
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
          <label htmlFor="issueDate" className="text-sm font-semibold text-slate-700">
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
          <label htmlFor="purchaseOrder" className="text-sm font-semibold text-slate-700">
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
          <label htmlFor="remittanceEmail" className="text-sm font-semibold text-slate-700">
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
          <label htmlFor="clientName" className="text-sm font-semibold text-slate-700">
            Client
          </label>
          <input
            id="clientName"
            className={fieldClass}
            value={invoice.clientName}
            onChange={(event) => onChange({ clientName: event.target.value })}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor="clientAddress" className="text-sm font-semibold text-slate-700">
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
  totals: { subtotal: number; tax: number; total: number };
  taxRate: number;
  setTaxRate: (tax: number) => void;
  currency: string;
}) {
  const rowClass = 'flex items-center justify-between text-base text-slate-700';

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="taxRate" className="text-sm font-semibold text-slate-700">
          Tax / VAT percentage
        </label>
        <input
          type="number"
          id="taxRate"
          min={0}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          value={taxRate}
          onChange={(event) => setTaxRate(Number(event.target.value) || 0)}
        />
      </div>
      <div className="space-y-3 rounded-2xl bg-slate-50 px-4 py-4">
        <div className={rowClass}>
          <span>Subtotal</span>
          <strong className="text-lg text-slate-900">
            {currency}
            {totals.subtotal.toFixed(2)}
          </strong>
        </div>
        <div className={rowClass}>
          <span>Tax</span>
          <strong className="text-lg text-slate-900">
            {currency}
            {totals.tax.toFixed(2)}
          </strong>
        </div>
        <div className={`${rowClass} border-t border-slate-200 pt-3 text-lg font-semibold text-slate-900`}>
          <span>Grand total</span>
          <strong className="text-2xl text-slate-900">
            {currency}
            {totals.total.toFixed(2)}
          </strong>
        </div>
      </div>
    </div>
  );
}
