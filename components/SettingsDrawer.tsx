'use client';

import { CSSProperties, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { ReorderCallout } from '@/components/ReorderCallout';
import { useReorderAnimation } from '@/hooks/useReorderAnimation';
import { closestCenterExcludingActive } from '@/lib/dnd';
import { BANK_DETAILS_EXAMPLE, defaultSettings, emptyExtraReference } from '@/lib/defaults';
import { DEFAULT_FILENAME_TEMPLATE, FILENAME_TOKENS } from '@sainsw/invoice-pdf';
import type { ExtraReference, Settings } from '@sainsw/invoice-pdf';

interface SettingsDrawerProps {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onChange: (settings: Settings) => void;
  onReset: () => void;
  onClearAll: () => void;
  buttonClasses: {
    primary: string;
    secondary: string;
    ghost: string;
  };
  reminderMessage?: string;
  resolveFilenamePreview: (template: string) => string;
  currentNotes: string;
  onApplyNotesToInvoice: () => void;
  accountsLinkEnabled: boolean;
  onAccountsLinkChange: (enabled: boolean) => void;
}

export const SettingsDrawer = ({
  open,
  settings,
  onClose,
  onChange,
  onReset,
  onClearAll,
  buttonClasses,
  reminderMessage,
  resolveFilenamePreview,
  currentNotes,
  onApplyNotesToInvoice,
  accountsLinkEnabled,
  onAccountsLinkChange,
}: SettingsDrawerProps) => {
  const [isVisible, setIsVisible] = useState(open);
  const [isClosing, setIsClosing] = useState(false);
  const [notesTouched, setNotesTouched] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Modal keyboard behaviour: focus moves into the panel, Tab stays inside it, Escape closes,
  // and focus returns to whatever opened the drawer.
  useEffect(() => {
    if (!open) {
      return;
    }
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Leave Escape to whatever inside the panel is using it: an open menu, a drag, the file name suggestions.
        const panel = panelRef.current;
        const inUse =
          event.defaultPrevented ||
          panel?.querySelector('[role="menu"], [aria-roledescription="sortable"][aria-pressed="true"]');
        if (inUse) {
          return;
        }
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) {
        return;
      }
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !panelRef.current.contains(active);
      if (event.shiftKey && (active === first || active === panelRef.current || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsClosing(false);
      setNotesTouched(false);
      return;
    }
    if (!isVisible) {
      return;
    }
    setIsClosing(true);
    const timeout = setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [open, isVisible]);

  if (!open && !isVisible) {
    return null;
  }

  const handleInput = (field: keyof Settings) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      if (field === 'defaultDailyRate') {
        onChange({ ...settings, [field]: Number(value) || 0 });
        return;
      }
      if (field === 'defaultPaymentTerms') {
        onChange({ ...settings, [field]: Math.max(0, Number(value) || 0) });
        return;
      }
      onChange({ ...settings, [field]: value });
    };

  const handleCurrencySelect = (symbol: string) => {
    if (symbol === settings.currencySymbol) {
      return;
    }
    onChange({ ...settings, currencySymbol: symbol });
  };

  const fieldClass =
    'w-full rounded-md border border-edge bg-field px-3.5 py-2.5 text-[15px] text-ink transition hover:border-ink-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-ink-3';

  const textValue = (id: keyof Settings) => (settings[id] as string) || '';

  const field = (label: string, id: keyof Settings, placeholder?: string) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type="text"
        className={fieldClass}
        value={textValue(id)}
        onChange={handleInput(id)}
        placeholder={placeholder}
      />
    </div>
  );

  // Grows with its content where the browser supports field-sizing; otherwise a fixed minimum height.
  const textareaField = (label: string, id: keyof Settings, placeholder?: string, preformatted = false) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={id}
        className={`${fieldClass} min-h-[120px] overflow-x-auto [field-sizing:content] ${preformatted ? 'whitespace-pre' : ''}`}
        value={textValue(id)}
        onChange={handleInput(id)}
        placeholder={placeholder}
        spellCheck={preformatted ? false : undefined}
      />
    </div>
  );

  // A short number with its unit inside the box, sized to the value rather than the panel.
  const numberField = (
    label: string,
    id: 'defaultDailyRate' | 'defaultPaymentTerms',
    affix: { prefix?: string; suffix?: string }
  ) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="flex w-44 items-center rounded-md border border-edge bg-field text-[15px] transition hover:border-ink-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
        {affix.prefix && (
          <span aria-hidden="true" className="shrink-0 pl-3.5 text-ink-2">
            {affix.prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          className={`w-full min-w-0 bg-transparent py-2.5 text-ink focus:outline-none ${affix.prefix ? 'pl-1.5' : 'pl-3.5'} ${affix.suffix ? 'pr-1.5' : 'pr-3.5'}`}
          value={String(settings[id])}
          onChange={handleInput(id)}
        />
        {affix.suffix && (
          <span aria-hidden="true" className="shrink-0 pr-3.5 text-ink-2">
            {affix.suffix}
          </span>
        )}
      </div>
    </div>
  );

  const colourField = (label: string, id: 'headerColor' | 'bodyColor') => {
    const value = settings[id] || defaultSettings()[id];
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
        </label>
        <div className="flex items-center gap-3 rounded-md border border-edge bg-field py-1.5 pl-1.5 pr-3.5 transition hover:border-ink-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
          <input
            id={id}
            type="color"
            className="h-8 w-10 shrink-0 cursor-pointer appearance-none rounded border-0 bg-transparent p-0 focus:outline-none [&::-moz-color-swatch]:rounded [&::-moz-color-swatch]:border [&::-moz-color-swatch]:border-edge [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-edge"
            value={value}
            onChange={handleInput(id)}
          />
          <span className="font-mono text-sm uppercase text-ink-2">{value}</span>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-20 flex justify-end bg-[rgb(18_14_10/0.5)] backdrop-blur-[2px] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
      onClick={onClose}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-heading"
          tabIndex={-1}
          className={`h-full w-full max-w-md overflow-y-auto bg-sheet px-6 pb-8 shadow-2xl transition-colors focus:outline-none ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'} sm:px-8`}
          onClick={(event) => event.stopPropagation()}
        >
        <div className="sticky top-0 z-20 -mx-6 flex items-start justify-between gap-4 border-b border-rule bg-sheet px-6 pb-4 pt-6 sm:-mx-8 sm:px-8">
          <div>
            <h2 id="settings-heading" className="text-2xl font-extrabold tracking-[-0.035em] text-ink">Your details</h2>
            <p className="text-sm text-ink-2">Kept on this computer only. Changes save as you type.</p>
          </div>
          <button className={buttonClasses.ghost} onClick={onClose}>
            Close
          </button>
        </div>

        {reminderMessage && (
          <div className="mt-6 rounded-md bg-warn-soft px-4 py-3 text-sm font-semibold text-warn-ink">
            {reminderMessage}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-8">
          <SettingsSection id="settings-you" title="Who you are" description="Printed at the top of every invoice.">
            {field('Your name or business name', 'businessName', 'e.g. Jane Smith Joinery')}
            {textareaField('Your address', 'businessAddress', 'Street\nTown\nPostcode')}
            <div className="grid gap-5 sm:grid-cols-2">
              {field('Email', 'email', 'you@example.com')}
              {field('Phone', 'phone', '+44 7700 900123')}
            </div>
            <ExtraReferencesEditor
              references={Array.isArray(settings.extraReferences) ? settings.extraReferences : []}
              onChange={(extraReferences) => onChange({ ...settings, extraReferences })}
              fieldClass={fieldClass}
              buttonClasses={buttonClasses}
            />
          </SettingsSection>

          <SettingsSection
            id="settings-payment"
            title="How you get paid"
            description="Your bank details go at the bottom of each invoice. The due date counts from the invoice date."
          >
            {textareaField('How to pay you (bank details)', 'bankDetails', BANK_DETAILS_EXAMPLE, true)}
            {numberField('Days your client has to pay', 'defaultPaymentTerms', { suffix: 'days' })}
          </SettingsSection>

          <SettingsSection id="settings-new" title="New invoices" description="Filled in for you each time you start one.">
            {field('Usual client (optional)', 'defaultClientName')}
            <CurrencyPicker selectedSymbol={settings.currencySymbol} onSelect={handleCurrencySelect} fieldClass={fieldClass} />
            {numberField('Your usual day rate', 'defaultDailyRate', { prefix: settings.currencySymbol })}
            <div className="space-y-1.5">
              <label htmlFor="defaultNotes" className="block text-sm font-medium text-ink">
                Your usual message
              </label>
              <p className="text-[13px] text-ink-2">
                Added to the notes on each new invoice. You can still change it each time.
              </p>
              <textarea
                id="defaultNotes"
                className={`${fieldClass} min-h-[120px] overflow-x-auto`}
                value={settings.defaultNotes || ''}
                onChange={(event) => {
                  setNotesTouched(true);
                  handleInput('defaultNotes')(event);
                }}
              />
              {notesTouched && settings.defaultNotes !== currentNotes && (
                <button
                  type="button"
                  className={`${buttonClasses.secondary} w-full animate-fade-in`}
                  onClick={onApplyNotesToInvoice}
                >
                  Use it on this invoice too
                </button>
              )}
            </div>
          </SettingsSection>

          <SettingsSection id="settings-pdf" title="The PDF" description="How your downloaded invoice looks and what it’s called.">
            <div className="grid grid-cols-2 gap-5">
              {colourField('Header colour', 'headerColor')}
              {colourField('Page colour', 'bodyColor')}
            </div>
            <FilenameTemplateField
              value={settings.filenameTemplate ?? DEFAULT_FILENAME_TEMPLATE}
              onChange={(filenameTemplate) => onChange({ ...settings, filenameTemplate })}
              resolvePreview={resolveFilenamePreview}
              fieldClass={fieldClass}
            />
          </SettingsSection>

          <SettingsSection
            id="settings-labs"
            title="Try something new"
            badge={<span className="rounded bg-warn-soft px-1.5 py-0.5 text-xs font-semibold text-warn-ink">Early testing</span>}
          >
            <label className="flex items-start gap-3 text-sm text-ink">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-edge accent-[rgb(var(--accent))]"
                checked={accountsLinkEnabled}
                onChange={(event) => onAccountsLinkChange(event.target.checked)}
              />
              <span className="space-y-1">
                <span className="block font-medium">Show a &ldquo;Track in Accounts&rdquo; button after downloading</span>
                <span className="block text-[13px] text-ink-2">
                  Accounts is a separate app for keeping track of which invoices have been paid. It&rsquo;s still
                  being tested, so things may change or not work as expected. Pressing the button sends this
                  invoice&rsquo;s details to Accounts.
                </span>
              </span>
            </label>
          </SettingsSection>

          <SettingsSection id="settings-remove" title="Remove saved data">
            <div className="space-y-3">
              <p className="text-[13px] text-ink-2">
                <span className="block text-sm font-medium text-ink">Reset your details</span>
                Puts everything on this panel back to how it started. Saved clients and this invoice are kept.
              </p>
              <button type="button" className={buttonClasses.secondary} onClick={onReset}>
                Reset details
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-[13px] text-ink-2">
                <span className="block text-sm font-medium text-ink">Delete everything</span>
                Removes your details, saved clients and this invoice from this computer.
              </p>
              <button type="button" className={buttonClasses.secondary.replace(' text-ink ', ' text-danger ')} onClick={onClearAll}>
                Delete everything
              </button>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
};

interface SettingsSectionProps {
  id: string;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

const SettingsSection = ({ id, title, description, badge, children }: SettingsSectionProps) => (
  <section aria-labelledby={id} className="space-y-5 border-t border-rule pt-6 first:border-t-0 first:pt-0">
    <div className="space-y-1">
      <h3 id={id} className="flex items-center gap-2 text-lg font-bold tracking-[-0.02em] text-ink">
        {title}
        {badge}
      </h3>
      {description && <p className="text-[13px] text-ink-2">{description}</p>}
    </div>
    {children}
  </section>
);

interface ExtraReferencesEditorProps {
  references: ExtraReference[];
  onChange: (next: ExtraReference[]) => void;
  fieldClass: string;
  buttonClasses: {
    primary: string;
    secondary: string;
    ghost: string;
  };
}

// Where a reference prints: beside the invoice number and date, under the bank details, or both.
// "none" only exists for references saved by older versions with both boxes unticked.
type ReferencePlacement = 'top' | 'bottom' | 'both' | 'none';

const placementOf = (ref: ExtraReference): ReferencePlacement =>
  ref.showAtTop && ref.showAtBottom ? 'both' : ref.showAtTop ? 'top' : ref.showAtBottom ? 'bottom' : 'none';

const placementPatch: Record<ReferencePlacement, Pick<ExtraReference, 'showAtTop' | 'showAtBottom'>> = {
  top: { showAtTop: true, showAtBottom: false },
  bottom: { showAtTop: false, showAtBottom: true },
  both: { showAtTop: true, showAtBottom: true },
  none: { showAtTop: false, showAtBottom: false },
};

const placementLabels: Record<ReferencePlacement, string> = {
  top: 'beside the invoice number',
  bottom: 'under your bank details',
  both: 'in both places',
  none: 'nowhere (hidden)',
};

const dragHandleClass =
  'inline-flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded text-ink-3 transition hover:bg-well hover:text-ink active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const GripIcon = () => (
  <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="4" cy="3" r="1.2" fill="currentColor" />
    <circle cx="10" cy="3" r="1.2" fill="currentColor" />
    <circle cx="4" cy="7" r="1.2" fill="currentColor" />
    <circle cx="10" cy="7" r="1.2" fill="currentColor" />
    <circle cx="4" cy="11" r="1.2" fill="currentColor" />
    <circle cx="10" cy="11" r="1.2" fill="currentColor" />
  </svg>
);

interface ReferenceRowProps {
  reference: ExtraReference;
  index: number;
  total: number;
  menuOpen: boolean;
  setOpenMenuId: (id: string | null) => void;
  onUpdate: (patch: Partial<ExtraReference>) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
  fieldClass: string;
  flipRef: (el: HTMLElement | null) => void;
}

const ReferenceRow = ({
  reference,
  index,
  total,
  menuOpen,
  setOpenMenuId,
  onUpdate,
  onRemove,
  onMove,
  fieldClass,
  flipRef,
}: ReferenceRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: reference.id });
  const toggleRef = useRef<HTMLButtonElement>(null);
  const placement = placementOf(reference);
  const name = reference.label.trim() || `reference ${index + 1}`;
  const compactField = fieldClass.replace('px-3.5 py-2.5', 'px-2.5 py-2');

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging || menuOpen ? 10 : undefined,
    position: 'relative',
  };

  return (
    <li
      ref={(el) => {
        setNodeRef(el);
        flipRef(el);
      }}
      style={style}
      data-reference-id={reference.id}
      className="flex items-start gap-1.5 bg-sheet px-1.5 py-2.5"
    >
      <div className="relative shrink-0 pt-1">
        <button
          ref={toggleRef}
          type="button"
          className={dragHandleClass}
          aria-label={`Move ${name}: drag, or click for options`}
          title="Drag to move, or click for options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setOpenMenuId(menuOpen ? null : reference.id)}
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </button>
        {menuOpen && (
          <ReorderCallout
            canMoveUp={index > 0}
            canMoveDown={index < total - 1}
            onMoveUp={() => {
              setOpenMenuId(null);
              onMove(-1);
            }}
            onMoveDown={() => {
              setOpenMenuId(null);
              onMove(1);
            }}
            onClose={() => setOpenMenuId(null)}
            toggleRef={toggleRef}
            placement="mobile"
          />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            className={compactField}
            value={reference.label}
            onChange={(event) => onUpdate({ label: event.target.value })}
            placeholder="e.g. UTR"
            aria-label={`Reference ${index + 1} name`}
          />
          <input
            type="text"
            className={compactField}
            value={reference.value}
            onChange={(event) => onUpdate({ value: event.target.value })}
            placeholder="Number"
            aria-label={`Reference ${index + 1} number`}
          />
        </div>
        <label className="flex items-center gap-1 pl-2.5 text-[13px] text-ink-2">
          Shows
          <select
            className="min-w-0 cursor-pointer rounded bg-transparent py-0.5 pl-1 pr-0.5 text-[13px] font-medium text-ink transition hover:bg-well focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            value={placement}
            onChange={(event) => onUpdate(placementPatch[event.target.value as ReferencePlacement])}
            aria-label={`Where ${name} shows on the invoice`}
          >
            {(['top', 'bottom', 'both'] as const).map((option) => (
              <option key={option} value={option}>
                {placementLabels[option]}
              </option>
            ))}
            {placement === 'none' && <option value="none">{placementLabels.none}</option>}
          </select>
        </label>
      </div>
      <button
        type="button"
        className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-ink-3 transition hover:bg-danger-soft hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
        title="Remove"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </li>
  );
};

const ExtraReferencesEditor = ({ references, onChange, fieldClass, buttonClasses }: ExtraReferencesEditorProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const dndId = useId();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { arm, registerRef } = useReorderAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // Where focus should go once the list has re-rendered, so it never drops out of the drawer.
  const pendingFocus = useRef<(() => void) | null>(null);

  const rowPart = (id: string, selector: string) =>
    containerRef.current?.querySelector<HTMLElement>(`[data-reference-id="${id}"] ${selector}`);

  useEffect(() => {
    pendingFocus.current?.();
    pendingFocus.current = null;
  }, [references]);

  const updateRef = (id: string, patch: Partial<ExtraReference>) => {
    onChange(references.map((ref) => (ref.id === id ? { ...ref, ...patch } : ref)));
  };

  const removeRef = (id: string) => {
    const index = references.findIndex((ref) => ref.id === id);
    const next = references.filter((ref) => ref.id !== id);
    const neighbour = next[index] ?? next[index - 1];
    pendingFocus.current = () =>
      (neighbour ? rowPart(neighbour.id, 'input') : addButtonRef.current)?.focus();
    onChange(next);
  };

  const moveRef = (id: string, delta: -1 | 1) => {
    const index = references.findIndex((ref) => ref.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= references.length) {
      return;
    }
    arm();
    pendingFocus.current = () => rowPart(id, '[aria-haspopup="menu"]')?.focus();
    onChange(arrayMove(references, index, target));
  };

  const addRef = () => {
    const ref = emptyExtraReference();
    pendingFocus.current = () => rowPart(ref.id, 'input')?.focus();
    onChange([...references, ref]);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }
    const from = references.findIndex((ref) => ref.id === active.id);
    const to = references.findIndex((ref) => ref.id === over.id);
    if (from < 0 || to < 0) {
      return;
    }
    onChange(arrayMove(references, from, to));
  };

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">Extra reference numbers</p>
        <p className="text-[13px] text-ink-2">
          Things like your tax reference (UTR) or company number. They appear on the invoice in this order.
        </p>
      </div>

      {references.length > 0 && (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenterExcludingActive}
          onDragStart={() => setOpenMenuId(null)}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={references.map((ref) => ref.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-rule rounded-md border border-rule">
              {references.map((ref, index) => (
                <ReferenceRow
                  key={ref.id}
                  reference={ref}
                  index={index}
                  total={references.length}
                  menuOpen={openMenuId === ref.id}
                  setOpenMenuId={setOpenMenuId}
                  onUpdate={(patch) => updateRef(ref.id, patch)}
                  onRemove={() => removeRef(ref.id)}
                  onMove={(delta) => moveRef(ref.id, delta)}
                  fieldClass={fieldClass}
                  flipRef={registerRef(ref.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <button ref={addButtonRef} type="button" className={buttonClasses.secondary} onClick={addRef}>
        + Add a reference
      </button>
    </div>
  );
};

interface FilenameTemplateFieldProps {
  value: string;
  onChange: (next: string) => void;
  resolvePreview: (template: string) => string;
  fieldClass: string;
}

type AutocompleteState = {
  anchor: number;
  query: string;
  selectedIndex: number;
};

const detectAutocomplete = (text: string, cursor: number): AutocompleteState | null => {
  const before = text.slice(0, cursor);
  const open = before.lastIndexOf('[');
  if (open === -1) {
    return null;
  }
  const close = before.lastIndexOf(']');
  if (close > open) {
    return null;
  }
  const query = before.slice(open + 1);
  if (!/^[a-zA-Z]*$/.test(query)) {
    return null;
  }
  const after = text.slice(cursor);
  const closeAfter = after.indexOf(']');
  const openAfter = after.indexOf('[');
  if (closeAfter !== -1 && (openAfter === -1 || closeAfter < openAfter)) {
    return null;
  }
  return { anchor: open, query, selectedIndex: 0 };
};

const FilenameTemplateField = ({ value, onChange, resolvePreview, fieldClass }: FilenameTemplateFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<AutocompleteState | null>(null);
  const pendingCaret = useRef<number | null>(null);
  // Set once and rarely changed, so the editor stays folded until asked for.
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (pendingCaret.current !== null && inputRef.current) {
      const pos = pendingCaret.current;
      inputRef.current.setSelectionRange(pos, pos);
      pendingCaret.current = null;
    }
  }, [value]);

  const matches = useMemo(() => {
    if (!autocomplete) {
      return [];
    }
    const q = autocomplete.query.toLowerCase();
    return FILENAME_TOKENS.filter((token) => token.id.startsWith(q) || token.label.toLowerCase().includes(q));
  }, [autocomplete]);

  const replaceRange = (from: number, to: number, insert: string) => {
    const next = value.slice(0, from) + insert + value.slice(to);
    pendingCaret.current = from + insert.length;
    onChange(next);
  };

  const insertToken = (tokenId: string) => {
    if (autocomplete) {
      const cursor = inputRef.current?.selectionStart ?? value.length;
      replaceRange(autocomplete.anchor, cursor, `[${tokenId}]`);
      setAutocomplete(null);
      return;
    }
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? start;
    replaceRange(start, end, `[${tokenId}]`);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    onChange(nextValue);
    const cursor = event.target.selectionStart ?? nextValue.length;
    setAutocomplete(detectAutocomplete(nextValue, cursor));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!autocomplete || matches.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setAutocomplete({ ...autocomplete, selectedIndex: (autocomplete.selectedIndex + 1) % matches.length });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setAutocomplete({
        ...autocomplete,
        selectedIndex: (autocomplete.selectedIndex - 1 + matches.length) % matches.length,
      });
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      insertToken(matches[autocomplete.selectedIndex].id);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setAutocomplete(null);
    }
  };

  const handleSelectionChange = () => {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    setAutocomplete(detectAutocomplete(input.value, input.selectionStart ?? input.value.length));
  };

  const previewSource = value.trim() ? value : DEFAULT_FILENAME_TEMPLATE;
  const preview = resolvePreview(previewSource);

  if (!editing) {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink">
          Invoice file name
        </p>
        <div className="flex items-center justify-between gap-3 rounded-md bg-well py-2 pl-3.5 pr-2">
          <p className="min-w-0 break-all font-mono text-sm text-ink">
            {preview}
          </p>
          <button
            type="button"
            className="shrink-0 rounded px-2 py-1 text-sm font-semibold text-ink-2 transition hover:bg-sheet hover:text-ink"
            onClick={() => setEditing(true)}
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="filenameTemplate" className="block text-sm font-medium text-ink">
        Invoice file name
      </label>
      <p className="text-[13px] text-ink-2">
        What your downloaded invoice is called. Tap a button below to add details like the invoice
        number, or type <code className="rounded bg-well px-1">[</code> to see them all. &ldquo;.pdf&rdquo; is
        added for you.
      </p>
      <div className="relative">
        <input
          ref={inputRef}
          autoFocus
          id="filenameTemplate"
          type="text"
          className={`${fieldClass} font-mono`}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleSelectionChange}
          onClick={handleSelectionChange}
          onBlur={() => window.setTimeout(() => setAutocomplete(null), 120)}
          placeholder={DEFAULT_FILENAME_TEMPLATE}
          spellCheck={false}
          autoComplete="off"
        />
        {autocomplete && matches.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-rule bg-sheet">
            {matches.map((token, index) => (
              <li key={token.id}>
                <button
                  type="button"
                  className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                    index === autocomplete.selectedIndex
                      ? 'bg-well'
                      : 'hover:bg-well'
                  }`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertToken(token.id);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-semibold text-ink">
                      [{token.id}]
                    </span>
                    <span className="text-[13px] text-ink-2">{token.description}</span>
                  </div>
                  <span className="shrink-0 text-[13px] font-medium text-ink-2">{token.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILENAME_TOKENS.map((token) => (
          <button
            key={token.id}
            type="button"
            onClick={() => insertToken(token.id)}
            className="inline-flex items-center gap-1 rounded border border-rule bg-well px-2 py-1 font-mono text-[11px] font-medium text-ink transition hover:border-rule-strong"
            title={token.description}
          >
            [{token.id}]
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-md bg-well px-3 py-2 text-xs">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-2">Example</p>
          <p className="break-all font-mono text-sm text-ink">{preview}</p>
        </div>
        {value !== DEFAULT_FILENAME_TEMPLATE && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILENAME_TEMPLATE)}
            className="shrink-0 text-xs font-semibold text-ink-2 hover:underline"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
};
