import { useMemo } from 'react';
import { ProductSaleRow } from '@/lib/sheets';
import { buildSalesPeriodRanges, toEndOfDay } from '@/features/common/utils/date';
import type {
  MetricType,
  PeriodGranularity,
  SalesPeriodRow,
  SalesPeriodTableData,
} from '@/features/sales/types';

export type UseWeeklySalesTableDataArgs = {
  filteredData: ProductSaleRow[];
  startDate: Date | null;
  endDate: Date | null;
  metric: MetricType;
  granularity: PeriodGranularity;
};

export function useWeeklySalesTableData(args: UseWeeklySalesTableDataArgs): SalesPeriodTableData | null {
  const { filteredData, startDate, endDate, metric, granularity } = args;

  return useMemo(() => {
    if (!endDate || filteredData.length === 0) {
      return null;
    }

    const periods = buildSalesPeriodRanges(
      endDate,
      granularity,
      startDate ? { startDate } : undefined
    );

    if (periods.length === 0) {
      return null;
    }

    // Mapear dados por cliente e período
    const clientPeriodMap = new Map<string, Map<number, number>>();

    for (const row of filteredData) {
      const cliente = row.cliente;
      
      // Encontrar qual período este registro pertence
      const periodIndex = periods.findIndex(period => {
        const rowDate = row.data;
        const periodStart = new Date(
          period.start.getFullYear(),
          period.start.getMonth(),
          period.start.getDate()
        );
        const periodEnd = toEndOfDay(period.end);
        return rowDate >= periodStart && rowDate <= periodEnd;
      });

      if (periodIndex === -1) continue;

      // Inicializar mapa do cliente se não existir
      if (!clientPeriodMap.has(cliente)) {
        clientPeriodMap.set(cliente, new Map<number, number>());
      }

      const periodMap = clientPeriodMap.get(cliente);
      if (!periodMap) continue;

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

      // Acumular valor no período correspondente
      periodMap.set(periodIndex, (periodMap.get(periodIndex) ?? 0) + metricValue);
    }

    // Construir linhas de clientes
    const rows: SalesPeriodRow[] = [];
    
    for (const [cliente, periodMap] of clientPeriodMap.entries()) {
      const periodValues: number[] = [];
      let total = 0;

      for (let i = 0; i < periods.length; i++) {
        const value = periodMap.get(i) ?? 0;
        periodValues.push(value);
        total += value;
      }

      rows.push({
        entityName: cliente,
        values: periodValues,
        total,
      });
    }

    // Ordenar por total decrescente
    rows.sort((a, b) => b.total - a.total);

    // Calcular linha de totais
    const totalPeriodValues: number[] = [];
    let grandTotal = 0;

    for (let i = 0; i < periods.length; i++) {
      let periodTotal = 0;
      for (const row of rows) {
        periodTotal += row.values[i] ?? 0;
      }
      totalPeriodValues.push(periodTotal);
      grandTotal += periodTotal;
    }

    const totalRow: SalesPeriodRow = {
      entityName: 'Total Geral',
      values: totalPeriodValues,
      total: grandTotal,
    };

    return {
      rows,
      totalRow,
      periods,
    };
  }, [filteredData, startDate, endDate, metric, granularity]);
}

