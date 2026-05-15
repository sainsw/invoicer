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
import type { ComputedWorkBlock, WorkBlock } from '@sainsw/invoice-pdf';

type Props = {
  blocks: ComputedWorkBlock[];
  currencySymbol: string;
  onBlockChange: (id: string, patch: Partial<WorkBlock>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
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
const descriptionInputClass = `${tableInputClass} min-w-0`;
const rateInputClass = `${tableInputClass} text-right`;

const dragHandleClass =
  'inline-flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100';

// Desktop grid: drag handle is now the LAST column, after the actions stack.
const desktopGridClass =
  'grid grid-cols-[minmax(220px,1fr)_140px_140px_60px_130px_130px_110px_110px_40px] items-start gap-x-2';
// 9 columns total 1080px; 8 gaps of gap-x-2 (8px) add 64px → 1200px is the row's intrinsic min size.
const desktopMinWidthClass = 'min-w-[1200px]';

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
      className={`${desktopGridClass} ${desktopMinWidthClass} px-2 py-3 ${isLast ? '' : 'border-b border-slate-100 dark:border-slate-800'}`}
    >
      <div role="cell" className="px-3 min-w-0">
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
      </div>
      <div role="cell" className="px-3 text-slate-600 dark:text-slate-300">
        <input
          type="date"
          className={tableInputClass}
          value={block.startDate}
          onChange={(event) => onBlockChange(block.id, { startDate: event.target.value })}
        />
        <small className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{safeDate(block.startDate)}</small>
      </div>
      <div role="cell" className="px-3 text-slate-600 dark:text-slate-300">
        <input
          type="date"
          className={tableInputClass}
          value={block.endDate}
          onChange={(event) => onBlockChange(block.id, { endDate: event.target.value })}
        />
        <small className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{safeDate(block.endDate)}</small>
      </div>
      <div role="cell" className="px-3 pt-3 font-semibold text-slate-900 dark:text-white">
        {block.days}
      </div>
      <div role="cell" className="px-3">
        <input
          type="number"
          min={0}
          className={rateInputClass}
          value={block.dailyRate}
          onChange={(event) => onBlockChange(block.id, { dailyRate: Number(event.target.value) || 0 })}
        />
      </div>
      <div role="cell" className="px-3">
        <input
          type="number"
          min={0}
          className={rateInputClass}
          value={block.blockTotal}
          onChange={(event) => onBlockChange(block.id, { blockTotal: Number(event.target.value) || 0 })}
        />
      </div>
      <div role="cell" className="px-3 pt-3 font-semibold text-slate-900 dark:text-white">
        {currencySymbol}
        {block.lineTotal.toFixed(2)}
      </div>
      <div role="cell" className="px-3">
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
      </div>
      <div role="cell" className="relative flex items-start justify-center pt-1.5">
        <button
          ref={toggleRef}
          type="button"
          className={dragHandleClass}
          aria-label="Drag to reorder, or click for move options"
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
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Drag · tap for options
        </span>
      </div>
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
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Block total</label>
          <input
            type="number"
            min={0}
            className={tableInputClass}
            value={block.blockTotal}
            disabled={block.billingMode === 'daily'}
            onChange={(event) => onBlockChange(block.id, { blockTotal: Number(event.target.value) || 0 })}
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
}: ViewProps) => {
  const sensors = useDragSensors();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { arm, registerRef } = useReorderAnimation();
  const ids = blocks.map((block) => block.id);
  const headerCellClass = 'px-3 py-3 text-left';

  const armedMoveUp = (id: string) => {
    arm();
    onMoveUp(id);
  };
  const armedMoveDown = (id: string) => {
    arm();
    onMoveDown(id);
  };

  return (
    <div className="hidden overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-md shadow-slate-900/5 transition-colors md:block dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenterExcludingActive}
        onDragStart={() => setOpenMenuId(null)}
        onDragEnd={buildDragEndHandler(blocks, onReorder)}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div role="table" className="text-sm">
            <div
              role="row"
              className={`${desktopGridClass} ${desktopMinWidthClass} bg-slate-50 px-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300`}
            >
              <div role="columnheader" className={headerCellClass}>
                Description
              </div>
              <div role="columnheader" className={headerCellClass}>
                Start
              </div>
              <div role="columnheader" className={headerCellClass}>
                End
              </div>
              <div role="columnheader" className={headerCellClass}>
                Days
              </div>
              <div role="columnheader" className={headerCellClass}>
                Daily rate
              </div>
              <div role="columnheader" className={headerCellClass}>
                Block total
              </div>
              <div role="columnheader" className={headerCellClass}>
                Total
              </div>
              <div role="columnheader" className="px-3 py-3" aria-label="Actions" />
              <div role="columnheader" className="px-3 py-3" aria-label="Reorder" />
            </div>
            <div role="rowgroup" className="bg-white dark:bg-slate-950">
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
}: ViewProps) => {
  const sensors = useDragSensors();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { arm, registerRef } = useReorderAnimation();
  const ids = blocks.map((block) => block.id);

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
  };

  return (
    <div className="space-y-4">
      <DesktopView {...viewProps} />
      <MobileView {...viewProps} />
    </div>
  );
};
