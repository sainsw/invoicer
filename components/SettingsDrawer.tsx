'use client';

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
  if (!open) {
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

  const fieldClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';
  const colorFieldClass =
    'color-input h-11 w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-transparent p-1 shadow-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';

  const field = (label: string, id: keyof Settings, multiline = false, placeholder?: string) => {
    const isNumberField = id === 'defaultDailyRate' || id === 'defaultPaymentTerms';
    const isColorField = id === 'headerColor';
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {label}
        </label>
        {multiline ? (
          <textarea
            id={id}
            className={`${fieldClass} min-h-[120px]`}
            value={(settings[id] as string) || ''}
            onChange={handleInput(id)}
            placeholder={placeholder}
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
      className="fixed inset-0 z-20 flex justify-end bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      >
        <div
          className="h-full w-full max-w-md overflow-y-auto bg-white px-6 py-8 shadow-2xl sm:px-8"
          onClick={(event) => event.stopPropagation()}
        >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
            <p className="text-sm text-slate-500">Stored locally in your browser</p>
          </div>
          <button className={buttonClasses.ghost} onClick={onClose}>
            Close
          </button>
        </div>

        {reminderMessage && (
          <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
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
          {field('Currency Symbol', 'currencySymbol')}
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
