'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Building2, Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight, GitCompare, Link2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { Company, CompanyGroup, CompanyMapping } from '@/types';
import { useGroupFilter } from '@/hooks/useGroupFilter';

const ITEMS_PER_PAGE = 20;

export default function EmpresasPage() {
  const router = useRouter();
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({ 
    company_group_id: '', 
    name: '', 
    slug: '', 
    cnpj: '' 
  });
  const [saving, setSaving] = useState(false);
  const [companyMappings, setCompanyMappings] = useState<CompanyMapping[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);

  // Buscar empresas
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const url = selectedGroupId 
        ? `/api/companies?group_id=${selectedGroupId}&include_inactive=true`
        : '/api/companies?include_inactive=true';
      const res = await fetch(url);
      const data = await res.json();
      const companiesList = data.companies || [];
      // Filtro de segurança: garantir que apenas empresas do grupo selecionado sejam exibidas
      const filteredCompanies = selectedGroupId 
        ? companiesList.filter((c: any) => c.company_group_id === selectedGroupId)
        : companiesList;
      setCompanies(filteredCompanies);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      fetchCompanies();
    } else {
      setCompanies([]);
    }
  }, [selectedGroupId]);

  // Filtrar empresas
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(search.toLowerCase()) ||
    company.slug.toLowerCase().includes(search.toLowerCase()) ||
    (company.cnpj && company.cnpj.includes(search))
  );

  // Paginação
  const totalPages = Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex);

  // Resetar página quando filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedGroupId]);

  // Buscar mapeamentos de uma empresa
  const fetchCompanyMappings = async (companyId: string) => {
    try {
      setLoadingMappings(true);
      const res = await fetch(`/api/mappings/companies?company_id=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setCompanyMappings(data.mappings || []);
      }
    } catch (error) {
      console.error('Erro ao buscar mapeamentos:', error);
    } finally {
      setLoadingMappings(false);
    }
  };

  // Remover mapeamento
  const handleRemoveMapping = async (mappingId: string) => {
    try {
      const res = await fetch(`/api/mappings/companies?id=${mappingId}`, {
        method: 'DELETE'
      });

      if (res.ok && editingCompany) {
        // Recarregar mapeamentos
        await fetchCompanyMappings(editingCompany.id);
      } else {
        alert('Erro ao remover mapeamento');
      }
    } catch (error) {
      console.error('Erro ao remover mapeamento:', error);
      alert('Erro ao remover mapeamento');
    }
  };

  // Abrir modal para criar
  const handleCreate = () => {
    setEditingCompany(null);
    setCompanyMappings([]);
    setFormData({ 
      company_group_id: selectedGroupId || '', 
      name: '', 
      slug: '', 
      cnpj: '' 
    });
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleEdit = async (company: Company) => {
    setEditingCompany(company);
    setFormData({
      company_group_id: company.company_group_id,
      name: company.name,
      slug: company.slug,
      cnpj: company.cnpj || ''
    });
    setIsModalOpen(true);
    // Buscar mapeamentos da empresa
    await fetchCompanyMappings(company.id);
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

  // Formatar CNPJ
  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  // Salvar (criar ou editar)
  const handleSave = async () => {
    // Se o grupo está fixo (read-only), usar o selectedGroupId
    const finalCompanyGroupId = isGroupReadOnly && selectedGroupId 
      ? selectedGroupId 
      : formData.company_group_id;

    if (!finalCompanyGroupId || !formData.name || !formData.slug) {
      alert('Grupo, nome e slug são obrigatórios');
      return;
    }

    try {
      setSaving(true);
      const url = editingCompany 
        ? `/api/companies/${editingCompany.id}` 
        : '/api/companies';
      
      const res = await fetch(url, {
        method: editingCompany ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          company_group_id: finalCompanyGroupId,
          cnpj: formData.cnpj.replace(/\D/g, '') || null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao salvar');
        return;
      }

      setIsModalOpen(false);
      fetchCompanies();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar empresa');
    } finally {
      setSaving(false);
    }
  };

  // Excluir
  const handleDelete = async (company: Company) => {
    if (!confirm(`Deseja excluir a empresa "${company.name}"?`)) return;

    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao excluir');
        return;
      }

      fetchCompanies();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir empresa');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
            <p className="text-gray-500 mt-1">Gerencie as empresas do sistema</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => router.push('/conciliacao/empresas')}>
              <GitCompare size={18} className="mr-2" />
              Conciliação
            </Button>
            <Button onClick={handleCreate}>
              <Plus size={20} className="mr-2" />
              Nova Empresa
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-4">
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
                placeholder="Buscar por nome, slug ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {filteredCompanies.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Nenhuma empresa</h2>
            <p className="text-gray-500 mb-4">
              {search || selectedGroupId 
                ? `Nenhuma empresa encontrada para "${search || groupName}"`
                : 'Crie sua primeira empresa no sistema'
              }
            </p>
            {!search && !selectedGroupId && (
              <Button onClick={handleCreate}>
                Criar Empresa
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">CNPJ</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Grupo</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{company.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {company.cnpj ? formatCNPJ(company.cnpj) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{company.company_group?.name || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      {company.is_active ? (
                        <CheckCircle size={20} className="inline text-green-500" />
                      ) : (
                        <XCircle size={20} className="inline text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(company)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(company)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
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
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredCompanies.length)} de {filteredCompanies.length} empresas
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
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
                            className={`px-3 py-1 rounded-lg text-sm ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="text-gray-400">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
            </h2>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
              {/* Linha 1: Nome e Grupo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData({
                        ...formData,
                        name,
                        slug: editingCompany ? formData.slug : generateSlug(name)
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
                  {isGroupReadOnly && selectedGroupId ? (
                    <input
                      type="text"
                      value={groupName}
                      disabled
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
                    />
                  ) : (
                    <select
                      value={formData.company_group_id}
                      onChange={(e) => setFormData({ ...formData, company_group_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Selecione um grupo</option>
                      {groups.map((group: any) => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  )}
                  {isGroupReadOnly && selectedGroupId && (
                    <input type="hidden" value={selectedGroupId} />
                  )}
                </div>
              </div>

              {/* Linha 2: Slug e CNPJ */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={formatCNPJ(formData.cnpj)}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              {/* Conciliações (apenas no modo edição) */}
              {editingCompany && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Link2 size={16} className="text-green-600" />
                      Conciliações ({companyMappings.length})
                    </div>
                  </label>
                  
                  {loadingMappings ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : companyMappings.length === 0 ? (
                    <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 text-center">
                      Nenhuma empresa externa vinculada
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {companyMappings.map((mapping) => (
                        <div
                          key={mapping.id}
                          className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                              <Building2 size={16} className="text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {mapping.external_company?.name || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Código: {mapping.external_company?.external_code || mapping.external_company?.external_id || '-'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMapping(mapping.id)}
                            className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                            title="Remover vínculo"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <Button
                  type="submit"
                  isLoading={saving}
                >
                  {editingCompany ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
