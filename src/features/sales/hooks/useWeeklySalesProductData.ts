import { ProductSaleRow } from '@/lib/sheets';
import type { SalesPeriodRange } from '@/features/common/utils/date';
import { toEndOfDay } from '@/features/common/utils/date';
import type { MetricType, SalesPeriodRow } from '@/features/sales/types';

export function computeSalesPeriodProductData(
  filteredData: ProductSaleRow[],
  clientName: string,
  periods: SalesPeriodRange[],
  metric: MetricType
): SalesPeriodRow[] {
  // Filtrar dados apenas do cliente específico
  const clientData = filteredData.filter(row => row.cliente === clientName);

  if (clientData.length === 0) {
    return [];
  }

  // Mapear dados por produto e período
  const productPeriodMap = new Map<string, Map<number, number>>();

  for (const row of clientData) {
    const produto = row.produto;
    
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

    // Inicializar mapa do produto se não existir
    if (!productPeriodMap.has(produto)) {
      productPeriodMap.set(produto, new Map<number, number>());
    }

    const periodMap = productPeriodMap.get(produto);
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

  // Construir linhas de produtos
  const rows: SalesPeriodRow[] = [];
  
  for (const [produto, periodMap] of productPeriodMap.entries()) {
    const periodValues: number[] = [];
    let total = 0;

    for (let i = 0; i < periods.length; i++) {
      const value = periodMap.get(i) ?? 0;
      periodValues.push(value);
      total += value;
    }

    rows.push({
      entityName: produto ?? 'Produto indefinido',
      values: periodValues,
      total,
    });
  }

  // Ordenar por total decrescente
  rows.sort((a, b) => b.total - a.total);

  return rows;
}

