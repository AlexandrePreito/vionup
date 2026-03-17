'use client';

import { useState, useEffect, useRef } from 'react';
import { useGroupFilter } from '@/hooks/useGroupFilter';
import {
  Loader2,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Minus,
  MessageSquare,
  Star,
  TrendingUp,
  Users,
  User,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertCircle,
  Check,
  ScanSearch,
  X
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { MobileExpandableCard } from '@/components/MobileExpandableCard';

interface NPSData {
  periodo: { year: number; month: number };
  nps: {
    score: number;
    promotores: number;
    neutros: number;
    detratores: number;
    total: number;
    percentPromotor: number;
    percentNeutro: number;
    percentDetrator: number;
  };
  scores: Record<string, number>;
  evolucao: { mes: string; mesNome: string; nps_score: number | null; total: number }[];
  comentarios: {
    data: string;
    nota: number;
    comentario: string;
    tipo: 'promotor' | 'neutro' | 'detrator';
    unidade: string;
    garcom: string | null;
  }[];
  frequencia: { opcao: string; frequencia: number }[];
  origem: { opcao: string; icone: string; frequencia: number }[];
  pesquisaCards: { id: string; nome: string; tipo: string; total: number }[];
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Funções de cor NPS
const getNPSColor = (score: number) => {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 50) return 'text-lime-600';
  if (score >= 0) return 'text-amber-500';
  return 'text-red-500';
};

const getNPSBgColor = (score: number) => {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-lime-500';
  if (score >= 0) return 'bg-amber-500';
  return 'bg-red-500';
};

const getNPSLabel = (score: number) => {
  if (score >= 75) return 'Excelente';
  if (score >= 50) return 'Muito Bom';
  if (score >= 0) return 'Razoável';
  return 'Crítico';
};

// Componente Score Card
const ScoreCard = ({ label, score }: { label: string; score: number }) => {
  const getScoreColor = (s: number) => {
    if (s >= 4.5) return 'text-emerald-600';
    if (s >= 4) return 'text-lime-600';
    if (s >= 3) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-sm text-gray-600 mb-2 truncate">{label}</p>
      <div className="flex items-center gap-2">
        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
          {score.toFixed(2)}
        </span>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={14}
              className={star <= Math.round(score) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default function DashboardNPSPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState<NPSData | null>(null);
  const [commentFilter, setCommentFilter] = useState<'todos' | 'promotor' | 'neutro' | 'detrator'>('todos');
  const [showAllComments, setShowAllComments] = useState(false);
  const [pesquisas, setPesquisas] = useState<{ id: string; nome: string; tipo: string }[]>([]);
  const [selectedPesquisaIds, setSelectedPesquisaIds] = useState<string[]>([]);
  const [pesquisaDropdownOpen, setPesquisaDropdownOpen] = useState(false);
  const pesquisaDropdownRef = useRef<HTMLDivElement>(null);
  const [evolucaoPor, setEvolucaoPor] = useState<'dia' | 'mes'>('dia');

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pesquisaDropdownRef.current && !pesquisaDropdownRef.current.contains(event.target as Node)) {
        setPesquisaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Carregar empresas do grupo
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!selectedGroupId) {
        console.log('NPS Page - selectedGroupId vazio, limpando empresas');
        setCompanies([]);
        setSelectedCompanyId('');
        return;
      }
      console.log('NPS Page - Buscando empresas para grupo:', selectedGroupId);
      try {
        const res = await fetch(`/api/companies?group_id=${selectedGroupId}`);
        if (res.ok) {
          const data = await res.json();
          const companiesList = data.companies || data || [];
          console.log('NPS Page - Empresas retornadas:', companiesList.length);
          console.log('NPS Page - Empresas:', companiesList.map((c: any) => ({ id: c.id, name: c.name, group_id: c.company_group_id })));
          
          // Validação de segurança: filtrar apenas empresas do grupo selecionado
          const filteredCompanies = companiesList.filter((c: any) => c.company_group_id === selectedGroupId);
          if (filteredCompanies.length !== companiesList.length) {
            console.warn('NPS Page - ATENÇÃO: Algumas empresas foram filtradas por não pertencerem ao grupo!');
            console.warn('NPS Page - Total recebido:', companiesList.length, 'Total filtrado:', filteredCompanies.length);
          }
          
          setCompanies(filteredCompanies);
        } else {
          console.error('NPS Page - Erro ao buscar empresas:', res.status, res.statusText);
        }
      } catch (err) {
        console.error('NPS Page - Erro ao buscar empresas:', err);
      }
    };
    fetchCompanies();
  }, [selectedGroupId]);

  // Carregar funcionários da empresa
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!selectedCompanyId) {
        setEmployees([]);
        setSelectedEmployeeId('');
        return;
      }
      try {
        const res = await fetch(`/api/employees?company_id=${selectedCompanyId}`);
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.employees || data || []);
        }
      } catch (err) {
        console.error('Erro ao buscar funcionários:', err);
      }
    };
    fetchEmployees();
  }, [selectedCompanyId]);

  // Carregar pesquisas do grupo
  useEffect(() => {
    const fetchPesquisas = async () => {
      if (!selectedGroupId) {
        setPesquisas([]);
        setSelectedPesquisaIds([]);
        return;
      }
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
    fetchPesquisas();
  }, [selectedGroupId]);

  // Carregar dados NPS
  const fetchNPSData = async () => {
    if (!selectedGroupId) return;

    setLoading(true);
    try {
      let url = `/api/nps/dashboard?group_id=${selectedGroupId}&year=${selectedYear}&month=${selectedMonth}`;
      if (selectedCompanyId) url += `&company_id=${selectedCompanyId}`;
      if (selectedEmployeeId) url += `&employee_id=${selectedEmployeeId}`;
      if (selectedPesquisaIds.length > 0) url += `&pesquisa_ids=${selectedPesquisaIds.join(',')}`;
      url += `&evolucao_por=${evolucaoPor}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setData(data);
      }
    } catch (err) {
      console.error('Erro ao buscar dados NPS:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      fetchNPSData();
    }
  }, [selectedGroupId, selectedCompanyId, selectedEmployeeId, selectedYear, selectedMonth, selectedPesquisaIds, evolucaoPor]);

  // Filtrar comentários
  const filteredComments = data?.comentarios.filter(
    c => commentFilter === 'todos' || c.tipo === commentFilter
  ) || [];
  const displayedComments = showAllComments ? filteredComments : filteredComments.slice(0, 5);

  // Anos disponíveis
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard NPS</h1>
        <p className="text-gray-500 text-sm mt-1">Acompanhamento de satisfação dos clientes</p>
      </div>

      {/* Filtros - em mobile: um abaixo do outro, mesma largura */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-4">
        {/* Grupo */}
        <div className="w-full sm:w-48">
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
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setSelectedCompanyId('');
                setSelectedEmployeeId('');
              }}
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
        <div className="w-full sm:w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => {
              setSelectedCompanyId(e.target.value);
              setSelectedEmployeeId('');
            }}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={!selectedGroupId}
          >
            <option value="">Todas</option>
            {companies.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Funcionário */}
        <div className="w-full sm:w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário</label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={!selectedCompanyId}
          >
            <option value="">Todos</option>
            {employees.map((e: any) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        {/* Pesquisa (multi-select dropdown) */}
        <div className="w-full sm:w-56 relative" ref={pesquisaDropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pesquisa</label>
          <button
            type="button"
            onClick={() => setPesquisaDropdownOpen((o) => !o)}
            disabled={!selectedGroupId}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between gap-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="truncate">
              {selectedPesquisaIds.length === 0
                ? 'Todas'
                : selectedPesquisaIds.length === 1
                  ? pesquisas.find((p) => p.id === selectedPesquisaIds[0])?.nome ?? '1 pesquisa'
                  : `${selectedPesquisaIds.length} pesquisas`}
            </span>
            <ChevronDown size={16} className={`flex-shrink-0 transition-transform ${pesquisaDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {pesquisaDropdownOpen && (
            <div className="absolute z-50 mt-1 w-full min-w-[220px] bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-auto">
              {pesquisas.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">Nenhuma pesquisa</div>
              ) : (
                <>
                  {pesquisas.map((p) => {
                    const isSelected = selectedPesquisaIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPesquisaIds((prev) =>
                            isSelected ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                          );
                        }}
                        className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-gray-50 rounded mx-1"
                      >
                        <span
                          className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                        </span>
                        <span className="truncate text-gray-800">{p.nome}</span>
                      </button>
                    );
                  })}
                  {selectedPesquisaIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedPesquisaIds([])}
                      className="w-full px-3 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-100 border-t border-gray-100 flex items-center gap-2 rounded-b-lg"
                    >
                      <span className="flex-shrink-0 w-4 h-4 rounded border-2 border-gray-300 bg-white flex items-center justify-center">
                        <X size={12} className="text-gray-400" />
                      </span>
                      Limpar seleção
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Mês */}
        <div className="w-full sm:w-40">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>

        {/* Ano */}
        <div className="w-full sm:w-28">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Botão Atualizar */}
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-2">&nbsp;</label>
          <button
            onClick={fetchNPSData}
            disabled={loading || !selectedGroupId}
            title="Atualizar Dados"
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <RefreshCw size={20} />
            )}
          </button>
        </div>
      </div>

      {/* Mensagem se não selecionou grupo */}
      {!selectedGroupId && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-8 text-center">
          <Calendar size={48} className="mx-auto text-indigo-400 mb-4" />
          <h3 className="text-lg font-medium text-indigo-900">Selecione um grupo</h3>
          <p className="text-indigo-600 mt-1">Escolha um grupo para visualizar o dashboard de NPS</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && data && (
        <div className="space-y-4 md:space-y-6">
          {/* Cards por tipo de pesquisa (acima do NPS e distribuição) */}
          {(data.pesquisaCards?.length ?? 0) > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.pesquisaCards.map((card) => (
                <div
                  key={card.id}
                  className={`rounded-xl border shadow-sm p-4 flex items-center gap-4 transition-shadow hover:shadow-md ${
                    card.tipo === 'cliente_misterioso'
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                      card.tipo === 'cliente_misterioso'
                        ? 'bg-purple-500 text-white'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    {card.tipo === 'cliente_misterioso' ? (
                      <ScanSearch size={24} />
                    ) : (
                      <User size={24} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate" title={card.nome}>
                      {card.nome}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {card.tipo === 'cliente_misterioso' ? 'Cliente Misterioso' : 'Pesquisa de Experiência'}
                    </p>
                    <p className="text-xl font-bold text-gray-900 mt-2">
                      {card.total.toLocaleString()}
                      <span className="text-sm font-normal text-gray-600 ml-1">respostas</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Row 1: NPS Principal + Distribuição - em mobile: um abaixo do outro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card NPS Principal */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-bl-full" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Star size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">NPS Score</h3>
                  <p className="text-sm text-gray-500">
                    {MONTHS[data.periodo.month - 1]} {data.periodo.year}
                  </p>
                </div>
              </div>

              <div className="text-center py-4">
                <div className={`text-6xl font-bold ${getNPSColor(data.nps.score)}`}>
                  {data.nps.score.toFixed(0)}
                </div>
                <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  data.nps.score >= 75 ? 'bg-emerald-100 text-emerald-700' :
                  data.nps.score >= 50 ? 'bg-lime-100 text-lime-700' :
                  data.nps.score >= 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  {getNPSLabel(data.nps.score)}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total de respostas</span>
                  <span className="font-semibold text-gray-900">{data.nps.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Card Distribuição */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Distribuição de Respostas</h3>
                  <p className="text-sm text-gray-500">Promotores, Neutros e Detratores</p>
                </div>
              </div>

              {/* Barra de distribuição */}
              <div className="mb-6">
                <div className="h-8 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-emerald-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                    style={{ width: `${data.nps.percentPromotor}%` }}
                  >
                    {data.nps.percentPromotor > 10 && `${data.nps.percentPromotor.toFixed(1)}%`}
                  </div>
                  <div 
                    className="bg-amber-400 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                    style={{ width: `${data.nps.percentNeutro}%` }}
                  >
                    {data.nps.percentNeutro > 10 && `${data.nps.percentNeutro.toFixed(1)}%`}
                  </div>
                  <div 
                    className="bg-red-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                    style={{ width: `${data.nps.percentDetrator}%` }}
                  >
                    {data.nps.percentDetrator > 10 && `${data.nps.percentDetrator.toFixed(1)}%`}
                  </div>
                </div>
              </div>

              {/* Cards de cada tipo - em mobile: uma coluna */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Promotores */}
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp size={18} className="text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">Promotores</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">{data.nps.promotores.toLocaleString()}</p>
                  <p className="text-xs text-emerald-500 mt-1">Notas 4-5</p>
                  <p className="text-lg font-semibold text-emerald-600 mt-2">{data.nps.percentPromotor.toFixed(1)}%</p>
                </div>

                {/* Neutros */}
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Minus size={18} className="text-amber-600" />
                    <span className="text-sm font-medium text-amber-700">Neutros</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">{data.nps.neutros.toLocaleString()}</p>
                  <p className="text-xs text-amber-500 mt-1">Nota 3</p>
                  <p className="text-lg font-semibold text-amber-600 mt-2">{data.nps.percentNeutro.toFixed(1)}%</p>
                </div>

                {/* Detratores */}
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsDown size={18} className="text-red-600" />
                    <span className="text-sm font-medium text-red-700">Detratores</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{data.nps.detratores.toLocaleString()}</p>
                  <p className="text-xs text-red-500 mt-1">Notas 1-2</p>
                  <p className="text-lg font-semibold text-red-600 mt-2">{data.nps.percentDetrator.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Scores por Categoria - mobile: dados direto na tela; desktop: card */}
          <div className="md:hidden">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Avaliações por Categoria</h3>
            <p className="text-sm text-gray-500 mb-4">Média das notas de 0 a 5</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {data.scores.medio_geral !== undefined && (
                <ScoreCard label="Média Geral" score={data.scores.medio_geral} />
              )}
              {Object.entries(data.scores)
                .filter(([key]) => key !== 'medio_geral')
                .map(([key, value]) => (
                  <ScoreCard
                    key={key}
                    label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    score={value}
                  />
                ))}
            </div>
          </div>
          <div className="hidden md:block">
            <MobileExpandableCard
              title="Avaliações por Categoria"
              subtitle="Média das notas de 0 a 5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {data.scores.medio_geral !== undefined && (
                  <ScoreCard label="Média Geral" score={data.scores.medio_geral} />
                )}
                {Object.entries(data.scores)
                  .filter(([key]) => key !== 'medio_geral')
                  .map(([key, value]) => (
                    <ScoreCard
                      key={key}
                      label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      score={value}
                    />
                  ))}
              </div>
            </MobileExpandableCard>
          </div>

          {/* Row 3: Evolução NPS + Comentários */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Evolução NPS */}
            {data.evolucao && data.evolucao.length > 0 && (
              <MobileExpandableCard
                title="Evolução do NPS"
                subtitle={evolucaoPor === 'dia' ? `Por dia — ${MONTHS[data.periodo.month - 1]} ${data.periodo.year}` : `Por mês — ${data.periodo.year}`}
              >
                <div className="flex justify-end mb-3">
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setEvolucaoPor('dia')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${evolucaoPor === 'dia' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      Dia
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvolucaoPor('mes')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${evolucaoPor === 'mes' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      Mês
                    </button>
                  </div>
                </div>
                <div className="pt-0">
                  <div className="h-64 min-h-[256px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minHeight={256} minWidth={0}>
                      <LineChart data={data.evolucao}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mesNome" stroke="#9ca3af" fontSize={12} />
                        <YAxis
                          domain={(() => {
                            const valores = data.evolucao.map((e) => e.nps_score).filter((v): v is number => v !== null && v !== undefined);
                            if (valores.length === 0) return [-100, 100];
                            const min = Math.min(...valores);
                            const max = Math.max(...valores);
                            const padding = Math.max(5, Math.round((max - min) * 0.15) || 5);
                            const marginTop = max >= 100 ? 6 : 0;
                            const marginBottom = min <= -100 ? 6 : 0;
                            const yMin = Math.max(-100, min - padding) - marginBottom;
                            const yMax = Math.min(100, max + padding) + marginTop;
                            return [yMin, yMax];
                          })()}
                          stroke="#9ca3af"
                          fontSize={12}
                          allowDataOverflow
                        />
                        <Tooltip
                          formatter={(value: any) => [value !== null ? value : 'N/A', 'NPS']}
                          labelFormatter={(label) => evolucaoPor === 'dia' ? `Dia ${label}` : `Mês: ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="nps_score"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', r: 5 }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </MobileExpandableCard>
            )}

            {/* Comentários Recentes - desktop: MobileExpandableCard (mobile fica por último) */}
            <div className="hidden md:block">
              <MobileExpandableCard
                title="Comentários Recentes"
                subtitle={`${filteredComments.length} comentários`}
              >
                <div className="pt-2">
                  <div className="flex flex-wrap gap-1 mb-4">
                    {['todos', 'promotor', 'neutro', 'detrator'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setCommentFilter(filter as any)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          commentFilter === filter 
                            ? filter === 'promotor' ? 'bg-emerald-100 text-emerald-700' :
                              filter === 'neutro' ? 'bg-amber-100 text-amber-700' :
                              filter === 'detrator' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {filter === 'todos' ? 'Todos' : 
                         filter === 'promotor' ? '😊' :
                         filter === 'neutro' ? '😐' : '😞'}
                      </button>
                    ))}
                  </div>
                  <div className={`divide-y divide-gray-100 ${showAllComments ? 'max-h-96' : 'max-h-64'} overflow-y-auto`}>
                    {displayedComments.length > 0 ? (
                      displayedComments.map((c, i) => (
                        <div key={i} className="py-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              c.tipo === 'promotor' ? 'bg-emerald-100' :
                              c.tipo === 'neutro' ? 'bg-amber-100' : 'bg-red-100'
                            }`}>
                              <span className="text-sm">
                                {c.tipo === 'promotor' ? '😊' :
                                 c.tipo === 'neutro' ? '😐' : '😞'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-sm font-semibold ${
                                  c.tipo === 'promotor' ? 'text-emerald-600' :
                                  c.tipo === 'neutro' ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                  Nota {c.nota}
                                </span>
                                <span className="text-xs text-gray-400">{c.data}</span>
                                {c.unidade && <span className="text-xs text-gray-400">• {c.unidade}</span>}
                              </div>
                              <p className="text-sm text-gray-700 line-clamp-2">{c.comentario}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        Nenhum comentário encontrado
                      </div>
                    )}
                  </div>
                  {filteredComments.length > 5 && (
                    <div className="py-3 border-t border-gray-100">
                      <button
                        onClick={() => setShowAllComments(!showAllComments)}
                        className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        {showAllComments ? (
                          <><ChevronUp size={16} /> Ver menos</>
                        ) : (
                          <><ChevronDown size={16} /> Ver mais ({filteredComments.length - 5})</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </MobileExpandableCard>
            </div>
          </div>

          {/* Row 4: Frequência + Origem - mobile: direto na tela; desktop: MobileExpandableCard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Frequência de Visita */}
            {data.frequencia.length > 0 && (
              <>
                <div className="md:hidden">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Frequência de Visita</h3>
                  <p className="text-sm text-gray-500 mb-4">Distribuição de frequência</p>
                  <div className="space-y-4">
                    {data.frequencia.map((item, i) => {
                      const total = data.frequencia.reduce((sum, f) => sum + f.frequencia, 0);
                      const percent = total > 0 ? (item.frequencia / total) * 100 : 0;
                      const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500'];
                      return (
                        <div key={item.opcao}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{item.opcao}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">{item.frequencia}</span>
                              <span className="text-sm font-semibold">{percent.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${colors[i % colors.length]}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="hidden md:block">
                  <MobileExpandableCard
                    title="Frequência de Visita"
                    subtitle="Distribuição de frequência"
                  >
                    <div className="pt-2">
                      <div className="space-y-4">
                        {data.frequencia.map((item, i) => {
                          const total = data.frequencia.reduce((sum, f) => sum + f.frequencia, 0);
                          const percent = total > 0 ? (item.frequencia / total) * 100 : 0;
                          const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500'];
                          return (
                            <div key={item.opcao}>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700">{item.opcao}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500">{item.frequencia}</span>
                                  <span className="text-sm font-semibold">{percent.toFixed(1)}%</span>
                                </div>
                              </div>
                              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${colors[i % colors.length]}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </MobileExpandableCard>
                </div>
              </>
            )}

            {/* Como Conheceu */}
            {data.origem.length > 0 && (
              <>
                <div className="md:hidden">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Como Conheceu</h3>
                  <p className="text-sm text-gray-500 mb-4">Origem dos clientes</p>
                  <div className="space-y-4">
                    {data.origem.map((item, i) => {
                      const total = data.origem.reduce((sum, o) => sum + o.frequencia, 0);
                      const percent = total > 0 ? (item.frequencia / total) * 100 : 0;
                      const colors = ['bg-pink-500', 'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
                      return (
                        <div key={item.opcao}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <span>{item.icone}</span> {item.opcao}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">{item.frequencia}</span>
                              <span className="text-sm font-semibold">{percent.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${colors[i % colors.length]}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="hidden md:block">
                  <MobileExpandableCard
                    title="Como Conheceu"
                    subtitle="Origem dos clientes"
                  >
                    <div className="pt-2">
                      <div className="space-y-4">
                        {data.origem.map((item, i) => {
                          const total = data.origem.reduce((sum, o) => sum + o.frequencia, 0);
                          const percent = total > 0 ? (item.frequencia / total) * 100 : 0;
                          const colors = ['bg-pink-500', 'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
                          return (
                            <div key={item.opcao}>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                  <span>{item.icone}</span> {item.opcao}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500">{item.frequencia}</span>
                                  <span className="text-sm font-semibold">{percent.toFixed(1)}%</span>
                                </div>
                              </div>
                              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${colors[i % colors.length]}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </MobileExpandableCard>
                </div>
              </>
            )}
          </div>

          {/* Comentários Recentes - mobile: por último, direto na tela */}
          <div className="md:hidden mt-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Comentários Recentes</h3>
            <p className="text-sm text-gray-500 mb-3">{filteredComments.length} comentários</p>
            <div className="flex flex-wrap gap-1 mb-4">
              {['todos', 'promotor', 'neutro', 'detrator'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setCommentFilter(filter as any)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    commentFilter === filter 
                      ? filter === 'promotor' ? 'bg-emerald-100 text-emerald-700' :
                        filter === 'neutro' ? 'bg-amber-100 text-amber-700' :
                        filter === 'detrator' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter === 'todos' ? 'Todos' : 
                   filter === 'promotor' ? '😊' :
                   filter === 'neutro' ? '😐' : '😞'}
                </button>
              ))}
            </div>
            <div className={`divide-y divide-gray-100 ${showAllComments ? 'max-h-96' : 'max-h-64'} overflow-y-auto`}>
              {displayedComments.length > 0 ? (
                displayedComments.map((c, i) => (
                  <div key={i} className="py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        c.tipo === 'promotor' ? 'bg-emerald-100' :
                        c.tipo === 'neutro' ? 'bg-amber-100' : 'bg-red-100'
                      }`}>
                        <span className="text-sm">
                          {c.tipo === 'promotor' ? '😊' :
                           c.tipo === 'neutro' ? '😐' : '😞'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-semibold ${
                            c.tipo === 'promotor' ? 'text-emerald-600' :
                            c.tipo === 'neutro' ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            Nota {c.nota}
                          </span>
                          <span className="text-xs text-gray-400">{c.data}</span>
                          {c.unidade && <span className="text-xs text-gray-400">• {c.unidade}</span>}
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">{c.comentario}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500">
                  Nenhum comentário encontrado
                </div>
              )}
            </div>
            {filteredComments.length > 5 && (
              <div className="py-3 border-t border-gray-100">
                <button
                  onClick={() => setShowAllComments(!showAllComments)}
                  className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  {showAllComments ? (
                    <><ChevronUp size={16} /> Ver menos</>
                  ) : (
                    <><ChevronDown size={16} /> Ver mais ({filteredComments.length - 5})</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
