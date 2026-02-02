import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    // Criar workbook
    const workbook = XLSX.utils.book_new();

    // Planilha de exemplo
    const data = [
      // Cabeçalhos
      ['Tipo', 'Descrição', 'Valor Meta (R$)', 'Observações'],
      // Faturamento da Empresa (obrigatório)
      ['Faturamento Empresa', 'Meta principal da empresa', '100000.00', 'Valor total em R$'],
      // Turnos (opcional - pode ter ou não)
      ['Turno', 'Almoço', '50000.00', 'Derivado do faturamento empresa'],
      ['Turno', 'Jantar', '50000.00', 'Derivado do faturamento empresa'],
      // Modos de venda (opcional - pode ter ou não)
      ['Modo Venda', 'Delivery', '25000.00', 'Derivado do turno Almoço'],
      ['Modo Venda', 'Loja', '25000.00', 'Derivado do turno Almoço'],
      ['Modo Venda', 'Delivery', '25000.00', 'Derivado do turno Jantar'],
      ['Modo Venda', 'Loja', '25000.00', 'Derivado do turno Jantar'],
    ];

    // Criar worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Ajustar largura das colunas
    worksheet['!cols'] = [
      { wch: 20 }, // Tipo
      { wch: 30 }, // Descrição
      { wch: 18 }, // Valor Meta
      { wch: 40 }  // Observações
    ];

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Metas');

    // Gerar buffer do Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Retornar arquivo
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="modelo-metas.xlsx"'
      }
    });
  } catch (error) {
    console.error('Erro ao gerar template:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar template' },
      { status: 500 }
    );
  }
}
