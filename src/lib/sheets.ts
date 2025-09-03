// Interface para os dados da planilha
export interface SheetRow {
  nfValida: boolean;
  anoMes: string;
  data: Date;
  cliente: string;
  valor: number;
  cmv: number;
  unidades?: number;
  pacotes?: number;
  caixas?: number;
}

// Vendas por produto
export interface ProductSaleRow {
  nfValida: boolean;
  data: Date;
  pedido?: string | null;
  cliente: string;
  produto: string;
  tipoCliente?: string | null;
  quantidade?: number | null;
  pacotes?: number | null;
  caixas?: number | null;
  valorTotal: number;
  precoUnitario?: number | null;
  custoUnitario?: number | null;
  custoTotal?: number | null;
  margemValor?: number | null;
  margemPercent?: number | null;
}

// Erro específico para quando o usuário não tem acesso à planilha
export class AccessDeniedError extends Error {
  public readonly email: string;
  public readonly sheetUrl?: string;

  constructor(message: string, email: string, sheetUrl?: string) {
    super(message);
    this.name = 'AccessDeniedError';
    this.email = email;
    this.sheetUrl = sheetUrl;
  }
}

// Função para buscar dados da API (servidor) para um dashboard específico
export async function fetchSheetData(
  dashboard: 'vendas'
): Promise<ProductSaleRow[]>;
export async function fetchSheetData(
  dashboard?: string
): Promise<(SheetRow | ProductSaleRow)[]>;
export async function fetchSheetData(dashboard: string = 'vendas') {
  try {
    const response = await fetch(`/api/sheets/${dashboard}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 403) {
        const email = String((errorData.email ?? ''));
        const sheetUrl = (typeof errorData.sheetUrl === 'string' ? errorData.sheetUrl : undefined);
        throw new AccessDeniedError(
          String(errorData.error ?? 'Você não tem acesso à planilha deste tenant.'),
          email,
          sheetUrl
        );
      }

      if (response.status === 401) {
        // Se token expirou, tentar refresh automático recarregando
        if (errorData.shouldRefresh) {
          console.log('Token expirado, recarregando página para renovar...');
          // Aguardar um pouco para o refresh token funcionar
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
        throw new Error(errorData.error || 'Sessão expirada. Recarregando página...');
      }
      
      if (response.status === 404) {
        throw new Error(`Dashboard '${dashboard}' não encontrado.`);
      }
      
      if (response.status === 500) {
        throw new Error(errorData.error || 'Falha ao carregar dados da planilha');
      }
      
      throw new Error('Falha ao carregar dados da planilha');
    }

    const data = await response.json();
    
    // Verificar se retornou erro mesmo com status 200
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Converter strings de data de volta para objetos Date
    return data.map((row: SheetRow) => ({
      ...row,
      data: new Date(row.data)
    }));
  } catch (error) {
    console.error('Erro ao buscar dados da planilha:', error);
    throw error;
  }
}

// Meta das planilhas por tenant (flags de presença de colunas)
export type SheetMeta = {
  hasPackages: boolean;
  hasBoxes: boolean;
  hasCustomerType: boolean;
};

export async function fetchSheetMeta(dashboard: string = 'vendas'): Promise<SheetMeta> {
  const res = await fetch(`/api/sheets/meta/${dashboard}`);
  if (!res.ok) {
    throw new Error('Falha ao carregar metadados da planilha');
  }
  return res.json();
}

// Função para normalizar os dados da planilha (não utilizada atualmente)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function normalizeRows(values: string[][]): SheetRow[] {
  const normalizedRows: SheetRow[] = [];

  for (const row of values) {
    try {
      // Verificar se a linha tem dados suficientes (agora precisa de 6 colunas: M-V)
      if (row.length < 6) continue;

      const [nfValidaRaw, anoMesRaw, dataRaw, clienteRaw, valorRaw, cmvRaw] = row;

      // Filtrar apenas NF Válida = TRUE
      const nfValida = String(nfValidaRaw).toUpperCase() === 'TRUE';
      if (!nfValida) continue;

      // Parse da data (formato dd/mm/aaaa)
      const data = parseDate(dataRaw);
      if (!data) continue;

      // Parse do valor (formato brasileiro: 1.234,56)
      const valor = parseValueBR(valorRaw);
      if (isNaN(valor)) continue;

      // Parse do CMV (formato brasileiro: 1.234,56)
      const cmv = parseValueBR(cmvRaw);
      if (isNaN(cmv)) continue;

      // Cliente
      const cliente = String(clienteRaw).trim();
      if (!cliente) continue;

      normalizedRows.push({
        nfValida,
        anoMes: String(anoMesRaw || ''),
        data,
        cliente,
        valor,
        cmv,
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
        cmv: valor * (0.6 + Math.random() * 0.2), // CMV entre 60% e 80% do valor
        unidades: Math.floor(Math.random() * 1000) + 100, // Entre 100 e 1100 unidades
        pacotes: Math.floor(Math.random() * 100) + 10, // Entre 10 e 110 pacotes
        caixas: Math.floor(Math.random() * 20) + 2, // Entre 2 e 22 caixas
      });
    }
  }

  return demoData;
}
