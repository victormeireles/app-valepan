import type { ModalData } from '@/features/sales/types';
import type { ProductSaleRow } from '@/lib/sheets';
import vendasStyles from '@/styles/vendas.module.css';

type Props = {
  filteredData: ProductSaleRow[];
  selectCliente: string;
  setSelectCliente: (v: string) => void;
  showClientPicker: boolean;
  setShowClientPicker: (v: boolean) => void;
  clientPickerQuery: string;
  setClientPickerQuery: (v: string) => void;
  clientPickerTemp: string;
  setClientPickerTemp: (v: string) => void;
  setModalTitle: (v: string) => void;
  setModalData: (rows: ModalData[]) => void;
  setShowModal: (v: boolean) => void;
  closeAllModals: () => void;
};

export function ProductsByClientTable(props: Props) {
  const {
    filteredData,
    selectCliente,
    setSelectCliente,
    showClientPicker,
    setShowClientPicker,
    clientPickerQuery,
    setClientPickerQuery,
    clientPickerTemp,
    setClientPickerTemp,
    setModalTitle,
    setModalData,
    setShowModal,
    closeAllModals,
  } = props;

  return (
    <div className={vendasStyles.card}>
      <div className={vendasStyles['table-head']} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h3>Produtos desse cliente</h3>
        <p><small>Selecione um cliente para ver seus produtos</small></p>
        <div style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className={vendasStyles.chip} data-filter-button onClick={() => { setShowClientPicker(!showClientPicker); setClientPickerTemp(selectCliente); }}>
            {selectCliente || 'Selecionar cliente'}
          </button>
          {showClientPicker && (
            <>
              <div className={vendasStyles['modal-overlay']} onClick={closeAllModals}></div>
              <div className={vendasStyles['period-panel']} style={{ right: 0, bottom: 54, top: 'auto' }} data-modal-content>
                <div className={vendasStyles['period-row']}>
                  <label>Buscar</label>
                  <input type="text" placeholder="Digite para filtrar" value={clientPickerQuery} onChange={(e) => setClientPickerQuery(e.target.value)} />
                </div>
                <div className={vendasStyles['table-scroll']} style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <ul style={{ listStyle: 'none', margin: 0, padding: '6px 8px', display: 'grid', gap: '6px' }}>
                    {Array.from(new Set(filteredData.map(r => r.cliente)))
                      .filter(c => !clientPickerQuery || c.toLowerCase().includes(clientPickerQuery.toLowerCase()))
                      .sort()
                      .map(c => (
                        <li key={c}>
                          <button
                            className={`${vendasStyles.chip} ${clientPickerTemp === c ? vendasStyles.active : ''}`}
                            style={{ width: '100%', justifyContent: 'flex-start' }}
                            onClick={() => {
                              setSelectCliente(c);
                              setShowClientPicker(false);
                              const linhas = filteredData.filter(r => r.cliente === c);
                              const map = new Map<string, { unidades: number; pacotes: number; caixas: number; valor: number; cmv: number }>();
                              for (const r of linhas) {
                                const k = r.produto || '-';
                                const cur = map.get(k) || { unidades: 0, pacotes: 0, caixas: 0, valor: 0, cmv: 0 };
                                cur.unidades += r.quantidade || 0;
                                cur.pacotes += r.pacotes || 0;
                                cur.caixas += r.caixas || 0;
                                cur.valor += r.valorTotal || 0;
                                cur.cmv += r.custoTotal || 0;
                                map.set(k, cur);
                              }
                              const rows = Array.from(map.entries()).map(([k, v]) => {
                                const mb = v.valor > 0 ? Math.max(-100, Math.min(100, (1 - v.cmv / v.valor) * 100)) : 0;
                                const pmp = v.pacotes > 0 ? v.valor / v.pacotes : 0;
                                const cmp = v.pacotes > 0 ? v.cmv / v.pacotes : 0;
                                return { produto: k, ...v, mb, pmp, cmp } as ModalData;
                              });
                              setModalTitle(`Produtos de ${c}`);
                              setModalData(rows);
                              setShowModal(true);
                            }}
                          >
                            {c}
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


