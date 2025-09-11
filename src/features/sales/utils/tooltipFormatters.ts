// Funções de formatação para tooltips dos KPIs

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateRange(startDate: Date, endDate: Date): string {
  const start = startDate.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit' 
  });
  const end = endDate.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit' 
  });
  return `${start} a ${end}`;
}

export function formatYearDateRange(startDate: Date, endDate: Date): string {
  const start = startDate.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit',
    year: 'numeric'
  });
  const end = endDate.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit',
    year: 'numeric'
  });
  return `${start} a ${end}`;
}

export function formatTicket(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}
