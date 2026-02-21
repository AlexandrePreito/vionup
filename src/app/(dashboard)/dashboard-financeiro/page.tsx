'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Target,
  BarChart3
} from 'lucide-react';
import { useGroupFilter } from '@/hooks/useGroupFilter';
import { Button } from '@/components/ui';

const COMPANY_COLORS = [
  { light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', hex: '#3b82f6' },
  { light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', hex: '#10b981' },
  { light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', hex: '#8b5cf6' },
  { light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', hex: '#f59e0b' },
  { light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', hex: '#f43f5e' },
  { light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', hex: '#6366f1' },
];

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

import { FinancialGoalCard, type FinancialGoalItem } from '@/components/dashboard/FinancialGoalCard';

type GoalItem = FinancialGoalItem;

interface Summary {
  total_entradas_meta: number;
  total_entradas_realizado: number;
  total_saidas_meta: number;
  total_saidas_realizado: number;
  resultado_meta: number;
  resultado_realizado: number;
  faturamento_total: number;
}

interface DashboardData {
  goals: GoalItem[];
  summary: Summary;
}

export default function DashboardFinanceiroPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!selectedGroupId) return;
    const fetchCompanies = async () => {
      try {
        const res = await fetch(`/api/companies?group_id=${selectedGroupId}`);
        if (res.ok) {
          const json = await res.json();
          const list = json.companies || [];
          setCompanies(list.filter((c: any) => c.company_group_id === selectedGroupId));
          setSelectedCompanyId('');
        }
      } catch (e) {
        console.error('Erro ao buscar empresas:', e);
      }
    };
    fetchCompanies();
  }, [selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId) {
      setData(null);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({
      group_id: selectedGroupId,
      year: String(selectedYear),
      month: String(selectedMonth)
    });
    if (selectedCompanyId) params.set('company_id', selectedCompanyId);

    fetch(`/api/dashboard-financeiro?${params}`)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedGroupId, selectedYear, selectedMonth, selectedCompanyId]);

  const formatCurrency = (value: number) =>
    (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const entradas = (data?.goals || []).filter(g => g.category_type === 'entrada');
  const saidas = (data?.goals || []).filter(g => g.category_type === 'saida');

  const groupByCategory = (goals: GoalItem[]) => {
    const map = new Map<string, { geral: GoalItem | null; porEmpresa: GoalItem[] }>();
    for (const g of goals) {
      const key = g.category_id || `${g.category_code || ''}-${g.category_name}`;
      let entry = map.get(key);
      if (!entry) {
        entry = { geral: null, porEmpresa: [] };
        map.set(key, entry);
      }
      if (!g.company_id) {
        entry.geral = g;
      } else {
        entry.porEmpresa.push(g);
      }
    }
    return map;
  };

  const computeAggregateGeral = (goals: GoalItem[], isSaida: boolean): GoalItem | null => {
    if (goals.length === 0) return null;
    const first = goals[0];
    const realized_value = goals.reduce((s, g) => s + g.realized_value, 0);
    const total_revenue = goals.reduce((s, g) => s + (g.total_revenue ?? 0), 0);
    let goal_value: number;
    let realized_percentage: number;
    let progress: number;
    let status: 'achieved' | 'ontrack' | 'behind' = 'behind';
    if (first.goal_type === 'value') {
      goal_value = goals.reduce((s, g) => s + g.goal_value, 0);
      realized_percentage = goal_value > 0 ? (realized_value / goal_value) * 100 : 0;
      progress = goal_value > 0 ? (realized_value / goal_value) * 100 : 0;
    } else {
      goal_value = first.goal_value;
      realized_percentage = total_revenue > 0 ? (realized_value / total_revenue) * 100 : 0;
      progress = goal_value > 0 ? (realized_percentage / goal_value) * 100 : 0;
    }
    if (isSaida) {
      const effectiveRealized = first.goal_type === 'percentage' ? realized_percentage : realized_value;
      status = effectiveRealized <= goal_value ? 'achieved' : 'behind';
    } else {
      status = progress >= 100 ? 'achieved' : 'behind';
    }
    return {
      ...first,
      id: `agg-${first.category_id || first.category_name}`,
      company_name: 'Geral do grupo',
      realized_value,
      total_revenue: total_revenue || undefined,
      realized_percentage,
      goal_value,
      progress: Math.min(Math.round(progress * 10) / 10, 150),
      status
    };
  };

  const renderCategorySection = (goals: GoalItem[], isSaida: boolean) => {
    const grouped = groupByCategory(goals);
    return Array.from(grouped.entries()).map(([key, { geral, porEmpresa }]) => {
      const displayGeral = geral || (porEmpresa.length >= 1
        ? porEmpresa.length === 1 ? porEmpresa[0] : computeAggregateGeral(porEmpresa, isSaida)
        : null);
      const showPorEmpresa = porEmpresa.length > 1;
      return (
        <div key={key} className="space-y-3">
          {displayGeral && (
            <FinancialGoalCard goal={displayGeral} formatCurrency={formatCurrency} isSaida={isSaida} variant="destaque" />
          )}
          {showPorEmpresa && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-0 md:pl-4">
              {porEmpresa.map(g => {
                const companyIndex = companies.findIndex(c => c.id === g.company_id);
                const companyColor = COMPANY_COLORS[companyIndex >= 0 ? companyIndex % COMPANY_COLORS.length : 0];
                return (
                  <FinancialGoalCard key={g.id} goal={g} formatCurrency={formatCurrency} isSaida={isSaida} variant="menor" companyColor={companyColor} />
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Financeiro (Orçamento)</h1>
        <p className="text-gray-500 text-sm mt-1">Acompanhe metas x realizado do fluxo de caixa</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
        <div className="w-full sm:w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
          {isGroupReadOnly ? (
            <input type="text" value={groupName} disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed" />
          ) : (
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {(groups || []).map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
        </div>
        <div className="w-full sm:w-44">
          <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="w-full sm:w-32">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {[selectedYear - 2, selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      )}

      {!loading && selectedGroupId && !data?.goals?.length && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
          <Target size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma meta cadastrada</h3>
          <p className="text-gray-500 mb-6">Não há metas para este período. Cadastre em Meta Financeiro.</p>
          <Link href="/metas/financeiro">
            <Button>Cadastrar Metas</Button>
          </Link>
        </div>
      )}

      {!loading && data && data.goals.length > 0 && (
        <div className="space-y-6">
          {entradas.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-emerald-800 mb-4 flex items-center gap-2">
                <BarChart3 size={20} />
                Entradas ({entradas.length})
              </h2>
              <div className="space-y-6">
                {renderCategorySection(entradas, false)}
              </div>
            </div>
          )}

          {saidas.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
                <BarChart3 size={20} />
                Saídas ({saidas.length})
              </h2>
              <div className="space-y-6">
                {renderCategorySection(saidas, true)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

