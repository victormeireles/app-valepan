import { useMemo } from 'react';
import { CustomerRow } from '@/lib/sheets';
import { 
  CLVData, 
  CLVKPIs, 
  CLVDistributionBucket, 
  CLVSegmentAnalysis,
  CLVRiskCustomer 
} from '@/features/sales/types/clv';

export interface UseCLVAnalysisReturn {
  clvData: CLVData[];
  clvKPIs: CLVKPIs | null;
  topCustomersByCLV: CLVData[];
  clvDistribution: CLVDistributionBucket[];
  segmentAnalysis: CLVSegmentAnalysis[];
  riskCustomers: CLVRiskCustomer[];
}

export interface CLVFilterParams {
  inactiveMonths: number;
  almostInactiveMonths: number;
  lastPurchaseDate: Date | null;
}

export function useCLVAnalysis(
  rawData: CustomerRow[], 
  filterParams: CLVFilterParams
): UseCLVAnalysisReturn {
  const clvData = useMemo(() => {
    if (rawData.length === 0) return [];

    // Agrupar dados por cliente
    const customerMap = new Map<string, {
      customer: string;
      customerType?: string | null;
      orders: number[];
      values: number[];
      dates: Date[];
    }>();

    rawData.forEach(row => {
      if (!row.first_purchase) return;
      
      const customer = row.customer;
      if (!customerMap.has(customer)) {
        customerMap.set(customer, {
          customer,
          customerType: row.customer_type,
          orders: [],
          values: [],
          dates: []
        });
      }

      const customerData = customerMap.get(customer)!;
      customerData.orders.push(row.orders);
      customerData.values.push(row.value);
      customerData.dates.push(new Date(row.first_purchase));
    });

    // Calcular métricas CLV para cada cliente
    return Array.from(customerMap.values()).map(data => {
      const totalValue = data.values.reduce((sum, val) => sum + val, 0);
      const totalOrders = data.orders.reduce((sum, orders) => sum + orders, 0);
      const firstPurchase = new Date(Math.min(...data.dates.map(d => d.getTime())));
      const lastPurchase = new Date(Math.max(...data.dates.map(d => d.getTime())));
      
      // Calcular período de vida do cliente em meses
      const customerLifespan = Math.max(1, 
        (lastPurchase.getTime() - firstPurchase.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      
      const averageTicket = totalOrders > 0 ? totalValue / totalOrders : 0;
      const purchaseFrequency = customerLifespan > 0 ? totalOrders / customerLifespan : 0;
      
      // CLV Histórico = valor total já gasto
      const clvHistorical = totalValue;
      
      // CLV Preditivo = projeção baseada em padrões históricos
      // Assumindo que clientes ativos continuarão comprando por mais 12 meses
      const expectedLifespan = Math.min(12, customerLifespan * 1.5);
      const clvPredictive = averageTicket * purchaseFrequency * expectedLifespan;
      
      // Score de risco baseado nos parâmetros dos filtros
      const baseDate = filterParams.lastPurchaseDate || new Date();
      const monthsSinceLastPurchase = 
        (baseDate.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      // Calcular score baseado nos thresholds dos filtros
      let clvRiskScore = 0;
      if (monthsSinceLastPurchase >= filterParams.inactiveMonths) {
        // Cliente inativo - score alto (80-100)
        clvRiskScore = 80 + Math.min(20, (monthsSinceLastPurchase - filterParams.inactiveMonths) * 10);
      } else if (monthsSinceLastPurchase >= filterParams.almostInactiveMonths) {
        // Cliente quase inativo - score médio (40-80)
        const progress = (monthsSinceLastPurchase - filterParams.almostInactiveMonths) / 
                        (filterParams.inactiveMonths - filterParams.almostInactiveMonths);
        clvRiskScore = 40 + (progress * 40);
      } else {
        // Cliente ativo - score baixo (0-40)
        const progress = monthsSinceLastPurchase / filterParams.almostInactiveMonths;
        clvRiskScore = progress * 40;
      }
      
      clvRiskScore = Math.min(100, Math.max(0, clvRiskScore));

      return {
        customer: data.customer,
        customerType: data.customerType,
        totalValue,
        totalOrders,
        firstPurchase,
        lastPurchase,
        averageTicket,
        purchaseFrequency,
        customerLifespan,
        clvHistorical,
        clvPredictive,
        clvRiskScore
      };
    });
  }, [rawData, filterParams]);

  const clvKPIs = useMemo(() => {
    if (clvData.length === 0) return null;

    const sortedByCLV = [...clvData].sort((a, b) => b.clvHistorical - a.clvHistorical);
    const top20Count = Math.ceil(clvData.length * 0.2);
    const top20PercentCLV = top20Count > 0 ? sortedByCLV
      .slice(0, top20Count)
      .reduce((sum, customer) => sum + customer.clvHistorical, 0) / top20Count : 0;

    const averageCLV = clvData.reduce((sum, customer) => sum + customer.clvHistorical, 0) / clvData.length;

    // CLV por segmento de cliente
    const segmentTotals: Record<string, number> = {};
    const segmentCounts: Record<string, number> = {};
    
    clvData.forEach(customer => {
      const segment = customer.customerType ?? 'Sem Categoria';
      segmentTotals[segment] = (segmentTotals[segment] ?? 0) + customer.clvHistorical;
      segmentCounts[segment] = (segmentCounts[segment] ?? 0) + 1;
    });

    const clvBySegment: Record<string, number> = {};
    Object.keys(segmentTotals).forEach(segment => {
      clvBySegment[segment] = segmentTotals[segment] / segmentCounts[segment];
    });

    const totalCLVPotential = clvData.reduce((sum, customer) => sum + customer.clvPredictive, 0);
    const churnRiskCustomers = clvData.filter(customer => customer.clvRiskScore > 60).length;
    const averagePurchaseFrequency = clvData.reduce((sum, customer) => sum + customer.purchaseFrequency, 0) / clvData.length;
    const averageCustomerLifespan = clvData.reduce((sum, customer) => sum + customer.customerLifespan, 0) / clvData.length;

    return {
      averageCLV,
      top20PercentCLV,
      clvBySegment,
      totalCLVPotential,
      churnRiskCustomers,
      averagePurchaseFrequency,
      averageCustomerLifespan
    };
  }, [clvData]);

  const topCustomersByCLV = useMemo(() => {
    return [...clvData]
      .sort((a, b) => b.clvHistorical - a.clvHistorical)
      .slice(0, 20);
  }, [clvData]);

  const clvDistribution = useMemo(() => {
    const ranges = [
      { min: 0, max: 500, label: 'R$ 0 - R$ 500' },
      { min: 500, max: 1000, label: 'R$ 500 - R$ 1.000' },
      { min: 1000, max: 2000, label: 'R$ 1.000 - R$ 2.000' },
      { min: 2000, max: 5000, label: 'R$ 2.000 - R$ 5.000' },
      { min: 5000, max: 10000, label: 'R$ 5.000 - R$ 10.000' },
      { min: 10000, max: Infinity, label: 'R$ 10.000+' }
    ];

    return ranges.map(range => {
      const count = clvData.filter(customer => 
        customer.clvHistorical >= range.min && customer.clvHistorical < range.max
      ).length;
      
      return {
        range: range.label,
        min: range.min,
        max: range.max,
        count,
        percentage: clvData.length > 0 ? (count / clvData.length) * 100 : 0
      };
    });
  }, [clvData]);

  const segmentAnalysis = useMemo(() => {
    const segmentMap = new Map<string, {
      customers: CLVData[];
      totalValue: number;
    }>();

    clvData.forEach(customer => {
      const segment = customer.customerType ?? 'Sem Categoria';
      if (!segmentMap.has(segment)) {
        segmentMap.set(segment, {
          customers: [],
          totalValue: 0
        });
      }
      
      const segmentData = segmentMap.get(segment)!;
      segmentData.customers.push(customer);
      segmentData.totalValue += customer.clvHistorical;
    });

    return Array.from(segmentMap.entries()).map(([segment, data]) => ({
      segment,
      averageCLV: data.customers.reduce((sum, c) => sum + c.clvHistorical, 0) / data.customers.length,
      customerCount: data.customers.length,
      totalValue: data.totalValue,
      averageFrequency: data.customers.reduce((sum, c) => sum + c.purchaseFrequency, 0) / data.customers.length,
      averageLifespan: data.customers.reduce((sum, c) => sum + c.customerLifespan, 0) / data.customers.length
    }));
  }, [clvData]);

  const riskCustomers = useMemo(() => {
    return clvData
      .filter(customer => customer.clvRiskScore > 50)
      .sort((a, b) => b.clvRiskScore - a.clvRiskScore)
      .slice(0, 15)
      .map(customer => ({
        customer: customer.customer,
        clvHistorical: customer.clvHistorical,
        clvRiskScore: customer.clvRiskScore,
        daysSinceLastPurchase: Math.floor(
          (Date.now() - customer.lastPurchase.getTime()) / (1000 * 60 * 60 * 24)
        ),
        customerType: customer.customerType
      }));
  }, [clvData]);

  return {
    clvData,
    clvKPIs,
    topCustomersByCLV,
    clvDistribution,
    segmentAnalysis,
    riskCustomers
  };
}
