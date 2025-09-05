import type { ModalData } from '@/features/sales/types';
import vendasStyles from '@/styles/vendas.module.css';

type Props = {
  show: boolean;
  title: string;
  rows: ModalData[];
  meta: { hasPackages: boolean; hasBoxes: boolean; hasCustomerType: boolean } | null;
  formatK: (n: number) => string;
  onClose: () => void;
};

export function DetailsModal({ show, title, rows, meta, formatK, onClose }: Props) {
  if (!show) return null;
  return (
    <>
      <div className={vendasStyles['modal-overlay']} onClick={onClose}></div>
      <div className={vendasStyles.modal}>
        <div className={vendasStyles['modal-card']}>
          <div className={vendasStyles['modal-head']}>
            <h4>{title}</h4>
            <button className={`${vendasStyles.btn} ${vendasStyles.btnGhost}`} onClick={onClose}>Fechar</button>
          </div>
          <div className={vendasStyles['table-scroll']} style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className={vendasStyles['modal-table']}>
              <thead>
                <tr>
                  <th>{(rows && rows[0] && 'produto' in rows[0]) ? 'Produto' : 'Cliente'}</th>
                  <th>Unidades</th>
                  {meta?.hasPackages && <th>Pacotes</th>}
                  {meta?.hasBoxes && <th>Caixas</th>}
                  <th>Valor</th>
                  <th>Margem Bruta</th>
                  <th>{meta?.hasPackages ? 'PMP' : 'PMV'}</th>
                  <th>{meta?.hasPackages ? 'CMP' : 'CMV'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item: ModalData, index: number) => {
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


