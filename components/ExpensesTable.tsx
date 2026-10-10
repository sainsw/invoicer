'use client';

import { CSSProperties, useId, useRef, useState } from 'react';
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
import { ReorderCallout } from '@/components/ReorderCallout';
import { useFitsWidth } from '@/hooks/useFitsWidth';
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
  // Measured layout (see useFitsWidth); null before the first measurement.
  fitsTable: boolean | null;
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
  'w-full rounded-md border border-edge bg-field px-3.5 py-2.5 text-[15px] text-ink transition hover:border-ink-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-ink-3';

const dragHandleClass =
  'inline-flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded text-ink-3 transition hover:bg-well hover:text-ink active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

// Desktop cells are narrow, so trim the horizontal padding (date inputs need ~118px at px-2.5).
const desktopInputClass = tableInputClass.replace('px-3.5', 'px-2.5');

// Desktop grid: date, notes, value, options/drag handle. 400px of columns + 3 gaps of 6px + px-2 → 434px.
const cardLabelClass = 'block text-sm font-medium text-ink';

const desktopGridClass =
  'grid grid-cols-[124px_minmax(140px,1fr)_104px_32px] items-start gap-x-1.5';
// Same 16px-left / 8px-right row padding as WorkBlocksTable.
const desktopMinWidthClass = 'min-w-[442px]';
// Same breakpoint as WorkBlocksTable so both lists switch layout together.
// The table hangs out into the section margins (see tableBleedClass), so it needs 34px less room
// than its own 796px width.
const TABLE_MIN_CONTAINER = 762;
const tableViewClass = 'hidden [@container(min-width:762px)]:block';
const cardViewClass = 'space-y-4 [@container(min-width:762px)]:hidden';
// Pull the table 17px out on both sides (border + 16px row padding on the left) so the first field lines
// up with the fields above and the table sits centred on the sheet; the padding inside stays the same.
const tableBleedClass = '-mx-[17px]';
// The container query handles the first paint; once the width is measured that decides instead.
const tableVisibility = (fits: boolean | null) => (fits === null ? tableViewClass : fits ? 'block' : 'hidden');
const cardVisibility = (fits: boolean | null) => (fits === null ? cardViewClass : fits ? 'hidden' : 'space-y-4');

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
      className={`${desktopGridClass} ${desktopMinWidthClass} py-3 pl-4 pr-2 ${isLast ? '' : 'border-b border-rule'}`}
    >
      <div role="cell" className="text-ink-2">
        <input
          type="date"
          className={desktopInputClass}
          value={expense.date}
          onChange={(event) => onExpenseChange(expense.id, { date: event.target.value })}
        />
      </div>
      <div role="cell" className="min-w-0">
        <input
          type="text"
          className={desktopInputClass}
          value={expense.notes}
          onChange={(event) => onExpenseChange(expense.id, { notes: event.target.value })}
          placeholder="e.g. Train fare to the client"
        />
      </div>
      <div role="cell">
        <input
          type="number"
          min={0}
          className={`${desktopInputClass} text-right`}
          value={expense.value}
          onChange={(event) => onExpenseChange(expense.id, { value: Number(event.target.value) || 0 })}
        />
      </div>
      <div role="cell" className="relative flex items-start justify-center pt-1.5">
        <button
          ref={toggleRef}
          type="button"
          className={dragHandleClass}
          aria-label="Options for this expense: remove or move it. You can also drag it."
          title="Click for options, or drag to move"
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
            onRemove={() => { onRemove(expense.id); setOpenMenuId(null); }}
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
  const fieldId = useId();

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
      className="space-y-4 rounded-md border border-rule bg-sheet p-3 transition-colors sm:p-4"
    >
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            ref={toggleRef}
            type="button"
            className={dragHandleClass}
            aria-label="Drag to move, or click for options"
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
        <span className="mr-auto whitespace-nowrap pl-1 text-sm font-semibold text-ink">Expense {index + 1}</span>
        <button
          type="button"
          className="inline-flex items-center rounded bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger transition hover:bg-danger-soft"
          onClick={() => onRemove(expense.id)}
        >
          Remove
        </button>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${fieldId}-notes`} className={cardLabelClass}>What it was for</label>
        <input
          id={`${fieldId}-notes`}
          type="text"
          className={tableInputClass}
          value={expense.notes}
          onChange={(event) => onExpenseChange(expense.id, { notes: event.target.value })}
          placeholder="e.g. Train fare to the client"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={`${fieldId}-date`} className={cardLabelClass}>Date</label>
          <input
            id={`${fieldId}-date`}
            type="date"
            className={tableInputClass}
            value={expense.date}
            onChange={(event) => onExpenseChange(expense.id, { date: event.target.value })}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={`${fieldId}-value`} className={cardLabelClass}>Amount ({currencySymbol})</label>
          <input
            id={`${fieldId}-value`}
            type="number"
            min={0}
            className={tableInputClass}
            value={expense.value}
            onChange={(event) => onExpenseChange(expense.id, { value: Number(event.target.value) || 0 })}
          />
        </div>
      </div>
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
  fitsTable,
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
  const headerCellClass = 'py-3 text-left';
  const dndId = useId();

  return (
    // No overflow clipping: the grid always fits (see tableViewClass), and the row menu must be able to
    // extend past the table's bottom edge. Header and body round their own corners instead.
    <div className={`${tableVisibility(fitsTable)} ${tableBleedClass} rounded-md border border-rule bg-sheet transition-colors`}>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenterExcludingActive}
        onDragStart={() => setOpenMenuId(null)}
        onDragEnd={buildDragEndHandler(expenses, onReorder)}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div role="table" className="text-sm">
            <div
              role="row"
              className={`${desktopGridClass} ${desktopMinWidthClass} rounded-t-md border-b border-rule bg-well pl-4 pr-2 text-[13px] font-semibold text-ink-2`}
            >
              <div role="columnheader" className={headerCellClass}>
                Date
              </div>
              <div role="columnheader" className={headerCellClass}>
                What it was for
              </div>
              <div role="columnheader" className="py-3 text-right">
                Amount
              </div>
              <div role="columnheader" className="py-3" aria-label="Row options" />
            </div>
            <div role="rowgroup" className="rounded-b-md bg-sheet">
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
  fitsTable,
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

  const dndId = useId();

  return (
    <div className={cardVisibility(fitsTable)}>
      <DndContext
        id={dndId}
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
  const [containerRef, fitsTable] = useFitsWidth<HTMLDivElement>(TABLE_MIN_CONTAINER);

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
    fitsTable,
  };

  return (
    <div ref={containerRef} className="space-y-4 [container-type:inline-size]">
      <DesktopView {...viewProps} />
      <MobileView {...viewProps} />
    </div>
  );
};
