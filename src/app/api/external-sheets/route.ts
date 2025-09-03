import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseAdminClient } from '@/lib/supabase';

type ExternalSheet = {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  link: string;
  display_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const tenantId = session.tenantId as string | undefined;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não encontrado na sessão' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('external_sheets')
      .select('id, tenant_id, title, description, link, display_order, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar planilhas externas', details: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []) as ExternalSheet[]);
  } catch (err) {
    return NextResponse.json({ error: 'Falha inesperada ao listar planilhas externas', details: err instanceof Error ? err.message : 'Erro desconhecido' }, { status: 500 });
  }
}


