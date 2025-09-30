'use client';

import { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { CLVDistributionBucket } from '@/features/sales/types/clv';
import { useChartJS } from '@/features/common/hooks/useChartJS';

interface CLVDistributionChartProps {
  data: CLVDistributionBucket[];
  onBarClick?: (bucket: CLVDistributionBucket) => void;
}

export default function CLVDistributionChart({ data, onBarClick }: CLVDistributionChartProps) {
  useChartJS();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    // Registrar componentes do Chart.js
    Chart.register(...registerables, ChartDataLabels);

    // Destruir gráfico anterior se existir
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const labels = data.map(bucket => bucket.range);
    const chartData = data.map(bucket => bucket.count);
    const colors = [
      'rgba(34, 197, 94, 0.8)',   // Verde
      'rgba(59, 130, 246, 0.8)',  // Azul
      'rgba(251, 146, 60, 0.8)',  // Laranja
      'rgba(168, 85, 247, 0.8)',  // Roxo
      'rgba(239, 68, 68, 0.8)',   // Vermelho
      'rgba(156, 163, 175, 0.8)'  // Cinza
    ];

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Número de Clientes',
            data: chartData,
            backgroundColor: colors,
            borderColor: colors.map(color => color.replace('0.8', '1')),
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
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
                const bucket = data[context.dataIndex];
                return `${bucket.count} clientes`;
              },
            },
          },
          datalabels: {
            display: true,
            color: '#ffffff',
            font: {
              size: 12,
              weight: 'bold' as const,
            },
            formatter: (value: number) => {
              return value.toString();
            },
            anchor: 'end',
            align: 'top',
            offset: 4,
          },
        },
        scales: {
          x: {
            grid: {
              display: false, // Remove linhas verticais sob as barras
            },
            ticks: {
              color: '#9ca3af',
              font: {
                size: 12,
                weight: 'normal',
              },
            },
          },
          y: {
            beginAtZero: true,
            grace: '15%', // Adiciona 15% de espaço extra no topo do gráfico
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: '#9ca3af',
              font: {
                size: 12,
                weight: 'normal',
              },
              callback: function (value) {
                return Number(value).toLocaleString('pt-BR');
              },
            },
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0 && onBarClick) {
            const elementIndex = elements[0].index;
            onBarClick(data[elementIndex]);
          }
        },
        onHover: (event, elements) => {
          if (chartRef.current) {
            chartRef.current.style.cursor = elements.length > 0 ? 'pointer' : 'default';
          }
        },
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data, onBarClick]);

  if (!data.length) {
    return (
      <div className="relative">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-2">
            Distribuição de LTV
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Carregando dados de distribuição...
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
          Distribuição de LTV
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Clique nas barras para ver detalhes dos clientes
        </p>
      </div>
      
      <div className="relative h-64">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}
