import { ProductSaleRow } from '@/lib/sheets';
import type { WeekRange } from '@/features/common/utils/date';
import { toEndOfDay } from '@/features/common/utils/date';
import type { MetricType, WeeklySalesRow } from '@/features/sales/types';

export function computeWeeklySalesProductData(
  filteredData: ProductSaleRow[],
  clientName: string,
  weeks: WeekRange[],
  metric: MetricType
): WeeklySalesRow[] {
  // Filtrar dados apenas do cliente específico
  const clientData = filteredData.filter(row => row.cliente === clientName);

  if (clientData.length === 0) {
    return [];
  }

  // Mapear dados por produto e semana
  const productWeekMap = new Map<string, Map<number, number>>();

  for (const row of clientData) {
    const produto = row.produto;
    
    // Encontrar qual semana este registro pertence
    const weekIndex = weeks.findIndex(week => {
      const rowDate = row.data;
      const weekStart = new Date(week.start.getFullYear(), week.start.getMonth(), week.start.getDate());
      const weekEnd = toEndOfDay(week.end);
      return rowDate >= weekStart && rowDate <= weekEnd;
    });

    if (weekIndex === -1) continue;

    // Inicializar mapa do produto se não existir
    if (!productWeekMap.has(produto)) {
      productWeekMap.set(produto, new Map<number, number>());
    }

    const weekMap = productWeekMap.get(produto);
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

  // Construir linhas de produtos
  const rows: WeeklySalesRow[] = [];
  
  for (const [produto, weekMap] of productWeekMap.entries()) {
    const weekValues: number[] = [];
    let total = 0;

    for (let i = 0; i < weeks.length; i++) {
      const value = weekMap.get(i) ?? 0;
      weekValues.push(value);
      total += value;
    }

    rows.push({
      cliente: produto, // Reutilizando a propriedade 'cliente' para produto
      weekValues,
      total,
    });
  }

  // Ordenar por total decrescente
  rows.sort((a, b) => b.total - a.total);

  return rows;
}

