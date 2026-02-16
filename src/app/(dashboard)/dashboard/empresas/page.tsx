'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  Loader2, 
  Target,
  TrendingUp,
  Award,
  AlertTriangle,
  Calendar,
  Clock,
  ShoppingCart,
  DollarSign,
  Trophy,
  Medal,
  Eye,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { useGroupFilter } from '@/hooks/useGroupFilter';
import { MobileExpandableCard } from '@/components/MobileExpandableCard';

interface CompanyGroup {
  id: string;
  name: string;
}

interface CompanyData {
  id: string;
  name: string;
  ranking: number;
  revenue: {
    goal: number;
    realized: number;
    progress: number;
    status: 'achieved' | 'ontrack' | 'behind';
  };
  shifts: {
    total: number;
    achieved: number;
    progress: number;
  };
  saleModes: {
    total: number;
    achieved: number;
    progress: number;
  };
}

interface CompaniesData {
  period: { year: number; month: number };
  companies: CompanyData[];
  summary: {
    total: number;
    achievedRevenue: number;
    onTrackRevenue: number;
    behindRevenue: number;
    totalRevenueGoal: number;
    totalRevenueRealized: number;
    totalShiftGoals: number;
    totalShiftsAchieved: number;
    totalSaleModeGoals: number;
    totalSaleModesAchieved: number;
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

type SortField = 'ranking' | 'name' | 'revenue' | 'shifts' | 'saleModes';
type SortOrder = 'asc' | 'desc';

export default function DashboardEmpresasPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [companiesData, setCompaniesData] = useState<CompaniesData | null>(null);
  const [sortField, setSortField] = useState<SortField>('ranking');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Buscar dados das empresas
  const fetchCompaniesData = async () => {
    if (!selectedGroupId) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/companies?group_id=${selectedGroupId}&year=${selectedYear}&month=${selectedMonth}`
      );
      if (res.ok) {
        const data = await res.json();
        setCompaniesData(data);
      } else {
        console.error('Erro ao buscar dados das empresas');
        setCompaniesData(null);
      }
    } catch (error) {
      console.error('Erro ao buscar dados das empresas:', error);
      setCompaniesData(null);
    } finally {
      setLoading(false);
    }
  };

  // Buscar automaticamente quando grupo ou período mudar
  useEffect(() => {
    if (selectedGroupId) {
      fetchCompaniesData();
    } else {
      setCompaniesData(null);
    }
  }, [selectedGroupId, selectedYear, selectedMonth]);

  // Formatar valor em R$
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'R$ 0,00';
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'achieved': return 'text-emerald-600';
      case 'ontrack': return 'text-amber-500';
      case 'behind': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'achieved': return 'bg-emerald-100';
      case 'ontrack': return 'bg-amber-100';
      case 'behind': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'achieved': return 'bg-gradient-to-r from-emerald-400 to-emerald-600';
      case 'ontrack': return 'bg-gradient-to-r from-amber-400 to-amber-500';
      case 'behind': return 'bg-gradient-to-r from-red-400 to-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getRankingBadge = (ranking: number) => {
    if (ranking === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
          <Trophy size={16} className="text-white" />
        </div>
      );
    }
    if (ranking === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-lg">
          <Medal size={16} className="text-white" />
        </div>
      );
    }
    if (ranking === 3) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
          <Medal size={16} className="text-white" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-600">{ranking}º</span>
      </div>
    );
  };

  // Ordenar empresas
  const sortedCompanies = companiesData?.companies ? [...companiesData.companies].sort((a: any, b: any) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'ranking':
        comparison = a.ranking - b.ranking;
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'revenue':
        comparison = b.revenue.realized - a.revenue.realized;
        break;
      case 'shifts':
        comparison = b.shifts.progress - a.shifts.progress;
        break;
      case 'saleModes':
        comparison = b.saleModes.progress - a.saleModes.progress;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  }) : [];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Empresas</h1>
        <p className="text-gray-500">Visão geral de todas as empresas</p>
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
              {groups.map((group: any) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Mês */}
        <div className="w-full sm:w-40">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {MONTHS.map((month) => (
              <option key={month.value} value={month.value}>{month.label}</option>
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
            {[2025, 2026, 2027, 2028, 2029, 2030].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mensagem se não selecionou grupo */}
      {!selectedGroupId && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-8 text-center">
          <Building2 size={48} className="mx-auto text-indigo-400 mb-4" />
          <h3 className="text-lg font-medium text-indigo-900">Selecione um grupo</h3>
          <p className="text-indigo-600 mt-1">Escolha um grupo para visualizar o desempenho das empresas</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      )}

      {/* Conteúdo */}
      {!loading && companiesData && (
        <div className="space-y-6">
          {/* Cards de Resumo - em mobile: um abaixo do outro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total de Empresas */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Building2 size={28} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Empresas</p>
                <p className="text-3xl font-bold text-gray-900">{companiesData.summary.total}</p>
              </div>
            </div>

            {/* Bateram Meta Faturamento */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Award size={28} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Bateram Faturamento</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {companiesData.summary.achievedRevenue}
                  <span className="text-lg text-gray-400">/{companiesData.summary.total}</span>
                </p>
              </div>
            </div>

            {/* Faturamento Total */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={20} className="text-blue-600" />
                <p className="text-sm text-gray-500">Faturamento Total</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(companiesData.summary.totalRevenueRealized)}
              </p>
              <p className="text-sm text-gray-500">
                Meta: {formatCurrency(companiesData.summary.totalRevenueGoal)}
              </p>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                  style={{ 
                    width: `${Math.min((companiesData.summary.totalRevenueRealized / companiesData.summary.totalRevenueGoal) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>

            {/* Metas de Turno */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock size={28} className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Metas Turno</p>
                <p className="text-3xl font-bold text-orange-600">
                  {companiesData.summary.totalShiftsAchieved}
                  <span className="text-lg text-gray-400">/{companiesData.summary.totalShiftGoals}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Ranking de Empresas - em mobile: só o card, expandir ao clicar */}
          <MobileExpandableCard
            title="Ranking de Empresas"
            subtitle={`${MONTHS[companiesData.period.month - 1]?.label} ${companiesData.period.year}`}
          >
            {companiesData.companies.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Nenhuma empresa encontrada neste grupo</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th 
                        className="text-left px-6 py-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('ranking')}
                      >
                        <div className="flex items-center gap-1">
                          # <SortIcon field="ranking" />
                        </div>
                      </th>
                      <th 
                        className="text-left px-6 py-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Empresa <SortIcon field="name" />
                        </div>
                      </th>
                      <th 
                        className="text-left px-6 py-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('revenue')}
                      >
                        <div className="flex items-center gap-1">
                          Faturamento <SortIcon field="revenue" />
                        </div>
                      </th>
                      <th className="text-center px-6 py-3 text-sm font-semibold text-gray-700">Progresso</th>
                      <th 
                        className="text-center px-6 py-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('shifts')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Turnos <SortIcon field="shifts" />
                        </div>
                      </th>
                      <th 
                        className="text-center px-6 py-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('saleModes')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Modos <SortIcon field="saleModes" />
                        </div>
                      </th>
                      <th className="text-center px-6 py-3 text-sm font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedCompanies.map((company) => (
                      <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                        {/* Ranking */}
                        <td className="px-6 py-4">
                          {getRankingBadge(company.ranking)}
                        </td>

                        {/* Empresa */}
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{company.name}</p>
                        </td>

                        {/* Faturamento */}
                        <td className="px-6 py-4">
                          <div>
                            <p className={`font-semibold ${getStatusColor(company.revenue.status)}`}>
                              {formatCurrency(company.revenue.realized)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Meta: {formatCurrency(company.revenue.goal)}
                            </p>
                          </div>
                        </td>

                        {/* Progresso */}
                        <td className="px-6 py-4">
                          <div className="w-32 mx-auto">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-semibold ${getStatusColor(company.revenue.status)}`}>
                                {company.revenue.progress}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getProgressBarColor(company.revenue.status)}`}
                                style={{ width: `${Math.min(company.revenue.progress, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Turnos */}
                        <td className="px-6 py-4 text-center">
                          {company.shifts.total > 0 ? (
                            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${
                              company.shifts.achieved === company.shifts.total
                                ? 'bg-emerald-100 text-emerald-700'
                                : company.shifts.achieved > 0
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              <Clock size={14} />
                              <span className="font-medium">
                                {company.shifts.achieved}/{company.shifts.total}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>

                        {/* Modos de Venda */}
                        <td className="px-6 py-4 text-center">
                          {company.saleModes.total > 0 ? (
                            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${
                              company.saleModes.achieved === company.saleModes.total
                                ? 'bg-emerald-100 text-emerald-700'
                                : company.saleModes.achieved > 0
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              <ShoppingCart size={14} />
                              <span className="font-medium">
                                {company.saleModes.achieved}/{company.saleModes.total}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/dashboard/empresa?company=${company.id}&year=${companiesData.period.year}&month=${companiesData.period.month}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                          >
                            <Eye size={16} />
                            <span className="text-sm font-medium">Detalhes</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </MobileExpandableCard>
        </div>
      )}
    </div>
  );
}
