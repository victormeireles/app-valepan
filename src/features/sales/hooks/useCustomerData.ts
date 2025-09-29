import { useCallback, useEffect, useState } from 'react';
import { AccessDeniedError, CustomerRow, SheetMeta, fetchSheetData, fetchSheetMeta } from '@/lib/sheets';

export type UseCustomerDataState = {
  rawData: CustomerRow[];
  meta: SheetMeta | null;
  loading: boolean;
  initialLoad: boolean;
  accessDenied: { email: string; sheetUrl?: string } | null;
  reload: () => Promise<void>;
};

export function useCustomerData(enable: boolean): UseCustomerDataState {
  const [rawData, setRawData] = useState<CustomerRow[]>([]);
  const [meta, setMeta] = useState<SheetMeta | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const [accessDenied, setAccessDenied] = useState<{ email: string; sheetUrl?: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [data, metaResp] = await Promise.all([
        fetchSheetData('customer'),
        fetchSheetMeta('customer'),
      ]);

      setRawData(data);
      setMeta(metaResp);

    } catch (error) {
      console.error('Erro ao carregar dados de clientes:', error);
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
    reload: load,
  };
}
