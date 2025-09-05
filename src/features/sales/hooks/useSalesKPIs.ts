import { ProductSaleRow } from '@/lib/sheets';
import type { KpisData } from '@/features/sales/types';
import { previousPeriodFromRange, toEndOfDay, toStartOfDay } from '@/features/common/utils/date';

export function computeSalesKPIs(
  currentData: ProductSaleRow[],
  allData: ProductSaleRow[],
  startDate: Date,
  endDate: Date
): KpisData {
  const startOfDay = toStartOfDay(startDate);
  const endOfDay = toEndOfDay(endDate);

  const { prevStartDate, prevEndDate, compareLabel } = previousPeriodFromRange(startOfDay, endOfDay);

  const previousData = allData.filter(row => row.data >= prevStartDate && row.data <= prevEndDate);

  const faturamentoAtual = currentData.reduce((sum, row) => sum + row.valorTotal, 0);
  const pedidosAtual = currentData.length;
  const cmvAtual = currentData.reduce((sum, row) => sum + (row.custoTotal ?? 0), 0);
  const margemBrutaAtual = faturamentoAtual > 0 && cmvAtual > 0 ? (1 - (cmvAtual / faturamentoAtual)) * 100 : (faturamentoAtual > 0 ? 100 : 0);
  const clientesUnicosAtual = new Set(currentData.map(row => row.cliente)).size;

  const unidadesAtual = currentData.reduce((sum, row) => sum + (row.quantidade ?? 0), 0);
  const pacotesAtual = currentData.reduce((sum, row) => sum + (row.pacotes ?? 0), 0);
  const caixasAtual = currentData.reduce((sum, row) => sum + (row.caixas ?? 0), 0);

  const faturamentoAnterior = previousData.reduce((sum, row) => sum + row.valorTotal, 0);
  const pedidosAnterior = previousData.length;
  const cmvAnterior = previousData.reduce((sum, row) => sum + (row.custoTotal ?? 0), 0);
  const margemBrutaAnterior = faturamentoAnterior > 0 && cmvAnterior > 0 ? (1 - (cmvAnterior / faturamentoAnterior)) * 100 : (faturamentoAnterior > 0 ? 100 : 0);
  const clientesUnicosAnterior = new Set(previousData.map(row => row.cliente)).size;

  const unidadesAnterior = previousData.reduce((sum, row) => sum + (row.quantidade ?? 0), 0);
  const pacotesAnterior = previousData.reduce((sum, row) => sum + (row.pacotes ?? 0), 0);
  const caixasAnterior = previousData.reduce((sum, row) => sum + (row.caixas ?? 0), 0);

  const calcVariacao = (atual: number, anterior: number) => {
    if (anterior <= 0) return 0;
    const variacao = ((atual - anterior) / anterior) * 100;
    return Math.round(variacao * 10) / 10;
  };

  const calcPontosPercentuais = (atual: number, anterior: number) => {
    const pontos = atual - anterior;
    return Math.round(pontos * 10) / 10;
  };

  const ticketMedioAtual = pedidosAtual > 0 ? faturamentoAtual / pedidosAtual : 0;
  const ticketMedioAnterior = pedidosAnterior > 0 ? faturamentoAnterior / pedidosAnterior : 0;

  const anoAtual = new Date().getFullYear();
  const inicioAno = new Date(anoAtual, 0, 1);
  const ytdData = allData.filter(row => row.data >= inicioAno && row.data <= endDate);
  const faturamentoYTD = ytdData.reduce((sum, row) => sum + row.valorTotal, 0);

  const anoAnterior = anoAtual - 1;
  const inicioAnoAnterior = new Date(anoAnterior, 0, 1);
  const fimAnoAnterior = new Date(anoAnterior, endDate.getMonth(), endDate.getDate());
  const ytdDataAnterior = allData.filter(row => row.data >= inicioAnoAnterior && row.data <= fimAnoAnterior);
  const faturamentoYTDAnterior = ytdDataAnterior.reduce((sum, row) => sum + row.valorTotal, 0);

  const lastDay = new Date(Math.max(...allData.map(row => row.data.getTime())));
  const firstDayOfYear = new Date(lastDay.getFullYear(), 0, 1);
  const pastDays = Math.ceil((lastDay.getTime() - firstDayOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const projecaoAnual = faturamentoYTD * 365 / pastDays;

  const nowRef = new Date();
  const showProjection = startDate.getDate() === 1 && startDate.getMonth() === nowRef.getMonth() && startDate.getFullYear() === nowRef.getFullYear();

  const prevMonthStart = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
  const prevMonthEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 0, 23, 59, 59, 999);
  const prevMonthData = allData.filter(row => row.data >= prevMonthStart && row.data <= prevMonthEnd);
  const prevMonthTotal = prevMonthData.reduce((sum, row) => sum + row.valorTotal, 0);
  const prevMonthOrders = prevMonthData.length;

  const projFat = (showProjection && faturamentoAnterior > 0) ? faturamentoAtual * (prevMonthTotal / faturamentoAnterior) : null;
  const projPed = (showProjection && pedidosAnterior > 0) ? pedidosAtual * (prevMonthOrders / pedidosAnterior) : null;

  return {
    faturamento: { valor: faturamentoAtual, variacao: calcVariacao(faturamentoAtual, faturamentoAnterior), projecao: projFat ?? faturamentoAtual * 2 },
    pedidos: { valor: pedidosAtual, variacao: calcVariacao(pedidosAtual, pedidosAnterior), projecao: projPed ?? pedidosAtual * 2 },
    ticketMedio: { valor: ticketMedioAtual, variacao: calcVariacao(ticketMedioAtual, ticketMedioAnterior) },
    margemBruta: { valor: margemBrutaAtual, variacao: calcPontosPercentuais(margemBrutaAtual, margemBrutaAnterior) },
    clientesUnicos: { valor: clientesUnicosAtual, variacao: clientesUnicosAtual - clientesUnicosAnterior },
    unidades: { valor: unidadesAtual, variacao: calcVariacao(unidadesAtual, unidadesAnterior) },
    pacotes: { valor: pacotesAtual, variacao: calcVariacao(pacotesAtual, pacotesAnterior) },
    caixas: { valor: caixasAtual, variacao: calcVariacao(caixasAtual, caixasAnterior) },
    faturamentoAnual: { valor: faturamentoYTD, variacao: calcVariacao(faturamentoYTD, faturamentoYTDAnterior), projecao: projecaoAnual },
    compareLabel,
    showProjection,
  };
}



