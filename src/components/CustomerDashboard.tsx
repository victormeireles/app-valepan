'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useTenant } from '@/hooks/useTenant';
import { useChartJS } from '@/features/common/hooks/useChartJS';
import { KPISection, type KPICard } from '@/features/shared/components/KPISection';
import { DetailsModal, type ModalData } from '@/features/shared/components/DetailsModal';
import { useCustomerData } from '@/features/sales/hooks/useCustomerData';
import CustomerFilters from '@/features/sales/components/CustomerFilters';
import CustomerEngagementChart from '@/features/sales/components/CustomerEngagementChart';
import { useExcelExport } from '@/features/shared/hooks/useExcelExport';
import { CustomerRow } from '@/lib/sheets';
import vendasStyles from '@/styles/vendas.module.css';
import loadingStyles from '@/styles/loading.module.css';

export type CustomerKPIs = {
  totalCustomers: number;
  activeCustomers: number;
  retentionRate: number;
  averageMonthlyRevenue: number;
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
  
  // Estados da UI
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<ModalData[]>([]);
  
  // Estados dos KPIs e dados calculados
  const [kpis, setKpis] = useState<CustomerKPIs | null>(null);
  const [engagementData, setEngagementData] = useState<CustomerEngagement | null>(null);

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  const calculateKPIs = useCallback((data: CustomerRow[]) => {
    const now = new Date();
    const activeThreshold = new Date(now.getTime() - (inactiveMonths * 30 * 24 * 60 * 60 * 1000));
    
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
    
    // Clientes ativos (com pedidos nos últimos X meses)
    const activeCustomers = customers.filter(c => c.lastPurchase >= activeThreshold).length;
    
    // Taxa de retenção
    const retentionRate = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;
    
    // Faturamento dos clientes ativos
    const activeCustomerRevenue = customers
      .filter(c => c.lastPurchase >= activeThreshold)
      .reduce((sum, c) => sum + c.totalValue, 0);
    
    // Faturamento médio mensal por cliente ativo
    const averageMonthlyRevenue = activeCustomers > 0 ? activeCustomerRevenue / activeCustomers : 0;
    
    setKpis({
      totalCustomers,
      activeCustomers,
      retentionRate,
      averageMonthlyRevenue
    });
  }, [inactiveMonths]);

  const calculateEngagement = useCallback((data: CustomerRow[]) => {
    const now = new Date();
    const newThreshold = new Date(now.getTime() - (newCustomerMonths * 30 * 24 * 60 * 60 * 1000));
    const almostInactiveThreshold = new Date(now.getTime() - (almostInactiveMonths * 30 * 24 * 60 * 60 * 1000));
    const inactiveThreshold = new Date(now.getTime() - (inactiveMonths * 30 * 24 * 60 * 60 * 1000));
    
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
  }, [newCustomerMonths, almostInactiveMonths, inactiveMonths]);

  // Calcular KPIs quando os dados mudarem
  useEffect(() => {
    if (rawData.length > 0) {
      calculateKPIs(rawData);
      calculateEngagement(rawData);
    }
  }, [rawData, calculateKPIs, calculateEngagement]);

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
    if (!rawData.length) return [];

    const now = new Date();
    const newThreshold = new Date(now.getTime() - (newCustomerMonths * 30 * 24 * 60 * 60 * 1000));
    const almostInactiveThreshold = new Date(now.getTime() - (almostInactiveMonths * 30 * 24 * 60 * 60 * 1000));
    const inactiveThreshold = new Date(now.getTime() - (inactiveMonths * 30 * 24 * 60 * 60 * 1000));
    
    // Data de início do último mês
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Data de início do mês atual
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

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

    rawData.forEach(row => {
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
    switch (category) {
      case 'Clientes Novos':
        return customers.filter(c => c.firstPurchase >= newThreshold);
      case 'Muito Ativos':
        return customers.filter(c => c.lastPurchase >= almostInactiveThreshold);
      case 'Quase Inativos':
        return customers.filter(c => {
          const lastPurchase = c.lastPurchase;
          return lastPurchase < almostInactiveThreshold && lastPurchase >= inactiveThreshold;
        });
      case 'Inativos':
        return customers.filter(c => c.lastPurchase < inactiveThreshold);
      default:
        return [];
    }
  };

  // Função para lidar com clique nas barras do gráfico
  const handleBarClick = (category: string, count: number) => {
    const customers = getCustomersByCategory(category);
    
    // Preparar dados para o modal
    const modalData: ModalData[] = customers.map(customer => ({
      customer: customer.customer,
      orders: customer.totalOrders,
      firstOrder: customer.firstPurchase,
      lastOrder: customer.lastPurchase,
      totalRevenue: customer.totalValue,
      lastMonthRevenue: customer.lastMonthValue,
      currentMonthRevenue: customer.currentMonthValue,
    }));

    // Calcular o mês anterior para exibir no cabeçalho
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const monthYear = `${monthNames[lastMonth.getMonth()]}/${lastMonth.getFullYear().toString().slice(-2)}`;

    setModalTitle(`${category} (${count} clientes)`);
    setModalData(modalData);
    setShowModal(true);
  };

  // Função para exportar dados para Excel
  const handleExportToExcel = () => {
    // Calcular os meses para exibir no cabeçalho
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
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

  const kpiCards: KPICard[] = [
    {
      title: 'Total de Clientes',
      value: kpis ? formatNumber(kpis.totalCustomers) : '0',
      tooltip: 'Número total de clientes únicos na base'
    },
    {
      title: 'Clientes Ativos',
      value: kpis ? formatNumber(kpis.activeCustomers) : '0',
      tooltip: `Clientes com pedidos nos últimos ${inactiveMonths} meses`
    },
    {
      title: 'Taxa de Retenção',
      value: kpis ? `${kpis.retentionRate.toFixed(1)}%` : '0.0%',
      tooltip: 'Percentual de clientes ativos em relação ao total'
    },
    {
      title: 'Faturamento Médio Mensal',
      value: kpis ? formatCurrency(kpis.averageMonthlyRevenue) : 'R$ 0,00',
      tooltip: 'Faturamento médio por cliente ativo'
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
        />

        {/* KPIs */}
        <KPISection 
          kpis={kpiCards}
          formatK={formatK}
          formatNumber={formatNumber}
          formatVariation={formatVariation}
        />

        {/* Gráfico de Engajamento */}
        <section className={vendasStyles.charts}>
          <div className={vendasStyles.card}>
            <CustomerEngagementChart
              engagementData={engagementData}
              onBarClick={handleBarClick}
            />
          </div>
        </section>
      </main>

      {/* Modal de detalhes dos clientes */}
        <DetailsModal
          show={showModal}
          title={modalTitle}
          rows={modalData}
          columns={(() => {
            // Calcular os meses para exibir no cabeçalho
            const now = new Date();
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
            const lastMonthYear = `${monthNames[lastMonth.getMonth()]}/${lastMonth.getFullYear().toString().slice(-2)}`;
            const currentMonthYear = `${monthNames[currentMonth.getMonth()]}/${currentMonth.getFullYear().toString().slice(-2)}`;
            
            return [
              { key: 'customer', label: 'Cliente', sortable: true },
              { key: 'orders', label: 'Número de Pedidos', sortable: true, formatter: (v: unknown) => formatNumber(v as number) },
              { key: 'firstOrder', label: 'Data do Primeiro Pedido', sortable: true, formatter: (v: unknown) => (v as Date).toLocaleDateString('pt-BR') },
              { key: 'lastOrder', label: 'Data do Último Pedido', sortable: true, formatter: (v: unknown) => (v as Date).toLocaleDateString('pt-BR') },
              { key: 'totalRevenue', label: 'Faturamento Total', sortable: true, formatter: (v: unknown) => formatCurrency(v as number) },
              { key: 'lastMonthRevenue', label: `Faturamento ${lastMonthYear}`, sortable: true, formatter: (v: unknown) => formatCurrency(v as number) },
              { key: 'currentMonthRevenue', label: `Faturamento ${currentMonthYear}`, sortable: true, formatter: (v: unknown) => formatCurrency(v as number) }
            ];
          })()}
          formatK={formatK}
          closeAllModals={() => setShowModal(false)}
          onExport={handleExportToExcel}
        />
    </div>
  );
}
