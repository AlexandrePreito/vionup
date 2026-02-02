'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Search, AlertCircle } from 'lucide-react';
import { Button, Input, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { CompanyGroup } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function GruposPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CompanyGroup | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '' });
  const [saving, setSaving] = useState(false);

  // Buscar grupos
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/groups?include_inactive=true');
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Verificar se o usuário é master
    if (user && user.role !== 'master') {
      // Redirecionar para a página inicial se não for master
      router.push('/');
      return;
    }
    fetchGroups();
  }, [user, router]);

  // Se não for master, mostrar mensagem de acesso negado
  if (user && user.role !== 'master') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 max-w-md">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-500 mb-4">
            Você não tem permissão para acessar esta página. Apenas usuários Master podem gerenciar grupos.
          </p>
          <Button onClick={() => router.push('/')}>
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  // Filtrar grupos
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(search.toLowerCase()) ||
    group.slug.toLowerCase().includes(search.toLowerCase())
  );

  // Abrir modal para criar
  const handleCreate = () => {
    setEditingGroup(null);
    setFormData({ name: '', slug: '', description: '' });
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleEdit = (group: CompanyGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      slug: group.slug,
      description: group.description || ''
    });
    setIsModalOpen(true);
  };

  // Gerar slug automaticamente
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Salvar (criar ou editar)
  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      alert('Nome e slug são obrigatórios');
      return;
    }

    try {
      setSaving(true);
      const url = editingGroup 
        ? `/api/groups/${editingGroup.id}` 
        : '/api/groups';
      
      const res = await fetch(url, {
        method: editingGroup ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao salvar');
        return;
      }

      setIsModalOpen(false);
      fetchGroups();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar grupo');
    } finally {
      setSaving(false);
    }
  };

  // Excluir
  const handleDelete = async (group: CompanyGroup) => {
    if (!confirm(`Deseja excluir o grupo "${group.name}"?`)) return;

    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao excluir');
        return;
      }

      fetchGroups();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir grupo');
    }
  };

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grupos de Empresa</h1>
          <p className="text-gray-600 mt-1">Gerencie os grupos de empresa do sistema</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus size={20} className="mr-2" />
          Novo Grupo
        </Button>
      </div>

      {/* Busca */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar grupos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Nenhum grupo encontrado</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroups.map((group) => (
              <TableRow key={group.id}>
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell className="text-gray-500">{group.description || '-'}</TableCell>
                <TableCell>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    group.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {group.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(group)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(group)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            value={formData.name}
            onChange={(e) => {
              const name = e.target.value;
              setFormData({
                ...formData,
                name,
                slug: editingGroup ? formData.slug : generateSlug(name)
              });
            }}
            placeholder="Ex: Grupo ABC"
          />
          <Input
            label="Slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="Ex: grupo-abc"
          />
          <Input
            label="Descrição"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrição opcional"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} isLoading={saving}>
              {editingGroup ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
