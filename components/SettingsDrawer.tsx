'use client';

import { useEffect, useMemo, useState } from 'react';
import { CurrencyPicker, currencyOptions } from '@/components/CurrencyPicker';
import { defaultSettings } from '@/lib/defaults';
import { Settings } from '@/lib/types';

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

  const field = (label: string, id: keyof Settings, multiline = false, placeholder?: string) => {
    const isNumberField = id === 'defaultDailyRate' || id === 'defaultPaymentTerms';
    const isColorField = id === 'headerColor';
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
            value={settings.headerColor || defaultSettings().headerColor}
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
          {field('Default Notes Template', 'defaultNotes', true)}
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
