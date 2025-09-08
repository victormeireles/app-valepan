"use client";

import { useState, useEffect } from 'react';
import vendasStyles from '@/styles/vendas.module.css';
import { formatPeriodDisplay } from '@/features/common/utils/date';

export interface FilterOption {
  id: string;
  label: string;
  type: 'period' | 'select' | 'search';
  options?: string[];
  selectedValues?: string[];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSelectionChange?: (values: string[]) => void;
  onApply?: () => void;
  onClear?: () => void;
  onPreset?: (preset: string) => void;
  presets?: { label: string; action: () => void }[];
  count?: (value: string) => number;
  show?: boolean;
}

interface DashboardHeaderProps {
  title: string;
  tenantName: string;
  subtitle?: string;
  filters: FilterOption[];
}

export default function DashboardHeader({ title, tenantName, subtitle, filters }: DashboardHeaderProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const openModal = (filterId: string) => {
    setActiveFilter(activeFilter === filterId ? null : filterId);
  };

  const closeAllModals = () => {
    setActiveFilter(null);
  };

  // Fechar modal ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-modal-content]') && !target.closest('[data-filter-button]')) {
        closeAllModals();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const formatSelectionDisplay = (values: string[], label: string) => {
    if (values.length === 0) return label;
    if (values.length === 1) return values[0];
    return `${values.length} selecionados`;
  };

  return (
    <header className={vendasStyles['app-header']}>
      <h1 className={vendasStyles.brand}>
        <span>{tenantName}</span> {title}
      </h1>
      <div className={vendasStyles['header-right']}>
        {subtitle && (
          <div className="text-sm text-gray-400">
            {subtitle}
          </div>
        )}
        <div className={`${vendasStyles['filter-badges']} ${vendasStyles['desktop-only']}`}>
          {filters.map((filter) => {
            if (filter.show === false) return null;

            return (
              <div key={filter.id}>
                <button 
                  className={`${vendasStyles.badge} ${vendasStyles['badge-interactive']}`} 
                  title={`Filtrar ${filter.label.toLowerCase()}`}
                  data-filter-button
                  onClick={() => openModal(filter.id)}
                >
                  <span className={vendasStyles['dot-indicator']}></span>
                  <span>
                    {filter.type === 'period' 
                      ? formatPeriodDisplay(filter.selectedValues?.[0] || '', filter.selectedValues?.[1] || '')
                      : formatSelectionDisplay(filter.selectedValues || [], filter.label)
                    }
                  </span>
                  <span className={vendasStyles.caret}>▾</span>
                </button>
                
                {activeFilter === filter.id && (
                  <>
                    <div className={vendasStyles['modal-overlay']} onClick={closeAllModals}></div>
                    <div className={vendasStyles['period-panel']} data-modal-content>
                      {/* Presets para filtro de período */}
                      {filter.type === 'period' && filter.presets && (
                        <div className={vendasStyles['period-presets']}>
                          {filter.presets.map((preset, index) => (
                            <button 
                              key={index}
                              className={vendasStyles.chip} 
                              onClick={preset.action}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Inputs de período */}
                      {filter.type === 'period' && (
                        <>
                          <div className={vendasStyles['period-row']}>
                            <label>Início</label>
                            <input 
                              type="date" 
                              value={filter.selectedValues?.[0] || ''}
                              onChange={(e) => {
                                const newValues = [...(filter.selectedValues || [])];
                                newValues[0] = e.target.value;
                                filter.onSelectionChange?.(newValues);
                              }}
                            />
                          </div>
                          <div className={vendasStyles['period-row']}>
                            <label>Fim</label>
                            <input 
                              type="date" 
                              value={filter.selectedValues?.[1] || ''}
                              onChange={(e) => {
                                const newValues = [...(filter.selectedValues || [])];
                                newValues[1] = e.target.value;
                                filter.onSelectionChange?.(newValues);
                              }}
                            />
                          </div>
                        </>
                      )}

                      {/* Campo de busca para filtros de seleção */}
                      {(filter.type === 'select' || filter.type === 'search') && (
                        <div className={vendasStyles['period-row']}>
                          <label>Buscar</label>
                          <input 
                            type="text" 
                            placeholder="Digite para filtrar"
                            value={filter.searchValue || ''}
                            onChange={(e) => filter.onSearchChange?.(e.target.value)}
                          />
                        </div>
                      )}

                      {/* Lista de opções para filtros de seleção */}
                      {(filter.type === 'select' || filter.type === 'search') && filter.options && (
                        <div className={vendasStyles['filter-list-container']}>
                          <ul className={vendasStyles['filter-list']}>
                            {filter.options.map(option => (
                              <li 
                                key={option} 
                                className={`${vendasStyles['filter-list-item']} ${filter.selectedValues?.includes(option) ? vendasStyles['selected'] : ''}`}
                              >
                                <input 
                                  type="checkbox"
                                  className={vendasStyles['filter-checkbox']}
                                  checked={filter.selectedValues?.includes(option) || false}
                                  onChange={(e) => {
                                    const currentValues = filter.selectedValues || [];
                                    if (e.target.checked) {
                                      filter.onSelectionChange?.([...currentValues, option]);
                                    } else {
                                      filter.onSelectionChange?.(currentValues.filter(v => v !== option));
                                    }
                                  }}
                                />
                                <span className={vendasStyles['filter-label']}>{option}</span>
                                {filter.count && (
                                  <span className={vendasStyles['filter-count']}>
                                    {filter.count(option)}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Botões de ação */}
                      <div className={vendasStyles['period-actions']}>
                        <button 
                          className={vendasStyles.btn} 
                          onClick={() => {
                            filter.onApply?.();
                            closeAllModals();
                          }}
                        >
                          Aplicar
                        </button>
                        <button 
                          className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} 
                          onClick={() => {
                            filter.onClear?.();
                            closeAllModals();
                          }}
                        >
                          {filter.type === 'period' ? 'Fechar' : 'Limpar'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
}
