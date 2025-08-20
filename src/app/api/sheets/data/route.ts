import { google } from 'googleapis';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Configuração do Google Sheets (comentadas pois usando dados demo)
// const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
// const RANGE = process.env.SHEETS_RANGE || 'M:Q';

interface SheetRow {
  nfValida: boolean;
  anoMes: string;
  data: Date;
  cliente: string;
  valor: number;
}

// Função para autenticar com Google Sheets usando as credenciais do NextAuth (não utilizada no momento)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getGoogleSheetsClient() {
  const session = await auth();
  
  if (!session?.accessToken) {
    throw new Error('Não foi possível obter token de acesso');
  }

  const authClient = new google.auth.OAuth2();
  authClient.setCredentials({
    access_token: session.accessToken,
  });

  return google.sheets({ version: 'v4', auth: authClient });
}

// Função para normalizar os dados da planilha (não utilizada no momento)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// Função para gerar dados demo (para desenvolvimento/teste)
function generateDemoData(): SheetRow[] {
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

export async function GET() {
  try {
    // Verificar se o usuário está autenticado
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Por enquanto, retornar dados demo
    // TODO: Descomentar quando quiser usar dados reais da planilha
    /*
    if (!SPREADSHEET_ID) {
      return NextResponse.json({ error: 'SPREADSHEET_ID não configurado' }, { status: 500 });
    }

    const sheets = await getGoogleSheetsClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const values = response.data.values;
    
    if (!values || values.length === 0) {
      return NextResponse.json([]);
    }

    // Pular a primeira linha (cabeçalho)
    const dataRows = values.slice(1);
    const normalizedData = normalizeRows(dataRows);
    */

    // Usar dados demo por enquanto
    const demoData = generateDemoData();
    
    return NextResponse.json(demoData);
  } catch (error) {
    console.error('Erro ao buscar dados da planilha:', error);
    return NextResponse.json(
      { error: 'Falha ao carregar dados da planilha' }, 
      { status: 500 }
    );
  }
}
