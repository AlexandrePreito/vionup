'use client';

import { useState, useEffect } from 'react';
import { 
  Loader2, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  DollarSign,
  Store,
  Utensils,
  Bike,
  Sun,
  Moon,
  BarChart3,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  X,
  CheckCircle2,
  Package,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
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
}

interface DailyRevenue {
  date: string;
  day: number;
  dayOfWeek: string;
  revenue: number;
  transactions: number;
}

interface SaleModeRevenue {
  mode: string;
  revenue: number;
  transactions: number;
  percentage: number;
}

interface ShiftRevenue {
  shift: string;
  revenue: number;
  transactions: number;
  percentage: number;
}

interface RealizadoData {
  period: { year: number; month: number };
  companies: Company[];
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageTicket: number;
    bestDay: { date: string; revenue: number };
    worstDay: { date: string; revenue: number };
    comparisonLastMonth: number;
  };
  dailyRevenue: DailyRevenue[];
  saleModeRevenue: SaleModeRevenue[];
  shiftRevenue: ShiftRevenue[];
  weekdayAverage: Array<{
    dayOfWeek: string;
    dayOfWeekFull: string;
    average: number;
    totalRevenue: number;
    dayCount: number;
  }>;
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

const COMPANY_COLORS = [
  { bg: 'from-blue-500 to-cyan-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-500', hex: '#3b82f6' },
  { bg: 'from-emerald-500 to-teal-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-500', hex: '#10b981' },
  { bg: 'from-purple-500 to-pink-500', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-500', hex: '#8b5cf6' },
  { bg: 'from-amber-500 to-orange-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-500', hex: '#f59e0b' },
  { bg: 'from-rose-500 to-red-500', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-500', hex: '#f43f5e' },
  { bg: 'from-indigo-500 to-violet-500', light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-500', hex: '#6366f1' },
];

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function DashboardRealizadoMensalPage() {
  // Usar hook para grupos
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  
  // Estados para dados
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realizadoData, setRealizadoData] = useState<RealizadoData | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<RealizadoData | null>(null);

  // Buscar dados realizados
  const fetchRealizadoData = async () => {
    if (!selectedGroupId) return;
    
    setLoading(true);
    setError(null);
    try {
      // Criar um AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos de timeout
      
      const res = await fetch(
        `/api/dashboard/realizado?group_id=${selectedGroupId}&year=${selectedYear}&month=${selectedMonth}`,
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
        comparisonLastMonth: company.trend
      },
      dailyRevenue: realizadoData.dailyRevenue.map(d => ({
        ...d,
        revenue: Math.round(d.revenue * ratio * 100) / 100,
        transactions: Math.floor(d.transactions * ratio)
      })),
      saleModeRevenue: realizadoData.saleModeRevenue.map(s => ({
        ...s,
        revenue: Math.round(s.revenue * ratio * 100) / 100,
        transactions: Math.floor(s.transactions * ratio)
      })),
      shiftRevenue: realizadoData.shiftRevenue.map(s => ({
        ...s,
        revenue: Math.round(s.revenue * ratio * 100) / 100,
        transactions: Math.floor(s.transactions * ratio)
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
  }, [selectedGroupId, selectedYear, selectedMonth]);

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

  // Formatar número
  const formatNumber = (value: number) => {
    return value.toLocaleString('pt-BR');
  };

  // Custom tooltip para gráficos
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-200 rounded-xl shadow-xl">
          <p className="font-semibold text-gray-900 mb-2">Dia {label}</p>
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

  // Ícone do modo de venda
  const getSaleModeIcon = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'local': return <Store size={20} />;
      case 'delivery': return <Bike size={20} />;
      case 'retirada': return <Package size={20} />;
      default: return <Store size={20} />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Realizado por Dia</h1>
          <p className="text-gray-500">Dashboard de performance por empresa</p>
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
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {(groups || []).map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Mês */}
        <div className="w-40">
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
        <div className="w-28">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((year: any) => (
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
              const maxRevenue = Math.max(...realizadoData.companies.map(c => c.revenue));
              
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
                  <div className="relative mb-2">
                    <div>
                      <p className="text-lg font-bold" style={{ color: colors.hex }}>{company.name}</p>
                    </div>
                  </div>

                  {/* Valor principal */}
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(company.revenue)}</p>
                  </div>

                  {/* Variação */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Variação</span>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      company.trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {company.trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                      {Math.abs(company.trend).toFixed(1)}%
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
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <DollarSign size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Faturamento</h3>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(filteredData.summary.totalRevenue)}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium w-fit ${
                  filteredData.summary.comparisonLastMonth >= 0 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-rose-100 text-rose-700'
                }`}>
                  {filteredData.summary.comparisonLastMonth >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {Math.abs(filteredData.summary.comparisonLastMonth).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Média Diária */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <TrendingUp size={24} className="text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Média Diária</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(
                        (() => {
                          const daysInMonth = new Date(filteredData.period.year, filteredData.period.month, 0).getDate();
                          return daysInMonth > 0 ? filteredData.summary.totalRevenue / daysInMonth : 0;
                        })()
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pior Dia */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Calendar size={24} className="text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Pior Dia</h3>
                    <p className="text-2xl font-bold text-rose-600">{formatCurrency(filteredData.summary.worstDay.revenue)}</p>
                    {filteredData.summary.worstDay.date && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(filteredData.summary.worstDay.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Melhor Dia */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-500/10 to-red-500/10 rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                    <Calendar size={24} className="text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Melhor Dia</h3>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(filteredData.summary.bestDay.revenue)}</p>
                    {filteredData.summary.bestDay.date && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(filteredData.summary.bestDay.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico de Faturamento Diário */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Faturamento Dia a Dia</h3>
              <p className="text-sm text-gray-500">
                {MONTHS[filteredData.period.month - 1]?.label} {filteredData.period.year}
                {selectedCompanyId && realizadoData.companies.find(c => c.id === selectedCompanyId) && (
                  <span className="ml-2 text-blue-600">
                    • {realizadoData.companies.find(c => c.id === selectedCompanyId)?.name}
                  </span>
                )}
              </p>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData.dailyRevenue}>
                  <defs>
                    <linearGradient id="colorRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#93c5fd" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis 
                    dataKey="day" 
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
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grid de Gráficos - Modo de Venda e Período */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Faturamento por Modo de Venda */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">Por Modo de Venda</h3>
                <p className="text-sm text-gray-500">Local • Delivery • Retirada</p>
              </div>

              {filteredData.saleModeRevenue.length > 0 ? (
                <div className="flex items-center gap-8">
                  {/* Gráfico de Pizza */}
                  <div className="w-44 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={filteredData.saleModeRevenue}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="revenue"
                          strokeWidth={0}
                        >
                          {filteredData.saleModeRevenue.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Lista */}
                  <div className="flex-1 space-y-4">
                    {filteredData.saleModeRevenue.map((item, index) => (
                      <div key={item.mode} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${PIE_COLORS[index]}15` }}
                          >
                            <span style={{ color: PIE_COLORS[index] }}>
                              {getSaleModeIcon(item.mode)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.mode}</p>
                            <p className="text-xs text-gray-500">{formatNumber(item.transactions)} pedidos</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(item.revenue)}</p>
                          <div className="flex items-center justify-end gap-1">
                            <div 
                              className="h-1.5 rounded-full"
                              style={{ 
                                width: `${item.percentage}px`, 
                                backgroundColor: PIE_COLORS[index] 
                              }}
                            />
                            <span className="text-xs text-gray-500">{item.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Sem dados de modo de venda
                </div>
              )}
            </div>

            {/* Faturamento por Período */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">Por Período</h3>
                <p className="text-sm text-gray-500">Almoço • Jantar</p>
              </div>

              {filteredData.shiftRevenue.length > 0 ? (
                <div className="space-y-6">
                  {filteredData.shiftRevenue.map((item, index) => {
                    const isAlmoco = item.shift.toLowerCase() === 'almoço';
                    const color = isAlmoco ? '#f59e0b' : '#6366f1';
                    const bgColor = isAlmoco ? 'bg-amber-50' : 'bg-indigo-50';
                    const textColor = isAlmoco ? 'text-amber-600' : 'text-indigo-600';
                    
                    return (
                      <div key={item.shift} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center`}>
                              {isAlmoco ? (
                                <Sun size={24} className={textColor} />
                              ) : (
                                <Moon size={24} className={textColor} />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{item.shift}</p>
                              <p className="text-sm text-gray-500">{formatNumber(item.transactions)} pedidos</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(item.revenue)}</p>
                            <p className={`text-sm font-medium ${textColor}`}>{item.percentage}%</p>
                          </div>
                        </div>
                        
                        {/* Barra de progresso */}
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-700"
                            style={{ 
                              width: `${item.percentage}%`,
                              backgroundColor: color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Sem dados de período
                </div>
              )}
            </div>
          </div>

          {/* Gráfico de Média Diária por Dia da Semana */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Média Diária por Dia da Semana</h3>
              <p className="text-sm text-gray-500">Faturamento médio por dia da semana no período</p>
            </div>
            
            {filteredData.weekdayAverage && filteredData.weekdayAverage.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData.weekdayAverage}>
                    <defs>
                      <linearGradient id="colorWeekdayGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#93c5fd" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis 
                      dataKey="dayOfWeek" 
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
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      labelFormatter={(label) => `Dia: ${label}`}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Bar
                      dataKey="average"
                      name="Média Diária"
                      fill="url(#colorWeekdayGradient)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                    >
                      <LabelList 
                        dataKey="average" 
                        position="top"
                        formatter={(value: number) => formatCurrency(value)}
                        style={{ fontSize: '10px', fill: '#6b7280' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Sem dados disponíveis
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}