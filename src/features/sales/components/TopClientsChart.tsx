import type { ChartDataStructure, TopItem } from '@/features/sales/types';
import type { ProductSaleRow } from '@/lib/sheets';
import vendasStyles from '@/styles/vendas.module.css';

type Props = {
  chartData: ChartDataStructure | null;
  filteredData: ProductSaleRow[];
  selectedClients: string[];
  periodStart: string;
  periodEnd: string;
  rawData: ProductSaleRow[];
  selectedProducts: string[];
  applyFilters: (data: ProductSaleRow[], startDate: Date, endDate: Date, clients: string[], products: string[]) => void;
  setSelectedClients: (next: string[]) => void;
};

export function TopClientsChart({ chartData, filteredData, selectedClients, periodStart, periodEnd, rawData, selectedProducts, applyFilters, setSelectedClients }: Props) {
  return (
    <div className={vendasStyles.card}>
      <h3>Top clientes por valor</h3>
      <p><small>Clique no gráfico para filtrar por cliente</small></p>
      <div className={vendasStyles.topcli}>
        <div className={vendasStyles['chart-donut']}>
          <canvas id="chart-clientes"></canvas>
        </div>
        <ul className={vendasStyles['topcli-legend']}>
          {chartData?.topClientes.map((cliente: TopItem) => {
            const totalPeriodo = chartData.topClientes.reduce((sum: number, c: TopItem) => sum + c.valor, 0) || 1;
            const pct = ((cliente.valor ?? 0) / totalPeriodo * 100) || 0;

            let isSelected = false;
            if ((cliente.cliente ?? '') === 'Outros') {
              const clienteMap = new Map<string, number>();
              filteredData.forEach(row => {
                clienteMap.set(row.cliente, (clienteMap.get(row.cliente) || 0) + row.valorTotal);
              });
              const allClientes = Array.from(clienteMap.entries()).sort(([,a], [,b]) => b - a);
              const outrosClients = allClientes.slice(5).map(([c]) => c);
              isSelected = selectedClients.length > 0 && selectedClients.every(c => outrosClients.includes(c)) && outrosClients.every(c => selectedClients.includes(c));
            } else {
              isSelected = selectedClients.length === 1 && selectedClients[0] === (cliente.cliente ?? '');
            }

            return (
              <li
                key={cliente.cliente ?? ''}
                onClick={() => {
                  try {
                    let newSelectedClients: string[];
                    if ((cliente.cliente ?? '') === 'Outros') {
                      const clienteMap = new Map<string, number>();
                      filteredData.forEach(row => {
                        clienteMap.set(row.cliente, (clienteMap.get(row.cliente) || 0) + row.valorTotal);
                      });
                      const allClientes = Array.from(clienteMap.entries()).sort(([,a], [,b]) => b - a);
                      const outrosClients = allClientes.slice(5).map(([c]) => c);
                      const isFilteringOthers = selectedClients.length > 0 && selectedClients.every(c => outrosClients.includes(c)) && outrosClients.every(c => selectedClients.includes(c));
                      newSelectedClients = isFilteringOthers ? [] : outrosClients;
                    } else {
                      newSelectedClients = isSelected ? [] : [cliente.cliente ?? ''];
                    }

                    setSelectedClients(newSelectedClients);
                    const startDate = new Date(periodStart);
                    const endDate = new Date(periodEnd);
                    applyFilters(rawData, startDate, endDate, newSelectedClients, selectedProducts);
                  } catch (error) {
                    console.error('Erro ao processar filtro de cliente:', error);
                  }
                }}
                style={{
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(230,126,34,.2)' : 'rgba(255,255,255,.04)',
                  border: isSelected ? '1px solid rgba(230,126,34,.4)' : '1px solid rgba(255,255,255,.06)',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all 0.15s ease'
                }}
              >
                <span className={vendasStyles.dot} style={{ backgroundColor: cliente.cor }}></span>
                <span>{cliente.cliente ?? ''}</span>
                <span>{Math.round((cliente.valor ?? 0) / 1000)}k ({pct.toFixed(0)}%)</span>
                <span className={vendasStyles['margem-bruta']}>MB: {cliente.margemBruta ?? 0}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}


