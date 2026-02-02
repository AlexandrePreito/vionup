'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Search, Shield, Key } from 'lucide-react';
import { Button, Input, Select, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { User, Company, CompanyGroup } from '@/types';
import { toast } from '@/lib/toast';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupFilter } from '@/hooks/useGroupFilter';

const roleLabels: Record<string, string> = {
  master: 'Master',
  group_admin: 'Admin Grupo',
  company_admin: 'Admin Empresa',
  user: 'Usuário'
};

const roleOptions = [
  { value: 'master', label: 'Master' },
  { value: 'group_admin', label: 'Admin Grupo' },
  { value: 'company_admin', label: 'Admin Empresa' },
  { value: 'user', label: 'Usuário' },
];

export default function UsuariosPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    company_group_id: '',
    name: '',
    email: '',
    password: '123456',
    role: 'user'
  });
  const [saving, setSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Buscar usuários
  const fetchUsers = async () => {
    try {
      setLoading(true);
      // A API já filtra por grupo baseado no usuário logado
      const url = '/api/users?include_inactive=true';
      console.log('fetchUsers - Buscando usuários:', url);
      console.log('fetchUsers - Usuário atual do AuthContext:', currentUser ? { id: currentUser.id, role: currentUser.role } : 'null');
      console.log('fetchUsers - localStorage meta10_user:', localStorage.getItem('meta10_user') ? 'presente' : 'ausente');
      
      const res = await fetch(url);
      console.log('fetchUsers - Status da resposta:', res.status);
      const data = await res.json();
      console.log('fetchUsers - Usuários retornados:', data.users?.length || 0, data);
      if (data.error) {
        console.error('fetchUsers - Erro da API:', data.error);
      }
      setUsers(data.users || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Buscar empresas do grupo
  const fetchCompanies = async (groupId: string) => {
    if (!groupId) {
      setCompanies([]);
      return;
    }
    try {
      const res = await fetch(`/api/companies?group_id=${groupId}`);
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedGroupId]);

  // Garantir que o grupo está definido quando for readonly
  useEffect(() => {
    if (isGroupReadOnly && selectedGroupId && formData.company_group_id !== selectedGroupId) {
      setFormData(prev => ({ ...prev, company_group_id: selectedGroupId }));
    }
  }, [isGroupReadOnly, selectedGroupId, formData.company_group_id]);

  useEffect(() => {
    if (formData.company_group_id) {
      fetchCompanies(formData.company_group_id);
    } else {
      setCompanies([]);
    }
  }, [formData.company_group_id]);

  // Filtrar usuários
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  // Abrir modal para criar
  const handleCreate = () => {
    setEditingUser(null);
    setSelectedCompanies([]);
    // Se não for master, usar o grupo do usuário logado
    const defaultGroupId = currentUser && currentUser.role !== 'master' 
      ? (currentUser.company_group_id || '')
      : (selectedGroupId || '');
    
    setFormData({
      company_group_id: defaultGroupId,
      name: '',
      email: '',
      password: '123456',
      role: 'user'
    });
    
    // Se não for master, buscar empresas do grupo automaticamente
    if (defaultGroupId && currentUser && currentUser.role !== 'master') {
      fetchCompanies(defaultGroupId);
    }
    
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleEdit = async (user: User) => {
    setEditingUser(user);
    setFormData({
      company_group_id: user.company_group_id || '',
      name: user.name,
      email: user.email,
      password: '',
      role: user.role
    });
    
    // Buscar empresas vinculadas se for user
    if (user.role === 'user') {
      try {
        const res = await fetch(`/api/users/${user.id}/companies`);
        const data = await res.json();
        setSelectedCompanies(data.company_ids || []);
      } catch (error) {
        setSelectedCompanies([]);
      }
    } else {
      setSelectedCompanies([]);
    }
    
    // Buscar empresas do grupo
    if (user.company_group_id) {
      fetchCompanies(user.company_group_id);
    }
    
    setIsModalOpen(true);
  };

  // Salvar (criar ou editar)
  const handleSave = async () => {
    if (!formData.name || !formData.email || !formData.role) {
      toast.warning('Nome, email e perfil são obrigatórios');
      return;
    }

    if (!editingUser && (!formData.password || formData.password.trim() === '')) {
      toast.warning('Senha é obrigatória para novos usuários');
      return;
    }

    // Validações de hierarquia
    if (formData.role !== 'master' && !formData.company_group_id) {
      toast.warning('Grupo é obrigatório para usuários não-master');
      return;
    }

    if (formData.role === 'user' && selectedCompanies.length === 0) {
      toast.warning('Usuário precisa ter pelo menos uma empresa vinculada');
      return;
    }

    try {
      setSaving(true);
      const url = editingUser
        ? `/api/users/${editingUser.id}`
        : '/api/users';

      const body: Record<string, any> = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        company_group_id: formData.role !== 'master' ? formData.company_group_id : null,
        company_ids: formData.role === 'user' ? selectedCompanies : []
      };
      
      console.log('Enviando para API:', body);

      if (formData.password) {
        body.password = formData.password;
      }

      const res = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erro ao salvar');
        return;
      }

      toast.success(editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  };

  // Verificar se pode mudar senha do usuário
  const canChangePassword = (targetUser: User) => {
    if (!currentUser) return false;
    // Master e Admin podem mudar senha de qualquer usuário
    if (currentUser.role === 'master' || currentUser.role === 'group_admin') {
      return true;
    }
    // Usuário comum só pode mudar a própria senha
    if (currentUser.role === 'user' && currentUser.id === targetUser.id) {
      return true;
    }
    return false;
  };

  // Abrir modal de mudança de senha
  const handleChangePassword = (user: User) => {
    if (!canChangePassword(user)) {
      toast.warning('Você não tem permissão para alterar a senha deste usuário');
      return;
    }
    setPasswordUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordModalOpen(true);
  };

  // Salvar nova senha
  const handleSavePassword = async () => {
    if (!passwordUser) return;

    if (!newPassword || newPassword.length < 6) {
      toast.warning('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.warning('As senhas não coincidem');
      return;
    }

    try {
      setChangingPassword(true);
      
      const res = await fetch(`/api/users/${passwordUser.id}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao alterar senha');
        return;
      }

      toast.success('Senha alterada com sucesso!');
      setIsPasswordModalOpen(false);
      setPasswordUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast.error('Erro ao alterar senha');
    } finally {
      setChangingPassword(false);
    }
  };

  // Excluir
  const handleDelete = async (user: User) => {
    if (!confirm(`Deseja excluir o usuário "${user.name}"?`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erro ao excluir');
        return;
      }

      toast.success('Usuário excluído com sucesso!');
      fetchUsers();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  const groupOptions = groups.map((g: any) => ({ value: g.id, label: g.name }));

  const needsGroup = formData.role !== 'master';
  const needsCompanies = formData.role === 'user'; // user precisa vincular empresas

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-600 mt-1">Gerencie os usuários do sistema</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus size={20} className="mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        {/* Grupo */}
        <div className="w-64">
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
              <option value="">Todos os grupos</option>
              {groups.map((group: any) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          )}
        </div>
        {/* Buscar */}
        <div className="flex-1 max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Nenhum usuário encontrado</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-gray-500">{user.email}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                    user.role === 'master' 
                      ? 'bg-purple-100 text-purple-700' :
                    user.role === 'group_admin' 
                      ? 'bg-blue-100 text-blue-700' :
                    user.role === 'company_admin'
                      ? 'bg-indigo-100 text-indigo-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {roleLabels[user.role] || 'Usuário'}
                  </span>
                </TableCell>
                <TableCell className="text-gray-500">
                  {user.company_group?.name || '-'}
                </TableCell>
                <TableCell className="text-gray-500">
                  {user.role === 'user' 
                    ? `${user.companies_count || 0} empresa(s)` 
                    : '-'}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    user.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => router.push(`/usuarios/${user.id}/permissoes`)}
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Permissões"
                    >
                      <Shield size={18} />
                    </button>
                    {canChangePassword(user) && (
                      <button
                        onClick={() => handleChangePassword(user)}
                        className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Alterar Senha"
                      >
                        <Key size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
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
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCompanies([]);
        }}
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nome"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome completo"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={editingUser ? "Nova Senha (deixe vazio para manter)" : "Senha"}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
            />
            <Select
              label="Perfil"
              options={roleOptions}
              value={formData.role}
              onChange={(e) => {
                const newRole = e.target.value;
                setFormData({ 
                  ...formData, 
                  role: newRole,
                  company_group_id: newRole !== 'master' ? formData.company_group_id : ''
                });
                if (newRole !== 'user') {
                  setSelectedCompanies([]);
                }
              }}
            />
          </div>

          {needsGroup && (
            isGroupReadOnly && selectedGroupId ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grupo</label>
                <input
                  type="text"
                  value={groupName || groups.find((g: any) => g.id === selectedGroupId)?.name || currentUser?.company_group?.name || ''}
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
                />
              </div>
            ) : (
              <Select
                label="Grupo"
                options={groupOptions}
                value={formData.company_group_id}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    company_group_id: e.target.value
                  });
                  setSelectedCompanies([]);
                }}
                placeholder="Selecione um grupo"
              />
            )
          )}

          {needsCompanies && formData.company_group_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Empresas Vinculadas *
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {companies.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhuma empresa no grupo</p>
                ) : (
                  companies.map((company) => (
                    <label key={company.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
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
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{company.name}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedCompanies.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {selectedCompanies.length} empresa(s) selecionada(s)
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} isLoading={saving}>
              {editingUser ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Mudança de Senha */}
      {isPasswordModalOpen && passwordUser && (
        <Modal
          isOpen={isPasswordModalOpen}
          onClose={() => {
            setIsPasswordModalOpen(false);
            setPasswordUser(null);
            setNewPassword('');
            setConfirmPassword('');
          }}
          title={`Alterar Senha - ${passwordUser.name}`}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Senha
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
                disabled={changingPassword}
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Nova Senha
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
                disabled={changingPassword}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordUser(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={changingPassword}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSavePassword}
                disabled={changingPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
