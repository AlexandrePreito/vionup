'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Shield } from 'lucide-react';
import { Button } from '@/components/ui';
import { toast } from '@/lib/toast';

interface Module {
  id: string;
  name: string;
  label: string;
  icon: string;
}

interface Permission {
  module_id: string;
  can_view: boolean;
  can_edit: boolean;
}

export default function PermissoesPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      // Buscar usuário
      const userRes = await fetch(`/api/users/${userId}`);
      const userData = await userRes.json();
      setUser(userData.user);

      // Buscar módulos
      const modulesRes = await fetch('/api/modules');
      const modulesData = await modulesRes.json();
      setModules(modulesData.modules || []);

      // Buscar permissões do usuário
      const permRes = await fetch(`/api/users/${userId}/permissions`);
      const permData = await permRes.json();
      
      // Converter array para objeto
      const permObj: Record<string, Permission> = {};
      (permData.permissions || []).forEach((p: any) => {
        permObj[p.module_id] = {
          module_id: p.module_id,
          can_view: Boolean(p.can_view),
          can_edit: Boolean(p.can_edit)
        };
      });
      setPermissions(permObj);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (moduleId: string, field: 'can_view' | 'can_edit', value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        module_id: moduleId,
        [field]: value,
        // Se desmarcar view, desmarcar edit também
        ...(field === 'can_view' && !value ? { can_edit: false } : {}),
        // Se marcar edit, marcar view também
        ...(field === 'can_edit' && value ? { can_view: true } : {})
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const permissionsArray = Object.values(permissions);
      
      const res = await fetch(`/api/users/${userId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permissionsArray })
      });

      if (res.ok) {
        toast.success('Permissões salvas com sucesso!');
        router.push('/usuarios');
      } else {
        toast.error('Erro ao salvar permissões');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar permissões');
    } finally {
      setSaving(false);
    }
  };

  const isMaster = user?.role === 'master';
  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4 mb-6 pt-4">
        <button
          onClick={() => router.push('/usuarios')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Permissões de Acesso</h1>
          <p className="text-gray-600 mt-1">
            {user?.name} ({user?.email})
            <span className={`ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
              user?.role === 'master' ? 'bg-purple-100 text-purple-800' :
              user?.role === 'admin' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {user?.role === 'master' ? 'Master' : user?.role === 'admin' ? 'Admin' : 'Usuário'}
            </span>
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || isMaster}>
          <Save size={18} className="mr-2" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* Aviso para Master */}
      {isMaster && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-purple-600" />
            <p className="text-purple-800 font-medium">
              Usuários Master têm acesso total a todos os módulos.
            </p>
          </div>
        </div>
      )}

      {/* Aviso para Admin */}
      {isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            Admins têm acesso a todos os módulos do grupo, exceto Power BI.
          </p>
        </div>
      )}

      {/* Tabela de Permissões */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-4 px-6 font-semibold text-gray-700">Módulo</th>
              <th className="text-center py-4 px-6 font-semibold text-gray-700 w-32">Visualizar</th>
              <th className="text-center py-4 px-6 font-semibold text-gray-700 w-32">Editar</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((module) => {
              const perm = permissions[module.id] || { can_view: false, can_edit: false };
              const isPowerBI = module.name === 'powerbi';
              const isDisabled = isMaster || (isAdmin && !isPowerBI);
              const isBlockedForNonMaster = isPowerBI && !isMaster;

              return (
                <tr key={module.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isPowerBI ? 'bg-orange-100' : 'bg-blue-100'
                      }`}>
                        <span className={`text-lg ${isPowerBI ? 'text-orange-600' : 'text-blue-600'}`}>
                          {module.label.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{module.label}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-4 px-6">
                    <input
                      type="checkbox"
                      checked={isMaster || (isAdmin && !isPowerBI) || Boolean(perm?.can_view)}
                      onChange={(e) => handlePermissionChange(module.id, 'can_view', e.target.checked)}
                      disabled={isDisabled || isBlockedForNonMaster}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                    />
                  </td>
                  <td className="text-center py-4 px-6">
                    <input
                      type="checkbox"
                      checked={isMaster || (isAdmin && !isPowerBI) || Boolean(perm?.can_edit)}
                      onChange={(e) => handlePermissionChange(module.id, 'can_edit', e.target.checked)}
                      disabled={isDisabled || isBlockedForNonMaster}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="mt-4 text-sm text-gray-500">
        <p><strong>Visualizar:</strong> Permite acessar e ver o módulo</p>
        <p><strong>Editar:</strong> Permite criar, editar e excluir registros</p>
      </div>
    </div>
  );
}
