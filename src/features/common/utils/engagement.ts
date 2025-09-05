import { ProductSaleRow } from '@/lib/sheets';

export type EngagementOptions = {
  quaseInativoMeses: number;
  inativoMeses: number;
  maxPeriodoMeses: number;
  // Se informado, limita os clientes considerados ao conjunto fornecido
  filterClients?: Set<string>;
};

export type EngagementBuckets = {
  novos: Set<string>;
  ativos: Set<string>;
  quaseInativos: Set<string>;
  inativos: Set<string>;
};

export type EngagementResult = {
  novos: number;
  ativos: number;
  quase: number;
  churn: number;
  sets: EngagementBuckets;
};

// Classifica clientes em buckets de engajamento, seguindo as regras usadas no dashboard
export function classifyEngagement(
  records: ProductSaleRow[],
  endDate: Date,
  options: EngagementOptions
): EngagementResult {
  const msDay = 24 * 60 * 60 * 1000;
  const dateTo = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

  const quaseInativoDias = (options.quaseInativoMeses ?? 1) * 30;
  const inativoDias = (options.inativoMeses ?? 2) * 30;
  const maxPeriodoDias = (options.maxPeriodoMeses ?? 6) * 30;

  const dateToMinus1Month = new Date(dateTo.getTime() - quaseInativoDias * msDay);
  const dateToMinus2Months = new Date(dateTo.getTime() - inativoDias * msDay);
  const dateToMinus6Months = new Date(dateTo.getTime() - maxPeriodoDias * msDay);

  // Mapear primeira e última compra por cliente em toda a base
  const firstByClient = new Map<string, Date>();
  const lastByClient = new Map<string, Date>();

  for (const r of records) {
    const cliente = r.cliente;
    const d = r.data;
    const prevFirst = firstByClient.get(cliente);
    const prevLast = lastByClient.get(cliente);
    if (!prevFirst || d < prevFirst) firstByClient.set(cliente, d);
    if (!prevLast || d > prevLast) lastByClient.set(cliente, d);
  }

  // Determinar conjunto de clientes a considerar
  const candidates = options.filterClients
    ? Array.from(options.filterClients.values())
    : Array.from(new Set(records.map(r => r.cliente)));

  const setNovos = new Set<string>();
  const setAtivos = new Set<string>();
  const setQuase = new Set<string>();
  const setInativos = new Set<string>();

  for (const cliente of candidates) {
    const lastPurchase = lastByClient.get(cliente);
    const firstPurchase = firstByClient.get(cliente);
    if (!lastPurchase) continue;

    if (lastPurchase > dateToMinus1Month && lastPurchase <= dateTo) {
      if (firstPurchase && firstPurchase > dateToMinus1Month) {
        setNovos.add(cliente);
      } else {
        setAtivos.add(cliente);
      }
    } else if (lastPurchase > dateToMinus2Months) {
      setQuase.add(cliente);
    } else if (lastPurchase > dateToMinus6Months) {
      setInativos.add(cliente);
    } else {
      // fora do período máximo, ignorado
    }
  }

  // Ativos devem excluir novos
  const setAtivosSemNovos = new Set(Array.from(setAtivos).filter(c => !setNovos.has(c)));

  return {
    novos: setNovos.size,
    ativos: setAtivosSemNovos.size,
    quase: setQuase.size,
    churn: setInativos.size,
    sets: {
      novos: setNovos,
      ativos: setAtivosSemNovos,
      quaseInativos: setQuase,
      inativos: setInativos,
    },
  };
}



