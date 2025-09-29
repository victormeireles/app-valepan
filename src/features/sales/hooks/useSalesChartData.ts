import { ProductSaleRow } from '@/lib/sheets';
import type { ChartDataStructure, SemanaData, TopItem, RankingItem } from '@/features/sales/types';
import { lastNWeeksRanges, toEndOfDay } from '@/features/common/utils/date';
import { classifyEngagement } from '@/features/common/utils/engagement';

export type ComputeChartOptions = {
  meta: { hasPackages: boolean; hasBoxes: boolean; hasCustomerType: boolean } | null;
  quaseInativoMeses: number;
  inativoMeses: number;
  maxPeriodoMeses: number;
  topClientsCount?: number;
};

export function computeSalesChartData(
  filteredData: ProductSaleRow[],
  allData: ProductSaleRow[],
  previousData: ProductSaleRow[],
  startDate: Date,
  endDate: Date,
  options: ComputeChartOptions
): ChartDataStructure {
  const meta = options.meta;

  // 1) Semanas (evolução)
  const weeks = lastNWeeksRanges(endDate, { totalDays: 55, weeks: 8 });
  const semanas: SemanaData[] = weeks.map(w => {
    let dataToUse = allData;
    if (filteredData.length < allData.length) {
      const clientesFiltrados = new Set(filteredData.map(row => row.cliente));
      dataToUse = allData.filter(row => clientesFiltrados.has(row.cliente));
    }

    const dadosSemana = dataToUse.filter(row =>
      row.data >= new Date(w.start.getFullYear(), w.start.getMonth(), w.start.getDate()) &&
      row.data <= toEndOfDay(w.end)
    );

    const faturamento = dadosSemana.reduce((sum, row) => sum + row.valorTotal, 0);
    const cmv = dadosSemana.reduce((sum, row) => sum + (row.custoTotal ?? 0), 0);
    const margemBruta = faturamento > 0 && cmv > 0 ? (1 - (cmv / faturamento)) * 100 : (faturamento > 0 ? 100 : 0);

    return {
      label: w.label,
      faturamento,
      margemBruta,
      cmv,
      inicio: w.start,
      fim: w.end,
    };
  });

  // 2) Top clientes
  const clienteMap = new Map<string, number>();
  const clienteCMVMap = new Map<string, number>();
  for (const row of filteredData) {
    clienteMap.set(row.cliente, (clienteMap.get(row.cliente) ?? 0) + row.valorTotal);
    clienteCMVMap.set(row.cliente, (clienteCMVMap.get(row.cliente) ?? 0) + (row.custoTotal ?? 0));
  }
  const cores = ['#1E88E5', '#00d3a7', '#e67e22', '#f4c27a', '#c0392b', '#888'];
  const allClientes = Array.from(clienteMap.entries()).sort((a, b) => b[1] - a[1]);
  const top5 = allClientes.slice(0, 5);
  const outros = allClientes.slice(5);
  const outrosTotal = outros.reduce((sum, [, v]) => sum + v, 0);
  const outrosCMV = outros.reduce((sum, [cliente]) => sum + (clienteCMVMap.get(cliente) ?? 0), 0);
  const outrosMargem = outrosTotal > 0 && outrosCMV > 0 ? Math.max(-100, Math.min(100, Math.round((1 - (outrosCMV / outrosTotal)) * 100))) : (outrosTotal > 0 && outrosCMV === 0 ? 100 : (outrosTotal === 0 && outrosCMV > 0 ? -100 : 0));
  const topClientes: TopItem[] = [
    ...top5.map(([cliente, valor], index) => {
      const cmv = clienteCMVMap.get(cliente) ?? 0;
      let margemBruta = 0;
      if (valor > 0 && cmv > 0) margemBruta = Math.max(-100, Math.min(100, Math.round((1 - (cmv / valor)) * 100)));
      else if (valor > 0 && cmv === 0) margemBruta = 100;
      else if (valor === 0 && cmv > 0) margemBruta = -100;
      return { cliente, valor, cmv, margemBruta, cor: cores[index] };
    }),
    ...(outros.length > 0 ? [{ cliente: 'Outros', valor: outrosTotal, cmv: outrosCMV, margemBruta: outrosMargem, cor: cores[5] }] : []),
  ];

  // 3) Top produtos
  const produtoMap = new Map<string, number>();
  const produtoCMVMap = new Map<string, number>();
  for (const row of filteredData) {
    if (!row.produto) continue;
    produtoMap.set(row.produto, (produtoMap.get(row.produto) ?? 0) + row.valorTotal);
    produtoCMVMap.set(row.produto, (produtoCMVMap.get(row.produto) ?? 0) + (row.custoTotal ?? 0));
  }
  const allProdutos = Array.from(produtoMap.entries()).sort((a, b) => b[1] - a[1]);
  const top5Produtos = allProdutos.slice(0, 5);
  const outrosProdutos = allProdutos.slice(5);
  const outrosProdutosTotal = outrosProdutos.reduce((sum, [, v]) => sum + v, 0);
  const outrosProdutosCMV = outrosProdutos.reduce((sum, [produto]) => sum + (produtoCMVMap.get(produto) ?? 0), 0);
  const outrosProdutosMargem = outrosProdutosTotal > 0 && outrosProdutosCMV > 0 ? Math.max(-100, Math.min(100, Math.round((1 - (outrosProdutosCMV / outrosProdutosTotal)) * 100))) : (outrosProdutosTotal > 0 && outrosProdutosCMV === 0 ? 100 : (outrosProdutosTotal === 0 && outrosProdutosCMV > 0 ? -100 : 0));
  const topProdutos: TopItem[] = [
    ...top5Produtos.map(([produto, valor], index) => {
      const cmv = produtoCMVMap.get(produto) ?? 0;
      const produtoRows = filteredData.filter(row => row.produto === produto);
      const quantidadeTotal = produtoRows.reduce((sum, row) => sum + (row.quantidade ?? 0), 0);
      const pacotesTotal = produtoRows.reduce((sum, row) => sum + (row.pacotes ?? 0), 0);
      const precoMedioPorPacote = pacotesTotal > 0 ? valor / pacotesTotal : 0;
      const custoMedioPorPacote = pacotesTotal > 0 ? cmv / pacotesTotal : 0;
      let margemBruta = 0;
      if (valor > 0 && cmv > 0) margemBruta = Math.max(-100, Math.min(100, Math.round((1 - (cmv / valor)) * 100)));
      else if (valor > 0 && cmv === 0) margemBruta = 100;
      else if (valor === 0 && cmv > 0) margemBruta = -100;
      return { produto, valor, cmv, margemBruta, precoMedioPorPacote, custoMedioPorPacote, quantidadeTotal, pacotesTotal, cor: cores[index] };
    }),
    ...(outrosProdutos.length > 0 ? [{
      produto: 'Outros',
      valor: outrosProdutosTotal,
      cmv: outrosProdutosCMV,
      margemBruta: outrosProdutosMargem,
      precoMedioPorPacote: 0, // será calculado na UI a partir de pacotes total
      custoMedioPorPacote: 0,
      quantidadeTotal: outrosProdutos.reduce((sum, [p]) => sum + filteredData.filter(r => r.produto === p).reduce((a, r) => a + (r.quantidade ?? 0), 0), 0),
      pacotesTotal: outrosProdutos.reduce((sum, [p]) => sum + filteredData.filter(r => r.produto === p).reduce((a, r) => a + (r.pacotes ?? 0), 0), 0),
      cor: cores[5],
    }] : []),
  ];

  // 4) Tipos de cliente (opcional)
  let topTiposCliente: TopItem[] = [];
  if (meta?.hasCustomerType) {
    const tipoClienteMap = new Map<string, number>();
    const tipoClienteCMVMap = new Map<string, number>();
    for (const row of filteredData) {
      if (!row.tipoCliente) continue;
      const t = row.tipoCliente;
      tipoClienteMap.set(t, (tipoClienteMap.get(t) ?? 0) + row.valorTotal);
      tipoClienteCMVMap.set(t, (tipoClienteCMVMap.get(t) ?? 0) + (row.custoTotal ?? 0));
    }
    const allTiposCliente = Array.from(tipoClienteMap.entries()).sort((a, b) => b[1] - a[1]);
    const top5Tipos = allTiposCliente.slice(0, 5);
    const outrosTipos = allTiposCliente.slice(5);
    const outrosTiposTotal = outrosTipos.reduce((sum, [, v]) => sum + v, 0);
    const outrosTiposCMV = outrosTipos.reduce((sum, [t]) => sum + (tipoClienteCMVMap.get(t) ?? 0), 0);
    const outrosTiposMargem = outrosTiposTotal > 0 && outrosTiposCMV > 0 ? Math.max(-100, Math.min(100, Math.round((1 - (outrosTiposCMV / outrosTiposTotal)) * 100))) : (outrosTiposTotal > 0 && outrosTiposCMV === 0 ? 100 : (outrosTiposTotal === 0 && outrosTiposCMV > 0 ? -100 : 0));
    topTiposCliente = [
      ...top5Tipos.map(([tipoCliente, valor], index) => {
        const cmv = tipoClienteCMVMap.get(tipoCliente) ?? 0;
        let margemBruta = 0;
        if (valor > 0 && cmv > 0) margemBruta = Math.max(-100, Math.min(100, Math.round((1 - (cmv / valor)) * 100)));
        else if (valor > 0 && cmv === 0) margemBruta = 100;
        else if (valor === 0 && cmv > 0) margemBruta = -100;
        return { cliente: tipoCliente, valor, cmv, margemBruta, cor: cores[index] };
      }),
      ...(outrosTipos.length > 0 ? [{ cliente: 'Outros', valor: outrosTiposTotal, cmv: outrosTiposCMV, margemBruta: outrosTiposMargem, cor: cores[5] }] : []),
    ];
  }

  // 5) Rankings de variação por cliente (top 5 up/down)
  const sumByClient = (data: ProductSaleRow[]) => {
    const m = new Map<string, number>();
    for (const row of data) {
      m.set(row.cliente, (m.get(row.cliente) ?? 0) + row.valorTotal);
    }
    return m;
  };
  const curByCli = sumByClient(filteredData);
  const prevByCli = sumByClient(previousData);
  
  // IMPORTANTE: Quando há filtro de cliente específico, mostrar apenas esses clientes
  // Caso contrário, mostrar todos os clientes que aparecem nos dados filtrados
  let allClientsSet: Set<string>;
  
  if (filteredData.length < allData.length) {
    // Se os dados estão filtrados, usar apenas os clientes que aparecem nos dados filtrados
    const filteredClients = new Set(filteredData.map(row => row.cliente));
    const prevFilteredClients = new Set(previousData.map(row => row.cliente));
    allClientsSet = new Set([...filteredClients, ...prevFilteredClients]);
  } else {
    // Se não há filtro, usar todos os clientes únicos de ambos os períodos
    allClientsSet = new Set<string>([...curByCli.keys(), ...prevByCli.keys()]);
  }
  const variations: RankingItem[] = [] as unknown as RankingItem[];
  for (const cliente of allClientsSet) {
    const cur = curByCli.get(cliente) ?? 0;
    const prev = prevByCli.get(cliente) ?? 0;
    const delta = cur - prev;
    const pct = prev === 0 ? (cur > 0 ? 100 : 0) : (delta / prev * 100);
    variations.push({ cliente, cur, prev, delta, pct });
  }
  variations.sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
  const topCount = options.topClientsCount ?? 5;
  const rankingUp = variations.filter(v => (v.delta ?? 0) > 0).slice(0, topCount);
  const rankingDown = variations.filter(v => (v.delta ?? 0) < 0).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0)).slice(0, topCount);

  // 6) Engajamento
  const engagement = classifyEngagement(allData, endDate, {
    quaseInativoMeses: options.quaseInativoMeses,
    inativoMeses: options.inativoMeses,
    maxPeriodoMeses: options.maxPeriodoMeses,
    filterClients: filteredData.length < allData.length ? new Set(filteredData.map(r => r.cliente)) : undefined,
  });

  const engajamento = {
    novos: engagement.novos,
    ativos: engagement.ativos,
    quase: engagement.quase,
    churn: engagement.churn,
    sets: engagement.sets,
  };

  // 7) Limites eixo secundário para margem
  const margensBrutas = semanas.map(s => s.margemBruta).filter(m => !Number.isNaN(m) && m > 0);
  const minMargem = margensBrutas.length > 0 ? Math.min(...margensBrutas) : 0;
  const maxMargem = margensBrutas.length > 0 ? Math.max(...margensBrutas) : 100;
  const y1Min = Math.max(0, minMargem - 5);
  const y1Max = maxMargem + 15;

  return {
    semanas,
    topClientes,
    topProdutos,
    topTiposCliente,
    rankingUp,
    rankingDown,
    engajamento,
    y1Limits: { min: y1Min, max: y1Max },
  };
}



