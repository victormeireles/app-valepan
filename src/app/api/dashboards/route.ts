import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseAdminClient } from '@/lib/supabase';

type DashboardInfo = {
  id: string;
  name: string;
  label: string;
  description?: string;
};

// Mapeamento de dashboards para informações de exibição
const DASHBOARD_INFO: Record<string, Omit<DashboardInfo, 'id'>> = {
  sales: {
    name: 'sales',
    label: 'Vendas',
    description: 'Dashboard de vendas e faturamento'
  },
  customer: {
    name: 'customer',
    label: 'Clientes',
    description: 'Dashboard de gestão de clientes'
  }
};

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const tenantId = session.tenantId as string | undefined;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não encontrado na sessão' }, { status: 400 });
    }

    // Buscar dashboards configurados para este tenant
    const { data: sheetConfigs, error: configError } = await supabase
      .from('sheet_configs')
      .select('dashboard')
      .eq('tenant_id', tenantId);

    if (configError) {
      return NextResponse.json({ error: 'Erro ao buscar configurações de dashboard', details: configError.message }, { status: 500 });
    }

    // Filtrar apenas dashboards que têm configuração e estão no mapeamento
    const availableDashboards: DashboardInfo[] = [];
    
    for (const config of sheetConfigs ?? []) {
      const dashboardName = String(config.dashboard ?? '');
      const info = DASHBOARD_INFO[dashboardName];
      
      if (info) {
        availableDashboards.push({
          id: dashboardName,
          ...info
        });
      }
    }

    // Ordenar por ordem de preferência (sales primeiro, depois customer, etc.)
    const order = ['sales', 'customer'];
    availableDashboards.sort((a, b) => {
      const aIndex = order.indexOf(a.id);
      const bIndex = order.indexOf(b.id);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return NextResponse.json(availableDashboards);
  } catch (error) {
    console.error('Erro ao buscar dashboards disponíveis:', error);
    return NextResponse.json(
      {
        error: 'Falha ao carregar dashboards disponíveis',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
