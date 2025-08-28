// Configuração de planilhas para cada dashboard
export interface SheetConfig {
  spreadsheetId: string;
  range: string;
  name: string;
  description?: string;
}

// Mapeamento de dashboards para configurações de planilhas
export const SHEET_CONFIGS: Record<string, SheetConfig> = {
  vendas: {
    spreadsheetId: '1_xlm8YzBpG7a3LN3lBN6snbIYxJxMefvPPZxsx7vCaM',
    range: 'Base!T:AC',
    name: 'Vendas por Produto',
    description: 'Vendas detalhadas por produto/cliente (NF válida = TRUE)'
  },
  // Adicionar outras planilhas conforme necessário
  // producao: {
  //   spreadsheetId: 'mais-outro-id',
  //   range: 'A:F',
  //   name: 'Produção',
  //   description: 'Dados de produção'
  // }
};

// Função para obter configuração de planilha por dashboard
export function getSheetConfig(dashboard: string): SheetConfig | null {
  return SHEET_CONFIGS[dashboard] || null;
}

// Função para validar se um dashboard tem configuração válida
export function isValidDashboard(dashboard: string): boolean {
  const config = getSheetConfig(dashboard);
  return config !== null && !!config.spreadsheetId && !!config.range;
}
