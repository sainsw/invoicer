"use client";

import { useEffect, useState } from 'react';

interface PrideAvatarProps {
  children: React.ReactNode;
  className?: string;
  // Width in px of each pride ring; smaller avatars want thinner rings.
  ringStep?: number;
}

const PRIDE_COLOURS = [
  'rgb(239 68 68)',
  'rgb(249 115 22)',
  'rgb(250 204 21)',
  'rgb(34 197 94)',
  'rgb(59 130 246)',
  'rgb(147 51 234)',
];

export function PrideAvatar({ children, className = '', ringStep = 3 }: PrideAvatarProps) {
  const [isPrideTime, setIsPrideTime] = useState(false);

  useEffect(() => {
    const checkPrideTime = () => {
      const now = new Date();
      const month = now.getMonth() + 1;
      const date = now.getDate();

      if (month === 6) {
        setIsPrideTime(true);
        return;
      }

      if (month === 8) {
        const year = now.getFullYear();
        const lastDayOfMonth = new Date(year, 8, 0).getDate();
        let lastMonday = lastDayOfMonth;
        const lastDayWeekday = new Date(year, 7, lastDayOfMonth).getDay();

        if (lastDayWeekday === 1) {
          lastMonday = lastDayOfMonth;
        } else {
          lastMonday = lastDayOfMonth - ((lastDayWeekday + 6) % 7);
        }

        const prideWeekStart = lastMonday - 7;
        const prideWeekEnd = lastMonday;
        const adjustedStart = Math.max(1, prideWeekStart);

        if (date >= adjustedStart && date <= prideWeekEnd) {
          setIsPrideTime(true);
          return;
        }
      }

      setIsPrideTime(false);
    };

    checkPrideTime();
    const interval = setInterval(checkPrideTime, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isPrideTime) {
    return (
      <div
        className={`rounded-full ${ringStep < 3 ? 'ring-1 ring-slate-900/15 dark:ring-white/20' : 'ring-2 ring-slate-900/80 shadow-soft dark:ring-white/80 dark:shadow-black/30'} ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className="rounded-full"
        style={{
          boxShadow: PRIDE_COLOURS.map((colour, i) => `0 0 0 ${(i + 1) * ringStep}px ${colour}`).join(', '),
        }}
      >
        {children}
      </div>
    </div>
  );
}
