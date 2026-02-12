'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Loader2, 
  Target,
  TrendingUp,
  Award,
  AlertTriangle,
  Building,
  Calendar,
  Package,
  DollarSign,
  Trophy,
  Medal,
  Eye,
  ChevronUp,
  ChevronDown,
  ClipboardList
} from 'lucide-react';
import Link from 'next/link';
import { useGroupFilter } from '@/hooks/useGroupFilter';

interface CompanyGroup {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
  company_group_id: string;
}

interface EmployeeData {
  id: string;
  name: string;
  code?: string;
  position?: string;
  photoUrl?: string;
  ranking: number;
  revenue: {
    goal: number;
    realized: number;
    progress: number;
    status: 'achieved' | 'ontrack' | 'behind';
  };
  products: {
    total: number;
    achieved: number;
    progress: number;
  };
  research: {
    total: number;
    achieved: number;
    goalValue: number;
    realized: number;
    progress: number;
  };
}

interface TeamData {
  company: { id: string; name: string };
  period: { year: number; month: number };
  employees: EmployeeData[];
  summary: {
    total: number;
    achievedRevenue: number;
    onTrackRevenue: number;
    behindRevenue: number;
    totalRevenueGoal: number;
    totalRevenueRealized: number;
    totalProductGoals: number;
    totalProductsAchieved: number;
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

type SortField = 'ranking' | 'name' | 'revenue' | 'products';
type SortOrder = 'asc' | 'desc';

export default function DashboardEquipePage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [sortField, setSortField] = useState<SortField>('ranking');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Buscar empresas quando grupo mudar
  useEffect(() => {
    if (!selectedGroupId) return;
    const fetchCompanies = async () => {
      try {
        const res = await fetch(`/api/companies?group_id=${selectedGroupId}`);
        if (res.ok) {
          const data = await res.json();
          const companiesList = data.companies || [];
          // Filtro de segurança: garantir que apenas empresas do grupo selecionado sejam exibidas
          const filteredCompanies = companiesList.filter((c: any) => c.company_group_id === selectedGroupId);
          setCompanies(filteredCompanies);
          setSelectedCompany('');
          setTeamData(null);
        }
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
      }
    };
    fetchCompanies();
  }, [selectedGroupId]);

  // Buscar dados da equipe
  const fetchTeamData = async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/team?company_id=${selectedCompany}&year=${selectedYear}&month=${selectedMonth}&group_id=${selectedGroupId}`
      );
      if (res.ok) {
        const data = await res.json();
        setTeamData(data);
      } else {
        console.error('Erro ao buscar dados da equipe');
        setTeamData(null);
      }
    } catch (error) {
      console.error('Erro ao buscar dados da equipe:', error);
      setTeamData(null);
    } finally {
      setLoading(false);
    }
  };

  // Buscar automaticamente quando filial ou período mudar
  useEffect(() => {
    if (selectedCompany) {
      fetchTeamData();
    } else {
      setTeamData(null);
    }
  }, [selectedCompany, selectedYear, selectedMonth]);

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

  // Ordenar funcionários
  const sortedEmployees = teamData?.employees ? [...teamData.employees].sort((a: any, b: any) => {
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
      case 'products':
        comparison = b.products.progress - a.products.progress;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard da Equipe</h1>
          <p className="text-gray-500">Desempenho de todos os vendedores</p>
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
              {groups.map((group: any) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Filial (Obrigatório) */}
        <div className="w-56">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filial <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Selecione uma filial...</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
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
            {MONTHS.map((month) => (
              <option key={month.value} value={month.value}>{month.label}</option>
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
            {[2025, 2026, 2027, 2028, 2029, 2030].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mensagem se não selecionou filial */}
      {!selectedCompany && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-8 text-center">
          <Building size={48} className="mx-auto text-indigo-400 mb-4" />
          <h3 className="text-lg font-medium text-indigo-900">Selecione uma filial</h3>
          <p className="text-indigo-600 mt-1">Escolha uma filial para visualizar o desempenho da equipe</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      )}

      {/* Conteúdo */}
      {!loading && teamData && (
        <div className="space-y-6">
          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total de Vendedores */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Users size={28} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Vendedores</p>
                <p className="text-3xl font-bold text-gray-900">{teamData.summary.total}</p>
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
                  {teamData.summary.achievedRevenue}
                  <span className="text-lg text-gray-400">/{teamData.summary.total}</span>
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
                {formatCurrency(teamData.summary.totalRevenueRealized)}
              </p>
              <p className="text-sm text-gray-500">
                Meta: {formatCurrency(teamData.summary.totalRevenueGoal)}
              </p>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                  style={{ 
                    width: `${Math.min((teamData.summary.totalRevenueRealized / teamData.summary.totalRevenueGoal) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>

            {/* Metas de Produtos */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                <Package size={28} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Metas Produtos</p>
                <p className="text-3xl font-bold text-purple-600">
                  {teamData.summary.totalProductsAchieved}
                  <span className="text-lg text-gray-400">/{teamData.summary.totalProductGoals}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Tabela de Vendedores */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Users size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Ranking de Vendedores</h3>
                  <p className="text-sm text-gray-500">
                    {teamData.company?.name || 'Empresa'} - {teamData.period ? `${MONTHS[teamData.period.month - 1]?.label || ''} ${teamData.period.year || ''}` : ''}
                  </p>
                </div>
              </div>
            </div>

            {teamData.employees.length === 0 ? (
              <div className="p-12 text-center">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Nenhum vendedor encontrado nesta filial</p>
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
                          Vendedor <SortIcon field="name" />
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
                        onClick={() => handleSort('products')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Produtos <SortIcon field="products" />
                        </div>
                      </th>
                      <th className="text-center px-6 py-3 text-sm font-semibold text-gray-700">Pesquisas</th>
                      <th className="text-center px-6 py-3 text-sm font-semibold text-gray-700 w-16">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                        {/* Ranking */}
                        <td className="px-6 py-4">
                          {getRankingBadge(emp.ranking)}
                        </td>

                        {/* Vendedor */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {emp.photoUrl ? (
                              <img
                                src={emp.photoUrl}
                                alt={emp.name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow">
                                <span className="text-sm font-bold text-white">
                                  {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{emp.name}</p>
                              {emp.position && (
                                <p className="text-sm text-gray-500">{emp.position}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Faturamento */}
                        <td className="px-6 py-4">
                          <div>
                            <p className={`font-semibold ${getStatusColor(emp.revenue.status)}`}>
                              {formatCurrency(emp.revenue.realized)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Meta: {formatCurrency(emp.revenue.goal)}
                            </p>
                          </div>
                        </td>

                        {/* Progresso */}
                        <td className="px-6 py-4">
                          <div className="w-32 mx-auto">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-semibold ${getStatusColor(emp.revenue.status)}`}>
                                {emp.revenue.progress}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getProgressBarColor(emp.revenue.status)}`}
                                style={{ width: `${Math.min(emp.revenue.progress, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Produtos */}
                        <td className="px-6 py-4 text-center">
                          {emp.products.total > 0 ? (
                            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${
                              emp.products.achieved === emp.products.total
                                ? 'bg-emerald-100 text-emerald-700'
                                : emp.products.achieved > 0
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              <Package size={14} />
                              <span className="font-medium">
                                {emp.products.achieved}/{emp.products.total}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>

                        {/* Pesquisas (meta de pesquisa: realizado / meta, ex. 0/75) */}
                        <td className="px-6 py-4 text-center">
                          {(emp.research?.goalValue ?? 0) > 0 ? (
                            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${
                              emp.research.progress >= 100
                                ? 'bg-emerald-100 text-emerald-700'
                                : emp.research.progress > 0
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              <ClipboardList size={14} />
                              <span className="font-medium">
                                {emp.research.realized ?? 0}/{emp.research.goalValue}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/dashboard/funcionario?group_id=${selectedGroupId || ''}&company_id=${selectedCompany || ''}&employee=${emp.id}&year=${teamData?.period?.year ?? selectedYear}&month=${teamData?.period?.month ?? selectedMonth}`}
                            className="inline-flex items-center justify-center w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                            title="Detalhes"
                          >
                            <Eye size={18} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
