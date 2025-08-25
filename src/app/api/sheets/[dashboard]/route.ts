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
}

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

// Função para normalizar os dados da planilha
function normalizeRows(values: string[][]): SheetRow[] {
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

// Cache para dados (evita requisições desnecessárias)
const cache = new Map<string, { data: SheetRow[]; timestamp: number }>();
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

    // Pular a primeira linha (cabeçalho)
    const dataRows = values.slice(1);
    const normalizedData = normalizeRows(dataRows);
    
    console.log(`✅ Dados reais da planilha carregados para ${dashboard}:`, {
      totalRows: values.length,
      validRows: normalizedData.length
    });

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
