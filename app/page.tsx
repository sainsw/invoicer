'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ClientChips } from '@/components/ClientChips';
import { ExpensesTable } from '@/components/ExpensesTable';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { MonthPicker } from '@/components/MonthPicker';
import { RollingNumber } from '@/components/RollingNumber';
import { WorkBlocksTable } from '@/components/WorkBlocksTable';
import { usePersistentState } from '@/hooks/usePersistentState';
import { formatMoney } from '@/lib/format';
import {
  createWorkBlockId,
  defaultInvoice,
  defaultSettings,
  emptyExpense,
  emptyWorkBlock,
  INVOICE_KEY,
  LABS_KEY,
  LEGACY_PLACEHOLDER_SETTINGS,
  defaultLabs,
  SETTINGS_KEY,
} from '@/lib/defaults';
import {
  CLIENTS_KEY,
  defaultClientsState,
  firstDailyRate,
  invoiceForClient,
  profileDiffers,
  profileFromInvoice,
} from '@/lib/clients';
import {
  countWeekdaysInclusive,
  isValidDateRange,
  detectCurrencySymbol,
  resolveFilename,
  generateInvoicePdf,
} from '@sainsw/invoice-pdf';
import type { ComputedWorkBlock, Expense, InvoiceData, Settings, WorkBlock } from '@sainsw/invoice-pdf';

const DAY_MS = 24 * 60 * 60 * 1000;

// Weekdays only, unless the whole range falls on a weekend — then every day counts.
const countWorkingDays = (startDate: string, endDate: string) => {
  const weekdays = countWeekdaysInclusive(startDate, endDate);
  if (weekdays > 0) return weekdays;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Math.round((end - start) / DAY_MS) + 1;
};

const disablePdf = (blocks: ComputedWorkBlock[]) =>
  blocks.length === 0 || blocks.some((block) => block.hasError || block.days === 0);

const buttonBase =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-semibold transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';
// The accent colour is reserved for the one action that matters: producing the invoice.
const buttonAccent = `${buttonBase} bg-accent text-accent-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] hover:bg-accent/90 active:translate-y-px`;
const buttonInk = `${buttonBase} bg-ink text-sheet hover:bg-ink/85 active:translate-y-px`;
const buttonSecondary = `${buttonBase} bg-sheet text-ink ring-1 ring-edge hover:bg-well hover:ring-ink-2`;
// Compact variant for actions that sit on a section heading row, so they don't overhang the description.
// Swap the padding rather than append it: two py-* classes on one element resolve by stylesheet order, not class order.
const buttonSectionAction = buttonSecondary.replace('px-4 py-2.5', 'px-3 py-1.5');
const buttonGhost = `${buttonBase} bg-transparent text-ink-2 hover:bg-well hover:text-ink`;
const fieldClass =
  'w-full min-w-0 rounded-md border border-edge bg-field px-3.5 py-2.5 text-[15px] text-ink transition hover:border-ink-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-ink-3';
// Swap colours rather than append them, for the same reason as buttonSectionAction.
const fieldErrorClass = fieldClass
  .replace('border-edge', 'border-danger')
  .replace('focus:border-accent', 'focus:border-danger')
  .replace('focus:ring-accent/30', 'focus:ring-danger/25');
const labelClass = 'block text-sm font-medium text-ink';
const monoLabelClass = 'font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-2';

const GearIcon = () => (
  <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showSettingsReminder, setShowSettingsReminder] = useState(false);
  const [showDownloadedToast, setShowDownloadedToast] = useState(false);
  const [trackingLink, setTrackingLink] = useState<string | null>(null);
  const [stamping, setStamping] = useState(false);
  // Below lg the summary sits under the whole form, so a sticky bar shows the total until it scrolls into view.
  const summaryRef = useRef<HTMLElement>(null);
  const [summaryBelowFold, setSummaryBelowFold] = useState(false);

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

  const {
    value: clientsState,
    setValue: setClientsState,
    ready: clientsReady,
  } = usePersistentState(CLIENTS_KEY, defaultClientsState);

  const { value: labs, setValue: setLabs } = usePersistentState(LABS_KEY, defaultLabs);

  const activeClient = clientsState.clients.find((client) => client.id === clientsState.activeId) ?? null;
  const activeClientDirty = activeClient ? profileDiffers(activeClient, invoice) : false;

  const computedBlocks = useMemo<ComputedWorkBlock[]>(
    () =>
      invoice.workBlocks.map((block) => {
        const validRange = isValidDateRange(block.startDate, block.endDate);
        const days = validRange ? countWorkingDays(block.startDate, block.endDate) : 0;
        const dailyRate = Math.max(0, block.dailyRate || 0);
        const blockTotal = block.billingMode === 'block'
          ? Math.max(0, block.blockTotal || 0)
          : Number((days * dailyRate).toFixed(2));
        // A block-billed line charges exactly the entered total; the derived daily rate is rounded,
        // so days × rate can drift from it by a penny.
        const lineTotal = block.billingMode === 'block' ? blockTotal : Number((days * dailyRate).toFixed(2));
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

  const usingPlaceholderSettings = !settings.businessName?.trim();

  // First run: with no name, address or email saved, ask for them on the form itself ("About you")
  // instead of blocking the first download on the settings panel. Decided once per page load, so the
  // section doesn't vanish mid-typing; the details are only saved to settings on download.
  const [aboutYou, setAboutYou] = useState<'pending' | 'show' | 'hide'>('pending');
  const [aboutYouDraft, setAboutYouDraft] = useState<AboutYouDetails>({ businessName: '', businessAddress: '', email: '' });
  const [aboutYouError, setAboutYouError] = useState(false);
  // Safety net: closing the settings panel with no name saved brings "About you" in, animated.
  const [aboutYouRevealing, setAboutYouRevealing] = useState(false);
  const aboutYouRef = useRef<HTMLDivElement>(null);
  const revealAboutYou = (from: Settings) => {
    if (aboutYou === 'show') {
      return;
    }
    setAboutYouDraft({ businessName: from.businessName, businessAddress: from.businessAddress, email: from.email });
    setAboutYou('show');
    setAboutYouRevealing(true);
  };
  useEffect(() => {
    if (!aboutYouRevealing) {
      return;
    }
    // Wait a frame so the section is in the DOM, then bring it into view.
    const frame = requestAnimationFrame(() =>
      aboutYouRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
    return () => cancelAnimationFrame(frame);
  }, [aboutYouRevealing]);
  const closeSettings = () => {
    setSettingsOpen(false);
    if (!settings.businessName.trim()) {
      revealAboutYou(settings);
    }
  };
  if (settingsReady && aboutYou === 'pending') {
    setAboutYou(hasNoBusinessDetails(settings) ? 'show' : 'hide');
  }

  const ready = settingsReady && invoiceReady && clientsReady;

  // Keep the active client's draft in sync so switching back restores it.
  useEffect(() => {
    if (!invoiceReady || !clientsReady) {
      return;
    }
    setClientsState((prev) => {
      if (!prev.activeId) {
        return prev;
      }
      return {
        ...prev,
        clients: prev.clients.map((client) =>
          client.id === prev.activeId ? { ...client, lastInvoice: invoice } : client
        ),
      };
    });
  }, [clientsReady, invoice, invoiceReady, setClientsState]);

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
    for (const [key, sample] of Object.entries(LEGACY_PLACEHOLDER_SETTINGS) as Array<[keyof Settings, string]>) {
      if (settings[key] === sample) {
        Object.assign(patch, { [key]: '' });
      }
    }
    if (Object.keys(patch).length > 0) {
      setSettings((prev) => ({ ...prev, ...patch }));
    }
  }, [setSettings, settings, settingsReady]);

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

  useEffect(() => {
    const node = summaryRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setSummaryBelowFold(!entry.isIntersecting && entry.boundingClientRect.top > 0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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
        const days = validRange ? countWorkingDays(next.startDate, next.endDate) : 0;
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
      workBlocks: [
        ...prev.workBlocks,
        emptyWorkBlock(activeClient?.dailyRate ?? (settings.defaultDailyRate || 0), prev.invoiceMonth),
      ],
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

  const selectClient = (id: string) => {
    const target = clientsState.clients.find((client) => client.id === id);
    if (!target) {
      return;
    }
    setInvoice(invoiceForClient(target, defaultInvoice(settings)));
    setClientsState((prev) => ({ ...prev, activeId: id }));
  };

  const startNewClient = () => {
    setClientsState((prev) => ({ ...prev, activeId: null }));
    setInvoice({ ...defaultInvoice(settings), clientName: '' });
  };

  const saveAsClient = (label: string) => {
    const profile = profileFromInvoice(invoice, label, settings.defaultDailyRate || 0);
    setClientsState((prev) => ({ activeId: profile.id, clients: [...prev.clients, profile] }));
  };

  const updateActiveClient = () => {
    if (!activeClient) {
      return;
    }
    const updated = profileFromInvoice(invoice, activeClient.label, activeClient.dailyRate, activeClient.id);
    setClientsState((prev) => ({
      ...prev,
      clients: prev.clients.map((client) => (client.id === updated.id ? updated : client)),
    }));
  };

  const deleteClient = (id: string) => {
    setClientsState((prev) => ({
      activeId: prev.activeId === id ? null : prev.activeId,
      clients: prev.clients.filter((client) => client.id !== id),
    }));
  };

  const resetSettingsToDefaults = () => {
    setSettings(localeDefaultSettings());
  };

  const clearAllData = () => {
    const defaults = localeDefaultSettings();
    setSettings(defaults);
    const invoiceDefaults = defaultInvoice(defaults);
    setInvoice(invoiceDefaults);
    setClientsState(defaultClientsState());
    setLabs(defaultLabs());
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SETTINGS_KEY);
      window.localStorage.removeItem(INVOICE_KEY);
      window.localStorage.removeItem(CLIENTS_KEY);
      window.localStorage.removeItem(LABS_KEY);
    }
    setSettingsOpen(false);
    revealAboutYou(defaults);
  };

  const confirmAndClearAll = () => {
    const message =
      'Delete everything saved here? This removes your details, your saved clients and this invoice from this computer. It can’t be undone.';
    if (typeof window !== 'undefined' && !window.confirm(message)) {
      return;
    }
    clearAllData();
  };

  const handleGenerate = () => {
    setShowSettingsReminder(false);
    let pdfSettings = settings;
    let pdfInvoice = invoice;
    if (aboutYou === 'show') {
      const entered = Object.fromEntries(
        Object.entries(aboutYouDraft).filter(([, value]) => value.trim())
      ) as Partial<AboutYouDetails>;
      pdfSettings = { ...settings, ...entered };
      if (!pdfSettings.businessName.trim()) {
        setAboutYouError(true);
        const nameField = document.getElementById('aboutBusinessName');
        nameField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameField?.focus({ preventScroll: true });
        return;
      }
      setSettings(pdfSettings);
      // New invoices default their payment-confirmation email to yours; fill it in if it was left blank.
      if (!invoice.remittanceEmail?.trim() && entered.email) {
        pdfInvoice = { ...invoice, remittanceEmail: entered.email };
        setInvoice(pdfInvoice);
      }
    } else if (usingPlaceholderSettings) {
      setShowSettingsReminder(true);
      setSettingsOpen(true);
      return;
    }
    generateInvoicePdf({ settings: pdfSettings, invoice: pdfInvoice, lineItems: computedBlocks, totals });
    setShowDownloadedToast(true);
    setTrackingLink(null);

    // Remember the rate actually billed so the client's next invoice starts from it.
    if (activeClient) {
      const billedRate = firstDailyRate(invoice, activeClient.dailyRate);
      setClientsState((prev) => ({
        ...prev,
        clients: prev.clients.map((client) =>
          client.id === activeClient.id ? { ...client, dailyRate: billedRate } : client
        ),
      }));
    }

    // "Track in Accounts" is opt-in (early testing): opening the link sends this invoice to another app.
    if (!labs.accountsLink) {
      return;
    }
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

  const generate = () => {
    setStamping(true);
    handleGenerate();
  };

  return (
    <>
    <main className="pb-14 pt-6 sm:pt-10">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 sm:px-6 lg:px-10">
        <header className="flex animate-rise-in items-end justify-between gap-4 border-b-2 border-ink pb-3">
          <div className="min-w-0 space-y-2">
            <h1 className="text-3xl font-extrabold leading-none tracking-[-0.04em] text-ink sm:text-4xl">
              Invoicer<span className="text-accent">.</span>
            </h1>
            <p className="text-sm text-ink-2">
              {ready ? 'Fill this in, then download your invoice ready to send. Everything you type stays on this computer and is never sent anywhere.' : 'Loading your details…'}
            </p>
          </div>
          <button
            type="button"
            className={`${buttonSecondary} shrink-0 px-3 sm:px-4`}
            onClick={() => setSettingsOpen(true)}
            aria-label="Your details"
          >
            <GearIcon />
            <span className="hidden sm:inline">Your details</span>
          </button>
        </header>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="animate-rise-in rounded-[3px] bg-sheet px-5 py-7 shadow-sheet ring-1 ring-rule/70 [animation-delay:70ms] sm:px-10 sm:py-10">
            <div className="space-y-8">
              {aboutYou === 'show' && (
                // While revealing, the grid wrapper animates open from zero height; the clip is dropped once
                // it's done so field focus rings aren't cut off.
                <div
                  ref={aboutYouRef}
                  className={aboutYouRevealing ? 'grid animate-expand-in' : undefined}
                  onAnimationEnd={(event) => event.target === event.currentTarget && setAboutYouRevealing(false)}
                >
                  <div className={aboutYouRevealing ? 'min-h-0 overflow-hidden' : undefined}>
                    <Section
                      number="00"
                      title="About you"
                      description="This goes at the top of your invoice so your client knows who it’s from. It’s saved for next time when you download."
                    >
                      <AboutYouForm
                        value={aboutYouDraft}
                        showError={aboutYouError}
                        onChange={(patch) => {
                          setAboutYouDraft((prev) => ({ ...prev, ...patch }));
                          if (patch.businessName?.trim()) {
                            setAboutYouError(false);
                          }
                        }}
                      />
                    </Section>
                  </div>
                </div>
              )}

              <Section
                number="01"
                title="Who it’s for"
                description={clientsState.clients.length > 0 ? 'Choose a saved client to fill this in for you, or type in someone new.' : undefined}
              >
                <ClientForm
                  invoice={invoice}
                  onChange={updateInvoice}
                  clientsReady={clientsReady}
                  hasSavedClients={clientsState.clients.length > 0}
                  onSaveClient={saveAsClient}
                  clientPicker={
                    <ClientChips
                      clients={clientsState.clients}
                      activeId={clientsState.activeId}
                      suggestedName={invoice.clientName.trim()}
                      isDirty={activeClientDirty}
                      hasUnsavedDraft={!activeClient && Boolean(invoice.clientName.trim() || invoice.invoiceNumber.trim())}
                      onSelect={selectClient}
                      onNew={startNewClient}
                      onSave={saveAsClient}
                      onUpdate={updateActiveClient}
                      onDelete={deleteClient}
                    />
                  }
                />
              </Section>

              <Section number="02" title="Invoice details" description="The month you pick is used to fill in the dates for your work below.">
                <MetadataForm invoice={invoice} onChange={updateInvoice} />
              </Section>

              <Section
                number="03"
                title="Work done"
                description="Add each stretch of work with its dates and your day rate. Only weekdays are counted, unless the work was all at a weekend."
                action={
                  <button type="button" className={buttonSectionAction} onClick={addWorkBlock}>
                    + Add work
                  </button>
                }
              >
                <WorkBlocksTable
                  blocks={computedBlocks}
                  currencySymbol={settings.currencySymbol}
                  onBlockChange={handleWorkBlockChange}
                  onRemove={removeBlock}
                  onDuplicate={duplicateBlock}
                  onReorder={reorderBlocks}
                  bottomAction={
                    <button type="button" className={buttonSecondary} onClick={addWorkBlock}>
                      + Add work
                    </button>
                  }
                />
              </Section>

              <Section
                number="04"
                title="Expenses"
                description="Costs you’re passing on, like travel or materials. Leave this empty if there aren’t any."
                action={
                  <button type="button" className={buttonSectionAction} onClick={addExpense}>
                    + Add expense
                  </button>
                }
              >
                <ExpensesTable
                  expenses={expenses}
                  currencySymbol={settings.currencySymbol}
                  onExpenseChange={handleExpenseChange}
                  onRemove={removeExpense}
                  onReorder={reorderExpenses}
                />
              </Section>

              <Section number="05" title="Notes" description="A short message printed on the invoice, such as a thank-you or an order number.">
                <div className="relative">
                  <textarea
                    id="notes"
                    aria-label="Notes"
                    className={`${fieldClass} min-h-[120px] pb-14 leading-relaxed`}
                    value={invoice.notes}
                    onChange={(event) => updateInvoice({ notes: event.target.value })}
                    placeholder="e.g. Thank you for your business."
                    rows={4}
                  />
                  {invoice.notes !== settings.defaultNotes && (
                    <button
                      type="button"
                      className={`${buttonSectionAction} absolute bottom-3 right-3 animate-fade-in`}
                      onClick={() => updateInvoice({ notes: settings.defaultNotes })}
                    >
                      Use my usual message
                    </button>
                  )}
                </div>
              </Section>
            </div>
          </div>

          <aside
            ref={summaryRef}
            aria-labelledby="summary-heading"
            className="animate-rise-in [animation-delay:140ms] lg:sticky lg:top-6"
          >
            {/* The mask that punches the receipt edge also clips box-shadow, so the shadow is a filter on the wrapper. */}
            <div className="[filter:drop-shadow(0_1px_1px_rgb(var(--shadow)/0.12))_drop-shadow(0_14px_18px_rgb(var(--shadow)/0.14))]">
              <div className="perforated bg-sheet px-6 pb-10 pt-11">
                <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-rule-strong pb-4">
                  <h2 id="summary-heading" className={monoLabelClass}>
                    Summary
                  </h2>
                  <p className="truncate font-mono text-xs text-ink-2">
                    {invoice.invoiceNumber.trim() ? `No. ${invoice.invoiceNumber.trim()}` : 'No invoice number yet'}
                  </p>
                </div>
                <TotalsPanel
                  totals={totals}
                  taxRate={invoice.taxRate}
                  setTaxRate={(taxRate) => updateInvoice({ taxRate })}
                  currency={settings.currencySymbol}
                />
                <button
                  className={`${buttonAccent.replace('py-2.5 text-sm', 'py-3.5 text-base')} mt-6 w-full ${stamping ? 'animate-stamp' : ''}`}
                  onClick={generate}
                  onAnimationEnd={() => setStamping(false)}
                  disabled={disableGenerate}
                >
                  Download invoice
                </button>
                <p className="mt-3 text-center text-[13px] text-ink-2">
                  {ready ? 'Saves a PDF you can email or print' : 'Loading your details…'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        settings={settings}
        onClose={closeSettings}
        onChange={handleSettingsChange}
        onReset={resetSettingsToDefaults}
        onClearAll={confirmAndClearAll}
        buttonClasses={{ primary: buttonInk, secondary: buttonSecondary, ghost: buttonGhost }}
        reminderMessage={
          showSettingsReminder && usingPlaceholderSettings
            ? 'Before you download your first invoice, add your name and address so your client knows who it’s from.'
            : undefined
        }
        resolveFilenamePreview={(template) => resolveFilename(template, { settings, invoice, totals })}
        currentNotes={invoice.notes}
        onApplyNotesToInvoice={() => updateInvoice({ notes: settings.defaultNotes })}
        accountsLinkEnabled={labs.accountsLink}
        onAccountsLinkChange={(accountsLink) => {
          setLabs((prev) => ({ ...prev, accountsLink }));
          if (!accountsLink) {
            setTrackingLink(null);
          }
        }}
      />

    </main>

      {/* Sticky total for small screens — hidden once the Summary card is reached */}
      <div
        inert={!summaryBelowFold}
        aria-hidden={!summaryBelowFold}
        className={`fixed inset-x-0 bottom-0 z-10 border-t border-rule bg-sheet/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_-12px_rgb(var(--shadow)/0.25)] backdrop-blur transition-transform duration-200 lg:hidden ${summaryBelowFold ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className={monoLabelClass}>{totals.taxAmount > 0 ? 'Total incl. tax' : 'Total'}</p>
            <p className="truncate font-display text-2xl font-extrabold tabular-nums tracking-tight text-ink">
              {formatMoney(settings.currencySymbol, totals.total)}
            </p>
          </div>
          <button className={buttonAccent} onClick={generate} disabled={disableGenerate}>
            Download invoice
          </button>
        </div>
      </div>

      {/* Download confirmation, with the opt-in Track in Accounts link — outside <main> to avoid transform/overflow ancestors breaking fixed positioning */}
      {showDownloadedToast && (
        <div className={`fixed right-4 z-50 sm:right-6 ${summaryBelowFold ? 'bottom-24 lg:bottom-6' : 'bottom-6'} flex animate-rise-in items-center gap-3 rounded-md bg-ink py-2.5 pl-4 pr-2.5 text-sheet shadow-lift`}>
          <p className="text-sm">Your invoice has been downloaded.</p>
          {trackingLink && labs.accountsLink && (
            <a
              href={trackingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink transition hover:bg-accent/90"
            >
              Track in Accounts
              <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          )}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => {
              setShowDownloadedToast(false);
              setTrackingLink(null);
            }}
            className="rounded p-1 text-sheet/60 transition hover:bg-sheet/10 hover:text-sheet"
          >
            <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

function Section({
  number,
  title,
  description,
  action,
  children,
}: {
  number: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const headingId = `section-${number}`;
  return (
    <section aria-labelledby={headingId} className="space-y-5 border-t border-rule pt-6 first:border-t-0 first:pt-0">
      {/* The action stays on the heading row at every width; the description runs underneath. */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-4">
          <h2 id={headingId} className="flex min-w-0 items-baseline gap-3">
            <span className="font-mono text-sm font-medium text-accent">{number}</span>
            <span className="text-xl font-bold tracking-[-0.02em] text-ink">{title}</span>
          </h2>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {description && <p className="max-w-[60ch] pl-[calc(2ch+0.75rem)] text-[15px] text-ink-2">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ id, label, children, className = '' }: { id: string; label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
    </div>
  );
}

function MetadataForm({
  invoice,
  onChange,
}: {
  invoice: InvoiceData;
  onChange: (patch: Partial<InvoiceData>) => void;
}) {
  return (
    <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Field id="invoiceNumber" label="Invoice number">
        <input
          id="invoiceNumber"
          className={`${fieldClass} font-mono`}
          value={invoice.invoiceNumber}
          onChange={(event) => onChange({ invoiceNumber: event.target.value })}
          placeholder="e.g. 14"
        />
      </Field>
      <Field id="issueDate" label="Invoice date">
        <input
          type="date"
          id="issueDate"
          className={fieldClass}
          value={invoice.issueDate}
          onChange={(event) => onChange({ issueDate: event.target.value })}
        />
      </Field>
      <Field id="purchaseOrder" label="Order number (optional)">
        <input
          id="purchaseOrder"
          className={fieldClass}
          value={invoice.purchaseOrder || ''}
          onChange={(event) => onChange({ purchaseOrder: event.target.value })}
          placeholder="e.g. PO-123, or a contact name"
        />
      </Field>
      <Field id="invoiceMonth" label="Invoice month">
        <MonthPicker
          id="invoiceMonth"
          value={invoice.invoiceMonth}
          onChange={(invoiceMonth) => onChange({ invoiceMonth })}
          fieldClass={fieldClass}
        />
      </Field>
    </div>
  );
}

type AboutYouDetails = Pick<Settings, 'businessName' | 'businessAddress' | 'email'>;

const hasNoBusinessDetails = (settings: Settings) =>
  (['businessName', 'businessAddress', 'email'] as const).every((key) => {
    const value = (settings[key] || '').trim();
    // Older versions stored sample text as real values; treat that as empty too.
    return !value || value === LEGACY_PLACEHOLDER_SETTINGS[key];
  });

function AboutYouForm({
  value,
  showError,
  onChange,
}: {
  value: AboutYouDetails;
  showError: boolean;
  onChange: (patch: Partial<AboutYouDetails>) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-4">
        <Field id="aboutBusinessName" label="Your name or business name">
          <input
            id="aboutBusinessName"
            className={showError ? fieldErrorClass : fieldClass}
            value={value.businessName}
            onChange={(event) => onChange({ businessName: event.target.value })}
            placeholder="e.g. Jane Smith Joinery"
            autoComplete="organization"
            aria-invalid={showError}
            aria-describedby={showError ? 'aboutBusinessNameError' : undefined}
          />
          {showError && (
            <p id="aboutBusinessNameError" className="text-[13px] font-medium text-danger">
              Add your name so your client knows who the invoice is from.
            </p>
          )}
        </Field>
        <Field id="aboutEmail" label="Your email">
          <input
            id="aboutEmail"
            type="email"
            className={fieldClass}
            value={value.email}
            onChange={(event) => onChange({ email: event.target.value })}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>
      </div>
      <Field id="aboutBusinessAddress" label="Your address" className="flex flex-col">
        <textarea
          id="aboutBusinessAddress"
          className={`${fieldClass} min-h-[120px] flex-1 leading-relaxed`}
          value={value.businessAddress}
          onChange={(event) => onChange({ businessAddress: event.target.value })}
          placeholder={'Street\nTown\nPostcode'}
          autoComplete="street-address"
        />
      </Field>
    </div>
  );
}

// Everything a saved client profile stores lives here, so "Update client" maps to what's on screen.
// The saved-clients picker stays hidden until there's at least one saved client; before that, leaving
// the Client field with a name in it offers to save it instead.
function ClientForm({
  invoice,
  onChange,
  clientsReady,
  hasSavedClients,
  onSaveClient,
  clientPicker,
}: {
  invoice: InvoiceData;
  onChange: (patch: Partial<InvoiceData>) => void;
  clientsReady: boolean;
  hasSavedClients: boolean;
  onSaveClient: (label: string) => void;
  clientPicker: ReactNode;
}) {
  const [savePrompt, setSavePrompt] = useState<string | null>(null);
  const [declinedName, setDeclinedName] = useState<string | null>(null);
  // Saved clients load after the first render; only animate the picker once they have, so it
  // doesn't slide open on every page load.
  const [pickerMotion, setPickerMotion] = useState(false);
  useEffect(() => {
    if (!clientsReady) {
      return;
    }
    const frame = requestAnimationFrame(() => setPickerMotion(true));
    return () => cancelAnimationFrame(frame);
  }, [clientsReady]);

  const showPicker = clientsReady && hasSavedClients;
  const promptName = hasSavedClients ? null : savePrompt;

  const offerSave = () => {
    const name = invoice.clientName.trim();
    if (!clientsReady || hasSavedClients || !name || name === declinedName) {
      return;
    }
    setSavePrompt(name);
  };

  return (
    <div>
      <div
        inert={!showPicker}
        aria-hidden={!showPicker}
        className={`grid ${pickerMotion ? 'transition-[grid-template-rows,opacity] duration-300 ease-out' : ''} ${
          showPicker ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        {/* Negative margin + matching padding gives chip rings and focus outlines room inside the clip. */}
        <div className="-m-1.5 min-h-0 overflow-hidden p-1.5">
          <div className="pb-5">{clientPicker}</div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Field id="clientName" label="Client name">
            <div className="relative">
              <input
                id="clientName"
                className={fieldClass}
                value={invoice.clientName}
                onChange={(event) => {
                  setSavePrompt(null);
                  onChange({ clientName: event.target.value });
                }}
                onBlur={offerSave}
                placeholder="Client or company name"
              />
              {promptName && (
                <div
                  role="status"
                  className="absolute bottom-full left-0 z-20 mb-2.5 w-max max-w-[min(20rem,calc(100vw-4rem))] animate-fade-in rounded-md bg-ink px-4 py-3 text-sheet shadow-lift"
                  onKeyDown={(event) => event.key === 'Escape' && setSavePrompt(null)}
                >
                  <span aria-hidden className="absolute -bottom-1.5 left-5 h-3 w-3 rotate-45 bg-ink" />
                  <p className="relative text-sm">
                    Save <strong className="font-semibold">{promptName}</strong> for next time?
                  </p>
                  <div className="relative mt-2.5 flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-sheet px-3 py-1.5 text-[13px] font-semibold text-ink transition hover:bg-sheet/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      onClick={() => {
                        onSaveClient(promptName);
                        setSavePrompt(null);
                      }}
                    >
                      Save client
                    </button>
                    <button
                      type="button"
                      className="rounded px-3 py-1.5 text-[13px] font-medium text-sheet/75 transition hover:bg-sheet/10 hover:text-sheet focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      onClick={() => {
                        setDeclinedName(promptName);
                        setSavePrompt(null);
                      }}
                    >
                      Not now
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Field>
          <Field id="remittanceEmail" label="Your email for payment confirmations">
            <input
              type="email"
              id="remittanceEmail"
              className={fieldClass}
              value={invoice.remittanceEmail || ''}
              onChange={(event) => onChange({ remittanceEmail: event.target.value })}
              placeholder="you@example.com"
            />
          </Field>
        </div>
        <Field id="clientAddress" label="Client address" className="flex flex-col">
          <textarea
            id="clientAddress"
            className={`${fieldClass} min-h-[120px] flex-1 leading-relaxed`}
            value={invoice.clientAddress}
            onChange={(event) => onChange({ clientAddress: event.target.value })}
            placeholder={'Company name\nStreet\nCity, Postcode'}
          />
        </Field>
      </div>
    </div>
  );
}

function ReceiptLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 text-[15px] ${strong ? 'font-semibold text-ink' : 'text-ink-2'}`}>
      <span className="shrink-0">{label}</span>
      <span aria-hidden className="leader" />
      <span className="shrink-0 font-mono tabular-nums text-ink">{value}</span>
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
  const showTaxLine = taxRate > 0 && totals.taxAmount > 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-dashed border-rule-strong py-4">
        <label htmlFor="taxRate" className={labelClass}>
          VAT, if you charge it
        </label>
        <div className="relative w-24">
          <input
            type="number"
            id="taxRate"
            min={0}
            className={`${fieldClass.replace('py-2.5', 'py-2')} h-10 pr-7 text-right font-mono`}
            value={taxRate}
            onChange={(event) => setTaxRate(Number(event.target.value) || 0)}
          />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center font-mono text-sm text-ink-2">
            %
          </span>
        </div>
      </div>

      <div className="space-y-2.5 border-b border-dashed border-rule-strong py-5">
        <ReceiptLine label="Work" value={formatMoney(currency, totals.workSubtotal)} />
        <ReceiptLine label="Expenses" value={formatMoney(currency, totals.expensesSubtotal)} />
        {showTaxLine && (
          <>
            <ReceiptLine label="Subtotal" value={formatMoney(currency, totals.preTaxSubtotal)} strong />
            <ReceiptLine label={`VAT ${taxRate}%`} value={formatMoney(currency, totals.taxAmount)} />
          </>
        )}
      </div>

      <div className="pt-5">
        <p className={monoLabelClass}>
          {showTaxLine ? 'Total incl. tax' : 'Total due'}
        </p>
        <RollingNumber
          value={formatMoney(currency, totals.total)}
          className="mt-1 font-display text-[2.6rem] font-extrabold leading-none tracking-[-0.04em] text-ink"
        />
        <div aria-hidden className="mt-4 h-[5px] border-y border-ink" />
      </div>
    </div>
  );
}
