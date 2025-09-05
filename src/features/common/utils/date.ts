// Utilitários de datas e períodos compartilhados entre dashboards

export function toStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isLastDayOfMonth(date: Date): boolean {
  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  return nextDay.getDate() === 1;
}

export function diffDaysInclusive(start: Date, end: Date): number {
  const ms = toEndOfDay(end).getTime() - toStartOfDay(start).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

export type PreviousPeriod = {
  prevStartDate: Date;
  prevEndDate: Date;
  compareLabel: string;
};

// Calcula período anterior seguindo regras do dashboard de vendas
export function previousPeriodFromRange(startDate: Date, endDate: Date): PreviousPeriod {
  const startOfDay = toStartOfDay(startDate);
  const endOfDay = toEndOfDay(endDate);

  const startDay = startOfDay.getDate();
  const startMonth = startOfDay.getMonth();
  const endMonth = endOfDay.getMonth();
  const endDay = endOfDay.getDate();

  let prevStartDate: Date;
  let prevEndDate: Date;
  let compareLabel = 'período anterior';

  if (startDay === 1 && startMonth === endMonth && isLastDayOfMonth(endOfDay)) {
    prevStartDate = new Date(startOfDay.getFullYear(), startMonth - 1, 1);
    prevEndDate = new Date(startOfDay.getFullYear(), startMonth, 0);
    compareLabel = 'mês anterior';
  } else if (startDay === 1 && startMonth === endMonth) {
    prevStartDate = new Date(startOfDay.getFullYear(), startMonth - 1, 1);
    prevEndDate = new Date(startOfDay.getFullYear(), startMonth - 1, endDay);
    compareLabel = 'mês anterior';
  } else {
    const daysDiff = diffDaysInclusive(startOfDay, endOfDay);
    prevEndDate = new Date(startOfDay);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - daysDiff + 1);

    if (daysDiff === 7) compareLabel = 'semana anterior';
    else if (daysDiff >= 28 && daysDiff <= 31) compareLabel = 'mês anterior';
  }

  prevStartDate = toStartOfDay(prevStartDate);
  prevEndDate = toEndOfDay(prevEndDate);

  return { prevStartDate, prevEndDate, compareLabel };
}

export type WeekRange = { start: Date; end: Date; label: string };

export function lastNWeeksRanges(
  endDate: Date,
  options: { totalDays?: number; weeks?: number } = {}
): WeekRange[] {
  const totalDays = options.totalDays ?? 55;
  const weeks = options.weeks ?? 8;
  const daysPerWeek = Math.ceil(totalDays / weeks);

  const endRef = toEndOfDay(endDate);
  const ranges: WeekRange[] = [];

  for (let i = 0; i < weeks; i++) {
    const weekEnd = new Date(endRef.getTime() - i * daysPerWeek * 24 * 60 * 60 * 1000);
    const weekStart = new Date(weekEnd.getTime() - (daysPerWeek - 1) * 24 * 60 * 60 * 1000);
    ranges.unshift({ start: weekStart, end: weekEnd, label: formatDDMM(weekStart) + '–' + formatDDMM(weekEnd) });
  }

  return ranges;
}

function formatDDMM(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}



