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
  Calendar,
  Bike,
  UtensilsCrossed,
  Truck,
  ChefHat
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGroupFilter } from '@/hooks/useGroupFilter';
import { MobileExpandableCard } from '@/components/MobileExpandableCard';

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
  cardLabel?: string;
  goalValue: number;
  goalUnit: string;
  realized: number;
  progress: number;
  status: 'achieved' | 'ontrack' | 'behind';
}

interface QualityData {
  goal: number;
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

const COMPANY_COLORS = [
  { bg: 'from-blue-500 to-cyan-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-500', hex: '#3b82f6' },
  { bg: 'from-emerald-500 to-teal-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-500', hex: '#10b981' },
  { bg: 'from-purple-500 to-pink-500', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-500', hex: '#8b5cf6' },
  { bg: 'from-amber-500 to-orange-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-500', hex: '#f59e0b' },
  { bg: 'from-rose-500 to-red-500', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-500', hex: '#f43f5e' },
  { bg: 'from-indigo-500 to-violet-500', light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-500', hex: '#6366f1' },
];

export default function DashboardEmpresaPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [qualityData, setQualityData] = useState<QualityData | null>(null);
  const [loadingQuality, setLoadingQuality] = useState(false);

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

  // Buscar dados de qualidade
  const fetchQualityData = async () => {
    if (!selectedCompany || !selectedGroupId) {
      setQualityData(null);
      return;
    }

    setLoadingQuality(true);
    try {
      // Buscar meta de qualidade
      const goalRes = await fetch(
        `/api/quality-goals?group_id=${selectedGroupId}&company_id=${selectedCompany}&year=${selectedYear}&month=${selectedMonth}`
      );
      
      // Buscar realizado de qualidade
      const resultRes = await fetch(
        `/api/quality-results?group_id=${selectedGroupId}&company_id=${selectedCompany}&year=${selectedYear}&month=${selectedMonth}`
      );

      if (goalRes.ok && resultRes.ok) {
        const goalData = await goalRes.json();
        const resultData = await resultRes.json();

        // Pegar a primeira meta (deve haver apenas uma por empresa/mês)
        const goal = goalData.goals?.[0];
        
        // Só mostrar o card se houver meta cadastrada
        if (goal && goal.target_percentage) {
          // Pegar o primeiro resultado (pode haver múltiplos, mas pegamos o mais recente)
          const result = resultData.results?.[0];

          // O realizado é a porcentagem final do resultado
          let realizedPercentage = 0;
          if (result) {
            if (result.final_percentage !== undefined && result.final_percentage !== null) {
              // Usar a porcentagem final diretamente
              realizedPercentage = result.final_percentage;
            } else if (result.total_achieved !== undefined && result.total_possible !== undefined && result.total_possible > 0) {
              // Calcular a partir de achieved/total
              realizedPercentage = Math.round((result.total_achieved / result.total_possible) * 100 * 100) / 100;
            }
          }
          
          const goalPercentage = goal.target_percentage || 100;
          
          // Calcular progresso: quanto do objetivo foi atingido
          // Se a meta é 96% e o realizado é 96%, então progresso = 100%
          const progress = goalPercentage > 0 ? Math.round((realizedPercentage / goalPercentage) * 100) : 0;
          
          // Como o realizado é lançado apenas uma vez, só há dois status:
          // - "achieved" se atingiu ou superou a meta (>= 100% do objetivo)
          // - "behind" se não atingiu (< 100% do objetivo)
          let status: 'achieved' | 'ontrack' | 'behind' = 'behind';
          if (progress >= 100) {
            status = 'achieved';
          }

          setQualityData({
            goal: goalPercentage,
            realized: Math.round(realizedPercentage * 10) / 10, // Porcentagem realizada
            progress,
            status
          });
        } else {
          // Não há meta cadastrada - não mostrar o card
          setQualityData(null);
        }
      } else {
        // Erro na requisição - não mostrar o card
        setQualityData(null);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de qualidade:', error);
      setQualityData(null);
    } finally {
      setLoadingQuality(false);
    }
  };

  // Buscar automaticamente quando empresa, período ou turno selecionado mudar
  useEffect(() => {
    if (selectedCompany) {
      fetchDashboard();
      fetchQualityData();
    } else {
      setDashboardData(null);
      setQualityData(null);
    }
  }, [selectedCompany, selectedYear, selectedMonth, selectedGroupId]);

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

  // Obter cor da empresa (LED color)
  const getCompanyColor = (index: number) => {
    return COMPANY_COLORS[index % COMPANY_COLORS.length];
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
      case 'achieved': return <CheckCircle size={14} className="text-emerald-600 shrink-0" />;
      case 'ontrack': return <TrendingUp size={14} className="text-amber-500 shrink-0" />;
      case 'behind': return <AlertTriangle size={14} className="text-red-500 shrink-0" />;
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
        <div className="w-full sm:w-56">
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
        <div className="w-full sm:w-40">
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
        <div className="w-full sm:w-28">
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
          {/* Card da Empresa + Meta Faturamento - em mobile: um abaixo do outro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card da Empresa - Minimalista */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-bl-full" />
              
              <div className="relative">
                <div className="mb-4">
                  <h2 
                    className="text-lg font-bold"
                    style={{ 
                      color: companies.findIndex(c => c.id === dashboardData.company.id) >= 0 
                        ? getCompanyColor(companies.findIndex(c => c.id === dashboardData.company.id)).hex 
                        : '#1f2937'
                    }}
                  >
                    {dashboardData.company.name}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={14} />
                    <span>{MONTHS[dashboardData.period.month - 1]?.label} {dashboardData.period.year}</span>
                  </div>
                </div>
                
                {/* Quantidade de Vendas e Ticket Médio */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Quantidade de Vendas</p>
                    <p className="text-xl font-bold text-gray-900">
                      {dashboardData.sales.count.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Ticket Médio</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(dashboardData.sales.averageTicket)}
                    </p>
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
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 ${getStatusBgColor(dashboardData.revenue.status)}`}>
                    {getStatusIcon(dashboardData.revenue.status)}
                    <span className={`text-xs font-medium whitespace-nowrap ${getStatusColor(dashboardData.revenue.status)}`}>
                      {dashboardData.revenue.status === 'achieved' ? 'Atingida!' : 
                       dashboardData.revenue.status === 'ontrack' ? 'No Caminho' : 'Atenção'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 mb-1">Realizado</p>
                    <p className={`text-2xl sm:text-3xl font-bold break-words ${getStatusColor(dashboardData.revenue.status)}`}>
                      {formatCurrency(dashboardData.revenue.realized)}
                    </p>
                  </div>
                  <div className="min-w-0 sm:text-right">
                    <p className="text-sm text-gray-500 mb-1">Meta</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-700 break-words">
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

          {/* Meta de Qualidade */}
          {qualityData && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-bl-full" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${getStatusBgColor(qualityData.status)} flex items-center justify-center`}>
                      <Award className={`w-6 h-6 ${getStatusColor(qualityData.status)}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Meta de Qualidade</h3>
                      <p className="text-sm text-gray-500">Avaliação de qualidade</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 ${getStatusBgColor(qualityData.status)}`}>
                    {getStatusIcon(qualityData.status)}
                    <span className={`text-xs font-medium whitespace-nowrap ${getStatusColor(qualityData.status)}`}>
                      {qualityData.status === 'achieved' ? 'Atingida!' : 'Não Atingida'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 mb-1">Realizado</p>
                    <p className={`text-2xl sm:text-3xl font-bold break-words ${getStatusColor(qualityData.status)}`}>
                      {qualityData.realized.toFixed(1)}%
                    </p>
                  </div>
                  <div className="min-w-0 sm:text-right">
                    <p className="text-sm text-gray-500 mb-1">Meta</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-700 break-words">
                      {qualityData.goal.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(qualityData.status)}`}
                      style={{ width: `${Math.min(qualityData.progress, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progresso</span>
                  <span className={`font-semibold ${getStatusColor(qualityData.status)}`}>
                    {qualityData.progress}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tendência do Mês - em mobile: só o card, expandir ao clicar */}
          {dashboardData.tendency && dashboardData.revenue.goal > 0 && (
            <MobileExpandableCard
              title="Tendência do Mês"
              subtitle={`Projeção baseada em ${dashboardData.tendency.confidence === 'high' ? 'dados consolidados' : 
                dashboardData.tendency.confidence === 'medium' ? 'dados parciais' : 'poucos dados'}`}
            >
              <div className="pt-2">
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
                          {dashboardData.tendency.remainingDays === 0
                            ? (dashboardData.tendency.willMeetGoal 
                                ? '✅ Meta batida!' 
                                : '❌ Meta não batida')
                            : (dashboardData.tendency.willMeetGoal 
                                ? '✨ Vai bater a meta!' 
                                : '⚠️ Risco de não bater a meta')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {dashboardData.tendency.remainingDays === 0
                            ? 'Resultado final do mês'
                            : 'Projeção para o final do mês'}
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
            </MobileExpandableCard>
          )}

          {dashboardData.shifts.length > 0 && (
            <MobileExpandableCard
              title="Metas por Turno"
              subtitle={`${dashboardData.summary.shiftsAchieved} de ${dashboardData.summary.totalShifts} turnos atingiram a meta`}
            >
              <div className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData.shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200"
                    >
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
            </MobileExpandableCard>
          )}

          {dashboardData.saleModes.length > 0 && (
            <MobileExpandableCard
              title="Metas por Modo de Venda"
              subtitle={`${dashboardData.summary.saleModesAchieved} de ${dashboardData.summary.totalSaleModes} modos atingiram a meta`}
            >
              <div className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dashboardData.saleModes.map((mode) => {
                    const label = (mode.cardLabel || mode.saleModeName || '').toLowerCase();
                    const isAlmoco = label.includes('almoço') || label.includes('almo');
                    const isDelivery = label.includes('delivery') || label.includes('entrega');
                    const Icon = isAlmoco && isDelivery ? Bike : isAlmoco && !isDelivery ? UtensilsCrossed : !isAlmoco && isDelivery ? Truck : ChefHat;
                    return (
                    <div key={mode.id} className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center text-teal-600">
                            <Icon size={18} />
                          </div>
                          <h4 className="font-semibold text-gray-900">{mode.cardLabel || `${mode.shiftName || ''} ${mode.saleModeName}`.trim() || mode.saleModeName}</h4>
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
                  );
                  })}
                </div>
              </div>
            </MobileExpandableCard>
          )}
        </div>
      )}
    </div>
  );
}