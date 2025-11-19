'use client';

import { useCallback, useEffect, useState } from 'react';

export const usePersistentState = <T,>(key: string, initializer: () => T) => {
  const [value, setValue] = useState<T>(initializer);
  const [ready, setReady] = useState(false);
  const [hasStoredValue, setHasStoredValue] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        setValue(JSON.parse(stored));
        setHasStoredValue(true);
      } else {
        setHasStoredValue(false);
      }
    } catch (error) {
      console.warn('Unable to parse stored state', error);
    } finally {
      setReady(true);
    }
  }, [key]);

  useEffect(() => {
    if (!ready || typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, ready, value]);

  const reset = useCallback(() => {
    const next = initializer();
    setValue(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(next));
    }
  }, [initializer, key]);

  return {
    value,
    setValue,
    ready,
    reset,
    hasStoredValue,
  } as const;
};
