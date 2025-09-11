import type { KpisData } from '@/features/sales/types';
import vendasStyles from '@/styles/vendas.module.css';
import tooltipStyles from '@/styles/tooltip.module.css';
import Tooltip from '@/components/Tooltip';
import { 
  formatCurrency, 
  formatPercentage, 
  formatNumber as formatNumberTooltip, 
  formatDateRange, 
  formatYearDateRange, 
  formatTicket 
} from '@/features/sales/utils/tooltipFormatters';

type Props = {
  kpis: KpisData;
  meta: { hasPackages: boolean; hasBoxes: boolean; hasCustomerType: boolean } | null;
  formatK: (n: number) => string;
  formatNumber: (n: number, suffix?: string) => string;
  formatVariation: (v: number, isInteger?: boolean, isPercentagePoints?: boolean) => string;
};

export function SalesKPISection({ kpis, meta, formatK, formatNumber, formatVariation }: Props) {
  // Funções para gerar conteúdo dos tooltips
  const getFaturamentoTooltip = () => (
    <div className={tooltipStyles.tooltipContent}>
      <div className={tooltipStyles.tooltipSection}>
        <div className={tooltipStyles.tooltipSectionTitle}>Período Atual</div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Período:</span>
          <span className={tooltipStyles.tooltipValue}>{formatDateRange(kpis.currentPeriod.start, kpis.currentPeriod.end)}</span>
        </div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Faturamento:</span>
          <span className={tooltipStyles.tooltipValue}>R$ {formatCurrency(kpis.faturamento.valor)}</span>
        </div>
      </div>
      <div className={tooltipStyles.tooltipSection}>
        <div className={tooltipStyles.tooltipSectionTitle}>Período Anterior</div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Período:</span>
          <span className={tooltipStyles.tooltipValue}>{formatDateRange(kpis.previousPeriod.start, kpis.previousPeriod.end)}</span>
        </div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Faturamento:</span>
          <span className={tooltipStyles.tooltipValue}>R$ {formatCurrency(kpis.previousValues.faturamento)}</span>
        </div>
      </div>
      {kpis.showProjection && (
        <div className={tooltipStyles.tooltipSection}>
          <div className={tooltipStyles.tooltipRow}>
            <span className={tooltipStyles.tooltipLabel}>Projeção de Faturamento:</span>
            <span className={tooltipStyles.tooltipValue}>R$ {formatCurrency(kpis.faturamento.projecao ?? 0)}</span>
          </div>
        </div>
      )}
    </div>
  );

  const getMargemBrutaTooltip = () => (
    <div className={tooltipStyles.tooltipContent}>
      <div className={tooltipStyles.tooltipSection}>
        <div className={tooltipStyles.tooltipSectionTitle}>Período Atual</div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Período:</span>
          <span className={tooltipStyles.tooltipValue}>{formatDateRange(kpis.currentPeriod.start, kpis.currentPeriod.end)}</span>
        </div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Margem bruta:</span>
          <span className={tooltipStyles.tooltipValue}>{formatPercentage(kpis.margemBruta.valor)}</span>
        </div>
      </div>
      <div className={tooltipStyles.tooltipSection}>
        <div className={tooltipStyles.tooltipSectionTitle}>Período Anterior</div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Período:</span>
          <span className={tooltipStyles.tooltipValue}>{formatDateRange(kpis.previousPeriod.start, kpis.previousPeriod.end)}</span>
        </div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Margem bruta:</span>
          <span className={tooltipStyles.tooltipValue}>{formatPercentage(kpis.previousValues.margemBruta)}</span>
        </div>
      </div>
    </div>
  );

  const getPedidosTooltip = () => (
    <div className={tooltipStyles.tooltipContent}>
      <div className={tooltipStyles.tooltipSection}>
        <div className={tooltipStyles.tooltipSectionTitle}>Período Atual</div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Período:</span>
          <span className={tooltipStyles.tooltipValue}>{formatDateRange(kpis.currentPeriod.start, kpis.currentPeriod.end)}</span>
        </div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Pedidos:</span>
          <span className={tooltipStyles.tooltipValue}>{formatNumberTooltip(kpis.pedidos.valor)}</span>
        </div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Ticket Médio:</span>
          <span className={tooltipStyles.tooltipValue}>{formatTicket(kpis.ticketMedio.valor)}</span>
        </div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Clientes:</span>
          <span className={tooltipStyles.tooltipValue}>{formatNumberTooltip(kpis.clientesUnicos.valor)}</span>
        </div>
      </div>
      <div className={tooltipStyles.tooltipSection}>
        <div className={tooltipStyles.tooltipSectionTitle}>Período Anterior</div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Período:</span>
          <span className={tooltipStyles.tooltipValue}>{formatDateRange(kpis.previousPeriod.start, kpis.previousPeriod.end)}</span>
        </div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Pedidos:</span>
          <span className={tooltipStyles.tooltipValue}>{formatNumberTooltip(kpis.previousValues.pedidos)}</span>
        </div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Ticket Médio:</span>
          <span className={tooltipStyles.tooltipValue}>{formatTicket(kpis.previousValues.ticketMedio)}</span>
        </div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Clientes:</span>
          <span className={tooltipStyles.tooltipValue}>{formatNumberTooltip(kpis.previousValues.clientes)}</span>
        </div>
      </div>
    </div>
  );

  const getUnidadesTooltip = () => (
    <div className={tooltipStyles.tooltipContent}>
      <div className={tooltipStyles.tooltipSection}>
        <div className={tooltipStyles.tooltipSectionTitle}>Período Atual</div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Período:</span>
          <span className={tooltipStyles.tooltipValue}>{formatDateRange(kpis.currentPeriod.start, kpis.currentPeriod.end)}</span>
        </div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Unidades:</span>
          <span className={tooltipStyles.tooltipValue}>{formatNumberTooltip(kpis.unidades.valor)}</span>
        </div>
      </div>
      <div className={tooltipStyles.tooltipSection}>
        <div className={tooltipStyles.tooltipSectionTitle}>Período Anterior</div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Período:</span>
          <span className={tooltipStyles.tooltipValue}>{formatDateRange(kpis.previousPeriod.start, kpis.previousPeriod.end)}</span>
        </div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Unidades:</span>
          <span className={tooltipStyles.tooltipValue}>{formatNumberTooltip(kpis.previousValues.unidades)}</span>
        </div>
      </div>
    </div>
  );

  const getFaturamentoAnualTooltip = () => (
    <div className={tooltipStyles.tooltipContent}>
      <div className={tooltipStyles.tooltipSection}>
        <div className={tooltipStyles.tooltipSectionTitle}>Período Atual</div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Período:</span>
          <span className={tooltipStyles.tooltipValue}>{formatYearDateRange(kpis.currentPeriod.start, kpis.currentPeriod.end)}</span>
        </div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Faturamento:</span>
          <span className={tooltipStyles.tooltipValue}>R$ {formatCurrency(kpis.faturamentoAnual.valor)}</span>
        </div>
      </div>
      <div className={tooltipStyles.tooltipSection}>
        <div className={tooltipStyles.tooltipSectionTitle}>Período Anterior</div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Período:</span>
          <span className={tooltipStyles.tooltipValue}>{formatYearDateRange(kpis.previousPeriod.start, kpis.previousPeriod.end)}</span>
        </div>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Faturamento:</span>
          <span className={tooltipStyles.tooltipValue}>R$ {formatCurrency(kpis.previousValues.faturamentoAnual)}</span>
        </div>
      </div>
      <div className={tooltipStyles.tooltipSection}>
        <div className={tooltipStyles.tooltipRow}>
          <span className={tooltipStyles.tooltipLabel}>Projeção de Faturamento:</span>
          <span className={tooltipStyles.tooltipValue}>R$ {formatCurrency(kpis.faturamentoAnual.projecao ?? 0)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <section className={vendasStyles.kpis}>
      <div className={vendasStyles.kpi}>
        <div className={vendasStyles['kpi-label']}>
          Faturamento do período
          <Tooltip content={getFaturamentoTooltip()} position="top">
            <span className={vendasStyles['kpi-info-icon']}>ⓘ</span>
          </Tooltip>
        </div>
        <div className={vendasStyles['kpi-value']}>{formatK(kpis.faturamento.valor)}</div>
        <div className={`${vendasStyles['kpi-sub']} ${kpis.faturamento.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
          {formatVariation(kpis.faturamento.variacao)} vs {kpis.compareLabel || 'mês anterior'}
        </div>
        {kpis.showProjection && (
          <div className={vendasStyles['kpi-foot']}>Projeção: <strong>{formatK(kpis.faturamento.projecao ?? 0)}</strong></div>
        )}
      </div>

      <div className={vendasStyles.kpi}>
        <div className={vendasStyles['kpi-label']}>
          Margem bruta
          <Tooltip content={getMargemBrutaTooltip()} position="top">
            <span className={vendasStyles['kpi-info-icon']}>ⓘ</span>
          </Tooltip>
        </div>
        <div className={vendasStyles['kpi-value']}>{formatNumber(kpis.margemBruta.valor, '%')}</div>
        <div className={`${vendasStyles['kpi-sub']} ${kpis.margemBruta.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
          {formatVariation(kpis.margemBruta.variacao, false, true)} vs {kpis.compareLabel || 'mês anterior'}
        </div>
      </div>

      <div className={vendasStyles.kpi}>
        <div className={vendasStyles['kpi-label']}>
          Pedidos
          <Tooltip content={getPedidosTooltip()} position="top">
            <span className={vendasStyles['kpi-info-icon']}>ⓘ</span>
          </Tooltip>
        </div>
        <div className={vendasStyles['kpi-value']}>
          <div className={vendasStyles['kpi-main-row']}>
            <span className={vendasStyles['kpi-main-value']}>{kpis.pedidos.valor.toLocaleString('pt-BR')}</span>
            <span className={`${vendasStyles['kpi-variation-inline']} ${kpis.pedidos.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
              {formatVariation(kpis.pedidos.variacao)}
            </span>
          </div>
          <div className={vendasStyles['kpi-secondary-row']}>
            <span className={vendasStyles['kpi-secondary-value']}>R$ {formatK(kpis.ticketMedio.valor)} ticket médio</span>
            <span className={`${vendasStyles['kpi-variation-inline']} ${kpis.ticketMedio.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
              {formatVariation(kpis.ticketMedio.variacao)}
            </span>
          </div>
          <div className={vendasStyles['kpi-secondary-row']} style={{ marginTop: '8px' }}>
            <span className={vendasStyles['kpi-secondary-value']}>{kpis.clientesUnicos.valor.toLocaleString('pt-BR')} clientes</span>
            <span className={`${vendasStyles['kpi-variation-inline']} ${kpis.clientesUnicos.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
              {formatVariation(kpis.clientesUnicos.variacao, true)}
            </span>
          </div>
        </div>
      </div>

      <div className={vendasStyles.kpi}>
        <div className={vendasStyles['kpi-label']}>
          {meta && (!meta.hasBoxes && !meta.hasPackages) ? 'Unidades' : 'Caixas'}
          <Tooltip content={getUnidadesTooltip()} position="top">
            <span className={vendasStyles['kpi-info-icon']}>ⓘ</span>
          </Tooltip>
        </div>
        <div className={vendasStyles['kpi-value']}>
          {meta && (!meta.hasBoxes && !meta.hasPackages) ? (
            <div className={vendasStyles['kpi-main-row']}>
              <span className={vendasStyles['kpi-main-value']}>{formatK(kpis.unidades.valor)}</span>
              <span className={`${vendasStyles['kpi-variation-inline']} ${kpis.unidades.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
                {formatVariation(kpis.unidades.variacao)}
              </span>
            </div>
          ) : (
            <>
              <div className={vendasStyles['kpi-main-row']}>
                <span className={vendasStyles['kpi-main-value']}>{formatK(kpis.caixas.valor)}</span>
                <span className={`${vendasStyles['kpi-variation-inline']} ${kpis.caixas.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
                  {formatVariation(kpis.caixas.variacao)}
                </span>
              </div>
              {meta?.hasPackages && (
                <div className={vendasStyles['kpi-secondary-row']}>
                  <span className={vendasStyles['kpi-secondary-value']}>{formatK(kpis.pacotes.valor)} pacotes</span>
                  <span className={`${vendasStyles['kpi-variation-inline']} ${kpis.pacotes.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
                    {formatVariation(kpis.pacotes.variacao)}
                  </span>
                </div>
              )}
              <div className={vendasStyles['kpi-secondary-row']} style={{ marginTop: '8px' }}>
                <span className={vendasStyles['kpi-secondary-value']}>{formatK(kpis.unidades.valor)} unidades</span>
                <span className={`${vendasStyles['kpi-variation-inline']} ${kpis.unidades.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
                  {formatVariation(kpis.unidades.variacao)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={vendasStyles.kpi}>
        <div className={vendasStyles['kpi-label']}>
          Faturamento {new Date().getFullYear()}
          <Tooltip content={getFaturamentoAnualTooltip()} position="top">
            <span className={vendasStyles['kpi-info-icon']}>ⓘ</span>
          </Tooltip>
        </div>
        <div className={vendasStyles['kpi-value']}>{formatK(kpis.faturamentoAnual.valor)}</div>
        <div className={`${vendasStyles['kpi-sub']} ${kpis.faturamentoAnual.variacao >= 0 ? vendasStyles.pos : vendasStyles.neg}`}>
          {formatVariation(kpis.faturamentoAnual.variacao)} vs {new Date().getFullYear() - 1}
        </div>
        <div className={vendasStyles['kpi-foot']}>Projeção: <strong>{formatK(kpis.faturamentoAnual.projecao ?? 0)}</strong></div>
      </div>
    </section>
  );
}


