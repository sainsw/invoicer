'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

type Props = {
  id: string;
  /** "YYYY-MM" */
  value: string;
  onChange: (value: string) => void;
  /** Classes for the trigger so it matches the surrounding text fields. */
  fieldClass: string;
};

type YearMonth = { year: number; month: number }; // month is 0–11

const LONG = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const SHORT_MONTHS = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(Date.UTC(2000, month, 1))
);
const LONG_MONTHS = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(Date.UTC(2000, month, 1))
);

const parse = (value: string): YearMonth | null => {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const month = Number(match[2]) - 1;
  return month >= 0 && month < 12 ? { year: Number(match[1]), month } : null;
};

const format = ({ year, month }: YearMonth) => `${year}-${String(month + 1).padStart(2, '0')}`;

const thisMonth = (): YearMonth => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
};

const shift = ({ year, month }: YearMonth, by: number): YearMonth => {
  const total = year * 12 + month + by;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
};

const CalendarIcon = () => (
  <svg aria-hidden className="h-[18px] w-[18px] shrink-0 text-ink-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
);

const Chevron = ({ direction }: { direction: 'left' | 'right' }) => (
  <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d={direction === 'left' ? 'M15.75 19.5 8.25 12l7.5-7.5' : 'm8.25 4.5 7.5 7.5-7.5 7.5'} />
  </svg>
);

const navButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-2 transition hover:bg-well hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/**
 * A month-and-year picker that looks the same in every browser (Safari has no native month input).
 * Keyboard: arrows move between months, Page Up/Down change year, Home/End jump to Jan/Dec,
 * Enter picks, Escape closes.
 */
export function MonthPicker({ id, value, onChange, fieldClass }: Props) {
  const selected = parse(value);
  const [open, setOpen] = useState(false);
  // The month that has keyboard focus inside the grid; its year is the year on show.
  const [active, setActive] = useState<YearMonth>(() => selected ?? thisMonth());
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const monthRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const today = thisMonth();

  const openPicker = () => {
    setActive(selected ?? thisMonth());
    setOpen(true);
  };

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  };

  const choose = (month: YearMonth) => {
    onChange(format(month));
    close(true);
  };

  // Keep DOM focus on the active month while open.
  useEffect(() => {
    if (open) {
      monthRefs.current[active.month]?.focus();
    }
  }, [open, active]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -3,
      ArrowDown: 3,
      PageUp: -12,
      PageDown: 12,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive((prev) => shift(prev, moves[event.key]));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActive((prev) => ({ year: prev.year, month: event.key === 'Home' ? 0 : 11 }));
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          close(true);
        }
      }}
      onBlur={(event) => {
        // Close when focus moves to something outside the picker (e.g. tabbing on to the next field).
        // A null relatedTarget is ignored: Safari doesn't focus buttons on click, so clicking the year
        // arrows or "This month" blurs to nothing — closing then would swallow the click. Clicks
        // outside are handled by the mousedown listener instead.
        const next = event.relatedTarget as Node | null;
        if (open && next && !wrapperRef.current?.contains(next)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`${fieldClass} flex h-11 items-center justify-between gap-2 text-left`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close(false) : openPicker())}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            openPicker();
          }
        }}
      >
        <span className={selected ? 'truncate' : 'truncate text-ink-3'}>
          {selected ? LONG.format(Date.UTC(selected.year, selected.month, 1)) : 'Choose a month'}
        </span>
        <CalendarIcon />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose the invoice month"
          className="absolute left-0 right-0 top-full z-30 mt-2 origin-top animate-pop-in rounded-md bg-sheet p-3 shadow-lift ring-1 ring-rule sm:left-auto sm:w-72"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className={navButtonClass}
              aria-label={`Previous year, ${active.year - 1}`}
              onClick={() => setActive((prev) => shift(prev, -12))}
            >
              <Chevron direction="left" />
            </button>
            <p className="font-display text-lg font-bold tabular-nums tracking-tight text-ink" aria-live="polite">
              {active.year}
            </p>
            <button
              type="button"
              className={navButtonClass}
              aria-label={`Next year, ${active.year + 1}`}
              onClick={() => setActive((prev) => shift(prev, 12))}
            >
              <Chevron direction="right" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5" onKeyDown={onGridKeyDown}>
            {SHORT_MONTHS.map((label, month) => {
              const isSelected = selected?.year === active.year && selected.month === month;
              const isToday = today.year === active.year && today.month === month;
              return (
                <button
                  key={label}
                  ref={(element) => {
                    monthRefs.current[month] = element;
                  }}
                  type="button"
                  tabIndex={active.month === month ? 0 : -1}
                  aria-label={`${LONG_MONTHS[month]} ${active.year}${isToday ? ', this month' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => choose({ year: active.year, month })}
                  onFocus={() => setActive({ year: active.year, month })}
                  className={`relative h-10 rounded-md text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    isSelected ? 'bg-accent text-accent-ink' : 'text-ink hover:bg-well'
                  }`}
                >
                  {label}
                  {isToday && (
                    <span
                      aria-hidden
                      className={`absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                        isSelected ? 'bg-accent-ink' : 'bg-accent'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-end border-t border-rule pt-2">
            <button
              type="button"
              className="rounded-md px-2.5 py-1.5 text-[13px] font-semibold text-accent transition hover:bg-well focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={() => choose(thisMonth())}
            >
              This month
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
