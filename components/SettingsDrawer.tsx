'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CurrencyPicker, currencyOptions } from '@/components/CurrencyPicker';
import { defaultSettings, emptyExtraReference } from '@/lib/defaults';
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

  const currencyIndex = useMemo(
    () => currencyOptions.findIndex((option) => option.symbol === settings.currencySymbol),
    [settings.currencySymbol]
  );

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
  const colorFieldClass =
    'color-input h-11 w-full cursor-pointer overflow-hidden rounded-md border border-edge bg-field p-1 transition hover:border-rule-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-xl [&::-webkit-color-swatch]:border-0';

  const colorFields: Array<keyof Settings> = ['headerColor', 'bodyColor'];
  const field = (label: string, id: keyof Settings, multiline = false, placeholder?: string) => {
    const isNumberField = id === 'defaultDailyRate' || id === 'defaultPaymentTerms';
    const isColorField = colorFields.includes(id);
    const isBankDetails = id === 'bankDetails';
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
        </label>
        {multiline ? (
          <textarea
            id={id}
            className={`${fieldClass} min-h-[120px] overflow-x-auto ${isBankDetails ? 'whitespace-pre' : ''}`}
            value={(settings[id] as string) || ''}
            onChange={handleInput(id)}
            placeholder={placeholder}
            spellCheck={isBankDetails ? false : undefined}
          />
        ) : isColorField ? (
          <input
            id={id}
            type="color"
            className={colorFieldClass}
            value={(settings[id] as string) || (defaultSettings()[id] as string)}
            onChange={handleInput(id)}
          />
        ) : (
          <input
            id={id}
            type={isNumberField ? 'number' : 'text'}
            className={fieldClass}
            value={
              typeof settings[id] === 'number'
                ? String(settings[id])
                : (settings[id] as string)
            }
            onChange={handleInput(id)}
            placeholder={placeholder}
          />
        )}
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
          className={`h-full w-full max-w-md overflow-y-auto bg-sheet px-6 py-8 shadow-2xl transition-colors focus:outline-none ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'} sm:px-8`}
          onClick={(event) => event.stopPropagation()}
        >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="settings-heading" className="text-3xl font-extrabold tracking-[-0.035em] text-ink">Your details</h2>
            <p className="text-sm text-ink-2">Kept on this computer only. Used on every invoice.</p>
          </div>
          <button className={buttonClasses.ghost} onClick={onClose}>
            Close
          </button>
        </div>

        {reminderMessage && (
          <div className="mt-4 rounded-md bg-warn-soft px-4 py-3 text-sm font-semibold text-warn-ink">
            {reminderMessage}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-5">
          {field('Your name or business name', 'businessName', false, 'e.g. Jane Smith Joinery')}
          {field('Your address', 'businessAddress', true, 'Street\nTown\nPostcode')}
          {field('Email', 'email', false, 'you@example.com')}
          {field('Phone', 'phone', false, '+44 7700 900123')}
          {field('Usual client (optional)', 'defaultClientName')}
          {field('Your usual day rate', 'defaultDailyRate')}
          <div className="space-y-2">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-ink">Currency</p>
              <CurrencyPicker selectedSymbol={settings.currencySymbol} onSelect={handleCurrencySelect} />
            </div>
            <div className="space-y-1">
              <label htmlFor="currencySymbol" className="block text-sm font-medium text-ink">
                Other symbol
              </label>
              <input
                id="currencySymbol"
                type="text"
                className={fieldClass}
                value={settings.currencySymbol}
                onChange={handleInput('currencySymbol')}
                placeholder="£ or CHF"
              />
              {currencyIndex === -1 && (
                <p className="text-[13px] text-ink-2">
                  This symbol will be used on your invoices.
                </p>
              )}
            </div>
          </div>
          {field('Days your client has to pay', 'defaultPaymentTerms')}
          {field('How to pay you (bank details)', 'bankDetails', true)}
          {field('Colour at the top of the invoice', 'headerColor')}
          {field('Invoice background colour', 'bodyColor')}
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
          <FilenameTemplateField
            value={settings.filenameTemplate ?? DEFAULT_FILENAME_TEMPLATE}
            onChange={(filenameTemplate) => onChange({ ...settings, filenameTemplate })}
            resolvePreview={resolveFilenamePreview}
            fieldClass={fieldClass}
          />
          <ExtraReferencesEditor
            references={Array.isArray(settings.extraReferences) ? settings.extraReferences : []}
            onChange={(extraReferences) => onChange({ ...settings, extraReferences })}
            fieldClass={fieldClass}
            buttonClasses={buttonClasses}
          />
          <div className="space-y-2 border-t border-dashed border-rule-strong pt-5">
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              Try something new
              <span className="rounded bg-warn-soft px-1.5 py-0.5 text-xs font-semibold text-warn-ink">Early testing</span>
            </p>
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
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button className={buttonClasses.primary} onClick={onClose}>
            Done
          </button>
          <button className={buttonClasses.secondary} onClick={onReset}>
            Reset these details
          </button>
          <button className={buttonClasses.ghost} onClick={onClearAll}>
            Delete everything
          </button>
        </div>
      </div>
    </div>
  );
};

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

const ExtraReferencesEditor = ({ references, onChange, fieldClass, buttonClasses }: ExtraReferencesEditorProps) => {
  const updateRef = (id: string, patch: Partial<ExtraReference>) => {
    onChange(references.map((ref) => (ref.id === id ? { ...ref, ...patch } : ref)));
  };

  const removeRef = (id: string) => {
    onChange(references.filter((ref) => ref.id !== id));
  };

  const moveRef = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= references.length) {
      return;
    }
    const next = references.slice();
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  const addRef = () => {
    onChange([...references, emptyExtraReference()]);
  };

  const checkboxClass =
    'h-4 w-4 rounded border-edge accent-[rgb(var(--accent))] focus:ring-accent/30';
  const moveButtonClass =
    'inline-flex h-7 w-7 items-center justify-center rounded ring-1 ring-edge text-xs font-semibold text-ink-2 transition hover:bg-well hover:ring-rule-strong disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">Extra reference numbers</p>
        <p className="text-[13px] text-ink-2">
          Things like your tax reference (UTR) or company number. They appear on the invoice in this order.
        </p>
      </div>

      {references.length === 0 ? (
        <p className="rounded-md border border-dashed border-rule px-3 py-4 text-center text-[13px] text-ink-2">
          None added yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {references.map((ref, index) => (
            <li
              key={ref.id}
              className="space-y-2 rounded-md border border-edge bg-field p-3"
            >
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className={moveButtonClass}
                    onClick={() => moveRef(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={moveButtonClass}
                    onClick={() => moveRef(index, 1)}
                    disabled={index === references.length - 1}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </div>
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    className={fieldClass}
                    value={ref.label}
                    onChange={(event) => updateRef(ref.id, { label: event.target.value })}
                    placeholder="Name, e.g. UTR"
                    aria-label="Reference name"
                  />
                  <input
                    type="text"
                    className={fieldClass}
                    value={ref.value}
                    onChange={(event) => updateRef(ref.id, { value: event.target.value })}
                    placeholder="Number"
                    aria-label="Reference number"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pl-9">
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-2">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={ref.showAtTop}
                      onChange={(event) => updateRef(ref.id, { showAtTop: event.target.checked })}
                    />
                    Show at top
                  </label>
                  <label className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-2">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={ref.showAtBottom}
                      onChange={(event) => updateRef(ref.id, { showAtBottom: event.target.checked })}
                    />
                    Show at bottom
                  </label>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-danger hover:underline"
                  onClick={() => removeRef(ref.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className={buttonClasses.secondary} onClick={addRef}>
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
