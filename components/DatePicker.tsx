'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

type Props = {
  id?: string;
  /** "YYYY-MM-DD" */
  value: string;
  onChange: (value: string) => void;
  /** Classes for the trigger so it matches the surrounding text fields. */
  fieldClass: string;
  /** Names the field when there's no <label for> pointing at it, e.g. inside a table row. */
  'aria-label'?: string;
  'aria-describedby'?: string;
};

type Day = { year: number; month: number; day: number }; // month is 0–11

const SHORT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const FULL = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const MONTH_YEAR = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
// 3 Jan 2000 was a Monday.
const WEEKDAYS = Array.from({ length: 7 }, (_, index) => ({
  short: new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(Date.UTC(2000, 0, 3 + index)),
  long: new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' }).format(Date.UTC(2000, 0, 3 + index)),
}));

const toUTC = ({ year, month, day }: Day) => Date.UTC(year, month, day);

const fromUTC = (time: number): Day => {
  const date = new Date(time);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
};

const parse = (value: string): Day | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const day = { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
  // Reject dates like 2026-02-31 that Date.UTC would quietly roll over.
  const check = fromUTC(toUTC(day));
  return check.month === day.month && check.day === day.day ? day : null;
};

const format = ({ year, month, day }: Day) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const todayDay = (): Day => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
};

const addDays = (day: Day, by: number) => fromUTC(toUTC(day) + by * 86_400_000);

// Same day of the month, clamped to the end of shorter months (31 Jan → 28 Feb).
const addMonths = ({ year, month, day }: Day, by: number): Day => {
  const total = year * 12 + month + by;
  const target = { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
  const lastDay = new Date(Date.UTC(target.year, target.month + 1, 0)).getUTCDate();
  return { ...target, day: Math.min(day, lastDay) };
};

// Monday-first index, 0–6.
const weekdayIndex = (day: Day) => (new Date(toUTC(day)).getUTCDay() + 6) % 7;

const sameDay = (a: Day | null, b: Day) => !!a && a.year === b.year && a.month === b.month && a.day === b.day;

// Six full weeks starting on the Monday on or before the 1st, so the grid never changes height.
const monthGrid = ({ year, month }: Day): Day[] => {
  const first = { year, month, day: 1 };
  const start = addDays(first, -weekdayIndex(first));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
};

const CalendarIcon = () => (
  <svg aria-hidden className="h-4 w-4 shrink-0 text-ink-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
);

const Chevron = ({ direction }: { direction: 'left' | 'right' }) => (
  <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d={direction === 'left' ? 'M15.75 19.5 8.25 12l7.5-7.5' : 'm8.25 4.5 7.5 7.5-7.5 7.5'} />
  </svg>
);

const navButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-2 transition hover:bg-well hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/**
 * A date picker that matches MonthPicker and the rest of the sheet. The native date input's popup
 * can't be styled (Chrome draws it in its own colours) and its calendar icon crowds the date in
 * narrow table cells.
 * Keyboard: arrows move by day and week, Page Up/Down change month, Home/End jump to the start or
 * end of the week, Enter picks, Escape closes.
 */
export function DatePicker({
  id,
  value,
  onChange,
  fieldClass,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: Props) {
  const selected = parse(value);
  const [open, setOpen] = useState(false);
  // The day that has keyboard focus inside the grid; its month is the month on show.
  const [active, setActive] = useState<Day>(() => selected ?? todayDay());
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const today = todayDay();

  const openPicker = () => {
    setActive(selected ?? todayDay());
    setOpen(true);
  };

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  };

  const choose = (day: Day) => {
    onChange(format(day));
    close(true);
  };

  // Keep DOM focus on the active day while open.
  useEffect(() => {
    if (open) {
      gridRef.current?.querySelector<HTMLButtonElement>('[data-active="true"]')?.focus();
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
    const dayMoves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in dayMoves) {
      event.preventDefault();
      setActive((prev) => addDays(prev, dayMoves[event.key]));
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      setActive((prev) => addMonths(prev, event.key === 'PageUp' ? -1 : 1));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActive((prev) => addDays(prev, event.key === 'Home' ? -weekdayIndex(prev) : 6 - weekdayIndex(prev)));
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
        // Close when focus moves outside the picker. A null relatedTarget is ignored, as in MonthPicker:
        // Safari doesn't focus buttons on click, and clicks outside are caught by the mousedown listener.
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
        className={`${fieldClass} flex h-11 items-center justify-between gap-1.5 text-left`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel ? `${ariaLabel}${selected ? `, ${FULL.format(toUTC(selected))}` : ''}` : undefined}
        aria-describedby={ariaDescribedBy}
        onClick={() => (open ? close(false) : openPicker())}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            openPicker();
          }
        }}
      >
        <span className={`truncate tabular-nums ${selected ? '' : 'text-ink-3'}`}>
          {selected ? SHORT.format(toUTC(selected)) : 'Choose a date'}
        </span>
        <CalendarIcon />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={ariaLabel ? `Choose the ${ariaLabel.toLowerCase()}` : 'Choose a date'}
          className="absolute left-0 top-full z-30 mt-2 w-72 origin-top animate-pop-in rounded-md bg-sheet p-3 shadow-lift ring-1 ring-rule"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className={navButtonClass}
              aria-label="Previous month"
              onClick={() => setActive((prev) => addMonths(prev, -1))}
            >
              <Chevron direction="left" />
            </button>
            <p className="font-display text-lg font-bold tracking-tight text-ink" aria-live="polite">
              {MONTH_YEAR.format(toUTC(active))}
            </p>
            <button
              type="button"
              className={navButtonClass}
              aria-label="Next month"
              onClick={() => setActive((prev) => addMonths(prev, 1))}
            >
              <Chevron direction="right" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5" aria-hidden>
            {WEEKDAYS.map(({ short }) => (
              <span key={short} className="pb-1 text-center font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">
                {short.slice(0, 2)}
              </span>
            ))}
          </div>
          <div ref={gridRef} className="grid grid-cols-7 gap-0.5" onKeyDown={onGridKeyDown}>
            {monthGrid(active).map((day) => {
              const isSelected = sameDay(selected, day);
              const isToday = sameDay(today, day);
              const isActive = sameDay(active, day);
              const inMonth = day.month === active.month;
              return (
                <button
                  key={format(day)}
                  type="button"
                  data-active={isActive}
                  tabIndex={isActive ? 0 : -1}
                  aria-label={`${FULL.format(toUTC(day))}${isToday ? ', today' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => choose(day)}
                  onFocus={() => setActive(day)}
                  className={`relative h-9 rounded-md text-sm font-medium tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    isSelected ? 'bg-accent text-accent-ink' : `${inMonth ? 'text-ink' : 'text-ink-3'} hover:bg-well`
                  }`}
                >
                  {day.day}
                  {isToday && (
                    <span
                      aria-hidden
                      className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
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
              className="rounded-md px-2.5 py-1.5 text-[13px] font-semibold text-accent transition hover:bg-well focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={() => choose(todayDay())}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
