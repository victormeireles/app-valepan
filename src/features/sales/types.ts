// Tipos compartilhados para o dashboard de Vendas
// Estes tipos foram extraídos de `src/components/VendasDashboard.tsx`

import type { SalesPeriodRange } from '@/features/common/utils/date';

export interface KpiValue {
  valor: number;
  variacao: number;
  projecao?: number;
}

export interface KpisData {
  faturamento: KpiValue;
  pedidos: KpiValue;
  ticketMedio: KpiValue;
  margemBruta: KpiValue;
  clientesUnicos: KpiValue;
  unidades: KpiValue;
  pacotes: KpiValue;
  caixas: KpiValue;
  faturamentoAnual: KpiValue;
  compareLabel: string;
  showProjection: boolean;
  // Dados para tooltips
  currentPeriod: {
    start: Date;
    end: Date;
  };
  previousPeriod: {
    start: Date;
    end: Date;
  };
  // Valores anteriores para comparação
  previousValues: {
    faturamento: number;
    margemBruta: number;
    pedidos: number;
    ticketMedio: number;
    clientes: number;
    unidades: number;
    caixas: number;
    faturamentoAnual: number;
  };
}

export interface TimeBucketData {
  label: string;
  faturamento: number;
  margemBruta: number;
  cmv: number;
  inicio: Date;
  fim: Date;
}

export type SemanaData = TimeBucketData;
export type DiaData = TimeBucketData;

export type SalesChartGranularity = 'weekly' | 'daily';

export interface AxisLimits {
  min: number;
  max: number;
}

export interface TopItem {
  cliente?: string;
  produto?: string;
  valor: number;
  cor: string;
  cmv?: number;
  margemBruta?: number;
  precoMedioPorPacote?: number;
  custoMedioPorPacote?: number;
  pacotesTotal?: number;
  quantidadeTotal?: number;
}

export interface RankingItem {
  cliente: string;
  cur: number;
  prev: number;
  delta: number;
  pct: number;
}

export interface EngagementBuckets {
  novos: Set<unknown>;
  ativos: Set<unknown>;
  quaseInativos: Set<unknown>;
  inativos: Set<unknown>;
}

export interface EngajamentoData {
  sets: EngagementBuckets;
}

export interface ChartDataStructure {
  semanas: SemanaData[];
  dias: DiaData[];
  topClientes: TopItem[];
  topProdutos: TopItem[];
  topTiposCliente: TopItem[];
  rankingUp: RankingItem[];
  rankingDown: RankingItem[];
  engajamento: EngajamentoData;
  y1Limits: Record<SalesChartGranularity, AxisLimits>;
}

export const DEFAULT_AXIS_LIMITS: AxisLimits = {
  min: 0,
  max: 100,
};

export function ensureAxisLimits(limits: AxisLimits | null | undefined): AxisLimits {
  if (!limits) {
    return DEFAULT_AXIS_LIMITS;
  }

  const sanitizedMin = Number.isFinite(limits.min) ? limits.min : DEFAULT_AXIS_LIMITS.min;
  const sanitizedMax = Number.isFinite(limits.max) ? limits.max : DEFAULT_AXIS_LIMITS.max;

  return {
    min: sanitizedMin,
    max: sanitizedMax,
  };
}

// Dados apresentados nos modais detalhados
export type ModalData = {
  produto?: string;
  cliente?: string;
  unidades?: number;
  pacotes?: number;
  caixas?: number;
  valor?: number;
  cmv?: number;
  mb?: number;
  pmp?: number;
  cmp?: number;
  last?: Date;
};

// Tipos para visão semanal de vendas
export type MetricType = 'faturamento' | 'quantidade' | 'caixas';

export interface SalesPeriodRow {
  entityName: string;
  values: number[];
  total: number;
}

export interface SalesPeriodTableData {
  rows: SalesPeriodRow[];
  totalRow: SalesPeriodRow;
  periods: SalesPeriodRange[];
}

// Compatibilidade temporária com implementações existentes
export type WeeklySalesRow = SalesPeriodRow;
export type WeeklySalesTableData = SalesPeriodTableData;

export type { PeriodGranularity, SalesPeriodRange } from '@/features/common/utils/date';


