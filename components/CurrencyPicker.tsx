'use client';

import { useEffect, useRef, useState } from 'react';

export const currencyOptions = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CAD', symbol: 'CA$' },
  { code: 'CHF', symbol: 'CHF' },
  { code: 'INR', symbol: '₹' },
];

interface CurrencyPickerProps {
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  fieldClass: string;
}

const optionClass = (active: boolean) =>
  `flex h-14 flex-col items-center justify-center rounded-md text-ink transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
    active ? 'bg-well ring-2 ring-ink' : 'ring-1 ring-edge hover:bg-well hover:ring-ink-2'
  }`;

export function CurrencyPicker({ selectedSymbol, onSelect, fieldClass }: CurrencyPickerProps) {
  const selectedIndex = currencyOptions.findIndex((option) => option.symbol === selectedSymbol);
  // "Other" stays open once picked, even if the typed symbol happens to match one of the options.
  const [otherChosen, setOtherChosen] = useState(false);
  const otherActive = otherChosen || selectedIndex === -1;
  const otherInputRef = useRef<HTMLInputElement>(null);
  const focusOther = useRef(false);

  useEffect(() => {
    if (otherActive && focusOther.current) {
      focusOther.current = false;
      otherInputRef.current?.select();
    }
  }, [otherActive]);

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 text-sm font-medium text-ink">Currency</legend>
      <div className="grid grid-cols-3 gap-2">
        {currencyOptions.map((option, index) => {
          const active = !otherActive && index === selectedIndex;
          return (
            <button
              type="button"
              key={option.code}
              aria-pressed={active}
              className={optionClass(active)}
              onClick={() => {
                setOtherChosen(false);
                onSelect(option.symbol);
              }}
            >
              <span className="text-lg font-semibold leading-tight">{option.symbol}</span>
              {option.code !== option.symbol && (
                <span className="text-[11px] font-medium text-ink-2">{option.code}</span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={otherActive}
          className={optionClass(otherActive)}
          onClick={() => {
            focusOther.current = true;
            setOtherChosen(true);
          }}
        >
          <span className="text-sm font-semibold">Other</span>
        </button>
      </div>
      {otherActive && (
        <div className="flex items-center gap-3 pt-1">
          <label htmlFor="currencySymbol" className="text-sm font-medium text-ink">
            Symbol
          </label>
          <div className="w-28">
            <input
              ref={otherInputRef}
              id="currencySymbol"
              type="text"
              className={fieldClass}
              value={selectedSymbol}
              onChange={(event) => onSelect(event.target.value)}
              placeholder="e.g. kr"
              autoComplete="off"
            />
          </div>
        </div>
      )}
    </fieldset>
  );
}
