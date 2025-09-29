// Tipos específicos para CLV Analysis (Customer Lifetime Value)

export interface CLVData {
  customer: string;
  customerType?: string | null;
  totalValue: number;
  totalOrders: number;
  firstPurchase: Date;
  lastPurchase: Date;
  averageTicket: number;
  purchaseFrequency: number; // pedidos por mês
  customerLifespan: number; // meses ativos
  clvHistorical: number; // valor total já gasto
  clvPredictive: number; // projeção futura
  clvRiskScore: number; // 0-100 (0 = baixo risco, 100 = alto risco)
}

export interface CLVKPIs {
  averageCLV: number;
  top20PercentCLV: number;
  clvBySegment: Record<string, number>;
  totalCLVPotential: number;
  churnRiskCustomers: number;
  averagePurchaseFrequency: number;
  averageCustomerLifespan: number;
}

export interface CLVDistributionBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface CLVTrend {
  value: number;
  isPositive: boolean;
  period: string;
}

export interface CLVSegmentAnalysis {
  segment: string;
  averageCLV: number;
  customerCount: number;
  totalValue: number;
  averageFrequency: number;
  averageLifespan: number;
}

export interface CLVRiskCustomer {
  customer: string;
  clvHistorical: number;
  clvRiskScore: number;
  daysSinceLastPurchase: number;
  customerType?: string | null;
}

