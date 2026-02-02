'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, TestTube, CheckCircle, XCircle, Loader2, Database, ChevronDown, ChevronUp, Copy, Search } from 'lucide-react';
import { Button, Modal, Input, Select } from '@/components/ui';
import { PowerBIConnection, CompanyGroup } from '@/types';

interface Dataset {
  id: string;
  name: string;
  configuredBy?: string;
}

interface ConnectionWithDatasets extends PowerBIConnection {
  datasets?: Dataset[];
  showDatasets?: boolean;
}

export default function PowerBIConexoesPage() {
  const [connections, setConnections] = useState<ConnectionWithDatasets[]>([]);
  const [allConnections, setAllConnections] = useState<ConnectionWithDatasets[]>([]);
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<PowerBIConnection | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');

  const [formData, setFormData] = useState({
    company_group_id: '',
    name: '',
    tenant_id: '',
    client_id: '',
    client_secret: '',
    workspace_id: '',
    is_active: true
  });

  // Buscar conexões
  const fetchConnections = async () => {
    try {
      let url = '/api/powerbi/connections';
      if (filterGroup) {
        url += `?group_id=${filterGroup}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      const connectionsData = (data.connections || []).map((c: PowerBIConnection) => ({ ...c, datasets: [], showDatasets: false }));
      setAllConnections(connectionsData);
    } catch (error) {
      console.error('Erro ao buscar conexões:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar conexões
  useEffect(() => {
    let filtered = allConnections;

    if (search) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.workspace_id.toLowerCase().includes(search.toLowerCase()) ||
        c.tenant_id.toLowerCase().includes(search.toLowerCase())
      );
    }

    setConnections(filtered);
  }, [search, allConnections]);

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
    fetchConnections();
    fetchGroups();
  }, [filterGroup]);

  // Abrir modal para nova conexão
  const handleNew = () => {
    setEditingConnection(null);
    setFormData({
      company_group_id: groups[0]?.id || '',
      name: '',
      tenant_id: '',
      client_id: '',
      client_secret: '',
      workspace_id: '',
      is_active: true
    });
    setShowSecret(false);
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleEdit = async (connection: PowerBIConnection) => {
    try {
      const res = await fetch(`/api/powerbi/connections/${connection.id}`);
      const data = await res.json();
      
      setEditingConnection(data.connection);
      setFormData({
        company_group_id: data.connection.company_group_id,
        name: data.connection.name,
        tenant_id: data.connection.tenant_id,
        client_id: data.connection.client_id,
        client_secret: data.connection.client_secret || '',
        workspace_id: data.connection.workspace_id,
        is_active: data.connection.is_active
      });
      setShowSecret(false);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Erro ao buscar conexão:', error);
      alert('Erro ao carregar conexão');
    }
  };

  // Salvar conexão
  const handleSave = async () => {
    if (!formData.company_group_id || !formData.name || !formData.tenant_id || 
        !formData.client_id || !formData.workspace_id) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    if (!editingConnection && !formData.client_secret) {
      alert('Client Secret é obrigatório para nova conexão');
      return;
    }

    setSaving(true);
    try {
      const url = editingConnection 
        ? `/api/powerbi/connections/${editingConnection.id}`
        : '/api/powerbi/connections';
      
      const method = editingConnection ? 'PUT' : 'POST';
      
      const payload = { ...formData };
      if (editingConnection && !formData.client_secret) {
        delete (payload as any).client_secret;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao salvar conexão');
        return;
      }

      setIsModalOpen(false);
      fetchConnections();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar conexão');
    } finally {
      setSaving(false);
    }
  };

  // Excluir conexão
  const handleDelete = async (connection: PowerBIConnection) => {
    if (!confirm(`Deseja excluir a conexão "${connection.name}"?`)) return;

    try {
      const res = await fetch(`/api/powerbi/connections/${connection.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        alert('Erro ao excluir conexão');
        return;
      }

      fetchConnections();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir conexão');
    }
  };

  // Testar conexão e buscar datasets
  const handleTest = async (connection: ConnectionWithDatasets) => {
    setTesting(connection.id);

    try {
      const res = await fetch(`/api/powerbi/connections/${connection.id}/test`, {
        method: 'POST'
      });

      const data = await res.json();

      // Atualizar conexão com datasets
      setConnections(prev => prev.map(c => {
        if (c.id === connection.id) {
          return {
            ...c,
            datasets: data.datasets || [],
            showDatasets: data.success && data.datasets?.length > 0,
            sync_status: data.success ? 'success' : 'error',
            sync_error: data.success ? null : data.error
          };
        }
        return c;
      }));

      setAllConnections(prev => prev.map(c => {
        if (c.id === connection.id) {
          return {
            ...c,
            datasets: data.datasets || [],
            showDatasets: data.success && data.datasets?.length > 0,
            sync_status: data.success ? 'success' : 'error',
            sync_error: data.success ? null : data.error
          };
        }
        return c;
      }));

      if (!data.success) {
        alert(`Erro: ${data.error}\n${data.details || ''}`);
      }

    } catch (error) {
      console.error('Erro ao testar:', error);
      alert('Erro ao testar conexão');
    } finally {
      setTesting(null);
    }
  };

  // Toggle mostrar datasets
  const toggleDatasets = (connectionId: string) => {
    setConnections(prev => prev.map(c => {
      if (c.id === connectionId) {
        return { ...c, showDatasets: !c.showDatasets };
      }
      return c;
    }));

    setAllConnections(prev => prev.map(c => {
      if (c.id === connectionId) {
        return { ...c, showDatasets: !c.showDatasets };
      }
      return c;
    }));
  };

  // Copiar ID para clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('ID copiado!');
  };

  const groupOptions = groups.map(g => ({ value: g.id, label: g.name }));

  const getStatusBadge = (connection: PowerBIConnection) => {
    switch (connection.sync_status) {
      case 'success':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Conectado</span>;
      case 'error':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Erro</span>;
      case 'running':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Sincronizando</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Pendente</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conexões Power BI</h1>
          <p className="text-gray-500 mt-1">Gerencie as conexões com workspaces do Power BI</p>
        </div>
        <Button onClick={handleNew}>
          <Plus size={20} className="mr-2" />
          Nova Conexão
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, workspace ou tenant..."
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

      {/* Lista de Conexões */}
      {connections.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Database size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conexão</h3>
          <p className="text-gray-500 mb-4">Crie sua primeira conexão com o Power BI</p>
          <Button onClick={handleNew}>
            <Plus size={18} className="mr-2" />
            Nova Conexão
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => (
            <div key={connection.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Linha principal */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Database className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{connection.name}</h3>
                    <p className="text-sm text-gray-500">
                      {connection.company_group?.name} • Workspace: {connection.workspace_id.slice(0, 8)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(connection)}
                  
                  {connection.datasets && connection.datasets.length > 0 && (
                    <button
                      onClick={() => toggleDatasets(connection.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <span>{connection.datasets.length} datasets</span>
                      {connection.showDatasets ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}

                  <button
                    onClick={() => handleTest(connection)}
                    disabled={testing === connection.id}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                    title="Testar conexão"
                  >
                    {testing === connection.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <TestTube size={18} />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(connection)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Editar"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(connection)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Erro */}
              {connection.sync_error && (
                <div className="px-4 pb-3">
                  <p className="text-sm text-red-500">{connection.sync_error}</p>
                </div>
              )}

              {/* Lista de Datasets */}
              {connection.showDatasets && connection.datasets && connection.datasets.length > 0 && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Datasets disponíveis</h4>
                  <div className="space-y-2">
                    {connection.datasets.map((dataset) => (
                      <div
                        key={dataset.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{dataset.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{dataset.id}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(dataset.id)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                          title="Copiar ID"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    💡 Use o ID do dataset na configuração de sincronização
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação/Edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingConnection ? 'Editar Conexão' : 'Nova Conexão Power BI'}
        size="xl"
      >
        <div className="space-y-4">
          {/* Primeira linha: Grupo e Nome */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Grupo de Empresa *"
              options={groupOptions}
              value={formData.company_group_id}
              onChange={(e) => setFormData({ ...formData, company_group_id: e.target.value })}
              disabled={!!editingConnection}
            />

            <Input
              label="Nome da Conexão *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Power BI Produção"
            />
          </div>

          {/* Segunda linha: Tenant ID e Client ID */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tenant ID (Azure AD) *"
              value={formData.tenant_id}
              onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />

            <Input
              label="Client ID (App Registration) *"
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>

          {/* Terceira linha: Client Secret e Workspace ID */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Input
                label={editingConnection ? "Client Secret (deixe vazio para manter)" : "Client Secret *"}
                type={showSecret ? 'text' : 'password'}
                value={formData.client_secret}
                onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                placeholder={editingConnection ? "••••••••••••" : "Secret do App Registration"}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Input
              label="Workspace ID *"
              value={formData.workspace_id}
              onChange={(e) => setFormData({ ...formData, workspace_id: e.target.value })}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>

          {/* Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">Conexão ativa</label>
          </div>

          {/* Linha separadora */}
          <div className="border-t border-gray-200"></div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} isLoading={saving}>
              {editingConnection ? 'Salvar' : 'Criar Conexão'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
