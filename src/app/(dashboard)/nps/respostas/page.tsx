'use client';

import { useState, useEffect } from 'react';
import { useGroupFilter } from '@/hooks/useGroupFilter';
import { Modal } from '@/components/ui/modal';
import * as XLSX from 'xlsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Calendar,
  Printer,
  Star,
  ThumbsUp,
  ThumbsDown,
  Minus,
  MessageSquare,
  User,
  Building2,
  FileText,
  X,
  Download,
  FileSpreadsheet
} from 'lucide-react';

interface Resposta {
  id: string;
  nome_respondente: string;
  telefone_respondente: string | null;
  nps_score: number;
  tipo_nps: 'promotor' | 'neutro' | 'detrator';
  frequencia_visita: string | null;
  comentario: string;
  created_at: string;
  pesquisa: {
    id: string;
    nome: string;
    tipo: string;
  } | null;
  company: {
    id: string;
    name: string;
  } | null;
  employee: {
    id: string;
    name: string;
  } | null;
  como_conheceu: {
    id: string;
    texto: string;
    icone: string;
  } | null;
  respostas_perguntas: Array<{
    id: string;
    nota: number | null;
    texto_resposta: string | null;
    confirmou_uso: boolean | null;
    pergunta: {
      id: string;
      texto: string;
      categoria: string;
    };
  }>;
}

interface Company {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  company_id: string;
}

interface Pesquisa {
  id: string;
  nome: string;
  tipo: string;
}

export default function RespostasNPSPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [loading, setLoading] = useState(false);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  
  // Filtros
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedPesquisaId, setSelectedPesquisaId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [tipoNps, setTipoNps] = useState<'promotor' | 'neutro' | 'detrator' | ''>('');
  
  // Filtro de data
  const [filtroData, setFiltroData] = useState<'hoje' | 'mes' | 'entre'>('hoje');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  // Funções auxiliares de data
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  const getFirstDayOfMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  };
  
  const getLastDayOfMonth = () => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  };
  
  // Modal de detalhes
  const [showModal, setShowModal] = useState(false);
  const [selectedResposta, setSelectedResposta] = useState<Resposta | null>(null);

  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // Carregar empresas e pesquisas quando grupo mudar
  useEffect(() => {
    if (selectedGroupId) {
      fetchCompanies();
      fetchPesquisas();
    } else {
      setCompanies([]);
      setPesquisas([]);
      setEmployees([]);
      setSelectedCompanyId('');
      setSelectedPesquisaId('');
      setSelectedEmployeeId('');
    }
  }, [selectedGroupId]);

  // Carregar funcionários quando empresa mudar
  useEffect(() => {
    if (selectedCompanyId) {
      fetchEmployeesByCompany();
    } else {
      setEmployees([]);
      setSelectedEmployeeId('');
    }
  }, [selectedCompanyId]);

  // Carregar respostas quando filtros mudarem
  useEffect(() => {
    if (selectedGroupId) {
      fetchRespostas();
    } else {
      setRespostas([]);
    }
  }, [selectedGroupId, selectedCompanyId, selectedPesquisaId, selectedEmployeeId, tipoNps, filtroData, dataInicio, dataFim, page]);

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`/api/companies?group_id=${selectedGroupId}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch (err) {
      console.error('Erro ao buscar empresas:', err);
    }
  };

  const fetchPesquisas = async () => {
    try {
      const res = await fetch(`/api/nps/pesquisas?group_id=${selectedGroupId}`);
      if (res.ok) {
        const data = await res.json();
        setPesquisas(data.pesquisas || []);
      }
    } catch (err) {
      console.error('Erro ao buscar pesquisas:', err);
    }
  };

  const fetchEmployeesByCompany = async () => {
    try {
      const res = await fetch(`/api/employees?company_id=${selectedCompanyId}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Erro ao buscar funcionários:', err);
    }
  };

  const fetchRespostas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedPesquisaId) params.append('pesquisa_id', selectedPesquisaId);
      if (selectedCompanyId) params.append('company_id', selectedCompanyId);
      if (selectedEmployeeId) params.append('employee_id', selectedEmployeeId);
      
      // Aplicar filtro de data baseado no tipo selecionado
      if (filtroData === 'hoje') {
        const today = getTodayDate();
        params.append('data_inicio', today);
        params.append('data_fim', today);
      } else if (filtroData === 'mes') {
        params.append('data_inicio', getFirstDayOfMonth());
        params.append('data_fim', getLastDayOfMonth());
      } else if (filtroData === 'entre') {
        if (dataInicio) params.append('data_inicio', dataInicio);
        if (dataFim) params.append('data_fim', dataFim);
      }
      
      if (tipoNps) params.append('tipo_nps', tipoNps);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const res = await fetch(`/api/nps/respostas?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRespostas(data.respostas || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Erro ao buscar respostas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (resposta: Resposta) => {
    setSelectedResposta(resposta);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedResposta(null);
  };

  // Exportar respostas para Excel
  const exportarRespostas = () => {
    if (respostas.length === 0) return;

    const tipoNpsLabels = {
      promotor: 'Promotor',
      neutro: 'Neutro',
      detrator: 'Detrator'
    };

    const headers = ['Data', 'Nome', 'Telefone', 'Nota', 'Total', 'Tipo', 'Pesquisa', 'Funcionário', 'Empresa'];
    const rows = respostas.map((resposta) => [
      new Date(resposta.created_at).toLocaleDateString('pt-BR'),
      resposta.nome_respondente,
      resposta.telefone_respondente || '-',
      resposta.nps_score,
      5,
      tipoNpsLabels[resposta.tipo_nps],
      resposta.pesquisa?.nome || '-',
      resposta.employee?.name || '-',
      resposta.company?.name || '-'
    ]);

    const data = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Respostas');

    // Ajustar largura das colunas
    worksheet['!cols'] = [
      { wch: 12 }, // Data
      { wch: 25 }, // Nome
      { wch: 15 }, // Telefone
      { wch: 8 },  // Nota
      { wch: 8 },  // Total
      { wch: 12 }, // Tipo
      { wch: 30 }, // Pesquisa
      { wch: 25 }, // Funcionário
      { wch: 25 }  // Empresa
    ];

    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `respostas-nps-${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
  };

  // Exportar perguntas e respostas para Excel
  const exportarPerguntas = () => {
    if (respostas.length === 0) return;

    const tipoNpsLabels = {
      promotor: 'Promotor',
      neutro: 'Neutro',
      detrator: 'Detrator'
    };

    const headers = ['Pergunta', 'Categoria', 'Resposta', 'Nota', 'Total', 'Data', 'Nome', 'Telefone', 'Tipo', 'Pesquisa', 'Funcionário', 'Empresa'];
    const rows: any[] = [];

    respostas.forEach((resposta) => {
      if (resposta.respostas_perguntas && resposta.respostas_perguntas.length > 0) {
        resposta.respostas_perguntas.forEach((rp) => {
          let respostaTexto = '-';
          let nota = '-';
          let total = '-';
          
          if (rp.nota !== null) {
            nota = String(rp.nota);
            total = 5;
          }
          
          if (rp.texto_resposta) {
            respostaTexto = rp.texto_resposta;
          }

          rows.push([
            rp.pergunta.texto,
            rp.pergunta.categoria || 'Geral',
            respostaTexto,
            nota,
            total,
            new Date(resposta.created_at).toLocaleDateString('pt-BR'),
            resposta.nome_respondente,
            resposta.telefone_respondente || '-',
            tipoNpsLabels[resposta.tipo_nps],
            resposta.pesquisa?.nome || '-',
            resposta.employee?.name || '-',
            resposta.company?.name || '-'
          ]);
        });
      }
    });

    if (rows.length === 0) {
      alert('Não há perguntas e respostas para exportar.');
      return;
    }

    const data = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Perguntas e Respostas');

    // Ajustar largura das colunas
    worksheet['!cols'] = [
      { wch: 40 }, // Pergunta
      { wch: 20 }, // Categoria
      { wch: 30 }, // Resposta
      { wch: 8 },  // Nota
      { wch: 8 },  // Total
      { wch: 12 }, // Data
      { wch: 25 }, // Nome
      { wch: 15 }, // Telefone
      { wch: 12 }, // Tipo
      { wch: 30 }, // Pesquisa
      { wch: 25 }, // Funcionário
      { wch: 25 }  // Empresa
    ];

    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `perguntas-respostas-nps-${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
  };

  const handlePrint = () => {
    if (!selectedResposta) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tipoNpsLabels = {
      promotor: 'Promotor',
      neutro: 'Neutro',
      detrator: 'Detrator'
    };

    const frequenciaLabels: Record<string, string> = {
      primeira_vez: 'Primeira vez',
      raramente: 'Raramente',
      mensalmente: 'Mensalmente',
      semanalmente: 'Semanalmente',
      diariamente: 'Diariamente'
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Resposta NPS - ${selectedResposta.nome_respondente}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              color: #1f2937;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 10px;
            }
            .section {
              margin: 20px 0;
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
            }
            .section h2 {
              color: #3b82f6;
              margin-top: 0;
            }
            .info-row {
              display: flex;
              margin: 10px 0;
            }
            .info-label {
              font-weight: bold;
              width: 150px;
              color: #6b7280;
            }
            .info-value {
              flex: 1;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
            }
            .badge-promotor {
              background: #10b981;
              color: white;
            }
            .badge-neutro {
              background: #f59e0b;
              color: white;
            }
            .badge-detrator {
              background: #ef4444;
              color: white;
            }
            .stars {
              color: #fbbf24;
            }
            .comentario {
              background: white;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #3b82f6;
              margin-top: 10px;
            }
            .pergunta-item {
              background: white;
              padding: 15px;
              margin: 10px 0;
              border-radius: 8px;
              border-left: 4px solid #e5e7eb;
            }
            .pergunta-categoria {
              color: #3b82f6;
              font-weight: bold;
              margin-bottom: 5px;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <h1>Resposta NPS - ${selectedResposta.nome_respondente}</h1>
          
          <div class="section">
            <h2>Informações Gerais</h2>
            <div class="info-row">
              <span class="info-label">Nome:</span>
              <span class="info-value">${selectedResposta.nome_respondente}</span>
            </div>
            ${selectedResposta.telefone_respondente ? `
            <div class="info-row">
              <span class="info-label">Telefone:</span>
              <span class="info-value">${selectedResposta.telefone_respondente}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Data:</span>
              <span class="info-value">${new Date(selectedResposta.created_at).toLocaleString('pt-BR')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Pesquisa:</span>
              <span class="info-value">${selectedResposta.pesquisa?.nome || 'N/A'}</span>
            </div>
            ${selectedResposta.company ? `
            <div class="info-row">
              <span class="info-label">Empresa:</span>
              <span class="info-value">${selectedResposta.company.name}</span>
            </div>
            ` : ''}
            ${selectedResposta.employee ? `
            <div class="info-row">
              <span class="info-label">Funcionário:</span>
              <span class="info-value">${selectedResposta.employee.name}</span>
            </div>
            ` : ''}
          </div>

          <div class="section">
            <h2>Avaliação NPS</h2>
            <div class="info-row">
              <span class="info-label">Nota:</span>
              <span class="info-value">
                <span class="stars">${'★'.repeat(selectedResposta.nps_score)}${'☆'.repeat(5 - selectedResposta.nps_score)}</span>
                (${selectedResposta.nps_score}/5)
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Tipo:</span>
              <span class="info-value">
                <span class="badge badge-${selectedResposta.tipo_nps}">${tipoNpsLabels[selectedResposta.tipo_nps]}</span>
              </span>
            </div>
          </div>

          ${selectedResposta.frequencia_visita ? `
          <div class="section">
            <h2>Frequência de Visita</h2>
            <div class="info-value">${frequenciaLabels[selectedResposta.frequencia_visita] || selectedResposta.frequencia_visita}</div>
          </div>
          ` : ''}

          ${selectedResposta.como_conheceu ? `
          <div class="section">
            <h2>Como Conheceu</h2>
            <div class="info-value">${selectedResposta.como_conheceu.icone} ${selectedResposta.como_conheceu.texto}</div>
          </div>
          ` : ''}

          ${selectedResposta.respostas_perguntas && selectedResposta.respostas_perguntas.length > 0 ? `
          <div class="section">
            <h2>Respostas das Perguntas</h2>
            ${selectedResposta.respostas_perguntas.map((rp: any) => `
              <div class="pergunta-item">
                <div class="pergunta-categoria">${rp.pergunta.categoria || 'Geral'}</div>
                <div style="margin-bottom: 10px;"><strong>${rp.pergunta.texto}</strong></div>
                ${rp.confirmou_uso !== null ? `
                  <div style="margin-bottom: 10px;">
                    <span style="color: #6b7280;">Confirmação de uso:</span>
                    <strong>${rp.confirmou_uso ? 'Sim' : 'Não'}</strong>
                  </div>
                ` : ''}
                ${rp.nota !== null ? `
                  <div style="margin-bottom: 10px;">
                    <span style="color: #6b7280;">Nota:</span>
                    <span class="stars">${'★'.repeat(rp.nota)}${'☆'.repeat(5 - rp.nota)}</span>
                    (${rp.nota}/5)
                  </div>
                ` : ''}
                ${rp.texto_resposta ? `
                  <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
                    <div style="color: #6b7280; margin-bottom: 5px;">Resposta:</div>
                    <div>${rp.texto_resposta}</div>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
          ` : ''}

          <div class="section">
            <h2>Comentário</h2>
            <div class="comentario">${selectedResposta.comentario}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const getTipoNpsBadge = (tipo: string) => {
    const badges = {
      promotor: { label: 'Promotor', color: 'bg-green-100 text-green-700', icon: ThumbsUp },
      neutro: { label: 'Neutro', color: 'bg-yellow-100 text-yellow-700', icon: Minus },
      detrator: { label: 'Detrator', color: 'bg-red-100 text-red-700', icon: ThumbsDown }
    };
    const badge = badges[tipo as keyof typeof badges] || badges.neutro;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Respostas NPS</h1>
          <p className="text-gray-500 mt-1">Acompanhe todas as respostas das pesquisas</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                disabled={loading || respostas.length === 0}
                title="Exportar Excel"
              >
                <Download size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={exportarRespostas} className="cursor-pointer">
                <FileText size={16} className="mr-2" />
                Exportar Respostas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportarPerguntas} className="cursor-pointer">
                <FileText size={16} className="mr-2" />
                Exportar Perguntas e Respostas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={fetchRespostas}
            disabled={loading}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Grupo */}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
          {isGroupReadOnly ? (
            <input
              type="text"
              value={groupName}
              disabled
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
            />
          ) : (
            <select
              value={selectedGroupId || ''}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {(groups || []).map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Empresa */}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            disabled={!selectedGroupId}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Todas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Pesquisa */}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Pesquisa</label>
          <select
            value={selectedPesquisaId}
            onChange={(e) => setSelectedPesquisaId(e.target.value)}
            disabled={!selectedGroupId}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Todas</option>
            {pesquisas.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        {/* Funcionário */}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário</label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            disabled={!selectedCompanyId}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Todos</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        {/* Tipo NPS */}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo NPS</label>
          <select
            value={tipoNps}
            onChange={(e) => setTipoNps(e.target.value as any)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="promotor">Promotor</option>
            <option value="neutro">Neutro</option>
            <option value="detrator">Detrator</option>
          </select>
        </div>

        {/* Filtro de Data */}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
          <select
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value as 'hoje' | 'mes' | 'entre')}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="hoje">Hoje</option>
            <option value="mes">Este Mês</option>
            <option value="entre">Entre</option>
          </select>
        </div>

        {/* Campos de Data (apenas quando "Entre" está selecionado) */}
        {filtroData === 'entre' && (
          <>
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        ) : respostas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText size={48} className="mx-auto mb-4 text-gray-400" />
            <p>Nenhuma resposta encontrada</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nota</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pesquisa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {respostas.map((resposta) => (
                    <tr
                      key={resposta.id}
                      onClick={() => handleOpenModal(resposta)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{resposta.nome_respondente}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Star size={16} className="text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-medium text-gray-900">{resposta.nps_score}/5</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTipoNpsBadge(resposta.tipo_nps)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-600">{resposta.company?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{resposta.pesquisa?.nome || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {new Date(resposta.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ChevronRight size={18} className="text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} respostas
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Detalhes */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Detalhes da Resposta"
        size="xl"
      >
        {selectedResposta && (
          <div className="space-y-4">
            <div className="flex items-center justify-end mb-4">
              <button
                onClick={() => {
                  setTimeout(handlePrint, 100);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Printer size={16} />
                Imprimir
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">Informações Gerais</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Nome:</span> <span className="font-medium">{selectedResposta.nome_respondente}</span></div>
                  {selectedResposta.telefone_respondente && (
                    <div><span className="text-gray-500">Telefone:</span> <span className="font-medium">{selectedResposta.telefone_respondente}</span></div>
                  )}
                  <div><span className="text-gray-500">Data:</span> <span className="font-medium">{new Date(selectedResposta.created_at).toLocaleString('pt-BR')}</span></div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">Avaliação NPS</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Nota:</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={i < selectedResposta.nps_score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                        />
                      ))}
                      <span className="font-medium ml-1">({selectedResposta.nps_score}/5)</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Tipo: </span>
                    {getTipoNpsBadge(selectedResposta.tipo_nps)}
                  </div>
                </div>
              </div>

              {selectedResposta.frequencia_visita && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-2">Frequência de Visita</h4>
                  <p className="text-sm">{selectedResposta.frequencia_visita}</p>
                </div>
              )}

              {selectedResposta.como_conheceu && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-2">Como Conheceu</h4>
                  <p className="text-sm">{selectedResposta.como_conheceu.icone} {selectedResposta.como_conheceu.texto}</p>
                </div>
              )}
            </div>

            {selectedResposta.respostas_perguntas && selectedResposta.respostas_perguntas.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-4">Respostas das Perguntas</h4>
                <div className="space-y-4">
                  {selectedResposta.respostas_perguntas.map((rp) => (
                    <div key={rp.id} className="border-l-4 border-blue-500 pl-4">
                      <div className="text-sm font-medium text-blue-600 mb-1">
                        {rp.pergunta.categoria || 'Geral'}
                      </div>
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        {rp.pergunta.texto}
                      </div>
                      {rp.confirmou_uso === true && (
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="text-gray-500">Confirmação de uso:</span>{' '}
                          <span className="text-green-600 font-medium">Sim</span>
                        </div>
                      )}
                      {rp.nota !== null && (
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <span className="text-gray-500">Nota:</span>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={i < (rp.nota || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                              />
                            ))}
                            <span className="font-medium">({rp.nota}/5)</span>
                          </div>
                        </div>
                      )}
                      {rp.texto_resposta && (
                        <div className="text-sm text-gray-600 mt-2 p-2 bg-white rounded">
                          {rp.texto_resposta}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MessageSquare size={18} />
                Comentário
              </h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedResposta.comentario}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
