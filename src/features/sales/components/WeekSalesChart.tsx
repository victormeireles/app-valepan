import vendasStyles from '@/styles/vendas.module.css';

export function WeekSalesChart() {
  return (
    <div className={vendasStyles.card}>
      <h3>Vendas por semana (últimas 8)</h3>
      <p><small>Clique nas barras para filtrar o período</small></p>
      <div style={{height: '300px', position: 'relative', overflow: 'hidden'}}>
        <canvas id="chart-semanas" height="300"></canvas>
      </div>
    </div>
  );
}
