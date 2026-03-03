'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  User, 
  Loader2, 
  RefreshCw,
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { MobileExpandableCard } from '@/components/MobileExpandableCard';
import confetti from 'canvas-confetti';
import { useGroupFilter } from '@/hooks/useGroupFilter';
import '@/lib/api-interceptor'; // Garantir que o interceptor está carregado

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
  status: 'achieved' | 'almost' | 'ontrack' | 'behind';
}

interface ResearchData {
  goal: number;
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
    isCurrentMonth?: boolean;
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
  products: ProductGoal[];
  dailyRevenue?: { date: string; day: number; dayOfWeek: string; revenue: number; transactions: number }[];
  monthlyRevenue?: { month: number; year: number; monthLabel: string; revenue: number }[];
  summary: {
    totalProductGoals: number;
    productsAchieved: number;
    productsAlmost?: number;
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
  const searchParams = useSearchParams();
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  const [loadingResearch, setLoadingResearch] = useState(false);
  const employeeIdFromUrlRef = useRef<string | null>(null);

  // Inicializar filtros a partir da URL (ex.: ao vir da tela Equipe pelo botão Detalhes)
  useEffect(() => {
    const groupId = searchParams.get('group_id');
    const companyId = searchParams.get('company_id');
    const employeeId = searchParams.get('employee');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    if (groupId) setSelectedGroupId(groupId);
    if (year) setSelectedYear(parseInt(year, 10));
    if (month) setSelectedMonth(parseInt(month, 10));
    if (companyId) setSelectedCompany(companyId);
    if (employeeId) employeeIdFromUrlRef.current = employeeId;
  }, [searchParams, setSelectedGroupId]);

  // Após carregar funcionários, selecionar o que veio na URL (quando veio da Equipe)
  useEffect(() => {
    const pending = employeeIdFromUrlRef.current;
    if (!pending || employees.length === 0) return;
    if (employees.some((e: Employee) => e.id === pending)) {
      setSelectedEmployee(pending);
      employeeIdFromUrlRef.current = null;
    }
  }, [employees]);

  // Buscar empresas quando grupo mudar
  useEffect(() => {
    if (!selectedGroupId) {
      setCompanies([]);
      return;
    }
    const fetchCompanies = async () => {
      try {
        console.log('📋 Buscando empresas para grupo:', selectedGroupId);
        const res = await fetch(`/api/companies?group_id=${selectedGroupId}`);
        console.log('📋 Status da resposta:', res.status, res.ok);
        if (res.ok) {
          const data = await res.json();
          console.log('📋 Dados recebidos:', data);
          const companiesList = data.companies || [];
          console.log('📋 Total de empresas recebidas:', companiesList.length);
          // Filtro de segurança: garantir que apenas empresas do grupo selecionado sejam exibidas
          const filteredCompanies = companiesList.filter((c: any) => c.company_group_id === selectedGroupId);
          console.log('📋 Empresas filtradas:', filteredCompanies.length);
          setCompanies(filteredCompanies);
          setSelectedCompany('');
          setSelectedEmployee('');
          setEmployees([]);
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.error('❌ Erro ao buscar empresas:', res.status, errorData);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar empresas:', error);
      }
    };
    fetchCompanies();
  }, [selectedGroupId]);

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
    if (!selectedEmployee || !selectedGroupId) return;
    
    setLoading(true);
    try {
      console.log('📊 Buscando dashboard do funcionário:', {
        employee_id: selectedEmployee,
        year: selectedYear,
        month: selectedMonth,
        group_id: selectedGroupId
      });
      
      const res = await fetch(
        `/api/dashboard/employee?employee_id=${selectedEmployee}&year=${selectedYear}&month=${selectedMonth}&group_id=${selectedGroupId}`
      );
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Dados recebidos:', data);
        console.log('💰 Faturamento:', data.revenue?.realized);
        console.log('📦 Vendas:', data.sales?.count);
        setDashboardData(data);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('❌ Erro ao buscar dashboard:', res.status, errorData);
        alert(`Erro ao buscar dados: ${errorData.error || 'Erro desconhecido'}`);
        setDashboardData(null);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar dashboard:', error);
      alert('Erro de conexão ao buscar dados do funcionário');
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  // Buscar dados de pesquisa
  const fetchResearchData = async () => {
    console.log('🔍 fetchResearchData chamado:', {
      selectedEmployee,
      selectedGroupId,
      selectedYear,
      selectedMonth
    });
    
    if (!selectedEmployee || !selectedGroupId) {
      console.log('⚠️ Dados insuficientes para buscar pesquisa');
      setResearchData(null);
      return;
    }

    setLoadingResearch(true);
    try {
      // Calcular datas do período
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0); // Último dia do mês
      const dataInicio = startDate.toISOString().split('T')[0];
      const dataFim = endDate.toISOString().split('T')[0];
      
      console.log('📅 Período de pesquisa:', {
        selectedYear,
        selectedMonth,
        dataInicio,
        dataFim,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      // Buscar meta de pesquisa (quantidade por funcionário)
      // IMPORTANTE: As metas de pesquisa são salvas na tabela sales_goals via /api/goals
      // Não usar /api/research-goals que busca em research_goals
      let goalRes = await fetch(
        `/api/goals?group_id=${selectedGroupId}&employee_id=${selectedEmployee}&year=${selectedYear}&month=${selectedMonth}&type=research_quantity_employee`
      );
      
      let goalData: any = null;
      if (goalRes.ok) {
        goalData = await goalRes.json();
        console.log('📊 Metas do funcionário (com type e employee_id):', goalData.goals);
        
        // Se não encontrou, buscar sem filtro de tipo
        if (!goalData.goals || goalData.goals.length === 0) {
          console.log('⚠️ Nenhuma meta encontrada com type. Buscando todas as metas do funcionário...');
          goalRes = await fetch(
            `/api/goals?group_id=${selectedGroupId}&employee_id=${selectedEmployee}&year=${selectedYear}&month=${selectedMonth}`
          );
          if (goalRes.ok) {
            goalData = await goalRes.json();
            console.log('📊 Todas as metas do funcionário (sem type):', goalData.goals);
            
            // Filtrar apenas metas de pesquisa
            if (goalData.goals && goalData.goals.length > 0) {
              const researchGoals = goalData.goals.filter((g: any) => 
                g.goal_type === 'research_quantity_employee'
              );
              console.log('📊 Metas de pesquisa do funcionário:', researchGoals);
              goalData.goals = researchGoals;
            }
          }
        }
      } else {
        console.log('❌ Erro na busca de metas:', goalRes.status);
      }
      
      // Buscar realizado (quantidade de respostas NPS do funcionário no período)
      const responseRes = await fetch(
        `/api/nps/respostas?employee_id=${selectedEmployee}&data_inicio=${dataInicio}&data_fim=${dataFim}&limit=1000`
      );

      if (goalRes.ok && responseRes.ok) {
        // goalData já foi buscado acima
        if (!goalData) {
          goalData = await goalRes.json();
        }
        const responseData = await responseRes.json();

        console.log('📊 Dados de pesquisa:', {
          goals: goalData.goals,
          goalsCount: goalData.goals?.length || 0,
          respostasCount: responseData.respostas?.length || 0,
          pagination: responseData.pagination,
          urlGoal: `/api/goals?group_id=${selectedGroupId}&employee_id=${selectedEmployee}&year=${selectedYear}&month=${selectedMonth}&type=research_quantity_employee`
        });

        // Pegar a primeira meta (deve haver apenas uma por funcionário/mês/tipo)
        const goal = goalData.goals?.[0];
        
        console.log('📊 Meta encontrada:', goal);
        console.log('📊 Todas as metas retornadas:', goalData.goals);
        
        // Se não encontrou com o tipo específico, tentar sem o tipo para ver todas as metas
        if (!goal) {
          console.log('⚠️ Nenhuma meta encontrada com type=research_quantity_employee. Tentando buscar todas...');
          const allGoalsRes = await fetch(
            `/api/research-goals?group_id=${selectedGroupId}&employee_id=${selectedEmployee}&year=${selectedYear}&month=${selectedMonth}`
          );
          if (allGoalsRes.ok) {
            const allGoalsData = await allGoalsRes.json();
            console.log('📊 Todas as metas do funcionário (sem filtro de tipo):', allGoalsData.goals);
          }
        }
        
        // Só mostrar o card se houver meta cadastrada
        if (goal && goal.goal_value) {
          // Contar quantidade de respostas
          // Se houver paginação, usar o total da paginação, senão usar o length
          const realized = responseData.pagination?.total || responseData.respostas?.length || 0;
          const goalValue = goal.goal_value || 0;
          const progress = goalValue > 0 ? Math.round((realized / goalValue) * 100) : 0;
          
          // Calcular dia atual e total de dias do mês
          // Verificar se o mês/ano selecionado é o mês/ano atual
          const today = new Date();
          const isCurrentMonth = today.getFullYear() === selectedYear && today.getMonth() + 1 === selectedMonth;
          
          // Se for o mês atual, usar o dia de hoje; senão, considerar como se fosse o último dia
          const currentDay = isCurrentMonth ? today.getDate() : new Date(selectedYear, selectedMonth, 0).getDate();
          const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate();
          const isLastDayOfMonth = isCurrentMonth ? (currentDay === lastDayOfMonth) : true;
          
          // Calcular progresso esperado até hoje (baseado nos dias que já passaram)
          // Exemplo: se estamos no dia 15 de um mês de 30 dias, esperamos 50% do progresso
          const expectedProgress = Math.round((currentDay / lastDayOfMonth) * 100);
          
          console.log('📊 Cálculo:', {
            realized,
            goalValue,
            progress,
            currentDay,
            lastDayOfMonth,
            isLastDayOfMonth,
            expectedProgress
          });
          
          // Lógica de status:
          // - Se progresso >= 100%: "achieved" (atingida)
          // - Se é o último dia do mês: só pode ser "achieved" ou "behind" (não "ontrack")
          // - Se não é o último dia e progresso >= progresso esperado: "ontrack" (no caminho)
          // - Se não é o último dia e progresso < progresso esperado: "behind" (atrasado)
          let status: 'achieved' | 'ontrack' | 'behind' = 'behind';
          if (progress >= 100) {
            status = 'achieved';
          } else if (!isLastDayOfMonth && progress >= expectedProgress) {
            // Só mostra "ontrack" se não for o último dia e estiver no caminho
            status = 'ontrack';
          } else {
            status = 'behind';
          }

          setResearchData({
            goal: goalValue,
            realized,
            progress,
            status
          });
        } else {
          console.log('⚠️ Meta não encontrada ou sem goal_value:', goal);
          // Não há meta cadastrada - não mostrar o card
          setResearchData(null);
        }
      } else {
        // Capturar corpo das respostas de erro para debug (só ler body das que falharam)
        const errDetails: Record<string, unknown> = {
          goalRes: { status: goalRes.status, ok: goalRes.ok },
          responseRes: { status: responseRes.status, ok: responseRes.ok }
        };
        try {
          if (!goalRes.ok) {
            errDetails.goalErrorBody = await goalRes.json().catch(() => goalRes.statusText);
          }
          if (!responseRes.ok) {
            errDetails.responseErrorBody = await responseRes.json().catch(() => responseRes.statusText);
          }
        } catch (_) { /* ignorar */ }
        console.error('❌ Erro nas requisições:', JSON.stringify(errDetails, null, 2));
        // Erro na requisição - não mostrar o card
        setResearchData(null);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de pesquisa:', error);
      setResearchData(null);
    } finally {
      setLoadingResearch(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedEmployee || !selectedGroupId) return;
    await Promise.all([fetchDashboard(), fetchResearchData()]);
  };

  // Ao trocar filtros, limpa os cards e aguarda clique em "atualizar"
  useEffect(() => {
    setDashboardData(null);
    setResearchData(null);
  }, [selectedEmployee, selectedYear, selectedMonth, selectedGroupId]);

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
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'R$ 0,00';
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Formato compacto para eixo Y do gráfico (1K, 1M)
  const formatCompact = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  // Tooltip para gráfico de vendas diárias
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

  // Formatar número
  const formatNumber = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'achieved':
        return 'text-emerald-600';
      case 'almost':
        return 'text-teal-600';
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
      case 'almost':
        return 'bg-teal-100';
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
      case 'almost':
        return 'bg-teal-500';
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
      case 'almost':
        return <Target className="w-5 h-5 text-teal-500" />;
      case 'ontrack':
        return <TrendingUp className="w-5 h-5 text-amber-500" />;
      case 'behind':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  // Label do status (metas de produtos); mês passado = "Não atingida" em vez de "Atenção"
  const getProductStatusLabel = (status: string, isCurrentMonth?: boolean) => {
    if (status === 'behind' && isCurrentMonth === false) return 'Não atingida';
    switch (status) {
      case 'achieved':
        return 'Atingida';
      case 'almost':
        return 'Quase lá';
      case 'ontrack':
        return 'No Caminho';
      case 'behind':
        return 'Atenção';
      default:
        return status;
    }
  };

  // Gerar anos disponíveis
  const years = Array.from({ length: 6 }, (_, i) => 2025 + i);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard Funcionário</h1>
        <p className="text-gray-500 text-sm mt-1">
          Acompanhe as metas e o desempenho individual do funcionário
        </p>
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
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione...</option>
              {groups.map((group: any) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Filial */}
        <div className="w-full sm:w-56">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filial</label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={!selectedGroupId}
          >
            <option value="">Selecione...</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </div>

        {/* Funcionário */}
        <div className="w-full sm:w-64">
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
        <div className="w-full sm:w-40">
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
        <div className="w-full sm:w-28">
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

        {/* Atualizar */}
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1 opacity-0">Atualizar</label>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={!selectedEmployee || !selectedGroupId || loading || loadingResearch}
            title="Atualizar"
            className="w-full sm:w-10 h-10 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || loadingResearch) ? 'animate-spin' : ''}`} />
          </button>
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
          {/* Card do Funcionário + Meta Faturamento - em mobile: um abaixo do outro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  
                  {/* Quantidade de Vendas e Ticket Médio */}
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 ${getStatusBgColor(dashboardData.revenue.status)}`}>
                    {getStatusIcon(dashboardData.revenue.status)}
                    <span className={`text-xs font-medium whitespace-nowrap ${getStatusColor(dashboardData.revenue.status)}`}>
                      {dashboardData.revenue.status === 'achieved' ? 'Atingida!' : 
                       dashboardData.revenue.status === 'ontrack' ? 'No Caminho' : 'Atenção'}
                    </span>
                  </div>
                </div>

                {/* Valores */}
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

          {/* Meta de Pesquisa */}
          {researchData && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-bl-full" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${getStatusBgColor(researchData.status)} flex items-center justify-center`}>
                      <Target className={`w-6 h-6 ${getStatusColor(researchData.status)}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Meta de Pesquisa</h3>
                      <p className="text-sm text-gray-500">Quantidade de pesquisas NPS</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 ${getStatusBgColor(researchData.status)}`}>
                    {getStatusIcon(researchData.status)}
                    <span className={`text-xs font-medium whitespace-nowrap ${getStatusColor(researchData.status)}`}>
                      {researchData.status === 'achieved' ? 'Atingida!' : 
                       researchData.status === 'ontrack' ? 'No Caminho' : 'Atenção'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 mb-1">Realizado</p>
                    <p className={`text-2xl sm:text-3xl font-bold break-words ${getStatusColor(researchData.status)}`}>
                      {formatNumber(researchData.realized)}
                    </p>
                  </div>
                  <div className="min-w-0 sm:text-right">
                    <p className="text-sm text-gray-500 mb-1">Meta</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-700 break-words">
                      {formatNumber(researchData.goal)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(researchData.status)}`}
                      style={{ width: `${Math.min(researchData.progress, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progresso</span>
                  <span className={`font-semibold ${getStatusColor(researchData.status)}`}>
                    {researchData.progress}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card de Tendência */}
          {dashboardData.tendency && dashboardData.revenue.goal > 0 && dashboardData.revenue.status !== 'achieved' && (
            <MobileExpandableCard
              title="Tendência do Mês"
              subtitle={`${MONTHS[dashboardData.period.month - 1]?.label} ${dashboardData.period.year} • Projeção baseada no desempenho atual`}
            >
            <div className="bg-white rounded-2xl border border-gray-100 p-6 relative overflow-hidden">
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
            </MobileExpandableCard>
          )}

          {/* Resumo das Metas de Produtos */}
          {dashboardData.products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
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
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                  <Target size={24} className="text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Quase lá</p>
                  <p className="text-2xl font-bold text-teal-600">{dashboardData.summary.productsAlmost ?? 0}</p>
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
                  <p className="text-sm text-gray-500">{dashboardData.period?.isCurrentMonth === false ? 'Não atingidas' : 'Atenção'}</p>
                  <p className="text-2xl font-bold text-red-500">{dashboardData.summary.productsBehind}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabela de Metas de Produtos */}
          {dashboardData.products.length > 0 && (
            <MobileExpandableCard
              title="Metas de Produtos"
              subtitle={`${dashboardData.products.length} produto(s) • Desempenho por produto`}
            >
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
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
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 ${getStatusBgColor(product.status)} ${getStatusColor(product.status)}`}>
                            {getStatusIcon(product.status)}
                            <span className="text-xs font-medium whitespace-nowrap">
                              {getProductStatusLabel(product.status, dashboardData.period?.isCurrentMonth)}
                            </span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </MobileExpandableCard>
          )}

          {/* Gráficos lado a lado: Vendas Diárias + Faturamento Mensal */}
          {(dashboardData.dailyRevenue?.length || dashboardData.monthlyRevenue?.length) ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Faturamento Dia a Dia - gráfico vendas diárias */}
              {dashboardData.dailyRevenue && dashboardData.dailyRevenue.length > 0 && (
                <MobileExpandableCard
                  title="Vendas Diárias"
                  subtitle={`${MONTHS[dashboardData.period.month - 1]?.label} ${dashboardData.period.year} • ${dashboardData.employee.name}`}
                >
                  <div className="h-80 w-full min-h-[240px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={0}>
                      <BarChart data={dashboardData.dailyRevenue}>
                        <defs>
                          <linearGradient id="colorRevenueGradientFunc" x1="0" y1="0" x2="0" y2="1">
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
                          fill="url(#colorRevenueGradientFunc)"
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
                </MobileExpandableCard>
              )}

              {/* Faturamento Mensal - gráfico evolução mensal */}
              {dashboardData.monthlyRevenue && dashboardData.monthlyRevenue.length > 0 && (
                <MobileExpandableCard
                  title="Faturamento Mensal"
                  subtitle={`Últimos 12 meses • ${dashboardData.employee.name}`}
                >
                  <div className="h-80 w-full min-h-[240px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={0}>
                      <BarChart data={dashboardData.monthlyRevenue}>
                        <defs>
                          <linearGradient id="colorMonthlyGradientFunc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#c4b5fd" stopOpacity={1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis
                          dataKey="monthLabel"
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
                          content={({ active, payload, label }: any) => {
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
                          }}
                        />
                        <Bar
                          dataKey="revenue"
                          name="Faturamento"
                          fill="url(#colorMonthlyGradientFunc)"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={50}
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
                </MobileExpandableCard>
              )}
            </div>
          ) : null}

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
      {!loading && !dashboardData && selectedGroupId && !selectedEmployee && (
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
