'use client';

import { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { CLVSegmentAnalysis as SegmentAnalysis } from '@/features/sales/types/clv';
import { useChartJS } from '@/features/common/hooks/useChartJS';

interface CLVSegmentAnalysisProps {
  segmentAnalysis: SegmentAnalysis[];
}

export default function CLVSegmentAnalysis({ segmentAnalysis }: CLVSegmentAnalysisProps) {
  useChartJS();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatNumber = (n: number) => {
    return n.toLocaleString('pt-BR');
  };

  useEffect(() => {
    if (!chartRef.current || !segmentAnalysis.length) return;

    // Registrar componentes do Chart.js
    Chart.register(...registerables, ChartDataLabels);

    // Destruir gráfico anterior se existir
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const labels = segmentAnalysis.map(segment => segment.segment);
    const data = segmentAnalysis.map(segment => segment.totalValue);
    const colors = [
      'rgba(34, 197, 94, 0.8)',   // Verde
      'rgba(59, 130, 246, 0.8)',  // Azul
      'rgba(251, 146, 60, 0.8)',  // Laranja
      'rgba(168, 85, 247, 0.8)',  // Roxo
      'rgba(239, 68, 68, 0.8)',   // Vermelho
      'rgba(156, 163, 175, 0.8)'  // Cinza
    ];

    chartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderColor: colors.map(color => color.replace('0.8', '1')),
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom' as const,
            labels: {
              padding: 20,
              usePointStyle: true,
              color: '#9ca3af',
              font: {
                size: 12,
                weight: 'normal',
              },
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: (context) => {
                return context[0].label;
              },
              label: (context) => {
                const segment = segmentAnalysis[context.dataIndex];
                const percentage = ((segment.totalValue / segmentAnalysis.reduce((sum, s) => sum + s.totalValue, 0)) * 100).toFixed(1);
                return [
                  `Valor: ${formatCurrency(segment.totalValue)}`,
                  `Participação: ${percentage}%`
                ];
              }
            }
          },
          datalabels: {
            display: true,
            color: '#ffffff',
            font: {
              size: 10,
              weight: 'bold' as const,
            },
            formatter: (value: number) => {
              const percentage = ((value / segmentAnalysis.reduce((sum, s) => sum + s.totalValue, 0)) * 100).toFixed(1);
              return `${percentage}%`;
            },
          }
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [segmentAnalysis]);

  if (!segmentAnalysis.length) {
    return (
      <div className="relative">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-2">
            Análise CLV por Segmento
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Comparação de valor entre diferentes tipos de cliente
          </p>
        </div>
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
          <p className="text-gray-500">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">
          Análise CLV por Segmento
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Comparação de valor entre diferentes tipos de cliente
        </p>
      </div>

      <div className="segment-analysis-content">
        {/* Gráfico de Pizza */}
        <div className="segment-chart">
          <div className="chart-container">
            <canvas ref={chartRef} />
          </div>
        </div>

        {/* Tabela de Métricas */}
        <div className="segment-metrics">
          <table className="segment-table">
            <thead>
              <tr>
                <th>Segmento</th>
                <th>Clientes</th>
                <th>CLV Médio</th>
                <th>Valor Total</th>
                <th>Freq./Mês</th>
                <th>Vida (meses)</th>
              </tr>
            </thead>
            <tbody>
              {segmentAnalysis.map((segment, index) => {
                const colors = [
                  'rgba(34, 197, 94, 0.8)',   // Verde
                  'rgba(59, 130, 246, 0.8)',  // Azul
                  'rgba(251, 146, 60, 0.8)',  // Laranja
                  'rgba(168, 85, 247, 0.8)',  // Roxo
                  'rgba(239, 68, 68, 0.8)',   // Vermelho
                  'rgba(156, 163, 175, 0.8)'  // Cinza
                ];
                
                return (
                  <tr key={segment.segment}>
                    <td>
                      <div className="segment-info">
                        <span 
                          className="segment-color" 
                          style={{ backgroundColor: colors[index] }}
                        ></span>
                        <span className="segment-name">{segment.segment}</span>
                      </div>
                    </td>
                    <td className="number-cell">
                      {formatNumber(segment.customerCount)}
                    </td>
                    <td className="currency-cell">
                      {formatCurrency(segment.averageCLV)}
                    </td>
                    <td className="currency-cell">
                      {formatCurrency(segment.totalValue)}
                    </td>
                    <td className="number-cell">
                      {segment.averageFrequency.toFixed(2)}
                    </td>
                    <td className="number-cell">
                      {segment.averageLifespan.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
