'use client';

import { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

interface CustomerEngagementChartProps {
  engagementData: {
    newCustomers: number;
    veryActiveCustomers: number;
    almostInactiveCustomers: number;
    inactiveCustomers: number;
  } | null;
  onBarClick?: (category: string, count: number) => void;
}

export default function CustomerEngagementChart({
  engagementData,
  onBarClick,
}: CustomerEngagementChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !engagementData) return;

    // Registrar componentes do Chart.js
    Chart.register(...registerables, ChartDataLabels);

    // Destruir gráfico anterior se existir
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Dados para o gráfico
    const data = [
      engagementData.newCustomers,
      engagementData.veryActiveCustomers,
      engagementData.almostInactiveCustomers,
      engagementData.inactiveCustomers,
    ];

    const labels = [
      'Clientes Novos',
      'Muito Ativos',
      'Quase Inativos',
      'Inativos',
    ];

    const colors = [
      '#10b981', // Verde para novos
      '#3b82f6', // Azul para muito ativos
      '#f59e0b', // Amarelo para quase inativos
      '#ef4444', // Vermelho para inativos
    ];

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderColor: colors.map(color => color + '80'), // 50% opacity para borda
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        aspectRatio: 2.5,
        plugins: {
          legend: {
            display: false, // Não mostrar legenda pois os labels já indicam as cores
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
                return `${context.parsed.y} clientes`;
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
              display: false,
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
          },
        },
        onClick: (event, elements) => {
          if (elements.length > 0 && onBarClick) {
            const elementIndex = elements[0].index;
            const category = labels[elementIndex];
            const count = data[elementIndex];
            onBarClick(category, count);
          }
        },
        onHover: (event, elements) => {
          if (chartRef.current) {
            chartRef.current.style.cursor = elements.length > 0 ? 'pointer' : 'default';
          }
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [engagementData, onBarClick]);

  if (!engagementData) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <p className="text-gray-500">Carregando dados de engajamento...</p>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">
          Engajamento de Clientes
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Clique nas barras para ver detalhes dos clientes
        </p>
      </div>
      
      <div className="relative" style={{ height: '250px' }}>
        <canvas ref={chartRef} />
      </div>

    </div>
  );
}
