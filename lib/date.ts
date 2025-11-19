const monthFormatter = new Intl.DateTimeFormat('en', {
  month: 'long',
  year: 'numeric',
});

const humanFormatter = new Intl.DateTimeFormat('en', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export const formatISODate = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const parseISODate = (value: string): Date => new Date(`${value}T00:00:00`);

export const addDays = (value: string | Date, days: number): string => {
  const date = typeof value === 'string' ? parseISODate(value) : new Date(value);
  date.setDate(date.getDate() + days);
  return formatISODate(date);
};

export const formatHumanDate = (value: string): string => humanFormatter.format(parseISODate(value));

export const monthKey = (date: Date) => {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    key,
    label: monthFormatter.format(date),
    startOfMonth: formatISODate(start),
    endOfMonth: formatISODate(end),
  };
};

export const parseMonthKey = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  return monthKey(new Date(year, month - 1, 1));
};

export const listRecentMonths = (count = 12) => {
  const months = [] as ReturnType<typeof monthKey>[];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return months;
};

export const countWeekdaysInclusive = (start: string, end: string): number => {
  const startDate = parseISODate(start);
  const endDate = parseISODate(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    return 0;
  }

  let days = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      days += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

export const isValidDateRange = (start: string, end: string) => {
  const startDate = parseISODate(start);
  const endDate = parseISODate(end);
  return !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && startDate <= endDate;
};
