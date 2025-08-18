'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import KPICard from '@/components/KPICard';
import LoadingOverlay from '@/components/LoadingOverlay';
import PeriodFilter from '@/components/PeriodFilter';
import { SheetRow, fetchSheetData, formatValueBR, formatK } from '@/lib/sheets';

interface DashboardData {
  kpis: {
    faturamento: { value: number; change: number; projection?: number };
    pedidos: { value: number; change: number; projection?: number };
    ticketMedio: { value: number; change: number };
    clientesUnicos: { value: number; change: number };
    faturamentoAnual: { value: number; change: number; projection?: number };
  };
  period: {
    start: string;
    end: string;
  };
}

export default function FaturamentoDashboard() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [rawData, setRawData] = useState<SheetRow[]>([]);

  // Redirect se não autenticado
  if (status === 'unauthenticated') {
    redirect('/login');
  }

  useEffect(() => {
    if (status === 'authenticated') {
      loadDashboardData();
    }
  }, [status]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Buscar dados da API
      const sheetData = await fetchSheetData();
      setRawData(sheetData);
      
      // Calcular período padrão (este mês até hoje)
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      const dashboardData = calculateDashboardData(sheetData, inicioMes, hoje);
      setData(dashboardData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardData = (rows: SheetRow[], startDate: Date, endDate: Date): DashboardData => {
    // Filtrar dados do período atual
    const currentPeriodData = rows.filter(row => 
      row.data >= startDate && row.data <= endDate
    );

    // Calcular período anterior (mesmo intervalo, mês anterior)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousEndDate = new Date(startDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousStartDate.getDate() - daysDiff + 1);

    const previousPeriodData = rows.filter(row => 
      row.data >= previousStartDate && row.data <= previousEndDate
    );

    // Calcular KPIs
    const currentFaturamento = currentPeriodData.reduce((sum, row) => sum + row.valor, 0);
    const previousFaturamento = previousPeriodData.reduce((sum, row) => sum + row.valor, 0);
    const faturamentoChange = previousFaturamento > 0 ? 
      ((currentFaturamento - previousFaturamento) / previousFaturamento) * 100 : 0;

    const currentPedidos = currentPeriodData.length;
    const previousPedidos = previousPeriodData.length;
    const pedidosChange = previousPedidos > 0 ? 
      ((currentPedidos - previousPedidos) / previousPedidos) * 100 : 0;

    const currentTicketMedio = currentPedidos > 0 ? currentFaturamento / currentPedidos : 0;
    const previousTicketMedio = previousPedidos > 0 ? previousFaturamento / previousPedidos : 0;
    const ticketMedioChange = previousTicketMedio > 0 ? 
      ((currentTicketMedio - previousTicketMedio) / previousTicketMedio) * 100 : 0;

    const currentClientesUnicos = new Set(currentPeriodData.map(row => row.cliente)).size;
    const previousClientesUnicos = new Set(previousPeriodData.map(row => row.cliente)).size;
    const clientesUnicosChange = previousClientesUnicos > 0 ? 
      ((currentClientesUnicos - previousClientesUnicos) / previousClientesUnicos) * 100 : 0;

    // Faturamento anual (YTD)
    const anoAtual = new Date().getFullYear();
    const inicioAno = new Date(anoAtual, 0, 1);
    const ytdData = rows.filter(row => row.data >= inicioAno && row.data <= endDate);
    const faturamentoYTD = ytdData.reduce((sum, row) => sum + row.valor, 0);

    const anoAnterior = anoAtual - 1;
    const inicioAnoAnterior = new Date(anoAnterior, 0, 1);
    const fimAnoAnterior = new Date(anoAnterior, endDate.getMonth(), endDate.getDate());
    const ytdDataAnterior = rows.filter(row => row.data >= inicioAnoAnterior && row.data <= fimAnoAnterior);
    const faturamentoYTDAnterior = ytdDataAnterior.reduce((sum, row) => sum + row.valor, 0);
    
    const faturamentoAnualChange = faturamentoYTDAnterior > 0 ? 
      ((faturamentoYTD - faturamentoYTDAnterior) / faturamentoYTDAnterior) * 100 : 0;

    return {
      kpis: {
        faturamento: { 
          value: currentFaturamento, 
          change: faturamentoChange,
          projection: currentFaturamento * 2 // Projeção simples
        },
        pedidos: { 
          value: currentPedidos, 
          change: pedidosChange,
          projection: currentPedidos * 2
        },
        ticketMedio: { 
          value: currentTicketMedio, 
          change: ticketMedioChange 
        },
        clientesUnicos: { 
          value: currentClientesUnicos, 
          change: clientesUnicosChange 
        },
        faturamentoAnual: { 
          value: faturamentoYTD, 
          change: faturamentoAnualChange,
          projection: faturamentoYTD * 2
        },
      },
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      }
    };
  };

  const handlePeriodChange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const dashboardData = calculateDashboardData(rawData, startDate, endDate);
    setData(dashboardData);
  };

  const handlePreset = (preset: 'thisMonth' | 'lastMonth') => {
    const hoje = new Date();
    let startDate: Date, endDate: Date;

    if (preset === 'thisMonth') {
      startDate = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      endDate = new Date(hoje);
    } else {
      startDate = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      endDate = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    }

    const dashboardData = calculateDashboardData(rawData, startDate, endDate);
    setData(dashboardData);
  };

  if (status === 'loading' || loading) {
    return <LoadingOverlay show={true} message="Carregando dashboard..." />;
  }

  if (!session || !data) {
    return <div>Erro ao carregar dados</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LoadingOverlay show={loading} />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <a href="/" className="text-blue-600 hover:text-blue-800">
                ← Voltar
              </a>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard de Faturamento</h1>
                <p className="text-gray-600">Visão geral do faturamento e receitas</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <PeriodFilter
                currentPeriod={data.period}
                onApply={handlePeriodChange}
                onPreset={handlePreset}
              />
              <div className="text-sm text-gray-600">
                {session.user?.name}
              </div>
              <img 
                src={session.user?.image || ""} 
                alt="Avatar" 
                className="w-8 h-8 rounded-full"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <KPICard
            title="Faturamento do Período"
            value={formatValueBR(data.kpis.faturamento.value)}
            change={{
              value: `${data.kpis.faturamento.change.toFixed(1)}%`,
              type: data.kpis.faturamento.change >= 0 ? 'positive' : 'negative'
            }}
            projection={data.kpis.faturamento.projection ? formatK(data.kpis.faturamento.projection) : undefined}
            icon="💰"
          />
          
          <KPICard
            title="Pedidos"
            value={data.kpis.pedidos.value.toString()}
            change={{
              value: `${data.kpis.pedidos.change.toFixed(1)}%`,
              type: data.kpis.pedidos.change >= 0 ? 'positive' : 'negative'
            }}
            projection={data.kpis.pedidos.projection?.toString()}
            icon="📦"
          />
          
          <KPICard
            title="Ticket Médio"
            value={formatValueBR(data.kpis.ticketMedio.value)}
            change={{
              value: `${data.kpis.ticketMedio.change.toFixed(1)}%`,
              type: data.kpis.ticketMedio.change >= 0 ? 'positive' : 'negative'
            }}
            icon="🎫"
          />
          
          <KPICard
            title="Clientes Únicos"
            value={data.kpis.clientesUnicos.value.toString()}
            change={{
              value: `${data.kpis.clientesUnicos.change.toFixed(1)}%`,
              type: data.kpis.clientesUnicos.change >= 0 ? 'positive' : 'negative'
            }}
            icon="👥"
          />
          
          <KPICard
            title={`Faturamento ${new Date().getFullYear()}`}
            value={formatK(data.kpis.faturamentoAnual.value)}
            change={{
              value: `${data.kpis.faturamentoAnual.change.toFixed(1)}%`,
              type: data.kpis.faturamentoAnual.change >= 0 ? 'positive' : 'negative'
            }}
            projection={data.kpis.faturamentoAnual.projection ? formatK(data.kpis.faturamentoAnual.projection) : undefined}
            icon="📈"
          />
        </div>

        {/* Placeholder para gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Faturamento por Semanas</h3>
            <div className="h-64 flex items-center justify-center text-gray-500">
              Gráfico será implementado no próximo passo
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Top Clientes</h3>
            <div className="h-64 flex items-center justify-center text-gray-500">
              Gráfico será implementado no próximo passo
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
