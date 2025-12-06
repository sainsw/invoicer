'use client';

import { formatHumanDate } from '@/lib/date';
import { ComputedWorkBlock, WorkBlock } from '@/lib/types';

type Props = {
  blocks: ComputedWorkBlock[];
  currencySymbol: string;
  onBlockChange: (id: string, patch: Partial<WorkBlock>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
};

const tableInputClass =
  'w-full rounded-2xl border border-slate-200/80 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/5 transition hover:border-slate-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/20 dark:hover:border-slate-700 dark:focus:bg-slate-900';
const descriptionInputClass = `${tableInputClass} min-w-[240px]`;
const rateInputClass = `${tableInputClass} min-w-[140px] text-right`;

const safeDate = (value: string) => {
  try {
    return formatHumanDate(value);
  } catch {
    return '—';
  }
};

export const WorkBlocksTable = ({ blocks, currencySymbol, onBlockChange, onRemove, onDuplicate }: Props) => {
  return (
    <div className="space-y-4">
      <div className="hidden overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-md shadow-slate-900/5 transition-colors md:block dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
        <table className="min-w-full divide-y divide-slate-200/70 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-5 py-3 text-left">
                Description
              </th>
              <th scope="col" className="px-5 py-3 text-left">
                Start
              </th>
              <th scope="col" className="px-5 py-3 text-left">
                End
              </th>
              <th scope="col" className="px-5 py-3 text-left">
                Days
              </th>
              <th scope="col" className="px-5 py-3 text-left">
                Daily rate
              </th>
              <th scope="col" className="px-5 py-3 text-left">
                Total
              </th>
              <th scope="col" className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
            {blocks.map((block) => (
              <tr key={block.id} className="align-top">
                <td className="px-5 py-3">
                  <input
                    type="text"
                    className={descriptionInputClass}
                    value={block.description}
                    onChange={(event) => onBlockChange(block.id, { description: event.target.value })}
                    placeholder="e.g. Feature development"
                  />
                  {block.hasError && (
                    <p className="mt-1 text-xs font-medium text-rose-600">
                      Please ensure the end date is after the start date.
                    </p>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                  <input
                    type="date"
                    className={tableInputClass}
                    value={block.startDate}
                    onChange={(event) => onBlockChange(block.id, { startDate: event.target.value })}
                  />
                  <small className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{safeDate(block.startDate)}</small>
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                  <input
                    type="date"
                    className={tableInputClass}
                    value={block.endDate}
                    onChange={(event) => onBlockChange(block.id, { endDate: event.target.value })}
                  />
                  <small className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{safeDate(block.endDate)}</small>
                </td>
                <td className="px-5 py-3 pt-6 font-semibold text-slate-900 dark:text-white">{block.days}</td>
                <td className="px-5 py-3">
                  <input
                    type="number"
                    min={0}
                    className={rateInputClass}
                    value={block.dailyRate}
                    onChange={(event) => onBlockChange(block.id, { dailyRate: Number(event.target.value) || 0 })}
                  />
                </td>
                <td className="px-5 py-3 pt-6 font-semibold text-slate-900 dark:text-white">
                  {currencySymbol}
                  {block.lineTotal.toFixed(2)}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-full bg-brand-50 px-3 py-1 text-brand-700 transition hover:bg-brand-100 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                      onClick={() => onDuplicate(block.id)}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-full bg-rose-50 px-3 py-1 text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-900/50"
                      onClick={() => onRemove(block.id)}
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {blocks.map((block) => (
          <div
            key={block.id}
            className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-md shadow-slate-900/5 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-none"
          >
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Description</label>
              <input
                type="text"
                className={tableInputClass}
                value={block.description}
                onChange={(event) => onBlockChange(block.id, { description: event.target.value })}
                placeholder="e.g. Feature development"
              />
              {block.hasError && (
                <p className="text-xs font-medium text-rose-600">Please ensure the end date is after the start date.</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Start date</label>
                <input
                  type="date"
                  className={tableInputClass}
                  value={block.startDate}
                  onChange={(event) => onBlockChange(block.id, { startDate: event.target.value })}
                />
                <small className="text-xs text-slate-400 dark:text-slate-500">{safeDate(block.startDate)}</small>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">End date</label>
                <input
                  type="date"
                  className={tableInputClass}
                  value={block.endDate}
                  onChange={(event) => onBlockChange(block.id, { endDate: event.target.value })}
                />
                <small className="text-xs text-slate-400 dark:text-slate-500">{safeDate(block.endDate)}</small>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Daily rate</label>
                <input
                  type="number"
                  min={0}
                  className={tableInputClass}
                  value={block.dailyRate}
                  onChange={(event) => onBlockChange(block.id, { dailyRate: Number(event.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Days</label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                  {block.days}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 dark:bg-slate-900 dark:text-white">
              <span>Total</span>
              <span>
                {currencySymbol}
                {block.lineTotal.toFixed(2)}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-brand-700 transition hover:bg-brand-100 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                onClick={() => onDuplicate(block.id)}
              >
                Duplicate
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-900/50"
                onClick={() => onRemove(block.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
