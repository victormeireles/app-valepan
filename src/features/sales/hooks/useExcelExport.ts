import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import type { ModalData } from '@/features/sales/types';

type ExportConfig = {
  filename: string;
  sheetName: string;
  meta: { hasPackages: boolean; hasBoxes: boolean; hasCustomerType: boolean } | null;
};

export function useExcelExport() {
  const exportToExcel = useCallback((
    data: ModalData[], 
    config: ExportConfig
  ) => {
    if (!data || data.length === 0) {
      alert('Nenhum dado para exportar');
      return;
    }

    // Preparar dados para Excel
    const excelData = data.map((item, index) => {
      const key = (item as { produto?: string; cliente?: string }).produto ?? (item as { cliente?: string }).cliente ?? '-';
      const unidades = (item as { unidades?: number }).unidades ?? 0;
      const pacotes = (item as { pacotes?: number }).pacotes ?? 0;
      const caixas = (item as { caixas?: number }).caixas ?? 0;
      const valor = (item as { valor?: number }).valor ?? 0;
      const mb = typeof (item as { mb?: number }).mb === 'number' ? Math.round((item as { mb?: number }).mb ?? 0) : 0;
      const pmp = config.meta?.hasPackages ? ((item as { pmp?: number }).pmp ?? 0) : (unidades > 0 ? valor / unidades : 0);
      const cmp = config.meta?.hasPackages ? ((item as { cmp?: number }).cmp ?? 0) : (unidades > 0 ? ((item as { cmv?: number }).cmv ?? 0) / unidades : 0);

      const row: Record<string, unknown> = {
        '#': index + 1,
        [config.meta?.hasPackages ? 'Produto' : 'Cliente']: key,
        'Unidades': unidades,
      };

      if (config.meta?.hasPackages) {
        row['Pacotes'] = pacotes;
      }
      
      if (config.meta?.hasBoxes) {
        row['Caixas'] = caixas;
      }

      row['Valor (R$)'] = valor;
      row['Margem Bruta (%)'] = mb;
      row[config.meta?.hasPackages ? 'PMP (R$)' : 'PMV (R$)'] = pmp;
      row[config.meta?.hasPackages ? 'CMP (R$)' : 'CMV (R$)'] = cmp;

      return row;
    });

    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Configurar largura das colunas
    const colWidths = [
      { wch: 5 },   // #
      { wch: 25 },  // Produto/Cliente
      { wch: 12 },  // Unidades
    ];

    if (config.meta?.hasPackages) {
      colWidths.push({ wch: 12 }); // Pacotes
    }
    
    if (config.meta?.hasBoxes) {
      colWidths.push({ wch: 12 }); // Caixas
    }

    colWidths.push(
      { wch: 15 }, // Valor
      { wch: 15 }, // Margem Bruta
      { wch: 12 }, // PMP/PMV
      { wch: 12 }  // CMP/CMV
    );

    ws['!cols'] = colWidths;

    // Adicionar planilha ao workbook
    XLSX.utils.book_append_sheet(wb, ws, config.sheetName);

    // Gerar nome do arquivo com timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${config.filename}_${timestamp}.xlsx`;

    // Fazer download
    XLSX.writeFile(wb, filename);
  }, []);

  return { exportToExcel };
}
