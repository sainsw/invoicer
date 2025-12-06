"use client";

import { useEffect, useState } from 'react';

interface PrideAvatarProps {
  children: React.ReactNode;
  className?: string;
}

export function PrideAvatar({ children, className = '' }: PrideAvatarProps) {
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
        className={`rounded-full ring-2 ring-slate-900/80 shadow-soft dark:ring-white/80 dark:shadow-black/30 ${className}`}
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
          boxShadow: `
            0 0 0 3px rgb(239 68 68),
            0 0 0 6px rgb(249 115 22),
            0 0 0 9px rgb(250 204 21),
            0 0 0 12px rgb(34 197 94),
            0 0 0 15px rgb(59 130 246),
            0 0 0 18px rgb(147 51 234)
          `,
        }}
      >
        {children}
      </div>
    </div>
  );
}
