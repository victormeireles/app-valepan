import { useState } from 'react';
import type { ModalData } from '@/features/sales/types';
import { useTableSort } from '@/features/shared/hooks/useTableSort';
import { useExcelExport } from '@/features/shared/hooks/useExcelExport';
import { DownloadButton } from '@/features/shared/components/DownloadButton';
import vendasStyles from '@/styles/vendas.module.css';

type Props = {
  show: boolean;
  title: string;
  rows: ModalData[];
  meta: { hasPackages: boolean; hasBoxes: boolean; hasCustomerType: boolean } | null;
  formatK: (n: number) => string;
  closeAllModals: () => void;
};

export function DetailsModal({ show, title, rows, meta, formatK, closeAllModals }: Props) {
  const { sortedData, handleSort, getSortIcon } = useTableSort(rows, { key: 'valor', direction: 'desc' });
  const { exportToExcel } = useExcelExport();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simular delay para UX
      exportToExcel(sortedData, {
        filename: title.replace(/\s+/g, '_'),
        sheetName: 'Dados',
        columns: [
          { key: 'produto', label: 'Produto', sortable: true },
          { key: 'unidades', label: 'Unidades', sortable: true, formatter: (v) => String(v) },
          { key: 'valor', label: 'Valor', sortable: true, formatter: (v) => String(v) }
        ]
      });
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
              <DownloadButton
                onClick={handleExport}
                loading={isExporting}
                size="sm"
                variant="primary"
              />
              <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={closeAllModals}>Fechar</button>
            </div>
          </div>
          <div className={vendasStyles['table-scroll']}>
            <table className={vendasStyles['modal-table']}>
              <thead>
                <tr>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort((rows && rows[0] && 'produto' in rows[0]) ? 'produto' : 'cliente')}
                  >
                    <div className={vendasStyles['header-content']}>
                      <span className={vendasStyles['header-text']}>{(rows && rows[0] && 'produto' in rows[0]) ? 'Produto' : 'Cliente'}</span>
                      <span className={vendasStyles['sort-icon']}>{getSortIcon((rows && rows[0] && 'produto' in rows[0]) ? 'produto' : 'cliente')}</span>
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('unidades')}
                  >
                    <div className={vendasStyles['header-content']}>
                      <span className={vendasStyles['header-text']}>Unidades</span>
                      <span className={vendasStyles['sort-icon']}>{getSortIcon('unidades')}</span>
                    </div>
                  </th>
                  {meta?.hasPackages && (
                    <th 
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('pacotes')}
                    >
                      <div className={vendasStyles['header-content']}>
                        <span className={vendasStyles['header-text']}>Pacotes</span>
                        <span className={vendasStyles['sort-icon']}>{getSortIcon('pacotes')}</span>
                      </div>
                    </th>
                  )}
                  {meta?.hasBoxes && (
                    <th 
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('caixas')}
                    >
                      <div className={vendasStyles['header-content']}>
                        <span className={vendasStyles['header-text']}>Caixas</span>
                        <span className={vendasStyles['sort-icon']}>{getSortIcon('caixas')}</span>
                      </div>
                    </th>
                  )}
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('valor')}
                  >
                    <div className={vendasStyles['header-content']}>
                      <span className={vendasStyles['header-text']}>Valor</span>
                      <span className={vendasStyles['sort-icon']}>{getSortIcon('valor')}</span>
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('mb')}
                  >
                    <div className={vendasStyles['header-content']}>
                      <span className={vendasStyles['header-text']}>Margem Bruta</span>
                      <span className={vendasStyles['sort-icon']}>{getSortIcon('mb')}</span>
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort(meta?.hasPackages ? 'pmp' : 'pmv')}
                  >
                    <div className={vendasStyles['header-content']}>
                      <span className={vendasStyles['header-text']}>{meta?.hasPackages ? 'PMP' : 'PMV'}</span>
                      <span className={vendasStyles['sort-icon']}>{getSortIcon(meta?.hasPackages ? 'pmp' : 'pmv')}</span>
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort(meta?.hasPackages ? 'cmp' : 'cmv')}
                  >
                    <div className={vendasStyles['header-content']}>
                      <span className={vendasStyles['header-text']}>{meta?.hasPackages ? 'CMP' : 'CMV'}</span>
                      <span className={vendasStyles['sort-icon']}>{getSortIcon(meta?.hasPackages ? 'cmp' : 'cmv')}</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item: ModalData, index: number) => {
                  const key = (item as { produto?: string; cliente?: string }).produto ?? (item as { cliente?: string }).cliente ?? '-';
                  const unidades = (item as { unidades?: number }).unidades ?? 0;
                  const pacotes = (item as { pacotes?: number }).pacotes ?? 0;
                  const caixas = (item as { caixas?: number }).caixas ?? 0;
                  const valor = (item as { valor?: number }).valor ?? 0;
                  const mb = typeof (item as { mb?: number }).mb === 'number' ? Math.round((item as { mb?: number }).mb ?? 0) : 0;
                  const pmp = meta?.hasPackages ? ((item as { pmp?: number }).pmp ?? 0) : (unidades > 0 ? valor / unidades : 0);
                  const cmp = meta?.hasPackages ? ((item as { cmp?: number }).cmp ?? 0) : (unidades > 0 ? ((item as { cmv?: number }).cmv ?? 0) / unidades : 0);
                  return (
                    <tr key={index}>
                      <td>{key}</td>
                      <td className={vendasStyles.amount}>{unidades.toLocaleString('pt-BR')}</td>
                      {meta?.hasPackages && <td className={vendasStyles.amount}>{formatK(pacotes)}</td>}
                      {meta?.hasBoxes && <td className={vendasStyles.amount}>{caixas.toLocaleString('pt-BR')}</td>}
                      <td className={vendasStyles.amount}>{valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className={vendasStyles.amount}>{mb}%</td>
                      <td className={vendasStyles.amount}>{pmp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className={vendasStyles.amount}>{cmp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}


