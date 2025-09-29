'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import vendasStyles from '@/styles/vendas.module.css';
import { CustomerRow } from '@/lib/sheets';

interface CustomerFiltersProps {
  newCustomerMonths: number;
  inactiveMonths: number;
  almostInactiveMonths: number;
  onNewCustomerMonthsChange: (value: number) => void;
  onInactiveMonthsChange: (value: number) => void;
  onAlmostInactiveMonthsChange: (value: number) => void;
  onApplyFilters: () => void;
  lastPurchaseDate: Date | null;
  // Novos props para filtro de tipo de cliente
  rawData: CustomerRow[];
  selectedCustomerTypes: string[];
  onCustomerTypesChange: (types: string[]) => void;
}

export default function CustomerFilters({
  newCustomerMonths,
  inactiveMonths,
  almostInactiveMonths,
  onNewCustomerMonthsChange,
  onInactiveMonthsChange,
  onAlmostInactiveMonthsChange,
  onApplyFilters,
  lastPurchaseDate,
  rawData,
  selectedCustomerTypes,
  onCustomerTypesChange,
}: CustomerFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [customerTypeSearch, setCustomerTypeSearch] = useState('');
  const [showCustomerTypeDropdown, setShowCustomerTypeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Extrair tipos de cliente únicos dos dados
  const availableCustomerTypes = useMemo(() => {
    const types = new Set<string>();
    rawData.forEach(row => {
      if (row.customer_type && row.customer_type.trim()) {
        types.add(row.customer_type.trim());
      }
    });
    return Array.from(types).sort();
  }, [rawData]);

  // Filtrar tipos de cliente baseado na busca
  const filteredCustomerTypes = availableCustomerTypes.filter(type =>
    type.toLowerCase().includes(customerTypeSearch.toLowerCase())
  );

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustomerTypeDropdown(false);
      }
    };

    if (showCustomerTypeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerTypeDropdown]);

  const resetFilters = () => {
    onNewCustomerMonthsChange(1);
    onInactiveMonthsChange(2);
    onAlmostInactiveMonthsChange(1);
    onCustomerTypesChange([]);
    setCustomerTypeSearch('');
    setShowCustomerTypeDropdown(false);
  };

  const formatLastPurchaseDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className={vendasStyles['filters-section']}>
      <button
        className={vendasStyles['filter-toggle']}
        onClick={() => setShowFilters(!showFilters)}
      >
        <span className={vendasStyles['filter-icon']}>⚙️</span>
        Filtros de Clientes
        {lastPurchaseDate && (
          <span className={vendasStyles['filter-date-info']}>
            - Vendas até {formatLastPurchaseDate(lastPurchaseDate)}
          </span>
        )}
        <span className={vendasStyles['filter-arrow']}>
          {showFilters ? '▲' : '▼'}
        </span>
      </button>

      {showFilters && (
        <div className={vendasStyles['filters-panel']}>
          <div className={vendasStyles['filters-grid']}>
            {/* Filtro: Meses para ser novo */}
            <div className={vendasStyles['filter-group']}>
              <label className={vendasStyles['filter-label']}>
                Meses para ser novo
              </label>
              <div className={vendasStyles['filter-input-group']}>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={newCustomerMonths}
                  onChange={(e) => onNewCustomerMonthsChange(Number(e.target.value))}
                  className={vendasStyles['filter-input']}
                />
                <span className={vendasStyles['filter-unit']}>meses</span>
              </div>
              <p className={vendasStyles['filter-description']}>
                Clientes cujo primeiro pedido foi nos últimos X meses
              </p>
            </div>

            {/* Filtro: Meses sem comprar para ser inativo */}
            <div className={vendasStyles['filter-group']}>
              <label className={vendasStyles['filter-label']}>
                Meses sem comprar para ser inativo
              </label>
              <div className={vendasStyles['filter-input-group']}>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={inactiveMonths}
                  onChange={(e) => onInactiveMonthsChange(Number(e.target.value))}
                  className={vendasStyles['filter-input']}
                />
                <span className={vendasStyles['filter-unit']}>meses</span>
              </div>
              <p className={vendasStyles['filter-description']}>
                Clientes sem pedidos há mais de X meses são considerados inativos
              </p>
            </div>

            {/* Filtro: Meses sem comprar para ser quase inativo */}
            <div className={vendasStyles['filter-group']}>
              <label className={vendasStyles['filter-label']}>
                Meses sem comprar para ser quase inativo
              </label>
              <div className={vendasStyles['filter-input-group']}>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={almostInactiveMonths}
                  onChange={(e) => onAlmostInactiveMonthsChange(Number(e.target.value))}
                  className={vendasStyles['filter-input']}
                />
                <span className={vendasStyles['filter-unit']}>meses</span>
              </div>
              <p className={vendasStyles['filter-description']}>
                Clientes sem pedidos há mais de X meses são considerados quase inativos
              </p>
            </div>

            {/* Filtro: Tipos de Cliente */}
            {availableCustomerTypes.length > 0 && (
              <div className={vendasStyles['filter-group']}>
                <label className={vendasStyles['filter-label']}>
                  Tipos de Cliente
                </label>
                <div className={vendasStyles['filter-dropdown-container']} ref={dropdownRef}>
                  <div 
                    className={vendasStyles['filter-dropdown-trigger']}
                    onClick={() => setShowCustomerTypeDropdown(!showCustomerTypeDropdown)}
                  >
                    <span className={vendasStyles['filter-dropdown-text']}>
                      {selectedCustomerTypes.length === 0 
                        ? 'Selecionar tipos...' 
                        : selectedCustomerTypes.length === 1
                          ? selectedCustomerTypes[0]
                          : `${selectedCustomerTypes.length} tipos selecionados`
                      }
                    </span>
                    <span className={vendasStyles['filter-dropdown-arrow']}>
                      {showCustomerTypeDropdown ? '▲' : '▼'}
                    </span>
                  </div>
                  
                  {showCustomerTypeDropdown && (
                    <div className={vendasStyles['filter-dropdown-menu']}>
                      <div className={vendasStyles['filter-dropdown-search']}>
                        <input
                          type="text"
                          placeholder="Buscar tipo..."
                          value={customerTypeSearch}
                          onChange={(e) => setCustomerTypeSearch(e.target.value)}
                          className={vendasStyles['filter-dropdown-search-input']}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className={vendasStyles['filter-dropdown-options']}>
                        {filteredCustomerTypes.map(type => (
                          <label key={type} className={vendasStyles['filter-dropdown-option']}>
                            <input
                              type="checkbox"
                              checked={selectedCustomerTypes.includes(type)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  onCustomerTypesChange([...selectedCustomerTypes, type]);
                                } else {
                                  onCustomerTypesChange(selectedCustomerTypes.filter(t => t !== type));
                                }
                              }}
                              className={vendasStyles['filter-dropdown-checkbox']}
                            />
                            <span className={vendasStyles['filter-dropdown-option-text']}>
                              {type}
                            </span>
                          </label>
                        ))}
                        {filteredCustomerTypes.length === 0 && (
                          <div className={vendasStyles['filter-dropdown-empty']}>
                            Nenhum tipo encontrado
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <p className={vendasStyles['filter-description']}>
                  Selecione os tipos de cliente para filtrar os dados
                </p>
              </div>
            )}
          </div>

          <div className={vendasStyles['filters-actions']}>
            <button
              onClick={resetFilters}
              className={vendasStyles['filter-reset']}
            >
              Resetar Filtros
            </button>
            <button
              onClick={onApplyFilters}
              className={vendasStyles['filter-apply']}
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
