'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Loader2, 
  Target,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Building,
  Calendar,
  Package,
  DollarSign,
  Medal,
  Trophy
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CompanyGroup {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
  company_group_id: string;
}

interface Employee {
  id: string;
  name: string;
  code?: string;
  position?: string;
  photoUrl?: string;
  company?: {
    id: string;
    name: string;
  };
}

interface ProductGoal {
  id: string;
  productId: string;
  productName: string;
  goalValue: number;
  goalUnit: string;
  realized: number;
  progress: number;
  status: 'achieved' | 'ontrack' | 'behind';
}

interface DashboardData {
  employee: Employee;
  ranking: {
    position: number;
    total: number;
  };
  period: {
    year: number;
    month: number;
    startDate?: string;
    endDate?: string;
  };
  revenue: {
    goal: number;
    realized: number;
    progress: number;
    status: 'achieved' | 'ontrack' | 'behind';
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
  products: ProductGoal[];
  summary: {
    totalProductGoals: number;
    productsAchieved: number;
    productsOnTrack: number;
    productsBehind: number;
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

export default function DashboardFuncionarioPage() {
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  // Buscar grupos
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/groups');
        if (res.ok) {
          const data = await res.json();
          setGroups(data.groups || []);
          if (data.groups?.length > 0) {
            setSelectedGroup(data.groups[0].id);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar grupos:', error);
      }
    };
    fetchGroups();
  }, []);

  // Buscar empresas quando grupo mudar
  useEffect(() => {
    if (!selectedGroup) return;
    const fetchCompanies = async () => {
      try {
        const res = await fetch(`/api/companies?group_id=${selectedGroup}`);
        if (res.ok) {
          const data = await res.json();
          setCompanies(data.companies || []);
          setSelectedCompany('');
          setSelectedEmployee('');
          setEmployees([]);
        }
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
      }
    };
    fetchCompanies();
  }, [selectedGroup]);

  // Buscar funcionários quando empresa mudar
  useEffect(() => {
    if (!selectedCompany) {
      setEmployees([]);
      setSelectedEmployee('');
      return;
    }
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const res = await fetch(`/api/employees?company_id=${selectedCompany}&is_active=true`);
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.employees || []);
          setSelectedEmployee('');
        }
      } catch (error) {
        console.error('Erro ao buscar funcionários:', error);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, [selectedCompany]);

  // Buscar dados do dashboard
  const fetchDashboard = async () => {
    if (!selectedEmployee || !selectedGroup) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/employee?employee_id=${selectedEmployee}&year=${selectedYear}&month=${selectedMonth}&group_id=${selectedGroup}`
      );
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      } else {
        console.error('Erro ao buscar dashboard');
        setDashboardData(null);
      }
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  // Buscar automaticamente quando funcionário ou período mudar
  useEffect(() => {
    if (selectedEmployee) {
      fetchDashboard();
    } else {
      setDashboardData(null);
    }
  }, [selectedEmployee, selectedYear, selectedMonth]);

  // Referência para controlar se confetti já foi mostrado para este funcionário/período
  const confettiShownRef = useRef<string>('');

  // Efeito de confetes quando bater TODAS as metas (faturamento + produtos)
  useEffect(() => {
    if (!dashboardData) return;
    
    // Verificar se bateu a meta de faturamento
    const revenueAchieved = dashboardData.revenue?.status === 'achieved' && dashboardData.revenue.goal > 0;
    
    // Verificar se bateu TODAS as metas de produtos (ou não tem metas de produtos)
    const allProductsAchieved = dashboardData.products.length === 0 || 
      dashboardData.products.every(p => p.status === 'achieved');
    
    // Só explodir confetes se bateu TODAS as metas
    if (revenueAchieved && allProductsAchieved) {
      // Criar chave única para funcionário + período
      const key = `${selectedEmployee}-${selectedYear}-${selectedMonth}`;
      
      // Só mostrar confetti se ainda não foi mostrado para este funcionário/período
      if (confettiShownRef.current !== key) {
        confettiShownRef.current = key;
        
        // Primeira explosão central
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        // Explosões laterais com delay
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

        // Chuva de confetes dourados
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
  }, [dashboardData, selectedEmployee, selectedYear, selectedMonth]);

  // Formatar valor em R$
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Formatar número
  const formatNumber = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'achieved':
        return 'text-emerald-600';
      case 'ontrack':
        return 'text-amber-500';
      case 'behind':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // Obter cor de fundo do status
  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'achieved':
        return 'bg-emerald-100';
      case 'ontrack':
        return 'bg-amber-100';
      case 'behind':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  // Obter cor da barra de progresso
  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'achieved':
        return 'bg-emerald-500';
      case 'ontrack':
        return 'bg-amber-500';
      case 'behind':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'achieved':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'ontrack':
        return <TrendingUp className="w-5 h-5 text-amber-500" />;
      case 'behind':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  // Gerar anos disponíveis
  const years = Array.from({ length: 6 }, (_, i) => 2025 + i);

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Funcionário</h1>
        <p className="text-gray-500 text-sm mt-1">
          Acompanhe as metas e o desempenho individual do funcionário
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-end">
        {/* Grupo */}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Selecione...</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>

        {/* Filial */}
        <div className="w-56">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filial</label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={!selectedGroup}
          >
            <option value="">Selecione...</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </div>

        {/* Funcionário */}
        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={!selectedCompany || loadingEmployees}
          >
            <option value="">Selecione...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>

        {/* Mês */}
        <div className="w-40">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Ano */}
        <div className="w-28">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && dashboardData && (
        <div className="space-y-6">
          {/* Card do Funcionário + Meta Faturamento */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card do Funcionário */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
              {/* Decoração */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-bl-full" />
              
              <div className="relative flex items-start gap-6">
                {/* Foto/Avatar Circular com Medalha */}
                <div className="flex-shrink-0 relative">
                  {dashboardData.employee.photoUrl ? (
                    <img
                      src={dashboardData.employee.photoUrl}
                      alt={dashboardData.employee.name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
                      <span className="text-4xl font-bold text-white">
                        {dashboardData.employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  
                  {/* Medalha de Ranking */}
                  {dashboardData.ranking && dashboardData.ranking.position > 0 && (
                    <div className={`absolute -bottom-2 -right-2 w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-3 border-white
                      ${dashboardData.ranking.position === 1 
                        ? 'bg-gradient-to-br from-yellow-400 to-amber-500' 
                        : dashboardData.ranking.position === 2 
                        ? 'bg-gradient-to-br from-gray-300 to-gray-400'
                        : dashboardData.ranking.position === 3 
                        ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                        : 'bg-gradient-to-br from-blue-400 to-blue-600'
                      }`}
                    >
                      {dashboardData.ranking.position <= 3 ? (
                        <Trophy size={22} className="text-white" />
                      ) : (
                        <span className="text-base font-bold text-white">{dashboardData.ranking.position}º</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 truncate">
                    {dashboardData.employee.name}
                  </h2>
                  {dashboardData.employee.position && (
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <User size={14} />
                      {dashboardData.employee.position}
                    </p>
                  )}
                  {dashboardData.employee.company && (
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <Building size={14} />
                      {dashboardData.employee.company.name}
                    </p>
                  )}
                  
                  {/* Ranking Badge */}
                  {dashboardData.ranking && dashboardData.ranking.position > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                      <Medal size={14} className={
                        dashboardData.ranking.position === 1 ? 'text-yellow-500' :
                        dashboardData.ranking.position === 2 ? 'text-gray-400' :
                        dashboardData.ranking.position === 3 ? 'text-orange-500' :
                        'text-blue-500'
                      } />
                      <span className="text-xs font-semibold text-gray-700">
                        {dashboardData.ranking.position}º de {dashboardData.ranking.total} vendedores
                      </span>
                    </div>
                  )}
                  
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                    <Calendar size={14} />
                    <span>{MONTHS[dashboardData.period.month - 1]?.label} {dashboardData.period.year}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Meta de Faturamento */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
              {/* Decoração */}
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

                {/* Valores */}
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Realizado</p>
                    <p className={`text-3xl font-bold ${getStatusColor(dashboardData.revenue.status)}`}>
                      {formatCurrency(dashboardData.revenue.realized)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Meta</p>
                    <p className="text-3xl font-bold text-gray-400">
                      {formatCurrency(dashboardData.revenue.goal)}
                    </p>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Progresso</span>
                    <span className={`text-lg font-bold ${getStatusColor(dashboardData.revenue.status)}`}>
                      {dashboardData.revenue.progress}%
                    </span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(dashboardData.revenue.status)}`}
                      style={{ width: `${Math.min(dashboardData.revenue.progress, 100)}%` }}
                    />
                  </div>
                  {dashboardData.revenue.progress > 100 && (
                    <p className="text-sm text-emerald-600 font-medium">
                      🎉 Ultrapassou a meta em {formatCurrency(dashboardData.revenue.realized - dashboardData.revenue.goal)}!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card de Tendência */}
          {dashboardData.tendency && dashboardData.revenue.goal > 0 && dashboardData.revenue.status !== 'achieved' && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
              {/* Decoração */}
              <div className={`absolute top-0 right-0 w-48 h-48 rounded-bl-full ${
                dashboardData.tendency.willMeetGoal 
                  ? 'bg-gradient-to-br from-emerald-500/10 to-green-500/10'
                  : 'bg-gradient-to-br from-orange-500/10 to-red-500/10'
              }`} />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      dashboardData.tendency.willMeetGoal 
                        ? 'bg-emerald-100'
                        : 'bg-orange-100'
                    }`}>
                      <TrendingUp className={`w-6 h-6 ${
                        dashboardData.tendency.willMeetGoal 
                          ? 'text-emerald-600'
                          : 'text-orange-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Tendência do Mês</h3>
                      <p className="text-sm text-gray-500">Projeção baseada no desempenho atual</p>
                    </div>
                  </div>
                  
                  {/* Indicador de confiança */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                    dashboardData.tendency.confidence === 'high' ? 'bg-green-100' :
                    dashboardData.tendency.confidence === 'medium' ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}>
                    <span className={`text-xs font-medium ${
                      dashboardData.tendency.confidence === 'high' ? 'text-green-700' :
                      dashboardData.tendency.confidence === 'medium' ? 'text-yellow-700' : 'text-gray-600'
                    }`}>
                      Confiança: {dashboardData.tendency.confidence === 'high' ? 'Alta' : 
                                  dashboardData.tendency.confidence === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Projeção */}
                  <div className="lg:col-span-2">
                    <div className={`p-5 rounded-xl ${
                      dashboardData.tendency.willMeetGoal 
                        ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200'
                        : 'bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200'
                    }`}>
                      <div className="flex items-center gap-3 mb-3">
                        {dashboardData.tendency.willMeetGoal ? (
                          <CheckCircle className="w-8 h-8 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-8 h-8 text-orange-500" />
                        )}
                        <div>
                          <p className={`text-lg font-bold ${
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

          {/* Resumo das Metas de Produtos */}
          {dashboardData.products.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Target size={24} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total de Metas</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.summary.totalProductGoals}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Award size={24} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Atingidas</p>
                  <p className="text-2xl font-bold text-emerald-600">{dashboardData.summary.productsAchieved}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <TrendingUp size={24} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">No Caminho</p>
                  <p className="text-2xl font-bold text-amber-500">{dashboardData.summary.productsOnTrack}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Atenção</p>
                  <p className="text-2xl font-bold text-red-500">{dashboardData.summary.productsBehind}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabela de Metas de Produtos */}
          {dashboardData.products.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Package size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Metas de Produtos</h3>
                  <p className="text-sm text-gray-500">Desempenho por produto</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Produto</th>
                      <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Meta</th>
                      <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Realizado</th>
                      <th className="px-6 py-3 text-sm font-semibold text-gray-600">Progresso</th>
                      <th className="text-center px-6 py-3 text-sm font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dashboardData.products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${getStatusBgColor(product.status)} flex items-center justify-center`}>
                              <Package size={18} className={getStatusColor(product.status)} />
                            </div>
                            <span className="font-medium text-gray-900">{product.productName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-gray-600 font-medium">{formatNumber(product.goalValue)}</span>
                          <span className="text-gray-400 text-sm ml-1">un</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold ${getStatusColor(product.status)}`}>
                            {formatNumber(product.realized)}
                          </span>
                          <span className="text-gray-400 text-sm ml-1">un</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getProgressBarColor(product.status)}`}
                                style={{ width: `${Math.min(product.progress, 100)}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold w-14 text-right ${getStatusColor(product.status)}`}>
                              {product.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusBgColor(product.status)} ${getStatusColor(product.status)}`}>
                            {getStatusIcon(product.status)}
                            {product.status === 'achieved' ? 'Atingida' : 
                             product.status === 'ontrack' ? 'No Caminho' : 'Atenção'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sem metas de produtos, mas tem meta de faturamento */}
          {dashboardData.products.length === 0 && dashboardData.revenue.goal > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package size={28} className="text-indigo-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma meta de produtos</h3>
              <p className="text-gray-500 text-sm">
                Este funcionário não possui metas de produtos cadastradas para este período.
              </p>
              <p className="text-gray-400 text-xs mt-2">
                Cadastre metas em Metas → Meta Produtos
              </p>
            </div>
          )}

          {/* Sem nenhuma meta */}
          {dashboardData.products.length === 0 && dashboardData.revenue.goal === 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma meta cadastrada</h3>
              <p className="text-gray-500">
                Não há metas definidas para este funcionário no período selecionado.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Estado inicial - Nenhum funcionário selecionado */}
      {!loading && !dashboardData && selectedGroup && !selectedEmployee && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={40} className="text-blue-600" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">Selecione um funcionário</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Escolha uma filial e um funcionário para visualizar o dashboard com as metas e desempenho mensal.
          </p>
        </div>
      )}
    </div>
  );
}
