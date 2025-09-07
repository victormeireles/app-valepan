import type { ChartDataStructure } from '@/features/sales/types';
import vendasStyles from '@/styles/vendas.module.css';

type Props = {
  chartData: ChartDataStructure | null;
};

export function EngagementChart({ }: Props) {
  return (
    <div className={vendasStyles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3>Engajamento de clientes</h3>
      </div>
      <div className={vendasStyles['eng-visual']} style={{ height: '280px', position: 'relative', overflow: 'hidden' }}>
        <canvas id="chart-eng" height="280"></canvas>
      </div>
    </div>
  );
}


