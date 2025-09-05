import type { ChartDataStructure, TopItem } from '@/features/sales/types';
import type { ProductSaleRow } from '@/lib/sheets';
import vendasStyles from '@/styles/vendas.module.css';

type Props = {
  chartData: ChartDataStructure | null;
  filteredData: ProductSaleRow[];
  selectedCustomerTypes: string[];
  periodStart: string;
  periodEnd: string;
  rawData: ProductSaleRow[];
  selectedClients: string[];
  selectedProducts: string[];
  applyFilters: (data: ProductSaleRow[], startDate: Date, endDate: Date, clients: string[], products: string[], customerTypes: string[]) => void;
  setSelectedCustomerTypes: (next: string[]) => void;
};

export function CustomerTypesChart({ chartData, filteredData, selectedCustomerTypes, periodStart, periodEnd, rawData, selectedClients, selectedProducts, applyFilters, setSelectedCustomerTypes }: Props) {
  return (
    <div className={vendasStyles.card}>
      <h3>Distribuição por tipo de cliente</h3>
      <p><small>Clique no gráfico para filtrar por tipo de cliente</small></p>
      {chartData?.topTiposCliente && chartData.topTiposCliente.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px' }}>
          <div className={vendasStyles['chart-donut']} style={{ marginBottom: '20px' }}>
            <canvas id="chart-tipos-cliente"></canvas>
          </div>
          <ul className={vendasStyles['topcli-legend']} style={{ width: '100%' }}>
            {chartData.topTiposCliente.map((tipoCliente: TopItem) => {
              const totalPeriodo = chartData.topTiposCliente.reduce((sum: number, t: TopItem) => sum + t.valor, 0) || 1;
              const pct = ((tipoCliente.valor ?? 0) / totalPeriodo * 100) || 0;

              // Lógica de seleção especial para "Outros"
              let isSelected = false;
              if ((tipoCliente.cliente ?? '') === 'Outros') {
                // Para "Outros", verificar se está filtrando pelos tipos que não estão no Top 5
                const tipoClienteMap = new Map<string, number>();
                filteredData.forEach(row => {
                  if (row.tipoCliente) {
                    tipoClienteMap.set(row.tipoCliente, (tipoClienteMap.get(row.tipoCliente) || 0) + row.valorTotal);
                  }
                });
                const allTiposCliente = Array.from(tipoClienteMap.entries()).sort(([,a], [,b]) => b - a);
                const outrosTiposCliente = allTiposCliente.slice(5).map(([tipoCliente]) => tipoCliente);
                
                isSelected = selectedCustomerTypes.length > 0 && 
                  selectedCustomerTypes.every(tipo => outrosTiposCliente.includes(tipo)) &&
                  outrosTiposCliente.every(tipo => selectedCustomerTypes.includes(tipo));
              } else {
                // Para tipos específicos, verificar se é o único selecionado
                isSelected = selectedCustomerTypes.length === 1 && selectedCustomerTypes[0] === (tipoCliente.cliente ?? '');
              }

              return (
                <li 
                  key={tipoCliente.cliente ?? ''} 
                  onClick={() => {
                    try {
                      let newSelectedCustomerTypes: string[];
                      
                      // Tratamento especial para "Outros"
                      if ((tipoCliente.cliente ?? '') === 'Outros') {
                        // Obter lista de todos os tipos que não estão no Top 5
                        const tipoClienteMap = new Map<string, number>();
                        filteredData.forEach(row => {
                          if (row.tipoCliente) {
                            tipoClienteMap.set(row.tipoCliente, (tipoClienteMap.get(row.tipoCliente) || 0) + row.valorTotal);
                          }
                        });
                        
                        const allTiposCliente = Array.from(tipoClienteMap.entries()).sort(([,a], [,b]) => b - a);
                        const outrosTiposCliente = allTiposCliente.slice(5).map(([tipoCliente]) => tipoCliente);
                        
                        // Verificar se já está filtrando por "Outros"
                        const isFilteringOthers = selectedCustomerTypes.length > 0 && 
                          selectedCustomerTypes.every(tipo => outrosTiposCliente.includes(tipo)) &&
                          outrosTiposCliente.every(tipo => selectedCustomerTypes.includes(tipo));
                        
                        if (isFilteringOthers) {
                          // Se já está filtrando por "Outros", limpar filtro
                          newSelectedCustomerTypes = [];
                        } else {
                          // Filtrar por todos os tipos "Outros"
                          newSelectedCustomerTypes = outrosTiposCliente;
                        }
                      } else {
                        // Comportamento normal para tipos específicos
                        if (isSelected) {
                          // Se já está selecionado, limpar filtro
                          newSelectedCustomerTypes = [];
                        } else {
                          // Selecionar apenas o tipo clicado
                          newSelectedCustomerTypes = [tipoCliente.cliente ?? ''];
                        }
                      }
                      
                      // Atualizar estado
                      setSelectedCustomerTypes(newSelectedCustomerTypes);
                      
                      // Reaplicar filtros
                      const startDate = new Date(periodStart);
                      const endDate = new Date(periodEnd);
                      applyFilters(rawData, startDate, endDate, selectedClients, selectedProducts, newSelectedCustomerTypes);
                      
                    } catch (error) {
                      console.error('Erro ao processar filtro de tipo de cliente:', error);
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
                  <span className={vendasStyles.dot} style={{ backgroundColor: tipoCliente.cor }}></span>
                  <span>{tipoCliente.cliente ?? ''}</span>
                  <span>{Math.round((tipoCliente.valor ?? 0) / 1000)}k ({pct.toFixed(0)}%)</span>
                  <span className={vendasStyles['margem-bruta']}>MB: {Math.round(tipoCliente.margemBruta ?? 0)}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', color: 'var(--muted)', fontSize: '14px', textAlign: 'center' }}>
          <div>
            <p>Nenhum dado de tipo de cliente encontrado</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>Verifique se a coluna está mapeada corretamente</p>
          </div>
        </div>
      )}
    </div>
  );
}


