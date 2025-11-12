// Utilitários de datas e períodos compartilhados entre dashboards

export type PeriodGranularity = 'weekly' | 'daily' | 'monthly';

export interface SalesPeriodRange {
  start: Date;
  end: Date;
  label: string;
  granularity: PeriodGranularity;
}

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
  const weeklyRanges = buildSalesPeriodRanges(endDate, 'weekly', {
    totalDays: options.totalDays,
    totalUnits: options.weeks,
  });
  return weeklyRanges.map(range => ({
    start: range.start,
    end: range.end,
    label: range.label,
  }));
}

export function buildSalesPeriodRanges(
  endDate: Date,
  granularity: PeriodGranularity,
  options: { startDate?: Date; totalDays?: number; totalUnits?: number } = {}
): SalesPeriodRange[] {
  const endRef = toEndOfDay(endDate);
  const { startDate, totalDays, totalUnits } = options;

  if (startDate) {
    const startRef = toStartOfDay(startDate);
    if (startRef > endRef) {
      return [];
    }

    switch (granularity) {
      case 'daily': {
        const daysDiff = diffDaysInclusive(startRef, endRef);
        const ranges: SalesPeriodRange[] = [];
        for (let i = 0; i < daysDiff; i++) {
          const current = new Date(startRef);
          current.setDate(startRef.getDate() + i);
          const start = toStartOfDay(current);
          const end = toEndOfDay(current);
          ranges.push({
            start,
            end,
            label: `${formatDDMM(start)} ${formatWeekdayAbbreviation(start)}`,
            granularity: 'daily',
          });
        }
        return ranges;
      }
      case 'monthly': {
        const ranges: SalesPeriodRange[] = [];
        let cursor = new Date(startRef);
        while (cursor <= endRef) {
          const periodStart = toStartOfDay(cursor);
          const monthEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
          const displayEnd = monthEnd > endRef ? new Date(endRef) : monthEnd;
          ranges.push({
            start: periodStart,
            end: toEndOfDay(displayEnd),
            label: formatMonthYear(periodStart),
            granularity: 'monthly',
          });
          cursor = new Date(displayEnd);
          cursor.setDate(displayEnd.getDate() + 1);
          cursor = toStartOfDay(cursor);
        }
        return ranges;
      }
      case 'weekly':
      default: {
        const ranges: SalesPeriodRange[] = [];
        let cursor = new Date(startRef);
        while (cursor <= endRef) {
          const periodStart = toStartOfDay(cursor);
          const candidateEnd = new Date(periodStart);
          candidateEnd.setDate(periodStart.getDate() + 6);
          const displayEnd = candidateEnd > endRef ? new Date(endRef) : candidateEnd;
          ranges.push({
            start: periodStart,
            end: toEndOfDay(displayEnd),
            label: formatDDMM(periodStart) + '–' + formatDDMM(displayEnd),
            granularity: 'weekly',
          });
          cursor = new Date(displayEnd);
          cursor.setDate(displayEnd.getDate() + 1);
          cursor = toStartOfDay(cursor);
        }
        return ranges;
      }
    }
  }

  switch (granularity) {
    case 'daily': {
      const days = totalDays ?? 14;
      const ranges: SalesPeriodRange[] = [];
      for (let i = 0; i < days; i++) {
        const current = new Date(endRef);
        current.setDate(endRef.getDate() - i);
        const start = toStartOfDay(current);
        const end = toEndOfDay(current);
        ranges.unshift({
          start,
          end,
          label: `${formatDDMM(start)} ${formatWeekdayAbbreviation(start)}`,
          granularity: 'daily',
        });
      }
      return ranges;
    }
    case 'monthly': {
      const months = totalUnits ?? 3;
      const ranges: SalesPeriodRange[] = [];
      for (let i = 0; i < months; i++) {
        const monthReference = new Date(endRef);
        monthReference.setDate(1);
        monthReference.setMonth(monthReference.getMonth() - i);
        const start = toStartOfDay(monthReference);
        const end = i === 0
          ? endRef
          : toEndOfDay(new Date(monthReference.getFullYear(), monthReference.getMonth() + 1, 0));
        ranges.unshift({
          start,
          end,
          label: formatMonthYear(start),
          granularity: 'monthly',
        });
      }
      return ranges;
    }
    case 'weekly':
    default: {
      const weeks = totalUnits ?? 12;
      const daysSpan = totalDays ?? 83;
      const daysPerWeek = Math.ceil(daysSpan / weeks);
      const ranges: SalesPeriodRange[] = [];
      for (let i = 0; i < weeks; i++) {
        const weekEnd = new Date(endRef);
        weekEnd.setDate(endRef.getDate() - i * daysPerWeek);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekEnd.getDate() - (daysPerWeek - 1));
        ranges.unshift({
          start: toStartOfDay(weekStart),
          end: toEndOfDay(weekEnd),
          label: formatDDMM(weekStart) + '–' + formatDDMM(weekEnd),
          granularity: 'weekly',
        });
      }
      return ranges;
    }
  }
}

function formatDDMM(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

function formatMonthYear(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${year}`;
}

function formatWeekdayAbbreviation(date: Date): string {
  const weekdayNames = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  return weekdayNames[date.getDay()] ?? '';
}

// Funções centralizadas para criação de datas de período (local)
export function createPeriodStartDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(n => parseInt(n, 10));
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return date;
}

export function createPeriodEndDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(n => parseInt(n, 10));
  const date = new Date(year, month - 1, day, 23, 59, 59, 999);
  return date;
}

// Função para criar um par de datas de período
export function createPeriodDates(startString: string, endString: string): { startDate: Date; endDate: Date } {
  return {
    startDate: createPeriodStartDate(startString),
    endDate: createPeriodEndDate(endString)
  };
}

// Função para formatar período para exibição
export function formatPeriodDisplay(startString: string, endString: string): string {
  if (!startString || !endString) return 'Período';
  const startDate = parseISODateLocal(startString);
  const endDate = parseISODateLocal(endString);
  return `${startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
}

// Converte uma string ISO curta (yyyy-mm-dd) para Date no horário local (sem deslocamento UTC)
export function parseISODateLocal(dateString: string): Date {
  const [y, m, d] = dateString.split('-').map(n => parseInt(n, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// Função para fazer parse de data no formato brasileiro (dd/mm/yyyy) em horário local
export function parseBrazilianDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  try {
    // Tentar formato dd/mm/yyyy primeiro
    const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      // Criar data em horário local para evitar problemas de timezone
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Tentar parse padrão do JavaScript
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

// Funções para trabalhar apenas com datas (sem hora)
export function createDateOnly(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

export function parseDateOnly(dateString: string): Date | null {
  if (!dateString) return null;
  
  try {
    const [year, month, day] = dateString.split('-').map(n => parseInt(n, 10));
    return createDateOnly(year, month, day);
  } catch {
    return null;
  }
}

// Função para comparar apenas a parte da data (ignorando hora)
export function isSameDate(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

// Função para verificar se uma data está dentro de um intervalo (apenas datas)
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const startDay = startDate.getDate();
  
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();
  const endDay = endDate.getDate();
  
  // Criar datas para comparação
  const checkDate = new Date(year, month, day);
  const rangeStart = new Date(startYear, startMonth, startDay);
  const rangeEnd = new Date(endYear, endMonth, endDay);
  
  return checkDate >= rangeStart && checkDate <= rangeEnd;
}

// Funções completamente independentes de timezone - trabalham apenas com strings ISO
export function dateToISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateToISOString(dateInput: Date | string): string {
  if (typeof dateInput === 'string') {
    // Se já é uma string ISO, retorna como está
    if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateInput;
    }
    // Se é uma string de data, converte para Date primeiro
    const date = new Date(dateInput);
    return dateToISOString(date);
  }
  
  // Se é um objeto Date, converte para ISO string
  return dateToISOString(dateInput);
}

export function isDateInRangeISO(dateInput: Date | string, startDateInput: Date | string, endDateInput: Date | string): boolean {
  const dateStr = parseDateToISOString(dateInput);
  const startStr = parseDateToISOString(startDateInput);
  const endStr = parseDateToISOString(endDateInput);
  
  // Comparação de strings ISO (YYYY-MM-DD) é lexicograficamente correta
  return dateStr >= startStr && dateStr <= endStr;
}

// Função para criar datas de período que retorna strings ISO
export function createPeriodStartDateISO(dateString: string): string {
  // dateString já deve estar no formato YYYY-MM-DD
  return dateString;
}

export function createPeriodEndDateISO(dateString: string): string {
  // dateString já deve estar no formato YYYY-MM-DD
  return dateString;
}



