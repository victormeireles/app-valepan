import vendasStyles from '@/styles/vendas.module.css';
import Tooltip from '@/components/Tooltip';

export type KPICard = {
  title: string;
  value: string;
  variation?: number;
  variationLabel?: string;
  tooltip?: string;
  icon?: string;
  color?: string;
  formatVariation?: (v: number, isInteger?: boolean, isPercentagePoints?: boolean) => string;
};

type Props = {
  kpis: KPICard[];
};

export function KPISection({ kpis }: Props) {
  return (
    <section className={vendasStyles.kpis}>
      {kpis.map((kpi, index) => (
        <div key={index} className={vendasStyles.kpi}>
          <div className={vendasStyles['kpi-label']}>
            {kpi.title}
            {kpi.tooltip && (
              <Tooltip content={kpi.tooltip} position="top">
                <span className={vendasStyles['kpi-info-icon']}>ⓘ</span>
              </Tooltip>
            )}
          </div>
          <div className={vendasStyles['kpi-value']} style={{ color: kpi.color }}>
            {kpi.value}
          </div>
          {kpi.variation !== undefined && (
            <div className={`${vendasStyles['kpi-sub']} ${kpi.variation >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
              {kpi.variationLabel && `${kpi.variationLabel}: `}
              {kpi.formatVariation ? kpi.formatVariation(kpi.variation) : `${kpi.variation > 0 ? '+' : ''}${kpi.variation.toFixed(1)}%`}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
