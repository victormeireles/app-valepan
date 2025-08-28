'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { ProductSaleRow, fetchSheetData, formatK } from '@/lib/sheets';

declare global {
  interface Window {
    Chart: any;
  }
}

export default function VendasDashboard() {
  const { data: session, status } = useSession();
  const [rawData, setRawData] = useState<ProductSaleRow[]>([]);
  const [filteredData, setFilteredData] = useState<ProductSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

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
  const [modalData, setModalData] = useState<any[]>([]);
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
  const [kpis, setKpis] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [charts, setCharts] = useState<any>({});

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    try {
      const data = await fetchSheetData('vendas');
      setRawData(data);

      // Definir período padrão: do primeiro dia do mês até a data da última venda
      if (data.length > 0) {
        const lastDate = new Date(Math.max(...data.map(r => r.data.getTime())));
        const currentMonthStart = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1); // Primeiro dia do mês
        const currentMonthEnd = new Date(lastDate); // Usar a última data diretamente
        
        console.log('Debug - Última data na base:', lastDate.toISOString().split('T')[0]);
        console.log('Debug - Período padrão:', currentMonthStart.toISOString().split('T')[0], 'a', currentMonthEnd.toISOString().split('T')[0]);

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
        
        // Aplicar filtros iniciais
        applyFilters(data, inicioMes, fimPeriodo, [], []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && rawData.length === 0) {
      console.log('useEffect: Status autenticado, carregando dados');
      loadData();
    }
  }, [status, loadData, rawData.length]);

  // Aplicar filtros
  const applyFilters = (data: ProductSaleRow[], startDate: Date, endDate: Date, clients: string[], products: string[]) => {
    // Ajustar startDate para o início do dia e endDate para o final do dia
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log('Debug - applyFilters:', startOfDay.toISOString().split('T')[0], 'a', endOfDay.toISOString().split('T')[0]);
    
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
    
    console.log('applyFilters: Dados filtrados definidos, chartData será gerado');
    
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
    
    const chartDataResult = generateChartData(filtered, data, previousData, startDate, endDate);
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
      console.log('Debug - Caso 1: Mês completo vs mês anterior completo');
    }
    // Caso 2: date-from = dia 1 e mesmo mês
    else if (startDay === 1 && startMonth === endMonth) {
      prevStartDate = new Date(startDate.getFullYear(), startMonth - 1, 1);
      prevEndDate = new Date(startDate.getFullYear(), startMonth - 1, endDay);
      compareLabel = 'mês anterior';
      console.log('Debug - Caso 2: Mês parcial vs mês anterior parcial');
    }
    // Caso 3: Regra padrão
    else {
      const daysDiff = Math.ceil((endOfDay.getTime() - startOfDay.getTime()) / (1000 * 60 * 60 * 24));
      prevEndDate = new Date(startOfDay);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - daysDiff + 1);
      
      // Determinar compareLabel baseado no período
      if (daysDiff === 7) {
        compareLabel = 'semana anterior';
      } else if (daysDiff >= 28 && daysDiff <= 31) {
        compareLabel = 'mês anterior';
      } else {
        compareLabel = 'período anterior';
      }
      console.log('Debug - Caso 3: Regra padrão - período anterior');
    }
    
    console.log('Debug - Período atual:', startDate.toISOString().split('T')[0], 'a', endDate.toISOString().split('T')[0]);
    console.log('Debug - Período comparação:', prevStartDate.toISOString().split('T')[0], 'a', prevEndDate.toISOString().split('T')[0]);
    console.log('Debug - Compare label:', compareLabel);
    
    const previousData = allData.filter(row => 
      row.data >= prevStartDate && row.data <= prevEndDate
    );

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
    
    // Debug: verificar valores calculados
    console.log('Debug - Valores calculados:', {
      unidadesAtual,
      pacotesAtual,
      caixasAtual,
      sampleQuantidades: currentData.slice(0, 3).map(row => row.quantidade)
    });

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
    const calcVariacao = (atual: number, anterior: number) => 
      anterior > 0 ? ((atual - anterior) / anterior) * 100 : 0;

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
        margemBruta: { 
          valor: margemBrutaAtual,
          variacao: calcVariacao(margemBrutaAtual, margemBrutaAnterior)
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
          projecao: faturamentoYTD * 2
        },
        compareLabel,
        showProjection
    });
  };

  // Gerar dados para gráficos
  const generateChartData = (filteredData: ProductSaleRow[], allData: ProductSaleRow[], previousData: ProductSaleRow[], startDate: Date, endDate: Date) => {
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
    
    // Debug: verificar dados de entrada
    console.log('Debug - filteredData sample:', filteredData.slice(0, 3).map(row => ({
      produto: row.produto,
      valorTotal: row.valorTotal,
      custoTotal: row.custoTotal,
      quantidade: row.quantidade
    })));
    
    filteredData.forEach(row => {
      if (row.produto) {
        produtoMap.set(row.produto, (produtoMap.get(row.produto) || 0) + row.valorTotal);
        produtoCMVMap.set(row.produto, (produtoCMVMap.get(row.produto) || 0) + (row.custoTotal || 0));
      }
    });
    
    // Debug: verificar mapas construídos
    console.log('Debug - produtoMap:', Array.from(produtoMap.entries()));
    console.log('Debug - produtoCMVMap:', Array.from(produtoCMVMap.entries()));
    
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
        
        // Debug para verificar os valores
        if (produto === 'BM Prime') {
          console.log('Debug - BM Prime:', {
            produto,
            valor,
            cmv,
            quantidadeTotal,
            pacotesTotal,
            precoMedioPorPacote,
            custoMedioPorPacote
          });
        }
        
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
        quantidadeTotal: 0,
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

    // Rankings de variação por cliente (top 5 up/down) - como no original
    const sumByClient = (data: ProductSaleRow[]) => {
      const m = new Map<string, number>();
      for (const row of data) {
        m.set(row.cliente, (m.get(row.cliente) || 0) + row.valorTotal);
      }
      return m;
    };
    
    // Calcular totais por cliente para período atual e anterior
    // Se há filtro de cliente, usar apenas filteredData para comparação
    const curByCli = sumByClient(filteredData);
    
    // Para dados anteriores, aplicar mesmo filtro de cliente se houver
    let previousDataToUse = previousData;
    if (filteredData.length < allData.length) {
      // Se há filtro de cliente, aplicar aos dados anteriores também
      const clientesFiltrados = new Set(filteredData.map(row => row.cliente));
      previousDataToUse = previousData.filter(row => clientesFiltrados.has(row.cliente));
    }
    
    const prevByCli = sumByClient(previousDataToUse);
    
    // Combinar todos os clientes únicos
    const allClients = new Set([...curByCli.keys(), ...prevByCli.keys()]);
    
    const variations = [];
    for (const cliente of allClients) {
      const cur = curByCli.get(cliente) || 0;
      const prev = prevByCli.get(cliente) || 0;
      const delta = cur - prev;
      const pct = prev === 0 ? (cur > 0 ? 100 : 0) : (delta / prev * 100);
      
      // Só incluir se houver dados em pelo menos um dos períodos
      if (cur || prev) {
        variations.push({ cliente, cur, prev, delta, pct });
      }
    }
    
    // Ordenar por delta (maior para menor)
    variations.sort((a, b) => b.delta - a.delta);
    
    const rankingUp = variations
      .filter(item => item.delta > 0)
      .slice(0, 5);
    
    const rankingDown = variations
      .filter(item => item.delta < 0)
      .sort((a, b) => a.delta - b.delta) // Ordenar do mais negativo para o menos negativo (maior queda em absoluto primeiro)
      .slice(0, 5);

    // Engajamento baseado em períodos específicos (como no original)
    // - Ativos: compras entre [endDate]-13 e [endDate]
    // - Quase inativo: entre [endDate]-27 e [endDate]-14 (exclusivo de Ativos)
    // - Inativos: entre [endDate]-55 e [endDate]-28 (exclusivo anterior)
    const msDay = 24 * 60 * 60 * 1000;
    const endTo = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
    const actStart = new Date(endTo.getTime() - 13 * msDay);
    const quasiStart = new Date(endTo.getTime() - 27 * msDay);
    const quasiEnd = new Date(endTo.getTime() - 14 * msDay);
    const inaStart = new Date(endTo.getTime() - 55 * msDay);
    const inaEnd = new Date(endTo.getTime() - 28 * msDay);

    // Usar filteredData se houver filtro de cliente, senão usar allData
    const dataToUse = filteredData.length < allData.length ? filteredData : allData;
    
    const rowsActive = dataToUse.filter(r => r.data >= actStart && r.data <= endTo);
    
    // Novos: clientes cuja primeira compra na história ocorreu dentro do período selecionado
    const firstByClient = new Map();
    for (const r of allData) {
      const prev = firstByClient.get(r.cliente);
      if (!prev || r.data < prev) firstByClient.set(r.cliente, r.data);
    }
    const setNovos = new Set();
    for (const r of filteredData) {
      const first = firstByClient.get(r.cliente);
      if (first && first >= startDate && first <= endDate) setNovos.add(r.cliente);
    }
    
    const rowsQuasiRange = dataToUse.filter(r => r.data >= quasiStart && r.data <= quasiEnd);
    const rowsInactiveRange = dataToUse.filter(r => r.data >= inaStart && r.data <= inaEnd);

    const setAtivos = new Set(rowsActive.map(r => r.cliente));
    const setQuasiRange = new Set(rowsQuasiRange.map(r => r.cliente));
    const setInactiveRange = new Set(rowsInactiveRange.map(r => r.cliente));
    const setQuase = new Set(Array.from(setQuasiRange).filter(c => !setAtivos.has(c)));
    const setInativos = new Set(Array.from(setInactiveRange).filter(c => !setAtivos.has(c) && !setQuase.has(c)));

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
            console.log('Carregando Chart.js...');
            const { Chart } = await import('chart.js/auto');
            window.Chart = Chart;
            console.log('Chart.js carregado com sucesso');
          } catch (error) {
            console.error('Erro ao carregar Chart.js:', error);
          }
        }
      };

      loadChartJS();
    }, []);

    // Renderizar gráficos
    useEffect(() => {
      console.log('useEffect renderCharts - chartData:', !!chartData, 'window.Chart:', !!window.Chart);
      if (chartData && typeof window !== 'undefined' && window.Chart) {
        console.log('Chamando renderCharts...');
        renderCharts();
      }
    }, [chartData]); // Remover loading como dependência

  const renderCharts = () => {
    if (!chartData) {
      console.log('renderCharts: chartData não disponível');
      return;
    }

    console.log('renderCharts: Iniciando renderização dos gráficos');

    // Destruir gráficos existentes
    Object.values(charts).forEach((chart: any) => {
      if (chart && chart.destroy) chart.destroy();
    });

    const newCharts: any = {};

    // Gráfico de semanas
    const ctxSemanas = document.getElementById('chart-semanas') as HTMLCanvasElement;
    console.log('renderCharts: ctxSemanas encontrado:', !!ctxSemanas);
    if (ctxSemanas) {
      newCharts.semanas = new window.Chart(ctxSemanas, {
        type: 'bar',
        data: {
          labels: chartData.semanas.map((s: any) => s.label),
          datasets: [
            {
              label: 'Margem Bruta',
              data: chartData.semanas.map((s: any) => s.margemBruta),
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
              data: chartData.semanas.map((s: any) => s.faturamento),
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
                callback: (v: any) => {
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
                callback: (v: any) => `${v.toFixed(1)}%`
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
      ctxSemanas.onclick = (evt: any) => {
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
            
            console.log('Período filtrado para semana:', inicioSemana.toLocaleDateString('pt-BR'), 'a', fimSemana.toLocaleDateString('pt-BR'));
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
    console.log('renderCharts: ctxClientes encontrado:', !!ctxClientes);
    if (ctxClientes) {
      // Remover atributos de tamanho para usar CSS
      ctxClientes.removeAttribute('width');
      ctxClientes.removeAttribute('height');
      
      const totalPeriodo = chartData.topClientes.reduce((sum: number, c: any) => sum + c.valor, 0) || 1;
      
      newCharts.clientes = new window.Chart(ctxClientes, {
        type: 'doughnut',
        data: {
          labels: chartData.topClientes.map((c: any) => c.cliente),
          datasets: [{
            data: chartData.topClientes.map((c: any) => c.valor),
            backgroundColor: chartData.topClientes.map((c: any) => c.cor),
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
      ctxClientes.onclick = (evt: any) => {
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
                console.log('Filtro de "Outros" removido - mostrando todos os clientes');
              } else {
                // Filtrar por todos os clientes "Outros"
                newSelectedClients = outrosClients;
                console.log('Filtro aplicado para "Outros":', outrosClients);
              }
            } else {
              // Comportamento normal para clientes específicos
              if (selectedClients.length === 1 && selectedClients[0] === clickedClient.cliente) {
                // Se já está selecionado, limpar filtro
                newSelectedClients = [];
                console.log('Filtro de cliente removido - mostrando todos os clientes');
              } else {
                // Selecionar apenas o cliente clicado
                newSelectedClients = [clickedClient.cliente];
                console.log('Filtro aplicado para cliente:', clickedClient.cliente);
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
    console.log('renderCharts: ctxProdutos encontrado:', !!ctxProdutos);
    if (ctxProdutos && chartData.topProdutos) {
      // Remover atributos de tamanho para usar CSS
      ctxProdutos.removeAttribute('width');
      ctxProdutos.removeAttribute('height');
      
      const totalPeriodoProdutos = chartData.topProdutos.reduce((sum: number, p: any) => sum + p.valor, 0) || 1;
      
      newCharts.produtos = new window.Chart(ctxProdutos, {
        type: 'doughnut',
        data: {
          labels: chartData.topProdutos.map((p: any) => p.produto),
          datasets: [{
            data: chartData.topProdutos.map((p: any) => p.valor),
            backgroundColor: chartData.topProdutos.map((p: any) => p.cor),
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
      ctxProdutos.onclick = (evt: any) => {
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
                              console.log('Filtro de "Outros" removido - mostrando todos os produtos');
                            } else {
                              // Filtrar por todos os produtos "Outros"
                              newSelectedProducts = outrosProdutos;
                              console.log('Filtro aplicado para "Outros":', outrosProdutos);
                            }
                          } else {
              // Comportamento normal para produtos específicos
              if (selectedProducts.length === 1 && selectedProducts[0] === clickedProduct.produto) {
                // Se já está selecionado, limpar filtro
                newSelectedProducts = [];
                console.log('Filtro de produto removido - mostrando todos os produtos');
              } else {
                // Selecionar apenas o produto clicado
                newSelectedProducts = [clickedProduct.produto];
                console.log('Filtro aplicado para produto:', clickedProduct.produto);
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

    // Gráfico de engajamento
    const ctxEng = document.getElementById('chart-eng') as HTMLCanvasElement;
    console.log('renderCharts: ctxEng encontrado:', !!ctxEng);
    if (ctxEng) {
      newCharts.engajamento = new window.Chart(ctxEng, {
        type: 'bar',
        data: {
          labels: ['Novos', 'Ativos', 'Quase inativo', 'Inativos'],
          datasets: [{
            label: 'Engajamento',
            data: [
              chartData.engajamento.novos,
              chartData.engajamento.ativos,
              chartData.engajamento.quase,
              chartData.engajamento.churn
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
              meta.data.forEach((bar: any, index: number) => {
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
      ctxEng.onclick = (evt: any) => {
        const points = newCharts.engajamento.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
        if (!points || points.length === 0) return;
        const idx = points[0].index;
        
        // Construir mapa de totais e última compra por cliente
        const buildMapTotalELast = (dataset: ProductSaleRow[]) => {
          const map = new Map<string, { total: number; last: Date }>();
          for (const r of dataset) {
            const cur = map.get(r.cliente) || { total: 0, last: new Date(0) };
            cur.total += r.valorTotal;
            if (r.data > cur.last) cur.last = r.data;
            map.set(r.cliente, cur);
          }
          return map;
        };
        
        const mapAll = buildMapTotalELast(rawData);
        let setRef: Set<string>;
        let title: string;
        
        if (idx === 0) {
          setRef = chartData.engajamento.sets.novos;
          title = 'Novos (primeira compra no período)';
        } else if (idx === 1) {
          setRef = chartData.engajamento.sets.ativos;
          title = 'Ativos (compraram no período)';
        } else if (idx === 2) {
          setRef = chartData.engajamento.sets.quaseInativos;
          title = 'Quase inativo (últimos 30 dias antes do período)';
    } else {
          setRef = chartData.engajamento.sets.inativos;
          title = 'Inativos (31–60 dias antes do período)';
        }
        
        const list = Array.from(setRef || [])
          .map(c => ({
            cliente: c,
            total: mapAll.get(c)?.total || 0,
            last: mapAll.get(c)?.last || new Date(0)
          }))
          .sort((a, b) => b.last.getTime() - a.last.getTime());
        
        // Abrir modal
        setModalTitle(title);
        setModalData(list);
        setShowModal(true);
      };
    }

    setCharts(newCharts);
    console.log('renderCharts: Gráficos criados com sucesso:', Object.keys(newCharts));
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
      
      console.log('Debug - Aplicar período:', startDate.toISOString().split('T')[0], 'a', endDate.toISOString().split('T')[0]);
      
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
    
    console.log('Debug - Este mês (baseada na base):', start.toISOString().split('T')[0], 'a', end.toISOString().split('T')[0]);
    
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
    
    console.log('Debug - Mês passado (baseado na base):', inicioMesAnterior.toISOString().split('T')[0], 'a', fimMesAnterior.toISOString().split('T')[0]);
    
    setPeriodStart(inicioMesAnterior.toISOString().split('T')[0]);
    setPeriodEnd(fimMesAnterior.toISOString().split('T')[0]);
    applyFilters(rawData, inicioMesAnterior, fimMesAnterior, selectedClients, selectedProducts);
    setShowPeriodPanel(false);
  };

  const handleClientApply = () => {
    const startDate = new Date(periodStart + 'T00:00:00');
    const endDate = new Date(periodEnd + 'T00:00:00');
    
    console.log('Debug - Aplicar cliente:', startDate.toISOString().split('T')[0], 'a', endDate.toISOString().split('T')[0]);
    
    applyFilters(rawData, startDate, endDate, selectedClients, selectedProducts);
    setShowClientPanel(false);
  };

  const handleProductApply = () => {
    const startDate = new Date(periodStart + 'T00:00:00');
    const endDate = new Date(periodEnd + 'T00:00:00');
    
    console.log('Debug - Aplicar produto:', startDate.toISOString().split('T')[0], 'a', endDate.toISOString().split('T')[0]);
    
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

  // Mostrar loading bonito sempre que necessário
  const showLoading = status === 'loading' || loading || initialLoad || !session;
  
  if (showLoading) {
    return (
      <>
        <style jsx global>{`
          /* Esconder qualquer conteúdo padrão */
          body { 
            overflow: hidden !important; 
            background: #090c12 !important;
          }
          
          .loading { 
            position: fixed !important; 
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            display: flex !important; 
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            background: linear-gradient(180deg, #090c12 0%, #0f1420 60%, #090c12 100%) !important; 
            backdrop-filter: blur(12px) !important; 
            z-index: 9999 !important;
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif !important;
          }
          .spinner { 
            width: 54px !important; 
            height: 54px !important; 
            border-radius: 50% !important; 
            border: 4px solid rgba(255,255,255,.15) !important; 
            border-top-color: #e67e22 !important; 
            animation: spin 1s linear infinite !important; 
            margin-bottom: 12px !important;
          }
          .loading-text { 
            margin-top: 12px !important; 
            color: #c9cbd6 !important; 
            font-weight: 600 !important; 
            font-size: 14px !important;
            text-align: center !important;
          }
          @keyframes spin { 
            to { transform: rotate(360deg) } 
          }
          .bg-animations { position: fixed; inset: 0; overflow: hidden; z-index: -1; }
          .orb { position: absolute; width: 520px; height: 520px; filter: blur(82px); opacity: .4; border-radius: 50%; animation: float 20s ease-in-out infinite; }
          .orb-a { background: radial-gradient(circle at 30% 30%, #1E88E5, transparent 60%); top: -120px; left: -80px; }
          .orb-b { background: radial-gradient(circle at 70% 70%, #00d3a7, transparent 60%); bottom: -140px; right: -120px; animation-delay: -6s; }
          @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-20px) } }
          .grid-overlay { position: absolute; inset: 0; background: linear-gradient(transparent 95%, rgba(255,255,255,.05) 95%), linear-gradient(90deg, transparent 95%, rgba(255,255,255,.05) 95%); background-size: 28px 28px; mix-blend-mode: overlay; opacity: .25; }
        `}</style>
        <div className="loading">
          <div className="bg-animations">
            <div className="orb orb-a"></div>
            <div className="orb orb-b"></div>
            <div className="grid-overlay"></div>
          </div>
          <div className="spinner"></div>
          <div className="loading-text">Processando dados…</div>
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
  const formatVariation = (value: number, isInteger: boolean = false) => {
    const absValue = Math.abs(value);
    if (isInteger) {
      // Para números inteiros (como clientes únicos), sempre 0 casas decimais
      return `${value >= 0 ? '+' : ''}${Math.round(value)}`;
    } else if (absValue < 5) {
      return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    } else {
      return `${value >= 0 ? '+' : ''}${Math.round(value)}%`;
    }
  };

  return (
    <>
      <style jsx global>{`
        /* Restaurar body quando carregado */
        body { 
          overflow: auto !important; 
          background: transparent !important;
        }
      `}</style>
      
      {/* Carregar Chart.js */}
      <script 
        src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js" 
        async 
      />

      <div className="bg-animations">
        <div className="orb orb-a"></div>
        <div className="orb orb-b"></div>
        <div className="grid-overlay"></div>
      </div>

      <header className="app-header">
        <h1 className="brand"><span>Vale</span>pan Vendas</h1>
        <div className="header-right">
          <div className="filter-badges desktop-only">
          {/* Filtro de período */}
          <button 
            className="badge badge-interactive" 
            title="Filtrar período"
            onClick={() => setShowPeriodPanel(!showPeriodPanel)}
          >
            <span className="dot-indicator"></span>
            <span>{periodStart && periodEnd ? `${new Date(periodStart + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} a ${new Date(periodEnd + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}` : 'Período'}</span>
            <span className="caret">▾</span>
          </button>
          
          {showPeriodPanel && (
              <>
                <div className="modal-overlay" onClick={() => setShowPeriodPanel(false)}></div>
            <div className="period-panel">
              <div className="period-presets">
                <button className="chip" onClick={handlePresetThisMonth}>Este mês</button>
                <button className="chip" onClick={handlePresetLastMonth}>Mês passado</button>
              </div>
              <div className="period-row">
                <label>Início</label>
                <input 
                  type="date" 
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="period-row">
                <label>Fim</label>
                <input 
                  type="date" 
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
              <div className="period-actions">
                <button className="btn" onClick={handlePeriodApply}>Aplicar</button>
                <button className="btn btn-ghost" onClick={() => setShowPeriodPanel(false)}>Fechar</button>
              </div>
            </div>
              </>
          )}

          {/* Filtro de cliente */}
          <button 
            className="badge badge-interactive" 
            title="Filtrar cliente"
            onClick={() => setShowClientPanel(!showClientPanel)}
          >
            <span className="dot-indicator"></span>
              <span>{selectedClients.length === 1 ? selectedClients[0] : selectedClients.length > 0 ? `${selectedClients.length} selecionados` : 'Clientess'}</span>
            <span className="caret">▾</span>
          </button>
          
          {showClientPanel && (
              <>
                <div className="modal-overlay" onClick={() => setShowClientPanel(false)}></div>
            <div className="period-panel">
              <div className="period-row">
                <label>Buscar</label>
                <input 
                  type="text" 
                  placeholder="Digite para filtrar"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
              </div>
              <div className="table-scroll" style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--panel-border)', borderRadius: '10px'}}>
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
              <div className="period-actions">
                <button className="btn" onClick={handleClientApply}>Aplicar</button>
                <button className="btn btn-ghost" onClick={() => setSelectedClients([])}>Limpar</button>
              </div>
            </div>
              </>
          )}

          {/* Filtro de produto */}
          <button 
            className="badge badge-interactive" 
            title="Filtrar produto"
            onClick={() => setShowProductPanel(!showProductPanel)}
          >
            <span className="dot-indicator"></span>
              <span>{selectedProducts.length === 1 ? selectedProducts[0] : selectedProducts.length > 0 ? `${selectedProducts.length} selecionados` : 'Produtos'}</span>
            <span className="caret">▾</span>
          </button>
          
          {showProductPanel && (
              <>
                <div className="modal-overlay" onClick={() => setShowProductPanel(false)}></div>
            <div className="period-panel">
              <div className="period-row">
                <label>Buscar</label>
                <input 
                  type="text" 
                  placeholder="Digite para filtrar"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
              <div className="table-scroll" style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--panel-border)', borderRadius: '10px'}}>
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
              <div className="period-actions">
                <button className="btn" onClick={handleProductApply}>Aplicar</button>
                <button className="btn btn-ghost" onClick={() => setSelectedProducts([])}>Limpar</button>
            </div>
          </div>
              </>
          )}
          </div>
        </div>
      </header>

      {/* Filtros mobile - fora do header */}
      <div className="mobile-filters">
        <div className="filter-badges">
          {/* Filtro de período */}
          <button 
            className="badge badge-interactive" 
            title="Filtrar período"
            onClick={() => setShowPeriodPanel(!showPeriodPanel)}
          >
            <span className="dot-indicator"></span>
            <span>{periodStart && periodEnd ? `${new Date(periodStart + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} a ${new Date(periodEnd + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}` : 'Período'}</span>
            <span className="caret">▾</span>
          </button>
          
          {showPeriodPanel && (
            <>
              <div className="modal-overlay" onClick={() => setShowPeriodPanel(false)}></div>
              <div className="period-panel">
                <div className="period-presets">
                  <button className="chip" onClick={handlePresetThisMonth}>Este mês</button>
                  <button className="chip" onClick={handlePresetLastMonth}>Mês passado</button>
                </div>
                <div className="period-row">
                  <label>Início</label>
                  <input 
                    type="date" 
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </div>
                <div className="period-row">
                  <label>Fim</label>
                  <input 
                    type="date" 
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
                <div className="period-actions">
                  <button className="btn" onClick={handlePeriodApply}>Aplicar</button>
                  <button className="btn btn-ghost" onClick={() => setShowPeriodPanel(false)}>Fechar</button>
                </div>
              </div>
            </>
          )}

          {/* Filtro de cliente */}
          <button 
            className="badge badge-interactive" 
            title="Filtrar cliente"
            onClick={() => setShowClientPanel(!showClientPanel)}
          >
            <span className="dot-indicator"></span>
            <span>{selectedClients.length === 1 ? selectedClients[0] : selectedClients.length > 0 ? `${selectedClients.length} clientes` : 'Clientes'}</span>
            <span className="caret">▾</span>
          </button>
          
          {showClientPanel && (
            <>
              <div className="modal-overlay" onClick={() => setShowClientPanel(false)}></div>
              <div className="period-panel">
                <div className="period-row">
                  <label>Buscar</label>
                  <input 
                    type="text" 
                    placeholder="Digite para filtrar"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                </div>
                <div className="table-scroll" style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--panel-border)', borderRadius: '10px'}}>
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
                <div className="period-actions">
                  <button className="btn" onClick={handleClientApply}>Aplicar</button>
                  <button className="btn btn-ghost" onClick={() => setSelectedClients([])}>Limpar</button>
                </div>
              </div>
            </>
          )}

          {/* Filtro de produto */}
          <button 
            className="badge badge-interactive" 
            title="Filtrar produto"
            onClick={() => setShowProductPanel(!showProductPanel)}
          >
            <span className="dot-indicator"></span>
            <span>{selectedProducts.length === 1 ? selectedProducts[0] : selectedProducts.length > 0 ? `${selectedProducts.length} produtos` : 'Produtos'}</span>
            <span className="caret">▾</span>
          </button>
          
          {showProductPanel && (
            <>
              <div className="modal-overlay" onClick={() => setShowProductPanel(false)}></div>
              <div className="period-panel">
                <div className="period-row">
                  <label>Buscar</label>
                  <input 
                    type="text" 
                    placeholder="Digite para filtrar"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                <div className="table-scroll" style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--panel-border)', borderRadius: '10px'}}>
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
                <div className="period-actions">
                  <button className="btn" onClick={handleProductApply}>Aplicar</button>
                  <button className="btn btn-ghost" onClick={() => setSelectedProducts([])}>Limpar</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <main className="container">
        {/* estado de modo do drilldown */}
        {/* @ts-expect-error - criado dinamicamente abaixo */}
        
        {/* KPIs */}
         {kpis && (
        <section className="kpis">
          <div className="kpi">
            <div className="kpi-label">Faturamento do período</div>
               <div className="kpi-value">{formatK(kpis.faturamento.valor)}</div>
               <div className={`kpi-sub ${kpis.faturamento.variacao >= 0 ? 'pos' : 'neg'}`}>
                 {formatVariation(kpis.faturamento.variacao)} vs {kpis.compareLabel || 'mês anterior'}
               </div>
               {kpis.showProjection && (
                 <div className="kpi-foot">Projeção: <strong>{formatK(kpis.faturamento.projecao)}</strong></div>
               )}
          </div>
          
          <div className="kpi">
               <div className="kpi-label">Margem bruta</div>
               <div className="kpi-value">{formatNumber(kpis.margemBruta.valor, '%')}</div>
               <div className={`kpi-sub ${kpis.margemBruta.variacao >= 0 ? 'pos' : 'neg'}`}>
                 {formatVariation(kpis.margemBruta.variacao)} vs {kpis.compareLabel || 'mês anterior'}
               </div>
          </div>
          
          <div className="kpi">
               <div className="kpi-label">Pedidos</div>
               <div className="kpi-value">
                 <div className="kpi-main-row">
                   <span className="kpi-main-value">{kpis.pedidos.valor.toLocaleString('pt-BR')}</span>
                   <span className={`kpi-variation-inline ${kpis.pedidos.variacao >= 0 ? 'pos' : 'neg'}`}>
                     {formatVariation(kpis.pedidos.variacao)}
                   </span>
                 </div>
                 <div className="kpi-secondary-row">
                   <span className="kpi-secondary-value">{kpis.clientesUnicos.valor.toLocaleString('pt-BR')} clientes</span>
                                     <span className={`kpi-variation-inline ${kpis.clientesUnicos.variacao >= 0 ? 'pos' : 'neg'}`}>
                    {formatVariation(kpis.clientesUnicos.variacao, true)}
                  </span>
                 </div>
               </div>
          </div>

          <div className="kpi">
               <div className="kpi-label">Caixas</div>
               <div className="kpi-value">
                 <div className="kpi-main-row">
                   <span className="kpi-main-value">{formatK(kpis.caixas.valor)}</span>
                   <span className={`kpi-variation-inline ${kpis.caixas.variacao >= 0 ? 'pos' : 'neg'}`}>
                     {formatVariation(kpis.caixas.variacao)}
                   </span>
                 </div>
                 <div className="kpi-secondary-row">
                   <span className="kpi-secondary-value">{formatK(kpis.pacotes.valor)} pacotes</span>
                   <span className={`kpi-variation-inline ${kpis.pacotes.variacao >= 0 ? 'pos' : 'neg'}`}>
                     {formatVariation(kpis.pacotes.variacao)}
                   </span>
                 </div>
                 <div className="kpi-secondary-row" style={{marginTop: '8px'}}>
                   <span className="kpi-secondary-value">{formatK(kpis.unidades.valor)} pães</span>
                   <span className={`kpi-variation-inline ${kpis.unidades.variacao >= 0 ? 'pos' : 'neg'}`}>
                     {formatVariation(kpis.unidades.variacao)}
                   </span>
                 </div>
               </div>
             </div>
             
             <div className="kpi">
               <div className="kpi-label">Faturamento {new Date().getFullYear()}</div>
               <div className="kpi-value">{formatK(kpis.faturamentoAnual.valor)}</div>
               <div className={`kpi-sub ${kpis.faturamentoAnual.variacao >= 0 ? 'pos' : 'neg'}`}>
                 {formatVariation(kpis.faturamentoAnual.variacao)} vs {new Date().getFullYear() - 1}
               </div>
               <div className="kpi-foot">Projeção: <strong>{formatK(kpis.faturamentoAnual.projecao)}</strong></div>
          </div>
        </section>
         )}

        {/* Gráficos */}
        <section className="charts">
          <div className="card">
            <h3>Vendas por semana (últimas 8)</h3>
			<p><small>Clique nas barras para filtrar o período</small></p>
            <div style={{height: '300px', position: 'relative', overflow: 'hidden'}}>
              <canvas id="chart-semanas" height="300"></canvas>
            </div>
          </div>
          <div className="card">
            <h3>Top clientes por valor</h3>
			<p><small>Clique no gráfico para filtrar por cliente</small></p>
            <div className="topcli">
              <div className="chart-donut">
                <canvas id="chart-clientes"></canvas>
              </div>
              <ul className="topcli-legend">
                {chartData?.topClientes.map((cliente: any, index: number) => {
                  const totalPeriodo = chartData.topClientes.reduce((sum: number, c: any) => sum + c.valor, 0) || 1;
                  const pct = (cliente.valor / totalPeriodo * 100) || 0;
                  
                  // Lógica de seleção especial para "Outros"
                  let isSelected = false;
                  if (cliente.cliente === 'Outros') {
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
                    isSelected = selectedClients.length === 1 && selectedClients[0] === cliente.cliente;
                  }
                  return (
                    <li 
                      key={cliente.cliente}
                      onClick={() => {
                        try {
                          let newSelectedClients: string[];
                          
                          // Tratamento especial para "Outros"
                          if (cliente.cliente === 'Outros') {
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
                              console.log('Filtro de "Outros" removido - mostrando todos os clientes');
                            } else {
                              // Filtrar por todos os clientes "Outros"
                              newSelectedClients = outrosClients;
                              console.log('Filtro aplicado para "Outros":', outrosClients);
                            }
                          } else {
                            // Comportamento normal para clientes específicos
                            if (isSelected) {
                              // Se já está selecionado, limpar filtro
                              newSelectedClients = [];
                              console.log('Filtro de cliente removido - mostrando todos os clientes');
                            } else {
                              // Selecionar apenas o cliente clicado
                              newSelectedClients = [cliente.cliente];
                              console.log('Filtro aplicado para cliente:', cliente.cliente);
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
                      <span className="dot" style={{backgroundColor: cliente.cor}}></span>
                      <span>{cliente.cliente}</span>
                      <span>{Math.round(cliente.valor / 1000)}k ({pct.toFixed(0)}%)</span>
                      <span className="margem-bruta">MB: {cliente.margemBruta}%</span>
                    </li>
                  );
                })}
              </ul>
                        </div>
                      </div>
        </section>

        {/* Gráfico de Top Produtos */}
        <section className="charts">
          <div className="card">
            <h3>Top produtos por valor</h3>
			<p><small>Clique no gráfico para filtrar por produto</small></p>
            <div className="topcli">
              <div className="chart-donut">
                <canvas id="chart-produtos"></canvas>
                        </div>
              <ul className="topcli-legend">
                {chartData?.topProdutos?.map((produto: any, index: number) => {
                  const totalPeriodo = chartData.topProdutos.reduce((sum: number, p: any) => sum + p.valor, 0) || 1;
                  const pct = (produto.valor / totalPeriodo * 100) || 0;
                  
                  // Lógica de seleção especial para "Outros"
                  let isSelected = false;
                  if (produto.produto === 'Outros') {
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
                    isSelected = selectedProducts.length === 1 && selectedProducts[0] === produto.produto;
                  }
                  return (
                    <li 
                      key={produto.produto}
                      onClick={() => {
                        try {
                          let newSelectedProducts: string[];
                          
                          // Tratamento especial para "Outros"
                          if (produto.produto === 'Outros') {
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
                              console.log('Filtro de "Outros" removido - mostrando todos os produtos');
                            } else {
                              // Filtrar por todos os produtos "Outros"
                              newSelectedProducts = outrosProdutos;
                              console.log('Filtro aplicado para "Outros":', outrosProdutos);
                            }
                          } else {
                            // Comportamento normal para produtos específicos
                            if (isSelected) {
                              // Se já está selecionado, limpar filtro
                              newSelectedProducts = [];
                              console.log('Filtro de produto removido - mostrando todos os produtos');
                            } else {
                              // Selecionar apenas o produto clicado
                              newSelectedProducts = [produto.produto];
                              console.log('Filtro aplicado para produto:', produto.produto);
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
                      <span className="dot" style={{backgroundColor: produto.cor}}></span>
                      <div style={{flex: 1, minWidth: 0}}>
                        {/* Primeira linha: Título + PMP e CMP */}
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                          <div style={{fontWeight: '600', color: 'var(--text)'}}>{produto.produto}</div>
                          <div style={{display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px'}}>
                            <span className="preco-medio" style={{color: 'var(--accent)', fontWeight: '500'}}>PMP: {(produto.precoMedioPorPacote || 0).toFixed(2)}</span>
                            <span className="custo-medio" style={{color: 'var(--accent)', fontWeight: '500'}}>CMP: {(produto.custoMedioPorPacote || 0).toFixed(2)}</span>
                          </div>
                        </div>
                        {/* Segunda linha: Valor, pacotes e MB */}
                        <div style={{fontSize: '11px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span>{Math.round(produto.valor / 1000)}k ({pct.toFixed(0)}%) • {formatK(produto.pacotesTotal || 0)} pacotes</span>
                          <span className="margem-bruta" style={{color: 'var(--accent)', fontWeight: '500'}}>MB: {Math.round(produto.margemBruta)}%</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
                </ul>
              </div>
            </div>
        </section>

        {/* Insights */}
        <section className="charts">
          <div className="card span-2">
            <h3>{getVariationTitle()}</h3>
            <div className="rank-grid">
              <div>
                <div className="kpi-label">Quem mais cresceu</div>
                <ul className="rank">
                  {chartData?.rankingUp.map((item: any) => (
                    <li 
                      key={item.cliente}
                      onClick={() => handleClientClick(item.cliente)}
                      style={{ cursor: 'pointer' }}
                      className={selectedClients.includes(item.cliente) ? 'selected' : ''}
                    >
                      <span>{item.cliente}</span>
                      <span className="pos">+{formatK(item.delta)} ({Math.round(item.pct || 0)}%)</span>
                    </li>
                  ))}
                </ul>
                      </div>
                      <div>
                 <div className="kpi-label">Quem mais caiu</div>
                 <ul className="rank">
                   {chartData?.rankingDown.map((item: any) => (
                     <li 
                       key={item.cliente}
                       onClick={() => handleClientClick(item.cliente)}
                       style={{ cursor: 'pointer' }}
                       className={selectedClients.includes(item.cliente) ? 'selected' : ''}
                     >
                       <span>{item.cliente}</span>
                       <span className="neg">{formatK(item.delta)} ({Math.round(item.pct || 0)}%)</span>
                    </li>
                  ))}
          </ul>
                      </div>
                      </div>
        </div>
                     <div className="card">
             <h3>Engajamento de clientes</h3>
             <div className="eng-visual" style={{height: '280px', position: 'relative', overflow: 'hidden'}}>
               <canvas id="chart-eng" height="280"></canvas>
            </div>
          </div>
        </section>

        {/* Blocos: Produtos por cliente e Clientes por produto */}
        <section className="table-wrap" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card">
            <div className="table-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h3>Produtos desse cliente</h3>
              <div style={{ position:'relative', display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="chip" onClick={()=>{ setShowClientPicker(!showClientPicker); setClientPickerTemp(selectCliente); }}>
                  {selectCliente || 'Selecionar cliente'}
                </button>
                {showClientPicker && (
                  <>
                    <div className="modal-overlay" onClick={() => setShowClientPicker(false)}></div>
                    <div className="period-panel" style={{ right: 0, bottom: 54, top: 'auto' }}>
                      <div className="period-row">
                        <label>Buscar</label>
                        <input type="text" placeholder="Digite para filtrar" value={clientPickerQuery} onChange={(e)=>setClientPickerQuery(e.target.value)} />
                      </div>
                      <div className="table-scroll" style={{maxHeight: '300px', overflowY: 'auto'}}>
                        <ul style={{listStyle:'none', margin:0, padding:'6px 8px', display:'grid', gap:'6px'}}>
                          {Array.from(new Set(filteredData.map(r=>r.cliente))).
                            filter(c=>!clientPickerQuery || c.toLowerCase().includes(clientPickerQuery.toLowerCase())).
                            sort().map(c=> (
                            <li key={c}>
                              <button className={`chip ${clientPickerTemp===c ? 'active' : ''}`} style={{width:'100%', justifyContent:'flex-start'}} onClick={()=>{
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

          <div className="card">
            <div className="table-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h3>Clientes desse produto</h3>
              <div style={{ position:'relative', display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="chip" onClick={()=>{ setShowProductPicker(!showProductPicker); setProductPickerTemp(selectProduto); }}>
                  {selectProduto || 'Selecionar produto'}
                </button>
                {showProductPicker && (
                  <>
                    <div className="modal-overlay" onClick={() => setShowProductPicker(false)}></div>
                    <div className="period-panel" style={{ right: 0, bottom: 54, top: 'auto' }}>
                      <div className="period-row">
                        <label>Buscar</label>
                        <input type="text" placeholder="Digite para filtrar" value={productPickerQuery} onChange={(e)=>setProductPickerQuery(e.target.value)} />
                      </div>
                      <div className="table-scroll" style={{maxHeight: '300px', overflowY: 'auto'}}>
                        <ul style={{listStyle:'none', margin:0, padding:'6px 8px', display:'grid', gap:'6px'}}>
                          {Array.from(new Set(filteredData.map(r=>r.produto))).
                            filter(p=>!productPickerQuery || p.toLowerCase().includes(productPickerQuery.toLowerCase())).
                            sort().map(p=> (
                            <li key={p}>
                              <button className={`chip ${productPickerTemp===p ? 'active' : ''}`} style={{width:'100%', justifyContent:'flex-start'}} onClick={()=>{
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
          <div className="modal-overlay" onClick={() => setShowModal(false)}></div>
          <div className="modal">
            <div className="modal-card">
              <div className="modal-head">
                <h4>{modalTitle}</h4>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Fechar</button>
              </div>
              <div className="table-scroll" style={{maxHeight: '400px', overflowY: 'auto'}}>
                <table className="modal-table">
                  <thead>
                    <tr>
                      {/* Detectar se é por produto ou por cliente */}
                      <th>{(modalData && modalData[0] && (modalData[0] as any).produto !== undefined) ? 'Produto' : 'Cliente'}</th>
                      <th>Unidades</th>
                      <th>Pacotes</th>
                      <th>Caixas</th>
                      <th>Valor</th>
                      <th>Margem Bruta</th>
                      <th>PMP</th>
                      <th>CMP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalData.map((item: any, index: number) => {
                      const key = item.produto ?? item.cliente ?? '-';
                      const unidades = item.unidades ?? 0;
                      const pacotes = item.pacotes ?? 0;
                      const caixas = item.caixas ?? 0;
                      const valor = item.valor ?? 0;
                      const mb = typeof item.mb === 'number' ? Math.round(item.mb) : 0;
                      const pmp = item.pmp ?? 0;
                      const cmp = item.cmp ?? 0;
                      return (
                        <tr key={index}>
                          <td>{key}</td>
                          <td className="amount">{unidades.toLocaleString('pt-BR')}</td>
                          <td className="amount">{formatK(pacotes)}</td>
                          <td className="amount">{caixas.toLocaleString('pt-BR')}</td>
                          <td className="amount">{valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="amount">{mb}%</td>
                          <td className="amount">{pmp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="amount">{cmp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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

      {/* Loading overlay */}
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <div className="loading-text">Processando dados…</div>
    </div>
      )}

      {/* Estilos CSS */}
      <style jsx global>{`
        :root {
          --bg: #0a0e14;
          --panel: rgba(20, 22, 28, .7);
          --panel-border: rgba(255,255,255,.09);
          --muted: #c9cbd6;
          --text: #f2f4f7;
          --accent: #e67e22;
          --accent-2: #f4c27a;
          --danger: #c0392b;
          --glass: rgba(255,255,255,.08);
        }

        * { box-sizing: border-box; }
        body {
          margin: 0; 
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;
          color: var(--text) !important; 
          background: linear-gradient(180deg, #090c12 0%, #0f1420 60%, #090c12 100%) !important;
          min-height: 100vh;
        }

        .bg-animations { position: fixed; inset: 0; overflow: hidden; z-index: -1; }
        .orb { position: absolute; width: 520px; height: 520px; filter: blur(82px); opacity: .4; border-radius: 50%; animation: float 20s ease-in-out infinite; }
        .orb-a { background: radial-gradient(circle at 30% 30%, #1E88E5, transparent 60%); top: -120px; left: -80px; }
        .orb-b { background: radial-gradient(circle at 70% 70%, #00d3a7, transparent 60%); bottom: -140px; right: -120px; animation-delay: -6s; }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-20px) } }
        .grid-overlay { position: absolute; inset: 0; background: linear-gradient(transparent 95%, rgba(255,255,255,.05) 95%), linear-gradient(90deg, transparent 95%, rgba(255,255,255,.05) 95%); background-size: 28px 28px; mix-blend-mode: overlay; opacity: .25; }

        .app-header {
          display: flex; justify-content: space-between; align-items: center;
          /* estender a barra por baixo da sidebar para remover o "buraco" à esquerda */
          width: calc(100% + 64px);
          margin-left: -64px;
          padding: 16px 22px 16px calc(64px + 22px);
          position: sticky; top: 0; z-index: 10;
          backdrop-filter: blur(12px); background: linear-gradient(180deg, rgba(9,14,28,.65), rgba(9,14,28,.35)); border-bottom: 1px solid var(--panel-border);
        }

		.mobile-filters {
          display:none;
		}
		/* Desktop: mostrar filtros no header e esconder filtros mobile */
        .desktop-only {
          display: flex !important;
        }
		.filter-badges {
		gap: 8px;
		}
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
          .app-header {
            width: 100%;
            margin-left: 0;
            padding: 12px 16px;
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }
          
          .brand {
            font-size: 18px;
            text-align: center;
          }
          
          .header-right {
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: stretch;
          }
          
          .container {
            padding: 8px 12px 20px;
            gap: 12px;
          }
          
          .kpi {
            padding: 14px;
          }
          
          .card {
            padding: 12px;
          }
          
          .table-head {
            flex-direction: column;
            gap: 8px;
            align-items: stretch;
          }
          
          .table-head input[type="text"] {
            width: 100%;
            max-width: none;
          }
          
          .search-wrap {
            width: 100%;
          }
          
          .search-wrap input {
            width: 100%;
          }
          
          .period-panel {
            width: calc(100vw - 32px);
            right: 16px;
            left: 16px;
            z-index: 1000;
          }
          
          .modal-card {
            width: calc(100vw - 32px);
            margin: 16px;
          }
          
          .modal-table {
            font-size: 12px;
          }
          
          .modal-table th,
          .modal-table td {
            padding: 6px 4px;
          }
          
          /* Grid responsivo para os blocos de drilldown */
          .table-wrap[style*="grid"] {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
          
          /* Ajustar botões dos filtros */
          .chip {
            font-size: 12px;
            padding: 6px 10px;
          }
          
          /* KPIs em coluna única no mobile */
          .kpi-grid {
            grid-template-columns: 1fr !important;
          }
          
          /* Gráficos responsivos */
          .chart-visual {
            height: 200px !important;
          }
          
          .eng-visual {
            height: 200px !important;
          }
          
          /* Gráficos de rosca responsivos */
          .doughnut-chart {
            height: 180px !important;
            margin-bottom: 16px !important;
          }
          
          .doughnut-chart canvas {
            max-height: 160px !important;
          }
          
          /* Layout responsivo da legenda */
          .topcli-legend li > div > div:first-child {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 6px !important;
          }
          
          .topcli-legend li > div > div:first-child > div:last-child {
            align-self: stretch !important;
            justify-content: flex-start !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
          }
          
          /* Badges responsivos */
          .badge {
            font-size: 11px;
            padding: 6px 8px;
          }
          
          .badge-interactive {
            gap: 6px;
          }
          
          .badge-interactive .caret {
            font-size: 8px;
          }
          
          /* Header responsivo */
          .header-right {
            flex-direction: column;
            gap: 8px;
            align-items: stretch;
          }
          
                  .filter-badges {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        
        

        

        

        
        /* Overlay para modal de drilldown */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,.7);
          z-index: 999;
          cursor: pointer;
        }
        

        
        /* Mobile: esconder filtros desktop e mostrar filtros mobile */
        .desktop-only {
          display: none !important;
        }
        
        .mobile-filters {
          display: block !important;
          padding: 16px;
          background: var(--panel);
          border-bottom: 1px solid var(--panel-border);
        }
        
        .mobile-filters .filter-badges {
          display: flex !important;
          flex-direction: row;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          -webkit-overflow-scrolling: touch;
          position: relative;
        }
        
        /* Garantir posicionamento relativo para os filtros mobile */
        .mobile-filters .badge {
          position: relative;
          padding: 8px 12px;
          font-size: 12px;
          justify-content: space-between;
          white-space: nowrap;
          flex-shrink: 0;
          min-width: fit-content;
        }
        
        .mobile-filters .badge .dot-indicator {
          width: 6px;
          height: 6px;
        }
        
        .mobile-filters .badge .caret {
          font-size: 10px;
        }
        
        /* Overlay de fundo para painéis mobile */
        .mobile-filters .period-panel::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,.7);
          z-index: -1;
          pointer-events: auto;
        }
        
        /* Ajustar posicionamento dos painéis para abrir abaixo dos botões */
        .mobile-filters .period-panel {
          position: fixed !important;
          top: 72px !important;
          left: 8px !important;
          right: 8px !important;
          width: auto !important;
          max-height: calc(100vh - 120px) !important;
          overflow-y: auto !important;
          z-index: 1001 !important;
          box-shadow: 0 20px 40px rgba(0,0,0,.5) !important;
          border-radius: 12px !important;
          padding: 16px !important;
          background: var(--panel) !important;
          border: 1px solid var(--panel-border) !important;
        }
        
        /* Garantir que painéis sejam clicáveis */
        .mobile-filters .period-panel * {
          pointer-events: auto !important;
        }
        
        .mobile-filters .filter-badges::-webkit-scrollbar {
          height: 2px;
        }
        
        .mobile-filters .filter-badges::-webkit-scrollbar-track {
          background: rgba(255,255,255,.1);
          border-radius: 1px;
        }
        
        .mobile-filters .filter-badges::-webkit-scrollbar-thumb {
          background: var(--accent);
          border-radius: 1px;
        }
        
        /* Indicador de scroll */
        .mobile-filters .filter-badges::after {
          content: '';
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 20px;
          background: linear-gradient(90deg, transparent, var(--panel));
          pointer-events: none;
        }
        }
        .brand { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: .4px; }
        .brand span { color: var(--accent); }
        .header-right { display: flex; gap: 10px; align-items: center; position: relative; }
        .btn {
          background: linear-gradient(180deg, var(--accent), #cf6e1d); color: #fff; border: none; padding: 10px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(230,126,34,.22);
        }
        .btn-ghost { background: transparent; color: var(--text); border: 1px solid var(--panel-border); }

        .container { padding: 12px 20px 40px; display: grid; gap: 16px; width: 100%; max-width: none; }
        .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }

        .kpi { 
          background: var(--panel); border: 1px solid var(--panel-border); border-radius: 16px; padding: 18px; 
          box-shadow: 0 8px 24px rgba(0,0,0,.25), inset 0 1px rgba(255,255,255,.06); backdrop-filter: blur(8px); 
        }
        .kpi-label { color: var(--muted); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-value { font-size: 28px; margin-top: 8px; font-weight: 800; letter-spacing: .2px; }
        .kpi-main-value { font-size: 32px; font-weight: 900; color: var(--text); }
        .kpi-secondary-value { font-size: 16px; color: var(--muted); font-weight: 500; }
        .kpi-main-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .kpi-secondary-row { display: flex; justify-content: space-between; align-items: center; }
        .kpi-variation-inline { font-size: 14px; font-weight: 700; padding: 2px 8px; border-radius: 12px; }
        .kpi-variation-inline.pos { color: #00d3a7; background: rgba(0, 211, 167, 0.15); }
        .kpi-variation-inline.neg { color: #ff6b6b; background: rgba(255, 107, 107, 0.15); }
        .kpi-sub { color: var(--muted); margin-top: 8px; font-weight: 600; }
        .kpi-variations { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
        .kpi-variation { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 6px; background: rgba(255,255,255,.03); }
        .kpi-variation-label { color: var(--muted); font-weight: 500; }
        .kpi-foot { color: var(--muted); margin-top: 12px; font-size: 11px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,.1); }
        .kpi-sub.neg { color: #ff6b6b; }
        .kpi-sub.pos { color: #00d3a7; }
        .kpi-variation.neg { color: #ff6b6b; background: rgba(255, 107, 107, 0.1); }
        .kpi-variation.pos { color: #00d3a7; background: rgba(0, 211, 167, 0.1); }

        .charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; }
        .span-2 { grid-column: span 2; }
        .card { 
          background: var(--panel); border: 1px solid var(--panel-border); border-radius: 16px; padding: 16px; 
          box-shadow: 0 8px 24px rgba(0,0,0,.25), inset 0 1px rgba(255,255,255,.06); backdrop-filter: blur(8px); 
        }
        .card h3 { margin: 4px 0 12px; font-size: 14px; color: var(--accent-2); font-weight: 700; letter-spacing: .2px; }

        .topcli { display: grid; grid-template-columns: 1.1fr .9fr; gap: 12px; align-items: center; }
        .chart-donut { position: relative; width: 100%; height: 160px; overflow: hidden; margin-bottom: 20px; }
        .chart-donut canvas { position: absolute; inset: 0; width: 100% !important; height: 100% !important; max-height: 160px !important; }
        
        /* Força altura fixa para todos os canvas */
        canvas { max-height: 705px !important; }
        #chart-semanas { height: 300px !important; max-height: 300px !important; }
        #chart-clientes { height: 160px !important; max-height: 160px !important; }
        #chart-produtos { height: 160px !important; max-height: 160px !important; }
        #chart-eng { height: 280px !important; max-height: 280px !important; }
        .topcli-legend { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        .topcli-legend li { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1px solid rgba(255,255,255,.06); border-radius: 8px; background: rgba(255,255,255,.04); cursor: pointer; transition: all 0.15s ease; }
        .topcli-legend li:hover { background: rgba(255,255,255,.08); transform: scale(1.02); }
        .topcli-legend .dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
        .topcli-legend .margem-bruta { background: rgba(230,126,34,.2); color: #e67e22; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; white-space: nowrap; }
        .topcli-legend .preco-medio { background: rgba(30,136,229,.2); color: #1E88E5; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; white-space: nowrap; }
        .topcli-legend .custo-medio { background: rgba(192,57,43,.2); color: #c0392b; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; white-space: nowrap; }
        .topcli-legend li { 
          display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--muted); 
          background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); 
          padding: 6px 8px; border-radius: 10px; cursor: pointer; 
        }
        .topcli-legend .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        .topcli-legend .margem-bruta { 
          color: var(--accent-2); 
          font-weight: 600; 
          font-size: 11px; 
          background: rgba(244, 194, 122, 0.1); 
          padding: 2px 6px; 
          border-radius: 4px; 
          margin-left: auto; 
        }

        .rank { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 6px; }
        .rank li { 
          display: flex; justify-content: space-between; background: rgba(230,126,34,.08); 
          padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(230,126,34,.16); 
          cursor: pointer; transition: background .15s ease, transform .1s ease; 
        }
        .rank li:hover { background: rgba(230,126,34,.14); transform: translateY(-1px); }
        .rank li.selected { 
          background: rgba(230,126,34,.25); 
          border-color: rgba(230,126,34,.5); 
          transform: translateY(-1px); 
          box-shadow: 0 4px 12px rgba(230,126,34,.2);
        }
        .rank-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }

        .table-wrap .table-scroll { overflow: auto; max-height: 420px; min-height: 320px; }
        
        /* Estilo específico para o painel de clientes */
        .period-panel .table-scroll { 
          overflow-y: auto; 
          max-height: 300px; 
          min-height: 200px;
          border: 1px solid var(--panel-border); 
          border-radius: 10px;
          background: rgba(255,255,255,.02);
        }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        thead th { position: sticky; top: 0; background: #0f1730; }
        th, td { text-align: left; border-bottom: 1px solid rgba(255,255,255,.06); padding: 10px; }
        td.amount { text-align: right; }

        .badge { 
          display: inline-flex; padding: 4px 10px; border-radius: 999px; font-size: 12px; 
          background: rgba(230,126,34,.14); color: var(--accent-2); border: 1px solid rgba(230,126,34,.35); 
        }
        .badge-interactive { 
          gap: 8px; align-items: center; cursor: pointer; 
          transition: transform .12s ease, background .2s ease; 
        }
        .badge-interactive:hover { transform: translateY(-1px); background: rgba(230,126,34,.2); }
        .badge-interactive .caret { opacity: .8; font-size: 10px; }
        
        .table-head { display:flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
        .search-wrap { position: relative; display: flex; align-items: center; }
        .search-wrap .icon { position: absolute; left: 10px; width: 16px; height: 16px; color: #b8c7e0; opacity: .85; }
        .table-head input[type="text"] { 
          width: 260px; max-width: 50vw; padding: 10px 12px 10px 34px; border-radius: 999px; 
          border: 1px solid rgba(255,255,255,.14); 
          background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.04)); 
          color: var(--text); 
          box-shadow: inset 0 1px rgba(255,255,255,.08), 0 4px 18px rgba(0,0,0,.25); 
          backdrop-filter: blur(6px); transition: border-color .2s ease, box-shadow .2s ease; 
        }
        .table-head input[type="text"]::placeholder { color: #9fb0c7; }
        .table-head input[type="text"]:focus { 
          outline: none; border-color: rgba(230,126,34,.55); 
          box-shadow: inset 0 1px rgba(255,255,255,.1), 0 6px 24px rgba(230,126,34,.18); 
        }
        .dot-indicator { 
          width: 6px; height: 6px; background: var(--accent-2); border-radius: 999px; 
          box-shadow: 0 0 10px rgba(244,194,122,.9); 
        }

        .period-panel { 
          position: absolute; right: 16px; top: 54px; 
          background: linear-gradient(180deg, rgba(18,26,46,.95), rgba(18,26,46,.85)); 
          border: 1px solid var(--panel-border); border-radius: 16px; padding: 14px; 
          display: grid; gap: 10px; width: 320px; 
          box-shadow: 0 22px 60px rgba(0,0,0,.5); backdrop-filter: blur(8px); 
          max-height: 80vh; /* Limitar altura máxima da tela */
          overflow: hidden; /* Esconder overflow do painel */
        }
        .period-presets { display: flex; gap: 8px; flex-wrap: wrap; }
        .chip { 
          background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); 
          padding: 6px 10px; border-radius: 999px; color: var(--text); cursor: pointer; 
          font-size: 12px; transition: background .2s ease, transform .12s ease; 
        }
        .chip:hover { background: rgba(255,255,255,.12); transform: translateY(-1px); }
        .period-row input[type="date"], .period-row input[type="text"] { 
          width: 100%; padding: 10px 12px; border-radius: 10px; 
          border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06); 
          color: var(--text); color-scheme: dark; 
        }
        .period-row { display: grid; grid-template-columns: 56px 1fr; gap: 8px; align-items: center; }
        .period-row label { color: var(--muted); font-size: 12px; }
        .period-actions { display: flex; gap: 8px; justify-content: flex-end; }

        .modal { 
          position: fixed; inset: 0; background: rgba(5,7,14,.55); backdrop-filter: blur(4px); 
          display: grid; place-items: center; z-index: 50; 
        }
        .modal-card { 
          width: min(860px, 92vw); background: var(--panel); border: 1px solid var(--panel-border); 
          border-radius: 16px; box-shadow: 0 16px 60px rgba(0,0,0,.6); 
        }
        .modal-head { 
          display: flex; justify-content: space-between; align-items: center; 
          padding: 12px 14px; border-bottom: 1px solid var(--panel-border); 
        }
        .modal-table { width: 100%; border-collapse: collapse; }
        .modal-table th, .modal-table td { 
          text-align: left; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.06); 
        }

        .loading { 
          position: fixed !important; 
          inset: 0 !important; 
          display: grid !important; 
          place-items: center !important; 
          background: rgba(5,7,14,.85) !important; 
          backdrop-filter: blur(12px) !important; 
          z-index: 9999 !important;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif !important;
        }
        .spinner { 
          width: 54px !important; 
          height: 54px !important; 
          border-radius: 50% !important; 
          border: 4px solid rgba(255,255,255,.15) !important; 
          border-top-color: var(--accent) !important; 
          animation: spin 1s linear infinite !important; 
          margin-bottom: 12px !important;
        }
        .loading-text { 
          margin-top: 12px !important; 
          color: var(--muted) !important; 
          font-weight: 600 !important; 
          font-size: 14px !important;
          text-align: center !important;
        }
        @keyframes spin { 
          to { transform: rotate(360deg) } 
        }

        .pos { color: #00d3a7; }
        .neg { color: #ff6b6b; }

        @media (max-width: 900px) { 
          .topcli { grid-template-columns: 1fr; } 
          .span-2 { grid-column: span 1; }
        }
        @media (max-width: 640px) { 
          .chart-donut { height: 160px; } 
          .table-wrap .table-scroll { min-height: 220px; }
        
        /* Estilos para tabela expandida */
        .table-scroll table { 
          width: 100%; 
          border-collapse: collapse; 
          font-size: 13px; 
        }
        .table-scroll th { 
          background: rgba(255,255,255,.03); 
          padding: 12px 8px; 
          text-align: left; 
          font-weight: 600; 
          color: var(--muted); 
          border-bottom: 1px solid rgba(255,255,255,.08); 
          white-space: nowrap; 
        }
        .table-scroll td { 
          padding: 10px 8px; 
          border-bottom: 1px solid rgba(255,255,255,.04); 
          color: var(--text); 
        }
        .table-scroll .amount { 
          text-align: right; 
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; 
          font-weight: 500; 
        }
        .table-scroll tr:hover { 
          background: rgba(255,255,255,.02); 
        }
          .period-panel { width: 280px; right: 0; }
        }
      `}</style>
    </>
  );
}
