import { CollisionDetection, closestCenter } from '@dnd-kit/core';

/**
 * `closestCenter` includes the active draggable as a collision candidate,
 * and during a drag the active element's transformed rect tracks the cursor —
 * so it always resolves to itself and `over` never advances to another item.
 *
 * This wrapper excludes the active id from the candidate list so the cursor
 * can resolve onto a sibling row, which is what we need for vertical reorder.
 */
export const closestCenterExcludingActive: CollisionDetection = (args) => {
  const collisions = closestCenter(args);
  if (!args.active) return collisions;
  return collisions.filter((c) => c.id !== args.active.id);
};
