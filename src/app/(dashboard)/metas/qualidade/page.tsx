'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, Search, Loader2, 
  ChevronLeft, ChevronRight, Target, Building,
  Percent, Copy
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useGroupFilter } from '@/hooks/useGroupFilter';

interface QualityGoal {
  id: string;
  company_group_id: string;
  company_id: string;
  year: number;
  month: number;
  target_percentage: number;
  is_active: boolean;
  company?: { id: string; name: string };
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

export default function QualityGoalsPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [goals, setGoals] = useState<QualityGoal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
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
  const [editingItem, setEditingItem] = useState<QualityGoal | null>(null);
  const [formData, setFormData] = useState({
    company_id: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    target_percentage: 90
  });
  const [saving, setSaving] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  // Buscar empresas
  const fetchCompanies = async (groupId: string) => {
    try {
      const res = await fetch(`/api/companies?group_id=${groupId}`);
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  // Buscar metas
  const fetchGoals = async () => {
    if (!selectedGroupId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        group_id: selectedGroupId,
        year: filterYear.toString()
      });
      if (filterMonth !== null) params.append('month', filterMonth.toString());
      if (filterCompany) params.append('company_id', filterCompany);

      const res = await fetch(`/api/quality-goals?${params}`);
      const data = await res.json();
      setGoals(data.goals || []);
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      fetchCompanies(selectedGroupId);
      fetchGoals();
    }
  }, [selectedGroupId, filterYear, filterMonth, filterCompany]);

  // Filtrar metas
  const filteredItems = goals.filter((item) => {
    if (!search) return true;
    return item.company?.name?.toLowerCase().includes(search.toLowerCase());
  });

  // Paginação
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedGroupId, filterYear, filterMonth, filterCompany]);

  // Limpar seleção ao mudar filtros
  useEffect(() => {
    setSelectedIds([]);
  }, [selectedGroupId, filterYear, filterMonth, filterCompany, search]);

  // Abrir modal de nova meta
  const handleNew = () => {
    setEditingItem(null);
    setFormData({
      company_id: '',
      year: filterYear,
      month: filterMonth ?? new Date().getMonth() + 1,
      target_percentage: 90
    });
    setSelectedCompanies([]);
    setIsModalOpen(true);
  };

  // Abrir modal de edição
  const handleEdit = (item: QualityGoal) => {
    setEditingItem(item);
    setFormData({
      company_id: item.company_id,
      year: item.year,
      month: item.month,
      target_percentage: item.target_percentage
    });
    setSelectedCompanies([]);
    setIsModalOpen(true);
  };

  // Clonar meta
  const handleClone = async (item: QualityGoal) => {
    try {
      const res = await fetch('/api/quality-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_group_id: item.company_group_id,
          company_id: item.company_id,
          year: item.year,
          month: item.month,
          target_percentage: item.target_percentage
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao clonar');
      }

      fetchGoals();
    } catch (error: any) {
      alert(error.message || 'Erro ao clonar meta');
    }
  };

  // Salvar meta
  const handleSave = async () => {
    // Validações
    if (!editingItem && selectedCompanies.length === 0) {
      alert('Selecione pelo menos uma empresa');
      return;
    }

    if (editingItem && !formData.company_id) {
      alert('Selecione uma empresa');
      return;
    }

    if (formData.target_percentage < 0 || formData.target_percentage > 100) {
      alert('O percentual deve estar entre 0 e 100');
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        // Edição
        const res = await fetch(`/api/quality-goals/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_percentage: formData.target_percentage })
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Erro ao salvar');
        }
      } else {
        // Criação múltipla
        let successCount = 0;
        let errorCount = 0;

        for (const companyId of selectedCompanies) {
          const res = await fetch('/api/quality-goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              company_group_id: selectedGroupId,
              company_id: companyId,
              year: formData.year,
              month: formData.month,
              target_percentage: formData.target_percentage
            })
          });

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        }

        if (errorCount > 0) {
          alert(`${successCount} meta(s) criada(s). ${errorCount} erro(s) (possível duplicidade).`);
        }
      }

      setIsModalOpen(false);
      fetchGoals();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Excluir meta
  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta meta?')) return;

    try {
      const res = await fetch(`/api/quality-goals/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      fetchGoals();
    } catch (error) {
      alert('Erro ao excluir meta');
    }
  };

  // Excluir múltiplas
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Deseja excluir ${selectedIds.length} meta(s) selecionada(s)?`)) return;

    setDeleting(true);
    try {
      let successCount = 0;
      for (const id of selectedIds) {
        const res = await fetch(`/api/quality-goals/${id}`, { method: 'DELETE' });
        if (res.ok) successCount++;
      }
      setSelectedIds([]);
      fetchGoals();
    } catch (error) {
      alert('Erro ao excluir metas');
    } finally {
      setDeleting(false);
    }
  };

  // Formatar percentual
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Cor do badge baseada no percentual
  const getPercentageColor = (value: number) => {
    if (value >= 90) return 'bg-green-100 text-green-700';
    if (value >= 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Metas de Qualidade</h1>
            <p className="text-gray-500 text-sm mt-1">
              Defina o percentual alvo de qualidade por empresa e período
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
              Nova Meta
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
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Meta</th>
                    <th className="w-32 text-center px-4 py-3 text-sm font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                        <Target size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="font-medium">Nenhuma meta encontrada</p>
                        <p className="text-sm">Clique em "Nova Meta" para começar</p>
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
                              <span className="font-medium text-gray-900">{item.company?.name || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-600">{MONTHS[item.month - 1]}/{item.year}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${getPercentageColor(item.target_percentage)}`}>
                              <Percent size={14} />
                              {formatPercentage(item.target_percentage)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleClone(item)}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Clonar"
                              >
                                <Copy size={16} />
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

      {/* Modal Nova/Editar Meta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Editar Meta de Qualidade' : 'Nova Meta de Qualidade'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Empresas - múltipla seleção para criação */}
              {!editingItem ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresas *
                  </label>
                  <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                    {companies.map((company) => (
                      <label
                        key={company.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCompanies.includes(company.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCompanies([...selectedCompanies, company.id]);
                            } else {
                              setSelectedCompanies(selectedCompanies.filter(id => id !== company.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-gray-700">{company.name}</span>
                      </label>
                    ))}
                  </div>
                  {selectedCompanies.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">{selectedCompanies.length} empresa(s) selecionada(s)</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                  <input
                    type="text"
                    value={editingItem.company?.name || ''}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                  />
                </div>
              )}

              {/* Período */}
              {!editingItem && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ano *</label>
                    <select
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {MONTHS.map((month, index) => (
                        <option key={index} value={index + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {editingItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                  <input
                    type="text"
                    value={`${MONTHS[editingItem.month - 1]}/${editingItem.year}`}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                  />
                </div>
              )}

              {/* Meta Percentual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta de Qualidade (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.target_percentage}
                    onChange={(e) => setFormData({ ...formData, target_percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 90"
                  />
                  <Percent size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Valor entre 0 e 100</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} isLoading={saving}>
                {editingItem ? 'Salvar' : 'Criar Meta'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
