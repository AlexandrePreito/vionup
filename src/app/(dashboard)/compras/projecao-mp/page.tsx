'use client';

import { useState, useEffect, Fragment } from 'react';
import { 
  Search, Loader2, Download, Package, TrendingUp, AlertTriangle, 
  CheckCircle, XCircle, Calendar, BarChart3, ChevronDown,
  Sun, Moon, Coffee, List, X, MoreVertical, Calculator,
  Eye, ShoppingCart, Warehouse, Link2, Boxes
} from 'lucide-react';
import { Button } from '@/components/ui';
import { CompanyGroup, Company } from '@/types';
import { useGroupFilter } from '@/hooks/useGroupFilter';

interface LinkedSaleProduct {
  name: string;
  externalId: string;
  quantityPerUnit: number;
  totalSales: number;
}

interface LinkedStockProduct {
  name: string;
  externalId: string;
  quantity: number;
  companyId: string;
}

interface MPProjectionItem {
  rawMaterialId: string;
  name: string;
  unit: string;
  category: string;
  lossFactor: number;
  totalHistorySales: number;
  avgDailySales: number;
  averagesByDay: {
    domingo: number;
    segunda: number;
    terca: number;
    quarta: number;
    quinta: number;
    sexta: number;
    sabado: number;
    feriado: number;
  };
  projectedConsumption: number;
  dailyProjection: { date: string; dayName: string; projected: number; isHoliday: boolean }[];
  currentStock: number;
  minStock: number;
  conversionFactor: number;
  purchaseUnit: string;
  purchaseNeed: number;
  purchaseQuantity: number;
  needsPurchase: boolean;
  stockStatus: 'out' | 'low' | 'ok';
  linkedSaleProducts: LinkedSaleProduct[];
  linkedStockProducts: LinkedStockProduct[];
}

interface ProjectionSummary {
  totalProducts: number;
  productsNeedPurchase: number;
  projectionDays: number;
  historyDays: number;
  projectionStartDate: string;
  historyStartDate: string;
  holidaysInPeriod: string[];
}

export default function ProjecaoMPPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [projectionDays, setProjectionDays] = useState(10);
  const [historyDays, setHistoryDays] = useState(7);
  const [projectionType, setProjectionType] = useState<'linear' | 'weekly'>('weekly');
  const [loading, setLoading] = useState(false);
  const [projection, setProjection] = useState<MPProjectionItem[]>([]);
  const [summary, setSummary] = useState<ProjectionSummary | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'need' | 'ok'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [showOnlyWithSales, setShowOnlyWithSales] = useState(true);

  // Estados para seleção
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Modal de detalhes
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMPDetail, setSelectedMPDetail] = useState<MPProjectionItem | null>(null);

  // Modal de produtos vinculados
  const [showLinkedModal, setShowLinkedModal] = useState(false);
  const [selectedMPLinked, setSelectedMPLinked] = useState<MPProjectionItem | null>(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Obter categorias únicas
  const categories = [...new Set(projection.map((p: any) => p.category).filter(Boolean))].sort();

  // Buscar empresas do grupo
  const fetchCompanies = async () => {
    if (!selectedGroupId) return;
    try {
      const res = await fetch(`/api/companies?group_id=${selectedGroupId}`);
      if (!res.ok) return;
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  // Toggle seleção de produto
  const toggleProductSelection = (id: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  // Selecionar/deselecionar todos
  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProjection.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProjection.map((p: any) => p.rawMaterialId)));
    }
  };

  // Gerar lista de compras
  const generatePurchaseList = () => {
    const selectedItems = filteredProjection.filter((p: any) => selectedProducts.has(p.rawMaterialId));
    if (selectedItems.length === 0) {
      alert('Selecione pelo menos uma matéria-prima');
      return;
    }

    const headers = ['Matéria-Prima', 'Unidade', 'Necessidade', 'Qtd. Compra', 'UN Compra'];
    const rows = selectedItems.map((item: any) => [
      item.name,
      item.unit,
      item.purchaseNeed.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      item.purchaseQuantity.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      item.purchaseUnit
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((row: any) => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lista_compras_mp_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Abrir modal de detalhes
  const openMPDetail = (item: MPProjectionItem) => {
    setSelectedMPDetail(item);
    setShowDetailModal(true);
  };

  // Abrir modal de produtos vinculados
  const openLinkedProducts = (item: MPProjectionItem) => {
    setSelectedMPLinked(item);
    setShowLinkedModal(true);
  };

  // Calcular dia com maior venda
  const getMaxSalesDay = (averages: MPProjectionItem['averagesByDay']) => {
    const days = [
      { name: 'Domingo', value: averages.domingo },
      { name: 'Segunda', value: averages.segunda },
      { name: 'Terça', value: averages.terca },
      { name: 'Quarta', value: averages.quarta },
      { name: 'Quinta', value: averages.quinta },
      { name: 'Sexta', value: averages.sexta },
      { name: 'Sábado', value: averages.sabado },
    ];
    return days.reduce((max: any, day: any) => day.value > max.value ? day : max, days[0]);
  };

  // Calcular máximo para escala do gráfico
  const getMaxValue = (averages: MPProjectionItem['averagesByDay']) => {
    const values = Object.values(averages);
    return Math.max(...values, 1);
  };

  // Buscar projeção
  const fetchProjection = async () => {
    if (!selectedGroupId) return;
    
    setLoading(true);
    try {
      let url = `/api/projection/raw-materials?group_id=${selectedGroupId}&projection_days=${projectionDays}&history_days=${historyDays}&projection_type=${projectionType}`;
      if (selectedCompany) {
        url += `&company_id=${selectedCompany}`;
      }
      
      const res = await fetch(url);
      
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Erro ao buscar projeção');
        return;
      }
      
      const data = await res.json();
      setProjection(data.projection || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Erro ao buscar projeção:', error);
      alert('Erro ao buscar projeção');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      fetchCompanies();
      fetchProjection();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  // Filtrar matérias-primas
  const filteredProjection = projection.filter((item: any) => {
    // Filtro de busca
    const matchesSearch = search === '' || 
      item.name.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    // Filtro de categoria
    if (filterCategory && item.category !== filterCategory) return false;

    // Filtro de status
    if (filterStatus === 'need' && !item.needsPurchase) return false;
    if (filterStatus === 'ok' && item.needsPurchase) return false;

    // Filtro de produtos com vendas
    if (showOnlyWithSales && item.totalHistorySales === 0) return false;

    return true;
  });

  // Paginação
  const totalPages = Math.ceil(filteredProjection.length / ITEMS_PER_PAGE);
  const paginatedProjection = filteredProjection.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Resetar página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterCategory, filterStatus, showOnlyWithSales, projection]);

  // Formatar número
  const formatNumber = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    });
  };

  // Formatar data
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Exportar para CSV
  const exportToCSV = () => {
    const companyName = selectedCompany 
      ? companies.find((c: any) => c.id === selectedCompany)?.name || ''
      : 'Todas';
    
    const headers = [
      'Matéria-Prima',
      'Média/Dia',
      'Perda %',
      'Projeção',
      'Estoque',
      'Est. Mín.',
      'Qtd. Compra',
      'Empresa'
    ];

    const rows = filteredProjection.map((item: any) => [
      item.name,
      formatNumber(item.avgDailySales),
      item.lossFactor,
      formatNumber(item.projectedConsumption),
      formatNumber(item.currentStock),
      formatNumber(item.minStock),
      formatNumber(item.purchaseQuantity),
      companyName
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((row: any) => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `projecao-materia-prima-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'out': return 'text-red-600 bg-red-100';
      case 'low': return 'text-orange-600 bg-orange-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projeção de Compras - Matéria Prima</h1>
          <p className="text-gray-500 text-sm mt-1">
            Projeção baseada nos produtos de venda vinculados às matérias-primas
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={filteredProjection.length === 0}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          title="Exportar CSV"
        >
          <Download size={20} />
        </button>
      </div>

      {/* Filtros */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
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
          <div className="w-52">
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={!selectedGroupId}
            >
              <option value="">Todas as empresas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>

          {/* Período de Projeção */}
          <div className="w-28">
            <label className="block text-sm font-medium text-gray-700 mb-1">Projetar (dias)</label>
            <input
              type="number"
              value={projectionDays}
              onChange={(e) => setProjectionDays(Number(e.target.value) || 1)}
              min={1}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Histórico */}
          <div className="w-28">
            <label className="block text-sm font-medium text-gray-700 mb-1">Histórico (dias)</label>
            <input
              type="number"
              value={historyDays}
              onChange={(e) => setHistoryDays(Number(e.target.value) || 1)}
              min={1}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tipo de Projeção */}
          <div className="flex items-end">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setProjectionType('linear')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  projectionType === 'linear'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Projeção Linear: usa média diária simples"
              >
                Linear
              </button>
              <button
                type="button"
                onClick={() => setProjectionType('weekly')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  projectionType === 'weekly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Projeção Semanal: considera dia da semana e feriados"
              >
                Semanal
              </button>
            </div>
          </div>

          {/* Botão Calcular */}
          <div className="flex items-end">
            <button 
              onClick={fetchProjection} 
              disabled={!selectedGroupId || loading}
              title="Calcular Projeção"
              className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 size={22} className="animate-spin" /> : <Calculator size={22} />}
            </button>
          </div>
        </div>

        {/* Segunda linha de filtros */}
        <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
          {/* Busca */}
          <div className="flex-1 max-w-md relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar matéria-prima..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro Categoria */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[180px]"
          >
            <option value="">Todas categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Filtro Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'need' | 'ok')}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os status</option>
            <option value="need">Precisa comprar</option>
            <option value="ok">Estoque OK</option>
          </select>

          {/* Checkbox produtos com vendas */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyWithSales}
              onChange={(e) => setShowOnlyWithSales(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 accent-blue-600"
            />
            <span className="text-sm text-gray-700">Apenas com vendas</span>
          </label>
        </div>

        {/* Terceira linha - Ações para selecionados */}
        {selectedProducts.size > 0 && (
          <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
            <span className="text-sm font-medium text-blue-600">
              {selectedProducts.size} matéria(s)-prima(s) selecionada(s)
            </span>
            <div className="relative">
              <Button 
                onClick={() => setShowActionsMenu(!showActionsMenu)}
              >
                <MoreVertical size={18} className="mr-2" />
                Ações
                <ChevronDown size={16} className="ml-2" />
              </Button>
              {showActionsMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                  <button
                    onClick={() => {
                      generatePurchaseList();
                      setShowActionsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <List size={16} />
                    Gerar Lista
                  </button>
                </div>
              )}
            </div>
            <Button 
              variant="secondary" 
              onClick={() => setSelectedProducts(new Set())}
              className="text-gray-500"
            >
              <X size={16} className="mr-1" />
              Limpar
            </Button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      )}

      {/* Tabela */}
      {!loading && filteredProjection.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === filteredProjection.length && filteredProjection.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer accent-blue-600"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 w-[280px]">Matéria-Prima</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700 w-[100px]">Média/Dia</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700 w-[100px]">Projeção</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700 w-[100px]">Estoque</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700 w-[100px]">Est. Mín.</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700 w-[120px]">Qtd. Compra</th>
                  <th className="w-[80px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedProjection.map((item) => (
                  <Fragment key={item.rawMaterialId}>
                    <tr
                      className={`hover:bg-gray-50 transition-colors ${item.needsPurchase ? 'bg-red-50/30' : ''} ${selectedProducts.has(item.rawMaterialId) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(item.rawMaterialId)}
                          onChange={() => toggleProductSelection(item.rawMaterialId)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer accent-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500">{item.category || 'Sem categoria'}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{item.unit}</span>
                            {item.lossFactor > 0 && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-orange-500">Perda: {item.lossFactor}%</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-700">{formatNumber(item.avgDailySales)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-blue-600">{formatNumber(item.projectedConsumption)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={item.stockStatus === 'out' ? 'text-red-600 font-medium' : 'text-gray-700'}>
                          {formatNumber(item.currentStock)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-500">{formatNumber(item.minStock)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.needsPurchase ? (
                          <span className="font-bold text-red-600">
                            {formatNumber(item.purchaseQuantity)} {item.purchaseUnit}
                          </span>
                        ) : (
                          <span className="text-green-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openMPDetail(item)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                            title="Ver detalhes da projeção"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => openLinkedProducts(item)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-blue-400 hover:text-blue-600"
                            title="Ver produtos vinculados"
                          >
                            <Link2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer com paginação */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProjection.length)} de {filteredProjection.length} matérias-primas
              <span className="text-red-600 ml-2">
                ({filteredProjection.filter((p: any) => p.needsPurchase).length} precisam de compra)
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ««
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                «
              </button>
              <span className="text-sm text-gray-600 px-2">
                Página {currentPage} de {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                »
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                »»
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredProjection.length === 0 && projection.length > 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Package size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium">Nenhuma matéria-prima encontrada</p>
          <p className="text-sm">Tente ajustar os filtros</p>
        </div>
      )}

      {!loading && projection.length === 0 && selectedGroupId && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <BarChart3 size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium">Nenhuma projeção calculada</p>
          <p className="text-sm">Clique em &quot;Calcular Projeção&quot; para começar</p>
        </div>
      )}

      {/* Modal Detalhes da Matéria-Prima */}
      {showDetailModal && selectedMPDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedMPDetail.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Categoria: {selectedMPDetail.category || 'Sem categoria'}</span>
                    <span>Unidade: {selectedMPDetail.unit}</span>
                    {selectedMPDetail.lossFactor > 0 && (
                      <span className="text-orange-600">Perda: {selectedMPDetail.lossFactor}%</span>
                    )}
                    {selectedMPDetail.needsPurchase ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Precisa Comprar
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Estoque OK
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Cards de resumo */}
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500">Estoque Atual</p>
                  <p className={`text-2xl font-bold ${selectedMPDetail.currentStock < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatNumber(selectedMPDetail.currentStock)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500">Projeção {projectionDays} dias</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(selectedMPDetail.projectedConsumption)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500">Necessidade</p>
                  <p className={`text-2xl font-bold ${selectedMPDetail.purchaseNeed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatNumber(selectedMPDetail.purchaseNeed > 0 ? selectedMPDetail.purchaseNeed : 0)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500">Qtd. Compra ({selectedMPDetail.purchaseUnit})</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatNumber(selectedMPDetail.purchaseQuantity > 0 ? selectedMPDetail.purchaseQuantity : 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
              <div className="grid grid-cols-2 gap-6">
                {/* Coluna Esquerda - Médias por dia */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-600" />
                    Consumo Médio por Dia da Semana
                  </h3>
                  
                  {/* Gráfico de barras visual */}
                  <div className="space-y-2">
                    {[
                      { day: 'Domingo', value: selectedMPDetail.averagesByDay.domingo, icon: <Sun size={14} /> },
                      { day: 'Segunda', value: selectedMPDetail.averagesByDay.segunda, icon: <Coffee size={14} /> },
                      { day: 'Terça', value: selectedMPDetail.averagesByDay.terca },
                      { day: 'Quarta', value: selectedMPDetail.averagesByDay.quarta },
                      { day: 'Quinta', value: selectedMPDetail.averagesByDay.quinta },
                      { day: 'Sexta', value: selectedMPDetail.averagesByDay.sexta },
                      { day: 'Sábado', value: selectedMPDetail.averagesByDay.sabado, icon: <Moon size={14} /> },
                    ].map(({ day, value, icon }) => {
                      const maxValue = getMaxValue(selectedMPDetail.averagesByDay);
                      const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                      const isMax = value === maxValue && value > 0;
                      
                      return (
                        <div key={day} className="flex items-center gap-3">
                          <div className="w-16 flex items-center gap-1.5 text-sm text-gray-600">
                            {icon && <span className="text-gray-400">{icon}</span>}
                            <span className={isMax ? 'font-semibold text-gray-900' : ''}>{day.substring(0, 3)}</span>
                          </div>
                          <div className="flex-1 h-7 bg-gray-100 rounded overflow-hidden relative">
                            <div 
                              className={`h-full transition-all duration-500 rounded ${isMax ? 'bg-blue-600' : 'bg-blue-400'}`}
                              style={{ width: `${percentage}%` }}
                            />
                            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-sm font-medium ${percentage > 60 ? 'text-white' : 'text-gray-700'}`}>
                              {formatNumber(value)}
                            </span>
                          </div>
                          {isMax && (
                            <TrendingUp size={14} className="text-green-500" />
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Feriado */}
                    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                      <div className="w-16 flex items-center gap-1.5 text-sm text-gray-600">
                        <span className="text-gray-400"><Calendar size={14} /></span>
                        <span>Feriado</span>
                      </div>
                      <div className="flex-1 h-7 bg-gray-100 rounded overflow-hidden relative">
                        <div 
                          className="h-full bg-red-400 transition-all duration-500 rounded"
                          style={{ width: `${getMaxValue(selectedMPDetail.averagesByDay) > 0 ? (selectedMPDetail.averagesByDay.feriado / getMaxValue(selectedMPDetail.averagesByDay)) * 100 : 0}%` }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-700">
                          {formatNumber(selectedMPDetail.averagesByDay.feriado)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Insight */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700">
                      <TrendingUp size={14} className="inline mr-1 text-green-500" />
                      Maior consumo: <strong>{getMaxSalesDay(selectedMPDetail.averagesByDay).name}</strong> com média de <strong>{formatNumber(getMaxSalesDay(selectedMPDetail.averagesByDay).value)}</strong> {selectedMPDetail.unit}.
                    </p>
                  </div>
                </div>

                {/* Coluna Direita - Projeção diária */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-blue-600" />
                    Projeção Diária ({projectionDays} dias)
                  </h3>
                  
                  {/* Gráfico de linha */}
                  {(() => {
                    const data = selectedMPDetail.dailyProjection;
                    const values = data.map((d: any) => d.projected);
                    const maxVal = Math.max(...values, 1);
                    const minVal = Math.min(...values, 0);
                    const range = maxVal - minVal || 1;
                    
                    // Dimensões do gráfico
                    const width = 400;
                    const height = 150;
                    const paddingX = 30;
                    const paddingY = 20;
                    const graphWidth = width - paddingX * 2;
                    const graphHeight = height - paddingY * 2;
                    
                    // Calcular pontos
                    const points = data.map((day, i) => ({
                      x: paddingX + (i / Math.max(data.length - 1, 1)) * graphWidth,
                      y: paddingY + graphHeight - ((day.projected - minVal) / range) * graphHeight,
                      ...day
                    }));
                    
                    // Criar linha suave com Catmull-Rom spline
                    const createSmoothLine = () => {
                      if (points.length < 2) return '';
                      if (points.length === 2) {
                        return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
                      }
                      
                      let path = `M ${points[0].x} ${points[0].y}`;
                      
                      for (let i = 0; i < points.length - 1; i++) {
                        const p0 = points[Math.max(i - 1, 0)];
                        const p1 = points[i];
                        const p2 = points[i + 1];
                        const p3 = points[Math.min(i + 2, points.length - 1)];
                        
                        const cp1x = p1.x + (p2.x - p0.x) / 6;
                        const cp1y = p1.y + (p2.y - p0.y) / 6;
                        const cp2x = p2.x - (p3.x - p1.x) / 6;
                        const cp2y = p2.y - (p3.y - p1.y) / 6;
                        
                        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
                      }
                      
                      return path;
                    };
                    
                    // Criar área preenchida
                    const createArea = () => {
                      const line = createSmoothLine();
                      if (!line) return '';
                      const lastPoint = points[points.length - 1];
                      const firstPoint = points[0];
                      return `${line} L ${lastPoint.x},${paddingY + graphHeight} L ${firstPoint.x},${paddingY + graphHeight} Z`;
                    };
                    
                    // Labels do eixo Y
                    const yLabels = [0, 0.5, 1].map((ratio: any) => ({
                      value: minVal + ratio * range,
                      y: paddingY + graphHeight - ratio * graphHeight
                    }));
                    
                    return (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                          {/* Grid horizontal */}
                          {yLabels.map((label, i) => (
                            <g key={i}>
                              <line
                                x1={paddingX}
                                y1={label.y}
                                x2={width - paddingX}
                                y2={label.y}
                                stroke="#e5e7eb"
                                strokeWidth="1"
                                strokeDasharray="4,4"
                              />
                              <text
                                x={paddingX - 5}
                                y={label.y + 4}
                                textAnchor="end"
                                className="text-[10px] fill-gray-400"
                              >
                                {Math.round(label.value)}
                              </text>
                            </g>
                          ))}
                          
                          {/* Área preenchida */}
                          <path
                            d={createArea()}
                            fill="url(#areaGradientMP)"
                          />
                          
                          {/* Linha principal */}
                          <path
                            d={createSmoothLine()}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* Pontos e labels */}
                          {points.map((point, i) => {
                            const showLabel = data.length <= 7 || i === 0 || i === data.length - 1 || point.isHoliday || 
                              (i % Math.ceil(data.length / 5) === 0);
                            
                            return (
                              <g key={i}>
                                {/* Ponto */}
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r={point.isHoliday ? 5 : 4}
                                  fill={point.isHoliday ? '#ef4444' : '#3b82f6'}
                                  stroke="white"
                                  strokeWidth="2"
                                />
                                
                                {/* Valor no ponto */}
                                {showLabel && (
                                  <text
                                    x={point.x}
                                    y={point.y - 10}
                                    textAnchor="middle"
                                    className={`text-[10px] font-semibold ${point.isHoliday ? 'fill-red-600' : 'fill-blue-600'}`}
                                  >
                                    {formatNumber(point.projected)}
                                  </text>
                                )}
                              </g>
                            );
                          })}
                          
                          {/* Labels do eixo X */}
                          {points.map((point, i) => {
                            const showXLabel = data.length <= 10 || i === 0 || i === data.length - 1 || 
                              (i % Math.ceil(data.length / 6) === 0);
                            if (!showXLabel) return null;
                            
                            return (
                              <g key={`x-${i}`}>
                                <text
                                  x={point.x}
                                  y={height - 5}
                                  textAnchor="middle"
                                  className={`text-[9px] ${point.isHoliday ? 'fill-red-500 font-medium' : 'fill-gray-500'}`}
                                >
                                  {formatDate(point.date)}
                                </text>
                              </g>
                            );
                          })}
                          
                          {/* Gradient definition */}
                          <defs>
                            <linearGradient id="areaGradientMP" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                    );
                  })()}

                  {/* Total projetado */}
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-800 font-medium">Total Projetado:</span>
                      <span className="text-lg font-bold text-blue-900">
                        {formatNumber(selectedMPDetail.projectedConsumption)} {selectedMPDetail.unit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Produtos Vinculados */}
              <div className="mt-6 grid grid-cols-2 gap-6">
                {/* Produtos de Venda */}
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Link2 size={18} className="text-green-600" />
                    Produtos de Venda ({selectedMPDetail.linkedSaleProducts.length})
                  </h3>
                  
                  {selectedMPDetail.linkedSaleProducts.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum produto de venda vinculado</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedMPDetail.linkedSaleProducts.map((product, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.externalId}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-green-600">{formatNumber(product.quantityPerUnit)} {selectedMPDetail.unit}/un</p>
                            <p className="text-xs text-gray-500">{formatNumber(product.totalSales)} vendas</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Produtos de Estoque */}
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Boxes size={18} className="text-teal-600" />
                    Produtos de Estoque ({selectedMPDetail.linkedStockProducts.length})
                  </h3>
                  
                  {selectedMPDetail.linkedStockProducts.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum produto de estoque vinculado</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedMPDetail.linkedStockProducts.map((stock, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{stock.name}</p>
                            <p className="text-xs text-gray-500">{stock.externalId}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-teal-600">{formatNumber(stock.quantity)} {selectedMPDetail.unit}</p>
                            <p className="text-xs text-gray-500">Empresa: {stock.companyId}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Análise de Compra */}
              <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ShoppingCart size={18} className="text-gray-600" />
                  Análise de Compra
                </h3>
                
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {/* Fluxo visual */}
                  <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200 min-w-[90px]">
                    <Warehouse size={20} className="mx-auto text-gray-500 mb-1" />
                    <p className="text-xs text-gray-500">Estoque</p>
                    <p className={`font-bold ${selectedMPDetail.currentStock < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatNumber(selectedMPDetail.currentStock)}
                    </p>
                  </div>
                  
                  <span className="text-gray-400 text-lg">−</span>
                  
                  <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200 min-w-[90px]">
                    <TrendingUp size={20} className="mx-auto text-blue-500 mb-1" />
                    <p className="text-xs text-gray-500">Projeção</p>
                    <p className="font-bold text-gray-900">{formatNumber(selectedMPDetail.projectedConsumption)}</p>
                  </div>
                  
                  <span className="text-gray-400 text-lg">−</span>
                  
                  <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200 min-w-[90px]">
                    <AlertTriangle size={20} className="mx-auto text-orange-500 mb-1" />
                    <p className="text-xs text-gray-500">Est. Mín.</p>
                    <p className="font-bold text-gray-900">{formatNumber(selectedMPDetail.minStock)}</p>
                  </div>
                  
                  <span className="text-gray-400 text-lg">=</span>
                  
                  <div className={`text-center p-3 rounded-lg border-2 min-w-[100px] ${
                    selectedMPDetail.needsPurchase 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <ShoppingCart size={20} className={`mx-auto mb-1 ${
                      selectedMPDetail.needsPurchase ? 'text-red-500' : 'text-green-500'
                    }`} />
                    <p className="text-xs text-gray-500">Necessidade</p>
                    <p className={`font-bold ${
                      selectedMPDetail.needsPurchase ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {selectedMPDetail.needsPurchase ? formatNumber(selectedMPDetail.purchaseNeed) : 'OK'}
                    </p>
                  </div>
                </div>

                {/* Informações de conversão */}
                {selectedMPDetail.conversionFactor > 0 && selectedMPDetail.needsPurchase && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700">
                      <strong>Conversão:</strong> 1 {selectedMPDetail.purchaseUnit} = {formatNumber(selectedMPDetail.conversionFactor)} {selectedMPDetail.unit} → 
                      <strong className="text-blue-600 ml-1">
                        {formatNumber(selectedMPDetail.purchaseQuantity)} {selectedMPDetail.purchaseUnit}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                Fechar
              </Button>
              {selectedMPDetail.needsPurchase && (
                <Button onClick={() => {
                  setSelectedProducts(new Set([selectedMPDetail.rawMaterialId]));
                  setShowDetailModal(false);
                }}>
                  <ShoppingCart size={18} className="mr-2" />
                  Adicionar à Lista
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Produtos Vinculados */}
      {showLinkedModal && selectedMPLinked && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <Link2 size={24} className="text-blue-600" />
                    Produtos Vinculados - {selectedMPLinked.name}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Categoria: {selectedMPLinked.category || 'Sem categoria'}</span>
                    <span>Unidade: {selectedMPLinked.unit}</span>
                    <span className="text-blue-600 font-medium">
                      {selectedMPLinked.linkedSaleProducts.length} produtos de venda • {selectedMPLinked.linkedStockProducts.length} produtos de estoque
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowLinkedModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-2 gap-6">
                {/* Produtos de Venda */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                    <TrendingUp size={20} className="text-green-600" />
                    Produtos de Venda
                    <span className="ml-auto text-sm font-normal text-gray-500">
                      {selectedMPLinked.linkedSaleProducts.length} produto(s)
                    </span>
                  </h3>
                  
                  {selectedMPLinked.linkedSaleProducts.length === 0 ? (
                    <div className="p-8 bg-gray-50 rounded-xl border border-gray-200 text-center">
                      <Package size={40} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">Nenhum produto de venda vinculado</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Vincule produtos na tela de Matérias-Primas
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedMPLinked.linkedSaleProducts.map((product, idx) => (
                        <div 
                          key={idx} 
                          className="p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{product.name}</p>
                              <p className="text-sm text-gray-500 mt-0.5">{product.externalId}</p>
                            </div>
                            <div className="text-right ml-4">
                              <div className="flex items-center gap-2 justify-end">
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                                  {formatNumber(product.quantityPerUnit)} {selectedMPLinked.unit}/un
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {formatNumber(product.totalSales)} vendas no período
                              </p>
                            </div>
                          </div>
                          
                          {/* Barra de contribuição */}
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <span>Contribuição para consumo</span>
                              <span className="font-medium text-green-600">
                                {formatNumber(product.totalSales * product.quantityPerUnit)} {selectedMPLinked.unit}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${Math.min(100, (product.totalSales * product.quantityPerUnit / Math.max(selectedMPLinked.projectedConsumption, 1)) * 100)}%` 
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Total de vendas */}
                      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-800">Total de Consumo no Histórico</span>
                          <span className="text-lg font-bold text-green-700">
                            {formatNumber(selectedMPLinked.totalHistorySales)} {selectedMPLinked.unit}
                          </span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          Média de {formatNumber(selectedMPLinked.avgDailySales)} {selectedMPLinked.unit}/dia
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Produtos de Estoque */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                    <Boxes size={20} className="text-teal-600" />
                    Produtos de Estoque
                    <span className="ml-auto text-sm font-normal text-gray-500">
                      {selectedMPLinked.linkedStockProducts.length} produto(s)
                    </span>
                  </h3>
                  
                  {selectedMPLinked.linkedStockProducts.length === 0 ? (
                    <div className="p-8 bg-gray-50 rounded-xl border border-gray-200 text-center">
                      <Warehouse size={40} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">Nenhum produto de estoque vinculado</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Vincule produtos na tela de Matérias-Primas
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedMPLinked.linkedStockProducts.map((stock, idx) => (
                        <div 
                          key={idx} 
                          className="p-4 bg-white rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{stock.name}</p>
                              <p className="text-sm text-gray-500 mt-0.5">{stock.externalId}</p>
                            </div>
                            <div className="text-right ml-4">
                              <div className="flex items-center gap-2 justify-end">
                                <span className={`px-2 py-1 rounded-lg text-sm font-medium ${
                                  stock.quantity > 0 
                                    ? 'bg-teal-100 text-teal-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {formatNumber(stock.quantity)} {selectedMPLinked.unit}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                Empresa: {stock.companyId || 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Barra de estoque */}
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <span>Proporção do estoque total</span>
                              <span className="font-medium text-teal-600">
                                {selectedMPLinked.currentStock > 0 
                                  ? formatNumber((stock.quantity / selectedMPLinked.currentStock) * 100) 
                                  : '0'}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  stock.quantity > 0 ? 'bg-teal-500' : 'bg-red-400'
                                }`}
                                style={{ 
                                  width: `${selectedMPLinked.currentStock > 0 
                                    ? Math.min(100, (stock.quantity / selectedMPLinked.currentStock) * 100) 
                                    : 0}%` 
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Total de estoque */}
                      <div className={`p-4 rounded-xl border ${
                        selectedMPLinked.currentStock > 0 
                          ? 'bg-teal-50 border-teal-200' 
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${
                            selectedMPLinked.currentStock > 0 ? 'text-teal-800' : 'text-red-800'
                          }`}>
                            Estoque Total Disponível
                          </span>
                          <span className={`text-lg font-bold ${
                            selectedMPLinked.currentStock > 0 ? 'text-teal-700' : 'text-red-700'
                          }`}>
                            {formatNumber(selectedMPLinked.currentStock)} {selectedMPLinked.unit}
                          </span>
                        </div>
                        {selectedMPLinked.currentStock > 0 && selectedMPLinked.avgDailySales > 0 && (
                          <p className={`text-xs mt-1 ${
                            selectedMPLinked.currentStock > 0 ? 'text-teal-600' : 'text-red-600'
                          }`}>
                            Suficiente para ~{formatNumber(selectedMPLinked.currentStock / selectedMPLinked.avgDailySales)} dias de consumo
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Resumo da Análise */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <BarChart3 size={18} className="text-blue-600" />
                  Resumo da Análise
                </h3>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Consumo Médio/Dia</p>
                    <p className="text-xl font-bold text-gray-900">{formatNumber(selectedMPLinked.avgDailySales)}</p>
                    <p className="text-xs text-gray-400">{selectedMPLinked.unit}</p>
                  </div>
                  
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Projeção {projectionDays} dias</p>
                    <p className="text-xl font-bold text-blue-600">{formatNumber(selectedMPLinked.projectedConsumption)}</p>
                    <p className="text-xs text-gray-400">{selectedMPLinked.unit}</p>
                  </div>
                  
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Estoque Atual</p>
                    <p className={`text-xl font-bold ${selectedMPLinked.currentStock > 0 ? 'text-teal-600' : 'text-red-600'}`}>
                      {formatNumber(selectedMPLinked.currentStock)}
                    </p>
                    <p className="text-xs text-gray-400">{selectedMPLinked.unit}</p>
                  </div>
                  
                  <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Necessidade</p>
                    <p className={`text-xl font-bold ${selectedMPLinked.needsPurchase ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedMPLinked.needsPurchase ? formatNumber(selectedMPLinked.purchaseNeed) : 'OK'}
                    </p>
                    <p className="text-xs text-gray-400">{selectedMPLinked.needsPurchase ? selectedMPLinked.unit : ''}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowLinkedModal(false)}>
                Fechar
              </Button>
              <Button onClick={() => {
                setShowLinkedModal(false);
                openMPDetail(selectedMPLinked);
              }}>
                <Eye size={18} className="mr-2" />
                Ver Projeção Detalhada
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
