'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupFilter } from '@/hooks/useGroupFilter';
import { MobileExpandableCard } from '@/components/MobileExpandableCard';
import { 
  Calendar,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  BarChart3,
  Target,
  Save,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';

interface PrevisaoData {
  empresa: { id: string; name: string };
  periodo: { year: number; month: number };
  realizado: {
    total: number;
    diasPassados: number;
    mediaDiaria: number;
  };
  diasRestantes: {
    total: number;
    diasUteis: number;
    sabados: number;
    domingos: number;
    feriados: number;
  };
  cenarios: {
    otimista: number;
    realista: number;
    pessimista: number;
  };
  grafico: Array<{
    dia: number;
    data: string;
    realizado: number | null;
    otimista: number | null;
    realista: number | null;
    pessimista: number | null;
  }>;
  graficoRealizado: Array<{
    dia: number;
    data: string;
    valor: number;
    acumulado: number;
  }>;
  projecaoDiaria: Array<{
    dia: number;
    data: string;
    tipoDia: 'Útil' | 'Sábado' | 'Domingo' | 'Feriado';
    otimista: number;
    realista: number;
    pessimista: number;
  }>;
  estatisticas: {
    media: number;
    mediana: number;
    tendencia: 'crescente' | 'decrescente' | 'estável';
    slope: number;
    intercept: number;
  };
  mesAnterior?: {
    total: number;
    grafico: Array<{ dia: number; acumulado: number }>;
  };
}

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const getWeekday = (year: number, month: number, day: number) => {
  const d = new Date(year, month - 1, day);
  return WEEKDAY_LABELS[d.getDay()];
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export default function PrevisaoPage() {
  const { user: currentUser } = useAuth();
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [baseMonths, setBaseMonths] = useState<string>('3');
  const [comparePreviousMonth, setComparePreviousMonth] = useState(false);
  const [previsaoData, setPrevisaoData] = useState<PrevisaoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [companyGoal, setCompanyGoal] = useState<number>(0);
  const [savedProjections, setSavedProjections] = useState<any[]>([]);
  const [selectedProjection, setSelectedProjection] = useState<any>(null);
  const [savingProjection, setSavingProjection] = useState(false);
  const [saveDescription, setSaveDescription] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showComparisonSection, setShowComparisonSection] = useState(true);

  // Buscar meta de faturamento da empresa (mesma fonte do /dashboard/empresa)
  useEffect(() => {
    if (selectedCompanyId && selectedGroupId) {
      fetch(`/api/goals?group_id=${selectedGroupId}&company_id=${selectedCompanyId}&year=${selectedYear}&month=${selectedMonth}&type=company_revenue`)
        .then(res => res.json())
        .then(data => {
          const goals = data?.goals || data || [];
          const goalArray = Array.isArray(goals) ? goals : [goals];
          const totalGoal = goalArray
            .filter((g: any) => g.is_active !== false)
            .reduce((sum: number, g: any) => sum + (g.goal_value || 0), 0);
          setCompanyGoal(totalGoal);
        })
        .catch(err => {
          console.error('Erro ao buscar meta da empresa:', err);
          setCompanyGoal(0);
        });
    } else {
      setCompanyGoal(0);
    }
  }, [selectedCompanyId, selectedGroupId, selectedYear, selectedMonth]);

  // Buscar projeções salvas quando filtros mudam
  useEffect(() => {
    if (selectedGroupId && selectedCompanyId && selectedYear && selectedMonth) {
      fetch(`/api/saved-projections?group_id=${selectedGroupId}&company_id=${selectedCompanyId}&year=${selectedYear}&month=${selectedMonth}`)
        .then(res => res.json())
        .then(data => {
          const projections = data?.projections || [];
          setSavedProjections(projections);
          if (projections.length > 0) {
            setSelectedProjection(projections[0]);
          } else {
            setSelectedProjection(null);
          }
        })
        .catch(err => {
          console.error('Erro ao buscar projeções:', err);
          setSavedProjections([]);
          setSelectedProjection(null);
        });
    } else {
      setSavedProjections([]);
      setSelectedProjection(null);
    }
  }, [selectedGroupId, selectedCompanyId, selectedYear, selectedMonth]);

  // Buscar empresas quando grupo selecionado
  useEffect(() => {
    if (selectedGroupId) {
      console.log('PrevisaoPage - Buscando empresas para grupo:', selectedGroupId);
      fetch(`/api/companies?group_id=${selectedGroupId}`)
        .then(res => {
          console.log('PrevisaoPage - Resposta da API empresas:', res.status);
          return res.json();
        })
        .then(data => {
          // A API retorna { companies: [...] }
          const companiesArray = data?.companies || [];
          console.log('PrevisaoPage - Empresas recebidas:', companiesArray.length);
          setCompanies(Array.isArray(companiesArray) ? companiesArray : []);
        })
        .catch(err => {
          console.error('Erro ao buscar empresas:', err);
          setCompanies([]);
        });
    } else {
      setCompanies([]);
    }
  }, [selectedGroupId]);

  // Buscar previsão quando filtros mudarem
  // useEffect(() => {
  //   if (selectedCompanyId && selectedMonth && selectedYear) {
  //     fetchPrevisao();
  //   }
  // }, [selectedCompanyId, selectedMonth, selectedYear, baseMonths, comparePreviousMonth]);

  const fetchPrevisao = async () => {
    if (!selectedCompanyId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        company_id: selectedCompanyId,
        year: selectedYear.toString(),
        month: selectedMonth.toString(),
        periodo_base: baseMonths,
        comparar_mes_anterior: comparePreviousMonth.toString()
      });
      
      if (selectedGroupId) {
        params.append('group_id', selectedGroupId);
      }

      const res = await fetch(`/api/dashboard/previsao?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPrevisaoData(data);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Erro ao buscar previsão:', res.status, errorData);
        alert(`Erro ao buscar previsão: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao buscar previsão:', error);
      alert('Erro ao buscar previsão. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/dashboard/refresh-view', { method: 'POST' });
      if (res.ok) {
        await fetchPrevisao();
        setDataLoaded(true);
      } else {
        alert('Erro ao atualizar dados');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao atualizar dados');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveProjection = async () => {
    if (!previsaoData || !selectedGroupId || !selectedCompanyId) return;

    setSavingProjection(true);
    try {
      const res = await fetch('/api/saved-projections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_group_id: selectedGroupId,
          company_id: selectedCompanyId,
          year: selectedYear,
          month: selectedMonth,
          cenario_otimista: previsaoData.cenarios.otimista,
          cenario_realista: previsaoData.cenarios.realista,
          cenario_pessimista: previsaoData.cenarios.pessimista,
          meta_empresa: companyGoal || 0,
          realizado_no_save: previsaoData.realizado.total,
          dias_passados_no_save: previsaoData.realizado.diasPassados,
          projecao_diaria: previsaoData.grafico,
          saved_by: currentUser?.id || null,
          description: saveDescription || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSavedProjections(prev => [data.projection, ...prev]);
        setSelectedProjection(data.projection);
        setShowSaveModal(false);
        setSaveDescription('');
        alert('Projeção salva com sucesso!');
      } else {
        const err = await res.json();
        alert(`Erro ao salvar: ${err.error}`);
      }
    } catch (error) {
      console.error('Erro ao salvar projeção:', error);
      alert('Erro ao salvar projeção');
    } finally {
      setSavingProjection(false);
    }
  };

  const handleDeleteProjection = async (projectionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta projeção?')) return;

    try {
      const res = await fetch(`/api/saved-projections/${projectionId}`, { method: 'DELETE' });
      if (res.ok) {
        const newList = savedProjections.filter(p => p.id !== projectionId);
        setSavedProjections(newList);
        setSelectedProjection(selectedProjection?.id === projectionId ? (newList[0] || null) : selectedProjection);
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  // Preparar dados do gráfico principal
  const graficoPrincipalData = previsaoData?.grafico.map((item: any) => ({
    ...item,
    mesAnterior: previsaoData.mesAnterior?.grafico.find((g: any) => g.dia === item.dia)?.acumulado || null
  })) || [];

  // Preparar dados do gráfico de análise (tendência apenas até o último dia com dados)
  const ultimoDiaComDados = (previsaoData as any)?.ultimoDiaComDados || 0;
  const graficoAnaliseData = previsaoData?.graficoRealizado.map((item: any) => ({
    ...item,
    // Mostrar tendência apenas até o último dia com dados importados
    tendencia: item.dia <= ultimoDiaComDados 
      ? previsaoData.estatisticas.intercept + previsaoData.estatisticas.slope * item.dia
      : null,
    mediana: previsaoData.estatisticas.mediana,
    media: previsaoData.estatisticas.media
  })) || [];

  // Preparar dados do gráfico de realizado diário COM projeções
  const graficoRealizadoDiarioData = previsaoData?.graficoRealizado.map((item: any) => {
    const projecao = previsaoData.projecaoDiaria.find((p: any) => p.dia === item.dia);
    return {
      ...item,
      otimista: projecao?.otimista || null,
      realista: projecao?.realista || null,
      pessimista: projecao?.pessimista || null
    };
  }) || [];

  const currentDay = new Date().getDate();
  const isCurrentMonth = previsaoData && 
    previsaoData.periodo.year === new Date().getFullYear() &&
    previsaoData.periodo.month === new Date().getMonth() + 1;

  const getGoalBadge = (cenarioValue: number) => {
    if (companyGoal <= 0) return null;
    const bate = cenarioValue >= companyGoal;
    const diffPercent = Math.round(((cenarioValue - companyGoal) / companyGoal) * 100);

    return (
      <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        bate ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}>
        {bate ? '✅' : '❌'}
        {bate
          ? ` Bate a meta (+${diffPercent}%)`
          : ` Não bate (falta ${formatCurrency(companyGoal - cenarioValue)})`
        }
      </div>
    );
  };

  // Calcular totais da projeção diária
  const totaisProjecao = previsaoData?.projecaoDiaria.reduce((acc: any, item: any) => ({
    otimista: acc.otimista + item.otimista,
    realista: acc.realista + item.realista,
    pessimista: acc.pessimista + item.pessimista
  }), { otimista: 0, realista: 0, pessimista: 0 }) || { otimista: 0, realista: 0, pessimista: 0 };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Previsão de Vendas</h1>
          <p className="text-gray-500">Projeção de faturamento baseada em histórico</p>
        </div>
      </div>

      {/* Filtros - em mobile: um abaixo do outro, mesmo tamanho */}
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
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {groups.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Empresa (Obrigatório) */}
        <div className="w-full sm:w-56">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Empresa <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
          >
            <option value="">Selecione uma empresa...</option>
            {companies.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Mês */}
        <div className="w-full sm:w-40">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {MONTHS.map((m: any) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Ano */}
        <div className="w-full sm:w-28">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {[2025, 2026, 2027, 2028, 2029, 2030].map((year: any) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Base de Cálculo */}
        <div className="w-full sm:w-36">
          <label className="block text-sm font-medium text-gray-700 mb-1">Base de Cálculo</label>
          <select
            value={baseMonths}
            onChange={(e) => setBaseMonths(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="12">12 meses</option>
          </select>
        </div>

        {/* Botão Atualizar Dados */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">&nbsp;</label>
          <button
            onClick={handleRefreshData}
            disabled={refreshing || !selectedCompanyId}
            title="Atualizar Dados"
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {refreshing ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
        </div>

        {/* Botão Salvar Projeção */}
        {previsaoData && dataLoaded && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">&nbsp;</label>
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={savingProjection}
              title="Salvar Projeção"
              className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <Save size={20} />
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">Carregando previsão...</p>
        </div>
      )}

      {!dataLoaded && selectedCompanyId && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-blue-800 font-medium">Clique no botão de atualizar para carregar os dados</p>
          <p className="text-blue-600 text-sm mt-1">Selecione os filtros e clique no ícone azul</p>
        </div>
      )}

      {dataLoaded && previsaoData && !loading && (
        <>
            {/* Cards Principais - em mobile: um abaixo do outro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card Meta da Empresa */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-bl-full" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <Target size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Meta — {previsaoData.empresa.name}
                      </h3>
                      <p className="text-2xl font-bold text-blue-600">
                        {companyGoal > 0 ? formatCurrency(companyGoal) : 'Sem meta'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {MONTHS.find((m: any) => m.value === previsaoData.periodo.month)?.label} {previsaoData.periodo.year}
                  </p>
                  {companyGoal > 0 && previsaoData.realizado.total > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Realizado</span>
                        <span>{Math.round((previsaoData.realizado.total / companyGoal) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            previsaoData.realizado.total >= companyGoal ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min((previsaoData.realizado.total / companyGoal) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Otimista */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-bl-full" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <ArrowUp size={24} className="text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Otimista</h3>
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(previsaoData.cenarios.otimista)}
                      </p>
                    </div>
                  </div>
                  {getGoalBadge(previsaoData.cenarios.otimista)}
                </div>
              </div>

              {/* Card Realista */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 rounded-bl-full" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Minus size={24} className="text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Realista</h3>
                      <p className="text-2xl font-bold text-amber-600">
                        {formatCurrency(previsaoData.cenarios.realista)}
                      </p>
                    </div>
                  </div>
                  {getGoalBadge(previsaoData.cenarios.realista)}
                </div>
              </div>

              {/* Card Pessimista */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-500/10 to-red-500/10 rounded-bl-full" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                      <ArrowDown size={24} className="text-rose-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Pessimista</h3>
                      <p className="text-2xl font-bold text-rose-500">
                        {formatCurrency(previsaoData.cenarios.pessimista)}
                      </p>
                    </div>
                  </div>
                  {getGoalBadge(previsaoData.cenarios.pessimista)}
                </div>
              </div>
            </div>

            {/* Cards Info - em mobile: um abaixo do outro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Realizado até Hoje */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar size={20} className="text-blue-600" />
                  Realizado até Hoje
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(previsaoData.realizado.total)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Média Diária</p>
                      <p className="font-semibold text-gray-700">
                        {formatCurrency(previsaoData.realizado.mediaDiaria)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Dias Passados</p>
                      <p className="font-semibold text-gray-700">{previsaoData.realizado.diasPassados}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dias Restantes */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar size={20} className="text-blue-600" />
                  Dias Restantes
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {previsaoData.diasRestantes.total} dias
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Dias Úteis</p>
                      <p className="font-semibold text-gray-700">{previsaoData.diasRestantes.diasUteis}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Sábados</p>
                      <p className="font-semibold text-gray-700">{previsaoData.diasRestantes.sabados}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Domingos</p>
                      <p className="font-semibold text-gray-700">{previsaoData.diasRestantes.domingos}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Feriados</p>
                      <p className="font-semibold text-gray-700">{previsaoData.diasRestantes.feriados}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico Realizado Diário - em mobile: só o card, expandir ao clicar */}
            <MobileExpandableCard title="Realizado Diário" subtitle="Faturamento por dia com projeção">
              <div className="h-[280px] min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                <LineChart data={graficoRealizadoDiarioData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="dia" 
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value) => typeof value === 'number' ? formatCurrency(value) : '-'}
                    labelFormatter={(label) => `Dia ${label}`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  {/* Linha Realizado */}
                  <Line 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    name="Realizado"
                  />
                  {/* Linha Otimista */}
                  <Line 
                    type="monotone" 
                    dataKey="otimista" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#10b981', r: 3 }}
                    name="Otimista"
                    connectNulls={false}
                  />
                  {/* Linha Realista */}
                  <Line 
                    type="monotone" 
                    dataKey="realista" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#f59e0b', r: 3 }}
                    name="Realista"
                    connectNulls={false}
                  />
                  {/* Linha Pessimista */}
                  <Line 
                    type="monotone" 
                    dataKey="pessimista" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#ef4444', r: 3 }}
                    name="Pessimista"
                    connectNulls={false}
                  />
                  {/* Linha de referência Média */}
                  {previsaoData?.estatisticas?.media && (
                    <ReferenceLine 
                      y={previsaoData.estatisticas.media} 
                      stroke="#9ca3af" 
                      strokeDasharray="5 5"
                      label={{ value: "Média", position: "right", fill: "#9ca3af", fontSize: 10 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              </div>
            </MobileExpandableCard>

            <MobileExpandableCard title="Projeção do Mês (Acumulado)" subtitle="Faturamento acumulado com cenários">
              <div className="h-[320px] min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={220}>
                <LineChart data={graficoPrincipalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="dia" 
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value) => typeof value === 'number' ? formatCurrency(value) : '-'}
                    labelFormatter={(label) => `Dia ${label}`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  {isCurrentMonth && (
                    <ReferenceLine 
                      x={currentDay} 
                      stroke="#6366f1" 
                      strokeDasharray="5 5" 
                      label={{ value: "Hoje", position: "top", fill: "#6366f1", fontSize: 12 }}
                    />
                  )}
                  {companyGoal > 0 && (
                    <ReferenceLine
                      y={companyGoal}
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      label={{
                        value: `Meta: ${formatCurrency(companyGoal)}`,
                        position: "right",
                        fill: "#6366f1",
                        fontSize: 11,
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                  {/* Linha Realizado */}
                  <Line 
                    type="monotone" 
                    dataKey="realizado" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    name="Realizado"
                  />
                  {/* Linha Otimista */}
                  <Line 
                    type="monotone" 
                    dataKey="otimista" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#10b981', r: 3 }}
                    name="Otimista"
                  />
                  {/* Linha Realista */}
                  <Line 
                    type="monotone" 
                    dataKey="realista" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#f59e0b', r: 3 }}
                    name="Realista"
                  />
                  {/* Linha Pessimista */}
                  <Line 
                    type="monotone" 
                    dataKey="pessimista" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#ef4444', r: 3 }}
                    name="Pessimista"
                  />
                  {/* Linha Mês Anterior */}
                  {previsaoData.mesAnterior && (
                    <Line 
                      type="monotone" 
                      dataKey="mesAnterior"
                      stroke="#9ca3af" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Mês Anterior"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              </div>
            </MobileExpandableCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Análise do Período - em mobile: só o card, expandir ao clicar */}
              <MobileExpandableCard title="Análise do Período" subtitle="Realizado diário com tendência e mediana">
                {/* Legenda */}
                <div className="flex flex-wrap gap-4 mb-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600">Realizado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-gray-600">Tendência</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-purple-500"></div>
                    <span className="text-gray-600">Mediana</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-gray-400"></div>
                    <span className="text-gray-600">Média</span>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={256}>
                  <LineChart data={graficoAnaliseData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="dia" 
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value) => typeof value === 'number' ? formatCurrency(value) : '-'}
                      labelFormatter={(label) => `Dia ${label}`}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="valor" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 3 }}
                      name="Realizado"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="tendencia" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Tendência"
                    />
                    <ReferenceLine 
                      y={previsaoData.estatisticas.mediana} 
                      stroke="#a855f7" 
                      strokeDasharray="5 5"
                      label={{ value: "Mediana", position: "right", fill: "#a855f7", fontSize: 10 }}
                    />
                    <ReferenceLine 
                      y={previsaoData.estatisticas.media} 
                      stroke="#9ca3af" 
                      strokeDasharray="5 5"
                      label={{ value: "Média", position: "right", fill: "#9ca3af", fontSize: 10 }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Cards de Estatísticas */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Média</p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(previsaoData.estatisticas.media)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Mediana</p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(previsaoData.estatisticas.mediana)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Tendência</p>
                    <p className="text-sm font-bold text-gray-900 capitalize">
                      {previsaoData.estatisticas.tendencia}
                    </p>
                  </div>
                </div>
              </MobileExpandableCard>

              {/* Projeção por Dia - em mobile: só o card, expandir ao clicar */}
              <MobileExpandableCard 
                title="Projeção por Dia" 
                subtitle="Detalhamento dos dias restantes"
              >
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Dia</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Tipo</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Otimista</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Realista</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Pessimista</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previsaoData.projecaoDiaria.map((item) => {
                        const badgeColor = 
                          item.tipoDia === 'Útil' ? 'bg-blue-100 text-blue-700' :
                          item.tipoDia === 'Sábado' ? 'bg-purple-100 text-purple-700' :
                          item.tipoDia === 'Domingo' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700';
                        
                        return (
                          <tr key={item.dia} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-3 text-gray-900">{item.dia}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeColor}`}>
                                {item.tipoDia}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right text-gray-900">{formatCurrency(item.otimista)}</td>
                            <td className="py-2 px-3 text-right text-gray-900">{formatCurrency(item.realista)}</td>
                            <td className="py-2 px-3 text-right text-gray-900">{formatCurrency(item.pessimista)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan={2} className="py-2 px-3 text-gray-900">Total</td>
                        <td className="py-2 px-3 text-right text-gray-900">{formatCurrency(totaisProjecao.otimista)}</td>
                        <td className="py-2 px-3 text-right text-gray-900">{formatCurrency(totaisProjecao.realista)}</td>
                        <td className="py-2 px-3 text-right text-gray-900">{formatCurrency(totaisProjecao.pessimista)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </MobileExpandableCard>
            </div>

            {/* ============ SEÇÃO: ACOMPANHAMENTO DA PROJEÇÃO SALVA ============ */}
            {savedProjections.length > 0 && (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={() => setShowComparisonSection(!showComparisonSection)}
                  className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-lg border border-gray-100 hover:bg-gray-50/50 transition-colors text-left"
                >
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <Eye size={20} className="text-indigo-600" />
                    </div>
                    Acompanhamento da Projeção
                  </h2>
                  {showComparisonSection ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </button>

                {showComparisonSection && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-bl-full" />
                      <div className="relative">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Projeção salva ({savedProjections.length} {savedProjections.length === 1 ? 'disponível' : 'disponíveis'})
                            </label>
                            <select
                              value={selectedProjection?.id || ''}
                              onChange={(e) => {
                                const proj = savedProjections.find(p => p.id === e.target.value);
                                setSelectedProjection(proj || null);
                              }}
                              className="w-full sm:max-w-md px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            >
                              {savedProjections.map((proj) => (
                                <option key={proj.id} value={proj.id}>
                                  {new Date(proj.saved_at).toLocaleDateString('pt-BR')} às {new Date(proj.saved_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  {proj.description ? ` — ${proj.description}` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          {selectedProjection && (
                            <button
                              type="button"
                              onClick={() => handleDeleteProjection(selectedProjection.id)}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                              title="Excluir projeção"
                            >
                              <Trash2 size={16} />
                              Excluir
                            </button>
                          )}
                        </div>

                        {selectedProjection && previsaoData && (() => {
                          const realAtual = previsaoData.realizado.total;
                          const projecoes = {
                            otimista: selectedProjection.cenario_otimista,
                            realista: selectedProjection.cenario_realista,
                            pessimista: selectedProjection.cenario_pessimista
                          };
                          const diasNoMes = new Date(selectedYear, selectedMonth, 0).getDate();
                          const diasPassados = previsaoData.realizado.diasPassados;
                          const proporcao = diasNoMes > 0 ? diasPassados / diasNoMes : 0;
                          const esperadoOtimista = projecoes.otimista * proporcao;
                          const esperadoRealista = projecoes.realista * proporcao;
                          const esperadoPessimista = projecoes.pessimista * proporcao;

                          let situacaoLabel: string;
                          let situacaoColor: string;
                          let situacaoIcon: React.ReactNode;

                          if (realAtual >= esperadoOtimista) {
                            situacaoLabel = 'Acima do cenário otimista';
                            situacaoColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                            situacaoIcon = <CheckCircle className="text-emerald-600 shrink-0" size={22} />;
                          } else if (realAtual >= esperadoRealista) {
                            situacaoLabel = 'Entre otimista e realista';
                            situacaoColor = 'bg-blue-50 text-blue-800 border-blue-200';
                            situacaoIcon = <CheckCircle className="text-blue-600 shrink-0" size={22} />;
                          } else if (realAtual >= esperadoPessimista) {
                            situacaoLabel = 'Entre realista e pessimista';
                            situacaoColor = 'bg-amber-50 text-amber-800 border-amber-200';
                            situacaoIcon = <AlertTriangle className="text-amber-600 shrink-0" size={22} />;
                          } else {
                            situacaoLabel = 'Abaixo do cenário pessimista';
                            situacaoColor = 'bg-red-50 text-red-800 border-red-200';
                            situacaoIcon = <XCircle className="text-red-600 shrink-0" size={22} />;
                          }

                          return (
                            <div className="space-y-6">
                              <div className={`rounded-xl border p-4 flex items-start sm:items-center gap-4 ${situacaoColor}`}>
                                {situacaoIcon}
                                <div className="min-w-0">
                                  <p className="font-semibold text-base">{situacaoLabel}</p>
                                  <p className="text-sm text-gray-600 mt-0.5">
                                    Realizado: <span className="font-medium text-gray-900">{formatCurrency(realAtual)}</span>
                                    <span className="mx-2 text-gray-300">·</span>
                                    Dia {diasPassados} de {diasNoMes}
                                    <span className="mx-2 text-gray-300">·</span>
                                    Salvo em {new Date(selectedProjection.saved_at).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                  { label: 'Otimista', valor: projecoes.otimista, esperado: esperadoOtimista, icon: ArrowUp, gradient: 'from-emerald-500/10 to-green-500/10', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', barColor: 'bg-emerald-500' },
                                  { label: 'Realista', valor: projecoes.realista, esperado: esperadoRealista, icon: Minus, gradient: 'from-amber-500/10 to-yellow-500/10', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', barColor: 'bg-amber-500' },
                                  { label: 'Pessimista', valor: projecoes.pessimista, esperado: esperadoPessimista, icon: ArrowDown, gradient: 'from-rose-500/10 to-red-500/10', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', barColor: 'bg-rose-500' }
                                ].map((cenario) => {
                                  const IconCenario = cenario.icon;
                                  const diffPercent = cenario.esperado > 0
                                    ? Math.round(((realAtual - cenario.esperado) / cenario.esperado) * 100)
                                    : 0;
                                  const dentroDoEsperado = realAtual >= cenario.esperado;
                                  const percentualEsperado = cenario.esperado > 0 ? Math.min((realAtual / cenario.esperado) * 100, 100) : 0;
                                  return (
                                    <div key={cenario.label} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 relative overflow-hidden">
                                      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${cenario.gradient} rounded-bl-full`} />
                                      <div className="relative">
                                        <div className="flex items-center gap-3 mb-4">
                                          <div className={`w-10 h-10 rounded-xl ${cenario.iconBg} flex items-center justify-center`}>
                                            <IconCenario size={20} className={cenario.iconColor} />
                                          </div>
                                          <p className="text-sm font-medium text-gray-500">{cenario.label}</p>
                                        </div>
                                        <div className="space-y-3">
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Projetado final</span>
                                            <span className="font-semibold text-gray-900">{formatCurrency(cenario.valor)}</span>
                                          </div>
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Esperado até hoje</span>
                                            <span className="font-semibold text-gray-700">{formatCurrency(cenario.esperado)}</span>
                                          </div>
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Realizado</span>
                                            <span className="font-bold text-gray-900">{formatCurrency(realAtual)}</span>
                                          </div>
                                          <div className="pt-2">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                              <span>Realizado vs esperado</span>
                                              <span>{cenario.esperado > 0 ? Math.round(percentualEsperado) : 0}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                              <div
                                                className={`h-full rounded-full transition-all duration-500 ${cenario.barColor}`}
                                                style={{ width: `${Math.min(percentualEsperado, 100)}%` }}
                                              />
                                            </div>
                                            <div className={`mt-2 text-center py-1.5 px-2 rounded-lg text-xs font-semibold ${
                                              dentroDoEsperado ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                              {dentroDoEsperado ? `+${diffPercent}% acima do esperado` : `${diffPercent}% abaixo do esperado`}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {selectedProjection && previsaoData && (
                      <MobileExpandableCard
                        title="Projeção Salva vs Realizado"
                        subtitle="Comparação dia a dia acumulado"
                      >
                        <div className="h-[350px] min-h-[250px]">
                          <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                            <LineChart data={(() => {
                              const savedData = selectedProjection.projecao_diaria || [];
                              const currentData = previsaoData.grafico || [];
                              return savedData.map((saved: any) => {
                                const current = currentData.find((c: any) => c.dia === saved.dia);
                                return {
                                  dia: saved.dia,
                                  projecao_otimista: saved.otimista,
                                  projecao_realista: saved.realista,
                                  projecao_pessimista: saved.pessimista,
                                  realizado_atual: current?.realizado ?? null
                                };
                              });
                            })()}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="dia" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} />
                              <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                              <Tooltip
                                formatter={(value: any) => typeof value === 'number' ? formatCurrency(value) : '-'}
                                labelFormatter={(label) => `Dia ${label}`}
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }}
                              />
                              <Legend />
                              <Line type="monotone" dataKey="realizado_atual" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 3 }} name="Realizado Atual" />
                              <Line type="monotone" dataKey="projecao_otimista" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Proj. Otimista" />
                              <Line type="monotone" dataKey="projecao_realista" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Proj. Realista" />
                              <Line type="monotone" dataKey="projecao_pessimista" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Proj. Pessimista" />
                              {selectedProjection.meta_empresa > 0 && (
                                <ReferenceLine
                                  y={selectedProjection.meta_empresa}
                                  stroke="#6366f1"
                                  strokeWidth={2}
                                  strokeDasharray="8 4"
                                  label={{ value: `Meta: ${formatCurrency(selectedProjection.meta_empresa)}`, position: 'right', fill: '#6366f1', fontSize: 11 }}
                                />
                              )}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </MobileExpandableCard>
                    )}

                    {selectedProjection && previsaoData && (
                      <MobileExpandableCard title="Detalhamento Dia a Dia" subtitle="Projeção salva vs realizado por dia">
                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-3 font-semibold text-gray-700">Dia</th>
                                <th className="text-left py-2 px-3 font-semibold text-gray-700">Semana</th>
                                <th className="text-left py-2 px-3 font-semibold text-gray-700">Tipo</th>
                                <th className="text-right py-2 px-3 font-semibold text-emerald-600">Proj. Otimista</th>
                                <th className="text-right py-2 px-3 font-semibold text-amber-600">Proj. Realista</th>
                                <th className="text-right py-2 px-3 font-semibold text-red-600">Proj. Pessimista</th>
                                <th className="text-right py-2 px-3 font-semibold text-blue-600">Realizado</th>
                                <th className="text-center py-2 px-3 font-semibold text-gray-700">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(selectedProjection.projecao_diaria || []).map((saved: any) => {
                                const current = previsaoData.grafico.find((c: any) => c.dia === saved.dia);
                                const realizado = current?.realizado;
                                const temRealizado = realizado !== null && realizado !== undefined;
                                const weekday = getWeekday(selectedYear, selectedMonth, saved.dia);
                                const projecaoDia = previsaoData.projecaoDiaria.find((p: any) => p.dia === saved.dia);
                                const tipoDia = projecaoDia?.tipoDia ?? (weekday === 'Dom' ? 'Domingo' : weekday === 'Sáb' ? 'Sábado' : 'Útil');
                                const badgeColor =
                                  tipoDia === 'Útil' ? 'bg-blue-100 text-blue-700' :
                                  tipoDia === 'Sábado' ? 'bg-purple-100 text-purple-700' :
                                  tipoDia === 'Domingo' ? 'bg-orange-100 text-orange-700' :
                                  'bg-red-100 text-red-700';
                                const rowBg =
                                  tipoDia === 'Sábado' ? 'bg-purple-50/60' :
                                  tipoDia === 'Domingo' ? 'bg-orange-50/60' :
                                  tipoDia === 'Feriado' ? 'bg-red-50/60' : '';
                                let statusBadge: React.ReactNode = null;
                                if (temRealizado && realizado != null) {
                                  if (realizado >= (saved.otimista || 0)) {
                                    statusBadge = <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Acima</span>;
                                  } else if (realizado >= (saved.realista || 0)) {
                                    statusBadge = <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Dentro</span>;
                                  } else if (realizado >= (saved.pessimista || 0)) {
                                    statusBadge = <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Atenção</span>;
                                  } else {
                                    statusBadge = <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Abaixo</span>;
                                  }
                                }
                                return (
                                  <tr key={saved.dia} className={`border-b border-gray-100 hover:bg-gray-50 ${rowBg}`}>
                                    <td className="py-2 px-3 text-gray-900 font-medium">{saved.dia}</td>
                                    <td className="py-2 px-3 text-gray-600">{weekday}</td>
                                    <td className="py-2 px-3">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeColor}`}>
                                        {tipoDia}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-right text-gray-600">{saved.otimista != null ? formatCurrency(saved.otimista) : '-'}</td>
                                    <td className="py-2 px-3 text-right text-gray-600">{saved.realista != null ? formatCurrency(saved.realista) : '-'}</td>
                                    <td className="py-2 px-3 text-right text-gray-600">{saved.pessimista != null ? formatCurrency(saved.pessimista) : '-'}</td>
                                    <td className="py-2 px-3 text-right font-bold text-blue-600">{temRealizado && realizado != null ? formatCurrency(realizado) : '-'}</td>
                                    <td className="py-2 px-3 text-center">{statusBadge ?? <span className="text-gray-400 text-xs">—</span>}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </MobileExpandableCard>
                    )}
                  </div>
                )}
              </div>
            )}
        </>
      )}

      {/* Modal Salvar Projeção */}
      {showSaveModal && previsaoData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Salvar Projeção</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <p><strong>Empresa:</strong> {previsaoData.empresa.name}</p>
                <p><strong>Período:</strong> {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
                <p><strong>Otimista:</strong> {formatCurrency(previsaoData.cenarios.otimista)}</p>
                <p><strong>Realista:</strong> {formatCurrency(previsaoData.cenarios.realista)}</p>
                <p><strong>Pessimista:</strong> {formatCurrency(previsaoData.cenarios.pessimista)}</p>
                <p><strong>Realizado até agora:</strong> {formatCurrency(previsaoData.realizado.total)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                <input
                  type="text"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Ex: Projeção pós-carnaval, Cenário com promoção..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowSaveModal(false); setSaveDescription(''); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProjection}
                disabled={savingProjection}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {savingProjection ? 'Salvando...' : (
                  <>
                    <Save size={16} />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
