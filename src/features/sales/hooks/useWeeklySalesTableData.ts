import { useMemo } from 'react';
import { ProductSaleRow } from '@/lib/sheets';
import { lastNWeeksRanges, toEndOfDay } from '@/features/common/utils/date';
import type { MetricType, WeeklySalesRow, WeeklySalesTableData } from '@/features/sales/types';

export type UseWeeklySalesTableDataArgs = {
  filteredData: ProductSaleRow[];
  endDate: Date | null;
  metric: MetricType;
};

export function useWeeklySalesTableData(args: UseWeeklySalesTableDataArgs): WeeklySalesTableData | null {
  const { filteredData, endDate, metric } = args;

  return useMemo(() => {
    if (!endDate || filteredData.length === 0) {
      return null;
    }

    // Gerar 12 semanas (83 dias divididos em 12 períodos)
    const weeks = lastNWeeksRanges(endDate, { totalDays: 83, weeks: 12 });

    // Mapear dados por cliente e semana
    const clientWeekMap = new Map<string, Map<number, number>>();

    for (const row of filteredData) {
      const cliente = row.cliente;
      
      // Encontrar qual semana este registro pertence
      const weekIndex = weeks.findIndex(week => {
        const rowDate = row.data;
        const weekStart = new Date(week.start.getFullYear(), week.start.getMonth(), week.start.getDate());
        const weekEnd = toEndOfDay(week.end);
        return rowDate >= weekStart && rowDate <= weekEnd;
      });

      if (weekIndex === -1) continue;

      // Inicializar mapa do cliente se não existir
      if (!clientWeekMap.has(cliente)) {
        clientWeekMap.set(cliente, new Map<number, number>());
      }

      const weekMap = clientWeekMap.get(cliente);
      if (!weekMap) continue;

      // Calcular valor da métrica
      let metricValue = 0;
      switch (metric) {
        case 'faturamento':
          metricValue = row.valorTotal;
          break;
        case 'quantidade':
          metricValue = row.quantidade ?? 0;
          break;
        case 'caixas':
          metricValue = row.caixas ?? 0;
          break;
      }

      // Acumular valor na semana correspondente
      weekMap.set(weekIndex, (weekMap.get(weekIndex) ?? 0) + metricValue);
    }

    // Construir linhas de clientes
    const rows: WeeklySalesRow[] = [];
    
    for (const [cliente, weekMap] of clientWeekMap.entries()) {
      const weekValues: number[] = [];
      let total = 0;

      for (let i = 0; i < weeks.length; i++) {
        const value = weekMap.get(i) ?? 0;
        weekValues.push(value);
        total += value;
      }

      rows.push({
        cliente,
        weekValues,
        total,
      });
    }

    // Ordenar por total decrescente
    rows.sort((a, b) => b.total - a.total);

    // Calcular linha de totais
    const totalWeekValues: number[] = [];
    let grandTotal = 0;

    for (let i = 0; i < weeks.length; i++) {
      let weekTotal = 0;
      for (const row of rows) {
        weekTotal += row.weekValues[i] ?? 0;
      }
      totalWeekValues.push(weekTotal);
      grandTotal += weekTotal;
    }

    const totalRow: WeeklySalesRow = {
      cliente: 'Total Geral',
      weekValues: totalWeekValues,
      total: grandTotal,
    };

    return {
      rows,
      totalRow,
      weeks,
    };
  }, [filteredData, endDate, metric]);
}

