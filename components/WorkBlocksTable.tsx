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
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';
const descriptionInputClass = `${tableInputClass} min-w-[220px]`;
const rateInputClass = `${tableInputClass} min-w-[120px]`;

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
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">
                Description
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                Start
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                End
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                Days
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                Daily rate
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                Total
              </th>
              <th scope="col" className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {blocks.map((block) => (
              <tr key={block.id} className="align-top">
                <td className="px-4 py-3">
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
                <td className="px-4 py-3 text-slate-600">
                  <input
                    type="date"
                    className={tableInputClass}
                    value={block.startDate}
                    onChange={(event) => onBlockChange(block.id, { startDate: event.target.value })}
                  />
                  <small className="mt-1 block text-xs text-slate-400">{safeDate(block.startDate)}</small>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <input
                    type="date"
                    className={tableInputClass}
                    value={block.endDate}
                    onChange={(event) => onBlockChange(block.id, { endDate: event.target.value })}
                  />
                  <small className="mt-1 block text-xs text-slate-400">{safeDate(block.endDate)}</small>
                </td>
                <td className="px-4 py-3 pt-6 font-semibold text-slate-900">{block.days}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    className={rateInputClass}
                    value={block.dailyRate}
                    onChange={(event) => onBlockChange(block.id, { dailyRate: Number(event.target.value) || 0 })}
                  />
                </td>
                <td className="px-4 py-3 pt-6 font-semibold text-slate-900">
                  {currencySymbol}
                  {block.lineTotal.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                    <button type="button" className="hover:text-brand" onClick={() => onDuplicate(block.id)}>
                      Duplicate
                    </button>
                    <button type="button" className="text-rose-500 hover:text-rose-600" onClick={() => onRemove(block.id)}>
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
          <div key={block.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
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
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start date</label>
                <input
                  type="date"
                  className={tableInputClass}
                  value={block.startDate}
                  onChange={(event) => onBlockChange(block.id, { startDate: event.target.value })}
                />
                <small className="text-xs text-slate-400">{safeDate(block.startDate)}</small>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">End date</label>
                <input
                  type="date"
                  className={tableInputClass}
                  value={block.endDate}
                  onChange={(event) => onBlockChange(block.id, { endDate: event.target.value })}
                />
                <small className="text-xs text-slate-400">{safeDate(block.endDate)}</small>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Daily rate</label>
                <input
                  type="number"
                  min={0}
                  className={tableInputClass}
                  value={block.dailyRate}
                  onChange={(event) => onBlockChange(block.id, { dailyRate: Number(event.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Days</label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
                  {block.days}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
              <span>Total</span>
              <span>
                {currencySymbol}
                {block.lineTotal.toFixed(2)}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <button type="button" className="text-brand hover:text-indigo-600" onClick={() => onDuplicate(block.id)}>
                Duplicate
              </button>
              <button type="button" className="text-rose-500 hover:text-rose-600" onClick={() => onRemove(block.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
