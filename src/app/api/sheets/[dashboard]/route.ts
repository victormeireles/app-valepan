import { google } from 'googleapis';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { getSheetConfig } from '@/config/sheets';

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
  cliente: string;
  produto: string;
  quantidade?: number | null;
  valorTotal: number; // faturamento da linha
  precoUnitario?: number | null;
  custoUnitario?: number | null;
  custoTotal?: number | null;
  margemValor?: number | null;
  margemPercent?: number | null;
};

// Função para autenticar com Google Sheets usando as credenciais do NextAuth
async function getGoogleSheetsClient() {
  const session = await auth();
  
  if (!session?.accessToken) {
    throw new Error('Não foi possível obter token de acesso do Google');
  }

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

      // Debug: log dos valores brutos para as primeiras linhas
      if (normalizedRows.length < 3) {
        console.log(`[DEBUG] Linha ${normalizedRows.length + 1} - Valores brutos:`, {
          nfValida: nfValidaRaw,
          anoMes: anoMesRaw,
          data: dataRaw,
          cliente: clienteRaw,
          valor: valorRaw,
          cmv: cmvRaw,
          unidades: unidadesRaw,
          pacotes: pacotesRaw,
          caixas: caixasRaw,
          'row.length': row.length,
          'todas_colunas': row
        });
      }

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
        console.log(`Debug - CMV inválido na linha:`, { cmvRaw, valor: valorRaw, cliente: clienteRaw });
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

// Utilidade: normalizar nome do cabeçalho (minúsculo, sem acentos)
function normalizeHeaderName(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

// Função para normalizar dados para 'vendas' com base no cabeçalho
function normalizeRowsVendas(valuesWithHeader: string[][]): ProductSaleRow[] {
  if (!valuesWithHeader.length) return [];
  const [header, ...rows] = valuesWithHeader;
  const headerMap = new Map<string, number>();
  header.forEach((h, i) => headerMap.set(normalizeHeaderName(h), i));

  // Encontrar índices prováveis
  const idx = (cands: string[]): number | undefined => {
    for (const c of cands) {
      const found = headerMap.get(c);
      if (found !== undefined) return found;
    }
    // procurar por includes
    const keys = Array.from(headerMap.keys());
    for (const c of cands) {
      const k = keys.find(k => k.includes(c));
      if (k) return headerMap.get(k);
    }
    return undefined;
  };

  const nfIdx = idx(['nf valida', 'nf valida?', 'nfvalida', 'valida']);
  const dataIdx = idx(['data', 'emissao', 'emissao nf', 'dt']);
  const clienteIdx = idx(['cliente', 'razao social', 'cliente nome']);
  const produtoIdx = idx(['produto', 'item', 'descricao', 'descricao produto']);
  const qtdIdx = idx(['quantidade', 'qtd', 'qtde']);
  const precoUnitIdx = idx(['preco unitario', 'preco un', 'valor unitario']);
  const valorTotalIdx = idx(['valor total', 'valor', 'total', 'preco total']);
  const custoUnitIdx = idx(['custo unitario', 'custo un']);
  const custoTotalIdx = idx(['custo total', 'custo', 'cmv']);
  const margemValorIdx = idx(['margem', 'margem valor']);
  const margemPercentIdx = idx(['margem %', 'margem percentual', 'margem % total', 'margem percent']);

  // Debug: log do mapeamento das colunas
  console.log(`[DEBUG Vendas] Header original:`, header);
  console.log(`[DEBUG Vendas] Header normalizado:`, Array.from(headerMap.keys()));
  console.log(`[DEBUG Vendas] Índices encontrados:`, {
    nfIdx, dataIdx, clienteIdx, produtoIdx, qtdIdx, 
    precoUnitIdx, valorTotalIdx, custoUnitIdx, custoTotalIdx, 
    margemValorIdx, margemPercentIdx
  });

  const out: ProductSaleRow[] = [];

  for (const row of rows) {
    try {
      // NF válida
      const nfValRaw = nfIdx !== undefined ? row[nfIdx] : undefined;
      const nfValida = String(nfValRaw).toUpperCase() === 'TRUE';
      if (!nfValida) continue;

      // Data
      const data = dataIdx !== undefined ? parseDate(String(row[dataIdx])) : null;
      if (!data) continue;

      // Cliente
      const cliente = clienteIdx !== undefined ? String(row[clienteIdx]).trim() : '';
      if (!cliente) continue;

      // Produto
      const produto = produtoIdx !== undefined ? String(row[produtoIdx]).trim() : '';
      if (!produto) continue;

      // Quantidade
      const quantidade = qtdIdx !== undefined ? Number(parseValueBR(String(row[qtdIdx]))) : NaN;
      const safeQtd = isNaN(quantidade) ? null : quantidade;

      // Preço unitário e valor total
      const precoUnitario = precoUnitIdx !== undefined ? Number(parseValueBR(String(row[precoUnitIdx]))) : NaN;
      const safePrecoUnit = isNaN(precoUnitario) ? null : precoUnitario;
      const valorTotal = valorTotalIdx !== undefined ? Number(parseValueBR(String(row[valorTotalIdx]))) : NaN;

      // Custo unitário e total
      const custoUnitario = custoUnitIdx !== undefined ? Number(parseValueBR(String(row[custoUnitIdx]))) : NaN;
      const safeCustoUnit = isNaN(custoUnitario) ? null : custoUnitario;
      const custoTotal = custoTotalIdx !== undefined ? Number(parseValueBR(String(row[custoTotalIdx]))) : NaN;
      const safeCustoTotal = isNaN(custoTotal) ? null : custoTotal;

      // Derivados
      const derivedValorTotal = !isNaN(valorTotal)
        ? valorTotal
        : safeQtd !== null && safePrecoUnit !== null
          ? safeQtd * safePrecoUnit
          : 0;

      const derivedCustoTotal = safeCustoTotal !== null && !isNaN(safeCustoTotal)
        ? safeCustoTotal
        : safeQtd !== null && safeCustoUnit !== null
          ? safeQtd * safeCustoUnit
          : null;

      // Margem
      let margemValor: number | null = null;
      let margemPercent: number | null = null;

      const margemValorRaw = margemValorIdx !== undefined ? Number(parseValueBR(String(row[margemValorIdx]))) : NaN;
      const margemPercentRaw = margemPercentIdx !== undefined ? Number(parseValueBR(String(row[margemPercentIdx]))) : NaN;

      if (!isNaN(margemValorRaw)) {
        margemValor = margemValorRaw;
      } else if (derivedCustoTotal !== null) {
        margemValor = derivedValorTotal - derivedCustoTotal;
      }

      if (!isNaN(margemPercentRaw)) {
        margemPercent = margemPercentRaw / (margemPercentRaw > 1.5 ? 100 : 1); // aceita 35 ou 0.35
      } else if (derivedValorTotal > 0 && margemValor !== null) {
        margemPercent = margemValor / derivedValorTotal;
      }

      out.push({
        nfValida,
        data,
        cliente,
        produto,
        quantidade: safeQtd,
        valorTotal: derivedValorTotal,
        precoUnitario: safePrecoUnit,
        custoUnitario: safeCustoUnit,
        custoTotal: derivedCustoTotal,
        margemValor,
        margemPercent,
      });
    } catch {
      // ignora linha problemática
      continue;
    }
  }

  return out;
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
    console.log(`[API ${dashboard}] Session completa:`, session);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    console.log(`[API ${dashboard}] AccessToken:`, session.accessToken);
    
    // Obter configuração da planilha para este dashboard
    const sheetConfig = getSheetConfig(dashboard);
    if (!sheetConfig) {
      return NextResponse.json(
        { error: `Dashboard '${dashboard}' não configurado` }, 
        { status: 404 }
      );
    }

    // Verificar cache
    const cacheKey = `${dashboard}-${sheetConfig.spreadsheetId}-${sheetConfig.range}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`Cache hit para ${dashboard}`);
      return NextResponse.json(cached.data);
    }

    console.log(`Buscando dados da planilha para ${dashboard}:`, {
      spreadsheetId: sheetConfig.spreadsheetId,
      range: sheetConfig.range
    });

    // Buscar dados da Google Sheets (apenas dados reais)
    const sheets = await getGoogleSheetsClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetConfig.spreadsheetId,
      range: sheetConfig.range,
    });

    const values = response.data.values;
    
    if (!values || values.length === 0) {
      console.log(`Nenhum dado encontrado na planilha para ${dashboard}`);
      return NextResponse.json([]);
    }

    let normalizedData: (SheetRow | ProductSaleRow)[] = [];
    if (dashboard === 'vendas') {
      // Para 'vendas', usaremos o cabeçalho para mapear as colunas
      normalizedData = normalizeRowsVendas(values);
    } else {
      // Padrão (faturamento existente): ignora cabeçalho e usa posições fixas
      const dataRows = values.slice(1);
      normalizedData = normalizeRows(dataRows);
    }
    
    // Log específico por dashboard para evitar problemas de tipo
    if (dashboard === 'faturamento') {
      const faturamentoData = normalizedData as SheetRow[];
      console.log(`✅ Dados reais da planilha carregados para ${dashboard}:`, {
        totalRows: values.length,
        validRows: normalizedData.length,
        somaValores: faturamentoData.reduce((sum, row) => sum + (row.valor || 0), 0),
        somaCMV: faturamentoData.reduce((sum, row) => sum + (row.cmv || 0), 0),
        primeiraLinha: faturamentoData[0],
        ultimaLinha: faturamentoData[faturamentoData.length - 1]
      });
    } else {
      console.log(`✅ Dados reais da planilha carregados para ${dashboard}:`, {
        totalRows: values.length,
        validRows: normalizedData.length
      });
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
