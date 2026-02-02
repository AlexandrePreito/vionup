'use client';

import { useState, useEffect, Fragment } from 'react';
import { 
  Search, Loader2, Download, Package, TrendingUp, AlertTriangle, 
  CheckCircle, XCircle, Calendar, BarChart3, ChevronDown,
  Sun, Moon, Coffee, Tag, List, Plus, X, MoreVertical, Calculator,
  Eye, ShoppingCart, Warehouse, ArrowRight, Minus
} from 'lucide-react';
import { Button } from '@/components/ui';
import { CompanyGroup, Company } from '@/types';

interface ProductTag {
  id: string;
  company_group_id: string;
  name: string;
  color: string;
  created_at: string;
}

interface TagAssignment {
  id: string;
  external_product_id: string;
  tag_id: string;
  tag: ProductTag;
}

interface ProjectionItem {
  productId: string;
  externalId: string;
  name: string;
  category: string;
  productGroup: string;
  unit: string;
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

export default function ProjecaoRevendaPage() {
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [projectionDays, setProjectionDays] = useState(10);
  const [historyDays, setHistoryDays] = useState(7);
  const [projectionType, setProjectionType] = useState<'linear' | 'weekly'>('weekly');
  const [loading, setLoading] = useState(false);
  const [projection, setProjection] = useState<ProjectionItem[]>([]);
  const [summary, setSummary] = useState<ProjectionSummary | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'need' | 'ok'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [showOnlyWithSales, setShowOnlyWithSales] = useState(true);

  // Estados para seleção e tags
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [tagAssignments, setTagAssignments] = useState<TagAssignment[]>([]);
  const [filterTag, setFilterTag] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedTagToAssign, setSelectedTagToAssign] = useState('');

  // Modal de detalhes do produto
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState<ProjectionItem | null>(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Obter grupos de produtos únicos
  const productGroups = [...new Set(projection.map(p => p.productGroup).filter(Boolean))].sort();

  // Mapa de tags por produto
  const tagsByProduct = tagAssignments.reduce((acc, assignment) => {
    if (!acc[assignment.external_product_id]) {
      acc[assignment.external_product_id] = [];
    }
    acc[assignment.external_product_id].push(assignment.tag);
    return acc;
  }, {} as Record<string, ProductTag[]>);

  // Buscar grupos
  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      if (!res.ok) return;
      const data = await res.json();
      setGroups(data.groups || []);
      if (data.groups?.length > 0) {
        setSelectedGroup(data.groups[0].id);
      }
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
    }
  };

  // Buscar empresas do grupo
  const fetchCompanies = async () => {
    if (!selectedGroup) return;
    try {
      const res = await fetch(`/api/companies?group_id=${selectedGroup}`);
      if (!res.ok) {
        console.error('Erro na resposta:', res.status);
        return;
      }
      const data = await res.json();
      console.log('Empresas encontradas:', data.companies);
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  // Buscar tags
  const fetchTags = async () => {
    if (!selectedGroup) return;
    try {
      const res = await fetch(`/api/product-tags?group_id=${selectedGroup}`);
      if (!res.ok) return;
      const data = await res.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Erro ao buscar tags:', error);
    }
  };

  // Buscar atribuições de tags
  const fetchTagAssignments = async () => {
    if (!selectedGroup) return;
    try {
      const res = await fetch(`/api/product-tags/assignments?group_id=${selectedGroup}`);
      if (!res.ok) return;
      const data = await res.json();
      setTagAssignments(data.assignments || []);
    } catch (error) {
      console.error('Erro ao buscar atribuições de tags:', error);
    }
  };

  // Criar nova tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const res = await fetch('/api/product-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          company_group_id: selectedGroup,
          name: newTagName.trim()
        })
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Erro ao criar tag');
        return;
      }
      setNewTagName('');
      fetchTags();
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    }
  };

  // Atribuir tag aos produtos selecionados
  const handleAssignTag = async () => {
    if (!selectedTagToAssign || selectedProducts.size === 0) return;
    try {
      const res = await fetch('/api/product-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          company_group_id: selectedGroup,
          tag_id: selectedTagToAssign,
          product_ids: Array.from(selectedProducts)
        })
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Erro ao atribuir tag');
        return;
      }
      setShowTagModal(false);
      setSelectedTagToAssign('');
      setSelectedProducts(new Set());
      fetchTagAssignments();
      alert(`Tag adicionada a ${selectedProducts.size} produto(s)!`);
    } catch (error) {
      console.error('Erro ao atribuir tag:', error);
    }
  };

  // Toggle seleção de produto
  const toggleProductSelection = (externalId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(externalId)) {
      newSelected.delete(externalId);
    } else {
      newSelected.add(externalId);
    }
    setSelectedProducts(newSelected);
  };

  // Selecionar/deselecionar todos
  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProjection.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProjection.map(p => p.externalId)));
    }
  };

  // Gerar lista de compras
  const generatePurchaseList = () => {
    const selectedItems = filteredProjection.filter(p => selectedProducts.has(p.externalId));
    if (selectedItems.length === 0) {
      alert('Selecione pelo menos um produto');
      return;
    }

    const headers = ['Produto', 'Código', 'Unidade', 'Necessidade de Compra'];
    const rows = selectedItems.map(item => [
      item.name,
      item.externalId,
      item.unit,
      item.purchaseNeed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lista_compras_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Abrir modal de detalhes do produto
  const openProductDetail = (item: ProjectionItem) => {
    setSelectedProductDetail(item);
    setShowDetailModal(true);
  };

  // Calcular dia com maior venda
  const getMaxSalesDay = (averages: ProjectionItem['averagesByDay']) => {
    const days = [
      { name: 'Domingo', value: averages.domingo },
      { name: 'Segunda', value: averages.segunda },
      { name: 'Terça', value: averages.terca },
      { name: 'Quarta', value: averages.quarta },
      { name: 'Quinta', value: averages.quinta },
      { name: 'Sexta', value: averages.sexta },
      { name: 'Sábado', value: averages.sabado },
    ];
    return days.reduce((max, day) => day.value > max.value ? day : max, days[0]);
  };

  // Calcular máximo para escala do gráfico
  const getMaxValue = (averages: ProjectionItem['averagesByDay']) => {
    const values = Object.values(averages);
    return Math.max(...values, 1);
  };

  // Buscar projeção
  const fetchProjection = async () => {
    if (!selectedGroup) return;
    
    setLoading(true);
    try {
      let url = `/api/projection/resale?group_id=${selectedGroup}&projection_days=${projectionDays}&history_days=${historyDays}&projection_type=${projectionType}`;
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
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchCompanies();
      fetchProjection();
      fetchTags();
      fetchTagAssignments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

  // Filtrar produtos
  const filteredProjection = projection.filter(item => {
    // Filtro de busca
    const matchesSearch = search === '' || 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.externalId.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    // Filtro de grupo de produtos
    if (filterCategory && item.productGroup !== filterCategory) return false;

    // Filtro de status
    if (filterStatus === 'need' && !item.needsPurchase) return false;
    if (filterStatus === 'ok' && item.needsPurchase) return false;

    // Filtro de produtos com vendas
    if (showOnlyWithSales && item.totalHistorySales === 0) return false;

    // Filtro de tag
    if (filterTag) {
      const productTags = tagsByProduct[item.externalId] || [];
      if (!productTags.some(t => t.id === filterTag)) return false;
    }

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
  }, [search, filterCategory, filterStatus, filterTag, showOnlyWithSales, projection]);

  // Formatar número
  const formatNumber = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
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
      ? companies.find(c => c.id === selectedCompany)?.name || ''
      : 'Todas';
    
    const headers = [
      'Empresa',
      'Produto',
      'Código',
      'Média/Dia',
      'Projeção',
      'Estoque',
      'Est. Mín.',
      'Necessidade',
      'Conversão',
      'Qtd. Compra',
      'UN'
    ];

    const rows = filteredProjection.map(item => [
      companyName,
      item.name,
      item.externalId,
      formatNumber(item.avgDailySales),
      formatNumber(item.projectedConsumption),
      formatNumber(item.currentStock),
      formatNumber(item.minStock),
      formatNumber(item.purchaseNeed),
      formatNumber(item.conversionFactor),
      formatNumber(Math.ceil(item.purchaseQuantity)),
      item.purchaseUnit || item.unit
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `projecao-revenda-${new Date().toISOString().split('T')[0]}.csv`;
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

  // Obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'out': return <XCircle size={16} />;
      case 'low': return <AlertTriangle size={16} />;
      default: return <CheckCircle size={16} />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projeção de Compras - Revenda</h1>
          <p className="text-gray-500 text-sm mt-1">
            Projeção inteligente baseada no histórico de vendas por dia da semana
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
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          {/* Empresa */}
          <div className="w-52">
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={!selectedGroup}
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
              disabled={!selectedGroup || loading}
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
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro Grupo de Produtos */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[180px]"
          >
            <option value="">Todos os grupos</option>
            {productGroups.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>

          {/* Filtro Tag */}
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[150px]"
          >
            <option value="">Todas as tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
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
              {selectedProducts.size} produto(s) selecionado(s)
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
                  <button
                    onClick={() => {
                      setShowTagModal(true);
                      setShowActionsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Tag size={16} />
                    Adicionar Tag
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
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 w-[220px]">Produto</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700 w-[100px]">Média/Dia</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700 w-[100px]">Projeção</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700 w-[100px]">Estoque</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700 w-[100px]">Est. Mín.</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700 w-[100px]">Necessidade</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700 w-[80px]">Conversão</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700 w-[100px]">Qtd. Compra</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 w-[80px]">UN</th>
                  <th className="w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedProjection.map((item) => (
                  <Fragment key={item.productId}>
                    <tr
                      className={`hover:bg-gray-50 transition-colors ${item.needsPurchase ? 'bg-red-50/30' : ''} ${selectedProducts.has(item.externalId) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(item.externalId)}
                          onChange={() => toggleProductSelection(item.externalId)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer accent-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500">{item.externalId}</span>
                            {/* Tags do produto */}
                            {tagsByProduct[item.externalId]?.map(tag => (
                              <span 
                                key={tag.id} 
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700"
                              >
                                {tag.name}
                              </span>
                            ))}
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
                          <span className="font-bold text-red-600">{formatNumber(item.purchaseNeed)}</span>
                        ) : (
                          <span className="text-green-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-600">{formatNumber(item.conversionFactor)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.needsPurchase ? (
                          <span className="font-bold text-orange-600">{formatNumber(Math.ceil(item.purchaseQuantity))}</span>
                        ) : (
                          <span className="text-green-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-600 text-sm">{item.purchaseUnit}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openProductDetail(item)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>
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
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProjection.length)} de {filteredProjection.length} produtos
              <span className="text-red-600 ml-2">
                ({filteredProjection.filter(p => p.needsPurchase).length} precisam de compra)
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
          <p className="text-lg font-medium">Nenhum produto encontrado</p>
          <p className="text-sm">Tente ajustar os filtros</p>
        </div>
      )}

      {!loading && projection.length === 0 && selectedGroup && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <BarChart3 size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium">Nenhuma projeção calculada</p>
          <p className="text-sm">Clique em &quot;Calcular Projeção&quot; para começar</p>
        </div>
      )}

      {/* Modal Detalhes do Produto */}
      {showDetailModal && selectedProductDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedProductDetail.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Código: {selectedProductDetail.externalId}</span>
                    {selectedProductDetail.productGroup && (
                      <span>Grupo: {selectedProductDetail.productGroup}</span>
                    )}
                    {selectedProductDetail.needsPurchase ? (
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
                  <p className={`text-2xl font-bold ${selectedProductDetail.currentStock < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatNumber(selectedProductDetail.currentStock)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500">Projeção {projectionDays} dias</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(selectedProductDetail.projectedConsumption)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500">Necessidade</p>
                  <p className={`text-2xl font-bold ${selectedProductDetail.purchaseNeed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatNumber(selectedProductDetail.purchaseNeed > 0 ? selectedProductDetail.purchaseNeed : 0)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500">Qtd. Compra ({selectedProductDetail.purchaseUnit})</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatNumber(selectedProductDetail.purchaseQuantity > 0 ? Math.ceil(selectedProductDetail.purchaseQuantity) : 0)}
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
                    Média por Dia da Semana
                  </h3>
                  
                  {/* Gráfico de barras visual */}
                  <div className="space-y-2">
                    {[
                      { day: 'Domingo', value: selectedProductDetail.averagesByDay.domingo, icon: <Sun size={14} /> },
                      { day: 'Segunda', value: selectedProductDetail.averagesByDay.segunda, icon: <Coffee size={14} /> },
                      { day: 'Terça', value: selectedProductDetail.averagesByDay.terca },
                      { day: 'Quarta', value: selectedProductDetail.averagesByDay.quarta },
                      { day: 'Quinta', value: selectedProductDetail.averagesByDay.quinta },
                      { day: 'Sexta', value: selectedProductDetail.averagesByDay.sexta },
                      { day: 'Sábado', value: selectedProductDetail.averagesByDay.sabado, icon: <Moon size={14} /> },
                    ].map(({ day, value, icon }) => {
                      const maxValue = getMaxValue(selectedProductDetail.averagesByDay);
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
                          style={{ width: `${getMaxValue(selectedProductDetail.averagesByDay) > 0 ? (selectedProductDetail.averagesByDay.feriado / getMaxValue(selectedProductDetail.averagesByDay)) * 100 : 0}%` }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-700">
                          {formatNumber(selectedProductDetail.averagesByDay.feriado)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Insight */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700">
                      <TrendingUp size={14} className="inline mr-1 text-green-500" />
                      Maior venda: <strong>{getMaxSalesDay(selectedProductDetail.averagesByDay).name}</strong> com média de <strong>{formatNumber(getMaxSalesDay(selectedProductDetail.averagesByDay).value)}</strong> un.
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
                    const data = selectedProductDetail.dailyProjection;
                    const values = data.map(d => d.projected);
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
                    const yLabels = [0, 0.5, 1].map(ratio => ({
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
                            fill="url(#areaGradient)"
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
                            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
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
                        {formatNumber(selectedProductDetail.projectedConsumption)}
                      </span>
                    </div>
                  </div>
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
                    <p className={`font-bold ${selectedProductDetail.currentStock < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatNumber(selectedProductDetail.currentStock)}
                    </p>
                  </div>
                  
                  <span className="text-gray-400 text-lg">−</span>
                  
                  <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200 min-w-[90px]">
                    <TrendingUp size={20} className="mx-auto text-blue-500 mb-1" />
                    <p className="text-xs text-gray-500">Projeção</p>
                    <p className="font-bold text-gray-900">{formatNumber(selectedProductDetail.projectedConsumption)}</p>
                  </div>
                  
                  <span className="text-gray-400 text-lg">−</span>
                  
                  <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200 min-w-[90px]">
                    <AlertTriangle size={20} className="mx-auto text-orange-500 mb-1" />
                    <p className="text-xs text-gray-500">Est. Mín.</p>
                    <p className="font-bold text-gray-900">{formatNumber(selectedProductDetail.minStock)}</p>
                  </div>
                  
                  <span className="text-gray-400 text-lg">=</span>
                  
                  <div className={`text-center p-3 rounded-lg border-2 min-w-[100px] ${
                    selectedProductDetail.needsPurchase 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <ShoppingCart size={20} className={`mx-auto mb-1 ${
                      selectedProductDetail.needsPurchase ? 'text-red-500' : 'text-green-500'
                    }`} />
                    <p className="text-xs text-gray-500">Necessidade</p>
                    <p className={`font-bold ${
                      selectedProductDetail.needsPurchase ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {selectedProductDetail.needsPurchase ? formatNumber(selectedProductDetail.purchaseNeed) : 'OK'}
                    </p>
                  </div>
                </div>

                {/* Informações de conversão */}
                {selectedProductDetail.conversionFactor > 0 && selectedProductDetail.needsPurchase && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700">
                      <strong>Conversão:</strong> 1 {selectedProductDetail.purchaseUnit} = {formatNumber(selectedProductDetail.conversionFactor)} un. → 
                      <strong className="text-blue-600 ml-1">
                        {formatNumber(Math.ceil(selectedProductDetail.purchaseQuantity))} {selectedProductDetail.purchaseUnit}
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
              {selectedProductDetail.needsPurchase && (
                <Button onClick={() => {
                  setSelectedProducts(new Set([selectedProductDetail.externalId]));
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

      {/* Modal Adicionar Tag */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Adicionar Tag</h2>
              <button 
                onClick={() => setShowTagModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              {selectedProducts.size} produto(s) selecionado(s)
            </p>

            {/* Criar nova tag */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Criar nova tag</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Ex: Bebidas"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <Button onClick={handleCreateTag} disabled={!newTagName.trim()}>
                  <Plus size={18} />
                </Button>
              </div>
            </div>

            {/* Selecionar tag existente */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ou selecione uma tag existente</label>
              <select
                value={selectedTagToAssign}
                onChange={(e) => setSelectedTagToAssign(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </div>

            {/* Tags existentes */}
            {tags.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags disponíveis</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedTagToAssign(tag.id)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedTagToAssign === tag.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <Tag size={14} className="mr-1" />
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowTagModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAssignTag} 
                disabled={!selectedTagToAssign}
              >
                Adicionar Tag
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
