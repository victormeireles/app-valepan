'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { ProductSaleRow, fetchSheetData, fetchSheetMeta, formatK, AccessDeniedError } from '@/lib/sheets';
import { useTenant } from '@/hooks/useTenant';

import vendasStyles from '@/styles/vendas.module.css';
import loadingStyles from '@/styles/loading.module.css';

// Types for Chart.js - using any for external library
declare global {
  interface Window {
    Chart: any;
  }
}

// KPI Types
interface KpiValue {
  valor: number;
  variacao: number;
  projecao?: number;
}

interface KpisData {
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

// Chart Data Types
interface SemanaData {
  label: string;
  faturamento: number;
  margemBruta: number;
  cmv: number;
  inicio: Date;
  fim: Date;
}

interface TopItem {
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

interface RankingItem {
  cliente: string;
  cur: number;
  prev: number;
  delta: number;
  pct: number;
}

interface EngajamentoData {
  sets: {
    novos: Set<unknown>;
    ativos: Set<unknown>;
    quaseInativos: Set<unknown>;
    inativos: Set<unknown>;
  };
}

interface ChartDataStructure {
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

// Modal Data Types - using any for flexibility with different data structures
type ModalData = any;

export default function VendasDashboard() {
  const { data: session, status } = useSession();
  const { tenantName } = useTenant();
  const [rawData, setRawData] = useState<ProductSaleRow[]>([]);
  const [filteredData, setFilteredData] = useState<ProductSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [accessDenied, setAccessDenied] = useState<{ email: string; sheetUrl?: string } | null>(null);

  // Estados dos filtros
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [salesSearch, setSalesSearch] = useState('');

  // Estados da UI
  const [showPeriodPanel, setShowPeriodPanel] = useState(false);
  const [showClientPanel, setShowClientPanel] = useState(false);
  const [showProductPanel, setShowProductPanel] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<ModalData[]>([]);
  
  // Estados para filtro de períodos de engajamento
  const [showEngagementFilter, setShowEngagementFilter] = useState(false);
  const [quaseInativoMeses, setQuaseInativoMeses] = useState(1); // 1 mês = ~30 dias
  const [inativoMeses, setInativoMeses] = useState(2); // 2 meses = ~60 dias
  const [maxPeriodoMeses, setMaxPeriodoMeses] = useState(6); // 6 meses máximo
  // Drilldown substituído por selects dedicados
  const [selectCliente, setSelectCliente] = useState<string>('');
  const [selectProduto, setSelectProduto] = useState<string>('');
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [clientPickerQuery, setClientPickerQuery] = useState('');
  const [productPickerQuery, setProductPickerQuery] = useState('');
  const [clientPickerTemp, setClientPickerTemp] = useState<string>('');
  const [productPickerTemp, setProductPickerTemp] = useState<string>('');

  // Estados dos KPIs e dados calculados
  const [kpis, setKpis] = useState<KpisData | null>(null);
  const [meta, setMeta] = useState<{hasPackages:boolean;hasBoxes:boolean;hasCustomerType:boolean} | null>(null);
  const [chartData, setChartData] = useState<ChartDataStructure | null>(null);
  const [charts, setCharts] = useState<Record<string, any>>({});

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    try {
      const [data, metaResp] = await Promise.all([
        fetchSheetData('vendas'),
        fetchSheetMeta('vendas'),
      ]);

      setRawData(data);
      setMeta(metaResp);

      // Definir período padrão: do primeiro dia do mês até a data da última venda
      if (data.length > 0) {
        const lastDate = new Date(Math.max(...data.map(r => r.data.getTime())));
        const currentMonthStart = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1); // Primeiro dia do mês
        const currentMonthEnd = new Date(lastDate); // Usar a última data diretamente
        
        setPeriodStart(currentMonthStart.toISOString().split('T')[0]);
        setPeriodEnd(currentMonthEnd.toISOString().split('T')[0]);

        // Aplicar filtros iniciais
        applyFilters(data, currentMonthStart, currentMonthEnd, [], []);
      } else {
        // Fallback se não houver dados
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        
        setPeriodStart(inicioMes.toISOString().split('T')[0]);
        setPeriodEnd(fimPeriodo.toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      if (error instanceof AccessDeniedError) {
        setAccessDenied({ email: error.email, sheetUrl: error.sheetUrl });
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && rawData.length === 0 && !accessDenied) {
      loadData();
    }
  }, [status, loadData, rawData.length, accessDenied]);

  // Aplicar filtros iniciais quando rawData e meta estiverem carregados
  useEffect(() => {
    if (rawData.length > 0 && meta && periodStart && periodEnd) {
      const startDate = new Date(periodStart + 'T00:00:00');
      const endDate = new Date(periodEnd + 'T00:00:00');
      applyFilters(rawData, startDate, endDate, [], []);
    }
  }, [rawData, meta, periodStart, periodEnd]);

  // Aplicar filtros
  const applyFilters = (data: ProductSaleRow[], startDate: Date, endDate: Date, clients: string[], products: string[]) => {
    // Ajustar startDate para o início do dia e endDate para o final do dia
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    let filtered = data.filter(row => 
      row.data >= startOfDay && row.data <= endOfDay
    );

    if (clients.length > 0) {
      filtered = filtered.filter(row => clients.includes(row.cliente));
    }
    
    if (products.length > 0) {
      filtered = filtered.filter(row => row.produto && products.includes(row.produto));
    }

    setFilteredData(filtered);
    calculateKPIs(filtered, data, startDate, endDate);
    
    // Calcular período anterior para variações usando a mesma lógica inteligente
    const startDay = startDate.getDate();
    const startMonth = startDate.getMonth();
    const endMonth = endDate.getMonth();
    const endDay = endDate.getDate();
    
    // Verificar se é o último dia do mês
    const isLastDayOfMonth = (date: Date) => {
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      return nextDay.getDate() === 1;
    };
    
    let prevStartDate: Date;
    let prevEndDate: Date;
    
    // Caso 1: date-from = dia 1 e date-to = último dia do mês
    if (startDay === 1 && startMonth === endMonth && isLastDayOfMonth(endDate)) {
      prevStartDate = new Date(startDate.getFullYear(), startMonth - 1, 1);
      prevEndDate = new Date(startDate.getFullYear(), startMonth, 0); // Último dia do mês anterior
    }
    // Caso 2: date-from = dia 1 e mesmo mês
    else if (startDay === 1 && startMonth === endMonth) {
      prevStartDate = new Date(startDate.getFullYear(), startMonth - 1, 1);
      prevEndDate = new Date(startDate.getFullYear(), startMonth - 1, endDay);
    }
    // Caso 3: Regra padrão
    else {
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - daysDiff + 1);
    }
    
    const previousData = data.filter(row => 
      row.data >= prevStartDate && row.data <= prevEndDate
    );
    
    const chartDataResult = generateChartData(filtered, data, previousData, startDate, endDate, meta);
    setChartData(chartDataResult);
  };

    // Calcular KPIs
  const calculateKPIs = (currentData: ProductSaleRow[], allData: ProductSaleRow[], startDate: Date, endDate: Date) => {
    // Ajustar startDate para o início do dia e endDate para o final do dia
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Implementar regras inteligentes para período de comparação
    let prevStartDate: Date;
    let prevEndDate: Date;
    let compareLabel: string;
    
    const startDay = startDate.getDate();
    const startMonth = startDate.getMonth();
    const endMonth = endDate.getMonth();
    const endDay = endDate.getDate();
    
    // Verificar se é o último dia do mês
    const isLastDayOfMonth = (date: Date) => {
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      return nextDay.getDate() === 1;
    };
    
    // Caso 1: date-from = dia 1 e date-to = último dia do mês
    if (startDay === 1 && startMonth === endMonth && isLastDayOfMonth(endDate)) {
      prevStartDate = new Date(startDate.getFullYear(), startMonth - 1, 1);
      prevEndDate = new Date(startDate.getFullYear(), startMonth, 0); // Último dia do mês anterior
      compareLabel = 'mês anterior';
      
      // Garantir que as datas estão corretas
      prevStartDate.setHours(0, 0, 0, 0);
      prevEndDate.setHours(23, 59, 59, 999);
    }
    // Caso 2: date-from = dia 1 e mesmo mês
    else if (startDay === 1 && startMonth === endMonth) {
      prevStartDate = new Date(startDate.getFullYear(), startMonth - 1, 1);
      prevEndDate = new Date(startDate.getFullYear(), startMonth - 1, endDay);
      compareLabel = 'mês anterior';
      
      // Garantir que as datas estão corretas
      prevStartDate.setHours(0, 0, 0, 0);
      prevEndDate.setHours(23, 59, 59, 999);
    }
    // Caso 3: Regra padrão
    else {
      const daysDiff = Math.ceil((endOfDay.getTime() - startOfDay.getTime()) / (1000 * 60 * 60 * 24));
      prevEndDate = new Date(startOfDay);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - daysDiff + 1);
      
      // Garantir que as datas estão corretas
      prevStartDate.setHours(0, 0, 0, 0);
      prevEndDate.setHours(23, 59, 59, 999);
      
      // Determinar compareLabel baseado no período
      if (daysDiff === 7) {
        compareLabel = 'semana anterior';
      } else if (daysDiff >= 28 && daysDiff <= 31) {
        compareLabel = 'mês anterior';
      } else {
        compareLabel = 'período anterior';
      }
    }
    
    const previousData = allData.filter(row => 
      row.data >= prevStartDate && row.data <= prevEndDate
    );
    
    // Validação: garantir que os períodos não se sobreponham
    const hasOverlap = currentData.some(row => 
      row.data >= prevStartDate && row.data <= prevEndDate
    );
    
    if (hasOverlap) {
      console.warn('Aviso: Períodos atual e anterior se sobrepõem. Verificar lógica de datas.');
    }

    // Valores atuais
    const faturamentoAtual = currentData.reduce((sum, row) => sum + row.valorTotal, 0);
    const pedidosAtual = currentData.length;
    const cmvAtual = currentData.reduce((sum, row) => sum + (row.custoTotal || 0), 0);
    const margemBrutaAtual = faturamentoAtual > 0 && cmvAtual > 0 ? (1 - (cmvAtual / faturamentoAtual)) * 100 : (faturamentoAtual > 0 ? 100 : 0);
    const clientesUnicosAtual = new Set(currentData.map(row => row.cliente)).size;
    
    // Novas métricas: quantidade
    const unidadesAtual = currentData.reduce((sum, row) => sum + (row.quantidade || 0), 0);
    const pacotesAtual = currentData.reduce((sum, row) => sum + (row.pacotes || 0), 0);
    const caixasAtual = currentData.reduce((sum, row) => sum + (row.caixas || 0), 0);
    
    // Valores anteriores
    const faturamentoAnterior = previousData.reduce((sum, row) => sum + row.valorTotal, 0);
    const pedidosAnterior = previousData.length;
    const cmvAnterior = previousData.reduce((sum, row) => sum + (row.custoTotal || 0), 0);
    const margemBrutaAnterior = faturamentoAnterior > 0 && cmvAnterior > 0 ? (1 - (cmvAnterior / faturamentoAnterior)) * 100 : (faturamentoAnterior > 0 ? 100 : 0);
    const clientesUnicosAnterior = new Set(previousData.map(row => row.cliente)).size;
    
    // Novas métricas anteriores
    const unidadesAnterior = previousData.reduce((sum, row) => sum + (row.quantidade || 0), 0);
    const pacotesAnterior = previousData.reduce((sum, row) => sum + (row.pacotes || 0), 0);
    const caixasAnterior = previousData.reduce((sum, row) => sum + (row.caixas || 0), 0);

    // Calcular variações
    const calcVariacao = (atual: number, anterior: number) => {
      if (anterior <= 0) return 0;
      const variacao = ((atual - anterior) / anterior) * 100;
      // Arredondar para 1 casa decimal para evitar problemas de precisão
      return Math.round(variacao * 10) / 10;
    };

    // Calcular pontos percentuais (para margem bruta)
    const calcPontosPercentuais = (atual: number, anterior: number) => {
      const pontos = atual - anterior;
      // Arredondar para 1 casa decimal
      return Math.round(pontos * 10) / 10;
    };

    // Calcular ticket médio
    const ticketMedioAtual = pedidosAtual > 0 ? faturamentoAtual / pedidosAtual : 0;
    const ticketMedioAnterior = pedidosAnterior > 0 ? faturamentoAnterior / pedidosAnterior : 0;

    // Faturamento YTD
    const anoAtual = new Date().getFullYear();
    const inicioAno = new Date(anoAtual, 0, 1);
    const ytdData = allData.filter(row => row.data >= inicioAno && row.data <= endDate);
    const faturamentoYTD = ytdData.reduce((sum, row) => sum + row.valorTotal, 0);

    const anoAnterior = anoAtual - 1;
    const inicioAnoAnterior = new Date(anoAnterior, 0, 1);
    const fimAnoAnterior = new Date(anoAnterior, endDate.getMonth(), endDate.getDate());
    const ytdDataAnterior = allData.filter(row => row.data >= inicioAnoAnterior && row.data <= fimAnoAnterior);
    const faturamentoYTDAnterior = ytdDataAnterior.reduce((sum, row) => sum + row.valorTotal, 0);
    
    // Calcular projeção realista para o ano
    const lastDay = new Date(Math.max(...allData.map(row => row.data.getTime())));
    const firstDayOfYear = new Date(lastDay.getFullYear(), 0, 1);
    const pastDays = Math.ceil((lastDay.getTime() - firstDayOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const projecaoAnual = faturamentoYTD * 365 / pastDays;
    
    // Determinar se deve mostrar projeções (como no original)
    const nowRef = new Date();
    const showProjection = startDate.getDate() === 1 && startDate.getMonth() === nowRef.getMonth() && startDate.getFullYear() === nowRef.getFullYear();
    
    // Calcular projeções baseadas no mês anterior completo
    const prevMonthStart = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
    const prevMonthEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 0, 23, 59, 59, 999);
    const prevMonthData = allData.filter(row => row.data >= prevMonthStart && row.data <= prevMonthEnd);
    const prevMonthTotal = prevMonthData.reduce((sum, row) => sum + row.valorTotal, 0);
    const prevMonthOrders = prevMonthData.length;
    
    const projFat = (showProjection && faturamentoAnterior > 0) ? faturamentoAtual * (prevMonthTotal / faturamentoAnterior) : null;
    const projPed = (showProjection && pedidosAnterior > 0) ? pedidosAtual * (prevMonthOrders / pedidosAnterior) : null;
    
    setKpis({
        faturamento: { 
          valor: faturamentoAtual,
          variacao: calcVariacao(faturamentoAtual, faturamentoAnterior),
          projecao: projFat || faturamentoAtual * 2
        },
        pedidos: { 
          valor: pedidosAtual,
          variacao: calcVariacao(pedidosAtual, pedidosAnterior),
          projecao: projPed || pedidosAtual * 2
        },
        ticketMedio: {
          valor: ticketMedioAtual,
          variacao: calcVariacao(ticketMedioAtual, ticketMedioAnterior)
        },
        margemBruta: { 
          valor: margemBrutaAtual,
          variacao: calcPontosPercentuais(margemBrutaAtual, margemBrutaAnterior)
        },
        clientesUnicos: { 
          valor: clientesUnicosAtual,
          variacao: clientesUnicosAtual - clientesUnicosAnterior
        },
        unidades: {
          valor: unidadesAtual,
          variacao: calcVariacao(unidadesAtual, unidadesAnterior)
        },
        pacotes: {
          valor: pacotesAtual,
          variacao: calcVariacao(pacotesAtual, pacotesAnterior)
        },
        caixas: {
          valor: caixasAtual,
          variacao: calcVariacao(caixasAtual, caixasAnterior)
        },
        faturamentoAnual: { 
          valor: faturamentoYTD,
          variacao: calcVariacao(faturamentoYTD, faturamentoYTDAnterior),
          projecao: projecaoAnual
        },
        compareLabel,
        showProjection
    });
  };

  // Gerar dados para gráficos
  const generateChartData = (filteredData: ProductSaleRow[], allData: ProductSaleRow[], previousData: ProductSaleRow[], startDate: Date, endDate: Date, meta: {hasPackages:boolean;hasBoxes:boolean;hasCustomerType:boolean} | null) => {
    // Ajustar startDate para o início do dia e endDate para o final do dia
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Últimas 8 semanas baseadas na regra: início = date-to - 55 dias, fim = date-to
    const semanas = [];
    
    // Usar a data final do período como referência
    const endRef = new Date(endOfDay);
    
    // Função helper para formatar DD/MM
    const formatDDMM = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}`;
    };
    
    // Gerar 8 semanas baseadas na regra: início = date-to - 55 dias, fim = date-to
    const totalDays = 55; // Total de dias para cobrir
    const daysPerWeek = Math.ceil(totalDays / 8); // Dividir em 8 semanas
    
    for (let i = 0; i < 8; i++) {
      const weekEnd = new Date(endRef.getTime() - i * daysPerWeek * 24 * 60 * 60 * 1000);
      const weekStart = new Date(weekEnd.getTime() - (daysPerWeek - 1) * 24 * 60 * 60 * 1000);
      
      // Para o gráfico evolutivo, usar sempre TODOS os dados (allData) no período específico das semanas
      // Apenas aplicar filtro de cliente se houver
      let dataToUse = allData;
      if (filteredData.length < allData.length) {
        // Se há filtro de cliente, aplicar apenas esse filtro aos dados completos
        const clientesFiltrados = new Set(filteredData.map(row => row.cliente));
        dataToUse = allData.filter(row => clientesFiltrados.has(row.cliente));
      }
      
      const dadosSemana = dataToUse.filter(row => 
        row.data >= new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()) && 
        row.data <= weekEnd
      );
      
      const faturamento = dadosSemana.reduce((sum, row) => sum + row.valorTotal, 0);
      const cmv = dadosSemana.reduce((sum, row) => sum + (row.custoTotal || 0), 0);
      const margemBruta = faturamento > 0 && cmv > 0 ? (1 - (cmv / faturamento)) * 100 : (faturamento > 0 ? 100 : 0);
      
      semanas.unshift({
        label: `${formatDDMM(weekStart)}–${formatDDMM(weekEnd)}`,
        faturamento,
        cmv,
        margemBruta,
        inicio: weekStart,
        fim: weekEnd
      });
    }

    // Top clientes
    const clienteMap = new Map<string, number>();
    const clienteCMVMap = new Map<string, number>();
    
    filteredData.forEach(row => {
      clienteMap.set(row.cliente, (clienteMap.get(row.cliente) || 0) + row.valorTotal);
      clienteCMVMap.set(row.cliente, (clienteCMVMap.get(row.cliente) || 0) + (row.custoTotal || 0));
    });
    
    const cores = ['#1E88E5', '#00d3a7', '#e67e22', '#f4c27a', '#c0392b', '#888'];
    const allClientes = Array.from(clienteMap.entries()).sort(([,a], [,b]) => b - a);
    
    // Top 5 + Outros
    const top5 = allClientes.slice(0, 5);
    const outros = allClientes.slice(5);
    const outrosTotal = outros.reduce((sum, [, valor]) => sum + valor, 0);
    
    // Calcular margem bruta para "Outros" (média ponderada)
    const outrosCMV = outros.reduce((sum, [cliente]) => sum + (clienteCMVMap.get(cliente) || 0), 0);
    let outrosMargemBruta = 0;
    if (outrosTotal > 0 && outrosCMV > 0) {
      outrosMargemBruta = Math.round((1 - (outrosCMV / outrosTotal)) * 100);
      outrosMargemBruta = Math.max(-100, Math.min(100, outrosMargemBruta));
    } else if (outrosTotal > 0 && outrosCMV === 0) {
      outrosMargemBruta = 100;
    } else if (outrosTotal === 0 && outrosCMV > 0) {
      outrosMargemBruta = -100;
    }
    
    const topClientes = [
      ...top5.map(([cliente, valor], index) => {
        const cmv = clienteCMVMap.get(cliente) || 0;
        // Calcular margem bruta com validação
        let margemBruta = 0;
        if (valor > 0 && cmv > 0) {
          margemBruta = Math.round((1 - (cmv / valor)) * 100);
          // Garantir que a margem bruta esteja entre -100% e 100%
          margemBruta = Math.max(-100, Math.min(100, margemBruta));
        } else if (valor > 0 && cmv === 0) {
          margemBruta = 100; // Se não há custo, margem é 100%
        } else if (valor === 0 && cmv > 0) {
          margemBruta = -100; // Se não há receita mas há custo, margem é -100%
        }
        
        return {
          cliente,
          valor,
          cmv,
          margemBruta,
          cor: cores[index]
        };
      }),
      // Adicionar "Outros" se houver clientes além do Top 5
      ...(outros.length > 0 ? [{
        cliente: 'Outros',
        valor: outrosTotal,
        cmv: outrosCMV,
        margemBruta: outrosMargemBruta,
        cor: cores[5] // Cor cinza para "Outros"
      }] : [])
    ];

    // Top produtos
    const produtoMap = new Map<string, number>();
    const produtoCMVMap = new Map<string, number>();
    
    filteredData.forEach(row => {
      if (row.produto) {
        produtoMap.set(row.produto, (produtoMap.get(row.produto) || 0) + row.valorTotal);
        produtoCMVMap.set(row.produto, (produtoCMVMap.get(row.produto) || 0) + (row.custoTotal || 0));
      }
    });
    
    const allProdutos = Array.from(produtoMap.entries()).sort(([,a], [,b]) => b - a);
    
    // Top 5 + Outros
    const top5Produtos = allProdutos.slice(0, 5);
    const outrosProdutos = allProdutos.slice(5);
    const outrosProdutosTotal = outrosProdutos.reduce((sum, [, valor]) => sum + valor, 0);
    
    // Calcular margem bruta para "Outros" (média ponderada)
    const outrosProdutosCMV = outrosProdutos.reduce((sum, [produto]) => sum + (produtoCMVMap.get(produto) || 0), 0);
    let outrosProdutosMargemBruta = 0;
    if (outrosProdutosTotal > 0 && outrosProdutosCMV > 0) {
      outrosProdutosMargemBruta = Math.round((1 - (outrosProdutosCMV / outrosProdutosTotal)) * 100);
      outrosProdutosMargemBruta = Math.max(-100, Math.min(100, outrosProdutosMargemBruta));
    } else if (outrosProdutosTotal > 0 && outrosProdutosCMV === 0) {
      outrosProdutosMargemBruta = 100;
    } else if (outrosProdutosTotal === 0 && outrosProdutosCMV > 0) {
      outrosProdutosMargemBruta = -100;
    }
    
    const outrosProdutosPacotes = outrosProdutos.reduce((sum, [produto]) => {
      const produtoRows = filteredData.filter(row => row.produto === produto);
      const pac = produtoRows.reduce((acc, row) => acc + (row.pacotes || 0), 0);
      return sum + pac;
    }, 0);
    
    const outrosProdutosQuantidade = outrosProdutos.reduce((sum, [produto]) => {
      const produtoRows = filteredData.filter(row => row.produto === produto);
      const qtd = produtoRows.reduce((acc, row) => acc + (row.quantidade || 0), 0);
      return sum + qtd;
    }, 0);
    
    const topProdutos = [
      ...top5Produtos.map(([produto, valor], index) => {
        const cmv = produtoCMVMap.get(produto) || 0;
        
        // Calcular preço médio e custo médio por pacote
        const produtoRows = filteredData.filter(row => row.produto === produto);
        const quantidadeTotal = produtoRows.reduce((sum, row) => sum + (row.quantidade || 0), 0);
        const pacotesTotal = produtoRows.reduce((sum, row) => sum + (row.pacotes || 0), 0);
        
        // Calcular preço médio por pacote: soma(valor) / soma(pacotes)
        const precoMedioPorPacote = pacotesTotal > 0 ? valor / pacotesTotal : 0;
        
        // Calcular custo médio por pacote: soma(cmv) / soma(pacotes)
        const custoMedioPorPacote = pacotesTotal > 0 ? cmv / pacotesTotal : 0;
        
        // Calcular margem bruta com validação
        let margemBruta = 0;
        if (valor > 0 && cmv > 0) {
          margemBruta = Math.round((1 - (cmv / valor)) * 100);
          // Garantir que a margem bruta esteja entre -100% e 100%
          margemBruta = Math.max(-100, Math.min(100, margemBruta));
        } else if (valor > 0 && cmv === 0) {
          margemBruta = 100; // Se não há custo, margem é 100%
        } else if (valor === 0 && cmv > 0) {
          margemBruta = -100; // Se não há receita mas há custo, margem é -100%
        }
        
        return {
          produto,
          valor,
          cmv,
          margemBruta,
          precoMedioPorPacote,
          custoMedioPorPacote,
          quantidadeTotal,
          pacotesTotal,
          cor: cores[index]
        };
      }),
      // Adicionar "Outros" se houver produtos além do Top 5
      ...(outrosProdutos.length > 0 ? [{
        produto: 'Outros',
        valor: outrosProdutosTotal,
        cmv: outrosProdutosCMV,
        margemBruta: outrosProdutosMargemBruta,
        precoMedioPorPacote: outrosProdutosPacotes > 0 ? outrosProdutosTotal / outrosProdutosPacotes : 0,
        custoMedioPorPacote: outrosProdutosPacotes > 0 ? outrosProdutosCMV / outrosProdutosPacotes : 0,
        quantidadeTotal: outrosProdutosQuantidade,
        pacotesTotal: outrosProdutosPacotes,
        cor: cores[5] // Cor cinza para "Outros"
      }] : [])
    ];

    // Calcular limites da margem bruta para o eixo secundário
    const margensBrutas = semanas.map(s => s.margemBruta).filter(m => !isNaN(m) && m > 0);
    const minMargem = Math.min(...margensBrutas);
    const maxMargem = Math.max(...margensBrutas);
    const margemRange = maxMargem - minMargem;
    const y1Min = Math.max(0, minMargem - 5);
    const y1Max = maxMargem + 15;

    // Top tipos de cliente (apenas se meta.hasCustomerType for true)
    let topTiposCliente: TopItem[] = [];

    if (meta?.hasCustomerType) {
      const tipoClienteMap = new Map<string, number>();
      const tipoClienteCMVMap = new Map<string, number>();
      
      filteredData.forEach(row => {
        if (row.tipoCliente) {
          tipoClienteMap.set(row.tipoCliente, (tipoClienteMap.get(row.tipoCliente) || 0) + row.valorTotal);
          tipoClienteCMVMap.set(row.tipoCliente, (tipoClienteCMVMap.get(row.tipoCliente) || 0) + (row.custoTotal || 0));
        }
      });
      

      
      const allTiposCliente = Array.from(tipoClienteMap.entries()).sort(([,a], [,b]) => b - a);
      
      // Top 5 + Outros
      const top5TiposCliente = allTiposCliente.slice(0, 5);
      const outrosTiposCliente = allTiposCliente.slice(5);
      const outrosTiposClienteTotal = outrosTiposCliente.reduce((sum, [, valor]) => sum + valor, 0);
      
      // Calcular margem bruta para "Outros" (média ponderada)
      const outrosTiposClienteCMV = outrosTiposCliente.reduce((sum, [tipoCliente]) => sum + (tipoClienteCMVMap.get(tipoCliente) || 0), 0);
      let outrosTiposClienteMargemBruta = 0;
      if (outrosTiposClienteTotal > 0 && outrosTiposClienteCMV > 0) {
        outrosTiposClienteMargemBruta = Math.round((1 - (outrosTiposClienteCMV / outrosTiposClienteTotal)) * 100);
        outrosTiposClienteMargemBruta = Math.max(-100, Math.min(100, outrosTiposClienteMargemBruta));
      } else if (outrosTiposClienteTotal > 0 && outrosTiposClienteCMV === 0) {
        outrosTiposClienteMargemBruta = 100;
      } else if (outrosTiposClienteTotal === 0 && outrosTiposClienteCMV > 0) {
        outrosTiposClienteMargemBruta = -100;
      }
      
      topTiposCliente = [
        ...top5TiposCliente.map(([tipoCliente, valor], index) => {
          const cmv = tipoClienteCMVMap.get(tipoCliente) || 0;
          
          // Calcular margem bruta com validação
          let margemBruta = 0;
          if (valor > 0 && cmv > 0) {
            margemBruta = Math.round((1 - (cmv / valor)) * 100);
            // Garantir que a margem bruta esteja entre -100% e 100%
            margemBruta = Math.max(-100, Math.min(100, margemBruta));
          } else if (valor > 0 && cmv === 0) {
            margemBruta = 100; // Se não há custo, margem é 100%
          } else if (valor === 0 && cmv > 0) {
            margemBruta = -100; // Se não há receita mas há custo, margem é -100%
          }
          
          return {
            cliente: tipoCliente,
            valor,
            cmv,
            margemBruta,
            cor: cores[index]
          };
        }),
        // Adicionar "Outros" se houver tipos de cliente além do Top 5
        ...(outrosTiposCliente.length > 0 ? [{
          cliente: 'Outros',
          valor: outrosTiposClienteTotal,
          cmv: outrosTiposClienteCMV,
          margemBruta: outrosTiposClienteMargemBruta,
          cor: cores[5] // Cor cinza para "Outros"
        }] : [])
      ];
    }

    // Rankings de variação por cliente (top 5 up/down) - como no original
    const sumByClient = (data: ProductSaleRow[]) => {
      const m = new Map<string, number>();
      for (const row of data) {
        m.set(row.cliente, (m.get(row.cliente) || 0) + row.valorTotal);
      }
      return m;
    };
    
    // Calcular totais por cliente para período atual e anterior
    // IMPORTANTE: Para variações, sempre considerar TODOS os clientes que venderam em qualquer período
    // Isso garante que clientes que caíram para zero sejam incluídos
    const curByCli = sumByClient(filteredData);
    const prevByCli = sumByClient(previousData);
    
    // Combinar todos os clientes únicos de ambos os períodos
    const allClients = new Set([...curByCli.keys(), ...prevByCli.keys()]);
    
    const variations = [];
    for (const cliente of allClients) {
      const cur = curByCli.get(cliente) || 0;
      const prev = prevByCli.get(cliente) || 0;
      const delta = cur - prev;
      const pct = prev === 0 ? (cur > 0 ? 100 : 0) : (delta / prev * 100);
      
      // Incluir TODOS os clientes que aparecem em qualquer período
      // Isso garante que clientes que caíram para zero sejam incluídos
      variations.push({ cliente, cur, prev, delta, pct });
    }
    
    // Ordenar por delta (maior para menor)
    variations.sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
    
    const rankingUp = variations
      .filter(item => (item.delta ?? 0) > 0)
      .slice(0, 5);
    
    const rankingDown = variations
      .filter(item => (item.delta ?? 0) < 0)
      .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0)) // Ordenar do mais negativo para o menos negativo (maior queda em absoluto primeiro)
      .slice(0, 5);

    // Lógica de engajamento corrigida baseada em date-to
    const msDay = 24 * 60 * 60 * 1000;
    const dateTo = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
    
    // Calcular datas de corte baseado em date-to
    const quaseInativoDias = quaseInativoMeses * 30; // 1 mês = 30 dias
    const inativoDias = inativoMeses * 30; // 2 meses = 60 dias
    const maxPeriodoDias = maxPeriodoMeses * 30; // 6 meses = 180 dias
    
    const dateToMinus1Month = new Date(dateTo.getTime() - quaseInativoDias * msDay);
    const dateToMinus2Months = new Date(dateTo.getTime() - inativoDias * msDay);
    const dateToMinus6Months = new Date(dateTo.getTime() - maxPeriodoDias * msDay);

    // Usar filteredData se houver filtro de cliente, senão usar allData
    const dataToUse = filteredData.length < allData.length ? filteredData : allData;
    
    // Calcular primeira compra na história por cliente
    const firstByClient = new Map();
    for (const r of allData) {
      const prev = firstByClient.get(r.cliente);
      if (!prev || r.data < prev) firstByClient.set(r.cliente, r.data);
    }
    
    // Calcular última compra por cliente
    const lastPurchaseByClient = new Map();
    for (const r of allData) {
      const prev = lastPurchaseByClient.get(r.cliente);
      if (!prev || r.data > prev) lastPurchaseByClient.set(r.cliente, r.data);
    }
    
    // Classificar clientes baseado na lógica corrigida
    const setNovos = new Set();
    const setAtivos = new Set();
    const setQuase = new Set();
    const setInativos = new Set();
    
    for (const cliente of new Set(dataToUse.map(r => r.cliente))) {
      const lastPurchase = lastPurchaseByClient.get(cliente);
      const firstPurchase = firstByClient.get(cliente);
      
      if (!lastPurchase) continue;
      
      // Caso 1: última compra > date-to - 1 mês and última compra <= date-to
      if (lastPurchase > dateToMinus1Month && lastPurchase <= dateTo) {
        // 1.1: se primeira compra na história > date-to - 1 mês: novos
        if (firstPurchase > dateToMinus1Month) {
          setNovos.add(cliente);
        } else {
          // 1.2: senão, ativos
          setAtivos.add(cliente);
        }
      }
      // Caso 2: não entrou no caso 1, mas última compra > date-to - 2 meses
      else if (lastPurchase > dateToMinus2Months) {
        setQuase.add(cliente);
      }
      // Caso 3: não entrou no caso 1 nem 2, mas última compra > date-to - 6 meses
      else if (lastPurchase > dateToMinus6Months) {
        setInativos.add(cliente);
      }
      // Caso 4: senão, nem entra no dashboard (perdidos)
    }

    // Ativos devem EXCLUIR os Novos
    const setAtivosSemNovos = new Set(Array.from(setAtivos).filter(c => !setNovos.has(c)));

    const engajamento = {
      novos: setNovos.size,
      ativos: setAtivosSemNovos.size,
      quase: setQuase.size,
      churn: setInativos.size,
      sets: {
        novos: setNovos,
        ativos: setAtivosSemNovos,
        quaseInativos: setQuase,
        inativos: setInativos
      }
    };

    return {
      semanas,
      topClientes,
      topProdutos,
      topTiposCliente,
      rankingUp,
      rankingDown,
      engajamento,
      y1Limits: { min: y1Min, max: y1Max }
    };
  };

    // Carregar Chart.js dinamicamente
    useEffect(() => {
      const loadChartJS = async () => {
        if (typeof window !== 'undefined' && !window.Chart) {
          try {
            const { Chart } = await import('chart.js/auto');
            window.Chart = Chart;
          } catch (error) {
            console.error('Erro ao carregar Chart.js:', error);
          }
        }
      };

      loadChartJS();
    }, []);

    // Renderizar gráficos
    useEffect(() => {
      if (chartData && typeof window !== 'undefined' && window.Chart) {
        renderCharts();
      }
    }, [chartData]); // Remover loading como dependência

  const renderCharts = () => {
    if (!chartData) {
      return;
    }

    // Destruir gráficos existentes
    Object.values(charts).forEach((chart: any) => {
      if (chart && chart.destroy) chart.destroy();
    });

    const newCharts: Record<string, any> = {};

    // Gráfico de semanas
    const ctxSemanas = document.getElementById('chart-semanas') as HTMLCanvasElement;
    if (ctxSemanas) {
      newCharts.semanas = new window.Chart(ctxSemanas, {
        type: 'bar',
        data: {
          labels: chartData.semanas.map((s: SemanaData) => s.label),
          datasets: [
            {
              label: 'Margem Bruta',
              data: chartData.semanas.map((s: SemanaData) => s.margemBruta),
              type: 'line',
              borderColor: '#FFA726',
              backgroundColor: 'rgba(255, 107, 107, 0.1)',
              borderWidth: 3,
              pointBackgroundColor: '#FFA726',
              pointBorderColor: '#FFA726',
              pointBorderWidth: 0,
              pointRadius: 6,
              pointHoverRadius: 8,
              fill: false,
              tension: 0.4,
              yAxisID: 'y1',
              order: 1
            },
            {
              label: 'Faturamento',
              data: chartData.semanas.map((s: SemanaData) => s.faturamento),
              backgroundColor: '#1E88E5',
              borderRadius: 8,
              borderSkipped: 'bottom',
              yAxisID: 'y',
              order: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 8, right: 8, left: 8, bottom: 8 } },
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: { 
            legend: { 
              display: true,
              position: 'top',
              labels: {
                color: '#c9cbd6',
                usePointStyle: true,
                padding: 20
              }
            },
            tooltip: { 
              callbacks: { 
                label: (ctx: any) => {
                  if (ctx.dataset.label === 'Faturamento') {
                    return `Faturamento: ${formatK(ctx.parsed.y)}`;
                  } else if (ctx.dataset.label === 'Margem Bruta') {
                    return `Margem Bruta: ${ctx.parsed.y.toFixed(1)}%`;
                  }
                  return ctx.dataset.label;
                }
              } 
            }
          },
          scales: {
            y: { 
              type: 'linear',
              display: false,
              position: 'left',
              grace: '10%',
              beginAtZero: true,
              grid: { color: 'rgba(255,255,255,0.1)' },
              ticks: { 
                color: '#c9cbd6',
                callback: (v: number) => {
                  // Formatação com 0 casas decimais para o eixo Y
                  if (v >= 1000000) {
                    return `${Math.round(v / 1000000)}M`;
                  } else if (v >= 1000) {
                    return `${Math.round(v / 1000)}k`;
                  }
                  return Math.round(v).toString();
                }
              }
            },
            y1: {
              type: 'linear',
              display: false,
              position: 'right',
              grace: '0%',
              beginAtZero: false,
              min: chartData.y1Limits?.min || 0,
              max: chartData.y1Limits?.max || 100,
              grid: { drawOnChartArea: false },
              ticks: { 
                color: '#FFA726',
                callback: (v: number) => `${v.toFixed(1)}%`
              }
            },
            x: { 
              grid: { display: false },
              ticks: { color: '#c9cbd6' }
            }
          }
        },
        plugins: [{
          id: 'datalabels',
          afterDatasetsDraw: (chart: any) => {
            const { ctx, data } = chart;
            
            // Mostrar valores do faturamento nas barras (azuis)
            const faturamentoDataset = chart.data.datasets[1]; // Dataset das barras
            const faturamentoMeta = chart.getDatasetMeta(1);
            faturamentoMeta.data.forEach((bar: any, index: number) => {
              const value = faturamentoDataset.data[index];
              if (value > 0) {
                ctx.fillStyle = '#cfe2ff'; // Cor azul clara para o texto
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                // Formatação com 0 casas decimais para faturamento
                const formatValue = (val: number) => {
                  if (val >= 1000000) {
                    return `${Math.round(val / 1000000)}M`;
                  } else if (val >= 1000) {
                    return `${Math.round(val / 1000)}k`;
                  }
                  return Math.round(val).toString();
                };
                ctx.fillText(formatValue(value), bar.x, bar.y - 5);
              }
            });
            
            // Mostrar valores da margem bruta nos pontos da linha (vermelhos)
            const margemDataset = chart.data.datasets[0]; // Dataset da linha
            const margemMeta = chart.getDatasetMeta(0);
            margemMeta.data.forEach((point: any, index: number) => {
              const value = margemDataset.data[index];
              if (value > 0) {
                ctx.fillStyle = '#FFF'; // Cor vermelha da linha
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${value.toFixed(1)}%`, point.x, point.y - 15);
              }
            });
          }
        }]
      });

      // Implementar click para filtrar período
      ctxSemanas.style.cursor = 'pointer';
      ctxSemanas.onclick = (evt: MouseEvent) => {
        // Verificar se chartData e semanas existem
        if (!chartData || !chartData.semanas || !Array.isArray(chartData.semanas)) {
          console.warn('Dados de semanas não disponíveis para click');
          return;
        }

        const points = newCharts.semanas.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
        if (!points || points.length === 0) return;
        const index = points[0].index;
        
        // Verificar se o índice é válido
        if (index < 0 || index >= chartData.semanas.length) {
          console.warn('Índice de semana inválido:', index);
          return;
        }
        
        // Recuperar dados da semana clicada
        const clickedWeek = chartData.semanas[index];
        if (clickedWeek && clickedWeek.inicio && clickedWeek.fim) {
          try {
            // Usar as datas já calculadas da semana
            const inicioSemana = new Date(clickedWeek.inicio);
            const fimSemana = new Date(clickedWeek.fim);
            
            // Verificar se as datas são válidas
            if (isNaN(inicioSemana.getTime()) || isNaN(fimSemana.getTime())) {
              console.warn('Datas inválidas na semana clicada:', clickedWeek);
              return;
            }
            
            // Atualizar filtros
            setPeriodStart(inicioSemana.toISOString().split('T')[0]);
            setPeriodEnd(fimSemana.toISOString().split('T')[0]);
            
            // Reaplicar filtros
            applyFilters(rawData, inicioSemana, fimSemana, selectedClients, selectedProducts);
            
          } catch (error) {
            console.error('Erro ao processar datas da semana:', error);
          }
        } else {
          console.warn('Dados da semana incompletos:', clickedWeek);
        }
      };
    }

    // Gráfico de clientes (donut)
    const ctxClientes = document.getElementById('chart-clientes') as HTMLCanvasElement;
    if (ctxClientes) {
      // Remover atributos de tamanho para usar CSS
      ctxClientes.removeAttribute('width');
      ctxClientes.removeAttribute('height');
      
      const totalPeriodo = chartData.topClientes.reduce((sum: number, c: TopItem) => sum + c.valor, 0) || 1;
      
      newCharts.clientes = new window.Chart(ctxClientes, {
        type: 'doughnut',
        data: {
          labels: chartData.topClientes.map((c: TopItem) => c.cliente),
          datasets: [{
            data: chartData.topClientes.map((c: TopItem) => c.valor),
            backgroundColor: chartData.topClientes.map((c: TopItem) => c.cor),
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: any) => {
                  const v = ctx.parsed;
                  const pct = (v / totalPeriodo * 100) || 0;
                  return `${ctx.label}: ${formatK(v)} (${pct.toFixed(1)}%)`;
                }
              }
            }
          }
        },
        plugins: [{
          id: 'datalabels',
          afterDatasetsDraw: (chart: any) => {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset: any, i: number) => {
              const meta = chart.getDatasetMeta(i);
              meta.data.forEach((arc: any, index: number) => {
                const value = dataset.data[index];
                const pct = (value / totalPeriodo * 100) || 0;
                if (pct >= 6) { // Só mostra se >= 6%
                  const { x, y } = arc.getCenterPoint();
                  ctx.fillStyle = '#eaf1ff';
                  ctx.strokeStyle = 'rgba(10,14,20,.45)';
                  ctx.lineWidth = 3;
                  ctx.font = 'bold 11px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.strokeText(`${pct.toFixed(0)}%`, x, y);
                  ctx.fillText(`${pct.toFixed(0)}%`, x, y);
                }
              });
            });
          }
        }]
      });

      // Implementar click para filtrar por cliente
      ctxClientes.style.cursor = 'pointer';
      ctxClientes.onclick = (evt: MouseEvent) => {
        const points = newCharts.clientes.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
        if (!points || points.length === 0) return;
        const index = points[0].index;
        
        // Verificar se chartData e topClientes existem
        if (!chartData || !chartData.topClientes || !Array.isArray(chartData.topClientes)) {
          console.warn('Dados de clientes não disponíveis para click');
          return;
        }
        
        // Verificar se o índice é válido
        if (index < 0 || index >= chartData.topClientes.length) {
          console.warn('Índice de cliente inválido:', index);
          return;
        }
        
        // Recuperar cliente clicado
        const clickedClient = chartData.topClientes[index];
        if (clickedClient && clickedClient.cliente) {
          try {
            let newSelectedClients: string[];
            
            // Tratamento especial para "Outros"
            if (clickedClient.cliente === 'Outros') {
              // Obter lista de todos os clientes que não estão no Top 5
                                            const clienteMap = new Map<string, number>();
                              filteredData.forEach(row => {
                                clienteMap.set(row.cliente, (clienteMap.get(row.cliente) || 0) + row.valorTotal);
                              });
                              
                              const allClientes = Array.from(clienteMap.entries()).sort(([,a], [,b]) => b - a);
              const top5Clients = allClientes.slice(0, 5).map(([cliente]) => cliente);
              const outrosClients = allClientes.slice(5).map(([cliente]) => cliente);
              
              // Verificar se já está filtrando por "Outros"
              const isFilteringOthers = selectedClients.length > 0 && 
                selectedClients.every(client => outrosClients.includes(client)) &&
                outrosClients.every(client => selectedClients.includes(client));
              
              if (isFilteringOthers) {
                // Se já está filtrando por "Outros", limpar filtro
                newSelectedClients = [];
              } else {
                // Filtrar por todos os clientes "Outros"
                newSelectedClients = outrosClients;
              }
            } else {
              // Comportamento normal para clientes específicos
              if (selectedClients.length === 1 && selectedClients[0] === clickedClient.cliente) {
                // Se já está selecionado, limpar filtro
                newSelectedClients = [];
              } else {
                // Selecionar apenas o cliente clicado
                newSelectedClients = [clickedClient.cliente];
              }
            }
            
            // Atualizar estado
            setSelectedClients(newSelectedClients);
            
            // Reaplicar filtros
            const startDate = new Date(periodStart);
            const endDate = new Date(periodEnd);
            applyFilters(rawData, startDate, endDate, newSelectedClients, selectedProducts);
            
          } catch (error) {
            console.error('Erro ao processar filtro de cliente:', error);
          }
        } else {
          console.warn('Dados do cliente incompletos:', clickedClient);
        }
      };
    }

    // Gráfico de produtos (donut)
    const ctxProdutos = document.getElementById('chart-produtos') as HTMLCanvasElement;
    if (ctxProdutos && chartData.topProdutos) {
      // Remover atributos de tamanho para usar CSS
      ctxProdutos.removeAttribute('width');
      ctxProdutos.removeAttribute('height');
      
      const totalPeriodoProdutos = chartData.topProdutos.reduce((sum: number, p: TopItem) => sum + p.valor, 0) || 1;
      
      newCharts.produtos = new window.Chart(ctxProdutos, {
        type: 'doughnut',
        data: {
          labels: chartData.topProdutos.map((p: TopItem) => p.produto),
          datasets: [{
            data: chartData.topProdutos.map((p: TopItem) => p.valor),
            backgroundColor: chartData.topProdutos.map((p: TopItem) => p.cor),
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: any) => {
                  const v = ctx.parsed;
                  const pct = (v / totalPeriodoProdutos * 100) || 0;
                  return `${ctx.label}: ${formatK(v)} (${pct.toFixed(1)}%)`;
                }
              }
            }
          }
        },
        plugins: [{
          id: 'datalabels',
          afterDatasetsDraw: (chart: any) => {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset: any, i: number) => {
              const meta = chart.getDatasetMeta(i);
              meta.data.forEach((arc: any, index: number) => {
                const value = dataset.data[index];
                const pct = (value / totalPeriodoProdutos * 100) || 0;
                if (pct >= 6) { // Só mostra se >= 6%
                  const { x, y } = arc.getCenterPoint();
                  ctx.fillStyle = '#eaf1ff';
                  ctx.strokeStyle = 'rgba(10,14,20,.45)';
                  ctx.lineWidth = 3;
                  ctx.font = 'bold 11px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.strokeText(`${pct.toFixed(0)}%`, x, y);
                  ctx.fillText(`${pct.toFixed(0)}%`, x, y);
                }
              });
            });
          }
        }]
      });

      // Implementar click para filtrar por produto
      ctxProdutos.style.cursor = 'pointer';
      ctxProdutos.onclick = (evt: MouseEvent) => {
        const points = newCharts.produtos.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
        if (!points || points.length === 0) return;
        const index = points[0].index;
        
        // Verificar se chartData e topProdutos existem
        if (!chartData || !chartData.topProdutos || !Array.isArray(chartData.topProdutos)) {
          console.warn('Dados de produtos não disponíveis para click');
          return;
        }
        
        // Verificar se o índice é válido
        if (index < 0 || index >= chartData.topProdutos.length) {
          console.warn('Índice de produto inválido:', index);
          return;
        }
        
        // Recuperar produto clicado
        const clickedProduct = chartData.topProdutos[index];
        if (clickedProduct && clickedProduct.produto) {
          try {
            let newSelectedProducts: string[];
            
                                      // Tratamento especial para "Outros"
                          if (clickedProduct.produto === 'Outros') {
                            // Obter lista de todos os produtos que não estão no Top 5
                            const produtoMap = new Map<string, number>();
                            filteredData.forEach(row => {
                              if (row.produto) {
                                produtoMap.set(row.produto, (produtoMap.get(row.produto) || 0) + row.valorTotal);
                              }
                            });
                            
                            const allProdutos = Array.from(produtoMap.entries()).sort(([,a], [,b]) => b - a);
                            const top5Produtos = allProdutos.slice(0, 5).map(([produto]) => produto);
                            const outrosProdutos = allProdutos.slice(5).map(([produto]) => produto);
                            
                            // Verificar se já está filtrando por "Outros"
                            const isFilteringOthers = selectedProducts.length > 0 && 
                              selectedProducts.every(prod => outrosProdutos.includes(prod)) &&
                              outrosProdutos.every(prod => selectedProducts.includes(prod));
                            
                            if (isFilteringOthers) {
                              // Se já está filtrando por "Outros", limpar filtro
                              newSelectedProducts = [];
                            } else {
                              // Filtrar por todos os produtos "Outros"
                              newSelectedProducts = outrosProdutos;
                            }
                          } else {
              // Comportamento normal para produtos específicos
              if (selectedProducts.length === 1 && selectedProducts[0] === clickedProduct.produto) {
                // Se já está selecionado, limpar filtro
                newSelectedProducts = [];
              } else {
                // Selecionar apenas o produto clicado
                newSelectedProducts = [clickedProduct.produto];
              }
            }
            
            // Atualizar estado
            setSelectedProducts(newSelectedProducts);
            
            // Reaplicar filtros
            const startDate = new Date(periodStart);
            const endDate = new Date(periodEnd);
            applyFilters(rawData, startDate, endDate, selectedClients, newSelectedProducts);
            
          } catch (error) {
            console.error('Erro ao processar filtro de produto:', error);
          }
        } else {
          console.warn('Dados do produto incompletos:', clickedProduct);
        }
      };
    }

    // Gráfico de tipos de cliente (donut) - apenas se meta.hasCustomerType for true
    if (meta?.hasCustomerType) {
      const ctxTiposCliente = document.getElementById('chart-tipos-cliente') as HTMLCanvasElement;
      if (ctxTiposCliente && chartData.topTiposCliente) {
        // Remover atributos de tamanho para usar CSS
        ctxTiposCliente.removeAttribute('width');
        ctxTiposCliente.removeAttribute('height');
        
        const totalPeriodoTiposCliente = chartData.topTiposCliente.reduce((sum: number, t: TopItem) => sum + t.valor, 0) || 1;
        
        newCharts.tiposCliente = new window.Chart(ctxTiposCliente, {
          type: 'doughnut',
          data: {
            labels: chartData.topTiposCliente.map((t: TopItem) => t.cliente),
            datasets: [{
              data: chartData.topTiposCliente.map((t: TopItem) => t.valor),
              backgroundColor: chartData.topTiposCliente.map((t: TopItem) => t.cor),
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 8, right: 8, left: 8, bottom: 8 } },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  title: () => 'Tipo de Cliente',
                  label: (ctx: any) => {
                    const total = totalPeriodoTiposCliente;
                    const value = ctx.parsed;
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${ctx.label}: ${formatK(value)} (${percentage}%)`;
                  }
                }
              }
            },
            cutout: '60%',
            elements: {
              arc: {
                borderWidth: 0
              }
            }
          },
          plugins: [{
            id: 'datalabels',
            afterDatasetsDraw: (chart: any) => {
              const { ctx } = chart;
              chart.data.datasets.forEach((dataset: any, i: number) => {
                const meta = chart.getDatasetMeta(i);
                meta.data.forEach((arc: any, index: number) => {
                  const value = dataset.data[index];
                  const pct = (value / totalPeriodoTiposCliente * 100) || 0;
                  if (pct >= 6) { // Só mostra se >= 6%
                    const { x, y } = arc.getCenterPoint();
                    ctx.fillStyle = '#eaf1ff';
                    ctx.strokeStyle = 'rgba(10,14,20,.45)';
                    ctx.lineWidth = 3;
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.strokeText(`${pct.toFixed(0)}%`, x, y);
                    ctx.fillText(`${pct.toFixed(0)}%`, x, y);
                  }
                });
              });
            }
          }]
        });
      }
    }

    // Gráfico de engajamento
    const ctxEng = document.getElementById('chart-eng') as HTMLCanvasElement;
    if (ctxEng) {
      newCharts.engajamento = new window.Chart(ctxEng, {
        type: 'bar',
        data: {
          labels: ['Novos', 'Ativos', 'Quase inativo', 'Inativos'],
          datasets: [{
            label: 'Engajamento',
            data: [
              chartData.engajamento.sets.novos.size,
              chartData.engajamento.sets.ativos.size,
              chartData.engajamento.sets.quaseInativos.size,
              chartData.engajamento.sets.inativos.size
            ],
            backgroundColor: ['#1E88E5', '#00d3a7', '#ffb84d', '#ff6b6b'],
            borderRadius: 8,
            borderSkipped: 'bottom'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 28, right: 8, left: 8, bottom: 8 } },
          plugins: {
            legend: { display: false },
            subtitle: {
              display: false,
              text: 'Clique nas barras para ver a lista de clientes',
              color: '#9fb0c7',
              font: { size: 11, weight: '600' },
              padding: { bottom: 6 }
            },
            tooltip: {
              callbacks: {
                title: () => 'Engajamento',
                label: (ctx: any) => `${ctx.label}: ${ctx.parsed.y}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grace: '15%',
              grid: { color: 'rgba(255,255,255,0.1)' },
              ticks: { color: '#c9cbd6', precision: 0 }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#c9cbd6' }
            }
          }
        },
        plugins: [{
          id: 'datalabels',
          afterDatasetsDraw: (chart: any) => {
            const { ctx, data } = chart;
            chart.data.datasets.forEach((dataset: any, i: number) => {
              const meta = chart.getDatasetMeta(i);
              meta.data.forEach((bar: { x: number; y: number; _index: number }, index: number) => {
                const value = dataset.data[index];
                if (value > 0) {
                  ctx.save();
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'bottom';
                  ctx.font = '12px Inter, sans-serif';
                  ctx.fillStyle = '#ffffff';
                  ctx.fillText(value.toString(), bar.x, bar.y - 5);
                  ctx.restore();
                }
              });
            });
          }
        }]
      });

      // Implementar click para abrir modal
      ctxEng.style.cursor = 'pointer';
      ctxEng.onclick = (evt: MouseEvent) => {
        const points = newCharts.engajamento.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
        if (!points || points.length === 0) return;
        const idx = points[0].index;
        
        // Construir mapa completo de dados por cliente
        const buildMapTotalELast = (dataset: ProductSaleRow[]) => {
          const map = new Map<string, {unidades:number,pacotes:number,caixas:number,valor:number,cmv:number,last:Date}>();
          for (const r of dataset) {
            const cur = map.get(r.cliente) || {unidades:0,pacotes:0,caixas:0,valor:0,cmv:0,last:new Date(0)};
            cur.unidades += r.quantidade || 0;
            cur.pacotes += r.pacotes || 0;
            cur.caixas += r.caixas || 0;
            cur.valor += r.valorTotal || 0;
            cur.cmv += r.custoTotal || 0;
            if (r.data > cur.last) cur.last = r.data;
            map.set(r.cliente, cur);
          }
          return map;
        };
        
        const mapAll = buildMapTotalELast(rawData);
        let setRef: Set<unknown>;
        let title: string;
        
        if (idx === 0) {
          setRef = chartData.engajamento.sets.novos;
          title = 'Novos (primeira compra no período)';
        } else if (idx === 1) {
          setRef = chartData.engajamento.sets.ativos;
          title = 'Ativos (compraram no período)';
        } else if (idx === 2) {
          setRef = chartData.engajamento.sets.quaseInativos;
          title = `Quase inativo (última compra entre ${quaseInativoMeses + 1}-${inativoMeses} meses atrás)`;
    } else {
          setRef = chartData.engajamento.sets.inativos;
          title = `Inativos (última compra entre ${inativoMeses + 1}-${maxPeriodoMeses} meses atrás)`;
        }
        
        const list = Array.from(setRef || [])
          .map(c => {
            const data = mapAll.get(String(c)) || {unidades:0,pacotes:0,caixas:0,valor:0,cmv:0,last:new Date(0)};
            const mb = data.valor > 0 ? Math.max(-100, Math.min(100, (1 - data.cmv/data.valor)*100)) : 0;
            
            // Calcular PMP/CMP ou PMV/CMV baseado em meta.hasPackages
            const pmp = meta?.hasPackages ? (data.pacotes > 0 ? data.valor/data.pacotes : 0) : (data.unidades > 0 ? data.valor/data.unidades : 0);
            const cmp = meta?.hasPackages ? (data.pacotes > 0 ? data.cmv/data.pacotes : 0) : (data.unidades > 0 ? data.cmv/data.unidades : 0);
            
            return {
            cliente: String(c),
              unidades: data.unidades,
              pacotes: data.pacotes,
              caixas: data.caixas,
              valor: data.valor,
              cmv: data.cmv,
              mb: mb,
              pmp: pmp,
              cmp: cmp,
              last: data.last
            };
          })
          .sort((a, b) => b.last.getTime() - a.last.getTime());
        
        // Abrir modal
        setModalTitle(title);
        setModalData(list);
        setShowModal(true);
      };
    }

    setCharts(newCharts);
  };

  // Utilitários de formatação
  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função helper para formatar valores em K e M com a regra de casas decimais
  const formatK = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1000000) {
      const scaledValue = value / 1000000;
      return formatNumber(scaledValue, 'M');
    } else if (absValue >= 1000) {
      const scaledValue = value / 1000;
      return formatNumber(scaledValue, 'k');
    }
    return formatNumber(value);
  };

  const formatPercent = (value: number | undefined | null) => {
    if (!value || isNaN(value)) return '0.0%';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getVariationTitle = () => {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const startStr = start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const endStr = end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    
    // Calcular período anterior
    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const prevEnd = new Date(start.getTime() - (1000 * 60 * 60 * 24));
    const prevStart = new Date(prevEnd.getTime() - (diffDays - 1) * (1000 * 60 * 60 * 24));
    const prevStartStr = prevStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const prevEndStr = prevEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    
    return `Variação por cliente (${startStr}–${endStr} vs ${prevStartStr}–${prevEndStr})`;
  };

  // Handlers dos filtros
  const handlePeriodApply = () => {
    if (periodStart && periodEnd) {
      const startDate = new Date(periodStart + 'T00:00:00');
      const endDate = new Date(periodEnd + 'T00:00:00');
      
      applyFilters(rawData, startDate, endDate, selectedClients, selectedProducts);
      setShowPeriodPanel(false);
    }
  };

  const handlePresetThisMonth = () => {
    // Usar a última data da base em vez da data atual
    const lastDate = rawData.length > 0 ? new Date(Math.max(...rawData.map(r => r.data.getTime()))) : new Date();
    const isFirstDay = lastDate.getDate() === 1;
    
    // Início: primeiro dia do mês da última data (ou do mês passado se for dia 1)
    const start = isFirstDay
      ? new Date(lastDate.getFullYear(), lastDate.getMonth() - 1, 1)
      : new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
    
    // Fim: última data da base (ou ontem se for dia 1)
    const end = isFirstDay
      ? new Date(lastDate.getFullYear(), lastDate.getMonth() - 1, lastDate.getDate())
      : new Date(lastDate);
    
    setPeriodStart(start.toISOString().split('T')[0]);
    setPeriodEnd(end.toISOString().split('T')[0]);
    applyFilters(rawData, start, end, selectedClients, selectedProducts);
    setShowPeriodPanel(false);
  };

  const handlePresetLastMonth = () => {
    // Usar a última data da base em vez da data atual
    const lastDate = rawData.length > 0 ? new Date(Math.max(...rawData.map(r => r.data.getTime()))) : new Date();
    const inicioMesAnterior = new Date(lastDate.getFullYear(), lastDate.getMonth() - 1, 1);
    const fimMesAnterior = new Date(lastDate.getFullYear(), lastDate.getMonth(), 0);
    
    setPeriodStart(inicioMesAnterior.toISOString().split('T')[0]);
    setPeriodEnd(fimMesAnterior.toISOString().split('T')[0]);
    applyFilters(rawData, inicioMesAnterior, fimMesAnterior, selectedClients, selectedProducts);
    setShowPeriodPanel(false);
  };

  const handleClientApply = () => {
    const startDate = new Date(periodStart + 'T00:00:00');
    const endDate = new Date(periodEnd + 'T00:00:00');
    
    applyFilters(rawData, startDate, endDate, selectedClients, selectedProducts);
    setShowClientPanel(false);
  };

  const handleProductApply = () => {
    const startDate = new Date(periodStart + 'T00:00:00');
    const endDate = new Date(periodEnd + 'T00:00:00');
    
    applyFilters(rawData, startDate, endDate, selectedClients, selectedProducts);
    setShowProductPanel(false);
  };

  const handleClientClick = (cliente: string) => {
    // Se o cliente já está selecionado, limpar o filtro
    if (selectedClients.includes(cliente)) {
      setSelectedClients([]);
    } else {
      // Se não está selecionado, selecionar apenas este cliente
      setSelectedClients([cliente]);
    }
    
    // Aplicar filtros imediatamente
    const startDate = new Date(periodStart + 'T00:00:00');
    const endDate = new Date(periodEnd + 'T00:00:00');
    applyFilters(rawData, startDate, endDate, selectedClients.includes(cliente) ? [] : [cliente], selectedProducts);
  };

  // Dados filtrados
  const uniqueClients = Array.from(new Set(rawData.map(row => row.cliente))).sort();
  const uniqueProducts = Array.from(new Set(rawData.map(row => row.produto).filter(Boolean))).sort();
  const filteredClients = uniqueClients.filter(client =>
    client.toLowerCase().includes(clientSearch.toLowerCase())
  );
  const filteredProducts = uniqueProducts.filter(product =>
    product.toLowerCase().includes(productSearch.toLowerCase())
  );

  const salesData = filteredData
    .sort((a, b) => b.data.getTime() - a.data.getTime())
    .filter(row => 
      row.cliente.toLowerCase().includes(salesSearch.toLowerCase()) ||
      (row.produto && row.produto.toLowerCase().includes(salesSearch.toLowerCase()))
  );

  // Se acesso negado, mostre a tela de aviso em vez de loading/dashboard
  if (accessDenied && session) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon"></div>
          <h1 className="access-denied-title">Acesso Negado</h1>
          <p className="access-denied-message">
            O usuário <span className="access-denied-email">{accessDenied.email || (session.user?.email ?? '')}</span> não tem acesso à planilha de dados deste dashboard.
          </p>
          {accessDenied.sheetUrl ? (
            <a 
              href={accessDenied.sheetUrl} 
              target="_blank" 
              rel="noreferrer"
              className="access-denied-button"
            >
              <span>Abrir planilha no Google Sheets</span>
              <span className="access-denied-button-icon">↗</span>
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  // Mostrar loading bonito sempre que necessário
  const showLoading = status === 'loading' || loading || initialLoad || !session;
  
  if (showLoading) {
    return (
      <>
        <div className={loadingStyles.loading}>
          <div className={loadingStyles['bg-animations']}>
            <div className={`${loadingStyles.orb} ${loadingStyles['orb-a']}`}></div>
            <div className={`${loadingStyles.orb} ${loadingStyles['orb-b']}`}></div>
            <div className={loadingStyles['grid-overlay']}></div>
          </div>
          <div className={loadingStyles.spinner}></div>
          <div className={loadingStyles['loading-text']}>Processando dados…</div>
        </div>
      </>
    );
  }
  
  if (!session) {
    return null;
  }

  // Função helper para formatar números com regra de casas decimais
  const formatNumber = (value: number, suffix: string = '') => {
    const absValue = Math.abs(value);
    if (absValue < 5) {
      return `${value.toFixed(1)}${suffix}`;
    } else {
      return `${Math.round(value)}${suffix}`;
    }
  };

  // Função helper para formatar variações percentuais
  const formatVariation = (value: number, isInteger: boolean = false, isPercentagePoints: boolean = false) => {
    const absValue = Math.abs(value);
    if (isInteger) {
      // Para números inteiros (como clientes únicos), sempre 0 casas decimais
      return `${value >= 0 ? '+' : ''}${Math.round(value)}`;
    } else if (isPercentagePoints) {
      // Para pontos percentuais (como margem bruta)
      return `${value >= 0 ? '+' : ''}${value.toFixed(1)}pp`;
    } else if (absValue < 5) {
      return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    } else {
      return `${value >= 0 ? '+' : ''}${Math.round(value)}%`;
    }
  };

  return (
    <>
      {/* Carregar Chart.js */}
      <script 
        src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js" 
        async 
      />

      <div className={vendasStyles['bg-animations']}>
        <div className={`${vendasStyles.orb} ${vendasStyles['orb-a']}`}></div>
        <div className={`${vendasStyles.orb} ${vendasStyles['orb-b']}`}></div>
        <div className={vendasStyles['grid-overlay']}></div>
      </div>

      <header className={vendasStyles['app-header']}>
        <h1 className={vendasStyles.brand}><span>{tenantName}</span> Vendas</h1>
        <div className={vendasStyles['header-right']}>
          <div className={`${vendasStyles['filter-badges']} ${vendasStyles['desktop-only']}`}>
          {/* Filtro de período */}
          <button 
            className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`} 
            title="Filtrar período"
            onClick={() => setShowPeriodPanel(!showPeriodPanel)}
          >
            <span className={vendasStyles['dot-indicator']}></span>
            <span>{periodStart && periodEnd ? `${new Date(periodStart + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} a ${new Date(periodEnd + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}` : 'Período'}</span>
            <span className={vendasStyles.caret}>▾</span>
          </button>
          
          {showPeriodPanel && (
              <>
                <div className={vendasStyles['modal-overlay']} onClick={() => setShowPeriodPanel(false)}></div>
            <div className={vendasStyles['period-panel']}>
              <div className={vendasStyles['period-presets']}>
                <button className={vendasStyles.chip} onClick={handlePresetThisMonth}>Este mês</button>
                <button className={vendasStyles.chip} onClick={handlePresetLastMonth}>Mês passado</button>
              </div>
              <div className={vendasStyles['period-row']}>
                <label>Início</label>
                <input 
                  type="date" 
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className={vendasStyles['period-row']}>
                <label>Fim</label>
                <input 
                  type="date" 
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
              <div className={vendasStyles['period-actions']}>
                <button className={vendasStyles.btn} onClick={handlePeriodApply}>Aplicar</button>
                <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={() => setShowPeriodPanel(false)}>Fechar</button>
              </div>
            </div>
              </>
          )}

          {/* Filtro de cliente */}
          <button 
            className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`} 
            title="Filtrar cliente"
            onClick={() => setShowClientPanel(!showClientPanel)}
          >
            <span className={vendasStyles['dot-indicator']}></span>
              <span>{selectedClients.length === 1 ? selectedClients[0] : selectedClients.length > 0 ? `${selectedClients.length} selecionados` : 'Clientes'}</span>
            <span className={vendasStyles.caret}>▾</span>
          </button>
          
          {showClientPanel && (
              <>
                <div className={vendasStyles['modal-overlay']} onClick={() => setShowClientPanel(false)}></div>
            <div className={vendasStyles['period-panel']}>
              <div className={vendasStyles['period-row']}>
                <label>Buscar</label>
                <input 
                  type="text" 
                  placeholder="Digite para filtrar"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
              </div>
              <div className={vendasStyles['table-scroll']} style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--panel-border)', borderRadius: '10px'}}>
                <ul style={{listStyle: 'none', margin: 0, padding: '6px 8px', display: 'grid', gap: '6px'}}>
                  {filteredClients.map(client => (
                    <li key={client} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', border: '1px solid rgba(255,255,255,.06)', borderRadius: '8px', background: 'rgba(255,255,255,.04)', cursor: 'pointer'}}>
                      <input 
                        type="checkbox"
                        checked={selectedClients.includes(client)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClients([...selectedClients, client]);
                          } else {
                            setSelectedClients(selectedClients.filter(c => c !== client));
                          }
                        }}
                        style={{accentColor: 'var(--accent)'}}
                      />
                      <span>{client}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={vendasStyles['period-actions']}>
                <button className={vendasStyles.btn} onClick={handleClientApply}>Aplicar</button>
                <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={() => setSelectedClients([])}>Limpar</button>
              </div>
            </div>
              </>
          )}

          {/* Filtro de produto */}
          <button 
            className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`} 
            title="Filtrar produto"
            onClick={() => setShowProductPanel(!showProductPanel)}
          >
            <span className={vendasStyles['dot-indicator']}></span>
              <span>{selectedProducts.length === 1 ? selectedProducts[0] : selectedProducts.length > 0 ? `${selectedProducts.length} selecionados` : 'Produtos'}</span>
            <span className={vendasStyles.caret}>▾</span>
          </button>
          
          {showProductPanel && (
              <>
                <div className={vendasStyles['modal-overlay']} onClick={() => setShowProductPanel(false)}></div>
            <div className={vendasStyles['period-panel']}>
              <div className={vendasStyles['period-row']}>
                <label>Buscar</label>
                <input 
                  type="text" 
                  placeholder="Digite para filtrar"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
              <div className={vendasStyles['table-scroll']} style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--panel-border)', borderRadius: '10px'}}>
                <ul style={{listStyle: 'none', margin: 0, padding: '6px 8px', display: 'grid', gap: '6px'}}>
                  {filteredProducts.map(product => (
                    <li key={product} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', border: '1px solid rgba(255,255,255,.06)', borderRadius: '8px', background: 'rgba(255,255,255,.04)', cursor: 'pointer'}}>
                      <input 
                        type="checkbox"
                        checked={selectedProducts.includes(product)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts([...selectedProducts, product]);
                          } else {
                            setSelectedProducts(selectedProducts.filter(p => p !== product));
                          }
                        }}
                        style={{accentColor: 'var(--accent)'}}
                      />
                      <span>{product}</span>
                    </li>
                  ))}
                </ul>
              </div>
                            <div className={vendasStyles['period-actions']}>
                <button className={vendasStyles.btn} onClick={handleProductApply}>Aplicar</button>
                <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={() => setSelectedClients([])}>Limpar</button>
              </div>
          </div>
              </>
          )}
          </div>
        </div>
      </header>

      {/* Filtros mobile - fora do header */}
      <div className={vendasStyles['mobile-filters']}>
        <div className={vendasStyles['filter-badges']}>
          {/* Filtro de período */}
          <button 
            className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`} 
            title="Filtrar período"
            onClick={() => setShowPeriodPanel(!showPeriodPanel)}
          >
            <span className={vendasStyles['dot-indicator']}></span>
            <span>{periodStart && periodEnd ? `${new Date(periodStart + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} a ${new Date(periodEnd + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}` : 'Período'}</span>
            <span className={vendasStyles.caret}>▾</span>
          </button>
          
          {showPeriodPanel && (
            <>
              <div className={vendasStyles['modal-overlay']} onClick={() => setShowPeriodPanel(false)}></div>
              <div className={vendasStyles['period-panel']}>
                <div className={vendasStyles['period-presets']}>
                  <button className={vendasStyles.chip} onClick={handlePresetThisMonth}>Este mês</button>
                  <button className={vendasStyles.chip} onClick={handlePresetLastMonth}>Mês passado</button>
                </div>
                <div className={vendasStyles['period-row']}>
                  <label>Início</label>
                  <input 
                    type="date" 
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </div>
                <div className={vendasStyles['period-row']}>
                  <label>Fim</label>
                  <input 
                    type="date" 
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
                <div className={vendasStyles['period-actions']}>
                  <button className={vendasStyles.btn} onClick={handlePeriodApply}>Aplicar</button>
                  <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={() => setShowPeriodPanel(false)}>Fechar</button>
                </div>
              </div>
            </>
          )}

          {/* Filtro de cliente */}
          <button 
            className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`} 
            title="Filtrar cliente"
            onClick={() => setShowClientPanel(!showClientPanel)}
          >
            <span className={vendasStyles['dot-indicator']}></span>
            <span>{selectedClients.length === 1 ? selectedClients[0] : selectedClients.length > 0 ? `${selectedClients.length} clientes` : 'Clientes'}</span>
            <span className={vendasStyles.caret}>▾</span>
          </button>
          
          {showClientPanel && (
            <>
                            <div className={vendasStyles['modal-overlay']} onClick={() => setShowClientPanel(false)}></div>
            <div className={vendasStyles['period-panel']}>
              <div className={vendasStyles['period-row']}>
                  <label>Buscar</label>
                  <input 
                    type="text" 
                    placeholder="Digite para filtrar"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                </div>
              <div className={vendasStyles['table-scroll']} style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--panel-border)', borderRadius: '10px'}}>
                  <ul style={{listStyle: 'none', margin: 0, padding: '6px 8px', display: 'grid', gap: '6px'}}>
                    {filteredClients.map(client => (
                      <li key={client} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', border: '1px solid rgba(255,255,255,.06)', borderRadius: '8px', background: 'rgba(255,255,255,.04)', cursor: 'pointer'}}>
                        <input 
                          type="checkbox"
                          checked={selectedClients.includes(client)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClients([...selectedClients, client]);
                            } else {
                              setSelectedClients(selectedClients.filter(c => c !== client));
                            }
                          }}
                          style={{accentColor: 'var(--accent)'}}
                        />
                        <span>{client}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                              <div className={vendasStyles['period-actions']}>
                <button className={vendasStyles.btn} onClick={handleClientApply}>Aplicar</button>
                <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={() => setSelectedClients([])}>Limpar</button>
                </div>
              </div>
            </>
          )}

          {/* Filtro de produto */}
          <button 
            className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`} 
            title="Filtrar produto"
            onClick={() => setShowProductPanel(!showProductPanel)}
          >
            <span className={vendasStyles['dot-indicator']}></span>
            <span>{selectedProducts.length === 1 ? selectedProducts[0] : selectedProducts.length > 0 ? `${selectedProducts.length} produtos` : 'Produtos'}</span>
            <span className={vendasStyles.caret}>▾</span>
          </button>
          
          {showProductPanel && (
            <>
                            <div className={vendasStyles['modal-overlay']} onClick={() => setShowProductPanel(false)}></div>
            <div className={vendasStyles['period-panel']}>
              <div className={vendasStyles['period-row']}>
                  <label>Buscar</label>
                  <input 
                    type="text" 
                    placeholder="Digite para filtrar"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
              <div className={vendasStyles['table-scroll']} style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--panel-border)', borderRadius: '10px'}}>
                  <ul style={{listStyle: 'none', margin: 0, padding: '6px 8px', display: 'grid', gap: '6px'}}>
                    {filteredProducts.map(product => (
                      <li key={product} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', border: '1px solid rgba(255,255,255,.06)', borderRadius: '8px', background: 'rgba(255,255,255,.04)', cursor: 'pointer'}}>
                        <input 
                          type="checkbox"
                          checked={selectedProducts.includes(product)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts([...selectedProducts, product]);
                            } else {
                              setSelectedProducts(selectedProducts.filter(p => p !== product));
                            }
                          }}
                          style={{accentColor: 'var(--accent)'}}
                        />
                        <span>{product}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                              <div className={vendasStyles['period-actions']}>
                <button className={vendasStyles.btn} onClick={handleProductApply}>Aplicar</button>
                <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={() => setSelectedProducts([])}>Limpar</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <main className={vendasStyles.container}>
        {/* estado de modo do drilldown */}

        
        {/* KPIs */}
         {kpis && (
        <section className={vendasStyles.kpis}>
          <div className={vendasStyles.kpi}>
            <div className={vendasStyles['kpi-label']}>Faturamento do período</div>
               <div className={vendasStyles['kpi-value']}>{formatK(kpis.faturamento.valor)}</div>
               <div className={`${vendasStyles['kpi-sub']} ${kpis.faturamento.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
                 {formatVariation(kpis.faturamento.variacao)} vs {kpis.compareLabel || 'mês anterior'}
               </div>
               {kpis.showProjection && (
                                   <div className={vendasStyles['kpi-foot']}>Projeção: <strong>{formatK(kpis.faturamento.projecao ?? 0)}</strong></div>
               )}
          </div>
          
          <div className={vendasStyles.kpi}>
               <div className={vendasStyles['kpi-label']}>Margem bruta</div>
               <div className={vendasStyles['kpi-value']}>{formatNumber(kpis.margemBruta.valor, '%')}</div>
               <div className={`${vendasStyles['kpi-sub']} ${kpis.margemBruta.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
                 {formatVariation(kpis.margemBruta.variacao, false, true)} vs {kpis.compareLabel || 'mês anterior'}
               </div>
          </div>
          
          <div className={vendasStyles.kpi}>
               <div className={vendasStyles['kpi-label']}>Pedidos</div>
               <div className={vendasStyles['kpi-value']}>
                 <div className={vendasStyles['kpi-main-row']}>
                   <span className={vendasStyles['kpi-main-value']}>{kpis.pedidos.valor.toLocaleString('pt-BR')}</span>
                   <span className={`${vendasStyles['kpi-variation-inline']} ${kpis.pedidos.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
                     {formatVariation(kpis.pedidos.variacao)}
                   </span>
                 </div>
                 <div className={vendasStyles['kpi-secondary-row']}>
                   <span className={vendasStyles['kpi-secondary-value']}>R$ {formatK(kpis.ticketMedio.valor)} ticket médio</span>
                   <span className={`${vendasStyles['kpi-variation-inline']} ${kpis.ticketMedio.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
                     {formatVariation(kpis.ticketMedio.variacao)}
                   </span>
                 </div>
                 <div className={vendasStyles['kpi-secondary-row']} style={{marginTop: '8px'}}>
                   <span className={vendasStyles['kpi-secondary-value']}>{kpis.clientesUnicos.valor.toLocaleString('pt-BR')} clientes</span>
                   <span className={`${vendasStyles['kpi-variation-inline']} ${kpis.clientesUnicos.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
                     {formatVariation(kpis.clientesUnicos.variacao, true)}
                   </span>
                 </div>
               </div>
          </div>

          <div className={vendasStyles.kpi}>
               <div className={vendasStyles['kpi-label']}>
                 {meta && (!meta.hasBoxes && !meta.hasPackages) ? 'Unidades' : 'Caixas'}
               </div>
               <div className={vendasStyles['kpi-value']}>
                 {meta && (!meta.hasBoxes && !meta.hasPackages) ? (
                   <div className={vendasStyles['kpi-main-row']}>
                     <span className={vendasStyles['kpi-main-value']}>{formatK(kpis.unidades.valor)}</span>
                     <span className={`${vendasStyles['kpi-variation-inline']} ${kpis.unidades.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
                       {formatVariation(kpis.unidades.variacao)}
                     </span>
                   </div>
                 ) : (
                   <>
                     <div className={vendasStyles['kpi-main-row']}>
                       <span className={vendasStyles['kpi-main-value']}>{formatK(kpis.caixas.valor)}</span>
                       <span className={`${vendasStyles['kpi-variation-inline']} ${kpis.caixas.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
                         {formatVariation(kpis.caixas.variacao)}
                       </span>
                     </div>
                     {meta?.hasPackages && (
                       <div className={vendasStyles['kpi-secondary-row']}>
                         <span className={vendasStyles['kpi-secondary-value']}>{formatK(kpis.pacotes.valor)} pacotes</span>
                         <span className={`${vendasStyles['kpi-variation-inline']} ${kpis.pacotes.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
                           {formatVariation(kpis.pacotes.variacao)}
                         </span>
                       </div>
                     )}
                     <div className={vendasStyles['kpi-secondary-row']} style={{marginTop: '8px'}}>
                       <span className={vendasStyles['kpi-secondary-value']}>{formatK(kpis.unidades.valor)} unidades</span>
                       <span className={`${vendasStyles['kpi-variation-inline']} ${kpis.unidades.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
                         {formatVariation(kpis.unidades.variacao)}
                       </span>
                     </div>
                   </>
                 )}
               </div>
             </div>
             
             <div className={vendasStyles.kpi}>
               <div className={vendasStyles['kpi-label']}>Faturamento {new Date().getFullYear()}</div>
               <div className={vendasStyles['kpi-value']}>{formatK(kpis.faturamentoAnual.valor)}</div>
               <div className={`${vendasStyles['kpi-sub']} ${kpis.faturamentoAnual.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
                 {formatVariation(kpis.faturamentoAnual.variacao)} vs {new Date().getFullYear() - 1}
               </div>
               <div className={vendasStyles['kpi-foot']}>Projeção: <strong>{formatK(kpis.faturamentoAnual.projecao ?? 0)}</strong></div>
          </div>
        </section>
         )}

        {/* Gráficos */}
        <section className={vendasStyles.charts}>
                      <div className={vendasStyles.card}>
            <h3>Vendas por semana (últimas 8)</h3>
			<p><small>Clique nas barras para filtrar o período</small></p>
            <div style={{height: '300px', position: 'relative', overflow: 'hidden'}}>
              <canvas id="chart-semanas" height="300"></canvas>
            </div>
          </div>
          <div className={vendasStyles.card}>
            <h3>Top clientes por valor</h3>
			<p><small>Clique no gráfico para filtrar por cliente</small></p>
            <div className={vendasStyles.topcli}>
              <div className={vendasStyles['chart-donut']}>
                <canvas id="chart-clientes"></canvas>
              </div>
              <ul className={vendasStyles['topcli-legend']}>
                {chartData?.topClientes.map((cliente: TopItem, index: number) => {
                  const totalPeriodo = chartData.topClientes.reduce((sum: number, c: TopItem) => sum + c.valor, 0) || 1;
                  const pct = ((cliente.valor ?? 0) / totalPeriodo * 100) || 0;
                  
                  // Lógica de seleção especial para "Outros"
                  let isSelected = false;
                  if ((cliente.cliente ?? '') === 'Outros') {
                    // Para "Outros", verificar se está filtrando pelos clientes que não estão no Top 5
                    const clienteMap = new Map<string, number>();
                    filteredData.forEach(row => {
                      clienteMap.set(row.cliente, (clienteMap.get(row.cliente) || 0) + row.valorTotal);
                    });
                    const allClientes = Array.from(clienteMap.entries()).sort(([,a], [,b]) => b - a);
                    const outrosClients = allClientes.slice(5).map(([cliente]) => cliente);
                    
                    isSelected = selectedClients.length > 0 && 
                      selectedClients.every(client => outrosClients.includes(client)) &&
                      outrosClients.every(client => selectedClients.includes(client));
                  } else {
                    // Para clientes específicos, verificar se é o único selecionado
                    isSelected = selectedClients.length === 1 && selectedClients[0] === (cliente.cliente ?? '');
                  }
                  return (
                    <li 
                      key={cliente.cliente ?? ''}
                      onClick={() => {
                        try {
                          let newSelectedClients: string[];
                          
                          // Tratamento especial para "Outros"
                          if ((cliente.cliente ?? '') === 'Outros') {
                            // Obter lista de todos os clientes que não estão no Top 5
                            const clienteMap = new Map<string, number>();
                            filteredData.forEach(row => {
                              clienteMap.set(row.cliente, (clienteMap.get(row.cliente) || 0) + row.valorTotal);
                            });
                            
                            const allClientes = Array.from(clienteMap.entries()).sort(([,a], [,b]) => b - a);
                            const top5Clients = allClientes.slice(0, 5).map(([cliente]) => cliente);
                            const outrosClients = allClientes.slice(5).map(([cliente]) => cliente);
                            
                            // Verificar se já está filtrando por "Outros"
                            const isFilteringOthers = selectedClients.length > 0 && 
                              selectedClients.every(client => outrosClients.includes(client)) &&
                              outrosClients.every(client => selectedClients.includes(client));
                            
                            if (isFilteringOthers) {
                              // Se já está filtrando por "Outros", limpar filtro
                              newSelectedClients = [];
                            } else {
                              // Filtrar por todos os clientes "Outros"
                              newSelectedClients = outrosClients;
                            }
                          } else {
                            // Comportamento normal para clientes específicos
                            if (isSelected) {
                              // Se já está selecionado, limpar filtro
                              newSelectedClients = [];
                            } else {
                              // Selecionar apenas o cliente clicado
                              newSelectedClients = [cliente.cliente ?? ''];
                            }
                          }
                          
                          // Atualizar estado
                          setSelectedClients(newSelectedClients);
                          
                          // Reaplicar filtros
                          const startDate = new Date(periodStart);
                          const endDate = new Date(periodEnd);
                          applyFilters(rawData, startDate, endDate, newSelectedClients, selectedProducts);
                          
                        } catch (error) {
                          console.error('Erro ao processar filtro de cliente:', error);
                        }
                      }}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(230,126,34,.2)' : 'rgba(255,255,255,.04)',
                        border: isSelected ? '1px solid rgba(230,126,34,.4)' : '1px solid rgba(255,255,255,.06)',
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span className={vendasStyles.dot} style={{backgroundColor: cliente.cor}}></span>
                      <span>{cliente.cliente ?? ''}</span>
                      <span>{Math.round(cliente.valor / 1000)}k ({pct.toFixed(0)}%)</span>
                      <span className={vendasStyles['margem-bruta']}>MB: {cliente.margemBruta ?? 0}%</span>
                    </li>
                  );
                })}
              </ul>
                        </div>
                      </div>
        </section>

        {/* Gráfico de Top Produtos e Tipos de Cliente */}
        <section className={vendasStyles.charts}>
          {meta?.hasCustomerType ? (
            // Layout com dois gráficos na mesma linha
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', gridColumn: 'span 2' }}>
              {/* Gráfico de Tipos de Cliente - 1/3 */}
              <div className={vendasStyles.card}>
                <h3>Distribuição por tipo de cliente</h3>
                <p><small>Distribuição de vendas por tipo de cliente</small></p>
                {chartData?.topTiposCliente && chartData.topTiposCliente.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px' }}>
                    <div className={vendasStyles['chart-donut']} style={{ marginBottom: '20px' }}>
                      <canvas id="chart-tipos-cliente"></canvas>
                    </div>
                    <ul className={vendasStyles['topcli-legend']} style={{ width: '100%' }}>
                      {chartData.topTiposCliente.map((tipoCliente: TopItem, index: number) => {
                        const totalPeriodo = chartData.topTiposCliente.reduce((sum: number, t: TopItem) => sum + t.valor, 0) || 1;
                        const pct = ((tipoCliente.valor ?? 0) / totalPeriodo * 100) || 0;
                        
                        return (
                          <li 
                            key={tipoCliente.cliente ?? ''}
                            style={{
                              cursor: 'default',
                              background: 'rgba(255,255,255,.04)',
                              border: '1px solid rgba(255,255,255,.06)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span className={vendasStyles.dot} style={{backgroundColor: tipoCliente.cor}}></span>
                            <span>{tipoCliente.cliente ?? ''}</span>
                            <span>{Math.round(tipoCliente.valor / 1000)}k ({pct.toFixed(0)}%)</span>
                            <span className={vendasStyles['margem-bruta']}>MB: {Math.round(tipoCliente.margemBruta ?? 0)}%</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%',
                    minHeight: '300px',
                    color: 'var(--muted)',
                    fontSize: '14px',
                    textAlign: 'center'
                  }}>
                    <div>
                      <p>Nenhum dado de tipo de cliente encontrado</p>
                      <p style={{ fontSize: '12px', marginTop: '8px' }}>
                        Verifique se a coluna está mapeada corretamente
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Gráfico de Produtos - 2/3 */}
              <div className={vendasStyles.card}>
                <h3>Top produtos por valor</h3>
                <p><small>Clique no gráfico para filtrar por produto</small></p>
                <div className={vendasStyles.topcli}>
                  <div className={vendasStyles['chart-donut']}>
                    <canvas id="chart-produtos"></canvas>
                  </div>
              <ul className={vendasStyles['topcli-legend']}>
                {chartData?.topProdutos?.map((produto: TopItem, index: number) => {
                  const totalPeriodo = chartData.topProdutos.reduce((sum: number, p: TopItem) => sum + p.valor, 0) || 1;
                  const pct = ((produto.valor ?? 0) / totalPeriodo * 100) || 0;
                  
                  // Calcular valores para exibição baseado em meta.hasPackages
                  const quantidadeTotal = produto.quantidadeTotal ?? 0;
                  const cmv = produto.cmv ?? 0;
                  const precoMedioPorUnidade = quantidadeTotal > 0 ? produto.valor / quantidadeTotal : 0;
                  const custoMedioPorUnidade = quantidadeTotal > 0 ? cmv / quantidadeTotal : 0;
                  
                  // Lógica de seleção especial para "Outros"
                  let isSelected = false;
                  if ((produto.produto ?? '') === 'Outros') {
                    // Para "Outros", verificar se está filtrando pelos produtos que não estão no Top 5
                    const produtoMap = new Map<string, number>();
                    filteredData.forEach(row => {
                      if (row.produto) {
                        produtoMap.set(row.produto, (produtoMap.get(row.produto) || 0) + row.valorTotal);
                      }
                    });
                    const allProdutos = Array.from(produtoMap.entries()).sort(([,a], [,b]) => b - a);
                                                const outrosProdutos = allProdutos.slice(5).map(([produto]) => produto);
                    
                    isSelected = selectedProducts.length > 0 && 
                      selectedProducts.every(prod => outrosProdutos.includes(prod)) &&
                      outrosProdutos.every(prod => selectedProducts.includes(prod));
                  } else {
                    // Para produtos específicos, verificar se é o único selecionado
                    isSelected = selectedProducts.length === 1 && selectedProducts[0] === (produto.produto ?? '');
                  }
                  return (
                    <li 
                      key={produto.produto ?? ''}
                      onClick={() => {
                        try {
                          let newSelectedProducts: string[];
                          
                          // Tratamento especial para "Outros"
                          if ((produto.produto ?? '') === 'Outros') {
                            // Obter lista de todos os produtos que não estão no Top 5
                            const produtoMap = new Map<string, number>();
                            filteredData.forEach(row => {
                              if (row.produto) {
                                produtoMap.set(row.produto, (produtoMap.get(row.produto) || 0) + row.valorTotal);
                              }
                            });
                            
                            const allProdutos = Array.from(produtoMap.entries()).sort(([,a], [,b]) => b - a);
                            const top5Produtos = allProdutos.slice(0, 5).map(([produto]) => produto);
                            const outrosProdutos = allProdutos.slice(5).map(([produto]) => produto);
                            
                            // Verificar se já está filtrando por "Outros"
                            const isFilteringOthers = selectedProducts.length > 0 && 
                              selectedProducts.every(prod => outrosProdutos.includes(prod)) &&
                              outrosProdutos.every(prod => selectedProducts.includes(prod));
                            
                            if (isFilteringOthers) {
                              // Se já está filtrando por "Outros", limpar filtro
                              newSelectedProducts = [];
                            } else {
                              // Filtrar por todos os produtos "Outros"
                              newSelectedProducts = outrosProdutos;
                            }
                          } else {
                            // Comportamento normal para produtos específicos
                            if (isSelected) {
                              // Se já está selecionado, limpar filtro
                              newSelectedProducts = [];
                            } else {
                              // Selecionar apenas o produto clicado
                              newSelectedProducts = [produto.produto ?? ''];
                            }
                          }
                          
                          // Atualizar estado
                          setSelectedProducts(newSelectedProducts);
                          
                          // Reaplicar filtros
                          const startDate = new Date(periodStart);
                          const endDate = new Date(periodEnd);
                          applyFilters(rawData, startDate, endDate, selectedClients, newSelectedProducts);
                          
                        } catch (error) {
                          console.error('Erro ao processar filtro de produto:', error);
                        }
                      }}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(230,126,34,.2)' : 'rgba(255,255,255,.04)',
                        border: isSelected ? '1px solid rgba(230,126,34,.4)' : '1px solid rgba(255,255,255,.06)',
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span className={vendasStyles.dot} style={{backgroundColor: produto.cor}}></span>
                      <div style={{flex: 1, minWidth: 0}}>
                        {/* Primeira linha: Título + PMP/CMP ou PMV/CMV */}
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                          <div style={{fontWeight: '600', color: 'var(--text)'}}>{produto.produto ?? ''}</div>
                          <div style={{display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px'}}>
                            <span className={vendasStyles['preco-medio']} style={{color: 'var(--accent)', fontWeight: '500'}}>
                              {meta?.hasPackages ? 'PMP' : 'PMV'}: {meta?.hasPackages ? (produto.precoMedioPorPacote ?? 0).toFixed(2) : precoMedioPorUnidade.toFixed(2)}
                            </span>
                            <span className={vendasStyles['custo-medio']} style={{color: 'var(--accent)', fontWeight: '500'}}>
                              {meta?.hasPackages ? 'CMP' : 'CMV'}: {meta?.hasPackages ? (produto.custoMedioPorPacote ?? 0).toFixed(2) : custoMedioPorUnidade.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {/* Segunda linha: Valor, pacotes/unidades e MB */}
                        <div style={{fontSize: '11px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span>{Math.round(produto.valor / 1000)}k ({pct.toFixed(0)}%) • {meta?.hasPackages ? `${formatK(produto.pacotesTotal ?? 0)} pacotes` : `${formatK(quantidadeTotal)} unidades`}</span>
                          <span className={vendasStyles['margem-bruta']} style={{color: 'var(--accent)', fontWeight: '500'}}>MB: {Math.round(produto.margemBruta ?? 0)}%</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
                </ul>
              </div>
            </div>
          </div>
          ) : (
            // Layout original quando não há hasCustomerType
            <div className={vendasStyles.card}>
              <h3>Top produtos por valor</h3>
              <p><small>Clique no gráfico para filtrar por produto</small></p>
              <div className={vendasStyles.topcli}>
                <div className={vendasStyles['chart-donut']}>
                  <canvas id="chart-produtos"></canvas>
                </div>
                <ul className={vendasStyles['topcli-legend']}>
                  {chartData?.topProdutos?.map((produto: TopItem, index: number) => {
                    const totalPeriodo = chartData.topProdutos.reduce((sum: number, p: TopItem) => sum + p.valor, 0) || 1;
                    const pct = ((produto.valor ?? 0) / totalPeriodo * 100) || 0;
                    
                    // Calcular valores para exibição baseado em meta.hasPackages
                    const quantidadeTotal = produto.quantidadeTotal ?? 0;
                    const cmv = produto.cmv ?? 0;
                    const precoMedioPorUnidade = quantidadeTotal > 0 ? produto.valor / quantidadeTotal : 0;
                    const custoMedioPorUnidade = quantidadeTotal > 0 ? cmv / quantidadeTotal : 0;
                    
                    // Lógica de seleção especial para "Outros"
                    let isSelected = false;
                    if ((produto.produto ?? '') === 'Outros') {
                      // Para "Outros", verificar se está filtrando pelos produtos que não estão no Top 5
                      const produtoMap = new Map<string, number>();
                      filteredData.forEach(row => {
                        if (row.produto) {
                          produtoMap.set(row.produto, (produtoMap.get(row.produto) || 0) + row.valorTotal);
                        }
                      });
                      const allProdutos = Array.from(produtoMap.entries()).sort(([,a], [,b]) => b - a);
                      const outrosProdutos = allProdutos.slice(5).map(([produto]) => produto);
                      
                      isSelected = selectedProducts.length > 0 && 
                        selectedProducts.every(prod => outrosProdutos.includes(prod)) &&
                        outrosProdutos.every(prod => selectedProducts.includes(prod));
                    } else {
                      // Para produtos específicos, verificar se é o único selecionado
                      isSelected = selectedProducts.length === 1 && selectedProducts[0] === (produto.produto ?? '');
                    }
                    return (
                      <li 
                        key={produto.produto ?? ''}
                        onClick={() => {
                          try {
                            let newSelectedProducts: string[];
                            
                            // Tratamento especial para "Outros"
                            if ((produto.produto ?? '') === 'Outros') {
                              // Obter lista de todos os produtos que não estão no Top 5
                              const produtoMap = new Map<string, number>();
                              filteredData.forEach(row => {
                                if (row.produto) {
                                  produtoMap.set(row.produto, (produtoMap.get(row.produto) || 0) + row.valorTotal);
                                }
                              });
                              
                              const allProdutos = Array.from(produtoMap.entries()).sort(([,a], [,b]) => b - a);
                              const top5Produtos = allProdutos.slice(0, 5).map(([produto]) => produto);
                              const outrosProdutos = allProdutos.slice(5).map(([produto]) => produto);
                              
                              // Verificar se já está filtrando por "Outros"
                              const isFilteringOthers = selectedProducts.length > 0 && 
                                selectedProducts.every(prod => outrosProdutos.includes(prod)) &&
                                outrosProdutos.every(prod => selectedProducts.includes(prod));
                              
                              if (isFilteringOthers) {
                                // Se já está filtrando por "Outros", limpar filtro
                                newSelectedProducts = [];
                              } else {
                                // Filtrar por todos os produtos "Outros"
                                newSelectedProducts = outrosProdutos;
                              }
                            } else {
                              // Comportamento normal para produtos específicos
                              if (isSelected) {
                                // Se já está selecionado, limpar filtro
                                newSelectedProducts = [];
                              } else {
                                // Selecionar apenas o produto clicado
                                newSelectedProducts = [produto.produto ?? ''];
                              }
                            }
                            
                            // Atualizar estado
                            setSelectedProducts(newSelectedProducts);
                            
                            // Reaplicar filtros
                            const startDate = new Date(periodStart);
                            const endDate = new Date(periodEnd);
                            applyFilters(rawData, startDate, endDate, selectedClients, newSelectedProducts);
                            
                          } catch (error) {
                            console.error('Erro ao processar filtro de produto:', error);
                          }
                        }}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(230,126,34,.2)' : 'rgba(255,255,255,.04)',
                          border: isSelected ? '1px solid rgba(230,126,34,.4)' : '1px solid rgba(255,255,255,.06)',
                          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span className={vendasStyles.dot} style={{backgroundColor: produto.cor}}></span>
                        <div style={{flex: 1, minWidth: 0}}>
                          {/* Primeira linha: Título + PMP/CMP ou PMV/CMV */}
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                            <div style={{fontWeight: '600', color: 'var(--text)'}}>{produto.produto ?? ''}</div>
                            <div style={{display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px'}}>
                              <span className={vendasStyles['preco-medio']} style={{color: 'var(--accent)', fontWeight: '500'}}>
                                {meta?.hasPackages ? 'PMP' : 'PMV'}: {meta?.hasPackages ? (produto.precoMedioPorPacote ?? 0).toFixed(2) : precoMedioPorUnidade.toFixed(2)}
                              </span>
                              <span className={vendasStyles['custo-medio']} style={{color: 'var(--accent)', fontWeight: '500'}}>
                                {meta?.hasPackages ? 'CMP' : 'CMV'}: {meta?.hasPackages ? (produto.custoMedioPorPacote ?? 0).toFixed(2) : custoMedioPorUnidade.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          {/* Segunda linha: Valor, pacotes/unidades e MB */}
                          <div style={{fontSize: '11px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <span>{Math.round(produto.valor / 1000)}k ({pct.toFixed(0)}%) • {meta?.hasPackages ? `${formatK(produto.pacotesTotal ?? 0)} pacotes` : `${formatK(quantidadeTotal)} unidades`}</span>
                            <span className={vendasStyles['margem-bruta']} style={{color: 'var(--accent)', fontWeight: '500'}}>MB: {Math.round(produto.margemBruta ?? 0)}%</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* Insights */}
        <section className={vendasStyles.charts}>
                      <div className={`${vendasStyles.card} ${vendasStyles.span2}`}>
            <h3>{getVariationTitle()}</h3>
            <div className={vendasStyles['rank-grid']}>
              <div>
                                  <div className={vendasStyles['kpi-label']}>Quem mais cresceu</div>
                  <ul className={vendasStyles.rank}>
                  {chartData?.rankingUp.map((item: RankingItem) => (
                    <li 
                      key={item.cliente}
                      onClick={() => handleClientClick(item.cliente)}
                      style={{ cursor: 'pointer' }}
                      className={selectedClients.includes(item.cliente) ? 'selected' : ''}
                    >
                      <span>{item.cliente}</span>
                      <span className={vendasStyles.pos}>+{formatK(item.delta ?? 0)} ({Math.round(item.pct ?? 0)}%)</span>
                    </li>
                  ))}
                </ul>
                      </div>
                      <div>
                 <div className={vendasStyles['kpi-label']}>Quem mais caiu</div>
                 <ul className={vendasStyles.rank}>
                   {chartData?.rankingDown.map((item: RankingItem) => (
                     <li 
                       key={item.cliente}
                       onClick={() => handleClientClick(item.cliente)}
                       style={{ cursor: 'pointer' }}
                       className={selectedClients.includes(item.cliente) ? 'selected' : ''}
                     >
                       <span>{item.cliente}</span>
                       <span className={vendasStyles.neg}>{formatK(item.delta ?? 0)} ({Math.round(item.pct ?? 0)}%)</span>
                    </li>
                  ))}
          </ul>
                      </div>
                      </div>
        </div>
                     <div className={vendasStyles.card}>
             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
             <h3>Engajamento de clientes</h3>
               <button 
                 className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`}
                 onClick={() => setShowEngagementFilter(true)}
                 style={{fontSize: '12px', padding: '6px 12px'}}
               >
                 Configurar Períodos
               </button>
             </div>
             <div className={vendasStyles['eng-visual']} style={{height: '280px', position: 'relative', overflow: 'hidden'}}>
               <canvas id="chart-eng" height="280"></canvas>
            </div>
          </div>
        </section>

        {/* Blocos: Produtos por cliente e Clientes por produto */}
        <section className={vendasStyles['table-wrap']} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className={vendasStyles.card}>
            <div className={vendasStyles['table-head']} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h3>Produtos desse cliente</h3>
			  <p><small>Selecione um cliente para ver seus produtos</small></p>
              <div style={{ position:'relative', display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className={vendasStyles.chip} onClick={()=>{ setShowClientPicker(!showClientPicker); setClientPickerTemp(selectCliente); }}>
                  {selectCliente || 'Selecionar cliente'}
                </button>
                {showClientPicker && (
                  <>
                    <div className={vendasStyles['modal-overlay']} onClick={() => setShowClientPicker(false)}></div>
                    <div className={vendasStyles['period-panel']} style={{ right: 0, bottom: 54, top: 'auto' }}>
                      <div className={vendasStyles['period-row']}>
                        <label>Buscar</label>
                        <input type="text" placeholder="Digite para filtrar" value={clientPickerQuery} onChange={(e)=>setClientPickerQuery(e.target.value)} />
                      </div>
                      <div className={vendasStyles['table-scroll']} style={{maxHeight: '300px', overflowY: 'auto'}}>
                        <ul style={{listStyle:'none', margin:0, padding:'6px 8px', display:'grid', gap:'6px'}}>
                          {Array.from(new Set(filteredData.map(r=>r.cliente))).
                            filter(c=>!clientPickerQuery || c.toLowerCase().includes(clientPickerQuery.toLowerCase())).
                            sort().map(c=> (
                            <li key={c}>
                              <button className={`${vendasStyles.chip} ${clientPickerTemp===c ? vendasStyles.active : ''}`} style={{width:'100%', justifyContent:'flex-start'}} onClick={()=>{
                                setSelectCliente(c);
                                setShowClientPicker(false);
                                // Abrir modal automaticamente
                                const linhas = filteredData.filter(r=>r.cliente===c);
                                const map = new Map<string, {unidades:number,pacotes:number,caixas:number,valor:number,cmv:number}>();
                                for(const r of linhas){
                                  const k = r.produto || '-';
                                  const cur = map.get(k) || {unidades:0,pacotes:0,caixas:0,valor:0,cmv:0};
                                  cur.unidades += r.quantidade || 0;
                                  cur.pacotes += r.pacotes || 0;
                                  cur.caixas += r.caixas || 0;
                                  cur.valor += r.valorTotal || 0;
                                  cur.cmv += r.custoTotal || 0;
                                  map.set(k, cur);
                                }
                                const rows = Array.from(map.entries()).map(([k,v])=>{
                                  const mb = v.valor>0 ? Math.max(-100, Math.min(100, (1 - v.cmv/v.valor)*100)) : 0;
                                  const pmp = v.pacotes>0 ? v.valor/v.pacotes : 0;
                                  const cmp = v.pacotes>0 ? v.cmv/v.pacotes : 0;
                                  return { produto:k, ...v, mb, pmp, cmp };
                                });
                                setModalTitle(`Produtos de ${c}`);
                                setModalData(rows);
                                setShowModal(true);
                              }}>{c}</button>
                    </li>
                  ))}
          </ul>
        </div>

                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className={vendasStyles.card}>
            <div className={vendasStyles['table-head']} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h3>Clientes desse produto</h3>
              <p><small>Selecione um produto para ver seus clientes</small></p>
              <div style={{ position:'relative', display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className={vendasStyles.chip} onClick={()=>{ setShowProductPicker(!showProductPicker); setProductPickerTemp(selectProduto); }}>
                  {selectProduto || 'Selecionar produto'}
                </button>
                {showProductPicker && (
                  <>
                    <div className={vendasStyles['modal-overlay']} onClick={() => setShowProductPicker(false)}></div>
                    <div className={vendasStyles['period-panel']} style={{ right: 0, bottom: 54, top: 'auto' }}>
                      <div className={vendasStyles['period-row']}>
                        <label>Buscar</label>
                        <input type="text" placeholder="Digite para filtrar" value={productPickerQuery} onChange={(e)=>setProductPickerQuery(e.target.value)} />
                      </div>
                      <div className={vendasStyles['table-scroll']} style={{maxHeight: '300px', overflowY: 'auto'}}>
                        <ul style={{listStyle:'none', margin:0, padding:'6px 8px', display:'grid', gap:'6px'}}>
                          {Array.from(new Set(filteredData.map(r=>r.produto))).
                            filter(p=>!productPickerQuery || p.toLowerCase().includes(productPickerQuery.toLowerCase())).
                            sort().map(p=> (
                            <li key={p}>
                              <button className={`${vendasStyles.chip} ${productPickerTemp===p ? vendasStyles.active : ''}`} style={{width:'100%', justifyContent:'flex-start'}} onClick={()=>{
                                setSelectProduto(p);
                                setShowProductPicker(false);
                                // Abrir modal automaticamente
                                const linhas = filteredData.filter(r=>r.produto===p);
                                const map = new Map<string, {unidades:number,pacotes:number,caixas:number,valor:number,cmv:number}>();
                                for(const r of linhas){
                                  const k = r.cliente || '-';
                                  const cur = map.get(k) || {unidades:0,pacotes:0,caixas:0,valor:0,cmv:0};
                                  cur.unidades += r.quantidade || 0;
                                  cur.pacotes += r.pacotes || 0;
                                  cur.caixas += r.caixas || 0;
                                  cur.valor += r.valorTotal || 0;
                                  cur.cmv += r.custoTotal || 0;
                                  map.set(k, cur);
                                }
                                const rows = Array.from(map.entries()).map(([k,v])=>{
                                  const mb = v.valor>0 ? Math.max(-100, Math.min(100, (1 - v.cmv/v.valor)*100)) : 0;
                                  const pmp = v.pacotes>0 ? v.valor/v.pacotes : 0;
                                  const cmp = v.pacotes>0 ? v.cmv/v.pacotes : 0;
                                  return { cliente:k, ...v, mb, pmp, cmp };
                                });
                                setModalTitle(`Clientes de ${p}`);
                                setModalData(rows);
                                setShowModal(true);
                              }}>{p}</button>
                            </li>
                          ))}
                        </ul>
                      </div>

                    </div>
                  </>
                )}
        </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modal */}
      {showModal && (
        <>
          <div className={vendasStyles['modal-overlay']} onClick={() => setShowModal(false)}></div>
          <div className={vendasStyles.modal}>
            <div className={vendasStyles['modal-card']}>
              <div className={vendasStyles['modal-head']}>
                <h4>{modalTitle}</h4>
                <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={() => setShowModal(false)}>Fechar</button>
              </div>
              <div className={vendasStyles['table-scroll']} style={{maxHeight: '400px', overflowY: 'auto'}}>
                <table className={vendasStyles['modal-table']}>
                  <thead>
                    <tr>
                      {/* Detectar se é por produto ou por cliente */}
                      <th>{(modalData && modalData[0] && 'produto' in modalData[0]) ? 'Produto' : 'Cliente'}</th>
                      <th>Unidades</th>
                      {meta?.hasPackages && <th>Pacotes</th>}
                      {meta?.hasBoxes && <th>Caixas</th>}
                      <th>Valor</th>
                      <th>Margem Bruta</th>
                      <th>{meta?.hasPackages ? 'PMP' : 'PMV'}</th>
                      <th>{meta?.hasPackages ? 'CMP' : 'CMV'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalData.map((item: ModalData, index: number) => {
                      const key = item.produto ?? item.cliente ?? '-';
                      const unidades = item.unidades ?? 0;
                      const pacotes = item.pacotes ?? 0;
                      const caixas = item.caixas ?? 0;
                      const valor = item.valor ?? 0;
                      const mb = typeof item.mb === 'number' ? Math.round(item.mb) : 0;
                      
                      // Calcular PMP/CMP ou PMV/CMV baseado em meta.hasPackages
                      const pmp = meta?.hasPackages ? (item.pmp ?? 0) : (unidades > 0 ? valor / unidades : 0);
                      const cmp = meta?.hasPackages ? (item.cmp ?? 0) : (unidades > 0 ? (item.cmv ?? 0) / unidades : 0);
                      
                      return (
                        <tr key={index}>
                          <td>{key}</td>
                          <td className={vendasStyles.amount}>{unidades.toLocaleString('pt-BR')}</td>
                          {meta?.hasPackages && <td className={vendasStyles.amount}>{formatK(pacotes)}</td>}
                          {meta?.hasBoxes && <td className={vendasStyles.amount}>{caixas.toLocaleString('pt-BR')}</td>}
                          <td className={vendasStyles.amount}>{valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className={vendasStyles.amount}>{mb}%</td>
                          <td className={vendasStyles.amount}>{pmp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className={vendasStyles.amount}>{cmp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de Filtro de Engajamento */}
      {showEngagementFilter && (
        <>
          <div className={vendasStyles['modal-overlay']} onClick={() => setShowEngagementFilter(false)}></div>
          <div className={vendasStyles.modal}>
            <div className={vendasStyles['modal-card']}>
              <div className={vendasStyles['modal-head']}>
                <h4>Configurar Períodos de Engajamento</h4>
                <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={() => setShowEngagementFilter(false)}>Fechar</button>
              </div>
              <div style={{padding: '20px'}}>
                <div style={{marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={quaseInativoMeses}
                    onChange={(e) => setQuaseInativoMeses(parseInt(e.target.value) || 1)}
                    style={{
                      width: '60px',
                      padding: '6px 8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      textAlign: 'center',
                      backgroundColor: '#fff',
                      color: '#333'
                    }}
                  />
                  <div>
                    <label style={{fontWeight: '500', marginBottom: '4px', display: 'block'}}>
                      Clientes quase inativos: sem comprar há quantos meses
                    </label>
                    <small style={{color: '#666', fontSize: '12px'}}>
                      Atualmente: {quaseInativoMeses} {quaseInativoMeses === 1 ? 'mês' : 'meses'} (~{quaseInativoMeses * 30} dias)
                    </small>
                  </div>
                </div>
                
                <div style={{marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={inativoMeses}
                    onChange={(e) => setInativoMeses(parseInt(e.target.value) || 2)}
                    style={{
                      width: '60px',
                      padding: '6px 8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      textAlign: 'center',
                      backgroundColor: '#fff',
                      color: '#333'
                    }}
                  />
                  <div>
                    <label style={{fontWeight: '500', marginBottom: '4px', display: 'block'}}>
                      Clientes inativos: sem comprar há quantos meses
                    </label>
                    <small style={{color: '#666', fontSize: '12px'}}>
                      Atualmente: {inativoMeses} {inativoMeses === 1 ? 'mês' : 'meses'} (~{inativoMeses * 30} dias)
                    </small>
                  </div>
                </div>
                
                <div style={{marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={maxPeriodoMeses}
                    onChange={(e) => setMaxPeriodoMeses(parseInt(e.target.value) || 6)}
                    style={{
                      width: '60px',
                      padding: '6px 8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      textAlign: 'center',
                      backgroundColor: '#fff',
                      color: '#333'
                    }}
                  />
                  <div>
                    <label style={{fontWeight: '500', marginBottom: '4px', display: 'block'}}>
                      Período máximo de dados (meses)
                    </label>
                    <small style={{color: '#666', fontSize: '12px'}}>
                      Atualmente: {maxPeriodoMeses} {maxPeriodoMeses === 1 ? 'mês' : 'meses'} (~{maxPeriodoMeses * 30} dias)
                    </small>
                  </div>
                </div>
                
                <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
                  <button 
                    className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`}
                    onClick={() => setShowEngagementFilter(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    className={`${vendasStyles.btn} ${vendasStyles.btnPrimary}`}
                    onClick={() => {
                      setShowEngagementFilter(false);
                      // Recarregar os dados com os novos períodos
                      loadData();
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className={loadingStyles.loading}>
          <div className={loadingStyles['bg-animations']}>
            <div className={`${loadingStyles.orb} ${loadingStyles['orb-a']}`}></div>
            <div className={`${loadingStyles.orb} ${loadingStyles['orb-b']}`}></div>
            <div className={loadingStyles['grid-overlay']}></div>
          </div>
          <div className={loadingStyles.spinner}></div>
          <div className={loadingStyles['loading-text']}>Processando dados…</div>
    </div>
      )}

      
    </>
  );
}
