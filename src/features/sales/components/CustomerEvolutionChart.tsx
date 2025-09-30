'use client';

import { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

export interface CustomerEvolutionData {
  period: string;
  maintained: number;
  new: number;
  reactivated: number;
  lost: number;
  totalStart: number;
  totalEnd: number;
  netGrowth: number;
}

interface CustomerEvolutionChartProps {
  evolutionData: CustomerEvolutionData[];
  onBarClick?: (period: string, data: CustomerEvolutionData) => void;
}

export default function CustomerEvolutionChart({
  evolutionData,
  onBarClick,
}: CustomerEvolutionChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !evolutionData.length) return;

    // Registrar componentes do Chart.js
    Chart.register(...registerables, ChartDataLabels);

    // Destruir gráfico anterior se existir
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Preparar dados para o gráfico de barras empilhadas
    const labels = evolutionData.map(item => item.period);
    
    const maintainedData = evolutionData.map(item => item.maintained);
    const newData = evolutionData.map(item => item.new);
    const reactivatedData = evolutionData.map(item => item.reactivated);
    const lostData = evolutionData.map(item => -item.lost); // Negativo para mostrar abaixo da linha

    const datasets = [
      {
        label: 'Clientes Mantidos',
        data: maintainedData,
        backgroundColor: '#f59e0b', // Amarelo
        borderColor: '#d97706',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: 'Clientes Novos',
        data: newData,
        backgroundColor: '#10b981', // Verde
        borderColor: '#059669',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: 'Clientes Reativados',
        data: reactivatedData,
        backgroundColor: '#3b82f6', // Azul
        borderColor: '#2563eb',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: 'Clientes Perdidos',
        data: lostData,
        backgroundColor: '#ef4444', // Vermelho
        borderColor: '#dc2626',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
    ];

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        aspectRatio: 2.5,
        plugins: {
          legend: {
            display: true,
            position: 'top' as const,
            labels: {
              color: '#ffffff',
              font: {
                size: 12,
                weight: 'normal',
              },
              usePointStyle: true,
              pointStyle: 'rect',
              padding: 20,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            mode: 'index',
            intersect: false,
            callbacks: {
              title: (context) => {
                return context[0].label;
              },
              label: (context) => {
                const datasetLabel = context.dataset.label || '';
                const value = Math.abs(context.parsed.y);
                const sign = context.dataset.label === 'Clientes Perdidos' ? '-' : '+';
                return `${datasetLabel}: ${sign}${value.toLocaleString('pt-BR')}`;
              },
              afterBody: (tooltipItems) => {
                if (tooltipItems.length === 0) return '';
                
                const periodData = evolutionData[tooltipItems[0].dataIndex];
                const netGrowthSign = periodData.netGrowth >= 0 ? '+' : '';
                
                return [
                  '',
                  `Total Início: ${periodData.totalStart.toLocaleString('pt-BR')}`,
                  `Total Final: ${periodData.totalEnd.toLocaleString('pt-BR')}`,
                  `Crescimento: ${netGrowthSign}${periodData.netGrowth.toLocaleString('pt-BR')}`,
                ];
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
              // Só mostrar números para valores positivos e não zero
              if (Math.abs(value) > 0) {
                // Para clientes perdidos (negativos), mostrar o valor absoluto
                const displayValue = Math.abs(value);
                return displayValue.toString();
              }
              return '';
            },
            anchor: 'center',
            align: 'center',
            offset: 0,
          },
        },
        scales: {
          x: {
            stacked: true,
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
            stacked: true,
            beginAtZero: false,
            grace: '10%',
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
            const period = labels[elementIndex];
            const data = evolutionData[elementIndex];
            onBarClick(period, data);
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
  }, [evolutionData, onBarClick]);

  if (!evolutionData.length) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <p className="text-gray-500">Carregando dados de evolução...</p>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">
          Evolução Temporal dos Clientes
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Clique nas barras para ver detalhes do período
        </p>
      </div>
      
      <div className="relative" style={{ height: '250px' }}>
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}

