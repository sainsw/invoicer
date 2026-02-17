'use client';

import { formatHumanDate } from '@/lib/date';
import { Expense } from '@/lib/types';

type Props = {
  expenses: Expense[];
  currencySymbol: string;
  onExpenseChange: (id: string, patch: Partial<Expense>) => void;
  onRemove: (id: string) => void;
};

const tableInputClass =
  'w-full rounded-2xl border border-slate-200/80 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/5 transition hover:border-slate-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/20 dark:hover:border-slate-700 dark:focus:bg-slate-900';

const safeDate = (value: string) => {
  try {
    return formatHumanDate(value);
  } catch {
    return '—';
  }
};

export const ExpensesTable = ({ expenses, currencySymbol, onExpenseChange, onRemove }: Props) => {
  if (expenses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="hidden overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-md shadow-slate-900/5 transition-colors md:block dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
        <table className="min-w-full divide-y divide-slate-200/70 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-5 py-3 text-left">
                Date
              </th>
              <th scope="col" className="px-5 py-3 text-left">
                Notes
              </th>
              <th scope="col" className="px-5 py-3 text-left">
                Value
              </th>
              <th scope="col" className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
            {expenses.map((expense) => (
              <tr key={expense.id} className="align-top">
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                  <input
                    type="date"
                    className={tableInputClass}
                    value={expense.date}
                    onChange={(event) => onExpenseChange(expense.id, { date: event.target.value })}
                  />
                  <small className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{safeDate(expense.date)}</small>
                </td>
                <td className="px-5 py-3">
                  <input
                    type="text"
                    className={tableInputClass}
                    value={expense.notes}
                    onChange={(event) => onExpenseChange(expense.id, { notes: event.target.value })}
                    placeholder="e.g. Travel to client site"
                  />
                </td>
                <td className="px-5 py-3">
                  <input
                    type="number"
                    min={0}
                    className={tableInputClass}
                    value={expense.value}
                    onChange={(event) => onExpenseChange(expense.id, { value: Number(event.target.value) || 0 })}
                  />
                </td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-900/50"
                    onClick={() => onRemove(expense.id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-md shadow-slate-900/5 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-none"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Date</label>
              <input
                type="date"
                className={tableInputClass}
                value={expense.date}
                onChange={(event) => onExpenseChange(expense.id, { date: event.target.value })}
              />
              <small className="text-xs text-slate-400 dark:text-slate-500">{safeDate(expense.date)}</small>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Notes</label>
              <input
                type="text"
                className={tableInputClass}
                value={expense.notes}
                onChange={(event) => onExpenseChange(expense.id, { notes: event.target.value })}
                placeholder="e.g. Travel to client site"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Value</label>
              <input
                type="number"
                min={0}
                className={tableInputClass}
                value={expense.value}
                onChange={(event) => onExpenseChange(expense.id, { value: Number(event.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 dark:bg-slate-900 dark:text-white">
              <span>Amount</span>
              <span>
                {currencySymbol}
                {expense.value.toFixed(2)}
              </span>
            </div>
            <button
              type="button"
              className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-900/50"
              onClick={() => onRemove(expense.id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
