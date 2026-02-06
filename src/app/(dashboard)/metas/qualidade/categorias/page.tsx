'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, Search, Loader2, 
  ChevronLeft, ChevronRight, Tag, GripVertical,
  Check, X
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useGroupFilter } from '@/hooks/useGroupFilter';

interface QualityCategory {
  id: string;
  company_group_id: string;
  name: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const ITEMS_PER_PAGE = 20;

export default function QualityCategoriasPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [categories, setCategories] = useState<QualityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QualityCategory | null>(null);
  const [formData, setFormData] = useState({ name: '', display_order: 0 });
  const [saving, setSaving] = useState(false);

  // Buscar categorias
  const fetchCategories = async () => {
    if (!selectedGroupId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        group_id: selectedGroupId,
        active_only: (statusFilter === 'active').toString()
      });

      const res = await fetch(`/api/quality-categories?${params}`);
      const data = await res.json();
      
      // Filtrar por status se necessário
      let filtered = data.categories || [];
      if (statusFilter === 'inactive') {
        filtered = filtered.filter((cat: QualityCategory) => !cat.is_active);
      } else if (statusFilter === 'active') {
        filtered = filtered.filter((cat: QualityCategory) => cat.is_active);
      }
      // Se statusFilter === 'all', não filtra (mostra todos)
      
      setCategories(filtered);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      fetchCategories();
    }
  }, [selectedGroupId, statusFilter]);

  // Filtrar categorias
  const filteredItems = categories.filter((item) => {
    if (!search) return true;
    return item.name.toLowerCase().includes(search.toLowerCase());
  });

  // Paginação
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedGroupId, statusFilter]);

  // Abrir modal de nova categoria
  const handleNew = () => {
    setEditingItem(null);
    setFormData({ name: '', display_order: categories.length });
    setIsModalOpen(true);
  };

  // Abrir modal de edição
  const handleEdit = (item: QualityCategory) => {
    setEditingItem(item);
    setFormData({ name: item.name, display_order: item.display_order });
    setIsModalOpen(true);
  };

  // Salvar categoria
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const url = editingItem 
        ? `/api/quality-categories/${editingItem.id}` 
        : '/api/quality-categories';
      
      const payload = editingItem 
        ? { name: formData.name, display_order: formData.display_order }
        : { company_group_id: selectedGroupId, name: formData.name, display_order: formData.display_order };
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao salvar');
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Alternar ativo/inativo
  const handleToggleActive = async (item: QualityCategory) => {
    try {
      const res = await fetch(`/api/quality-categories/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !item.is_active })
      });

      if (!res.ok) throw new Error('Erro ao atualizar');
      fetchCategories();
    } catch (error) {
      alert('Erro ao atualizar categoria');
    }
  };

  // Excluir categoria
  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta categoria? Isso pode afetar registros existentes.')) return;

    try {
      const res = await fetch(`/api/quality-categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      fetchCategories();
    } catch (error) {
      alert('Erro ao excluir categoria. Verifique se não há registros vinculados.');
    }
  };

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categorias de Qualidade</h1>
            <p className="text-gray-500 text-sm mt-1">
              Gerencie as categorias para avaliação de qualidade (Ex: Limpeza, Salão, Bar)
            </p>
          </div>
          <Button onClick={handleNew} disabled={!selectedGroupId}>
            <Plus size={18} className="mr-2" />
            Nova Categoria
          </Button>
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

          {/* Filtro de Status */}
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | 'all')}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="all">Todos</option>
            </select>
          </div>

          {/* Busca */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome..."
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
                    <th className="w-12 px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Nome</th>
                    <th className="w-24 text-center px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                    <th className="w-32 text-center px-4 py-3 text-sm font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                        <Tag size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="font-medium">Nenhuma categoria encontrada</p>
                        <p className="text-sm">Clique em "Nova Categoria" para começar</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, index) => (
                      <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${!item.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3 text-gray-400">
                          {startIndex + index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                              <Tag size={18} className="text-purple-600" />
                            </div>
                            <span className="font-medium text-gray-900">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleActive(item)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                              item.is_active 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {item.is_active ? (
                              <>
                                <Check size={12} />
                                Ativo
                              </>
                            ) : (
                              <>
                                <X size={12} />
                                Inativo
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
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
                    ))
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

      {/* Modal Nova/Editar Categoria */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Limpeza, Salão, Bar..."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordem de Exibição
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Categorias são ordenadas do menor para o maior</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} isLoading={saving}>
                {editingItem ? 'Salvar' : 'Criar Categoria'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
