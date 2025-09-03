export type ExternalSheet = {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  link: string;
  display_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export async function fetchExternalSheets(): Promise<ExternalSheet[]> {
  const res = await fetch('/api/external-sheets', { cache: 'no-store' });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: 'Falha ao listar planilhas' }));
    throw new Error(payload.error ?? 'Falha ao listar planilhas');
  }
  const data = (await res.json()) as ExternalSheet[];
  return data;
}


