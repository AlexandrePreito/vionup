'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, ShoppingCart, Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { SaleMode, CompanyGroup } from '@/types';

const ITEMS_PER_PAGE = 20;

export default function ModoVendaPage() {
  const [saleModes, setSaleModes] = useState<SaleMode[]>([]);
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSaleMode, setEditingSaleMode] = useState<SaleMode | null>(null);
  const [formData, setFormData] = useState({
    company_group_id: '',
    name: '',
    code: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);

  // Buscar modos de venda
  const fetchSaleModes = async () => {
    try {
      setLoading(true);
      const url = filterGroup
        ? `/api/sale-modes?group_id=${filterGroup}&include_inactive=true`
        : '/api/sale-modes?include_inactive=true';
      const res = await fetch(url);
      const data = await res.json();
      setSaleModes(data.saleModes || []);
    } catch (error) {
      console.error('Erro ao buscar modos de venda:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar grupos
  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    fetchSaleModes();
    setCurrentPage(1); // Reset para primeira página quando filtro muda
  }, [filterGroup]);

  // Filtrar modos de venda
  const filteredSaleModes = saleModes.filter(saleMode =>
    saleMode.name.toLowerCase().includes(search.toLowerCase()) ||
    (saleMode.code && saleMode.code.toLowerCase().includes(search.toLowerCase()))
  );

  // Paginação
  const totalPages = Math.ceil(filteredSaleModes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSaleModes = filteredSaleModes.slice(startIndex, endIndex);

  // Abrir modal para criar
  const handleCreate = () => {
    setEditingSaleMode(null);
    setFormData({
      company_group_id: filterGroup || '',
      name: '',
      code: '',
      description: ''
    });
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleEdit = (saleMode: SaleMode) => {
    setEditingSaleMode(saleMode);
    setFormData({
      company_group_id: saleMode.company_group_id,
      name: saleMode.name,
      code: saleMode.code || '',
      description: saleMode.description || ''
    });
    setIsModalOpen(true);
  };

  // Salvar (criar ou editar)
  const handleSave = async () => {
    if (!formData.company_group_id || !formData.name) {
      alert('Grupo e nome são obrigatórios');
      return;
    }

    try {
      setSaving(true);
      const url = editingSaleMode
        ? `/api/sale-modes/${editingSaleMode.id}`
        : '/api/sale-modes';

      const res = await fetch(url, {
        method: editingSaleMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          code: formData.code || null,
          description: formData.description || null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao salvar');
        return;
      }

      setIsModalOpen(false);
      fetchSaleModes();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar modo de venda');
    } finally {
      setSaving(false);
    }
  };

  // Excluir
  const handleDelete = async (saleMode: SaleMode) => {
    if (!confirm(`Deseja excluir o modo de venda "${saleMode.name}"?`)) return;

    try {
      const res = await fetch(`/api/sale-modes/${saleMode.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao excluir');
        return;
      }

      fetchSaleModes();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir modo de venda');
    }
  };

  return (
    <div className="pt-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modo de Venda</h1>
          <p className="text-gray-600 mt-1">Gerencie os modos de venda para controle de metas</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus size={20} className="mr-2" />
          Novo Modo de Venda
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="w-64">
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos os grupos</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <Loader2 size={48} className="mx-auto text-gray-300 mb-4 animate-spin" />
          <p className="text-gray-500">Carregando modos de venda...</p>
        </div>
      ) : filteredSaleModes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Nenhum modo de venda</h2>
          <p className="text-gray-500 mb-4">
            {search || filterGroup 
              ? `Nenhum modo de venda encontrado para "${search || groups.find(g => g.id === filterGroup)?.name}"`
              : 'Crie seu primeiro modo de venda no sistema'
            }
          </p>
          {!search && !filterGroup && (
            <Button onClick={handleCreate}>
              Criar Modo de Venda
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Código</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Descrição</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Grupo</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedSaleModes.map((saleMode) => (
                <tr key={saleMode.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {saleMode.code || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{saleMode.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {saleMode.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {saleMode.company_group?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {saleMode.is_active ? (
                      <CheckCircle size={20} className="inline text-green-500" />
                    ) : (
                      <XCircle size={20} className="inline text-gray-400" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(saleMode)}
                        className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(saleMode)}
                        className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredSaleModes.length)} de {filteredSaleModes.length} modos de venda
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="px-1 text-gray-400">...</span>;
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingSaleMode ? 'Editar Modo de Venda' : 'Novo Modo de Venda'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grupo <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.company_group_id}
                  onChange={(e) => setFormData({ ...formData, company_group_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um grupo</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ex: PDV"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Ponto de Venda"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição opcional"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} isLoading={saving}>
                {editingSaleMode ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
