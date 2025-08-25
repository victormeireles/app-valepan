// Configuração de planilhas para cada dashboard
export interface SheetConfig {
  spreadsheetId: string;
  range: string;
  name: string;
  description?: string;
}

// Mapeamento de dashboards para configurações de planilhas
export const SHEET_CONFIGS: Record<string, SheetConfig> = {
  faturamento: {
    spreadsheetId: '1Wy43sOqHVKPTx7U634U9kYRDeANE-61kxpQm4-Bg9Xo',
    range: 'M:V',
    name: 'Faturamento',
    description: 'Dados de faturamento e vendas com CMV'
  },
  vendas: {
    spreadsheetId: '1_xlm8YzBpG7a3LN3lBN6snbIYxJxMefvPPZxsx7vCaM',
    range: 'Base!S:AB',
    name: 'Vendas por Produto',
    description: 'Vendas detalhadas por produto/cliente (NF válida = TRUE)'
  },
  // Adicionar outras planilhas conforme necessário
  // vendas: {
  //   spreadsheetId: 'outro-id-aqui',
  //   range: 'A:E',
  //   name: 'Vendas',
  //   description: 'Dados de vendas detalhadas'
  // },
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
