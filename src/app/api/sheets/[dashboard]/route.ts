import { google } from 'googleapis';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

interface SheetRow {
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

// Tipo para vendas por produto (estrutura flexível)
type ProductSaleRow = {
  nfValida: boolean;
  data: Date;
  pedido?: string | null;
  cliente: string;
  produto: string;
  tipoCliente?: string | null;
  quantidade?: number | null;
  pacotes?: number | null;
  caixas?: number | null;
  valorTotal: number; // faturamento da linha
  precoUnitario?: number | null;
  custoUnitario?: number | null;
  custoTotal?: number | null;
  margemValor?: number | null;
  margemPercent?: number | null;
};

// Normalizador com mapping (vendas)
function normalizeRowsVendasWithMapping(valuesWithHeader: string[][], mapping: Map<string, string>, headerRow: number): ProductSaleRow[] {
  if (!valuesWithHeader.length) return [];
  const headerIndex = Math.max(0, (headerRow || 1) - 1);
  const header = valuesWithHeader[headerIndex];
  const rows = valuesWithHeader.slice(headerIndex + 1);

  const headerMap = new Map<string, number>();
  header.forEach((h, i) => headerMap.set(normalizeHeaderName2(h), i));

  const getIndexByLogical = (logical: string): number | undefined => {
    const columnName = mapping.get(logical);
    if (!columnName) return undefined;
    const norm = normalizeHeaderName2(columnName);
    return headerMap.get(norm);
  };

  const nfIdx = getIndexByLogical('status'); // ou 'nf valida' se mapeado como status TRUE/FALSE
  const dataIdx = getIndexByLogical('date');
  const pedidoIdx = getIndexByLogical('order_id');
  const clienteIdx = getIndexByLogical('customer');
  const produtoIdx = getIndexByLogical('product');
  const tipoClienteIdx = getIndexByLogical('customer_type');
  const qtdIdx = getIndexByLogical('quantity');
  const pacotesIdx = getIndexByLogical('packages');
  const caixasIdx = getIndexByLogical('boxes');
  const valorIdx = getIndexByLogical('value');
  const cmvIdx = getIndexByLogical('cogs');
  


  const out: ProductSaleRow[] = [];
  for (const row of rows) {
    try {
      // NF válida (quando existir coluna de status/NF)
      const nfValRaw = nfIdx !== undefined ? row[nfIdx] : undefined;
      const nfValida = nfValRaw === undefined ? true : String(nfValRaw).toUpperCase() === 'TRUE';
      if (!nfValida) continue;

      // Data
      const data = dataIdx !== undefined ? parseDate(String(row[dataIdx])) : null;
      if (!data) continue;

      const pedido = pedidoIdx !== undefined ? String(row[pedidoIdx] ?? '').trim() || null : null;
      const cliente = clienteIdx !== undefined ? String(row[clienteIdx] ?? '').trim() : '';
      if (!cliente) continue;
      const produto = produtoIdx !== undefined ? String(row[produtoIdx] ?? '').trim() : '';
      if (!produto) continue;
      const tipoCliente = tipoClienteIdx !== undefined ? String(row[tipoClienteIdx] ?? '').trim() || null : null;
      


      const quantidade = qtdIdx !== undefined ? Number(parseValueBR(String(row[qtdIdx] ?? ''))) : NaN;
      const safeQtd = isNaN(quantidade) ? null : quantidade;
      const pacotes = pacotesIdx !== undefined ? Number(parseValueBR(String(row[pacotesIdx] ?? ''))) : NaN;
      const safePacotes = isNaN(pacotes) ? null : pacotes;
      const caixas = caixasIdx !== undefined ? Number(parseValueBR(String(row[caixasIdx] ?? ''))) : NaN;
      const safeCaixas = isNaN(caixas) ? null : caixas;
      const valor = valorIdx !== undefined ? Number(parseValueBR(String(row[valorIdx] ?? ''))) : NaN;
      const cmv = cmvIdx !== undefined ? Number(parseValueBR(String(row[cmvIdx] ?? ''))) : NaN;

      const derivedValorTotal = !isNaN(valor) ? valor : 0;
      const derivedCustoTotal = !isNaN(cmv) ? cmv : null;
      let margemValor: number | null = null;
      let margemPercent: number | null = null;
      if (derivedCustoTotal !== null) {
        margemValor = derivedValorTotal - derivedCustoTotal;
        if (derivedValorTotal > 0) {
          margemPercent = margemValor / derivedValorTotal;
        }
      }

      out.push({
        nfValida,
        data,
        pedido,
        cliente,
        produto,
        tipoCliente,
        quantidade: safeQtd,
        pacotes: safePacotes,
        caixas: safeCaixas,
        valorTotal: derivedValorTotal,
        precoUnitario: null,
        custoUnitario: null,
        custoTotal: derivedCustoTotal,
        margemValor,
        margemPercent,
      });
    } catch {
      continue;
    }
  }

  return out;
}

function normalizeHeaderName2(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

// Função para autenticar com Google Sheets usando NextAuth
async function getGoogleSheetsClient() {
  const session = await auth();
  
  if (!session?.accessToken) {
    throw new Error('Não foi possível obter token de acesso do Google');
  }

  // Debug: mostrar informações do usuário logado
  console.log('🔍 Usuário logado:', {
    email: session.user?.email,
    name: session.user?.name,
    tenantId: session.tenantId,
    tenantName: session.tenantName
  });

  const authClient = new google.auth.OAuth2();
  authClient.setCredentials({
    access_token: session.accessToken,
  });

  return google.sheets({ version: 'v4', auth: authClient });
}

// Função para normalizar os dados da planilha (faturamento atual)
function normalizeRows(values: string[][]): SheetRow[] {
  const normalizedRows: SheetRow[] = [];

  for (const row of values) {
    try {
      // Verificar se a linha tem dados suficientes (precisa de 10 colunas: M-V)
      if (row.length < 10) continue;

      // Pegar as colunas corretas: M, N, O, P, Q, V (CMV está na coluna V, 10ª posição)
      const nfValidaRaw = row[0];  // M - NF Válida
      const anoMesRaw = row[1];     // N - AnoMês
      const dataRaw = row[2];       // O - Data
      const clienteRaw = row[3];    // P - Cliente
      const valorRaw = row[4];      // Q - Valor
      const cmvRaw = row[9];        // V - CMV (10ª coluna, índice 9)
      
      // Novas colunas: S (Unidades), T (Pacotes), U (Caixas)
      const unidadesRaw = row[6];   // S - Unidades (7ª coluna, índice 6)
      const pacotesRaw = row[7];    // T - Pacotes (8ª coluna, índice 7)
      const caixasRaw = row[8];     // U - Caixas (9ª coluna, índice 8)

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
      if (isNaN(cmv)) {
        continue;
      }

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
        unidades: parseValueBR(unidadesRaw) || 0,
        pacotes: parseValueBR(pacotesRaw) || 0,
        caixas: parseValueBR(caixasRaw) || 0,
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

// Cache para dados (evita requisições desnecessárias)
const cache = new Map<string, { data: (SheetRow | ProductSaleRow)[]; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos



export async function GET(
  request: Request,
  context: { params: Promise<{ dashboard: string }> }
) {
  const { dashboard } = await context.params;
  
  try {
    // Verificar se o usuário está autenticado
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // Obter configuração dinamicamente do Supabase por tenant
    const supabase = getSupabaseAdminClient();
    const tenantId = session.tenantId as string | undefined;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não encontrado na sessão' }, { status: 400 });
    }

    // sheet_configs: buscar sheet_id e sheet_tab
    const { data: sheetCfg, error: sheetCfgErr } = await supabase
      .from('sheet_configs')
      .select('id, sheet_id, sheet_tab, header_row')
      .eq('tenant_id', tenantId)
      .limit(1)
      .maybeSingle();

    if (sheetCfgErr) {
      return NextResponse.json({ error: 'Erro ao buscar sheet_configs', details: sheetCfgErr.message }, { status: 500 });
    }
    if (!sheetCfg) {
      return NextResponse.json({ error: 'Configuração de planilha não encontrada para o tenant' }, { status: 404 });
    }

    // column_mappings: buscar mapeamento das colunas lógicas
    const { data: mappings, error: mapErr } = await supabase
      .from('column_mappings')
      .select('logical_name, sheet_column')
      .eq('sheet_config_id', sheetCfg.id);

    if (mapErr) {
      return NextResponse.json({ error: 'Erro ao buscar column_mappings', details: mapErr.message }, { status: 500 });
    }

    const mapping = new Map<string, string>();
    for (const row of mappings ?? []) {
      mapping.set(String(row.logical_name), String(row.sheet_column));
    }

    // Verificar cache (por tenant + sheet)
    const cacheKey = `${dashboard}-${tenantId}-${sheetCfg.id}-${sheetCfg.sheet_tab}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    // Buscar dados da Google Sheets (apenas dados reais)
    const sheets = await getGoogleSheetsClient();
    
    // Ler toda a aba (o normalizador usará o cabeçalho e mappings)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetCfg.sheet_id,
      range: `${sheetCfg.sheet_tab}`,
    });

    const values = response.data.values;
    
    if (!values || values.length === 0) {
      return NextResponse.json([]);
    }

    let normalizedData: (SheetRow | ProductSaleRow)[] = [];
    if (dashboard === 'vendas') {
      // Para 'vendas', usar header + mappings do tenant
      normalizedData = normalizeRowsVendasWithMapping(values, mapping, sheetCfg.header_row ?? 1);
    } else {
      // Outros dashboards ainda não migrados
      const dataRows = values.slice(1);
      normalizedData = normalizeRows(dataRows);
    }

    // Atualizar cache
    cache.set(cacheKey, { data: normalizedData, timestamp: Date.now() });
    
    return NextResponse.json(normalizedData);
  } catch (error) {
    console.error(`❌ Erro ao buscar dados da planilha para ${dashboard}:`, error);
    
    // Se o erro for de autorização, tentar refresh token via frontend
    if (error instanceof Error && (
      error.message.includes('token de acesso') || 
      error.message.includes('authentication') ||
      error.message.includes('unauthorized')
    )) {
      return NextResponse.json(
        { 
          error: 'Token expirado. Por favor, recarregue a página para renovar a autenticação.',
          shouldRefresh: true 
        }, 
        { status: 401 }
      );
    }
    
    // Para outros erros, retornar erro específico
    return NextResponse.json(
      { 
        error: 'Falha ao carregar dados da planilha. Verifique a conexão e tente novamente.',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}
