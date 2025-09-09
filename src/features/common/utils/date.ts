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



