import { useState } from 'react';
import { useTableSort } from '@/features/shared/hooks/useTableSort';
import { useExcelExport } from '@/features/shared/hooks/useExcelExport';
import { DownloadButton } from '@/features/shared/components/DownloadButton';
import vendasStyles from '@/styles/vendas.module.css';

export type UnifiedModalData = Record<string, unknown>;

export type ColumnConfig = {
  key: string;
  label: string;
  sortable?: boolean;
  formatter?: (value: unknown) => string;
  type?: 'text' | 'number' | 'currency' | 'percentage' | 'date';
};

export type UnifiedModalProps = {
  show: boolean;
  title: string;
  rows: UnifiedModalData[];
  columns: ColumnConfig[];
  closeAllModals: () => void;
  onExport?: () => void;
  defaultSortKey?: string;
  defaultSortDirection?: 'asc' | 'desc';
};

export function UnifiedDetailsModal({ 
  show, 
  title, 
  rows, 
  columns, 
  closeAllModals, 
  onExport,
  defaultSortKey,
  defaultSortDirection = 'desc'
}: UnifiedModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  
  // Configurar ordenação padrão
  const sortKey = defaultSortKey || columns.find(col => col.sortable && col.type === 'number')?.key || columns[0]?.key;
  const { sortedData, handleSort, getSortIcon } = useTableSort(rows, { key: sortKey, direction: defaultSortDirection });
  const { exportToExcel } = useExcelExport();

  const handleExport = async () => {
    if (onExport) {
      setIsExporting(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simular delay para UX
        onExport();
      } catch (error) {
        console.error('Erro ao exportar:', error);
        alert('Erro ao exportar arquivo Excel');
      } finally {
        setIsExporting(false);
      }
    } else {
      // Exportação automática usando as colunas configuradas
      setIsExporting(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        exportToExcel(sortedData, {
          filename: title.replace(/\s+/g, '_'),
          sheetName: 'Dados',
          columns: columns.map(col => ({
            key: col.key,
            label: col.label,
            sortable: col.sortable || false,
            formatter: col.formatter || ((v) => String(v))
          }))
        });
      } catch (error) {
        console.error('Erro ao exportar:', error);
        alert('Erro ao exportar arquivo Excel');
      } finally {
        setIsExporting(false);
      }
    }
  };

  const formatValue = (value: unknown, column: ColumnConfig) => {
    if (column.formatter) {
      return column.formatter(value);
    }

    if (value == null) return '-';

    switch (column.type) {
      case 'currency':
        return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      case 'percentage':
        return `${Number(value).toFixed(1)}%`;
      case 'number':
        return Number(value).toLocaleString('pt-BR');
      case 'date':
        return value instanceof Date ? value.toLocaleDateString('pt-BR') : String(value);
      default:
        return String(value);
    }
  };

  if (!show) return null;
  
  return (
    <>
      <div className={vendasStyles['modal-overlay']} onClick={closeAllModals}></div>
      <div className={vendasStyles.modal} data-modal-content>
        <div className={vendasStyles['modal-card']}>
          <div className={vendasStyles['modal-head']}>
            <h4>{title}</h4>
            <div className={vendasStyles['modal-header-actions']}>
              <DownloadButton
                onClick={handleExport}
                loading={isExporting}
                size="sm"
                variant="primary"
              />
              <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={closeAllModals}>
                Fechar
              </button>
            </div>
          </div>
          <div className={vendasStyles['table-scroll']}>
            <table className={vendasStyles['modal-table']}>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th 
                      key={column.key}
                      style={{ cursor: column.sortable ? 'pointer' : 'default', userSelect: 'none' }}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className={vendasStyles['header-content']}>
                        <span className={vendasStyles['header-text']}>{column.label}</span>
                        {column.sortable && (
                          <span className={vendasStyles['sort-icon']}>{getSortIcon(column.key)}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item: UnifiedModalData, index: number) => (
                  <tr key={index}>
                    {columns.map((column) => {
                      const value = item[column.key];
                      const formattedValue = formatValue(value, column);
                      const isNumeric = column.type === 'number' || column.type === 'currency' || column.type === 'percentage';
                      
                      return (
                        <td key={column.key} className={isNumeric ? vendasStyles.amount : ''}>
                          {formattedValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
