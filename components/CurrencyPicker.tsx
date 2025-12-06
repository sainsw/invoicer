'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const currencyOptions = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CAD', symbol: 'CA$' },
  { code: 'CHF', symbol: 'CHF' },
  { code: 'INR', symbol: '₹' },
];

interface CurrencyPickerProps {
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
}

export function CurrencyPicker({ selectedSymbol, onSelect }: CurrencyPickerProps) {
  const selectedIndex = currencyOptions.findIndex((option) => option.symbol === selectedSymbol);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ width: number; left: number }>({ width: 0, left: 0 });
  const [edgeShadows, setEdgeShadows] = useState<{ left: boolean; right: boolean }>({ left: false, right: false });

  const scrollSelectedIntoView = useCallback(() => {
    const button = buttonRefs.current[selectedIndex];
    button?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedIndex]);

  const recalcIndicator = useCallback(() => {
    if (selectedIndex < 0) {
      setIndicator({ width: 0, left: 0 });
      return;
    }
    const button = buttonRefs.current[selectedIndex];
    if (!button) {
      return;
    }
    setIndicator({
      width: button.offsetWidth,
      left: button.offsetLeft,
    });
  }, [selectedIndex]);

  const recalcEdges = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth - 1);
    setEdgeShadows({
      left: scrollLeft > 1,
      right: scrollLeft < maxScroll,
    });
  }, []);

  useLayoutEffect(() => {
    recalcIndicator();
    recalcEdges();
    scrollSelectedIntoView();
  }, [selectedIndex, selectedSymbol, recalcEdges, recalcIndicator, scrollSelectedIntoView]);

  useEffect(() => {
    window.addEventListener('resize', recalcIndicator);
    return () => window.removeEventListener('resize', recalcIndicator);
  }, [recalcIndicator]);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const handler = () => {
      recalcEdges();
      recalcIndicator();
    };
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, [recalcEdges, recalcIndicator]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 rounded-l-2xl bg-gradient-to-r from-white via-white to-transparent opacity-0 shadow-[inset_16px_0_18px_-12px_rgba(15,23,42,0.25)] transition-opacity duration-300 ease-out dark:from-slate-950 dark:via-slate-950 dark:to-transparent dark:shadow-[inset_16px_0_18px_-12px_rgba(255,255,255,0.16)]"
          style={{ opacity: edgeShadows.left ? 1 : 0 }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 rounded-r-2xl bg-gradient-to-l from-white via-white to-transparent opacity-0 shadow-[inset_-16px_0_18px_-12px_rgba(15,23,42,0.25)] transition-opacity duration-300 ease-out dark:from-slate-950 dark:via-slate-950 dark:to-transparent dark:shadow-[inset_-16px_0_18px_-12px_rgba(255,255,255,0.16)]"
          style={{ opacity: edgeShadows.right ? 1 : 0 }}
        />
        <div
          ref={scrollAreaRef}
          className="relative overflow-x-auto overflow-y-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/15 dark:bg-black/30 dark:shadow-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div ref={containerRef} className="relative min-w-max">
            <div
              className="absolute inset-y-0 rounded-2xl bg-slate-900/5 transition-all duration-200 dark:bg-white/20"
              style={{
                width: indicator.width,
                left: indicator.left,
                opacity: selectedIndex >= 0 ? 1 : 0,
              }}
            />
            <div
              className="grid text-center text-sm font-semibold text-slate-600 dark:text-white"
              style={{ gridTemplateColumns: `repeat(${currencyOptions.length}, minmax(64px, 1fr))` }}
            >
              {currencyOptions.map((option, index) => {
                const isActive = index === selectedIndex;
                return (
                  <button
                    type="button"
                    key={option.code}
                    className={`relative z-10 min-w-[64px] px-2 py-3 transition ${
                      isActive
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white'
                    }`}
                    onClick={() => {
                      onSelect(option.symbol);
                      scrollSelectedIntoView();
                    }}
                    ref={(element) => {
                      buttonRefs.current[index] = element;
                    }}
                  >
                    <span aria-hidden="true" className="text-xl">
                      {option.symbol}
                    </span>
                    <span className="sr-only">{option.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Tap a popular currency symbol or type a custom one below.
      </p>
    </div>
  );
}
