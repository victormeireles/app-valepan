import { useCallback, useEffect, useState } from 'react';
import { AccessDeniedError, ProductSaleRow, SheetMeta, fetchSheetData, fetchSheetMeta } from '@/lib/sheets';

export type UseSalesDataState = {
  rawData: ProductSaleRow[];
  meta: SheetMeta | null;
  loading: boolean;
  initialLoad: boolean;
  accessDenied: { email: string; sheetUrl?: string } | null;
  periodStart: string;
  periodEnd: string;
  setPeriodStart: (v: string) => void;
  setPeriodEnd: (v: string) => void;
  reload: () => Promise<void>;
};

export function useSalesData(enable: boolean): UseSalesDataState {
  const [rawData, setRawData] = useState<ProductSaleRow[]>([]);
  const [meta, setMeta] = useState<SheetMeta | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const [accessDenied, setAccessDenied] = useState<{ email: string; sheetUrl?: string } | null>(null);
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const [data, metaResp] = await Promise.all([
        fetchSheetData('sales'),
        fetchSheetMeta('sales'),
      ]);

      setRawData(data);
      setMeta(metaResp);

      if (data.length > 0) {
        const lastDate = new Date(Math.max(...data.map(r => r.data.getTime())));
        const currentMonthStart = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
        const currentMonthEnd = new Date(lastDate);
        setPeriodStart(currentMonthStart.toISOString().split('T')[0]);
        setPeriodEnd(currentMonthEnd.toISOString().split('T')[0]);
      } else {
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        setPeriodStart(inicioMes.toISOString().split('T')[0]);
        setPeriodEnd(fimPeriodo.toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      if (error instanceof AccessDeniedError) {
        setAccessDenied({ email: error.email, sheetUrl: error.sheetUrl });
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    if (enable && rawData.length === 0 && !accessDenied) {
      void load();
    }
  }, [enable, rawData.length, accessDenied, load]);

  return {
    rawData,
    meta,
    loading,
    initialLoad,
    accessDenied,
    periodStart,
    periodEnd,
    setPeriodStart,
    setPeriodEnd,
    reload: load,
  };
}



