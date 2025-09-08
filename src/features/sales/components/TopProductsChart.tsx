import type { ChartDataStructure, TopItem } from '@/features/sales/types';
import type { ProductSaleRow } from '@/lib/sheets';
import vendasStyles from '@/styles/vendas.module.css';
import { createPeriodDates } from '@/features/common/utils/date';

type Props = {
  chartData: ChartDataStructure | null;
  filteredData: ProductSaleRow[];
  selectedProducts: string[];
  selectedClients: string[];
  meta: { hasPackages: boolean; hasBoxes: boolean; hasCustomerType: boolean } | null;
  periodStart: string;
  periodEnd: string;
  rawData: ProductSaleRow[];
  applyFilters: (data: ProductSaleRow[], startDate: Date, endDate: Date, clients: string[], products: string[]) => void;
  formatK: (n: number) => string;
  setSelectedProducts: (next: string[]) => void;
};

export function TopProductsChart({ chartData, filteredData, selectedProducts, selectedClients, meta, periodStart, periodEnd, rawData, applyFilters, formatK, setSelectedProducts }: Props) {
  return (
    <div className={vendasStyles.card}>
      <h3>Top produtos por valor</h3>
      <p><small>Clique no gráfico para filtrar por produto</small></p>
      <div className={vendasStyles['topcli']}>
        <div className={vendasStyles['chart-donut']}>
          <canvas id="chart-produtos"></canvas>
        </div>
        <ul className={vendasStyles['topcli-legend']}>
          {chartData?.topProdutos?.map((produto: TopItem) => {
            const totalPeriodo = chartData.topProdutos.reduce((sum: number, p: TopItem) => sum + p.valor, 0) || 1;
            const pct = ((produto.valor ?? 0) / totalPeriodo * 100) || 0;

            const quantidadeTotal = produto.quantidadeTotal ?? 0;
            const cmv = produto.cmv ?? 0;
            const precoMedioPorUnidade = quantidadeTotal > 0 ? (produto.valor ?? 0) / quantidadeTotal : 0;
            const custoMedioPorUnidade = quantidadeTotal > 0 ? cmv / quantidadeTotal : 0;

            let isSelected = false;
            if ((produto.produto ?? '') === 'Outros') {
              const produtoMap = new Map<string, number>();
              filteredData.forEach(row => {
                if (row.produto) {
                  produtoMap.set(row.produto, (produtoMap.get(row.produto) || 0) + row.valorTotal);
                }
              });
              const allProdutos = Array.from(produtoMap.entries()).sort(([,a], [,b]) => b - a);
              const outrosProdutos = allProdutos.slice(5).map(([p]) => p);
              isSelected = selectedProducts.length > 0 && selectedProducts.every(p => outrosProdutos.includes(p)) && outrosProdutos.every(p => selectedProducts.includes(p));
            } else {
              isSelected = selectedProducts.length === 1 && selectedProducts[0] === (produto.produto ?? '');
            }

            return (
              <li
                key={produto.produto ?? ''}
                onClick={() => {
                  try {
                    let newSelectedProducts: string[];
                    if ((produto.produto ?? '') === 'Outros') {
                      const produtoMap = new Map<string, number>();
                      filteredData.forEach(row => {
                        if (row.produto) {
                          produtoMap.set(row.produto, (produtoMap.get(row.produto) || 0) + row.valorTotal);
                        }
                      });
                      const allProdutos = Array.from(produtoMap.entries()).sort(([,a], [,b]) => b - a);
                      const outrosProdutos = allProdutos.slice(5).map(([p]) => p);
                      const isFilteringOthers = selectedProducts.length > 0 && selectedProducts.every(p => outrosProdutos.includes(p)) && outrosProdutos.every(p => selectedProducts.includes(p));
                      newSelectedProducts = isFilteringOthers ? [] : outrosProdutos;
                    } else {
                      newSelectedProducts = isSelected ? [] : [produto.produto ?? ''];
                    }
                    setSelectedProducts(newSelectedProducts);
                    const { startDate, endDate } = createPeriodDates(periodStart, periodEnd);
                    applyFilters(rawData, startDate, endDate, selectedClients, newSelectedProducts);
                  } catch (error) {
                    console.error('Erro ao processar filtro de produto:', error);
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
                <span className={vendasStyles.dot} style={{ backgroundColor: produto.cor }}></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text)' }}>{produto.produto ?? ''}</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px' }}>
                      <span className={vendasStyles['preco-medio']} style={{ color: 'var(--accent)', fontWeight: '500' }}>
                        {meta?.hasPackages ? 'PMP' : 'PMV'}: {meta?.hasPackages ? (produto.precoMedioPorPacote ?? 0).toFixed(2) : precoMedioPorUnidade.toFixed(2)}
                      </span>
                      <span className={vendasStyles['custo-medio']} style={{ color: 'var(--accent)', fontWeight: '500' }}>
                        {meta?.hasPackages ? 'CMP' : 'CMV'}: {meta?.hasPackages ? (produto.custoMedioPorPacote ?? 0).toFixed(2) : custoMedioPorUnidade.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{Math.round((produto.valor ?? 0) / 1000)}k ({pct.toFixed(0)}%) • {meta?.hasPackages ? `${formatK(produto.pacotesTotal ?? 0)} pacotes` : `${formatK(quantidadeTotal)} unidades`}</span>
                    <span className={vendasStyles['margem-bruta']} style={{ color: 'var(--accent)', fontWeight: '500' }}>MB: {Math.round(produto.margemBruta ?? 0)}%</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}


