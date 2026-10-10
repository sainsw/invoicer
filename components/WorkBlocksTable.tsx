'use client';

import { CSSProperties, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
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
import { formatMoney } from '@/lib/format';
import { useFitsWidth } from '@/hooks/useFitsWidth';
import { useReorderAnimation } from '@/hooks/useReorderAnimation';
import type { ComputedWorkBlock, WorkBlock } from '@sainsw/invoice-pdf';

type Props = {
  blocks: ComputedWorkBlock[];
  currencySymbol: string;
  onBlockChange: (id: string, patch: Partial<WorkBlock>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  /** A second "add" button for the bottom of long lists; shown only once the list is long enough. */
  bottomAction?: ReactNode;
};

// When the repeat "add" button appears below the list. Cards are tall, so it helps from the second
// one; table rows are short, so it only earns its place once the list runs well down the page.
const BOTTOM_ACTION_AFTER = { cards: 1, table: 8 };

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
// Desktop cells are narrow, so trim the horizontal padding (date inputs need ~118px at px-2.5).
const desktopInputClass = tableInputClass.replace('px-3.5', 'px-2.5');
const descriptionInputClass = `${desktopInputClass} min-w-0`;
const rateInputClass = `${desktopInputClass} text-right`;

const cardLabelClass = 'block text-sm font-medium text-ink';

const dragHandleClass =
  'inline-flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded text-ink-3 transition hover:bg-well hover:text-ink active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

// Desktop grid: description, start, end, days, daily rate, block total, line total, options/drag handle.
// Columns total 728px (description min 116 + dates 2 × 132) + 7 gaps of 6px = 770px, plus row padding (16px left so
// the first field isn't cramped against the border, 8px right beside the handle) → 794px rows, 796px with the
// table border. The table only shows once there's room for that (see TABLE_MIN_CONTAINER below);
// narrower containers get the card layout, so the table never needs to scroll sideways.
const desktopGridClass =
  'grid grid-cols-[minmax(116px,1fr)_132px_132px_40px_88px_96px_92px_32px] items-start gap-x-1.5';
const desktopMinWidthClass = 'min-w-[794px]';
// Keep in sync with ExpensesTable so both lists switch layout together.
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
  block,
  currencySymbol,
  onBlockChange,
  onRemove,
  onDuplicate,
  isLast,
  index,
  total,
  openMenuId,
  setOpenMenuId,
  onMoveUp,
  onMoveDown,
  flipRef,
}: {
  block: ComputedWorkBlock;
  currencySymbol: string;
  onBlockChange: Props['onBlockChange'];
  onRemove: Props['onRemove'];
  onDuplicate: Props['onDuplicate'];
  isLast: boolean;
} & RowExtras) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const toggleRef = useRef<HTMLButtonElement>(null);
  const isOpen = openMenuId === block.id;

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
      <div role="cell" className="min-w-0">
        <input
          type="text"
          className={descriptionInputClass}
          value={block.description}
          onChange={(event) => onBlockChange(block.id, { description: event.target.value })}
          placeholder="What was the work?"
        />
        {block.hasError && (
          <p className="mt-1 text-[13px] font-medium text-danger">
            The end date can’t be before the start date.
          </p>
        )}
      </div>
      <div role="cell" className="text-ink-2">
        <input
          type="date"
          className={desktopInputClass}
          value={block.startDate}
          onChange={(event) => onBlockChange(block.id, { startDate: event.target.value })}
        />
      </div>
      <div role="cell" className="text-ink-2">
        <input
          type="date"
          className={desktopInputClass}
          value={block.endDate}
          onChange={(event) => onBlockChange(block.id, { endDate: event.target.value })}
        />
      </div>
      <div role="cell" className="pt-2.5 text-center font-mono text-sm font-medium tabular-nums text-ink">
        {block.days}
      </div>
      <div role="cell">
        <input
          type="number"
          min={0}
          className={rateInputClass}
          value={block.dailyRate}
          onChange={(event) => onBlockChange(block.id, { dailyRate: Number(event.target.value) || 0 })}
        />
      </div>
      <div role="cell">
        <input
          type="number"
          min={0}
          className={rateInputClass}
          value={block.blockTotal}
          onChange={(event) => onBlockChange(block.id, { blockTotal: Number(event.target.value) || 0 })}
        />
      </div>
      <div role="cell" className="pt-2.5 text-right font-mono text-sm font-medium tabular-nums text-ink">
        {formatMoney(currencySymbol, block.lineTotal)}
      </div>
      <div role="cell" className="relative flex items-start justify-center pt-1.5">
        <button
          ref={toggleRef}
          type="button"
          className={dragHandleClass}
          aria-label="Options for this work: copy, remove or move it. You can also drag it."
          title="Click for options, or drag to move"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setOpenMenuId(isOpen ? null : block.id)}
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </button>
        {isOpen && (
          <ReorderCallout
            canMoveUp={index > 0}
            canMoveDown={index < total - 1}
            onMoveUp={() => { onMoveUp(block.id); setOpenMenuId(null); }}
            onMoveDown={() => { onMoveDown(block.id); setOpenMenuId(null); }}
            onDuplicate={() => { onDuplicate(block.id); setOpenMenuId(null); }}
            onRemove={() => { onRemove(block.id); setOpenMenuId(null); }}
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
  block,
  currencySymbol,
  onBlockChange,
  onRemove,
  onDuplicate,
  index,
  total,
  openMenuId,
  setOpenMenuId,
  onMoveUp,
  onMoveDown,
  flipRef,
}: {
  block: ComputedWorkBlock;
  currencySymbol: string;
  onBlockChange: Props['onBlockChange'];
  onRemove: Props['onRemove'];
  onDuplicate: Props['onDuplicate'];
} & RowExtras) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const toggleRef = useRef<HTMLButtonElement>(null);
  const isOpen = openMenuId === block.id;
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
            onClick={() => setOpenMenuId(isOpen ? null : block.id)}
            {...attributes}
            {...listeners}
          >
            <GripIcon />
          </button>
          {isOpen && (
            <ReorderCallout
              canMoveUp={index > 0}
              canMoveDown={index < total - 1}
              onMoveUp={() => { onMoveUp(block.id); setOpenMenuId(null); }}
              onMoveDown={() => { onMoveDown(block.id); setOpenMenuId(null); }}
              onClose={() => setOpenMenuId(null)}
              toggleRef={toggleRef}
              placement="mobile"
            />
          )}
        </div>
        <span className="mr-auto whitespace-nowrap pl-1 text-sm font-semibold text-ink">Work {index + 1}</span>
        <div className="flex gap-1.5 text-xs font-semibold">
          <button
            type="button"
            className="inline-flex items-center rounded bg-well px-2.5 py-1 text-ink ring-1 ring-rule transition hover:ring-rule-strong"
            onClick={() => onDuplicate(block.id)}
          >
            Copy
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded bg-danger-soft px-2.5 py-1 text-danger transition hover:ring-1 hover:ring-danger/40"
            onClick={() => onRemove(block.id)}
          >
            Remove
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${fieldId}-description`} className={cardLabelClass}>What you did</label>
        <input
          id={`${fieldId}-description`}
          type="text"
          className={tableInputClass}
          value={block.description}
          onChange={(event) => onBlockChange(block.id, { description: event.target.value })}
          placeholder="What was the work?"
        />
        {block.hasError && (
          <p className="text-[13px] font-medium text-danger">The end date can’t be before the start date.</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`${fieldId}-start`} className={cardLabelClass}>From</label>
          <input
            id={`${fieldId}-start`}
            type="date"
            className={tableInputClass}
            value={block.startDate}
            onChange={(event) => onBlockChange(block.id, { startDate: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${fieldId}-end`} className={cardLabelClass}>To</label>
          <input
            id={`${fieldId}-end`}
            type="date"
            className={tableInputClass}
            value={block.endDate}
            onChange={(event) => onBlockChange(block.id, { endDate: event.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor={`${fieldId}-rate`} className={cardLabelClass}>Day rate</label>
          <input
            id={`${fieldId}-rate`}
            type="number"
            min={0}
            className={tableInputClass}
            value={block.dailyRate}
            onChange={(event) => onBlockChange(block.id, { dailyRate: Number(event.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${fieldId}-total`} className={cardLabelClass}>Or a fixed price</label>
          <input
            id={`${fieldId}-total`}
            type="number"
            min={0}
            className={tableInputClass}
            value={block.blockTotal}
            onChange={(event) => onBlockChange(block.id, { blockTotal: Number(event.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded bg-well px-4 py-3 font-mono text-sm font-medium text-ink">
        <span className="tabular-nums">
          {block.days} {block.days === 1 ? 'working day' : 'working days'}
        </span>
        <span className="tabular-nums">{formatMoney(currencySymbol, block.lineTotal)}</span>
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
  (blocks: ComputedWorkBlock[], onReorder: Props['onReorder']) =>
  (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    const next = arrayMove(blocks, oldIndex, newIndex);
    onReorder(next.map((block) => block.id));
  };

const DesktopView = ({
  blocks,
  currencySymbol,
  onBlockChange,
  onRemove,
  onDuplicate,
  onReorder,
  onMoveUp,
  onMoveDown,
  fitsTable,
}: ViewProps) => {
  const sensors = useDragSensors();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { arm, registerRef } = useReorderAnimation();
  const ids = blocks.map((block) => block.id);
  const dndId = useId();
  const headerCellClass = 'py-3 text-left';
  const numericHeaderCellClass = 'py-3 text-right';

  const armedMoveUp = (id: string) => {
    arm();
    onMoveUp(id);
  };
  const armedMoveDown = (id: string) => {
    arm();
    onMoveDown(id);
  };

  return (
    // No overflow clipping: the grid always fits (see tableViewClass), and the row menu must be able to
    // extend past the table's bottom edge. Header and body round their own corners instead.
    <div className={`${tableVisibility(fitsTable)} ${tableBleedClass} rounded-md border border-rule bg-sheet transition-colors`}>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenterExcludingActive}
        onDragStart={() => setOpenMenuId(null)}
        onDragEnd={buildDragEndHandler(blocks, onReorder)}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div role="table" className="text-sm">
            <div
              role="row"
              className={`${desktopGridClass} ${desktopMinWidthClass} rounded-t-md border-b border-rule bg-well pl-4 pr-2 text-[13px] font-semibold text-ink-2`}
            >
              <div role="columnheader" className={headerCellClass}>
                What you did
              </div>
              <div role="columnheader" className={headerCellClass}>
                From
              </div>
              <div role="columnheader" className={headerCellClass}>
                To
              </div>
              <div role="columnheader" className="py-3 text-center">
                Days
              </div>
              <div role="columnheader" className={numericHeaderCellClass}>
                Day rate
              </div>
              <div role="columnheader" className={numericHeaderCellClass}>
                Fixed price
              </div>
              <div role="columnheader" className={numericHeaderCellClass}>
                Amount
              </div>
              <div role="columnheader" className="py-3" aria-label="Row options" />
            </div>
            <div role="rowgroup" className="rounded-b-md bg-sheet">
              {blocks.map((block, index) => (
                <SortableDesktopRow
                  key={block.id}
                  block={block}
                  currencySymbol={currencySymbol}
                  onBlockChange={onBlockChange}
                  onRemove={onRemove}
                  onDuplicate={onDuplicate}
                  isLast={index === blocks.length - 1}
                  index={index}
                  total={blocks.length}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  onMoveUp={armedMoveUp}
                  onMoveDown={armedMoveDown}
                  flipRef={registerRef(block.id)}
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
  blocks,
  currencySymbol,
  onBlockChange,
  onRemove,
  onDuplicate,
  onReorder,
  onMoveUp,
  onMoveDown,
  fitsTable,
}: ViewProps) => {
  const sensors = useDragSensors();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { arm, registerRef } = useReorderAnimation();
  const ids = blocks.map((block) => block.id);
  const dndId = useId();

  const armedMoveUp = (id: string) => {
    arm();
    onMoveUp(id);
  };
  const armedMoveDown = (id: string) => {
    arm();
    onMoveDown(id);
  };

  return (
    <div className={cardVisibility(fitsTable)}>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenterExcludingActive}
        onDragStart={() => setOpenMenuId(null)}
        onDragEnd={buildDragEndHandler(blocks, onReorder)}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {blocks.map((block, index) => (
            <SortableCard
              key={block.id}
              block={block}
              currencySymbol={currencySymbol}
              onBlockChange={onBlockChange}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
              index={index}
              total={blocks.length}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              onMoveUp={armedMoveUp}
              onMoveDown={armedMoveDown}
              flipRef={registerRef(block.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export const WorkBlocksTable = (props: Props) => {
  const [containerRef, fitsTable] = useFitsWidth<HTMLDivElement>(TABLE_MIN_CONTAINER);
  const moveBy = (id: string, delta: number) => {
    const idx = props.blocks.findIndex((block) => block.id === id);
    if (idx < 0) return;
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= props.blocks.length) return;
    const next = arrayMove(props.blocks, idx, newIdx);
    props.onReorder(next.map((block) => block.id));
  };

  const viewProps: ViewProps = {
    ...props,
    onMoveUp: (id) => moveBy(id, -1),
    onMoveDown: (id) => moveBy(id, 1),
    fitsTable,
  };

  // Before the first measurement the layout is unknown, so hold the button back rather than flash it.
  const bottomActionAfter = fitsTable === null ? Infinity : BOTTOM_ACTION_AFTER[fitsTable ? 'table' : 'cards'];
  const showBottomAction = Boolean(props.bottomAction) && props.blocks.length > bottomActionAfter;

  return (
    <div ref={containerRef} className="space-y-4 [container-type:inline-size]">
      <DesktopView {...viewProps} />
      <MobileView {...viewProps} />
      {showBottomAction && <div className="flex justify-center">{props.bottomAction}</div>}
    </div>
  );
};
