// Interface para os dados da planilha
export interface SheetRow {
  nfValida: boolean;
  anoMes: string;
  data: Date;
  cliente: string;
  valor: number;
}

// Função para buscar dados da API (servidor)
export async function fetchSheetData(): Promise<SheetRow[]> {
  try {
    const response = await fetch('/api/sheets/data');
    
    if (!response.ok) {
      throw new Error('Falha ao carregar dados da planilha');
    }

    const data = await response.json();
    
    // Converter strings de data de volta para objetos Date
    return data.map((row: any) => ({
      ...row,
      data: new Date(row.data)
    }));
  } catch (error) {
    console.error('Erro ao buscar dados da planilha:', error);
    throw new Error('Falha ao carregar dados da planilha');
  }
}

// Função para normalizar os dados da planilha
function normalizeRows(values: any[][]): SheetRow[] {
  const normalizedRows: SheetRow[] = [];

  for (const row of values) {
    try {
      // Verificar se a linha tem dados suficientes
      if (row.length < 5) continue;

      const [nfValidaRaw, anoMesRaw, dataRaw, clienteRaw, valorRaw] = row;

      // Filtrar apenas NF Válida = TRUE
      const nfValida = String(nfValidaRaw).toUpperCase() === 'TRUE';
      if (!nfValida) continue;

      // Parse da data (formato dd/mm/aaaa)
      const data = parseDate(dataRaw);
      if (!data) continue;

      // Parse do valor (formato brasileiro: 1.234,56)
      const valor = parseValueBR(valorRaw);
      if (isNaN(valor)) continue;

      // Cliente
      const cliente = String(clienteRaw).trim();
      if (!cliente) continue;

      normalizedRows.push({
        nfValida,
        anoMes: String(anoMesRaw || ''),
        data,
        cliente,
        valor,
      });
    } catch (error) {
      console.warn('Erro ao processar linha:', row, error);
      continue;
    }
  }

  return normalizedRows;
}

// Função para fazer parse de data no formato dd/mm/aaaa
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  try {
    // Tentar formato dd/mm/aaaa primeiro
    const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Tentar parse padrão do JavaScript
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

// Função para fazer parse de valor no formato brasileiro (1.234,56)
function parseValueBR(valueStr: string): number {
  if (!valueStr) return NaN;

  try {
    // Converter formato brasileiro para formato americano
    const cleaned = String(valueStr)
      .replace(/\./g, '') // Remove pontos (milhares)
      .replace(',', '.'); // Substitui vírgula por ponto (decimal)
    
    return parseFloat(cleaned);
  } catch {
    return NaN;
  }
}

// Função para formatar valor em formato brasileiro
export function formatValueBR(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Função para formatar valor em K (milhares)
export function formatK(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  } else {
    return value.toFixed(0);
  }
}

// Função para gerar dados demo (para desenvolvimento/teste)
export function generateDemoData(): SheetRow[] {
  const demoData: SheetRow[] = [];
  const clientes = [
    'Padaria Central', 'Mercado São João', 'Café da Esquina', 
    'Supermercado Bom Preço', 'Lanchonete do Zé', 'Padaria Nova',
    'Mercado da Vila', 'Café Expresso', 'Padaria do Bairro'
  ];

  // Gerar dados dos últimos 90 dias
  const hoje = new Date();
  for (let i = 90; i >= 0; i--) {
    const data = new Date(hoje);
    data.setDate(data.getDate() - i);

    // Gerar 2-8 vendas por dia
    const vendasDia = Math.floor(Math.random() * 7) + 2;
    
    for (let j = 0; j < vendasDia; j++) {
      const cliente = clientes[Math.floor(Math.random() * clientes.length)];
      const valor = Math.random() * 2000 + 100; // Entre R$ 100 e R$ 2100

      demoData.push({
        nfValida: true,
        anoMes: `${data.getFullYear()}${String(data.getMonth() + 1).padStart(2, '0')}`,
        data: new Date(data),
        cliente,
        valor,
      });
    }
  }

  return demoData;
}
