import { useEffect, useMemo, useState } from 'react';
import { ProductSaleRow } from '@/lib/sheets';
import type { ChartDataStructure, KpisData } from '@/features/sales/types';
import { computeSalesKPIs } from '@/features/sales/hooks/useSalesKPIs';
import { computeSalesChartData } from '@/features/sales/hooks/useSalesChartData';

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
  kpis: KpisData | null;
  chartData: ChartDataStructure | null;
  apply: (clients: string[], products: string[]) => void;
};

export function useSalesFilters(args: UseSalesFiltersArgs): UseSalesFiltersState {
  const { rawData, meta, periodStart, periodEnd, quaseInativoMeses, inativoMeses, maxPeriodoMeses } = args;

  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [filteredData, setFilteredData] = useState<ProductSaleRow[]>([]);
  const [kpis, setKpis] = useState<KpisData | null>(null);
  const [chartData, setChartData] = useState<ChartDataStructure | null>(null);

  const startDate = useMemo(() => (periodStart ? new Date(periodStart + 'T00:00:00') : null), [periodStart]);
  const endDate = useMemo(() => (periodEnd ? new Date(periodEnd + 'T00:00:00') : null), [periodEnd]);

  const apply = (clients: string[], products: string[]) => {
    if (!startDate || !endDate) return;

    const s = new Date(startDate); s.setHours(0, 0, 0, 0);
    const e = new Date(endDate); e.setHours(23, 59, 59, 999);

    let f = rawData.filter(row => row.data >= s && row.data <= e);
    if (clients.length > 0) f = f.filter(r => clients.includes(r.cliente));
    if (products.length > 0) f = f.filter(r => r.produto && products.includes(r.produto));

    setFilteredData(f);

    // período anterior
    const startDay = startDate.getDate();
    const startMonth = startDate.getMonth();
    const endMonth = endDate.getMonth();
    const endDay = endDate.getDate();

    const isLastDayOfMonth = (date: Date) => {
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      return nextDay.getDate() === 1;
    };

    let prevStartDate: Date;
    let prevEndDate: Date;
    if (startDay === 1 && startMonth === endMonth && isLastDayOfMonth(endDate)) {
      prevStartDate = new Date(startDate.getFullYear(), startMonth - 1, 1);
      prevEndDate = new Date(startDate.getFullYear(), startMonth, 0);
    } else if (startDay === 1 && startMonth === endMonth) {
      prevStartDate = new Date(startDate.getFullYear(), startMonth - 1, 1);
      prevEndDate = new Date(startDate.getFullYear(), startMonth - 1, endDay);
    } else {
      const daysDiff = Math.ceil(((e.getTime()) - (s.getTime())) / (1000 * 60 * 60 * 24));
      prevEndDate = new Date(s);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - daysDiff + 1);
      prevStartDate.setHours(0, 0, 0, 0);
      prevEndDate.setHours(23, 59, 59, 999);
    }

    const previousData = rawData.filter(row => row.data >= prevStartDate && row.data <= prevEndDate);

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
      apply(selectedClients, selectedProducts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData, meta, periodStart, periodEnd, selectedClients, selectedProducts, quaseInativoMeses, inativoMeses, maxPeriodoMeses]);

  return {
    filteredData,
    selectedClients,
    setSelectedClients,
    selectedProducts,
    setSelectedProducts,
    kpis,
    chartData,
    apply,
  };
}


