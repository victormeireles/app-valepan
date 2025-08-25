"use client";



import { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { fetchSheetData, ProductSaleRow, formatValueBR, formatK } from "@/lib/sheets";

export default function VendasDashboard() {
  const { data: session, status } = useSession();

  const [rawData, setRawData] = useState<ProductSaleRow[]>([]);
  const [filteredData, setFilteredData] = useState<ProductSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  // Estados da UI
  const [showPeriodPanel, setShowPeriodPanel] = useState(false);
  const [showClientPanel, setShowClientPanel] = useState(false);
  const [showProductPanel, setShowProductPanel] = useState(false);

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  const loadData = useCallback(async () => {
    try {
      const data = (await fetchSheetData('vendas')) as ProductSaleRow[];
      setRawData(data);

      if (data.length > 0) {
        const lastDate = new Date(Math.max(...data.map(r => r.data.getTime())));
        const currentMonthStart = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
        const currentMonthEnd = new Date(lastDate);

        setPeriodStart(currentMonthStart.toISOString().split('T')[0]);
        setPeriodEnd(currentMonthEnd.toISOString().split('T')[0]);

        applyFilters(data, currentMonthStart, currentMonthEnd, [], []);
      } else {
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        setPeriodStart(inicioMes.toISOString().split('T')[0]);
        setPeriodEnd(fimPeriodo.toISOString().split('T')[0]);
        applyFilters(data, inicioMes, fimPeriodo, [], []);
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && rawData.length === 0) {
      loadData();
    }
  }, [status, loadData, rawData.length]);

  const applyFilters = (
    data: ProductSaleRow[],
    startDate: Date,
    endDate: Date,
    clients: string[],
    products: string[],
  ) => {
    const startOfDay = new Date(startDate); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(endDate); endOfDay.setHours(23,59,59,999);

    let filtered = data.filter(row => row.data >= startOfDay && row.data <= endOfDay);
    if (clients.length > 0) filtered = filtered.filter(r => clients.includes(r.cliente));
    if (products.length > 0) filtered = filtered.filter(r => r.produto && products.includes(r.produto));

    setFilteredData(filtered);
  };

  const uniqueClients = useMemo(() => Array.from(new Set(rawData.map(r => r.cliente))).sort(), [rawData]);
  const uniqueProducts = useMemo(() => Array.from(new Set(rawData.map(r => r.produto))).sort(), [rawData]);

  const totals = useMemo(() => {
    const faturamento = filteredData.reduce((sum, r) => sum + (r.valorTotal || 0), 0);
    const custo = filteredData.reduce((sum, r) => sum + (r.custoTotal || 0), 0);
    const margemValor = faturamento - (isNaN(custo) ? 0 : custo);
    const margemPercent = faturamento > 0 ? margemValor / faturamento : 0;
    const pedidos = filteredData.length;
    const precoMedio = pedidos > 0 ? faturamento / pedidos : 0;
    return { faturamento, custo: isNaN(custo) ? 0 : custo, margemValor, margemPercent, pedidos, precoMedio };
  }, [filteredData]);

  const topProdutosPorMargem = useMemo(() => {
    const map = new Map<string, { receita: number; custo: number }>();
    for (const r of filteredData) {
      if (!r.produto) continue;
      const prev = map.get(r.produto) || { receita: 0, custo: 0 };
      map.set(r.produto, { receita: prev.receita + (r.valorTotal || 0), custo: prev.custo + (r.custoTotal || 0) });
    }
    const arr = Array.from(map.entries()).map(([produto, v]) => {
      const margemValor = v.receita - v.custo;
      const margemPercent = v.receita > 0 ? margemValor / v.receita : 0;
      return { produto, receita: v.receita, custo: v.custo, margemValor, margemPercent };
    });
    return arr.sort((a, b) => b.margemValor - a.margemValor).slice(0, 8);
  }, [filteredData]);

  const topClientesPorReceita = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredData) {
      map.set(r.cliente, (map.get(r.cliente) || 0) + (r.valorTotal || 0));
    }
    const arr = Array.from(map.entries()).map(([cliente, receita]) => ({ cliente, receita }));
    return arr.sort((a, b) => b.receita - a.receita).slice(0, 8);
  }, [filteredData]);

  // Handlers para filtros
  const handlePeriodApply = () => {
    if (periodStart && periodEnd) {
      applyFilters(rawData, new Date(periodStart), new Date(periodEnd), selectedClients, selectedProducts);
      setShowPeriodPanel(false);
    }
  };

  const handlePresetThisMonth = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = today;
    setPeriodStart(start.toISOString().split('T')[0]);
    setPeriodEnd(end.toISOString().split('T')[0]);
    applyFilters(rawData, start, end, selectedClients, selectedProducts);
    setShowPeriodPanel(false);
  };

  const handlePresetLastMonth = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    setPeriodStart(start.toISOString().split('T')[0]);
    setPeriodEnd(end.toISOString().split('T')[0]);
    applyFilters(rawData, start, end, selectedClients, selectedProducts);
    setShowPeriodPanel(false);
  };

  const handleClientApply = () => {
    applyFilters(rawData, new Date(periodStart), new Date(periodEnd), selectedClients, selectedProducts);
    setShowClientPanel(false);
  };

  const handleProductApply = () => {
    applyFilters(rawData, new Date(periodStart), new Date(periodEnd), selectedClients, selectedProducts);
    setShowProductPanel(false);
  };

  const filteredClients = uniqueClients.filter(client =>
    client.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredProducts = uniqueProducts.filter(product =>
    product.toLowerCase().includes(productSearch.toLowerCase())
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
          .orb-a { background: radial-gradient(circle at 30% 30%, #7bb0ff, transparent 60%); top: -120px; left: -80px; }
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
          <div className="loading-text">Carregando vendas por produto…</div>
        </div>
      </>
    );
  }
  
  if (!session) {
    return null;
  }

  return (
    <>
      <style jsx global>{`
        /* Restaurar body quando carregado */
        body { 
          overflow: auto !important; 
          background: transparent !important;
        }
      `}</style>

      <div className="bg-animations">
        <div className="orb orb-a"></div>
        <div className="orb orb-b"></div>
        <div className="grid-overlay"></div>
      </div>

      <header className="app-header">
        <h1 className="brand"><span>Vale</span>pan Vendas</h1>
        <div className="header-right">
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
          )}

          {/* Filtro de cliente */}
          <button 
            className="badge badge-interactive" 
            title="Filtrar cliente"
            onClick={() => setShowClientPanel(!showClientPanel)}
          >
            <span className="dot-indicator"></span>
            <span>Clientes: {selectedClients.length === 1 ? selectedClients[0] : selectedClients.length > 0 ? `${selectedClients.length} selecionados` : 'Todos'}</span>
            <span className="caret">▾</span>
          </button>
          
          {showClientPanel && (
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
          )}

          {/* Filtro de produto */}
          <button 
            className="badge badge-interactive" 
            title="Filtrar produto"
            onClick={() => setShowProductPanel(!showProductPanel)}
          >
            <span className="dot-indicator"></span>
            <span>Produtos: {selectedProducts.length === 1 ? selectedProducts[0] : selectedProducts.length > 0 ? `${selectedProducts.length} selecionados` : 'Todos'}</span>
            <span className="caret">▾</span>
          </button>
          
          {showProductPanel && (
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
          )}
        </div>
      </header>

      <main className="container">
        {/* KPIs */}
        <section className="kpis">
          <div className="kpi">
            <div className="kpi-label">Faturamento do período</div>
            <div className="kpi-value">{formatK(totals.faturamento)}</div>
            <div className="kpi-sub">Por produto/cliente</div>
          </div>
          
          <div className="kpi">
            <div className="kpi-label">Custo total</div>
            <div className="kpi-value">{formatK(totals.custo)}</div>
            <div className="kpi-sub">Custos dos produtos</div>
          </div>
          
          <div className="kpi">
            <div className="kpi-label">Margem bruta</div>
            <div className="kpi-value">{formatK(totals.margemValor)}</div>
            <div className="kpi-sub">{(totals.margemPercent * 100).toFixed(1)}% de margem</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Linhas de venda</div>
            <div className="kpi-value">{totals.pedidos.toLocaleString('pt-BR')}</div>
            <div className="kpi-sub">Items vendidos</div>
          </div>
        </section>

        {/* Tabelas */}
        <section className="charts">
          <div className="card">
            <h3>Top produtos por margem</h3>
            <div className="table-wrap">
              <div className="table-scroll">
                <ul className="rank">
                  {topProdutosPorMargem.map((item) => (
                    <li 
                      key={item.produto}
                      onClick={() => {
                        const newSelected = selectedProducts.includes(item.produto) 
                          ? selectedProducts.filter(p => p !== item.produto)
                          : [item.produto];
                        setSelectedProducts(newSelected);
                        applyFilters(rawData, new Date(periodStart), new Date(periodEnd), selectedClients, newSelected);
                      }}
                      className={selectedProducts.includes(item.produto) ? 'selected' : ''}
                    >
                      <div>
                        <strong>{item.produto}</strong>
                        <div style={{fontSize: '11px', color: 'var(--muted)', marginTop: '2px'}}>
                          Receita: {formatValueBR(item.receita)} • Custo: {formatValueBR(item.custo)}
                        </div>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <strong>{formatValueBR(item.margemValor)}</strong>
                        <div style={{fontSize: '11px', color: item.margemPercent >= 0 ? '#00d3a7' : '#ff6b6b'}}>
                          {(item.margemPercent * 100).toFixed(1)}%
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Top clientes por receita</h3>
            <div className="table-wrap">
              <div className="table-scroll">
                <ul className="rank">
                  {topClientesPorReceita.map((item) => (
                    <li 
                      key={item.cliente}
                      onClick={() => {
                        const newSelected = selectedClients.includes(item.cliente) 
                          ? selectedClients.filter(c => c !== item.cliente)
                          : [item.cliente];
                        setSelectedClients(newSelected);
                        applyFilters(rawData, new Date(periodStart), new Date(periodEnd), newSelected, selectedProducts);
                      }}
                      className={selectedClients.includes(item.cliente) ? 'selected' : ''}
                    >
                      <div>
                        <strong>{item.cliente}</strong>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <strong>{formatValueBR(item.receita)}</strong>
                      </div>
                    </li>
                  ))}
          </ul>
        </div>
            </div>
          </div>
        </section>
      </main>

      {/* Estilos CSS idênticos ao dashboard de faturamento */}
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
        .orb-a { background: radial-gradient(circle at 30% 30%, #7bb0ff, transparent 60%); top: -120px; left: -80px; }
        .orb-b { background: radial-gradient(circle at 70% 70%, #00d3a7, transparent 60%); bottom: -140px; right: -120px; animation-delay: -6s; }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-20px) } }
        .grid-overlay { position: absolute; inset: 0; background: linear-gradient(transparent 95%, rgba(255,255,255,.05) 95%), linear-gradient(90deg, transparent 95%, rgba(255,255,255,.05) 95%); background-size: 28px 28px; mix-blend-mode: overlay; opacity: .25; }

        .app-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 22px; position: sticky; top: 0; z-index: 10;
          backdrop-filter: blur(12px); background: linear-gradient(180deg, rgba(9,14,28,.65), rgba(9,14,28,.35)); border-bottom: 1px solid var(--panel-border);
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
        .kpi-label { color: var(--muted); font-size: 12px; }
        .kpi-value { font-size: 28px; margin-top: 8px; font-weight: 800; letter-spacing: .2px; }
        .kpi-sub { color: var(--muted); margin-top: 4px; font-weight: 600; }
        .kpi-foot { color: var(--muted); margin-top: 8px; font-size: 12px; }
        .kpi-sub.neg { color: #ff6b6b; }
        .kpi-sub.pos { color: #00d3a7; }

        .charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; }
        .span-2 { grid-column: span 2; }
        .card { 
          background: var(--panel); border: 1px solid var(--panel-border); border-radius: 16px; padding: 16px; 
          box-shadow: 0 8px 24px rgba(0,0,0,.25), inset 0 1px rgba(255,255,255,.06); backdrop-filter: blur(8px); 
        }
        .card h3 { margin: 4px 0 12px; font-size: 14px; color: var(--accent-2); font-weight: 700; letter-spacing: .2px; }

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

        .table-wrap .table-scroll { overflow: auto; max-height: 420px; min-height: 320px; }

        .badge { 
          display: inline-flex; align-items: center; gap: 8px; 
          padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; 
          cursor: pointer; transition: background .15s ease, transform .1s ease; 
        }
        .badge-interactive { 
          background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); 
          color: var(--text); 
        }
        .badge-interactive:hover { 
          background: rgba(255,255,255,.12); transform: translateY(-1px); 
        }
        .caret { font-size: 10px; opacity: .7; }

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
          max-height: 80vh;
          overflow: hidden;
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

        .pos { color: #00d3a7; }
        .neg { color: #ff6b6b; }

        @media (max-width: 900px) { 
          .span-2 { grid-column: span 1; }
        }
        @media (max-width: 640px) { 
          .table-wrap .table-scroll { min-height: 220px; }
          .period-panel { width: 280px; right: 0; }
        }
      `}</style>
    </>
  );
}