"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAvailableDashboards, DashboardInfo } from "@/lib/sheets";
import VendasDashboard from "@/components/VendasDashboard";
import CustomerDashboard from "@/components/CustomerDashboard";
import LoadingOverlay from "@/components/LoadingOverlay";

// Componente de placeholder para dashboards não implementados
function PlaceholderDashboard({ dashboard }: { dashboard: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h1 className="text-2xl font-bold text-gray-700 mb-2">
          Dashboard em Desenvolvimento
        </h1>
        <p className="text-gray-500">
          O dashboard <strong>{dashboard}</strong> está sendo desenvolvido.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Em breve você poderá visualizar seus dados aqui.
        </p>
      </div>
    </div>
  );
}

export default function DynamicDashboard() {
  const params = useParams();
  const dashboard = String(params.dashboard ?? '');
  const [availableDashboards, setAvailableDashboards] = useState<DashboardInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboards() {
      try {
        setLoading(true);
        const dashboards = await fetchAvailableDashboards();
        setAvailableDashboards(dashboards);
      } catch (err) {
        console.error('Erro ao carregar dashboards:', err);
        setError('Falha ao carregar dashboards disponíveis');
      } finally {
        setLoading(false);
      }
    }

    loadDashboards();
  }, []);

  if (loading) {
    return <LoadingOverlay />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Erro</h1>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  // Verificar se o dashboard solicitado está disponível
  const isDashboardAvailable = availableDashboards.some(d => d.id === dashboard);
  
  if (!isDashboardAvailable) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-700 mb-2">
            Dashboard Não Encontrado
          </h1>
          <p className="text-gray-500 mb-4">
            O dashboard <strong>{dashboard}</strong> não está disponível para seu tenant.
          </p>
          <div className="text-sm text-gray-400">
            <p>Dashboards disponíveis:</p>
            <ul className="mt-2 space-y-1">
              {availableDashboards.map((d) => (
                <li key={d.id} className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {d.id} - {d.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar o dashboard específico
  switch (dashboard) {
    case 'sales':
      return <VendasDashboard />;
    case 'customer':
      return <CustomerDashboard />;
    default:
      return <PlaceholderDashboard dashboard={dashboard} />;
  }
}
