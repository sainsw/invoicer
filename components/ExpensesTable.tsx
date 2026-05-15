'use client';

import { CSSProperties, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { closestCenterExcludingActive } from '@/lib/dnd';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatHumanDate } from '@sainsw/invoice-pdf';
import { ReorderCallout } from '@/components/ReorderCallout';
import { useReorderAnimation } from '@/hooks/useReorderAnimation';
import type { Expense } from '@sainsw/invoice-pdf';

type Props = {
  expenses: Expense[];
  currencySymbol: string;
  onExpenseChange: (id: string, patch: Partial<Expense>) => void;
  onRemove: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
};

type ViewProps = Props & {
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
};

type RowExtras = {
  index: number;
  total: number;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  flipRef: (el: HTMLElement | null) => void;
};

const tableInputClass =
  'w-full rounded-2xl border border-slate-200/80 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/5 transition hover:border-slate-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/20 dark:hover:border-slate-700 dark:focus:bg-slate-900';

const dragHandleClass =
  'inline-flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100';

// Desktop grid: drag handle is now the LAST column, after the actions stack.
const desktopGridClass =
  'grid grid-cols-[180px_minmax(220px,1fr)_160px_110px_40px] items-start gap-x-2';
const desktopMinWidthClass = 'min-w-[760px]';

const GripIcon = () => (
  <svg
    aria-hidden
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="4" cy="3" r="1.2" fill="currentColor" />
    <circle cx="10" cy="3" r="1.2" fill="currentColor" />
    <circle cx="4" cy="7" r="1.2" fill="currentColor" />
    <circle cx="10" cy="7" r="1.2" fill="currentColor" />
    <circle cx="4" cy="11" r="1.2" fill="currentColor" />
    <circle cx="10" cy="11" r="1.2" fill="currentColor" />
  </svg>
);

const safeDate = (value: string) => {
  try {
    return formatHumanDate(value);
  } catch {
    return '—';
  }
};

const SortableDesktopRow = ({
  expense,
  onExpenseChange,
  onRemove,
  isLast,
  index,
  total,
  openMenuId,
  setOpenMenuId,
  onMoveUp,
  onMoveDown,
  flipRef,
}: {
  expense: Expense;
  onExpenseChange: Props['onExpenseChange'];
  onRemove: Props['onRemove'];
  isLast: boolean;
} & RowExtras) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: expense.id,
  });
  const toggleRef = useRef<HTMLButtonElement>(null);
  const isOpen = openMenuId === expense.id;

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging || isOpen ? 10 : undefined,
    position: 'relative',
  };

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        flipRef(el);
      }}
      style={style}
      role="row"
      className={`${desktopGridClass} ${desktopMinWidthClass} px-2 py-3 ${isLast ? '' : 'border-b border-slate-100 dark:border-slate-800'}`}
    >
      <div role="cell" className="px-3 text-slate-600 dark:text-slate-300">
        <input
          type="date"
          className={tableInputClass}
          value={expense.date}
          onChange={(event) => onExpenseChange(expense.id, { date: event.target.value })}
        />
        <small className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{safeDate(expense.date)}</small>
      </div>
      <div role="cell" className="px-3 min-w-0">
        <input
          type="text"
          className={tableInputClass}
          value={expense.notes}
          onChange={(event) => onExpenseChange(expense.id, { notes: event.target.value })}
          placeholder="e.g. Travel to client site"
        />
      </div>
      <div role="cell" className="px-3">
        <input
          type="number"
          min={0}
          className={tableInputClass}
          value={expense.value}
          onChange={(event) => onExpenseChange(expense.id, { value: Number(event.target.value) || 0 })}
        />
      </div>
      <div role="cell" className="px-3 pt-1">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-900/50"
          onClick={() => onRemove(expense.id)}
        >
          Remove
        </button>
      </div>
      <div role="cell" className="relative flex items-start justify-center pt-1.5">
        <button
          ref={toggleRef}
          type="button"
          className={dragHandleClass}
          aria-label="Drag to reorder, or click for move options"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setOpenMenuId(isOpen ? null : expense.id)}
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </button>
        {isOpen && (
          <ReorderCallout
            canMoveUp={index > 0}
            canMoveDown={index < total - 1}
            onMoveUp={() => { onMoveUp(expense.id); setOpenMenuId(null); }}
            onMoveDown={() => { onMoveDown(expense.id); setOpenMenuId(null); }}
            onClose={() => setOpenMenuId(null)}
            toggleRef={toggleRef}
            placement="desktop"
          />
        )}
      </div>
    </div>
  );
};

const SortableCard = ({
  expense,
  currencySymbol,
  onExpenseChange,
  onRemove,
  index,
  total,
  openMenuId,
  setOpenMenuId,
  onMoveUp,
  onMoveDown,
  flipRef,
}: {
  expense: Expense;
  currencySymbol: string;
  onExpenseChange: Props['onExpenseChange'];
  onRemove: Props['onRemove'];
} & RowExtras) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: expense.id,
  });
  const toggleRef = useRef<HTMLButtonElement>(null);
  const isOpen = openMenuId === expense.id;

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging || isOpen ? 10 : undefined,
    position: 'relative',
  };

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        flipRef(el);
      }}
      style={style}
      className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-md shadow-slate-900/5 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-none"
    >
      <div className="flex items-center justify-between">
        <div className="relative">
          <button
            ref={toggleRef}
            type="button"
            className={dragHandleClass}
            aria-label="Drag to reorder, or click for move options"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            onClick={() => setOpenMenuId(isOpen ? null : expense.id)}
            {...attributes}
            {...listeners}
          >
            <GripIcon />
          </button>
          {isOpen && (
            <ReorderCallout
              canMoveUp={index > 0}
              canMoveDown={index < total - 1}
              onMoveUp={() => { onMoveUp(expense.id); setOpenMenuId(null); }}
              onMoveDown={() => { onMoveDown(expense.id); setOpenMenuId(null); }}
              onClose={() => setOpenMenuId(null)}
              toggleRef={toggleRef}
              placement="mobile"
            />
          )}
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Drag · tap for options
        </span>
      </div>
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
  );
};

const useDragSensors = () =>
  useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

const buildDragEndHandler =
  (expenses: Expense[], onReorder: Props['onReorder']) =>
  (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = expenses.findIndex((expense) => expense.id === active.id);
    const newIndex = expenses.findIndex((expense) => expense.id === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    const next = arrayMove(expenses, oldIndex, newIndex);
    onReorder(next.map((expense) => expense.id));
  };

const DesktopView = ({
  expenses,
  onExpenseChange,
  onRemove,
  onReorder,
  onMoveUp,
  onMoveDown,
}: ViewProps) => {
  const sensors = useDragSensors();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { arm, registerRef } = useReorderAnimation();
  const ids = expenses.map((expense) => expense.id);

  const armedMoveUp = (id: string) => {
    arm();
    onMoveUp(id);
  };
  const armedMoveDown = (id: string) => {
    arm();
    onMoveDown(id);
  };
  const headerCellClass = 'px-3 py-3 text-left';

  return (
    <div className="hidden overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-md shadow-slate-900/5 transition-colors md:block dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenterExcludingActive}
        onDragStart={() => setOpenMenuId(null)}
        onDragEnd={buildDragEndHandler(expenses, onReorder)}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div role="table" className="text-sm">
            <div
              role="row"
              className={`${desktopGridClass} ${desktopMinWidthClass} bg-slate-50 px-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300`}
            >
              <div role="columnheader" className={headerCellClass}>
                Date
              </div>
              <div role="columnheader" className={headerCellClass}>
                Notes
              </div>
              <div role="columnheader" className={headerCellClass}>
                Value
              </div>
              <div role="columnheader" className="px-3 py-3" aria-label="Actions" />
              <div role="columnheader" className="px-3 py-3" aria-label="Reorder" />
            </div>
            <div role="rowgroup" className="bg-white dark:bg-slate-950">
              {expenses.map((expense, index) => (
                <SortableDesktopRow
                  key={expense.id}
                  expense={expense}
                  onExpenseChange={onExpenseChange}
                  onRemove={onRemove}
                  isLast={index === expenses.length - 1}
                  index={index}
                  total={expenses.length}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  onMoveUp={armedMoveUp}
                  onMoveDown={armedMoveDown}
                  flipRef={registerRef(expense.id)}
                />
              ))}
            </div>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

const MobileView = ({
  expenses,
  currencySymbol,
  onExpenseChange,
  onRemove,
  onReorder,
  onMoveUp,
  onMoveDown,
}: ViewProps) => {
  const sensors = useDragSensors();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { arm, registerRef } = useReorderAnimation();
  const ids = expenses.map((expense) => expense.id);

  const armedMoveUp = (id: string) => {
    arm();
    onMoveUp(id);
  };
  const armedMoveDown = (id: string) => {
    arm();
    onMoveDown(id);
  };

  return (
    <div className="space-y-4 md:hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenterExcludingActive}
        onDragStart={() => setOpenMenuId(null)}
        onDragEnd={buildDragEndHandler(expenses, onReorder)}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {expenses.map((expense, index) => (
            <SortableCard
              key={expense.id}
              expense={expense}
              currencySymbol={currencySymbol}
              onExpenseChange={onExpenseChange}
              onRemove={onRemove}
              index={index}
              total={expenses.length}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              onMoveUp={armedMoveUp}
              onMoveDown={armedMoveDown}
              flipRef={registerRef(expense.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export const ExpensesTable = (props: Props) => {
  if (props.expenses.length === 0) {
    return null;
  }

  const moveBy = (id: string, delta: number) => {
    const idx = props.expenses.findIndex((expense) => expense.id === id);
    if (idx < 0) return;
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= props.expenses.length) return;
    const next = arrayMove(props.expenses, idx, newIdx);
    props.onReorder(next.map((expense) => expense.id));
  };

  const viewProps: ViewProps = {
    ...props,
    onMoveUp: (id) => moveBy(id, -1),
    onMoveDown: (id) => moveBy(id, 1),
  };

  return (
    <div className="space-y-4">
      <DesktopView {...viewProps} />
      <MobileView {...viewProps} />
    </div>
  );
};
