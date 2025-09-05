import { useState } from 'react';
import type { ModalData } from '@/features/sales/types';
import { useTableSort } from '@/features/sales/hooks/useTableSort';
import { useExcelExport } from '@/features/sales/hooks/useExcelExport';
import { DownloadButton } from '@/features/sales/components/DownloadButton';
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
        meta
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
          <div className={vendasStyles['table-scroll']} style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className={vendasStyles['modal-table']}>
              <thead>
                <tr>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort((rows && rows[0] && 'produto' in rows[0]) ? 'produto' : 'cliente')}
                  >
                    <span>{(rows && rows[0] && 'produto' in rows[0]) ? 'Produto' : 'Cliente'}</span>
                    <span>{getSortIcon((rows && rows[0] && 'produto' in rows[0]) ? 'produto' : 'cliente')}</span>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('unidades')}
                  >
                    <span>Unidades</span>
                    <span>{getSortIcon('unidades')}</span>
                  </th>
                  {meta?.hasPackages && (
                    <th 
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('pacotes')}
                    >
                      <span>Pacotes</span>
                      <span>{getSortIcon('pacotes')}</span>
                    </th>
                  )}
                  {meta?.hasBoxes && (
                    <th 
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('caixas')}
                    >
                      <span>Caixas</span>
                      <span>{getSortIcon('caixas')}</span>
                    </th>
                  )}
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('valor')}
                  >
                    <span>Valor</span>
                    <span>{getSortIcon('valor')}</span>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('mb')}
                  >
                    <span>Margem Bruta</span>
                    <span>{getSortIcon('mb')}</span>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort(meta?.hasPackages ? 'pmp' : 'pmv')}
                  >
                    <span>{meta?.hasPackages ? 'PMP' : 'PMV'}</span>
                    <span>{getSortIcon(meta?.hasPackages ? 'pmp' : 'pmv')}</span>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort(meta?.hasPackages ? 'cmp' : 'cmv')}
                  >
                    <span>{meta?.hasPackages ? 'CMP' : 'CMV'}</span>
                    <span>{getSortIcon(meta?.hasPackages ? 'cmp' : 'cmv')}</span>
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


