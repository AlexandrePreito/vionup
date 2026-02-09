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
  Target,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  LineChart,
  Line,
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
  mom?: number;
  yoy?: number;
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
  monthlyRevenueByCompany?: Array<{
    month: number;
    monthName: string;
    companies: Array<{ companyId: string; companyName: string; revenue: number }>;
  }>;
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
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realizadoData, setRealizadoData] = useState<RealizadoMesData | null>(null);
  const [filteredData, setFilteredData] = useState<RealizadoMesData | null>(null);
  
  // Estados para dropdowns
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

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

  // Filtrar dados quando selecionar empresas ou meses
  useEffect(() => {
    if (!realizadoData) return;

    let filtered = { ...realizadoData };

    // Filtrar por empresas
    if (selectedCompanyIds.length > 0) {
      const selectedCompanies = realizadoData.companies.filter(c => selectedCompanyIds.includes(c.id));
      if (selectedCompanies.length > 0) {
        const totalRevenue = selectedCompanies.reduce((sum, c) => sum + c.revenue, 0);
        const totalTransactions = selectedCompanies.reduce((sum, c) => sum + c.transactions, 0);
        const totalTrend = selectedCompanies.reduce((sum, c) => sum + c.trend, 0) / selectedCompanies.length;
        
        // Calcular proporção para cada empresa
        const companyRatios = new Map<string, number>();
        selectedCompanies.forEach(company => {
          const ratio = realizadoData.summary.totalRevenue > 0 
            ? company.revenue / realizadoData.summary.totalRevenue 
            : 0;
          companyRatios.set(company.id, ratio);
        });
        
        filtered = {
          ...filtered,
          companies: selectedCompanies,
          summary: {
            ...realizadoData.summary,
            totalRevenue: totalRevenue,
            totalTransactions: totalTransactions,
            averageTicket: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
            comparisonLastYear: totalTrend
          },
          monthlyRevenue: realizadoData.monthlyRevenue.map(m => {
            // Soma das receitas das empresas selecionadas para este mês
            const monthRevenue = selectedCompanies.reduce((sum, company) => {
              const ratio = companyRatios.get(company.id) || 0;
              return sum + (m.revenue * ratio);
            }, 0);
            const monthTransactions = selectedCompanies.reduce((sum, company) => {
              const ratio = companyRatios.get(company.id) || 0;
              return sum + Math.floor(m.transactions * ratio);
            }, 0);
            
            return {
              ...m,
              revenue: Math.round(monthRevenue * 100) / 100,
              transactions: monthTransactions
            };
          })
        };
      }
    }

    // Filtrar por meses
    if (selectedMonths.length > 0) {
      filtered = {
        ...filtered,
        monthlyRevenue: filtered.monthlyRevenue.filter(m => selectedMonths.includes(m.month)),
        monthlyGoals: filtered.monthlyGoals.filter(g => selectedMonths.includes(g.month))
      };

      // Recalcular summary baseado nos meses filtrados
      const filteredRevenue = filtered.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
      const filteredTransactions = filtered.monthlyRevenue.reduce((sum, m) => sum + m.transactions, 0);
      const bestMonth = filtered.monthlyRevenue.reduce((best, m) => 
        m.revenue > best.revenue ? m : best, 
        filtered.monthlyRevenue[0] || { month: 0, revenue: 0 }
      );
      const worstMonth = filtered.monthlyRevenue.reduce((worst, m) => 
        m.revenue < worst.revenue ? m : worst, 
        filtered.monthlyRevenue[0] || { month: 0, revenue: 0 }
      );

      filtered.summary = {
        ...filtered.summary,
        totalRevenue: filteredRevenue,
        totalTransactions: filteredTransactions,
        averageTicket: filteredTransactions > 0 ? filteredRevenue / filteredTransactions : 0,
        bestMonth: { month: bestMonth.month, revenue: bestMonth.revenue },
        worstMonth: { month: worstMonth.month, revenue: worstMonth.revenue }
      };
    }

    setFilteredData(filtered);
  }, [selectedCompanyIds, selectedMonths, realizadoData]);

  // Buscar automaticamente quando filtros mudarem
  useEffect(() => {
    if (selectedGroupId) {
      setSelectedCompanyIds([]);
      setSelectedMonths([]);
      fetchRealizadoData();
    } else {
      setRealizadoData(null);
      setFilteredData(null);
    }
  }, [selectedGroupId, selectedYear]);

  // Inicializar todos os meses e empresas quando dados carregarem
  useEffect(() => {
    if (realizadoData) {
      if (selectedMonths.length === 0) {
        setSelectedMonths(realizadoData.monthlyRevenue.map(m => m.month));
      }
      if (selectedCompanyIds.length === 0) {
        setSelectedCompanyIds(realizadoData.companies.map(c => c.id));
      }
    }
  }, [realizadoData]);

  // Toggle seleção de empresa
  const toggleCompany = (companyId: string) => {
    setSelectedCompanyIds(prev => {
      if (prev.includes(companyId)) {
        return prev.filter(id => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
  };

  // Toggle seleção de mês
  const toggleMonth = (month: number) => {
    setSelectedMonths(prev => {
      if (prev.includes(month)) {
        return prev.filter(m => m !== month);
      } else {
        return [...prev, month].sort((a, b) => a - b);
      }
    });
  };

  // Selecionar todas as empresas
  const selectAllCompanies = () => {
    if (realizadoData) {
      setSelectedCompanyIds(realizadoData.companies.map(c => c.id));
    }
  };

  // Desmarcar todas as empresas
  const deselectAllCompanies = () => {
    setSelectedCompanyIds([]);
  };

  // Selecionar todos os meses
  const selectAllMonths = () => {
    if (realizadoData) {
      setSelectedMonths(realizadoData.monthlyRevenue.map(m => m.month));
    }
  };

  // Desmarcar todos os meses
  const deselectAllMonths = () => {
    setSelectedMonths([]);
  };

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

  // Exportar matriz para Excel
  const handleExportToExcel = () => {
    if (!filteredData?.monthlyRevenueByCompany || !realizadoData) return;

    const year = filteredData.period.year;
    
    // Criar cabeçalhos
    const headers = ['Mês', ...realizadoData.companies.map(c => c.name), 'Total'];
    
    // Criar linhas de dados
    const rows = filteredData.monthlyRevenueByCompany.map(monthData => {
      const monthTotal = monthData.companies.reduce((sum, c) => sum + c.revenue, 0);
      const row: any[] = [
        monthData.monthName,
        ...realizadoData.companies.map(company => {
          const companyData = monthData.companies.find(c => c.companyId === company.id);
          return companyData?.revenue || 0;
        }),
        monthTotal
      ];
      return row;
    });

    // Adicionar linha de total anual
    const annualTotals = [
      'Total Anual',
      ...realizadoData.companies.map(company => {
        const annualTotal = filteredData.monthlyRevenueByCompany!.reduce(
          (sum, month) => {
            const companyData = month.companies.find(c => c.companyId === company.id);
            return sum + (companyData?.revenue || 0);
          },
          0
        );
        return annualTotal;
      }),
      filteredData.monthlyRevenueByCompany!.reduce(
        (sum, month) => sum + month.companies.reduce((s, c) => s + c.revenue, 0),
        0
      )
    ];
    rows.push(annualTotals);

    // Criar workbook
    const wb = XLSX.utils.book_new();
    
    // Criar worksheet
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Ajustar largura das colunas
    const colWidths = [
      { wch: 15 }, // Mês
      ...realizadoData.companies.map(() => ({ wch: 18 })), // Colunas das empresas
      { wch: 18 } // Total
    ];
    ws['!cols'] = colWidths;

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Faturamento Mensal');

    // Gerar nome do arquivo
    const fileName = `Faturamento_Mes_Filial_${year}.xlsx`;

    // Exportar
    XLSX.writeFile(wb, fileName);
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

  // Preparar dados para gráfico de linha por empresa
  const lineChartData = filteredData && realizadoData ? (() => {
    // Calcular proporção de cada empresa no total original (antes dos filtros)
    const originalTotalRevenue = realizadoData.summary.totalRevenue;
    const companyRatios = new Map<string, number>();
    
    filteredData.companies.forEach(company => {
      const ratio = originalTotalRevenue > 0 ? company.revenue / originalTotalRevenue : 0;
      companyRatios.set(company.id, ratio);
    });

    // Criar dados mensais por empresa usando os dados originais mensais
    const monthsToUse = filteredData.monthlyRevenue;
    const originalMonthlyRevenue = realizadoData.monthlyRevenue;
    
    return monthsToUse.map(filteredMonth => {
      // Encontrar o mês correspondente nos dados originais
      const originalMonth = originalMonthlyRevenue.find(m => m.month === filteredMonth.month);
      const monthTotalRevenue = originalMonth?.revenue || 0;
      
      const dataPoint: any = {
        month: filteredMonth.monthName,
        monthFull: filteredMonth.monthNameFull,
        monthNumber: filteredMonth.month
      };

      // Calcular faturamento de cada empresa para este mês
      filteredData.companies.forEach((company) => {
        const ratio = companyRatios.get(company.id) || 0;
        const companyMonthRevenue = Math.round(monthTotalRevenue * ratio * 100) / 100;
        dataPoint[company.name] = companyMonthRevenue;
      });

      return dataPoint;
    });
  })() : [];

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

        {/* Empresa - Dropdown com checkboxes */}
        {realizadoData && (
          <div className="w-64 relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-left flex items-center justify-between"
              >
                <span className="text-sm text-gray-700">
                  {selectedCompanyIds.length === 0 
                    ? 'Nenhuma empresa selecionada'
                    : selectedCompanyIds.length === realizadoData.companies.length
                    ? 'Todas as empresas'
                    : `${selectedCompanyIds.length} empresa(s) selecionada(s)`
                  }
                </span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isCompanyDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsCompanyDropdownOpen(false)}
                  />
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    <div className="p-2 border-b border-gray-200 flex gap-2">
                      <button
                        onClick={selectAllCompanies}
                        className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        Selecionar todas
                      </button>
                      <button
                        onClick={deselectAllCompanies}
                        className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        Limpar
                      </button>
                    </div>
                    <div className="p-2 space-y-1">
                      {realizadoData.companies.map((company) => {
                        const isSelected = selectedCompanyIds.includes(company.id);
                        return (
                          <label
                            key={company.id}
                            className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCompany(company.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{company.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mês - Dropdown com checkboxes */}
        {realizadoData && (
          <div className="w-64 relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-left flex items-center justify-between"
              >
                <span className="text-sm text-gray-700">
                  {selectedMonths.length === 0 
                    ? 'Nenhum mês selecionado'
                    : selectedMonths.length === realizadoData.monthlyRevenue.length
                    ? 'Todos os meses'
                    : `${selectedMonths.length} mês(es) selecionado(s)`
                  }
                </span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${isMonthDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isMonthDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsMonthDropdownOpen(false)}
                  />
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    <div className="p-2 border-b border-gray-200 flex gap-2">
                      <button
                        onClick={selectAllMonths}
                        className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        Selecionar todos
                      </button>
                      <button
                        onClick={deselectAllMonths}
                        className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        Limpar
                      </button>
                    </div>
                    <div className="p-2 space-y-1">
                      {realizadoData.monthlyRevenue.map((month) => {
                        const isSelected = selectedMonths.includes(month.month);
                        return (
                          <label
                            key={month.month}
                            className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleMonth(month.month)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{month.monthNameFull}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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
              const isSelected = selectedCompanyIds.includes(company.id);
              
              return (
                <div
                  key={company.id}
                  onClick={() => toggleCompany(company.id)}
                  className={`
                    relative overflow-hidden bg-white rounded-2xl p-6 cursor-pointer
                    transition-all duration-300 hover:shadow-lg
                  `}
                  style={{
                    border: `2px solid ${colors.hex}15`,
                    boxShadow: isSelected ? `0 0 0 2px ${colors.hex}60` : undefined
                  }}
                >
                  {/* Marca d'água com cor do LED */}
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colors.bg} opacity-10 rounded-bl-full`} />

                  {/* Header do card */}
                  <div className="relative mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
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
                    <p className="text-lg font-bold" style={{ color: colors.hex }}>{company.name}</p>
                  </div>

                  {/* Realizado e Meta */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Realizado</p>
                      <p className="text-2xl font-bold" style={{ color: colors.hex }}>{formatCurrency(company.revenue)}</p>
                    </div>
                    
                    {/* Barra de progresso */}
                    <div className="space-y-1">
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(company.progress, 100)}%`,
                            backgroundColor: colors.hex
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Progresso</span>
                        <span className="text-sm font-semibold" style={{ color: colors.hex }}>{company.progress.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Meta</p>
                      <p className="text-lg font-semibold text-gray-700">{formatCurrency(company.goal)}</p>
                    </div>

                    {/* Quantidade de Vendas e Ticket Médio */}
                    <div className="pt-2 border-t border-gray-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Quantidade de Vendas</span>
                        <span className="text-sm font-semibold text-gray-900">{company.transactions.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Ticket Médio</span>
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(company.averageTicket)}</span>
                      </div>
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
                {selectedCompanyIds.length > 0 && selectedCompanyIds.length < realizadoData.companies.length && (
                  <span className="ml-2 text-blue-600">
                    • {selectedCompanyIds.length} empresa(s) selecionada(s)
                  </span>
                )}
                {selectedMonths.length > 0 && selectedMonths.length < realizadoData.monthlyRevenue.length && (
                  <span className="ml-2 text-blue-600">
                    • {selectedMonths.length} mês(es) selecionado(s)
                  </span>
                )}
              </p>
            </div>
            
            <div className="h-80 min-h-[320px] w-full" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minHeight={320} minWidth={0}>
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

          {/* Gráfico de Linha - Faturamento por Empresa */}
          {filteredData && filteredData.companies.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">Faturamento Mensal por Empresa</h3>
                <p className="text-sm text-gray-500">
                  Evolução do faturamento de cada empresa ao longo dos meses
                </p>
              </div>
              
              <div className="h-[500px] min-h-[500px] w-full" style={{ minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={500} minWidth={0}>
                  <LineChart data={lineChartData}>
                    <defs>
                      {filteredData.companies.map((company, index) => {
                        const colors = getCompanyColor(index);
                        return (
                          <linearGradient key={company.id} id={`lineGradient-${company.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colors.hex} stopOpacity={0.8}/>
                            <stop offset="100%" stopColor={colors.hex} stopOpacity={0.1}/>
                          </linearGradient>
                        );
                      })}
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
                    <Tooltip 
                      content={({ active, payload, label }) => {
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
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="line"
                    />
                    {filteredData.companies.map((company, index) => {
                      const colors = getCompanyColor(index);
                      return (
                        <Line
                          key={company.id}
                          type="monotone"
                          dataKey={company.name}
                          name={company.name}
                          stroke={colors.hex}
                          strokeWidth={2.5}
                          dot={{ fill: colors.hex, r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Matriz de Faturamento por Mês e Filial */}
          {filteredData.monthlyRevenueByCompany && filteredData.monthlyRevenueByCompany.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Faturamento por Mês e Filial</h3>
                  <p className="text-sm text-gray-500">
                    Valor faturado por filial em cada mês do ano {filteredData.period.year}
                  </p>
                </div>
                <button
                  onClick={handleExportToExcel}
                  className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  title="Exportar Excel"
                >
                  <Download size={18} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 sticky left-0 z-10">
                        Mês
                      </th>
                      {realizadoData.companies.map((company, index) => {
                        const colors = getCompanyColor(index);
                        return (
                          <th
                            key={company.id}
                            className="text-right py-3 px-4 font-semibold text-gray-700 bg-gray-50 whitespace-nowrap"
                            style={{ color: colors.hex }}
                          >
                            {company.name}
                          </th>
                        );
                      })}
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.monthlyRevenueByCompany.map((monthData, monthIndex) => {
                      // Calcular total do mês
                      const monthTotal = monthData.companies.reduce((sum, c) => sum + c.revenue, 0);
                      
                      return (
                        <tr
                          key={monthData.month}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            monthIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="py-3 px-4 font-medium text-gray-900 bg-white sticky left-0 z-10 border-r border-gray-200">
                            {monthData.monthName}
                          </td>
                          {realizadoData.companies.map((company) => {
                            const companyData = monthData.companies.find(c => c.companyId === company.id);
                            const revenue = companyData?.revenue || 0;
                            
                            return (
                              <td
                                key={company.id}
                                className="text-right py-3 px-4 text-gray-700 whitespace-nowrap"
                              >
                                {revenue > 0 ? formatCurrency(revenue) : '-'}
                              </td>
                            );
                          })}
                          <td className="text-right py-3 px-4 font-semibold text-gray-900">
                            {formatCurrency(monthTotal)}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Linha de total anual */}
                    <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
                      <td className="py-3 px-4 text-gray-900 bg-gray-100 sticky left-0 z-10 border-r border-gray-300">
                        Total Anual
                      </td>
                      {realizadoData.companies.map((company) => {
                        const annualTotal = filteredData.monthlyRevenueByCompany!.reduce(
                          (sum, month) => {
                            const companyData = month.companies.find(c => c.companyId === company.id);
                            return sum + (companyData?.revenue || 0);
                          },
                          0
                        );
                        
                        return (
                          <td
                            key={company.id}
                            className="text-right py-3 px-4 text-gray-900"
                          >
                            {formatCurrency(annualTotal)}
                          </td>
                        );
                      })}
                      <td className="text-right py-3 px-4 text-gray-900">
                        {formatCurrency(
                          filteredData.monthlyRevenueByCompany!.reduce(
                            (sum, month) => sum + month.companies.reduce((s, c) => s + c.revenue, 0),
                            0
                          )
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
