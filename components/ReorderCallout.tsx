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
  'flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-ink transition hover:bg-well focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

const dangerItemClass = itemClass
  .replace('text-ink', 'text-danger')
  .replace('hover:bg-well', 'hover:bg-danger-soft');

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
      aria-label="Options"
      className={`absolute z-30 flex w-40 flex-col gap-1 rounded-md border border-rule bg-sheet p-1.5 ring-1 ring-ink/5 ${placementClass[placement]}`}
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
        <div role="separator" className="my-0.5 h-px bg-well" />
      )}
      {onDuplicate && (
        <button type="button" role="menuitem" onClick={onDuplicate} className={itemClass}>
          <span aria-hidden>⧉</span>
          Copy
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
