'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import styles from '@/styles/weekly-sales-table.module.css';
import { formatK } from '@/lib/sheets';
import type {
  SalesPeriodTableData,
  MetricType,
  SalesPeriodRow,
  SalesPeriodRange,
} from '@/features/sales/types';
import { computeSalesPeriodProductData } from '@/features/sales/hooks/useWeeklySalesProductData';
import type { ProductSaleRow } from '@/lib/sheets';

interface WeeklySalesTableProps {
  data: SalesPeriodTableData;
  metric: MetricType;
  filteredData: ProductSaleRow[];
}

function formatValue(value: number, metric: MetricType): string {
  if (metric === 'faturamento') {
    return formatK(value);
  }
  // Para quantidade e caixas, mostrar número inteiro
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function formatWeekdayAbbreviation(date: Date): string {
  const weekdayNames: Record<number, string> = {
    0: 'dom',
    1: 'seg',
    2: 'ter',
    3: 'qua',
    4: 'qui',
    5: 'sex',
    6: 'sab',
  };
  return weekdayNames[date.getDay()] ?? '';
}

function renderHeaderLabel(period: SalesPeriodRange): ReactNode {
  if (period.granularity === 'daily') {
    const dateLabel = period.start.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
    const weekdayLabel = formatWeekdayAbbreviation(period.start);
    return (
      <div className={styles.weekHeaderContent}>
        <span className={styles.weekHeaderDate}>{dateLabel}</span>
        <span className={styles.weekHeaderWeekday}>{weekdayLabel}</span>
      </div>
    );
  }

  return <span className={styles.weekHeaderLabel}>{period.label}</span>;
}

export function WeeklySalesTable({ data, metric, filteredData }: WeeklySalesTableProps) {
  const { rows, totalRow, periods } = data;
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [productDataCache, setProductDataCache] = useState<Map<string, SalesPeriodRow[]>>(new Map());

  // Limpar cache e colapsar quando filtros mudarem
  useEffect(() => {
    setProductDataCache(new Map());
    setExpandedClientId(null);
  }, [filteredData, metric, periods]);

  const handleRowClick = (clientName: string) => {
    if (expandedClientId === clientName) {
      // Colapsar se já está expandido
      setExpandedClientId(null);
    } else {
      // Expandir nova linha
      setExpandedClientId(clientName);
      
      // Calcular dados de produtos se ainda não estiver no cache
      if (!productDataCache.has(clientName)) {
        const productData = computeSalesPeriodProductData(
          filteredData,
          clientName,
          periods,
          metric
        );
        setProductDataCache(new Map(productDataCache.set(clientName, productData)));
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, clientName: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleRowClick(clientName);
    }
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.clientHeader}>Cliente</th>
            {periods.map((period, index) => (
              <th key={index} className={styles.weekHeader}>
                {renderHeaderLabel(period)}
              </th>
            ))}
            <th className={styles.totalHeader}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const isExpanded = expandedClientId === row.entityName;
            const productData = productDataCache.get(row.entityName);
            
            return (
              <>
                <tr 
                  key={index} 
                  className={`${styles.dataRow} ${styles.expandableRow}`}
                  onClick={() => handleRowClick(row.entityName)}
                  onKeyDown={(e) => handleKeyDown(e, row.entityName)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                >
                  <td className={styles.clientCell}>
                    <span className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>
                      ▸
                    </span>
                    {row.entityName}
                  </td>
                  {row.values.map((value, periodIndex) => (
                    <td key={periodIndex} className={styles.valueCell}>
                      {value > 0 ? formatValue(value, metric) : '-'}
                    </td>
                  ))}
                  <td className={styles.totalCell}>
                    {formatValue(row.total, metric)}
                  </td>
                </tr>
                {isExpanded && productData && (
                  <>
                    {productData.map((productRow, prodIndex) => (
                      <tr key={`${index}-product-${prodIndex}`} className={styles.productRow}>
                        <td className={styles.productCell}>
                          {productRow.entityName}
                        </td>
                        {productRow.values.map((value, periodIndex) => (
                          <td key={periodIndex} className={styles.productValueCell}>
                            {value > 0 ? formatValue(value, metric) : '-'}
                          </td>
                        ))}
                        <td className={styles.productTotalCell}>
                          {formatValue(productRow.total, metric)}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
                {isExpanded && !productData && (
                  <tr key={`${index}-loading`} className={styles.loadingRow}>
                    <td colSpan={periods.length + 2} className={styles.loadingCell}>
                      <div className={styles.loadingProducts}>
                        Carregando produtos...
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
          <tr className={styles.totalRow}>
            <td className={styles.totalClientCell}>{totalRow.entityName}</td>
            {totalRow.values.map((value, periodIndex) => (
              <td key={periodIndex} className={styles.totalValueCell}>
                {formatValue(value, metric)}
              </td>
            ))}
            <td className={styles.grandTotalCell}>
              {formatValue(totalRow.total, metric)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

