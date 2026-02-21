import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

// Tons de azul para formatação
const BLUE_HEADER = 'FF1e40af';      // azul escuro cabeçalho tabela
const BLUE_BORDER = 'FF93c5fd';     // azul bordas
const LIGHT_BLUE_ROW = 'FFeff6ff';  // azul bem claro linhas alternadas

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, target_date, items } = body as {
      name?: string;
      target_date?: string;
      items?: { raw_material_name?: string; parent_name?: string; unit?: string; adjusted_quantity?: number }[];
    };

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'items é obrigatório e deve ser um array' }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    const sheetName = (name || 'Lista').replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || 'Lista';
    const worksheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
    // Oculta linhas de grade (como desmarcar "Linhas de Grade" em Exibir)
    worksheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: false }];

    // ------ Linha 1: Cabeçalho da tabela (Produto, Grupo, Unidade, Quantidade)
    const headerRow = worksheet.getRow(1);
    const headerLabels = ['Produto', 'Grupo', 'Unidade', 'Quantidade'];
    headerLabels.forEach((label, colIndex) => {
      const cell = headerRow.getCell(colIndex + 1);
      cell.value = label;
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BLUE_HEADER }
      };
      cell.alignment = { horizontal: colIndex === 2 ? 'center' : 'left', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: BLUE_BORDER } },
        bottom: { style: 'thin', color: { argb: BLUE_BORDER } },
        left: { style: 'thin', color: { argb: BLUE_BORDER } },
        right: { style: 'thin', color: { argb: BLUE_BORDER } }
      };
    });
    headerRow.height = 24;

    // ------ Linhas de dados
    items.forEach((item, index) => {
      const rowIndex = 2 + index;
      const row = worksheet.getRow(rowIndex);
      const qty = typeof item.adjusted_quantity === 'number' ? item.adjusted_quantity : Number(item.adjusted_quantity) || 0;
      const values = [item.raw_material_name ?? '', item.parent_name ?? '', item.unit ?? '', qty];

      values.forEach((val, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = val;
        cell.font = { size: 11, color: { argb: 'FF1f2937' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : LIGHT_BLUE_ROW }
        };
        cell.alignment = {
          horizontal: colIndex === 2 || colIndex === 3 ? 'center' : 'left',
          vertical: 'middle',
          wrapText: true
        };
        cell.border = {
          top: { style: 'thin', color: { argb: BLUE_BORDER } },
          bottom: { style: 'thin', color: { argb: BLUE_BORDER } },
          left: { style: 'thin', color: { argb: BLUE_BORDER } },
          right: { style: 'thin', color: { argb: BLUE_BORDER } }
        };
        if (colIndex === 3) cell.numFmt = '0';
      });
      row.height = 22;
    });

    // ------ Larguras das colunas
    worksheet.getColumn(1).width = 38;
    worksheet.getColumn(2).width = 22;
    worksheet.getColumn(3).width = 10;
    worksheet.getColumn(4).width = 14;

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `lista-compra-${(name || 'lista').replace(/\s+/g, '-')}-${target_date || new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Erro ao gerar Excel:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar Excel' },
      { status: 500 }
    );
  }
}
