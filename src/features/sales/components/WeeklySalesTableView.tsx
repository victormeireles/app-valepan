'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { ProductSaleRow } from '@/lib/sheets';
import { useSalesData } from '@/features/sales/hooks/useSalesData';
import { useSalesFilters } from '@/features/sales/hooks/useSalesFilters';
import { useWeeklySalesTableData } from '@/features/sales/hooks/useWeeklySalesTableData';
import { WeeklySalesTable } from '@/features/sales/components/WeeklySalesTable';
import { createPeriodEndDate, createPeriodStartDate } from '@/features/common/utils/date';
import { useTenant } from '@/hooks/useTenant';
import type { MetricType, PeriodGranularity } from '@/features/sales/types';
import vendasStyles from '@/styles/vendas.module.css';

export default function WeeklySalesTableView() {
  const { status } = useSession();
  const { tenantName } = useTenant();

  // Estados locais
  const [rawData, setRawData] = useState<ProductSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [accessDenied, setAccessDenied] = useState<{ email: string; sheetUrl?: string } | null>(null);
  const [meta, setMeta] = useState<{hasPackages:boolean;hasBoxes:boolean;hasCustomerType:boolean} | null>(null);

  // Estados dos filtros
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [customerTypeSearch, setCustomerTypeSearch] = useState('');
  const [metric, setMetric] = useState<MetricType>('faturamento');
  const [granularity, setGranularity] = useState<PeriodGranularity>('weekly');
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);

  // Estados da UI
  const [showGranularityPanel, setShowGranularityPanel] = useState(false);
  const [showPeriodPanel, setShowPeriodPanel] = useState(false);
  const [showClientPanel, setShowClientPanel] = useState(false);
  const [showProductPanel, setShowProductPanel] = useState(false);
  const [showCustomerTypePanel, setShowCustomerTypePanel] = useState(false);
  const [showMetricPanel, setShowMetricPanel] = useState(false);

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  // Hook de dados
  const sales = useSalesData(status === 'authenticated');

  const lastDataDate = useMemo(() => {
    if (rawData.length > 0) {
      const timestamps = rawData.map(row => row.data.getTime());
      return new Date(Math.max(...timestamps));
    }
    if (sales.periodEnd) {
      return new Date(`${sales.periodEnd}T00:00:00`);
    }
    return null;
  }, [rawData, sales.periodEnd]);

  const computeRangeForGranularity = useCallback((referenceDate: Date, targetGranularity: PeriodGranularity) => {
    const normalizedEnd = new Date(referenceDate);
    normalizedEnd.setHours(0, 0, 0, 0);
    const rangeStart = new Date(normalizedEnd);

    if (targetGranularity === 'daily') {
      rangeStart.setDate(rangeStart.getDate() - 13);
    } else if (targetGranularity === 'monthly') {
      const firstOfCurrentMonth = new Date(normalizedEnd.getFullYear(), normalizedEnd.getMonth(), 1);
      firstOfCurrentMonth.setMonth(firstOfCurrentMonth.getMonth() - 2);
      rangeStart.setTime(firstOfCurrentMonth.getTime());
    } else {
      // semanal: 12 períodos, total de 83 dias
      rangeStart.setDate(rangeStart.getDate() - 83);
    }

    return {
      startISO: rangeStart.toISOString().split('T')[0],
      endISO: normalizedEnd.toISOString().split('T')[0],
    };
  }, []);

  // Sincronizar estados locais
  useEffect(() => {
    if (sales.rawData !== rawData) setRawData(sales.rawData);
    if (sales.meta && sales.meta !== meta) setMeta(sales.meta);
    if (loading !== sales.loading) setLoading(sales.loading);
    if (initialLoad !== sales.initialLoad) setInitialLoad(sales.initialLoad);
    if (accessDenied !== sales.accessDenied) setAccessDenied(sales.accessDenied);
  }, [sales, rawData, meta, loading, initialLoad, accessDenied]);

  useEffect(() => {
    if (!lastDataDate || isCustomPeriod) {
      return;
    }
    const range = computeRangeForGranularity(lastDataDate, granularity);
    if (range.startISO === periodStart && range.endISO === periodEnd) {
      return;
    }
    setPeriodStart(range.startISO);
    setPeriodEnd(range.endISO);
  }, [
    lastDataDate,
    isCustomPeriod,
    computeRangeForGranularity,
    granularity,
    periodStart,
    periodEnd,
  ]);

  // Hook de filtros
  const filters = useSalesFilters({
    rawData,
    meta,
    periodStart,
    periodEnd,
    quaseInativoMeses: 1,
    inativoMeses: 2,
    maxPeriodoMeses: 6,
    topClientsCount: 5,
  });

  const { selectedClients, setSelectedClients, selectedProducts, setSelectedProducts, selectedCustomerTypes, setSelectedCustomerTypes } = filters;

  // Hook para dados da tabela semanal
  const startDate = useMemo(() => (periodStart ? createPeriodStartDate(periodStart) : null), [periodStart]);
  const endDate = useMemo(() => (periodEnd ? createPeriodEndDate(periodEnd) : null), [periodEnd]);
  const tableData = useWeeklySalesTableData({
    filteredData: filters.filteredData,
    startDate,
    endDate,
    metric,
    granularity,
  });

  // Fechar todos os modais
  const closeAllModals = () => {
    setShowGranularityPanel(false);
    setShowPeriodPanel(false);
    setShowClientPanel(false);
    setShowProductPanel(false);
    setShowCustomerTypePanel(false);
    setShowMetricPanel(false);
  };

  // Abrir modal específico
  const openModal = (modalType: 'granularity' | 'period' | 'client' | 'product' | 'customerType' | 'metric') => {
    closeAllModals();
    switch (modalType) {
      case 'granularity':
        setShowGranularityPanel(true);
        break;
      case 'period':
        setShowPeriodPanel(true);
        break;
      case 'client':
        setShowClientPanel(true);
        break;
      case 'product':
        setShowProductPanel(true);
        break;
      case 'customerType':
        setShowCustomerTypePanel(true);
        break;
      case 'metric':
        setShowMetricPanel(true);
        break;
    }
  };

  // Detectar clique fora dos modais
  const isAnyModalOpen =
    showGranularityPanel ||
    showPeriodPanel ||
    showClientPanel ||
    showProductPanel ||
    showCustomerTypePanel ||
    showMetricPanel;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isAnyModalOpen) return;
      
      const target = event.target as HTMLElement;
      const isModalContent = target.closest('[data-modal-content]');
      const isFilterButton = target.closest('[data-filter-button]');
      
      if (!isModalContent && !isFilterButton) {
        closeAllModals();
      }
    };

    if (isAnyModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isAnyModalOpen]);

  // Listas filtradas para os selects
  const filteredClients = useMemo(() => {
    const uniqueClients = Array.from(new Set(rawData.map(r => r.cliente))).sort();
    return clientSearch
      ? uniqueClients.filter(c => c.toLowerCase().includes(clientSearch.toLowerCase()))
      : uniqueClients;
  }, [rawData, clientSearch]);

  const filteredProducts = useMemo(() => {
    const uniqueProducts = Array.from(new Set(rawData.map(r => r.produto).filter(Boolean))).sort();
    return productSearch
      ? uniqueProducts.filter(p => p.toLowerCase().includes(productSearch.toLowerCase()))
      : uniqueProducts;
  }, [rawData, productSearch]);

  const filteredCustomerTypes = useMemo(() => {
    if (!meta?.hasCustomerType) return [];
    const uniqueTypes = Array.from(new Set(rawData.map(r => r.tipoCliente).filter(Boolean))) as string[];
    uniqueTypes.sort();
    return customerTypeSearch
      ? uniqueTypes.filter(t => t.toLowerCase().includes(customerTypeSearch.toLowerCase()))
      : uniqueTypes;
  }, [rawData, customerTypeSearch, meta]);

  // Renderizar mensagens de status
  if (status === 'loading' || initialLoad) {
    return (
      <div className={vendasStyles.loading}>
        <div className={vendasStyles.spinner}></div>
        <p>Carregando dados...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className={vendasStyles['access-denied']}>
        <div className={vendasStyles['access-denied-content']}>
          <span className="material-icons">block</span>
          <h2>Acesso Negado</h2>
          <p>O e-mail <strong>{accessDenied.email}</strong> não tem permissão para acessar a planilha deste tenant.</p>
          {accessDenied.sheetUrl && (
            <a href={accessDenied.sheetUrl} target="_blank" rel="noopener noreferrer" className={vendasStyles.button}>
              Abrir Planilha para Compartilhar
            </a>
          )}
        </div>
      </div>
    );
  }

  const metricLabels: Record<MetricType, string> = {
    faturamento: 'Faturamento',
    quantidade: 'Quantidade',
    caixas: 'Caixas',
  };
  const granularityLabels: Record<PeriodGranularity, string> = {
    weekly: 'Semanal',
    daily: 'Diário',
    monthly: 'Mensal',
  };
  const granularityDescriptions: Record<PeriodGranularity, string> = {
    weekly: '12 períodos',
    daily: 'Últimos 14 dias',
    monthly: 'Últimos 3 meses',
  };

  // Formatar exibição do período
  const formatPeriodDisplay = (start: string, end: string): string => {
    if (!start || !end) return 'Período';
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    const startStr = startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const endStr = endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `${startStr}–${endStr}`;
  };

  const handleGranularityChange = (nextGranularity: PeriodGranularity) => {
    if (!lastDataDate) {
      setGranularity(nextGranularity);
      closeAllModals();
      return;
    }
    const range = computeRangeForGranularity(lastDataDate, nextGranularity);
    setGranularity(nextGranularity);
    setIsCustomPeriod(false);
    setPeriodStart(range.startISO);
    setPeriodEnd(range.endISO);
    closeAllModals();
  };

  const handlePeriodStartChange = (value: string) => {
    setIsCustomPeriod(true);
    setPeriodStart(value);
  };

  const handlePeriodEndChange = (value: string) => {
    setIsCustomPeriod(true);
    setPeriodEnd(value);
  };

  // Handlers dos filtros
  const handleClientApply = () => {
    closeAllModals();
  };

  const handleProductApply = () => {
    closeAllModals();
  };

  const handleCustomerTypeApply = () => {
    closeAllModals();
  };

  return (
    <>
      <div className={vendasStyles['bg-animations']}>
        <div className={`${vendasStyles.orb} ${vendasStyles['orb-a']}`}></div>
        <div className={`${vendasStyles.orb} ${vendasStyles['orb-b']}`}></div>
        <div className={vendasStyles['grid-overlay']}></div>
      </div>

      <header className={vendasStyles['app-header']}>
        <h1 className={vendasStyles.brand}><span>{tenantName}</span> Visão Semanal</h1>
        <div className={vendasStyles['header-right']}>
          <div className={`${vendasStyles['filter-badges']} ${vendasStyles['desktop-only']}`}>
            {/* Granularidade */}
            <button
              className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`}
              title="Selecionar granularidade"
              data-filter-button
              onClick={() => (showGranularityPanel ? closeAllModals() : openModal('granularity'))}
            >
              <span className={vendasStyles['dot-indicator']}></span>
              <span>{granularityLabels[granularity]}</span>
              <span className={vendasStyles.caret}>▾</span>
            </button>

            {showGranularityPanel && (
              <>
                <div className={vendasStyles['modal-overlay']} onClick={closeAllModals}></div>
                <div className={vendasStyles['period-panel']} data-modal-content>
                  <div className={vendasStyles['filter-list-container']}>
                    <ul className={vendasStyles['filter-list']}>
                      {(['weekly', 'daily', 'monthly'] as PeriodGranularity[]).map(option => (
                        <li
                          key={option}
                          className={`${vendasStyles['filter-list-item']} ${
                            granularity === option ? vendasStyles['selected'] : ''
                          }`}
                          onClick={() => handleGranularityChange(option)}
                        >
                          <span className={vendasStyles['filter-label']}>
                            {granularityLabels[option]}
                          </span>
                          <span className={vendasStyles['filter-description']}>
                            {granularityDescriptions[option]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}

            {/* Filtro de período */}
            <button 
              className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`} 
              title="Filtrar período"
              data-filter-button
              onClick={() => showPeriodPanel ? closeAllModals() : openModal('period')}
            >
              <span className={vendasStyles['dot-indicator']}></span>
              <span>{formatPeriodDisplay(periodStart, periodEnd)}</span>
              <span className={vendasStyles.caret}>▾</span>
            </button>
            
            {showPeriodPanel && (
              <>
                <div className={vendasStyles['modal-overlay']} onClick={closeAllModals}></div>
                <div className={vendasStyles['period-panel']} data-modal-content>
                  <div className={vendasStyles['period-row']}>
                    <label>Início</label>
                    <input 
                      type="date" 
                      value={periodStart}
                      onChange={(event) => handlePeriodStartChange(event.target.value)}
                    />
                  </div>
                  <div className={vendasStyles['period-row']}>
                    <label>Fim</label>
                    <input 
                      type="date" 
                      value={periodEnd}
                      onChange={(event) => handlePeriodEndChange(event.target.value)}
                    />
                  </div>
                  <div className={vendasStyles['period-actions']}>
                    <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={closeAllModals}>Fechar</button>
                  </div>
                </div>
              </>
            )}

            {/* Filtro de cliente */}
            <button 
              className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`} 
              title="Filtrar cliente"
              data-filter-button
              onClick={() => showClientPanel ? closeAllModals() : openModal('client')}
            >
              <span className={vendasStyles['dot-indicator']}></span>
              <span>{selectedClients.length === 1 ? selectedClients[0] : selectedClients.length > 0 ? `${selectedClients.length} selecionados` : 'Clientes'}</span>
              <span className={vendasStyles.caret}>▾</span>
            </button>
            
            {showClientPanel && (
              <>
                <div className={vendasStyles['modal-overlay']} onClick={closeAllModals}></div>
                <div className={vendasStyles['period-panel']} data-modal-content>
                  <div className={vendasStyles['period-row']}>
                    <label>Buscar</label>
                    <input 
                      type="text" 
                      placeholder="Digite para filtrar"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                    />
                  </div>
                  <div className={vendasStyles['filter-list-container']}>
                    <ul className={vendasStyles['filter-list']}>
                      {filteredClients.map(client => (
                        <li 
                          key={client} 
                          className={`${vendasStyles['filter-list-item']} ${selectedClients.includes(client) ? vendasStyles['selected'] : ''}`}
                        >
                          <input 
                            type="checkbox"
                            className={vendasStyles['filter-checkbox']}
                            checked={selectedClients.includes(client)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClients([...selectedClients, client]);
                              } else {
                                setSelectedClients(selectedClients.filter(c => c !== client));
                              }
                            }}
                          />
                          <span className={vendasStyles['filter-label']}>{client}</span>
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
              data-filter-button
              onClick={() => showProductPanel ? closeAllModals() : openModal('product')}
            >
              <span className={vendasStyles['dot-indicator']}></span>
              <span>{selectedProducts.length === 1 ? selectedProducts[0] : selectedProducts.length > 0 ? `${selectedProducts.length} selecionados` : 'Produtos'}</span>
              <span className={vendasStyles.caret}>▾</span>
            </button>
            
            {showProductPanel && (
              <>
                <div className={vendasStyles['modal-overlay']} onClick={closeAllModals}></div>
                <div className={vendasStyles['period-panel']} data-modal-content>
                  <div className={vendasStyles['period-row']}>
                    <label>Buscar</label>
                    <input 
                      type="text" 
                      placeholder="Digite para filtrar"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                  <div className={vendasStyles['filter-list-container']}>
                    <ul className={vendasStyles['filter-list']}>
                      {filteredProducts.map(product => (
                        <li 
                          key={product} 
                          className={`${vendasStyles['filter-list-item']} ${selectedProducts.includes(product) ? vendasStyles['selected'] : ''}`}
                        >
                          <input 
                            type="checkbox"
                            className={vendasStyles['filter-checkbox']}
                            checked={selectedProducts.includes(product)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProducts([...selectedProducts, product]);
                              } else {
                                setSelectedProducts(selectedProducts.filter(p => p !== product));
                              }
                            }}
                          />
                          <span className={vendasStyles['filter-label']}>{product}</span>
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

            {/* Filtro de tipo de cliente */}
            {meta?.hasCustomerType && (
              <>
                <button 
                  className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`} 
                  title="Filtrar tipo de cliente"
                  data-filter-button
                  onClick={() => showCustomerTypePanel ? closeAllModals() : openModal('customerType')}
                >
                  <span className={vendasStyles['dot-indicator']}></span>
                  <span>{selectedCustomerTypes.length === 1 ? selectedCustomerTypes[0] : selectedCustomerTypes.length > 0 ? `${selectedCustomerTypes.length} tipos` : 'Tipo Cliente'}</span>
                  <span className={vendasStyles.caret}>▾</span>
                </button>
                
                {showCustomerTypePanel && (
                  <>
                    <div className={vendasStyles['modal-overlay']} onClick={closeAllModals}></div>
                    <div className={vendasStyles['period-panel']} data-modal-content>
                      <div className={vendasStyles['period-row']}>
                        <label>Buscar</label>
                        <input 
                          type="text" 
                          placeholder="Digite para filtrar"
                          value={customerTypeSearch}
                          onChange={(e) => setCustomerTypeSearch(e.target.value)}
                        />
                      </div>
                      <div className={vendasStyles['filter-list-container']}>
                        <ul className={vendasStyles['filter-list']}>
                          {filteredCustomerTypes.map(type => (
                            <li 
                              key={type} 
                              className={`${vendasStyles['filter-list-item']} ${selectedCustomerTypes.includes(type) ? vendasStyles['selected'] : ''}`}
                            >
                              <input 
                                type="checkbox"
                                className={vendasStyles['filter-checkbox']}
                                checked={selectedCustomerTypes.includes(type)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCustomerTypes([...selectedCustomerTypes, type]);
                                  } else {
                                    setSelectedCustomerTypes(selectedCustomerTypes.filter(t => t !== type));
                                  }
                                }}
                              />
                              <span className={vendasStyles['filter-label']}>{type}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className={vendasStyles['period-actions']}>
                        <button className={vendasStyles.btn} onClick={handleCustomerTypeApply}>Aplicar</button>
                        <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={() => setSelectedCustomerTypes([])}>Limpar</button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Filtro de métrica */}
            <button 
              className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`} 
              title="Selecionar métrica"
              data-filter-button
              onClick={() => showMetricPanel ? closeAllModals() : openModal('metric')}
            >
              <span className={vendasStyles['dot-indicator']}></span>
              <span>{metricLabels[metric]}</span>
              <span className={vendasStyles.caret}>▾</span>
            </button>
            
            {showMetricPanel && (
              <>
                <div className={vendasStyles['modal-overlay']} onClick={closeAllModals}></div>
                <div className={vendasStyles['period-panel']} data-modal-content>
                  <div className={vendasStyles['filter-list-container']}>
                    <ul className={vendasStyles['filter-list']}>
                      <li 
                        className={`${vendasStyles['filter-list-item']} ${metric === 'faturamento' ? vendasStyles['selected'] : ''}`}
                        onClick={() => {
                          setMetric('faturamento');
                          closeAllModals();
                        }}
                      >
                        <span className={vendasStyles['filter-label']}>Faturamento</span>
                      </li>
                      <li 
                        className={`${vendasStyles['filter-list-item']} ${metric === 'quantidade' ? vendasStyles['selected'] : ''}`}
                        onClick={() => {
                          setMetric('quantidade');
                          closeAllModals();
                        }}
                      >
                        <span className={vendasStyles['filter-label']}>Quantidade</span>
                      </li>
                      {meta?.hasBoxes && (
                        <li 
                          className={`${vendasStyles['filter-list-item']} ${metric === 'caixas' ? vendasStyles['selected'] : ''}`}
                          onClick={() => {
                            setMetric('caixas');
                            closeAllModals();
                          }}
                        >
                          <span className={vendasStyles['filter-label']}>Caixas</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Filtros Mobile */}
      <div className={vendasStyles['mobile-filters']}>
        <div className={vendasStyles['filter-badges']}>
          {/* Granularidade */}
          <button
            className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`}
            title="Selecionar granularidade"
            data-filter-button
            onClick={() => (showGranularityPanel ? closeAllModals() : openModal('granularity'))}
          >
            <span className={vendasStyles['dot-indicator']}></span>
            <span>{granularityLabels[granularity]}</span>
            <span className={vendasStyles.caret}>▾</span>
          </button>

          {showGranularityPanel && (
            <>
              <div className={vendasStyles['modal-overlay']} onClick={closeAllModals}></div>
              <div className={vendasStyles['period-panel']} data-modal-content>
                <div className={vendasStyles['filter-list-container']}>
                  <ul className={vendasStyles['filter-list']}>
                    {(['weekly', 'daily', 'monthly'] as PeriodGranularity[]).map(option => (
                      <li
                        key={option}
                        className={`${vendasStyles['filter-list-item']} ${
                          granularity === option ? vendasStyles['selected'] : ''
                        }`}
                        onClick={() => handleGranularityChange(option)}
                      >
                        <span className={vendasStyles['filter-label']}>{granularityLabels[option]}</span>
                        <span className={vendasStyles['filter-description']}>
                          {granularityDescriptions[option]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Filtro de período */}
          <button 
            className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`} 
            title="Filtrar período"
            data-filter-button
            onClick={() => showPeriodPanel ? closeAllModals() : openModal('period')}
          >
            <span className={vendasStyles['dot-indicator']}></span>
            <span>{formatPeriodDisplay(periodStart, periodEnd)}</span>
            <span className={vendasStyles.caret}>▾</span>
          </button>
          
          {showPeriodPanel && (
            <>
              <div className={vendasStyles['modal-overlay']} onClick={closeAllModals}></div>
              <div className={vendasStyles['period-panel']} data-modal-content>
                <div className={vendasStyles['period-row']}>
                  <label>Início</label>
                <input 
                  type="date" 
                  value={periodStart}
                  onChange={(event) => handlePeriodStartChange(event.target.value)}
                />
                </div>
                <div className={vendasStyles['period-row']}>
                  <label>Fim</label>
                <input 
                  type="date" 
                  value={periodEnd}
                  onChange={(event) => handlePeriodEndChange(event.target.value)}
                />
                </div>
                <div className={vendasStyles['period-actions']}>
                  <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={closeAllModals}>Fechar</button>
                </div>
              </div>
            </>
          )}

          {/* Filtro de cliente */}
          <button 
            className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`} 
            title="Filtrar cliente"
            data-filter-button
            onClick={() => showClientPanel ? closeAllModals() : openModal('client')}
          >
            <span className={vendasStyles['dot-indicator']}></span>
            <span>{selectedClients.length === 1 ? selectedClients[0] : selectedClients.length > 0 ? `${selectedClients.length} selecionados` : 'Clientes'}</span>
            <span className={vendasStyles.caret}>▾</span>
          </button>
          
          {showClientPanel && (
            <>
              <div className={vendasStyles['modal-overlay']} onClick={closeAllModals}></div>
              <div className={vendasStyles['period-panel']} data-modal-content>
                <div className={vendasStyles['period-row']}>
                  <label>Buscar</label>
                  <input 
                    type="text" 
                    placeholder="Digite para filtrar"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                </div>
                <div className={vendasStyles['filter-list-container']}>
                  <ul className={vendasStyles['filter-list']}>
                    {filteredClients.map(client => (
                      <li 
                        key={client} 
                        className={`${vendasStyles['filter-list-item']} ${selectedClients.includes(client) ? vendasStyles['selected'] : ''}`}
                      >
                        <input 
                          type="checkbox"
                          className={vendasStyles['filter-checkbox']}
                          checked={selectedClients.includes(client)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClients([...selectedClients, client]);
                            } else {
                              setSelectedClients(selectedClients.filter(c => c !== client));
                            }
                          }}
                        />
                        <span className={vendasStyles['filter-label']}>{client}</span>
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
            data-filter-button
            onClick={() => showProductPanel ? closeAllModals() : openModal('product')}
          >
            <span className={vendasStyles['dot-indicator']}></span>
            <span>{selectedProducts.length === 1 ? selectedProducts[0] : selectedProducts.length > 0 ? `${selectedProducts.length} selecionados` : 'Produtos'}</span>
            <span className={vendasStyles.caret}>▾</span>
          </button>
          
          {showProductPanel && (
            <>
              <div className={vendasStyles['modal-overlay']} onClick={closeAllModals}></div>
              <div className={vendasStyles['period-panel']} data-modal-content>
                <div className={vendasStyles['period-row']}>
                  <label>Buscar</label>
                  <input 
                    type="text" 
                    placeholder="Digite para filtrar"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                <div className={vendasStyles['filter-list-container']}>
                  <ul className={vendasStyles['filter-list']}>
                    {filteredProducts.map(product => (
                      <li 
                        key={product} 
                        className={`${vendasStyles['filter-list-item']} ${selectedProducts.includes(product) ? vendasStyles['selected'] : ''}`}
                      >
                        <input 
                          type="checkbox"
                          className={vendasStyles['filter-checkbox']}
                          checked={selectedProducts.includes(product)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts([...selectedProducts, product]);
                            } else {
                              setSelectedProducts(selectedProducts.filter(p => p !== product));
                            }
                          }}
                        />
                        <span className={vendasStyles['filter-label']}>{product}</span>
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

          {/* Filtro de tipo de cliente */}
          {meta?.hasCustomerType && (
            <>
              <button 
                className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`} 
                title="Filtrar tipo de cliente"
                data-filter-button
                onClick={() => showCustomerTypePanel ? closeAllModals() : openModal('customerType')}
              >
                <span className={vendasStyles['dot-indicator']}></span>
                <span>{selectedCustomerTypes.length === 1 ? selectedCustomerTypes[0] : selectedCustomerTypes.length > 0 ? `${selectedCustomerTypes.length} tipos` : 'Tipo Cliente'}</span>
                <span className={vendasStyles.caret}>▾</span>
              </button>
              
              {showCustomerTypePanel && (
                <>
                  <div className={vendasStyles['modal-overlay']} onClick={closeAllModals}></div>
                  <div className={vendasStyles['period-panel']} data-modal-content>
                    <div className={vendasStyles['period-row']}>
                      <label>Buscar</label>
                      <input 
                        type="text" 
                        placeholder="Digite para filtrar"
                        value={customerTypeSearch}
                        onChange={(e) => setCustomerTypeSearch(e.target.value)}
                      />
                    </div>
                    <div className={vendasStyles['filter-list-container']}>
                      <ul className={vendasStyles['filter-list']}>
                        {filteredCustomerTypes.map(type => (
                          <li 
                            key={type} 
                            className={`${vendasStyles['filter-list-item']} ${selectedCustomerTypes.includes(type) ? vendasStyles['selected'] : ''}`}
                          >
                            <input 
                              type="checkbox"
                              className={vendasStyles['filter-checkbox']}
                              checked={selectedCustomerTypes.includes(type)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCustomerTypes([...selectedCustomerTypes, type]);
                                } else {
                                  setSelectedCustomerTypes(selectedCustomerTypes.filter(t => t !== type));
                                }
                              }}
                            />
                            <span className={vendasStyles['filter-label']}>{type}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={vendasStyles['period-actions']}>
                      <button className={vendasStyles.btn} onClick={handleCustomerTypeApply}>Aplicar</button>
                      <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={() => setSelectedCustomerTypes([])}>Limpar</button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Filtro de métrica */}
          <button 
            className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`} 
            title="Selecionar métrica"
            data-filter-button
            onClick={() => showMetricPanel ? closeAllModals() : openModal('metric')}
          >
            <span className={vendasStyles['dot-indicator']}></span>
            <span>{metricLabels[metric]}</span>
            <span className={vendasStyles.caret}>▾</span>
          </button>
          
          {showMetricPanel && (
            <>
              <div className={vendasStyles['modal-overlay']} onClick={closeAllModals}></div>
              <div className={vendasStyles['period-panel']} data-modal-content>
                <div className={vendasStyles['filter-list-container']}>
                  <ul className={vendasStyles['filter-list']}>
                    <li 
                      className={`${vendasStyles['filter-list-item']} ${metric === 'faturamento' ? vendasStyles['selected'] : ''}`}
                      onClick={() => {
                        setMetric('faturamento');
                        closeAllModals();
                      }}
                    >
                      <span className={vendasStyles['filter-label']}>Faturamento</span>
                    </li>
                    <li 
                      className={`${vendasStyles['filter-list-item']} ${metric === 'quantidade' ? vendasStyles['selected'] : ''}`}
                      onClick={() => {
                        setMetric('quantidade');
                        closeAllModals();
                      }}
                    >
                      <span className={vendasStyles['filter-label']}>Quantidade</span>
                    </li>
                    {meta?.hasBoxes && (
                      <li 
                        className={`${vendasStyles['filter-list-item']} ${metric === 'caixas' ? vendasStyles['selected'] : ''}`}
                        onClick={() => {
                          setMetric('caixas');
                          closeAllModals();
                        }}
                      >
                        <span className={vendasStyles['filter-label']}>Caixas</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={vendasStyles.container}>
        {loading ? (
          <div className={vendasStyles.loading}>
            <div className={vendasStyles.spinner}></div>
            <p>Carregando dados...</p>
          </div>
        ) : tableData ? (
          <WeeklySalesTable data={tableData} metric={metric} filteredData={filters.filteredData} />
        ) : (
          <div className={vendasStyles.card}>
            <p>Nenhum dado disponível para o período selecionado.</p>
          </div>
        )}
      </div>
    </>
  );
}

