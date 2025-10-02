import { useEffect, useMemo, useState } from 'react';
import { ProductSaleRow } from '@/lib/sheets';
import type { ChartDataStructure, KpisData } from '@/features/sales/types';
import { computeSalesKPIs } from '@/features/sales/hooks/useSalesKPIs';
import { computeSalesChartData } from '@/features/sales/hooks/useSalesChartData';
import { createPeriodStartDate, createPeriodEndDate, previousPeriodFromRange, isDateInRangeISO } from '@/features/common/utils/date';

export type UseSalesFiltersArgs = {
  rawData: ProductSaleRow[];
  meta: { hasPackages: boolean; hasBoxes: boolean; hasCustomerType: boolean } | null;
  periodStart: string;
  periodEnd: string;
  quaseInativoMeses: number;
  inativoMeses: number;
  maxPeriodoMeses: number;
  topClientsCount?: number;
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
  const { rawData, meta, periodStart, periodEnd, quaseInativoMeses, inativoMeses, maxPeriodoMeses, topClientsCount } = args;

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

    // Usar comparação independente de timezone com strings ISO
    let f = rawData.filter(row => isDateInRangeISO(row.data, startDate, endDate));
    if (clients.length > 0) f = f.filter(r => clients.includes(r.cliente));
    if (products.length > 0) f = f.filter(r => r.produto && products.includes(r.produto));
    if (customerTypes.length > 0) f = f.filter(r => r.tipoCliente && customerTypes.includes(r.tipoCliente));

    setFilteredData(f);

    // período anterior usando função centralizada
    const { prevStartDate, prevEndDate } = previousPeriodFromRange(startDate, endDate);
    
    // Aplicar os mesmos filtros de cliente/produto/tipo no período anterior
    let previousData = rawData.filter(row => isDateInRangeISO(row.data, prevStartDate, prevEndDate));
    if (clients.length > 0) previousData = previousData.filter(r => clients.includes(r.cliente));
    if (products.length > 0) previousData = previousData.filter(r => r.produto && products.includes(r.produto));
    if (customerTypes.length > 0) previousData = previousData.filter(r => r.tipoCliente && customerTypes.includes(r.tipoCliente));

    setKpis(computeSalesKPIs(f, rawData, startDate, endDate));
    setChartData(
      computeSalesChartData(
        f,
        rawData,
        previousData,
        startDate,
        endDate,
        {
          meta,
          quaseInativoMeses,
          inativoMeses,
          maxPeriodoMeses,
          topClientsCount,
          // Passar clientes selecionados pelo usuário para que a evolução semanal
          // só filtre quando houver seleção explícita.
          filteredClients: clients
        }
      )
    );
  };

  useEffect(() => {
    if (rawData.length > 0 && meta && startDate && endDate) {
      apply(selectedClients, selectedProducts, selectedCustomerTypes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData, meta, periodStart, periodEnd, selectedClients, selectedProducts, selectedCustomerTypes, quaseInativoMeses, inativoMeses, maxPeriodoMeses, topClientsCount]);

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


