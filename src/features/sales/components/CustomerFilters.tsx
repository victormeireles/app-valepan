'use client';

import { useState } from 'react';
import vendasStyles from '@/styles/vendas.module.css';

interface CustomerFiltersProps {
  newCustomerMonths: number;
  inactiveMonths: number;
  almostInactiveMonths: number;
  onNewCustomerMonthsChange: (value: number) => void;
  onInactiveMonthsChange: (value: number) => void;
  onAlmostInactiveMonthsChange: (value: number) => void;
  onApplyFilters: () => void;
  lastPurchaseDate: Date | null;
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
}: CustomerFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const resetFilters = () => {
    onNewCustomerMonthsChange(1);
    onInactiveMonthsChange(2);
    onAlmostInactiveMonthsChange(1);
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
