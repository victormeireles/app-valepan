"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { CustomerRow, fetchSheetData, formatValueBR, formatK } from '@/lib/sheets';
import { useTenant } from '@/hooks/useTenant';
import LoadingOverlay from '@/components/LoadingOverlay';
import DashboardHeader from '@/components/DashboardHeader';
import Tooltip from '@/components/Tooltip';
import vendasStyles from '@/styles/vendas.module.css';
import { createPeriodDates } from '@/features/common/utils/date';

export default function CustomerDashboard() {
  const { data: session, status } = useSession();
  const { tenantName } = useTenant();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para filtros
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<string[]>([]);
  const [customerTypeSearch, setCustomerTypeSearch] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      redirect('/login');
      return;
    }

    loadCustomerData();
  }, [session, status]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...customers];

    // Filtro por tipo de cliente
    if (selectedCustomerTypes.length > 0) {
      filtered = filtered.filter(customer => 
        selectedCustomerTypes.includes(customer.customer_type || 'Não informado')
      );
    }

    // Filtro por período baseado na data_venda
    if (periodStart && periodEnd) {
      const { startDate, endDate } = createPeriodDates(periodStart, periodEnd);
      filtered = filtered.filter(customer => {
        const dataVenda = new Date(customer.data_venda);
        return dataVenda >= startDate && dataVenda <= endDate;
      });
    }

    setFilteredCustomers(filtered);
  }, [customers, selectedCustomerTypes, periodStart, periodEnd]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSheetData('customer');
      setCustomers(data);
    } catch (err) {
      console.error('Erro ao carregar dados de clientes:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingOverlay show={true} message="Carregando dados de clientes..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Erro</h1>
          <p className="text-gray-700">{error}</p>
          <button 
            onClick={loadCustomerData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Calcular KPIs baseados na nova estrutura
  const totalCustomers = [...new Set(filteredCustomers.map(c => c.customer))].length; // Clientes únicos
  const totalValue = filteredCustomers.reduce((sum, customer) => sum + customer.value, 0);
  const totalOrders = [...new Set(filteredCustomers.map(c => c.pedido))].length; // Pedidos únicos
  const avgValuePerCustomer = totalCustomers > 0 ? totalValue / totalCustomers : 0;

  // Dados para filtros
  const customerTypes = [...new Set(customers.map(c => c.customer_type || 'Não informado'))];
  const filteredCustomerTypes = customerTypes.filter(type => 
    type.toLowerCase().includes(customerTypeSearch.toLowerCase())
  );

  // Configuração dos filtros
  const filters = [
    {
      id: 'period',
      label: 'Período',
      type: 'period' as const,
      selectedValues: [periodStart, periodEnd],
      onSelectionChange: (values: string[]) => {
        setPeriodStart(values[0] || '');
        setPeriodEnd(values[1] || '');
      },
      presets: [
        {
          label: 'Este mês',
          action: () => {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setPeriodStart(firstDay.toISOString().split('T')[0]);
            setPeriodEnd(lastDay.toISOString().split('T')[0]);
          }
        },
        {
          label: 'Mês passado',
          action: () => {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
            setPeriodStart(firstDay.toISOString().split('T')[0]);
            setPeriodEnd(lastDay.toISOString().split('T')[0]);
          }
        }
      ]
    },
    {
      id: 'customerType',
      label: 'Tipos de Cliente',
      type: 'select' as const,
      options: filteredCustomerTypes,
      selectedValues: selectedCustomerTypes,
      searchValue: customerTypeSearch,
      onSearchChange: setCustomerTypeSearch,
      onSelectionChange: setSelectedCustomerTypes,
      count: (type: string) => customers.filter(c => (c.customer_type || 'Não informado') === type).length,
      show: customerTypes.length > 0
    }
  ];

  return (
    <div className="min-h-screen relative">
      {/* Fundo animado */}
      <div className={vendasStyles.bgAnimations}>
        <div className={`${vendasStyles.orb} ${vendasStyles.orbA}`}></div>
        <div className={`${vendasStyles.orb} ${vendasStyles.orbB}`}></div>
        <div className={vendasStyles.gridOverlay}></div>
      </div>

      {/* Header */}
      <DashboardHeader
        title="Clientes"
        tenantName={tenantName ?? ''}
        subtitle={`${totalCustomers} clientes únicos no período`}
        filters={filters}
      />

      {/* Container principal */}
      <div className={vendasStyles.container}>

        {/* KPIs */}
        <div className={vendasStyles.kpis}>
          <div className={vendasStyles.kpi}>
            <div className={vendasStyles['kpi-label']}>
              Total de Clientes
              <Tooltip content="Número de clientes únicos no período selecionado" position="top">
                <span className={vendasStyles['kpi-info-icon']}>ⓘ</span>
              </Tooltip>
            </div>
            <div className={vendasStyles['kpi-value']}>
              <div className={vendasStyles['kpi-main-row']}>
                <span className={vendasStyles['kpi-main-value']}>{formatK(totalCustomers)}</span>
              </div>
            </div>
          </div>

          <div className={vendasStyles.kpi}>
            <div className={vendasStyles['kpi-label']}>
              Valor Total
              <Tooltip content="Valor total acumulado no período selecionado" position="top">
                <span className={vendasStyles['kpi-info-icon']}>ⓘ</span>
              </Tooltip>
            </div>
            <div className={vendasStyles['kpi-value']}>
              <div className={vendasStyles['kpi-main-row']}>
                <span className={vendasStyles['kpi-main-value']}>R$ {formatK(totalValue)}</span>
              </div>
            </div>
          </div>

          <div className={vendasStyles.kpi}>
            <div className={vendasStyles['kpi-label']}>
              Total de Pedidos
              <Tooltip content="Número total de pedidos únicos no período selecionado" position="top">
                <span className={vendasStyles['kpi-info-icon']}>ⓘ</span>
              </Tooltip>
            </div>
            <div className={vendasStyles['kpi-value']}>
              <div className={vendasStyles['kpi-main-row']}>
                <span className={vendasStyles['kpi-main-value']}>{formatK(totalOrders)}</span>
              </div>
            </div>
          </div>

          <div className={vendasStyles.kpi}>
            <div className={vendasStyles['kpi-label']}>
              Ticket Médio
              <Tooltip content="Valor médio por cliente no período (Valor Total ÷ Total de Clientes)" position="top">
                <span className={vendasStyles['kpi-info-icon']}>ⓘ</span>
              </Tooltip>
            </div>
            <div className={vendasStyles['kpi-value']}>
              <div className={vendasStyles['kpi-main-row']}>
                <span className={vendasStyles['kpi-main-value']}>R$ {formatK(avgValuePerCustomer)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Clientes */}
        <div className={vendasStyles.card}>
          <h3>Lista de Clientes</h3>
          
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {customers.length === 0 ? 'Nenhum cliente encontrado' : 'Nenhum cliente corresponde aos filtros'}
              </h3>
              <p className="text-gray-500">
                {customers.length === 0 
                  ? 'Verifique se há dados na planilha de clientes.' 
                  : 'Tente ajustar os filtros para ver mais resultados.'
                }
              </p>
            </div>
          ) : (
            <div className={vendasStyles.tableWrap}>
              <div className={vendasStyles.tableScroll}>
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Tipo</th>
                      <th>Data da Venda</th>
                      <th>Pedido</th>
                      <th className={vendasStyles.amount}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer, index) => (
                      <tr key={index}>
                        <td>
                          <div className="text-sm font-medium text-gray-900">
                            {customer.customer}
                          </div>
                        </td>
                        <td>
                          <span className={vendasStyles.badge}>
                            {customer.customer_type || 'Não informado'}
                          </span>
                        </td>
                        <td>
                          {customer.data_venda.toLocaleDateString('pt-BR')}
                        </td>
                        <td>
                          {customer.pedido}
                        </td>
                        <td className={vendasStyles.amount}>
                          {formatValueBR(customer.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
