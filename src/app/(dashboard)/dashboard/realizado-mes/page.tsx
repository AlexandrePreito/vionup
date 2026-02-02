'use client';

import { useState, useEffect } from 'react';
import { 
  Loader2, 
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  BarChart3,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Target
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList
} from 'recharts';
import { useGroupFilter } from '@/hooks/useGroupFilter';

interface CompanyGroup {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
  revenue: number;
  transactions: number;
  averageTicket: number;
  trend: number;
  goal: number;
  progress: number;
  status: 'achieved' | 'ontrack' | 'behind';
}

interface MonthlyRevenue {
  month: number;
  monthName: string;
  monthNameFull: string;
  revenue: number;
  transactions: number;
}

interface MonthlyGoal {
  month: number;
  monthName: string;
  monthNameFull: string;
  goal: number;
}

interface RealizadoMesData {
  period: { year: number };
  companies: Company[];
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageTicket: number;
    bestMonth: { month: number; revenue: number };
    worstMonth: { month: number; revenue: number };
    comparisonLastYear: number;
  };
  monthlyRevenue: MonthlyRevenue[];
  monthlyGoals: MonthlyGoal[];
}

const COMPANY_COLORS = [
  { bg: 'from-blue-500 to-cyan-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-500', hex: '#3b82f6' },
  { bg: 'from-emerald-500 to-teal-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-500', hex: '#10b981' },
  { bg: 'from-purple-500 to-pink-500', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-500', hex: '#8b5cf6' },
  { bg: 'from-amber-500 to-orange-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-500', hex: '#f59e0b' },
  { bg: 'from-rose-500 to-red-500', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-500', hex: '#f43f5e' },
  { bg: 'from-indigo-500 to-violet-500', light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-500', hex: '#6366f1' },
];

export default function DashboardRealizadoMesPage() {
  // Usar hook para grupos
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  
  // Estados para dados
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realizadoData, setRealizadoData] = useState<RealizadoMesData | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<RealizadoMesData | null>(null);

  // Buscar dados realizados
  const fetchRealizadoData = async () => {
    if (!selectedGroupId) return;
    
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      
      const res = await fetch(
        `/api/dashboard/realizado-mes?group_id=${selectedGroupId}&year=${selectedYear}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        setRealizadoData(data);
        setFilteredData(data);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        setError(errorData.error || 'Erro ao buscar dados');
        setRealizadoData(null);
        setFilteredData(null);
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados realizados:', err);
      if (err.name === 'AbortError') {
        setError('A requisição demorou muito. Tente novamente ou verifique se há muitos dados para processar.');
      } else {
        setError(err.message || 'Erro de conexão');
      }
      setRealizadoData(null);
      setFilteredData(null);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar dados quando selecionar empresa
  useEffect(() => {
    if (!realizadoData) return;

    if (!selectedCompanyId) {
      setFilteredData(realizadoData);
      return;
    }

    const company = realizadoData.companies.find(c => c.id === selectedCompanyId);
    if (!company) return;

    // Calcular proporção para filtrar os dados
    const ratio = realizadoData.summary.totalRevenue > 0 
      ? company.revenue / realizadoData.summary.totalRevenue 
      : 0;
    
    setFilteredData({
      ...realizadoData,
      summary: {
        ...realizadoData.summary,
        totalRevenue: company.revenue,
        totalTransactions: company.transactions,
        averageTicket: company.averageTicket,
        comparisonLastYear: company.trend
      },
      monthlyRevenue: realizadoData.monthlyRevenue.map(m => ({
        ...m,
        revenue: Math.round(m.revenue * ratio * 100) / 100,
        transactions: Math.floor(m.transactions * ratio)
      }))
    });
  }, [selectedCompanyId, realizadoData]);

  // Buscar automaticamente quando filtros mudarem
  useEffect(() => {
    if (selectedGroupId) {
      setSelectedCompanyId(null);
      fetchRealizadoData();
    } else {
      setRealizadoData(null);
      setFilteredData(null);
    }
  }, [selectedGroupId, selectedYear]);

  // Formatar valor em R$
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'R$ 0,00';
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Formatar número compacto
  const formatCompact = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };

  // Custom tooltip para gráficos
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-200 rounded-xl shadow-xl">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium text-gray-900">{formatCurrency(entry.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Obter cor da empresa
  const getCompanyColor = (index: number) => {
    return COMPANY_COLORS[index % COMPANY_COLORS.length];
  };

  // Selecionar/deselecionar empresa
  const handleCompanyClick = (companyId: string) => {
    if (selectedCompanyId === companyId) {
      setSelectedCompanyId(null);
    } else {
      setSelectedCompanyId(companyId);
    }
  };

  // Combinar dados de faturamento e metas para o gráfico
  const chartData = filteredData?.monthlyRevenue.map(month => {
    const goal = filteredData.monthlyGoals.find(g => g.month === month.month);
    return {
      month: month.monthName,
      monthFull: month.monthNameFull,
      revenue: month.revenue,
      goal: goal?.goal || 0
    };
  }) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Realizado por Mês</h1>
          <p className="text-gray-500">Dashboard de performance mensal por empresa</p>
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
              value={groupName || ''}
              disabled
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
            />
          ) : (
            <select
              value={selectedGroupId || ''}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {(groups || []).map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Ano */}
        <div className="w-28">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Botão Atualizar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">&nbsp;</label>
          <button
            onClick={fetchRealizadoData}
            disabled={loading || !selectedGroupId}
            title="Atualizar Dados"
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <RefreshCw size={20} />
            )}
          </button>
        </div>

        {/* Indicador de filtro ativo */}
        {selectedCompanyId && realizadoData && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <CheckCircle2 size={16} className="text-blue-600" />
            <span className="text-sm font-medium text-blue-700">
              Filtrando: {realizadoData.companies.find(c => c.id === selectedCompanyId)?.name}
            </span>
            <button
              onClick={() => setSelectedCompanyId(null)}
              className="ml-2 p-1 hover:bg-blue-100 rounded transition-colors"
            >
              <X size={14} className="text-blue-600" />
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">Carregando dados...</p>
        </div>
      )}

      {!selectedGroupId && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <BarChart3 size={48} className="mx-auto text-blue-500 mb-4" />
          <p className="text-blue-800 font-medium">Selecione um grupo para visualizar os dados</p>
        </div>
      )}

      {/* Erro */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-700">Erro ao carregar dados</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={fetchRealizadoData}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Conteúdo Principal */}
      {!loading && !error && filteredData && realizadoData && (
        <div className="space-y-6">
          {/* Cards de Empresas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {realizadoData.companies.map((company, index) => {
              const colors = getCompanyColor(index);
              const isSelected = selectedCompanyId === company.id;
              
              return (
                <div
                  key={company.id}
                  onClick={() => handleCompanyClick(company.id)}
                  className={`
                    relative overflow-hidden bg-white rounded-2xl p-6 cursor-pointer
                    transition-all duration-300 hover:shadow-lg
                  `}
                  style={{
                    border: `2px solid ${colors.hex}40`,
                    boxShadow: isSelected ? `0 0 0 2px ${colors.hex}60` : undefined
                  }}
                >
                  {/* Indicador de seleção */}
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-bl-full" />
                  )}

                  {/* Header do card */}
                  <div className="relative mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Meta de Faturamento</h3>
                          <p className="text-xs text-gray-400">Valor total em vendas</p>
                        </div>
                      </div>
                      {company.status === 'achieved' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          Concluído
                        </span>
                      )}
                      {company.status === 'ontrack' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                          <TrendingUp size={12} />
                          No Caminho
                        </span>
                      )}
                      {company.status === 'behind' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                          Atrasado
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-gray-900">{company.name}</p>
                  </div>

                  {/* Realizado e Meta */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Realizado</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(company.revenue)}</p>
                    </div>
                    
                    {/* Barra de progresso */}
                    <div className="space-y-1">
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 transition-all duration-300"
                          style={{ width: `${Math.min(company.progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Progresso</span>
                        <span className="text-sm font-semibold text-orange-600">{company.progress.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Meta</p>
                      <p className="text-lg font-semibold text-gray-700">{formatCurrency(company.goal)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Faturamento Total */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign size={20} className="text-blue-600" />
                  <p className="text-sm font-medium text-gray-500">Faturamento Total</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(filteredData.summary.totalRevenue)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {filteredData.summary.totalTransactions.toLocaleString('pt-BR')} transações
                </p>
              </div>
            </div>

            {/* Média Diária */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar size={20} className="text-emerald-600" />
                  <p className="text-sm font-medium text-gray-500">Média Diária</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(filteredData.summary.totalRevenue / 365)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Ano {filteredData.period.year}</p>
              </div>
            </div>

            {/* Melhor Mês */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp size={20} className="text-purple-600" />
                  <p className="text-sm font-medium text-gray-500">Melhor Mês</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(filteredData.summary.bestMonth.revenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {filteredData.monthlyRevenue.find(m => m.month === filteredData.summary.bestMonth.month)?.monthNameFull || 'N/A'}
                </p>
              </div>
            </div>

            {/* Comparação Ano Anterior */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  {filteredData.summary.comparisonLastYear >= 0 ? (
                    <TrendingUp size={20} className="text-emerald-600" />
                  ) : (
                    <TrendingDown size={20} className="text-rose-600" />
                  )}
                  <p className="text-sm font-medium text-gray-500">vs Ano Anterior</p>
                </div>
                <p className={`text-2xl font-bold ${
                  filteredData.summary.comparisonLastYear >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {filteredData.summary.comparisonLastYear >= 0 ? '+' : ''}
                  {filteredData.summary.comparisonLastYear.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Comparação anual</p>
              </div>
            </div>
          </div>

          {/* Gráfico de Faturamento Mensal com Metas */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Faturamento Mês a Mês</h3>
              <p className="text-sm text-gray-500">
                {filteredData.period.year}
                {selectedCompanyId && realizadoData.companies.find(c => c.id === selectedCompanyId) && (
                  <span className="ml-2 text-blue-600">
                    • {realizadoData.companies.find(c => c.id === selectedCompanyId)?.name}
                  </span>
                )}
              </p>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#93c5fd" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="colorGoalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.6}/>
                      <stop offset="100%" stopColor="#6ee7b7" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCompact(value)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                  />
                  <Bar
                    dataKey="revenue"
                    name="Faturamento"
                    fill="url(#colorRevenueGradient)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  >
                    <LabelList 
                      dataKey="revenue" 
                      position="top"
                      formatter={(value: number) => formatCompact(value)}
                      style={{ fontSize: '10px', fill: '#6b7280' }}
                    />
                  </Bar>
                  <Area
                    type="monotone"
                    dataKey="goal"
                    name="Meta"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="url(#colorGoalGradient)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
