import type { SalesChartGranularity } from '@/features/sales/types';
import vendasStyles from '@/styles/vendas.module.css';
import weekSalesStyles from '@/styles/week-sales-chart.module.css';

type WeekSalesChartProps = {
  granularity: SalesChartGranularity;
  onGranularityChange: (nextGranularity: SalesChartGranularity) => void;
};

const WEEKLY_BUTTON_LABEL = 'Semanal';
const DAILY_BUTTON_LABEL = 'Diário';

export function WeekSalesChart({ granularity, onGranularityChange }: WeekSalesChartProps) {
  const isWeeklySelected = granularity === 'weekly';
  const weeklyButtonClasses = [
    vendasStyles.chip,
    weekSalesStyles['toggle-button'],
    isWeeklySelected ? weekSalesStyles['toggle-button-active'] : '',
  ].filter(Boolean).join(' ');
  const dailyButtonClasses = [
    vendasStyles.chip,
    weekSalesStyles['toggle-button'],
    !isWeeklySelected ? weekSalesStyles['toggle-button-active'] : '',
  ].filter(Boolean).join(' ');

  const title = isWeeklySelected
    ? 'Vendas por semana (últimas 8)'
    : 'Vendas por dia (últimos 14)';

  return (
    <div className={vendasStyles.card}>
      <div className={weekSalesStyles['chart-card-header']}>
        <div>
          <h3>{title}</h3>
          <p><small>Clique nas barras para filtrar o período</small></p>
        </div>
        <div className={weekSalesStyles['chart-actions']}>
          <button
            type="button"
            className={weeklyButtonClasses}
            onClick={() => onGranularityChange('weekly')}
            aria-pressed={isWeeklySelected}
          >
            {WEEKLY_BUTTON_LABEL}
          </button>
          <button
            type="button"
            className={dailyButtonClasses}
            onClick={() => onGranularityChange('daily')}
            aria-pressed={!isWeeklySelected}
          >
            {DAILY_BUTTON_LABEL}
          </button>
        </div>
      </div>
      <div className={weekSalesStyles['chart-wrapper']}>
        <canvas id="chart-semanas" height="300"></canvas>
      </div>
    </div>
  );
}
