import { useState } from 'react';
import { useTableSort } from '@/features/shared/hooks/useTableSort';
import vendasStyles from '@/styles/vendas.module.css';

export type ModalData = Record<string, unknown>;

type Props = {
  show: boolean;
  title: string;
  rows: ModalData[];
  columns: Array<{
    key: string;
    label: string;
    sortable?: boolean;
    formatter?: (value: unknown) => string;
  }>;
  closeAllModals: () => void;
  onExport?: () => void;
};

export function DetailsModal({ show, title, rows, columns, closeAllModals, onExport }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  
  // Configurar ordenação padrão baseada na primeira coluna numérica encontrada
  const defaultSortColumn = columns.find(col => col.sortable && typeof rows[0]?.[col.key] === 'number')?.key || columns[0]?.key;
  const { sortedData, handleSort, getSortIcon } = useTableSort(rows, { key: defaultSortColumn, direction: 'desc' });

  const handleExport = async () => {
    if (!onExport) return;
    
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
              {onExport && (
                <button
                  className={`${vendasStyles.btn} ${vendasStyles.btnPrimary}`}
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  {isExporting ? 'Gerando...' : 'Excel'}
                </button>
              )}
              <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={closeAllModals}>Fechar</button>
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
                {sortedData.map((item: ModalData, index: number) => (
                  <tr key={index}>
                    {columns.map((column) => {
                      const value = item[column.key];
                      const formattedValue = column.formatter ? column.formatter(value) : String(value ?? '-');
                      return (
                        <td key={column.key} className={typeof value === 'number' ? vendasStyles.amount : ''}>
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