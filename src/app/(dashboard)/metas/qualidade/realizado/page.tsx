'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, Search, Loader2, 
  ChevronLeft, ChevronRight, ClipboardCheck, Building,
  Calendar, TrendingUp, Eye
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useGroupFilter } from '@/hooks/useGroupFilter';

interface QualityResult {
  id: string;
  company_group_id: string;
  company_id: string;
  company_name: string;
  year: number;
  month: number;
  evaluation_date: string;
  notes: string | null;
  total_achieved: number;
  total_possible: number;
  final_percentage: number;
}

interface QualityCategory {
  id: string;
  name: string;
  is_active: boolean;
}

interface ResultItem {
  category_id: string;
  category_name: string;
  achieved: number;
  total: number;
  percentage?: number;
}

interface Company {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 20;

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function QualityResultsPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [results, setResults] = useState<QualityResult[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<QualityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterCompany, setFilterCompany] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingItem, setEditingItem] = useState<QualityResult | null>(null);
  const [formData, setFormData] = useState({
    company_id: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    evaluation_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [formItems, setFormItems] = useState<ResultItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  // Buscar empresas
  const fetchCompanies = async (groupId: string) => {
    try {
      const res = await fetch(`/api/companies?group_id=${groupId}`);
      const data = await res.json();
      const companiesList = data.companies || [];
      // Filtro de segurança: garantir que apenas empresas do grupo selecionado sejam exibidas
      const filteredCompanies = companiesList.filter((c: any) => c.company_group_id === groupId);
      setCompanies(filteredCompanies);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  // Buscar categorias ativas
  const fetchCategories = async (groupId: string) => {
    try {
      const res = await fetch(`/api/quality-categories?group_id=${groupId}&active_only=true`);
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  // Buscar resultados
  const fetchResults = async () => {
    if (!selectedGroupId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        group_id: selectedGroupId,
        year: filterYear.toString()
      });
      if (filterMonth !== null) params.append('month', filterMonth.toString());
      if (filterCompany) params.append('company_id', filterCompany);

      const res = await fetch(`/api/quality-results?${params}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Erro ao buscar resultados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar itens de um resultado específico
  const fetchResultItems = async (resultId: string) => {
    try {
      setLoadingItems(true);
      const res = await fetch(`/api/quality-results/${resultId}`);
      const data = await res.json();
      
      if (data.items) {
        setFormItems(data.items.map((item: any) => ({
          category_id: item.category_id,
          category_name: item.category?.name || 'N/A',
          achieved: item.achieved,
          total: item.total,
          percentage: item.percentage
        })));
      }
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      fetchCompanies(selectedGroupId);
      fetchCategories(selectedGroupId);
      fetchResults();
    }
  }, [selectedGroupId, filterYear, filterMonth, filterCompany]);

  // Filtrar resultados
  const filteredItems = results.filter((item) => {
    if (!search) return true;
    return item.company_name?.toLowerCase().includes(search.toLowerCase());
  });

  // Paginação
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedGroupId, filterYear, filterMonth, filterCompany]);

  useEffect(() => {
    setSelectedIds([]);
  }, [selectedGroupId, filterYear, filterMonth, filterCompany, search]);

  // Inicializar itens do formulário com categorias ativas
  const initializeFormItems = () => {
    const items = categories.map(cat => ({
      category_id: cat.id,
      category_name: cat.name,
      achieved: 0,
      total: 10
    }));
    setFormItems(items);
  };

  // Abrir modal de novo registro
  const handleNew = () => {
    if (categories.length === 0) {
      alert('Cadastre categorias de qualidade antes de registrar resultados.');
      return;
    }
    
    setEditingItem(null);
    setIsViewMode(false);
    setFormData({
      company_id: '',
      year: filterYear,
      month: filterMonth ?? new Date().getMonth() + 1,
      evaluation_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    initializeFormItems();
    setIsModalOpen(true);
  };

  // Abrir modal de visualização
  const handleView = async (item: QualityResult) => {
    setEditingItem(item);
    setIsViewMode(true);
    setFormData({
      company_id: item.company_id,
      year: item.year,
      month: item.month,
      evaluation_date: item.evaluation_date,
      notes: item.notes || ''
    });
    setIsModalOpen(true);
    await fetchResultItems(item.id);
  };

  // Abrir modal de edição
  const handleEdit = async (item: QualityResult) => {
    setEditingItem(item);
    setIsViewMode(false);
    setFormData({
      company_id: item.company_id,
      year: item.year,
      month: item.month,
      evaluation_date: item.evaluation_date,
      notes: item.notes || ''
    });
    setIsModalOpen(true);
    await fetchResultItems(item.id);
  };

  // Atualizar item do formulário
  const updateFormItem = (categoryId: string, field: 'achieved' | 'total', value: number) => {
    setFormItems(prev => prev.map(item => {
      if (item.category_id === categoryId) {
        const updated = { ...item, [field]: value };
        // Calcular percentual
        if (updated.total > 0) {
          updated.percentage = Math.round((updated.achieved / updated.total) * 100 * 100) / 100;
        } else {
          updated.percentage = 0;
        }
        return updated;
      }
      return item;
    }));
  };

  // Calcular totais do formulário
  const calculateTotals = () => {
    const totalAchieved = formItems.reduce((sum, item) => sum + item.achieved, 0);
    const totalPossible = formItems.reduce((sum, item) => sum + item.total, 0);
    const percentage = totalPossible > 0 ? Math.round((totalAchieved / totalPossible) * 100 * 100) / 100 : 0;
    return { totalAchieved, totalPossible, percentage };
  };

  // Salvar resultado
  const handleSave = async () => {
    if (!formData.company_id) {
      alert('Selecione uma empresa');
      return;
    }

    if (!formData.evaluation_date) {
      alert('Informe a data da avaliação');
      return;
    }

    // Validar itens
    const invalidItems = formItems.filter(item => item.achieved < 0 || item.total < 1 || item.achieved > item.total);
    if (invalidItems.length > 0) {
      alert('Verifique os valores: Atingido deve ser >= 0, Total deve ser >= 1, e Atingido não pode ser maior que Total');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_group_id: selectedGroupId,
        company_id: formData.company_id,
        year: formData.year,
        month: formData.month,
        evaluation_date: formData.evaluation_date,
        notes: formData.notes || null,
        items: formItems.map(item => ({
          category_id: item.category_id,
          achieved: item.achieved,
          total: item.total
        }))
      };

      const url = editingItem ? `/api/quality-results/${editingItem.id}` : '/api/quality-results';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao salvar');
      }

      setIsModalOpen(false);
      fetchResults();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Excluir resultado
  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este registro?')) return;

    try {
      const res = await fetch(`/api/quality-results/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      fetchResults();
    } catch (error) {
      alert('Erro ao excluir registro');
    }
  };

  // Excluir múltiplos
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Deseja excluir ${selectedIds.length} registro(s) selecionado(s)?`)) return;

    setDeleting(true);
    try {
      for (const id of selectedIds) {
        await fetch(`/api/quality-results/${id}`, { method: 'DELETE' });
      }
      setSelectedIds([]);
      fetchResults();
    } catch (error) {
      alert('Erro ao excluir registros');
    } finally {
      setDeleting(false);
    }
  };

  // Cor do badge baseada no percentual
  const getPercentageColor = (value: number) => {
    if (value >= 90) return 'bg-green-100 text-green-700';
    if (value >= 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  // Formatar data
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const totals = calculateTotals();

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Realizado de Qualidade</h1>
            <p className="text-gray-500 text-sm mt-1">
              Registre os resultados das avaliações de qualidade por categoria
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <Button
                variant="secondary"
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 size={18} className="mr-2" />
                Excluir ({selectedIds.length})
              </Button>
            )}
            <Button onClick={handleNew} disabled={!selectedGroupId}>
              <Plus size={18} className="mr-2" />
              Nova Avaliação
            </Button>
          </div>
        </div>

        {/* Filtros */}
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
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>

          {/* Mês */}
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
            <select
              value={filterMonth ?? ''}
              onChange={(e) => setFilterMonth(e.target.value === '' ? null : Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {MONTHS.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>

          {/* Ano */}
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Busca */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        )}

        {/* Tabela */}
        {!loading && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={paginatedItems.length > 0 && paginatedItems.every((item) => selectedIds.includes(item.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const pageIds = paginatedItems.map((item) => item.id);
                            setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
                          } else {
                            const pageIds = paginatedItems.map((item) => item.id);
                            setSelectedIds(prev => prev.filter((id) => !pageIds.includes(id)));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Empresa</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Período</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Data Avaliação</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Resultado</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Percentual</th>
                    <th className="w-32 text-center px-4 py-3 text-sm font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        <ClipboardCheck size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="font-medium">Nenhuma avaliação encontrada</p>
                        <p className="text-sm">Clique em "Nova Avaliação" para começar</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(prev => [...prev, item.id]);
                                } else {
                                  setSelectedIds(prev => prev.filter((id) => id !== item.id));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Building size={18} className="text-blue-600" />
                              </div>
                              <span className="font-medium text-gray-900">{item.company_name || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-600">{MONTHS[item.month - 1]}/{item.year}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-600">
                              <Calendar size={14} />
                              {formatDate(item.evaluation_date)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium text-gray-900">
                              {item.total_achieved} de {item.total_possible}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${getPercentageColor(item.final_percentage)}`}>
                              <TrendingUp size={14} />
                              {item.final_percentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleView(item)}
                                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Visualizar"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredItems.length)} de {filteredItems.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm text-gray-700">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Nova/Editar/Visualizar Avaliação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {isViewMode ? 'Detalhes da Avaliação' : editingItem ? 'Editar Avaliação' : 'Nova Avaliação de Qualidade'}
              </h2>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Empresa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
                {isViewMode || editingItem ? (
                  <input
                    type="text"
                    value={companies.find(c => c.id === formData.company_id)?.name || editingItem?.company_name || ''}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                  />
                ) : (
                  <select
                    value={formData.company_id}
                    onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Período e Data */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano *</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    disabled={isViewMode || !!editingItem}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mês *</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                    disabled={isViewMode || !!editingItem}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    {MONTHS.map((month, index) => (
                      <option key={index} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Avaliação *</label>
                  <input
                    type="date"
                    value={formData.evaluation_date}
                    onChange={(e) => setFormData({ ...formData, evaluation_date: e.target.value })}
                    disabled={isViewMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Categorias */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avaliação por Categoria
                </label>
                
                {loadingItems ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">Categoria</th>
                          <th className="text-center px-4 py-2 text-sm font-medium text-gray-700 w-28">Atingido</th>
                          <th className="text-center px-4 py-2 text-sm font-medium text-gray-700 w-28">Total</th>
                          <th className="text-center px-4 py-2 text-sm font-medium text-gray-700 w-28">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {formItems.map((item) => {
                          const pct = item.total > 0 ? (item.achieved / item.total) * 100 : 0;
                          return (
                            <tr key={item.category_id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-900">{item.category_name}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.total}
                                  value={item.achieved}
                                  onChange={(e) => updateFormItem(item.category_id, 'achieved', parseInt(e.target.value) || 0)}
                                  disabled={isViewMode}
                                  className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.total}
                                  onChange={(e) => updateFormItem(item.category_id, 'total', parseInt(e.target.value) || 1)}
                                  disabled={isViewMode}
                                  className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getPercentageColor(pct)}`}>
                                  {pct.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                        <tr>
                          <td className="px-4 py-3 font-semibold text-gray-900">TOTAL</td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-900">{totals.totalAchieved}</td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-900">{totals.totalPossible}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getPercentageColor(totals.percentage)}`}>
                              {totals.percentage.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={isViewMode}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Observações sobre a avaliação..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                {isViewMode ? 'Fechar' : 'Cancelar'}
              </Button>
              {!isViewMode && (
                <Button onClick={handleSave} isLoading={saving}>
                  {editingItem ? 'Salvar' : 'Registrar Avaliação'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
