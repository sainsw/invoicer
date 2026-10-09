'use client';

import { RefObject, useEffect, useRef } from 'react';

type Placement = 'desktop' | 'mobile';

type Props = {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
  onClose: () => void;
  toggleRef: RefObject<HTMLElement | null>;
  placement: Placement;
};

// Desktop: handle sits at the right end of the row → open the menu just below the handle, right-aligned.
// Mobile: handle sits at the top-left of the card → open the menu just below the handle, left-aligned.
const placementClass: Record<Placement, string> = {
  desktop: 'right-0 top-full mt-2',
  mobile: 'left-0 top-full mt-2',
};

const itemClass =
  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800';

const dangerItemClass = itemClass
  .replace('text-slate-700', 'text-rose-600')
  .replace('hover:bg-slate-100', 'hover:bg-rose-50')
  .replace('dark:text-slate-200', 'dark:text-rose-300')
  .replace('dark:hover:bg-slate-800', 'dark:hover:bg-rose-950/40');

export const ReorderCallout = ({
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  onClose,
  toggleRef,
  placement,
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      if (toggleRef.current?.contains(target)) return;
      onClose();
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [onClose, toggleRef]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Row options"
      className={`absolute z-30 flex w-40 flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900 ${placementClass[placement]}`}
    >
      <button
        type="button"
        role="menuitem"
        disabled={!canMoveUp}
        onClick={onMoveUp}
        className={itemClass}
      >
        <span aria-hidden>↑</span>
        Move up
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={!canMoveDown}
        onClick={onMoveDown}
        className={itemClass}
      >
        <span aria-hidden>↓</span>
        Move down
      </button>
      {(onDuplicate || onRemove) && (
        <div role="separator" className="my-0.5 h-px bg-slate-100 dark:bg-slate-800" />
      )}
      {onDuplicate && (
        <button type="button" role="menuitem" onClick={onDuplicate} className={itemClass}>
          <span aria-hidden>⧉</span>
          Duplicate
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          role="menuitem"
          onClick={onRemove}
          className={dangerItemClass}
        >
          <span aria-hidden>✕</span>
          Remove
        </button>
      )}
    </div>
  );
};
