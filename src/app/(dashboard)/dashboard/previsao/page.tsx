'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupFilter } from '@/hooks/useGroupFilter';
import { 
  Building, 
  Calendar,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  BarChart3
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
  Legend,
  LabelList
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

  // Preparar dados do gráfico principal
  const graficoPrincipalData = previsaoData?.grafico.map((item: any) => ({
    ...item,
    mesAnterior: previsaoData.mesAnterior?.grafico.find((g: any) => g.dia === item.dia)?.acumulado || null
  })) || [];

  // Preparar dados do gráfico de análise
  const graficoAnaliseData = previsaoData?.graficoRealizado.map((item: any) => ({
    ...item,
    tendencia: previsaoData.estatisticas.intercept + previsaoData.estatisticas.slope * item.dia,
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
        <div className="w-56">
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
            {[2025, 2026, 2027, 2028, 2029, 2030].map((year: any) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Base de Cálculo */}
        <div className="w-36">
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
            {/* Cards Principais */}
            <div className="grid grid-cols-4 gap-6">
              {/* Card Empresa */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-bl-full" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <Building size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Empresa</h3>
                      <p className="text-lg font-bold text-gray-900">{previsaoData.empresa.name}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {MONTHS.find((m: any) => m.value === previsaoData.periodo.month)?.label} {previsaoData.periodo.year}
                  </p>
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
                </div>
              </div>
            </div>

            {/* Cards Info */}
            <div className="grid grid-cols-2 gap-6">
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

            {/* Gráfico Realizado Diário (Não Acumulado) */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">Realizado Diário</h3>
                <p className="text-sm text-gray-500">Faturamento por dia com projeção</p>
              </div>
              <ResponsiveContainer width="100%" height={280}>
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

            {/* Gráfico Principal */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">Projeção do Mês (Acumulado)</h3>
              </div>
              <ResponsiveContainer width="100%" height={320}>
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
                  >
                    <LabelList 
                      dataKey="otimista" 
                      position="top" 
                      formatter={(value: any) => {
                        if (typeof value !== 'number' || !value) return '';
                        return formatCurrency(value);
                      }}
                      style={{ fontSize: 11, fill: '#10b981', fontWeight: 600 }}
                    />
                  </Line>
                  {/* Linha Realista */}
                  <Line 
                    type="monotone" 
                    dataKey="realista" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#f59e0b', r: 3 }}
                    name="Realista"
                  >
                    <LabelList 
                      dataKey="realista" 
                      position="top" 
                      formatter={(value: any) => {
                        if (typeof value !== 'number' || !value) return '';
                        return formatCurrency(value);
                      }}
                      style={{ fontSize: 11, fill: '#f59e0b', fontWeight: 600 }}
                    />
                  </Line>
                  {/* Linha Pessimista */}
                  <Line 
                    type="monotone" 
                    dataKey="pessimista" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#ef4444', r: 3 }}
                    name="Pessimista"
                  >
                    <LabelList 
                      dataKey="pessimista" 
                      position="top" 
                      formatter={(value: any) => {
                        if (typeof value !== 'number' || !value) return '';
                        return formatCurrency(value);
                      }}
                      style={{ fontSize: 11, fill: '#ef4444', fontWeight: 600 }}
                    />
                  </Line>
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

            {/* Grid 2 Colunas */}
            <div className="grid grid-cols-2 gap-6">
              {/* Coluna Esquerda - Gráfico de Análise */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Análise do Período</h3>
                <p className="text-sm text-gray-500 mb-6">Realizado diário com tendência e mediana</p>
                
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
              </div>

              {/* Coluna Direita - Tabela de Projeção */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Projeção por Dia</h3>
                <p className="text-sm text-gray-500 mb-6">Detalhamento dos dias restantes</p>
                
                <div className="overflow-x-auto">
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
              </div>
            </div>
        </>
      )}
    </div>
  );
}
