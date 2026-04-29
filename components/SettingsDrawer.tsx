'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CurrencyPicker, currencyOptions } from '@/components/CurrencyPicker';
import { DEFAULT_FILENAME_TEMPLATE, defaultSettings, emptyExtraReference } from '@/lib/defaults';
import { FILENAME_TOKENS } from '@/lib/filename';
import { ExtraReference, Settings } from '@/lib/types';

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
}: SettingsDrawerProps) => {
  const [isVisible, setIsVisible] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsClosing(false);
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
    'w-full rounded-2xl border border-slate-200/80 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/5 transition hover:border-slate-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/20 dark:hover:border-slate-700 dark:focus:bg-slate-900';
  const colorFieldClass =
    'color-input h-11 w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-1 shadow-sm shadow-slate-900/5 transition hover:border-slate-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 appearance-none dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 dark:hover:border-slate-700 dark:focus:bg-slate-900 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-xl [&::-webkit-color-swatch]:border-0';

  const colorFields: Array<keyof Settings> = ['headerColor', 'bodyColor'];
  const field = (label: string, id: keyof Settings, multiline = false, placeholder?: string) => {
    const isNumberField = id === 'defaultDailyRate' || id === 'defaultPaymentTerms';
    const isColorField = colorFields.includes(id);
    const isBankDetails = id === 'bankDetails';
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-slate-700 dark:text-slate-200">
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
      className={`fixed inset-0 z-20 flex justify-end bg-slate-900/50 backdrop-blur-sm ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      >
        <div
          className={`h-full w-full max-w-md overflow-y-auto bg-white px-6 py-8 shadow-2xl shadow-slate-900/30 transition-colors ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'} sm:px-8 dark:bg-slate-950 dark:shadow-black/50`}
          onClick={(event) => event.stopPropagation()}
        >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Settings</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Stored locally in your browser</p>
          </div>
          <button className={buttonClasses.ghost} onClick={onClose}>
            Close
          </button>
        </div>

        {reminderMessage && (
          <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-100">
            {reminderMessage}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-5">
          {field('Business / Trading Name', 'businessName')}
          {field('Business Address', 'businessAddress', true, 'Street\nCity\nPostcode')}
          {field('Email', 'email')}
          {field('Phone', 'phone')}
          {field('Default Client Name', 'defaultClientName')}
          {field('Default Daily Rate', 'defaultDailyRate')}
          <div className="space-y-2">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Currency</p>
              <CurrencyPicker selectedSymbol={settings.currencySymbol} onSelect={handleCurrencySelect} />
            </div>
            <div className="space-y-1">
              <label htmlFor="currencySymbol" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Custom symbol
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
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Custom value won&apos;t highlight above but will be used for totals and PDFs.
                </p>
              )}
            </div>
          </div>
          {field('Default Payment Terms (days)', 'defaultPaymentTerms')}
          {field('Bank / Payment Details', 'bankDetails', true)}
          {field('Header Background Color', 'headerColor')}
          {field('Body Background Color (below header)', 'bodyColor')}
          {field('Default Notes Template', 'defaultNotes', true)}
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
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button className={buttonClasses.primary} onClick={onClose}>
            Done
          </button>
          <button className={buttonClasses.secondary} onClick={onReset}>
            Reset to defaults
          </button>
          <button className={buttonClasses.ghost} onClick={onClearAll}>
            Clear stored data
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
    'h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-900';
  const moveButtonClass =
    'inline-flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-slate-200 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-40 dark:ring-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:ring-slate-600';

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Extra references</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Custom labelled references (e.g. UTR, Tax ID). The order below is the order shown in the PDF.
        </p>
      </div>

      {references.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          No extra references yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {references.map((ref, index) => (
            <li
              key={ref.id}
              className="space-y-2 rounded-2xl border border-slate-200/80 bg-white/70 p-3 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20"
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
                    placeholder="Label (e.g. UTR)"
                    aria-label="Reference label"
                  />
                  <input
                    type="text"
                    className={fieldClass}
                    value={ref.value}
                    onChange={(event) => updateRef(ref.id, { value: event.target.value })}
                    placeholder="Value"
                    aria-label="Reference value"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pl-9">
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={ref.showAtTop}
                      onChange={(event) => updateRef(ref.id, { showAtTop: event.target.checked })}
                    />
                    Show at top
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
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
                  className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-300"
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
        + Add reference
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
      <label htmlFor="filenameTemplate" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        PDF filename template
      </label>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Use [tokens] (type <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">[</code> for suggestions) mixed
        with any literal text. <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.pdf</code> is added
        automatically.
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
          <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
            {matches.map((token, index) => (
              <li key={token.id}>
                <button
                  type="button"
                  className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                    index === autocomplete.selectedIndex
                      ? 'bg-slate-100 dark:bg-slate-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertToken(token.id);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                      [{token.id}]
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{token.description}</span>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{token.label}</span>
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
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            title={token.description}
          >
            [{token.id}]
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-500 dark:text-slate-400">Preview</p>
          <p className="break-all font-mono text-sm text-slate-900 dark:text-slate-100">{preview}</p>
        </div>
        {value !== DEFAULT_FILENAME_TEMPLATE && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILENAME_TEMPLATE)}
            className="shrink-0 text-xs font-semibold text-slate-500 hover:underline dark:text-slate-300"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
};
