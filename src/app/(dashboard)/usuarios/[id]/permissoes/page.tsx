'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Shield, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui';
import { toast } from '@/lib/toast';

interface Page {
  id: string;
  name: string;
  label: string;
  route: string;
  module_id: string;
  display_order: number;
}

interface Module {
  id: string;
  name: string;
  label: string;
  icon: string;
  display_order: number;
  pages?: Page[];
}

interface Permission {
  module_id: string;
  can_view: boolean;
  can_edit: boolean;
}

interface PagePermission {
  page_id: string;
  can_view: boolean;
  can_edit: boolean;
}

export default function PermissoesPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [modulePermissions, setModulePermissions] = useState<Record<string, Permission>>({});
  const [pagePermissions, setPagePermissions] = useState<Record<string, PagePermission>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      // Buscar usuário
      const userRes = await fetch(`/api/users/${userId}`);
      const userData = await userRes.json().catch(() => ({}));
      setUser(userData.user);

      // Buscar módulos com páginas
      const modulesRes = await fetch('/api/modules');
      const modulesData = await modulesRes.json().catch(() => ({ modules: [] }));
      setModules(modulesData.modules || []);

      // Buscar permissões do usuário
      const permRes = await fetch(`/api/users/${userId}/permissions`);
      const permData = await permRes.json().catch(() => ({}));
      
      // Converter array para objeto de permissões de módulos
      const modulePermObj: Record<string, Permission> = {};
      (permData.permissions || []).forEach((p: any) => {
        modulePermObj[p.module_id] = {
          module_id: p.module_id,
          can_view: Boolean(p.can_view),
          can_edit: Boolean(p.can_edit)
        };
      });
      setModulePermissions(modulePermObj);

      // Converter array para objeto de permissões de páginas
      const pagePermObj: Record<string, PagePermission> = {};
      (permData.pagePermissions || []).forEach((p: any) => {
        pagePermObj[p.page_id] = {
          page_id: p.page_id,
          can_view: Boolean(p.can_view),
          can_edit: Boolean(p.can_edit)
        };
      });
      setPagePermissions(pagePermObj);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const getModuleCheckboxState = (module: Module): 'checked' | 'unchecked' | 'indeterminate' => {
    if (!module.pages || module.pages.length === 0) {
      // Se não tem páginas, usar permissão do módulo
      const perm = modulePermissions[module.id];
      if (perm?.can_view) return 'checked';
      return 'unchecked';
    }

    // Verificar estado das páginas
    const pageStates = module.pages.map(page => {
      const pagePerm = pagePermissions[page.id];
      return pagePerm?.can_view || false;
    });

    const allChecked = pageStates.every(s => s);
    const someChecked = pageStates.some(s => s);

    if (allChecked) return 'checked';
    if (someChecked) return 'indeterminate';
    return 'unchecked';
  };

  const handleModulePermissionChange = (moduleId: string, field: 'can_view' | 'can_edit', value: boolean) => {
    // Se o módulo tem páginas, atualizar todas as páginas
    const module = modules.find(m => m.id === moduleId);
    if (module?.pages && module.pages.length > 0) {
      const newPagePerms: Record<string, PagePermission> = { ...pagePermissions };
      module.pages.forEach(page => {
        newPagePerms[page.id] = {
          page_id: page.id,
          can_view: field === 'can_view' ? value : (newPagePerms[page.id]?.can_view || false),
          can_edit: field === 'can_edit' 
            ? value 
            : (field === 'can_view' && !value ? false : (newPagePerms[page.id]?.can_edit || false)),
          ...(field === 'can_view' && !value ? { can_edit: false } : {}),
          ...(field === 'can_edit' && value ? { can_view: true } : {})
        };
      });
      setPagePermissions(newPagePerms);
    } else {
      // Se não tem páginas, atualizar permissão do módulo diretamente
      setModulePermissions(prev => ({
        ...prev,
        [moduleId]: {
          ...prev[moduleId],
          module_id: moduleId,
          [field]: value,
          ...(field === 'can_view' && !value ? { can_edit: false } : {}),
          ...(field === 'can_edit' && value ? { can_view: true } : {})
        }
      }));
    }
  };

  const handlePagePermissionChange = (pageId: string, field: 'can_view' | 'can_edit', value: boolean) => {
    setPagePermissions(prev => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        page_id: pageId,
        [field]: value,
        ...(field === 'can_view' && !value ? { can_edit: false } : {}),
        ...(field === 'can_edit' && value ? { can_view: true } : {})
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const permissionsArray = Object.values(modulePermissions);
      const pagePermissionsArray = Object.values(pagePermissions);
      
      const res = await fetch(`/api/users/${userId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          permissions: permissionsArray,
          pagePermissions: pagePermissionsArray
        })
      });

      if (res.ok) {
        toast.success('Permissões salvas com sucesso!');
        router.push('/usuarios');
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || 'Erro ao salvar permissões');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar permissões');
    } finally {
      setSaving(false);
    }
  };

  const isMaster = user?.role === 'master';
  const isGroupAdmin = user?.role === 'group_admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
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
              user?.role === 'group_admin' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {user?.role === 'master' ? 'Master' : user?.role === 'group_admin' ? 'Group Admin' : 'Usuário'}
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
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-purple-600" />
            <p className="text-purple-800 font-medium">
              Usuários Master têm acesso total a todos os módulos e páginas.
            </p>
          </div>
        </div>
      )}

      {/* Tabela de Permissões */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-4 px-6 font-semibold text-gray-700">Módulo / Página</th>
              <th className="text-center py-4 px-6 font-semibold text-gray-700 w-32">Visualizar</th>
              <th className="text-center py-4 px-6 font-semibold text-gray-700 w-32">Editar</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((module) => {
              const isExpanded = expandedModules.has(module.id);
              const isPowerBI = module.name === 'powerbi';
              const isDisabled = isMaster; // Apenas master tem checkboxes desabilitados
              const isBlockedForNonMaster = isPowerBI && !isMaster;
              const hasPages = module.pages && module.pages.length > 0;
              const moduleCheckboxState = getModuleCheckboxState(module);
              const modulePerm = modulePermissions[module.id] || { can_view: false, can_edit: false };

              return (
                <React.Fragment key={module.id}>
                  {/* Linha do Módulo */}
                  <tr className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {hasPages && (
                          <button
                            onClick={() => toggleModule(module.id)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown size={18} className="text-gray-600" />
                            ) : (
                              <ChevronRight size={18} className="text-gray-600" />
                            )}
                          </button>
                        )}
                        {!hasPages && <div className="w-6" />}
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
                      {hasPages ? (
                        <input
                          type="checkbox"
                          checked={moduleCheckboxState === 'checked'}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = moduleCheckboxState === 'indeterminate';
                            }
                          }}
                          onChange={(e) => {
                            const newValue = moduleCheckboxState === 'checked' ? false : true;
                            handleModulePermissionChange(module.id, 'can_view', newValue);
                          }}
                          disabled={isDisabled || isBlockedForNonMaster}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isMaster || Boolean(modulePerm?.can_view)}
                          onChange={(e) => handleModulePermissionChange(module.id, 'can_view', e.target.checked)}
                          disabled={isDisabled || isBlockedForNonMaster}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                      )}
                    </td>
                    <td className="text-center py-4 px-6">
                      {hasPages ? (
                        <input
                          type="checkbox"
                          checked={moduleCheckboxState === 'checked' && module.pages?.every(p => pagePermissions[p.id]?.can_edit)}
                          ref={(el) => {
                            if (el && module.pages) {
                              const allEditChecked = module.pages.every(p => pagePermissions[p.id]?.can_edit);
                              const someEditChecked = module.pages.some(p => pagePermissions[p.id]?.can_edit);
                              el.indeterminate = someEditChecked && !allEditChecked;
                            }
                          }}
                          onChange={(e) => {
                            const newValue = e.target.checked;
                            handleModulePermissionChange(module.id, 'can_edit', newValue);
                          }}
                          disabled={isDisabled || isBlockedForNonMaster}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isMaster || Boolean(modulePerm?.can_edit)}
                          onChange={(e) => handleModulePermissionChange(module.id, 'can_edit', e.target.checked)}
                          disabled={isDisabled || isBlockedForNonMaster}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                      )}
                    </td>
                  </tr>

                  {/* Linhas das Páginas (quando expandido) */}
                  {isExpanded && hasPages && module.pages?.map((page) => {
                    const pagePerm = pagePermissions[page.id] || { can_view: false, can_edit: false };
                    const pageIsDisabled = isMaster || isBlockedForNonMaster;

                    return (
                      <tr key={page.id} className="border-t border-gray-100 bg-gray-50 hover:bg-gray-100">
                        <td className="py-3 px-6 pl-16">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-gray-400" />
                            <p className="text-sm text-gray-700">{page.label}</p>
                          </div>
                        </td>
                        <td className="text-center py-3 px-6">
                          <input
                            type="checkbox"
                            checked={isMaster || Boolean(pagePerm?.can_view)}
                            onChange={(e) => handlePagePermissionChange(page.id, 'can_view', e.target.checked)}
                            disabled={pageIsDisabled}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                          />
                        </td>
                        <td className="text-center py-3 px-6">
                          <input
                            type="checkbox"
                            checked={isMaster || Boolean(pagePerm?.can_edit)}
                            onChange={(e) => handlePagePermissionChange(page.id, 'can_edit', e.target.checked)}
                            disabled={pageIsDisabled}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="mt-4 text-sm text-gray-500">
        <p><strong>Visualizar:</strong> Permite acessar e ver o módulo/página</p>
        <p><strong>Editar:</strong> Permite criar, editar e excluir registros</p>
        <p className="mt-2"><strong>Nota:</strong> Marcar "Editar" automaticamente marca "Visualizar". Desmarcar "Visualizar" desmarca "Editar".</p>
      </div>
    </div>
  );
}
