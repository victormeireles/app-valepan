'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useTenant } from '@/hooks/useTenant';
import { useChartJS } from '@/features/common/hooks/useChartJS';
import { KPISection, type KPICard } from '@/features/shared/components/KPISection';
import { UnifiedDetailsModal, type UnifiedModalData, type ColumnConfig } from '@/features/shared/components/UnifiedDetailsModal';
import { useCustomerData } from '@/features/sales/hooks/useCustomerData';
import { useCLVAnalysis } from '@/features/sales/hooks/useCLVAnalysis';
import CustomerFilters from '@/features/sales/components/CustomerFilters';
import CustomerEngagementChart from '@/features/sales/components/CustomerEngagementChart';
import CustomerEvolutionChart from '@/features/sales/components/CustomerEvolutionChart';
import { useCustomerEvolution } from '@/features/sales/hooks/useCustomerEvolution';
import CLVDistributionChart from '@/features/sales/components/CLVDistributionChart';
import CLVSegmentAnalysis from '@/features/sales/components/CLVSegmentAnalysis';
import { useExcelExport } from '@/features/shared/hooks/useExcelExport';
import { CustomerRow } from '@/lib/sheets';
import vendasStyles from '@/styles/vendas.module.css';
import loadingStyles from '@/styles/loading.module.css';

export type CustomerKPIs = {
  totalCustomers: number;
  recurringCustomers: number; // ativos + quase inativos
  activeCustomers: number; // muito ativos (mesma regra do gráfico)
  retentionRate: number; // ativos / recorrentes
  averageMonthlyRevenue: number; // dos clientes recorrentes
};

export type CustomerEngagement = {
  newCustomers: number;
  veryActiveCustomers: number;
  almostInactiveCustomers: number;
  inactiveCustomers: number;
};

export default function CustomerDashboard() {
  const { status } = useSession();
  const { tenantName } = useTenant();
  
  // Garante Chart.js carregado
  useChartJS();
  
  // Hook para buscar dados reais dos clientes
  const { rawData, loading, accessDenied, reload } = useCustomerData(status === 'authenticated');
  
  // Hook para exportação Excel
  const { exportToExcel } = useExcelExport();
  
  // Estados dos filtros (valores padrão conforme PRD)
  const [newCustomerMonths, setNewCustomerMonths] = useState(1);
  const [inactiveMonths, setInactiveMonths] = useState(2);
  const [almostInactiveMonths, setAlmostInactiveMonths] = useState(1);
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<string[]>([]);
  
  // Calcular data do último pedido usando useMemo para otimização
  const lastPurchaseDate = useMemo(() => {
    if (rawData.length === 0) return null;
    return new Date(Math.max(...rawData.map(row => row.last_purchase ? new Date(row.last_purchase).getTime() : 0)));
  }, [rawData]);
  
  // Hook para análise de evolução temporal
  const evolutionData = useCustomerEvolution({
    rawData,
    inactiveMonths,
    selectedCustomerTypes,
    lastPurchaseDate,
  });
  
  // Filtrar dados baseado nos tipos de cliente selecionados
  const filteredData = useMemo(() => {
    if (selectedCustomerTypes.length === 0) return rawData;
    return rawData.filter(row => 
      row.customer_type && selectedCustomerTypes.includes(row.customer_type)
    );
  }, [rawData, selectedCustomerTypes]);
  
  // Hook para análise LTV
  const { 
    clvData, 
    clvKPIs, 
    clvDistribution, 
    segmentAnalysis 
  } = useCLVAnalysis(filteredData, {
    inactiveMonths,
    almostInactiveMonths,
    lastPurchaseDate
  });
  
  // Estados da UI
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<UnifiedModalData[]>([]);
  
  // Estados dos KPIs e dados calculados
  const [kpis, setKpis] = useState<CustomerKPIs | null>(null);
  const [engagementData, setEngagementData] = useState<CustomerEngagement | null>(null);

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  const calculateKPIs = useCallback((data: CustomerRow[]) => {
    // Usar a data do último pedido como referência em vez da data atual
    const baseDate = lastPurchaseDate || new Date();
    const activeThreshold = new Date(baseDate.getTime() - (inactiveMonths * 30 * 24 * 60 * 60 * 1000));
    const almostInactiveThreshold = new Date(baseDate.getTime() - (almostInactiveMonths * 30 * 24 * 60 * 60 * 1000));
    
    // Agrupar dados por cliente para calcular first_purchase e last_purchase
    const customerData = new Map<string, {
      customer: string;
      customer_type?: string | null;
      totalValue: number;
      totalOrders: number;
      firstPurchase: Date;
      lastPurchase: Date;
    }>();

    // Processar cada linha para agrupar por cliente
    data.forEach(row => {
      if (!row.first_purchase) return;
      
      const customer = row.customer;
      const purchaseDate = new Date(row.first_purchase);
      
      if (!customerData.has(customer)) {
        customerData.set(customer, {
          customer,
          customer_type: row.customer_type,
          totalValue: 0,
          totalOrders: 0,
          firstPurchase: purchaseDate,
          lastPurchase: purchaseDate,
        });
      }
      
      const customerInfo = customerData.get(customer)!;
      customerInfo.totalValue += row.value;
      customerInfo.totalOrders += row.orders;
      
      // Atualizar first e last purchase
      if (purchaseDate < customerInfo.firstPurchase) {
        customerInfo.firstPurchase = purchaseDate;
      }
      if (purchaseDate > customerInfo.lastPurchase) {
        customerInfo.lastPurchase = purchaseDate;
      }
    });

    const customers = Array.from(customerData.values());
    const totalCustomers = customers.length;
    
    // Clientes muito ativos (mesma regra do gráfico - quaseInactiveMonths)
    const activeCustomers = customers.filter(c => c.lastPurchase >= almostInactiveThreshold).length;
    
    // Clientes quase inativos (entre almostInactiveMonths e inactiveMonths)
    const almostInactiveCustomers = customers.filter(c => {
      const lastPurchase = c.lastPurchase;
      return lastPurchase < almostInactiveThreshold && lastPurchase >= activeThreshold;
    }).length;
    
    // Clientes recorrentes (ativos + quase inativos)
    const recurringCustomers = activeCustomers + almostInactiveCustomers;
    
    // Taxa de retenção (ativos / recorrentes)
    const retentionRate = recurringCustomers > 0 ? (activeCustomers / recurringCustomers) * 100 : 0;
    
    // Faturamento dos clientes recorrentes
    const recurringCustomerRevenue = customers
      .filter(c => {
        const lastPurchase = c.lastPurchase;
        return lastPurchase >= activeThreshold; // ativos + quase inativos
      })
      .reduce((sum, c) => sum + c.totalValue, 0);
    
    // Faturamento médio mensal por cliente recorrente
    const averageMonthlyRevenue = recurringCustomers > 0 ? recurringCustomerRevenue / recurringCustomers : 0;
    
    setKpis({
      totalCustomers,
      recurringCustomers,
      activeCustomers,
      retentionRate,
      averageMonthlyRevenue
    });
  }, [inactiveMonths, almostInactiveMonths, lastPurchaseDate]);

  const calculateEngagement = useCallback((data: CustomerRow[]) => {
    // Usar a data do último pedido como referência em vez da data atual
    const baseDate = lastPurchaseDate || new Date();
    const newThreshold = new Date(baseDate.getTime() - (newCustomerMonths * 30 * 24 * 60 * 60 * 1000));
    const almostInactiveThreshold = new Date(baseDate.getTime() - (almostInactiveMonths * 30 * 24 * 60 * 60 * 1000));
    const inactiveThreshold = new Date(baseDate.getTime() - (inactiveMonths * 30 * 24 * 60 * 60 * 1000));
    
    // Agrupar dados por cliente (mesma lógica do calculateKPIs)
    const customerData = new Map<string, {
      customer: string;
      firstPurchase: Date;
      lastPurchase: Date;
    }>();

    data.forEach(row => {
      if (!row.first_purchase) return;
      
      const customer = row.customer;
      const purchaseDate = new Date(row.first_purchase);
      
      if (!customerData.has(customer)) {
        customerData.set(customer, {
          customer,
          firstPurchase: purchaseDate,
          lastPurchase: purchaseDate,
        });
      }
      
      const customerInfo = customerData.get(customer)!;
      
      if (purchaseDate < customerInfo.firstPurchase) {
        customerInfo.firstPurchase = purchaseDate;
      }
      if (purchaseDate > customerInfo.lastPurchase) {
        customerInfo.lastPurchase = purchaseDate;
      }
    });

    const customers = Array.from(customerData.values());
    
    // Clientes novos: primeiro pedido nos últimos X meses
    const newCustomers = customers.filter(c => c.firstPurchase >= newThreshold).length;
    
    // Clientes muito ativos: pedidos nos últimos X meses (almostInactiveMonths)
    const veryActiveCustomers = customers.filter(c => c.lastPurchase >= almostInactiveThreshold).length;
    
    // Clientes quase inativos: último pedido entre almostInactiveMonths e inactiveMonths
    const almostInactiveCustomers = customers.filter(c => {
      const lastPurchase = c.lastPurchase;
      return lastPurchase < almostInactiveThreshold && lastPurchase >= inactiveThreshold;
    }).length;
    
    // Clientes inativos: último pedido antes de inactiveMonths
    const inactiveCustomers = customers.filter(c => c.lastPurchase < inactiveThreshold).length;
    
    setEngagementData({
      newCustomers,
      veryActiveCustomers,
      almostInactiveCustomers,
      inactiveCustomers
    });
  }, [newCustomerMonths, almostInactiveMonths, inactiveMonths, lastPurchaseDate]);

  // Calcular KPIs quando os dados mudarem
  useEffect(() => {
    if (filteredData.length > 0) {
      calculateKPIs(filteredData);
      calculateEngagement(filteredData);
    }
  }, [filteredData, calculateKPIs, calculateEngagement]);

  const formatK = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const formatNumber = (n: number, suffix = '') => {
    return `${n.toLocaleString('pt-BR')}${suffix}`;
  };

  const formatVariation = (v: number, isInteger = false, isPercentagePoints = false) => {
    const sign = v >= 0 ? '+' : '';
    const value = isInteger ? Math.round(v) : v.toFixed(1);
    const suffix = isPercentagePoints ? 'pp' : '%';
    return `${sign}${value}${suffix}`;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Função para aplicar filtros e recarregar dados
  const handleApplyFilters = async () => {
    try {
      await reload();
    } catch (error) {
      console.error('Erro ao recarregar dados:', error);
    }
  };

  // Função para preparar dados dos clientes por categoria
  const getCustomersByCategory = (category: string) => {
    if (!filteredData.length) return [];

    // Usar a data do último pedido como referência em vez da data atual
    const baseDate = lastPurchaseDate || new Date();
    const newThreshold = new Date(baseDate.getTime() - (newCustomerMonths * 30 * 24 * 60 * 60 * 1000));
    const almostInactiveThreshold = new Date(baseDate.getTime() - (almostInactiveMonths * 30 * 24 * 60 * 60 * 1000));
    const inactiveThreshold = new Date(baseDate.getTime() - (inactiveMonths * 30 * 24 * 60 * 60 * 1000));
    
    // Data de início do último mês baseado na data de referência
    const lastMonthStart = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
    const lastMonthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), 0);
    
    // Data de início do mês atual baseado na data de referência
    const currentMonthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const currentMonthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);

    // Agrupar dados por cliente
    const customerData = new Map<string, {
      customer: string;
      customer_type?: string | null;
      totalValue: number;
      totalOrders: number;
      firstPurchase: Date;
      lastPurchase: Date;
      lastMonthValue: number;
      currentMonthValue: number;
    }>();

    filteredData.forEach(row => {
      if (!row.first_purchase) return;
      
      const customer = row.customer;
      const purchaseDate = new Date(row.first_purchase);
      
      if (!customerData.has(customer)) {
        customerData.set(customer, {
          customer,
          customer_type: row.customer_type,
          totalValue: 0,
          totalOrders: 0,
          firstPurchase: purchaseDate,
          lastPurchase: purchaseDate,
          lastMonthValue: 0,
          currentMonthValue: 0,
        });
      }
      
      const customerInfo = customerData.get(customer)!;
      customerInfo.totalValue += row.value;
      customerInfo.totalOrders += row.orders;
      
      // Calcular faturamento do último mês
      if (purchaseDate >= lastMonthStart && purchaseDate <= lastMonthEnd) {
        customerInfo.lastMonthValue += row.value;
      }
      
      // Calcular faturamento do mês atual
      if (purchaseDate >= currentMonthStart && purchaseDate <= currentMonthEnd) {
        customerInfo.currentMonthValue += row.value;
      }
      
      if (purchaseDate < customerInfo.firstPurchase) {
        customerInfo.firstPurchase = purchaseDate;
      }
      if (purchaseDate > customerInfo.lastPurchase) {
        customerInfo.lastPurchase = purchaseDate;
      }
    });

    const customers = Array.from(customerData.values());

    // Filtrar por categoria
    let filteredCustomers: typeof customers = [];
    switch (category) {
      case 'Clientes Novos':
        filteredCustomers = customers.filter(c => c.firstPurchase >= newThreshold);
        break;
      case 'Muito Ativos':
        filteredCustomers = customers.filter(c => c.lastPurchase >= almostInactiveThreshold);
        break;
      case 'Quase Inativos':
        filteredCustomers = customers.filter(c => {
          const lastPurchase = c.lastPurchase;
          return lastPurchase < almostInactiveThreshold && lastPurchase >= inactiveThreshold;
        });
        break;
      case 'Inativos':
        filteredCustomers = customers.filter(c => c.lastPurchase < inactiveThreshold);
        break;
      default:
        filteredCustomers = [];
    }
    
    return filteredCustomers;
  };

  // Função para lidar com clique nas barras do gráfico
  const handleBarClick = (category: string, count: number) => {
    const customers = getCustomersByCategory(category);
    
    // Preparar dados para o modal
    const modalData: UnifiedModalData[] = customers.map(customer => ({
      customer: customer.customer,
      customerType: customer.customer_type ?? 'Sem Categoria',
      totalOrders: customer.totalOrders,
      firstPurchase: customer.firstPurchase,
      lastPurchase: customer.lastPurchase,
      totalValue: customer.totalValue,
      lastMonthRevenue: customer.lastMonthValue,
      currentMonthRevenue: customer.currentMonthValue,
    }));

    setModalTitle(`${category} (${count} clientes)`);
    setModalData(modalData);
    setShowModal(true);
  };

  // Função para lidar com clique nas barras do gráfico de evolução
  const handleEvolutionBarClick = (period: string, data: { maintained: number; new: number; reactivated: number; lost: number; totalStart: number; totalEnd: number; netGrowth: number }) => {
    // Preparar dados para o modal com informações do período
    const modalData: UnifiedModalData[] = [
      {
        customer: `Período: ${period}`,
        customerType: 'Resumo',
        totalOrders: data.maintained + data.new + data.reactivated,
        firstPurchase: new Date(),
        lastPurchase: new Date(),
        totalValue: 0,
        lastMonthRevenue: data.totalStart,
        currentMonthRevenue: data.totalEnd,
      },
      {
        customer: `Clientes Mantidos`,
        customerType: 'Categoria',
        totalOrders: data.maintained,
        firstPurchase: new Date(),
        lastPurchase: new Date(),
        totalValue: 0,
        lastMonthRevenue: 0,
        currentMonthRevenue: 0,
      },
      {
        customer: `Clientes Novos`,
        customerType: 'Categoria',
        totalOrders: data.new,
        firstPurchase: new Date(),
        lastPurchase: new Date(),
        totalValue: 0,
        lastMonthRevenue: 0,
        currentMonthRevenue: 0,
      },
      {
        customer: `Clientes Reativados`,
        customerType: 'Categoria',
        totalOrders: data.reactivated,
        firstPurchase: new Date(),
        lastPurchase: new Date(),
        totalValue: 0,
        lastMonthRevenue: 0,
        currentMonthRevenue: 0,
      },
      {
        customer: `Clientes Perdidos`,
        customerType: 'Categoria',
        totalOrders: data.lost,
        firstPurchase: new Date(),
        lastPurchase: new Date(),
        totalValue: 0,
        lastMonthRevenue: 0,
        currentMonthRevenue: 0,
      },
    ];

    setModalTitle(`Evolução - ${period} (Crescimento: ${data.netGrowth >= 0 ? '+' : ''}${data.netGrowth})`);
    setModalData(modalData);
    setShowModal(true);
  };

  // Função para exportar dados para Excel
  const handleExportToExcel = () => {
    // Calcular os meses para exibir no cabeçalho baseado na data de referência
    const baseDate = lastPurchaseDate || new Date();
    const lastMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
    const currentMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const lastMonthYear = `${monthNames[lastMonth.getMonth()]}/${lastMonth.getFullYear().toString().slice(-2)}`;
    const currentMonthYear = `${monthNames[currentMonth.getMonth()]}/${currentMonth.getFullYear().toString().slice(-2)}`;

    const columns = [
      { key: 'customer', label: 'Cliente', sortable: true },
      { key: 'orders', label: 'Número de Pedidos', sortable: true, formatter: (v: unknown) => formatNumber(v as number) },
      { key: 'firstOrder', label: 'Data do Primeiro Pedido', sortable: true, formatter: (v: unknown) => (v as Date).toLocaleDateString('pt-BR') },
      { key: 'lastOrder', label: 'Data do Último Pedido', sortable: true, formatter: (v: unknown) => (v as Date).toLocaleDateString('pt-BR') },
      { key: 'totalRevenue', label: 'Faturamento Total', sortable: true, formatter: (v: unknown) => formatCurrency(v as number) },
      { key: 'lastMonthRevenue', label: `Faturamento ${lastMonthYear}`, sortable: true, formatter: (v: unknown) => formatCurrency(v as number) },
      { key: 'currentMonthRevenue', label: `Faturamento ${currentMonthYear}`, sortable: true, formatter: (v: unknown) => formatCurrency(v as number) }
    ];

    exportToExcel(modalData, {
      filename: `clientes_${modalTitle.replace(/[^a-zA-Z0-9]/g, '_')}`,
      sheetName: 'Clientes',
      columns
    });
  };

  // Se ainda está carregando, sempre mostrar a tela estilizada
  if (loading) {
    return (
      <div className={loadingStyles.loading}>
        <div className={loadingStyles['bg-animations']}>
          <div className={`${loadingStyles.orb} ${loadingStyles['orb-a']}`}></div>
          <div className={`${loadingStyles.orb} ${loadingStyles['orb-b']}`}></div>
          <div className={loadingStyles['grid-overlay']}></div>
        </div>
        <div className={loadingStyles.spinner}></div>
        <div className={loadingStyles['loading-text']}>Carregando dashboard de clientes...</div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Acesso Negado</h1>
          <p className="text-gray-700">
            Você não tem acesso à planilha de clientes deste tenant.
          </p>
          {accessDenied.sheetUrl && (
            <p className="text-sm text-gray-500 mt-2">
              Email: {accessDenied.email}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Função para formatar período baseado na data de referência
  const formatPeriod = (months: number) => {
    if (!lastPurchaseDate) return `${months} meses`;
    const baseDate = lastPurchaseDate;
    const startDate = new Date(baseDate.getTime() - (months * 30 * 24 * 60 * 60 * 1000));
    const endDate = baseDate;
    return `${startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  };

  // KPIs básicos de clientes
  const basicKpiCards: KPICard[] = [
    {
      title: 'Total de Clientes',
      value: kpis ? formatNumber(kpis.totalCustomers) : '0',
      tooltip: 'Número total de clientes únicos na base'
    },
    {
      title: 'Clientes Recorrentes',
      value: kpis ? formatNumber(kpis.recurringCustomers) : '0',
      tooltip: `Clientes ativos + quase inativos (período: ${formatPeriod(inactiveMonths)})`
    },
    {
      title: 'Clientes Ativos',
      value: kpis ? formatNumber(kpis.activeCustomers) : '0',
      tooltip: `Clientes com pedidos nos últimos ${almostInactiveMonths} meses (período: ${formatPeriod(almostInactiveMonths)})`
    },
    {
      title: 'Taxa de Retenção',
      value: kpis ? `${kpis.retentionRate.toFixed(1)}%` : '0.0%',
      tooltip: 'Percentual de clientes ativos em relação aos clientes recorrentes'
    },
    {
      title: 'Faturamento Médio Mensal (Recorrentes)',
      value: kpis ? formatCurrency(kpis.averageMonthlyRevenue) : 'R$ 0,00',
      tooltip: `Faturamento médio por cliente recorrente (período: ${formatPeriod(inactiveMonths)})`
    }
  ];

  // KPIs específicos do LTV
  const clvKpiCards: KPICard[] = [
    {
      title: 'LTV Médio Total',
      value: clvKPIs ? formatCurrency(clvKPIs.averageCLV) : 'R$ 0,00',
      tooltip: 'Valor médio total gasto por cliente ao longo do tempo'
    },
    {
      title: 'LTV Top 20%',
      value: clvKPIs ? formatCurrency(clvKPIs.top20PercentCLV) : 'R$ 0,00',
      tooltip: 'LTV médio dos 20% clientes mais valiosos'
    },
    {
      title: 'Clientes em Risco',
      value: clvKPIs ? formatNumber(clvKPIs.churnRiskCustomers) : '0',
      tooltip: `Clientes com score de risco > 60% baseado nos parâmetros: quase inativos (${almostInactiveMonths} meses) e inativos (${inactiveMonths} meses)`
    },
    {
      title: 'Freq. Média de Compra',
      value: clvKPIs ? `${clvKPIs.averagePurchaseFrequency.toFixed(2)}/mês` : '0,00/mês',
      tooltip: 'Frequência média de pedidos por mês'
    }
  ];

  return (
    <div className="min-h-screen relative">
      {/* Fundo animado */}
      <div className={vendasStyles['bg-animations']}>
        <div className={`${vendasStyles.orb} ${vendasStyles['orb-a']}`}></div>
        <div className={`${vendasStyles.orb} ${vendasStyles['orb-b']}`}></div>
        <div className={vendasStyles['grid-overlay']}></div>
      </div>

      {/* Header */}
      <header className={vendasStyles['app-header']}>
        <h1 className={vendasStyles.brand}><span>{tenantName}</span> Clientes</h1>
        <div className={vendasStyles['header-right']}>
          {/* TODO: Adicionar filtros aqui */}
        </div>
      </header>

      {/* Container principal */}
      <main className={vendasStyles.container}>
        {/* Filtros */}
        <CustomerFilters
          newCustomerMonths={newCustomerMonths}
          inactiveMonths={inactiveMonths}
          almostInactiveMonths={almostInactiveMonths}
          onNewCustomerMonthsChange={setNewCustomerMonths}
          onInactiveMonthsChange={setInactiveMonths}
          onAlmostInactiveMonthsChange={setAlmostInactiveMonths}
          onApplyFilters={handleApplyFilters}
          lastPurchaseDate={lastPurchaseDate}
          rawData={rawData}
          selectedCustomerTypes={selectedCustomerTypes}
          onCustomerTypesChange={setSelectedCustomerTypes}
        />

        {/* KPIs Básicos */}
        <section className={vendasStyles.charts}>
        <KPISection 
            kpis={basicKpiCards}
          formatK={formatK}
          formatNumber={formatNumber}
          formatVariation={formatVariation}
        />
        </section>

        {/* Gráficos lado a lado */}
        <section className={vendasStyles['charts-side-by-side']}>
          <div className={`${vendasStyles.card} ${vendasStyles['chart-container']}`}>
            <CustomerEvolutionChart
              evolutionData={evolutionData}
              onBarClick={handleEvolutionBarClick}
            />
          </div>
          <div className={`${vendasStyles.card} ${vendasStyles['chart-container']}`}>
            <CustomerEngagementChart
              engagementData={engagementData}
              onBarClick={handleBarClick}
            />
          </div>
        </section>

        {/* KPIs LTV */}
        <section className={vendasStyles.charts}>
          <KPISection 
            kpis={clvKpiCards}
            formatK={formatK}
            formatNumber={formatNumber}
            formatVariation={formatVariation}
          />
        </section>

        {/* Distribuição LTV */}
        <section className={vendasStyles.charts}>
          <div className={vendasStyles.card}>
            <CLVDistributionChart
              data={clvDistribution}
              onBarClick={(bucket) => {
              // Filtrar clientes na faixa de LTV selecionada
              const customersInRange = clvData.filter(customer => 
                customer.clvHistorical >= bucket.min && customer.clvHistorical < bucket.max
              );
              
              const modalData: UnifiedModalData[] = customersInRange.map(customer => ({
                customer: customer.customer,
                customerType: customer.customerType ?? 'Sem Categoria',
                totalValue: customer.totalValue,
                totalOrders: customer.totalOrders,
                averageTicket: customer.averageTicket,
                purchaseFrequency: customer.purchaseFrequency,
                customerLifespan: customer.customerLifespan,
                clvRiskScore: customer.clvRiskScore,
                firstPurchase: customer.firstPurchase,
                lastPurchase: customer.lastPurchase
              }));

              setModalTitle(`${bucket.range} (${bucket.count} clientes)`);
              setModalData(modalData);
              setShowModal(true);
            }}
            />
          </div>
        </section>


        {/* Análise por Segmento LTV */}
        <section className={vendasStyles.charts}>
          <div className={vendasStyles.card}>
            <CLVSegmentAnalysis segmentAnalysis={segmentAnalysis} />
          </div>
        </section>

      </main>

      {/* Modal de detalhes dos clientes */}
      <UnifiedDetailsModal
        show={showModal}
        title={modalTitle}
        rows={modalData}
        columns={(() => {
          // Verificar se os dados contêm informações LTV
          const hasCLVData = modalData.length > 0 && 'clvRiskScore' in modalData[0];
          
          const baseColumns = [
            { key: 'customer', label: 'Cliente', sortable: true, type: 'text' as const },
            { key: 'customerType', label: 'Tipo de Cliente', sortable: true, type: 'text' as const },
            { key: 'totalOrders', label: 'Número de Pedidos', sortable: true, type: 'number' as const },
            { key: 'firstPurchase', label: 'Data do Primeiro Pedido', sortable: true, type: 'date' as const },
            { key: 'lastPurchase', label: 'Data do Último Pedido', sortable: true, type: 'date' as const },
            { key: 'totalValue', label: 'Faturamento Total', sortable: true, type: 'currency' as const }
          ];

          const clvColumns = hasCLVData ? [
            { key: 'averageTicket', label: 'Ticket Médio', sortable: true, type: 'currency' as const },
            { key: 'purchaseFrequency', label: 'Frequência/Mês', sortable: true, type: 'number' as const },
            { key: 'customerLifespan', label: 'Vida do Cliente (meses)', sortable: true, type: 'number' as const },
            { key: 'clvRiskScore', label: 'Score de Risco (%)', sortable: true, type: 'number' as const }
          ] : [];

          return [...baseColumns, ...clvColumns] as ColumnConfig[];
        })()}
        closeAllModals={() => setShowModal(false)}
        onExport={handleExportToExcel}
        defaultSortKey="totalValue"
        defaultSortDirection="desc"
      />
    </div>
  );
}
