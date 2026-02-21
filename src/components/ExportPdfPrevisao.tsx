'use client';

import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Download } from 'lucide-react';

const MONTHS_PDF = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export interface PrevisaoDataPDF {
  empresa: { id: string; name: string };
  periodo: { year: number; month: number };
  realizado: { total: number; diasPassados: number; mediaDiaria: number };
  diasRestantes: { total: number; diasUteis: number; sabados: number; domingos: number; feriados: number };
  cenarios: { otimista: number; realista: number; pessimista: number };
  grafico: Array<{
    dia: number;
    data: string;
    realizado: number | null;
    otimista: number | null;
    realista: number | null;
    pessimista: number | null;
  }>;
  projecaoDiaria: Array<{
    dia: number;
    data: string;
    tipoDia: string;
    otimista: number;
    realista: number;
    pessimista: number;
  }>;
  estatisticas: { media: number; mediana: number; tendencia: string };
}

interface ExportPdfPrevisaoProps {
  previsaoData: PrevisaoDataPDF;
  companyGoal: number;
  selectedMonth: number;
  selectedYear: number;
  logoUrl?: string;
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const now = new Date();
  const dateStr = now.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Gerado em ${dateStr} — Página ${pageNum}/${totalPages}`, 14, doc.internal.pageSize.getHeight() - 10);
  doc.text('Vionup — Sistema de Gestão', doc.internal.pageSize.getWidth() - 14 - doc.getTextWidth('Vionup — Sistema de Gestão'), doc.internal.pageSize.getHeight() - 10, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

export function ExportPdfPrevisao({
  previsaoData,
  companyGoal,
  selectedMonth,
  selectedYear,
  logoUrl = '/logo-vionup.png'
}: ExportPdfPrevisaoProps) {
  const [loading, setLoading] = useState(false);

  const generatePdf = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;
      let y = 20;

      const monthLabel = MONTHS_PDF[selectedMonth - 1] || '';
      const fileName = `Previsao_${previsaoData.empresa.name.replace(/\s+/g, '_')}_${monthLabel}_${selectedYear}.pdf`;

      const loadLogoAsDataUrl = (): Promise<string | null> =>
        new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
              } else resolve(null);
            } catch {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = logoUrl;
        });

      const logoData = await loadLogoAsDataUrl();
      if (logoData) {
        doc.addImage(logoData, 'PNG', margin, 10, 28, 12);
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(previsaoData.empresa.name, margin + (logoData ? 32 : 0), 18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Previsão de Vendas — ${monthLabel} ${selectedYear}`, margin, 26);
      y = 34;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo', margin, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      doc.text(`Meta: ${companyGoal > 0 ? formatCurrency(companyGoal) : 'Sem meta'}`, margin, y);
      doc.text(`Realizado: ${formatCurrency(previsaoData.realizado.total)}`, margin + 55, y);
      doc.text(`Média diária: ${formatCurrency(previsaoData.realizado.mediaDiaria)}`, margin + 110, y);
      y += 6;
      doc.text(`Dias passados: ${previsaoData.realizado.diasPassados}`, margin, y);
      doc.text(`Dias restantes: ${previsaoData.diasRestantes.total} (${previsaoData.diasRestantes.diasUteis} úteis)`, margin + 55, y);
      y += 10;

      doc.setFont('helvetica', 'bold');
      doc.text('Cenários', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(`Otimista: ${formatCurrency(previsaoData.cenarios.otimista)}`, margin, y);
      doc.text(`Realista: ${formatCurrency(previsaoData.cenarios.realista)}`, margin + 65, y);
      doc.text(`Pessimista: ${formatCurrency(previsaoData.cenarios.pessimista)}`, margin + 130, y);
      y += 10;

      doc.setFont('helvetica', 'bold');
      doc.text('Estatísticas', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(`Média: ${formatCurrency(previsaoData.estatisticas.media)}  |  Mediana: ${formatCurrency(previsaoData.estatisticas.mediana)}  |  Tendência: ${previsaoData.estatisticas.tendencia}`, margin, y);
      y += 12;

      addFooter(doc, 1, 3);

      // ——— Página 2: Projeção por dia ———
      doc.addPage();
      y = 18;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Projeção por dia', margin, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      const colDia = margin;
      const colTipo = margin + 14;
      const colOtim = margin + 38;
      const colReal = margin + 72;
      const colPess = margin + 106;
      const lineHeight = 5.5;

      doc.setFont('helvetica', 'bold');
      doc.text('Dia', colDia, y);
      doc.text('Tipo', colTipo, y);
      doc.text('Otimista', colOtim, y);
      doc.text('Realista', colReal, y);
      doc.text('Pessimista', colPess, y);
      y += lineHeight + 2;
      doc.setFont('helvetica', 'normal');

      let totO = 0, totR = 0, totP = 0;
      for (const row of previsaoData.projecaoDiaria) {
        if (y > 270) {
          doc.addPage();
          y = 18;
        }
        doc.text(String(row.dia), colDia, y);
        doc.text(row.tipoDia || 'Útil', colTipo, y);
        doc.text(formatCurrency(row.otimista), colOtim, y);
        doc.text(formatCurrency(row.realista), colReal, y);
        doc.text(formatCurrency(row.pessimista), colPess, y);
        totO += row.otimista;
        totR += row.realista;
        totP += row.pessimista;
        y += lineHeight;
      }
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.text('Total', colDia, y);
      doc.text(formatCurrency(totO), colOtim, y);
      doc.text(formatCurrency(totR), colReal, y);
      doc.text(formatCurrency(totP), colPess, y);

      addFooter(doc, 2, 3);

      // ——— Página 3: Projeção acumulada (gráfico dia a dia) ———
      doc.addPage();
      y = 18;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Projeção acumulada por dia', margin, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      const cDia = margin;
      const cReal = margin + 22;
      const cOtim = margin + 58;
      const cRealista = margin + 94;
      const cPess = margin + 130;

      doc.setFont('helvetica', 'bold');
      doc.text('Dia', cDia, y);
      doc.text('Realizado', cReal, y);
      doc.text('Otimista', cOtim, y);
      doc.text('Realista', cRealista, y);
      doc.text('Pessimista', cPess, y);
      y += lineHeight + 2;
      doc.setFont('helvetica', 'normal');

      for (const row of previsaoData.grafico) {
        if (y > 270) {
          doc.addPage();
          y = 18;
        }
        doc.text(String(row.dia), cDia, y);
        doc.text(row.realizado != null ? formatCurrency(row.realizado) : '—', cReal, y);
        doc.text(row.otimista != null ? formatCurrency(row.otimista) : '—', cOtim, y);
        doc.text(row.realista != null ? formatCurrency(row.realista) : '—', cRealista, y);
        doc.text(row.pessimista != null ? formatCurrency(row.pessimista) : '—', cPess, y);
        y += lineHeight;
      }

      addFooter(doc, 3, 3);

      doc.save(fileName);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={generatePdf}
      disabled={loading}
      title="Exportar PDF"
      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center"
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <Download size={20} />
      )}
    </button>
  );
}
