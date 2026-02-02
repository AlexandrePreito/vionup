'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  Loader2, 
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Calendar,
  Filter,
  Star,
  Utensils,
  Clock,
  UserCheck,
  DoorOpen,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { useGroupFilter } from '@/hooks/useGroupFilter';

interface Unidade {
  id: string;
  id_empresa_goomer: string;
  nome_goomer: string;
}

interface NPSData {
  unidade: Unidade;
  periodo: {
    mes: string;
    ano: number;
  };
  nps: {
    score: number;
    promotores: number;
    neutros: number;
    detratores: number;
    total: number;
    percentPromotor: number;
    percentNeutro: number;
    percentDetrator: number;
  };
  scores: {
    medio_geral: number;
    comida: number;
    tempo_espera: number;
    atendimento_mesa: number;
    atendimento_recepcao: number;
  };
  evolucao: {
    mes: string;
    nps_score: number;
  }[];
  comentariosRecentes: {
    data: string;
    nota: number;
    comentario: string;
    tipo: 'promotor' | 'neutro' | 'detrator';
  }[];
  pesquisas: {
    frequencia: { opcao: string; frequencia: number }[];
    origem: { opcao: string; frequencia: number }[];
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

// Função para determinar cor do NPS
function getNPSColor(score: number): string {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 50) return 'text-lime-600';
  if (score >= 0) return 'text-amber-500';
  return 'text-red-500';
}

function getNPSBgColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-lime-500';
  if (score >= 0) return 'bg-amber-500';
  return 'bg-red-500';
}

function getNPSLabel(score: number): string {
  if (score >= 75) return 'Excelente';
  if (score >= 50) return 'Muito Bom';
  if (score >= 0) return 'Razoável';
  return 'Crítico';
}

// Componente de Gauge NPS
function NPSGauge({ score }: { score: number }) {
  const rotation = ((score + 100) / 200) * 180 - 90;
  
  return (
    <div className="relative w-48 h-24 mx-auto">
      {/* Fundo do gauge */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="w-48 h-48 rounded-full border-[16px] border-gray-200" 
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }} 
        />
      </div>
      {/* Cores do gauge */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="w-48 h-48 rounded-full border-[16px]"
          style={{ 
            clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
            borderColor: 'transparent',
            borderTopColor: '#ef4444',
            borderRightColor: '#f59e0b',
            transform: 'rotate(-90deg)'
          }} 
        />
      </div>
      {/* Ponteiro */}
      <div 
        className="absolute bottom-0 left-1/2 w-1 h-20 bg-gray-800 rounded-full origin-bottom transition-transform duration-1000"
        style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
      />
      {/* Centro */}
      <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-gray-800 rounded-full transform -translate-x-1/2 translate-y-1/2" />
      {/* Score */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <span className={`text-4xl font-bold ${getNPSColor(score)}`}>{score.toFixed(0)}</span>
      </div>
    </div>
  );
}

// Componente de Score Card
function ScoreCard({ 
  label, 
  score, 
  icon: Icon,
  category
}: { 
  label: string; 
  score: number; 
  icon: any;
  category?: string;
}) {
  // Cores específicas por categoria
  const getCategoryColors = (cat?: string) => {
    switch (cat) {
      case 'medio_geral':
        return {
          iconBg: 'bg-purple-100',
          iconColor: 'text-purple-600',
          textColor: 'text-purple-600',
          gradient: 'from-purple-500 to-purple-600'
        };
      case 'comida':
        return {
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          textColor: 'text-orange-600',
          gradient: 'from-orange-500 to-orange-600'
        };
      case 'tempo_espera':
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-600',
          gradient: 'from-blue-500 to-blue-600'
        };
      case 'atendimento_mesa':
        return {
          iconBg: 'bg-emerald-100',
          iconColor: 'text-emerald-600',
          textColor: 'text-emerald-600',
          gradient: 'from-emerald-500 to-emerald-600'
        };
      case 'atendimento_recepcao':
        return {
          iconBg: 'bg-teal-100',
          iconColor: 'text-teal-600',
          textColor: 'text-teal-600',
          gradient: 'from-teal-500 to-teal-600'
        };
      default:
        return {
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          textColor: 'text-gray-600',
          gradient: 'from-gray-500 to-gray-600'
        };
    }
  };

  const colors = getCategoryColors(category);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${colors.iconBg} rounded-lg flex items-center justify-center`}>
          <Icon size={20} className={colors.iconColor} />
        </div>
        <span className="text-sm text-gray-600 flex-1">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className={`text-3xl font-bold ${colors.textColor}`}>
          {score.toFixed(2)}
        </span>
        <span className="text-sm text-gray-400">/ 5.00</span>
      </div>
      {/* Barra de progresso com gradiente */}
      <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full bg-gradient-to-r ${colors.gradient} transition-all duration-500`}
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function NPSDashboardPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [selectedUnidade, setSelectedUnidade] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [loadingUnidades, setLoadingUnidades] = useState(true);
  const [data, setData] = useState<NPSData | null>(null);
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentFilter, setCommentFilter] = useState<'all' | 'promotor' | 'neutro' | 'detrator'>('all');

  // Buscar unidades
  useEffect(() => {
    if (!selectedGroupId) {
      setUnidades([]);
      setSelectedUnidade('');
      setLoadingUnidades(false);
      return;
    }

    const fetchUnidades = async () => {
      try {
        setLoadingUnidades(true);
        const res = await fetch(`/api/goomer/unidades?group_id=${selectedGroupId}`);
        if (res.ok) {
          const result = await res.json();
          setUnidades(result.unidades || []);
          if (result.unidades?.length > 0) {
            setSelectedUnidade(result.unidades[0].id);
          } else {
            setSelectedUnidade('');
          }
        }
      } catch (error) {
        console.error('Erro ao buscar unidades:', error);
      } finally {
        setLoadingUnidades(false);
      }
    };
    fetchUnidades();
  }, [selectedGroupId]);

  // Buscar dados do dashboard
  useEffect(() => {
    if (!selectedUnidade) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/goomer/dashboard?unidade_id=${selectedUnidade}&year=${selectedYear}&month=${selectedMonth}`
        );
        if (res.ok) {
          const result = await res.json();
          setData(result);
        } else {
          setData(null);
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedUnidade, selectedYear, selectedMonth]);

  const filteredComments = data?.comentariosRecentes?.filter(c => 
    commentFilter === 'all' || c.tipo === commentFilter
  ) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard NPS</h1>
        <p className="text-gray-500">Acompanhamento de satisfação dos clientes</p>
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
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione...</option>
              {groups.map((group: any) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Unidade */}
        <div className="w-56">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unidade <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedUnidade}
            onChange={(e) => setSelectedUnidade(e.target.value)}
            disabled={loadingUnidades || !selectedGroupId}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Selecione uma unidade...</option>
            {unidades.map((unidade) => (
              <option key={unidade.id} value={unidade.id}>
                {unidade.nome_goomer.replace(/_/g, ' ')}
              </option>
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
            {[2024, 2025, 2026, 2027].map((year) => (
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
          <p className="text-indigo-600 mt-1">Escolha um grupo para visualizar o dashboard de NPS</p>
        </div>
      )}

      {/* Mensagem se não selecionou unidade */}
      {selectedGroupId && !selectedUnidade && !loadingUnidades && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <Building2 size={48} className="mx-auto text-blue-400 mb-4" />
          <h3 className="text-lg font-medium text-blue-900">Selecione uma unidade</h3>
          <p className="text-blue-600 mt-1">Escolha uma unidade para visualizar o dashboard de NPS</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && data && (
        <div className="space-y-6">
          {/* Row 1: NPS Principal + Distribuição */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card NPS Principal */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-bl-full" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Star size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">NPS Score</h3>
                  <p className="text-sm text-gray-500">
                    {MONTHS[data.periodo.mes ? parseInt(data.periodo.mes.split('-')[1]) - 1 : selectedMonth - 1]?.label} {data.periodo.ano}
                  </p>
                </div>
              </div>

              <div className="text-center py-4">
                <div className={`text-6xl font-bold ${getNPSColor(data.nps.score)}`}>
                  {data.nps.score.toFixed(0)}
                </div>
                <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  data.nps.score >= 75 ? 'bg-emerald-100 text-emerald-700' :
                  data.nps.score >= 50 ? 'bg-lime-100 text-lime-700' :
                  data.nps.score >= 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  {getNPSLabel(data.nps.score)}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total de respostas</span>
                  <span className="font-semibold text-gray-900">{data.nps.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Card Distribuição */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Distribuição de Respostas</h3>
                  <p className="text-sm text-gray-500">Promotores, Neutros e Detratores</p>
                </div>
              </div>

              {/* Barra de distribuição */}
              <div className="mb-6">
                <div className="h-8 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-emerald-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                    style={{ width: `${data.nps.percentPromotor}%` }}
                  >
                    {data.nps.percentPromotor > 10 && `${data.nps.percentPromotor.toFixed(1)}%`}
                  </div>
                  <div 
                    className="bg-amber-400 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                    style={{ width: `${data.nps.percentNeutro}%` }}
                  >
                    {data.nps.percentNeutro > 10 && `${data.nps.percentNeutro.toFixed(1)}%`}
                  </div>
                  <div 
                    className="bg-red-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                    style={{ width: `${data.nps.percentDetrator}%` }}
                  >
                    {data.nps.percentDetrator > 10 && `${data.nps.percentDetrator.toFixed(1)}%`}
                  </div>
                </div>
              </div>

              {/* Cards de cada tipo */}
              <div className="grid grid-cols-3 gap-4">
                {/* Promotores */}
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp size={18} className="text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">Promotores</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">{data.nps.promotores.toLocaleString()}</p>
                  <p className="text-xs text-emerald-500 mt-1">Notas 9-10</p>
                  <p className="text-lg font-semibold text-emerald-600 mt-2">{data.nps.percentPromotor.toFixed(1)}%</p>
                </div>

                {/* Neutros */}
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Minus size={18} className="text-amber-600" />
                    <span className="text-sm font-medium text-amber-700">Neutros</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">{data.nps.neutros.toLocaleString()}</p>
                  <p className="text-xs text-amber-500 mt-1">Notas 7-8</p>
                  <p className="text-lg font-semibold text-amber-600 mt-2">{data.nps.percentNeutro.toFixed(1)}%</p>
                </div>

                {/* Detratores */}
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsDown size={18} className="text-red-600" />
                    <span className="text-sm font-medium text-red-700">Detratores</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{data.nps.detratores.toLocaleString()}</p>
                  <p className="text-xs text-red-500 mt-1">Notas 0-6</p>
                  <p className="text-lg font-semibold text-red-600 mt-2">{data.nps.percentDetrator.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Scores por Categoria */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Star size={20} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Avaliações por Categoria</h3>
                <p className="text-sm text-gray-500">Média das notas de 0 a 5</p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <ScoreCard 
                  label="Média Geral" 
                  score={data.scores.medio_geral} 
                  icon={Star}
                  category="medio_geral"
                />
                <ScoreCard 
                  label="Comida" 
                  score={data.scores.comida} 
                  icon={Utensils}
                  category="comida"
                />
                <ScoreCard 
                  label="Tempo de Espera" 
                  score={data.scores.tempo_espera} 
                  icon={Clock}
                  category="tempo_espera"
                />
                <ScoreCard 
                  label="Atendimento Mesa" 
                  score={data.scores.atendimento_mesa} 
                  icon={UserCheck}
                  category="atendimento_mesa"
                />
                <ScoreCard 
                  label="Recepção" 
                  score={data.scores.atendimento_recepcao} 
                  icon={DoorOpen}
                  category="atendimento_recepcao"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Evolução NPS + Comentários */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolução NPS */}
            {data.evolucao && data.evolucao.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <TrendingUp size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Evolução do NPS</h3>
                    <p className="text-sm text-gray-500">Últimos meses</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {data.evolucao.map((item, index) => {
                      const [ano, mes] = item.mes.split('-');
                      const mesLabel = MONTHS[parseInt(mes) - 1]?.label?.slice(0, 3) || mes;
                      const prevScore = index > 0 ? data.evolucao[index - 1].nps_score : item.nps_score;
                      const diff = item.nps_score - prevScore;
                      
                      return (
                        <div key={item.mes} className="flex items-center gap-4">
                          <span className="w-16 text-sm text-gray-500">{mesLabel}/{ano.slice(2)}</span>
                          <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-500"
                              style={{ width: `${Math.max(((item.nps_score + 100) / 200) * 100, 5)}%` }}
                            />
                          </div>
                          <span className={`w-12 text-right font-semibold ${getNPSColor(item.nps_score)}`}>
                            {item.nps_score.toFixed(0)}
                          </span>
                          {index > 0 && (
                            <span className={`w-12 text-xs ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Comentários Recentes */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <MessageSquare size={20} className="text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Comentários Recentes</h3>
                      <p className="text-sm text-gray-500">{filteredComments.length} comentários</p>
                    </div>
                  </div>
                  
                  {/* Filtro de comentários */}
                  <div className="flex gap-1">
                    {['all', 'promotor', 'neutro', 'detrator'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setCommentFilter(filter as any)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          commentFilter === filter 
                            ? filter === 'promotor' ? 'bg-emerald-100 text-emerald-700' :
                              filter === 'neutro' ? 'bg-amber-100 text-amber-700' :
                              filter === 'detrator' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {filter === 'all' ? 'Todos' : 
                         filter === 'promotor' ? '😊' :
                         filter === 'neutro' ? '😐' : '😞'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className={`divide-y divide-gray-100 ${showAllComments ? 'max-h-96' : 'max-h-64'} overflow-y-auto`}>
                {filteredComments.slice(0, showAllComments ? 20 : 5).map((comment, index) => (
                  <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        comment.tipo === 'promotor' ? 'bg-emerald-100' :
                        comment.tipo === 'neutro' ? 'bg-amber-100' : 'bg-red-100'
                      }`}>
                        <span className="text-sm">
                          {comment.tipo === 'promotor' ? '😊' :
                           comment.tipo === 'neutro' ? '😐' : '😞'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-semibold ${
                            comment.tipo === 'promotor' ? 'text-emerald-600' :
                            comment.tipo === 'neutro' ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            Nota {comment.nota}
                          </span>
                          <span className="text-xs text-gray-400">{comment.data}</span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">{comment.comentario}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredComments.length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">
                    Nenhum comentário encontrado
                  </div>
                )}
              </div>
              
              {filteredComments.length > 5 && (
                <div className="px-6 py-3 border-t border-gray-100">
                  <button
                    onClick={() => setShowAllComments(!showAllComments)}
                    className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showAllComments ? (
                      <>
                        <ChevronUp size={16} />
                        Ver menos
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        Ver mais ({filteredComments.length - 5} restantes)
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Pesquisas - Frequência e Origem */}
          {data.pesquisas && (data.pesquisas.frequencia?.length > 0 || data.pesquisas.origem?.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Frequência de Visita */}
              {data.pesquisas.frequencia?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Users size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Frequência de Visita</h3>
                      <p className="text-sm text-gray-500">Com que frequência os clientes visitam</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {data.pesquisas.frequencia.map((item, index) => {
                        const colors = [
                          'bg-indigo-500',
                          'bg-blue-500', 
                          'bg-cyan-500',
                          'bg-teal-500'
                        ];
                        const total = data.pesquisas.frequencia.reduce((sum: number, i: any) => sum + i.frequencia, 0);
                        const percent = total > 0 ? (item.frequencia / total) * 100 : 0;
                        
                        return (
                          <div key={item.opcao} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">{item.opcao}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">{item.frequencia.toLocaleString()}</span>
                                <span className="text-sm font-semibold text-gray-900">{percent.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${colors[index % colors.length]}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Total */}
                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Total de respostas</span>
                      <span className="font-semibold text-gray-900">
                        {data.pesquisas.frequencia.reduce((sum: number, i: any) => sum + i.frequencia, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Origem / Como conheceu */}
              {data.pesquisas.origem?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                      <TrendingUp size={20} className="text-pink-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Como Conheceu o Izu</h3>
                      <p className="text-sm text-gray-500">Canal de origem dos clientes</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {data.pesquisas.origem.map((item, index) => {
                        const colors = [
                          'bg-pink-500',
                          'bg-rose-500',
                          'bg-orange-500',
                          'bg-amber-500',
                          'bg-yellow-500',
                          'bg-lime-500',
                          'bg-green-500'
                        ];
                        const icons: Record<string, string> = {
                          'Instagram': '📸',
                          'TikTok': '🎵',
                          'Pedidos via delivery': '🛵',
                          'Passei em frente': '🚶',
                          'Ganhei um voucher': '🎟️',
                          'Indicação': '👥',
                          'Outros': '📌'
                        };
                        const total = data.pesquisas.origem.reduce((sum: number, i: any) => sum + i.frequencia, 0);
                        const percent = total > 0 ? (item.frequencia / total) * 100 : 0;
                        
                        return (
                          <div key={item.opcao} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <span>{icons[item.opcao] || '📌'}</span>
                                {item.opcao}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">{item.frequencia.toLocaleString()}</span>
                                <span className="text-sm font-semibold text-gray-900">{percent.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${colors[index % colors.length]}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Total */}
                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Total de respostas</span>
                      <span className="font-semibold text-gray-900">
                        {data.pesquisas.origem.reduce((sum: number, i: any) => sum + i.frequencia, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sem dados */}
      {!loading && !data && selectedUnidade && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sem dados para este período</h3>
          <p className="text-gray-500">
            Não há dados de NPS importados para esta unidade neste mês.
          </p>
        </div>
      )}
    </div>
  );
}
