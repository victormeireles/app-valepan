import type { ChartDataStructure, TopItem } from '@/features/sales/types';
import vendasStyles from '@/styles/vendas.module.css';

type Props = {
  chartData: ChartDataStructure | null;
};

export function CustomerTypesChart({ chartData }: Props) {
  return (
    <div className={vendasStyles.card}>
      <h3>Distribuição por tipo de cliente</h3>
      <p><small>Distribuição de vendas por tipo de cliente</small></p>
      {chartData?.topTiposCliente && chartData.topTiposCliente.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px' }}>
          <div className={vendasStyles['chart-donut']} style={{ marginBottom: '20px' }}>
            <canvas id="chart-tipos-cliente"></canvas>
          </div>
          <ul className={vendasStyles['topcli-legend']} style={{ width: '100%' }}>
            {chartData.topTiposCliente.map((tipoCliente: TopItem) => {
              const totalPeriodo = chartData.topTiposCliente.reduce((sum: number, t: TopItem) => sum + t.valor, 0) || 1;
              const pct = ((tipoCliente.valor ?? 0) / totalPeriodo * 100) || 0;
              return (
                <li key={tipoCliente.cliente ?? ''} style={{ cursor: 'default', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', transition: 'all 0.15s ease' }}>
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


