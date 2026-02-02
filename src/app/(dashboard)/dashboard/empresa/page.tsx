'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Building, 
  Loader2, 
  Target,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShoppingCart,
  DollarSign,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
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

interface ShiftGoal {
  id: string;
  shiftId: string;
  shiftName: string;
  goalValue: number;
  goalUnit: string;
  realized: number;
  progress: number;
  status: 'achieved' | 'ontrack' | 'behind';
}

interface SaleModeGoal {
  id: string;
  saleModeId: string;
  saleModeName: string;
  shiftId?: string;
  shiftName?: string;
  goalValue: number;
  goalUnit: string;
  realized: number;
  progress: number;
  status: 'achieved' | 'ontrack' | 'behind';
}

interface DashboardData {
  company: {
    id: string;
    name: string;
  };
  period: {
    year: number;
    month: number;
  };
  revenue: {
    goal: number;
    realized: number;
    progress: number;
    status: 'achieved' | 'ontrack' | 'behind';
  };
  sales: {
    count: number;
    averageTicket: number;
  };
  tendency: {
    projectedTotal: number;
    willMeetGoal: boolean;
    avgWeekday: number;
    avgWeekend: number;
    remainingDays: number;
    remainingWeekdays: number;
    remainingWeekends: number;
    confidence: 'low' | 'medium' | 'high';
  };
  shifts: ShiftGoal[];
  saleModes: SaleModeGoal[];
  summary: {
    totalShifts: number;
    shiftsAchieved: number;
    totalSaleModes: number;
    saleModesAchieved: number;
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

export default function DashboardEmpresaPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  // Buscar empresas quando grupo mudar
  useEffect(() => {
    if (!selectedGroupId) return;
    const fetchCompanies = async () => {
      try {
        const res = await fetch(`/api/companies?group_id=${selectedGroupId}`);
        if (res.ok) {
          const data = await res.json();
          setCompanies(data.companies || []);
          setSelectedCompany('');
          setDashboardData(null);
        }
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
      }
    };
    fetchCompanies();
  }, [selectedGroupId]);

  // Buscar dados do dashboard
  const fetchDashboard = async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/company?company_id=${selectedCompany}&year=${selectedYear}&month=${selectedMonth}&group_id=${selectedGroupId}`
      );
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Erro ao buscar dashboard:', res.status, errorData);
        alert(`Erro ao buscar dados: ${errorData.error || 'Erro desconhecido'}`);
        setDashboardData(null);
      }
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  // Buscar automaticamente quando empresa ou período mudar
  useEffect(() => {
    if (selectedCompany) {
      fetchDashboard();
    } else {
      setDashboardData(null);
    }
  }, [selectedCompany, selectedYear, selectedMonth]);

  // Referência para controlar se confetti já foi mostrado
  const confettiShownRef = useRef<string>('');

  // Efeito de confetes quando bater TODAS as metas
  useEffect(() => {
    if (!dashboardData) return;
    
    // Verificar se bateu a meta de faturamento
    const revenueAchieved = dashboardData.revenue?.status === 'achieved' && dashboardData.revenue.goal > 0;
    
    // Verificar se bateu TODAS as metas de turno
    const allShiftsAchieved = dashboardData.shifts.length === 0 || 
      dashboardData.shifts.every(s => s.status === 'achieved');
    
    // Verificar se bateu TODAS as metas de modo de venda
    const allSaleModesAchieved = dashboardData.saleModes.length === 0 || 
      dashboardData.saleModes.every(s => s.status === 'achieved');
    
    // Só explodir confetes se bateu TODAS as metas
    if (revenueAchieved && allShiftsAchieved && allSaleModesAchieved) {
      const key = `${selectedCompany}-${selectedYear}-${selectedMonth}`;
      
      if (confettiShownRef.current !== key) {
        confettiShownRef.current = key;
        
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          });
        }, 250);

        setTimeout(() => {
          confetti({
            particleCount: 150,
            spread: 100,
            colors: ['#FFD700', '#FFA500', '#FF6347', '#00FF00', '#1E90FF'],
            origin: { y: 0.3 }
          });
        }, 500);
      }
    }
  }, [dashboardData, selectedCompany, selectedYear, selectedMonth]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'achieved': return <CheckCircle size={16} className="text-emerald-600" />;
      case 'ontrack': return <TrendingUp size={16} className="text-amber-500" />;
      case 'behind': return <AlertTriangle size={16} className="text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Metas - Empresa</h1>
        <p className="text-gray-500">Acompanhamento de metas por empresa</p>
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
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {groups.map((group: any) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Empresa */}
        <div className="w-56">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Empresa <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione uma empresa...</option>
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
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {[2025, 2026, 2027, 2028, 2029, 2030].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mensagem se não selecionou empresa */}
      {!selectedCompany && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <Building size={48} className="mx-auto text-blue-400 mb-4" />
          <h3 className="text-lg font-medium text-blue-900">Selecione uma empresa</h3>
          <p className="text-blue-600 mt-1">Escolha uma empresa para visualizar o dashboard de metas</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && dashboardData && (
        <div className="space-y-6">
          {/* Card da Empresa + Meta Faturamento */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Card da Empresa - Minimalista */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden flex items-center">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-bl-full" />
              
              <div className="relative flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Building size={28} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {dashboardData.company.name}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={14} />
                    <span>{MONTHS[dashboardData.period.month - 1]?.label} {dashboardData.period.year}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Meta de Faturamento */}
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-bl-full" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${getStatusBgColor(dashboardData.revenue.status)} flex items-center justify-center`}>
                      <DollarSign className={`w-6 h-6 ${getStatusColor(dashboardData.revenue.status)}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Meta de Faturamento</h3>
                      <p className="text-sm text-gray-500">Valor total em vendas</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getStatusBgColor(dashboardData.revenue.status)}`}>
                    {getStatusIcon(dashboardData.revenue.status)}
                    <span className={`text-sm font-medium ${getStatusColor(dashboardData.revenue.status)}`}>
                      {dashboardData.revenue.status === 'achieved' ? 'Atingida!' : 
                       dashboardData.revenue.status === 'ontrack' ? 'No Caminho' : 'Atenção'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Realizado</p>
                    <p className={`text-3xl font-bold ${getStatusColor(dashboardData.revenue.status)}`}>
                      {formatCurrency(dashboardData.revenue.realized)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Meta</p>
                    <p className="text-3xl font-bold text-gray-700">
                      {formatCurrency(dashboardData.revenue.goal)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(dashboardData.revenue.status)}`}
                      style={{ width: `${Math.min(dashboardData.revenue.progress, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progresso</span>
                  <span className={`font-semibold ${getStatusColor(dashboardData.revenue.status)}`}>
                    {dashboardData.revenue.progress}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card de Tendência */}
          {dashboardData.tendency && dashboardData.revenue.goal > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  dashboardData.tendency.willMeetGoal ? 'bg-emerald-100' : 'bg-orange-100'
                }`}>
                  <TrendingUp size={20} className={
                    dashboardData.tendency.willMeetGoal ? 'text-emerald-600' : 'text-orange-600'
                  } />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Tendência do Mês</h3>
                  <p className="text-sm text-gray-500">
                    Projeção baseada em {dashboardData.tendency.confidence === 'high' ? 'dados consolidados' : 
                      dashboardData.tendency.confidence === 'medium' ? 'dados parciais' : 'poucos dados'}
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Projeção */}
                  <div className={`rounded-xl p-6 ${
                    dashboardData.tendency.willMeetGoal 
                      ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200' 
                      : 'bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        dashboardData.tendency.willMeetGoal ? 'bg-emerald-100' : 'bg-orange-100'
                      }`}>
                        {dashboardData.tendency.willMeetGoal 
                          ? <CheckCircle size={20} className="text-emerald-600" />
                          : <AlertTriangle size={20} className="text-orange-600" />
                        }
                      </div>
                      <div>
                        <p className={`font-semibold ${
                          dashboardData.tendency.willMeetGoal ? 'text-emerald-700' : 'text-orange-700'
                        }`}>
                          {dashboardData.tendency.willMeetGoal 
                            ? '✨ Vai bater a meta!' 
                            : '⚠️ Risco de não bater a meta'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Projeção para o final do mês
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-bold ${
                        dashboardData.tendency.willMeetGoal ? 'text-emerald-600' : 'text-orange-600'
                      }`}>
                        {formatCurrency(dashboardData.tendency.projectedTotal)}
                      </span>
                      <span className="text-gray-500">
                        / {formatCurrency(dashboardData.revenue.goal)}
                      </span>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600">
                      {dashboardData.tendency.willMeetGoal ? (
                        <span>
                          Projeção {formatCurrency(dashboardData.tendency.projectedTotal - dashboardData.revenue.goal)} acima da meta
                        </span>
                      ) : (
                        <span>
                          Faltam {formatCurrency(dashboardData.revenue.goal - dashboardData.tendency.projectedTotal)} para atingir
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Médias e dias restantes */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Média por tipo de dia</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">📅 Dias úteis</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(dashboardData.tendency.avgWeekday)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">🏖️ FDS/Feriados</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(dashboardData.tendency.avgWeekend)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-xs text-blue-600 uppercase tracking-wide mb-2">Dias restantes</p>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{dashboardData.tendency.remainingWeekdays}</p>
                          <p className="text-xs text-blue-500">úteis</p>
                        </div>
                        <div className="text-gray-300">+</div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{dashboardData.tendency.remainingWeekends}</p>
                          <p className="text-xs text-blue-500">FDS/feriado</p>
                        </div>
                        <div className="text-gray-300">=</div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-700">{dashboardData.tendency.remainingDays}</p>
                          <p className="text-xs text-blue-500">total</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metas por Turno */}
          {dashboardData.shifts.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Clock size={20} className="text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Metas por Turno</h3>
                  <p className="text-sm text-gray-500">
                    {dashboardData.summary.shiftsAchieved} de {dashboardData.summary.totalShifts} turnos atingiram a meta
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData.shifts.map((shift) => (
                    <div key={shift.id} className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{shift.shiftName}</h4>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(shift.status)} ${getStatusColor(shift.status)}`}>
                          {shift.status === 'achieved' ? '✓' : shift.status === 'ontrack' ? '→' : '!'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Realizado:</span>
                          <span className={`font-semibold ${getStatusColor(shift.status)}`}>
                            {formatCurrency(shift.realized)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Meta:</span>
                          <span className="text-gray-700">{formatCurrency(shift.goalValue)}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full ${getProgressBarColor(shift.status)}`}
                            style={{ width: `${Math.min(shift.progress, 100)}%` }}
                          />
                        </div>
                        <div className="text-center text-sm font-semibold text-gray-700">
                          {shift.progress}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Metas por Modo de Venda */}
          {dashboardData.saleModes.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                  <ShoppingCart size={20} className="text-teal-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Metas por Modo de Venda</h3>
                  <p className="text-sm text-gray-500">
                    {dashboardData.summary.saleModesAchieved} de {dashboardData.summary.totalSaleModes} modos atingiram a meta
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData.saleModes.map((mode) => (
                    <div key={mode.id} className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {mode.saleModeName === 'Delivery' 
                              ? '🛵' 
                              : '🍽️'}
                          </span>
                          <div>
                            <h4 className="font-semibold text-gray-900">{mode.saleModeName}</h4>
                            {mode.shiftName && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                {mode.shiftName === 'Almoço' ? '☀️' : '🌙'} {mode.shiftName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(mode.status)} ${getStatusColor(mode.status)}`}>
                          {mode.status === 'achieved' ? '✓' : mode.status === 'ontrack' ? '→' : '!'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Realizado:</span>
                          <span className={`font-semibold ${getStatusColor(mode.status)}`}>
                            {formatCurrency(mode.realized)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Meta:</span>
                          <span className="text-gray-700">{formatCurrency(mode.goalValue)}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full ${getProgressBarColor(mode.status)}`}
                            style={{ width: `${Math.min(mode.progress, 100)}%` }}
                          />
                        </div>
                        <div className="text-center text-sm font-semibold text-gray-700">
                          {mode.progress}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}