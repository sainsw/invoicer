'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Measures an element and reports whether it is at least `minWidth` wide. `null` until the first
 * measurement, so callers can fall back to CSS (e.g. a container query) for the server render.
 * Container queries alone proved unreliable in some browsers, so the measured value wins once known.
 * Returns a callback ref, so measuring starts whenever the element mounts (even after first render).
 */
export const useFitsWidth = <T extends HTMLElement>(minWidth: number) => {
  const [node, setNode] = useState<T | null>(null);
  const [fits, setFits] = useState<boolean | null>(null);

  useEffect(() => {
    if (!node || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setFits(entry.contentRect.width >= minWidth);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, minWidth]);

  // Measure straight away when the element attaches, then keep watching for resizes.
  const ref = useCallback(
    (element: T | null) => {
      setNode(element);
      if (element) {
        setFits(element.getBoundingClientRect().width >= minWidth);
      }
    },
    [minWidth]
  );

  return [ref, fits] as const;
};
