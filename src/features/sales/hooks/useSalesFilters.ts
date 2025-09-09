import { useEffect, useMemo, useState } from 'react';
import { ProductSaleRow } from '@/lib/sheets';
import type { ChartDataStructure, KpisData } from '@/features/sales/types';
import { computeSalesKPIs } from '@/features/sales/hooks/useSalesKPIs';
import { computeSalesChartData } from '@/features/sales/hooks/useSalesChartData';
import { createPeriodStartDate, createPeriodEndDate, previousPeriodFromRange, isDateInRange } from '@/features/common/utils/date';

export type UseSalesFiltersArgs = {
  rawData: ProductSaleRow[];
  meta: { hasPackages: boolean; hasBoxes: boolean; hasCustomerType: boolean } | null;
  periodStart: string;
  periodEnd: string;
  quaseInativoMeses: number;
  inativoMeses: number;
  maxPeriodoMeses: number;
};

export type UseSalesFiltersState = {
  filteredData: ProductSaleRow[];
  selectedClients: string[];
  setSelectedClients: (v: string[]) => void;
  selectedProducts: string[];
  setSelectedProducts: (v: string[]) => void;
  selectedCustomerTypes: string[];
  setSelectedCustomerTypes: (v: string[]) => void;
  kpis: KpisData | null;
  chartData: ChartDataStructure | null;
  apply: (clients: string[], products: string[], customerTypes: string[]) => void;
};

export function useSalesFilters(args: UseSalesFiltersArgs): UseSalesFiltersState {
  const { rawData, meta, periodStart, periodEnd, quaseInativoMeses, inativoMeses, maxPeriodoMeses } = args;

  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<string[]>([]);
  const [filteredData, setFilteredData] = useState<ProductSaleRow[]>([]);
  const [kpis, setKpis] = useState<KpisData | null>(null);
  const [chartData, setChartData] = useState<ChartDataStructure | null>(null);

  const startDate = useMemo(() => (periodStart ? createPeriodStartDate(periodStart) : null), [periodStart]);
  const endDate = useMemo(() => (periodEnd ? createPeriodEndDate(periodEnd) : null), [periodEnd]);

  const apply = (clients: string[], products: string[], customerTypes: string[] = []) => {
    if (!startDate || !endDate) return;

    // Usar comparação apenas de datas (ignorando hora) para evitar problemas de timezone
    let f = rawData.filter(row => isDateInRange(row.data, startDate, endDate));
    if (clients.length > 0) f = f.filter(r => clients.includes(r.cliente));
    if (products.length > 0) f = f.filter(r => r.produto && products.includes(r.produto));
    if (customerTypes.length > 0) f = f.filter(r => r.tipoCliente && customerTypes.includes(r.tipoCliente));

    setFilteredData(f);

    // período anterior usando função centralizada
    const { prevStartDate, prevEndDate } = previousPeriodFromRange(startDate, endDate);
    const previousData = rawData.filter(row => isDateInRange(row.data, prevStartDate, prevEndDate));

    setKpis(computeSalesKPIs(f, rawData, startDate, endDate));
    setChartData(
      computeSalesChartData(
        f,
        rawData,
        previousData,
        startDate,
        endDate,
        { meta, quaseInativoMeses, inativoMeses, maxPeriodoMeses }
      )
    );
  };

  useEffect(() => {
    if (rawData.length > 0 && meta && startDate && endDate) {
      apply(selectedClients, selectedProducts, selectedCustomerTypes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData, meta, periodStart, periodEnd, selectedClients, selectedProducts, selectedCustomerTypes, quaseInativoMeses, inativoMeses, maxPeriodoMeses]);

  return {
    filteredData,
    selectedClients,
    setSelectedClients,
    selectedProducts,
    setSelectedProducts,
    selectedCustomerTypes,
    setSelectedCustomerTypes,
    kpis,
    chartData,
    apply,
  };
}


