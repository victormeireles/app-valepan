import { useEffect, useState } from 'react';

// Hook para carregar Chart.js dinamicamente no cliente
export function useChartJS(): boolean {
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (typeof window === 'undefined') return;
      if ((window as { Chart?: unknown }).Chart) {
        if (active) setLoaded(true);
        return;
      }
      try {
        const mod = await import('chart.js/auto');
        (window as { Chart?: unknown }).Chart = (mod as { Chart: unknown }).Chart;
        if (active) setLoaded(true);
      } catch (error) {
        console.error('Erro ao carregar Chart.js:', error);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return loaded;
}


