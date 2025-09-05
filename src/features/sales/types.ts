// Tipos compartilhados para o dashboard de Vendas
// Estes tipos foram extraídos de `src/components/VendasDashboard.tsx`

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
}

export interface SemanaData {
  label: string;
  faturamento: number;
  margemBruta: number;
  cmv: number;
  inicio: Date;
  fim: Date;
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
  topClientes: TopItem[];
  topProdutos: TopItem[];
  topTiposCliente: TopItem[];
  rankingUp: RankingItem[];
  rankingDown: RankingItem[];
  engajamento: EngajamentoData;
  y1Limits?: {
    min: number;
    max: number;
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


