'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Users, Loader2, X, Search } from 'lucide-react';
import { Button } from '@/components/ui';
import { useGroupFilter } from '@/hooks/useGroupFilter';

interface Responsible {
  id: string;
  company_group_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_active: boolean;
  created_at: string;
}

export default function ResponsaveisPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Responsible | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', role: '' });
  const [saving, setSaving] = useState(false);

  const fetchResponsibles = async () => {
    if (!selectedGroupId) return;
    try {
      setLoading(true);
      const res = await fetch('/api/financial-responsibles?group_id=' + selectedGroupId + '&include_inactive=true');
      const data = await res.json();
      setResponsibles(data.responsibles || []);
    } catch (error) {
      console.error('Erro ao buscar responsáveis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) fetchResponsibles();
  }, [selectedGroupId]);

  const filtered = responsibles.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({ name: '', email: '', phone: '', role: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (item: Responsible) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      email: item.email || '',
      phone: item.phone || '',
      role: item.role || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    try {
      setSaving(true);

      if (editingItem) {
        const res = await fetch('/api/financial-responsibles/' + editingItem.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Erro ao atualizar');
          return;
        }
      } else {
        const res = await fetch('/api/financial-responsibles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_group_id: selectedGroupId, ...formData }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Erro ao criar');
          return;
        }
      }

      setIsModalOpen(false);
      fetchResponsibles();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar responsável');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Responsible) => {
    if (!confirm('Deseja excluir "' + item.name + '"?')) return;

    try {
      const res = await fetch('/api/financial-responsibles/' + item.id, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
        return;
      }
      fetchResponsibles();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const handleToggleActive = async (item: Responsible) => {
    try {
      await fetch('/api/financial-responsibles/' + item.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      fetchResponsibles();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  return (
    <>
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Responsáveis</h1>
            <p className="text-gray-500 mt-1">Gerencie os responsáveis pelas metas financeiras</p>
          </div>
          {selectedGroupId && (
            <Button onClick={handleCreate}>
              <Plus size={20} className="mr-2" />
              Novo Responsável
            </Button>
          )}
        </div>

        <div className="flex gap-4 items-end flex-wrap">
          <div className="w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
            {isGroupReadOnly ? (
              <input type="text" value={groupName} disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed" />
            ) : (
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um grupo</option>
                {groups.map((g: { id: string; name: string }) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
          </div>

          {selectedGroupId && (
            <div className="flex-1 max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email ou cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Loader2 size={48} className="mx-auto text-gray-300 mb-4 animate-spin" />
            <p className="text-gray-500">Carregando...</p>
          </div>
        ) : !selectedGroupId ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Selecione um grupo</h2>
            <p className="text-gray-500">Escolha um grupo para gerenciar os responsáveis</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Nenhum resultado' : 'Nenhum responsável'}
            </h2>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'Nenhum responsável encontrado para "' + searchTerm + '"' : 'Crie o primeiro responsável'}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreate}>
                <Plus size={20} className="mr-2" />
                Novo Responsável
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Telefone</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cargo</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => (
                  <tr key={item.id} className={'hover:bg-gray-50 ' + (!item.is_active ? 'opacity-50' : '')}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.email || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.role || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ' + (item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}
                      >
                        {item.is_active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(item)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100" title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-100" title="Excluir">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-2 bg-blue-50 border-t border-blue-100 text-sm text-blue-700">
              Total: <strong>{filtered.length}</strong> responsável(is)
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Editar Responsável' : 'Novo Responsável'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do responsável"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo / Função</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="Ex: Gerente Financeiro"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} isLoading={saving}>
                {editingItem ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
