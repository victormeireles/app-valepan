'use client';

import { useState, useEffect } from 'react';
import styles from '@/styles/weekly-sales-table.module.css';
import { formatK } from '@/lib/sheets';
import type { WeeklySalesTableData, MetricType, WeeklySalesRow } from '@/features/sales/types';
import { computeWeeklySalesProductData } from '@/features/sales/hooks/useWeeklySalesProductData';
import type { ProductSaleRow } from '@/lib/sheets';

interface WeeklySalesTableProps {
  data: WeeklySalesTableData;
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

export function WeeklySalesTable({ data, metric, filteredData }: WeeklySalesTableProps) {
  const { rows, totalRow, weeks } = data;
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [productDataCache, setProductDataCache] = useState<Map<string, WeeklySalesRow[]>>(new Map());

  // Limpar cache e colapsar quando filtros mudarem
  useEffect(() => {
    setProductDataCache(new Map());
    setExpandedClientId(null);
  }, [filteredData, metric]);

  const handleRowClick = (clientName: string) => {
    if (expandedClientId === clientName) {
      // Colapsar se já está expandido
      setExpandedClientId(null);
    } else {
      // Expandir nova linha
      setExpandedClientId(clientName);
      
      // Calcular dados de produtos se ainda não estiver no cache
      if (!productDataCache.has(clientName)) {
        const productData = computeWeeklySalesProductData(
          filteredData,
          clientName,
          weeks,
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
            {weeks.map((week, index) => (
              <th key={index} className={styles.weekHeader}>
                {week.label}
              </th>
            ))}
            <th className={styles.totalHeader}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const isExpanded = expandedClientId === row.cliente;
            const productData = productDataCache.get(row.cliente);
            
            return (
              <>
                <tr 
                  key={index} 
                  className={`${styles.dataRow} ${styles.expandableRow}`}
                  onClick={() => handleRowClick(row.cliente)}
                  onKeyDown={(e) => handleKeyDown(e, row.cliente)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                >
                  <td className={styles.clientCell}>
                    <span className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>
                      ▸
                    </span>
                    {row.cliente}
                  </td>
                  {row.weekValues.map((value, weekIndex) => (
                    <td key={weekIndex} className={styles.valueCell}>
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
                          {productRow.cliente}
                        </td>
                        {productRow.weekValues.map((value, weekIndex) => (
                          <td key={weekIndex} className={styles.productValueCell}>
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
                    <td colSpan={weeks.length + 2} className={styles.loadingCell}>
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
            <td className={styles.totalClientCell}>{totalRow.cliente}</td>
            {totalRow.weekValues.map((value, weekIndex) => (
              <td key={weekIndex} className={styles.totalValueCell}>
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

