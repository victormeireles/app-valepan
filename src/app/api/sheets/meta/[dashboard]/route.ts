import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type MetaResponse = {
  hasPackages: boolean;
  hasBoxes: boolean;
  hasCustomerType: boolean;
};

function normalizeLogicalName(name: string | null | undefined): string {
  return String(name || '')
    .toLowerCase()
    .trim();
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ dashboard: string }> }
) {
  const { dashboard } = await context.params;

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não encontrado na sessão' }, { status: 400 });
    }

    // sheet_configs do tenant por dashboard específico
    const { data: sheetCfg, error: sheetCfgErr } = await supabase
      .from('sheet_configs')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('dashboard', dashboard)
      .limit(1)
      .maybeSingle();

    if (sheetCfgErr) {
      return NextResponse.json({ error: 'Erro ao buscar sheet_configs', details: sheetCfgErr.message }, { status: 500 });
    }
    if (!sheetCfg) {
      return NextResponse.json({ error: 'Configuração de planilha não encontrada para o tenant' }, { status: 404 });
    }

    // column_mappings desse sheet_config
    const { data: mappings, error: mapErr } = await supabase
      .from('column_mappings')
      .select('logical_name')
      .eq('sheet_config_id', sheetCfg.id);

    if (mapErr) {
      return NextResponse.json({ error: 'Erro ao buscar column_mappings', details: mapErr.message }, { status: 500 });
    }

    const logicals = (mappings || []).map(m => normalizeLogicalName((m as { logical_name: string }).logical_name));

    // Aceitar variações (singular/plural/pt-en)
    const hasPackages = logicals.some(l => ['packages', 'package', 'pacotes', 'pacote'].includes(l));
    const hasBoxes = logicals.some(l => ['boxes', 'box', 'caixas', 'caixa'].includes(l));
    const hasCustomerType = logicals.some(l => ['customer_type', 'customer-type', 'tipo_cliente', 'tipo-cliente', 'tipo cliente'].includes(l));
    


    const meta: MetaResponse = { hasPackages, hasBoxes, hasCustomerType };
    return NextResponse.json(meta);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Falha ao carregar metadados da planilha',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}


