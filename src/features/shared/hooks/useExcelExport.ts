import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import type { ModalData } from '@/features/shared/components/DetailsModal';

type ColumnConfig = {
  key: string;
  label: string;
  sortable?: boolean;
  formatter?: (value: unknown) => string;
};

type ExportConfig = {
  filename: string;
  sheetName: string;
  columns: ColumnConfig[];
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
      const row: Record<string, unknown> = {
        '#': index + 1,
      };

      config.columns.forEach(column => {
        const value = item[column.key];
        const formattedValue = column.formatter ? column.formatter(value) : value;
        row[column.label] = formattedValue;
      });

      return row;
    });

    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Configurar largura das colunas
    const colWidths = config.columns.map(column => {
      // Largura baseada no tipo de dados
      if (typeof column.key === 'string' && column.key.includes('valor')) {
        return { wch: 15 };
      }
      if (typeof column.key === 'string' && column.key.includes('data')) {
        return { wch: 12 };
      }
      return { wch: 20 };
    });

    // Adicionar largura para coluna #
    colWidths.unshift({ wch: 5 });

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
