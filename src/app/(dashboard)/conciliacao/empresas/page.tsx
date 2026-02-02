'use client';

import { useState, useEffect, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Link2, Unlink, Building, GripVertical, Check, X, Filter, ChevronDown } from 'lucide-react';
import { Button, Select, Modal } from '@/components/ui';
import { Company, ExternalCompany, CompanyMapping, CompanyGroup } from '@/types';
import { useGroupFilter } from '@/hooks/useGroupFilter';

export default function ConciliacaoEmpresasPage() {
  const router = useRouter();
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [externalCompanies, setExternalCompanies] = useState<ExternalCompany[]>([]);
  const [mappings, setMappings] = useState<CompanyMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInternal, setSearchInternal] = useState('');
  const [searchExternal, setSearchExternal] = useState('');
  
  // Drag and Drop
  const [draggedCompany, setDraggedCompany] = useState<ExternalCompany | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  
  // Filtros
  const [filterInternal, setFilterInternal] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [filterExternal, setFilterExternal] = useState<'all' | 'mapped' | 'unmapped'>('all');
  
  // Paginação
  const ITEMS_PER_PAGE = 20;
  const [currentPageInternal, setCurrentPageInternal] = useState(1);
  const [currentPageExternal, setCurrentPageExternal] = useState(1);


  // Buscar empresas internas
  const fetchCompanies = async (groupId: string) => {
    try {
      const res = await fetch(`/api/companies?group_id=${groupId}&include_inactive=true`);
      if (!res.ok) {
        console.error('Erro ao buscar empresas:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  // Buscar empresas externas
  const fetchExternalCompanies = async (groupId: string) => {
    try {
      const res = await fetch(`/api/external-companies?group_id=${groupId}`);
      if (!res.ok) {
        console.error('Erro ao buscar empresas externas:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      setExternalCompanies(data.externalCompanies || []);
    } catch (error) {
      console.error('Erro ao buscar empresas externas:', error);
    }
  };

  // Buscar mapeamentos
  const fetchMappings = async (groupId: string) => {
    try {
      const res = await fetch(`/api/mappings/companies?group_id=${groupId}`);
      if (!res.ok) {
        console.error('Erro ao buscar mapeamentos:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      setMappings(data.mappings || []);
    } catch (error) {
      console.error('Erro ao buscar mapeamentos:', error);
    }
  };

  // Carregar dados quando selecionar grupo
  const loadData = async (groupId: string) => {
    if (!groupId) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchCompanies(groupId),
        fetchExternalCompanies(groupId),
        fetchMappings(groupId)
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      loadData(selectedGroupId);
    }
  }, [selectedGroupId]);

  // Verificar se empresa externa está mapeada
  const isExternalMapped = (externalId: string) => {
    return mappings.some(m => m.external_company_id === externalId);
  };

  // Obter mapeamentos de uma empresa interna
  const getCompanyMappings = (companyId: string) => {
    return mappings.filter(m => m.company_id === companyId);
  };

  // Obter empresa externa pelo ID
  const getExternalCompanyById = (externalId: string) => {
    return externalCompanies.find(e => e.id === externalId);
  };

  // Criar mapeamento via drag and drop
  const handleCreateMapping = async (companyId: string, externalCompanyId: string) => {
    if (!selectedGroupId) return;

    try {
      const res = await fetch('/api/mappings/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_group_id: selectedGroupId,
          company_id: companyId,
          external_company_id: externalCompanyId
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao criar mapeamento');
        return;
      }

      await fetchMappings(selectedGroupId);
    } catch (error) {
      console.error('Erro ao criar mapeamento:', error);
      alert('Erro ao criar mapeamento');
    }
  };

  // Remover mapeamento
  const handleRemoveMapping = async (mappingId: string) => {
    try {
      const res = await fetch(`/api/mappings/companies?id=${mappingId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        alert('Erro ao remover mapeamento');
        return;
      }

      await fetchMappings(selectedGroupId);
    } catch (error) {
      console.error('Erro ao remover mapeamento:', error);
      alert('Erro ao remover mapeamento');
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, company: ExternalCompany) => {
    setDraggedCompany(company);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', company.id);
  };

  const handleDragEnd = () => {
    setDraggedCompany(null);
    setDropTargetId(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, companyId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetId(companyId);
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, companyId: string) => {
    e.preventDefault();
    setDropTargetId(null);
    
    if (draggedCompany) {
      await handleCreateMapping(companyId, draggedCompany.id);
    }
    
    setDraggedCompany(null);
  };

  // Formatar CNPJ
  const formatCnpj = (cnpj?: string | null) => {
    if (!cnpj) return '';
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return cnpj;
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  // Filtrar empresas internas
  const filteredCompanies = (companies || []).filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchInternal.toLowerCase()) ||
      company.cnpj?.includes(searchInternal);
    
    if (!matchesSearch) return false;
    
    const hasMappings = getCompanyMappings(company.id).length > 0;
    if (filterInternal === 'mapped' && !hasMappings) return false;
    if (filterInternal === 'unmapped' && hasMappings) return false;
    
    return true;
  });

  // Filtrar empresas externas (não mapeadas)
  const filteredExternalCompanies = (externalCompanies || []).filter(company => {
    const matchesSearch = company.name?.toLowerCase().includes(searchExternal.toLowerCase()) ||
      company.external_id?.includes(searchExternal) ||
      company.cnpj?.includes(searchExternal);
    
    if (!matchesSearch) return false;
    
    const isMapped = isExternalMapped(company.id);
    if (filterExternal === 'mapped' && !isMapped) return false;
    if (filterExternal === 'unmapped' && isMapped) return false;
    
    return true;
  });

  // Paginação para empresas internas
  const totalPagesInternal = Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE);
  const startIndexInternal = (currentPageInternal - 1) * ITEMS_PER_PAGE;
  const endIndexInternal = startIndexInternal + ITEMS_PER_PAGE;
  const paginatedCompanies = filteredCompanies.slice(startIndexInternal, endIndexInternal);

  // Paginação para empresas externas
  const totalPagesExternal = Math.ceil(filteredExternalCompanies.length / ITEMS_PER_PAGE);
  const startIndexExternal = (currentPageExternal - 1) * ITEMS_PER_PAGE;
  const endIndexExternal = startIndexExternal + ITEMS_PER_PAGE;
  const paginatedExternalCompanies = filteredExternalCompanies.slice(startIndexExternal, endIndexExternal);

  // Resetar páginas quando filtrar
  useEffect(() => {
    setCurrentPageInternal(1);
  }, [searchInternal, filterInternal]);

  useEffect(() => {
    setCurrentPageExternal(1);
  }, [searchExternal, filterExternal]);


  // Estatísticas
  const totalInternal = companies?.length || 0;
  const mappedInternal = companies?.filter(c => getCompanyMappings(c.id).length > 0).length || 0;
  const totalExternal = externalCompanies?.length || 0;
  const mappedExternal = externalCompanies?.filter(c => isExternalMapped(c.id)).length || 0;

  return (
    <div className="flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conciliação de Empresas</h1>
          <p className="text-gray-500 text-sm">Arraste as empresas externas para vincular com as empresas do sistema</p>
        </div>
        <Button
          onClick={() => router.push('/empresas')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Empresas
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-4">
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
              <option value="">Selecione o grupo</option>
              {groups.map((group: any) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          )}
        </div>
        {/* Buscar (apenas para empresas internas) */}
        <div className="flex-1 max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar empresas..."
              value={searchInternal}
              onChange={(e) => setSearchInternal(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="flex gap-4 mb-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          <span className="text-gray-700 font-medium">{mappedInternal}/{totalInternal}</span>
          <span className="text-gray-600 text-sm ml-2">empresas vinculadas</span>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          <span className="text-gray-700 font-medium">{mappedExternal}/{totalExternal}</span>
          <span className="text-gray-600 text-sm ml-2">externas mapeadas</span>
        </div>
      </div>

      {!selectedGroupId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 max-w-md">
            <Building size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Selecione um grupo</h2>
            <p className="text-gray-500">
              Escolha um grupo para visualizar e conciliar as empresas
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
          {/* Lado Esquerdo - Empresas do Sistema */}
          <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building size={20} className="text-blue-600" />
                  <h2 className="font-semibold text-gray-900">Empresas do Sistema</h2>
                </div>
                <span className="text-gray-600 text-sm">{filteredCompanies.length} empresas</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar empresa..."
                    value={searchInternal}
                    onChange={(e) => setSearchInternal(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterInternal}
                  onChange={(e) => setFilterInternal(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">Todas</option>
                  <option value="mapped">Vinculadas</option>
                  <option value="unmapped">Não vinculadas</option>
                </select>
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ height: '1200px' }}>
              {paginatedCompanies.map((company) => {
                const companyMappings = getCompanyMappings(company.id);
                const isDropTarget = dropTargetId === company.id;
                
                return (
                  <div
                    key={company.id}
                    onDragOver={(e) => handleDragOver(e, company.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, company.id)}
                    className={`rounded-xl border-2 transition-all duration-200 ${
                      isDropTarget 
                        ? 'border-blue-500 scale-[1.02] shadow-lg' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Card da empresa */}
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          companyMappings.length > 0 ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <Building size={20} className={companyMappings.length > 0 ? 'text-green-600' : 'text-blue-600'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{company.name}</p>
                          <p className="text-sm text-gray-500">{formatCnpj(company.cnpj)}</p>
                        </div>
                        {companyMappings.length > 0 && (
                          <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                            <Check size={12} />
                            {companyMappings.length}
                          </div>
                        )}
                      </div>

                      {/* Área de drop / Mapeamentos existentes */}
                      {companyMappings.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {companyMappings.map((mapping) => {
                            const extCompany = getExternalCompanyById(mapping.external_company_id);
                            return (
                              <div
                                key={mapping.id}
                                className="flex items-center gap-2 border border-green-200 rounded-lg p-2"
                              >
                                <Link2 size={14} className="text-green-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-green-800 truncate">
                                    {extCompany?.name || 'N/A'}
                                  </p>
                                  <p className="text-xs text-green-600">
                                    {extCompany?.external_id}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleRemoveMapping(mapping.id)}
                                  className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                                  title="Desvincular"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={`mt-3 border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
                          isDropTarget 
                            ? 'border-blue-400' 
                            : 'border-gray-300'
                        }`}>
                          <p className={`text-sm ${isDropTarget ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                            {isDropTarget ? '✓ Solte aqui para vincular' : 'Arraste uma empresa externa aqui'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginação */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredCompanies.length > 0 ? (
                  <>Mostrando {startIndexInternal + 1} a {Math.min(endIndexInternal, filteredCompanies.length)} de {filteredCompanies.length} empresas</>
                ) : (
                  <>Nenhuma empresa encontrada</>
                )}
              </div>
              {totalPagesInternal > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPageInternal(prev => Math.max(1, prev - 1))}
                    disabled={currentPageInternal === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPageInternal} de {totalPagesInternal}
                  </span>
                  <button
                    onClick={() => setCurrentPageInternal(prev => Math.min(totalPagesInternal, prev + 1))}
                    disabled={currentPageInternal === totalPagesInternal}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Lado Direito - Empresas Externas */}
          <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building size={20} className="text-orange-600" />
                  <h2 className="font-semibold text-gray-900">Empresas (Banco de Dados)</h2>
                </div>
                <span className="text-gray-600 text-sm">{filteredExternalCompanies.length} empresas</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar empresa..."
                    value={searchExternal}
                    onChange={(e) => setSearchExternal(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterExternal}
                  onChange={(e) => setFilterExternal(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">Todas</option>
                  <option value="unmapped">Não mapeadas</option>
                  <option value="mapped">Mapeadas</option>
                </select>
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ height: '1200px' }}>
              {paginatedExternalCompanies.map((company) => {
                const isMapped = isExternalMapped(company.id);
                const isDragging = draggedCompany?.id === company.id;
                
                return (
                  <div
                    key={company.id}
                    draggable={!isMapped}
                    onDragStart={(e) => handleDragStart(e, company)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-xl border-2 p-3 transition-all duration-200 ${
                      isMapped 
                        ? 'border-green-200 opacity-60 cursor-not-allowed' 
                        : isDragging
                        ? 'border-blue-500 shadow-lg scale-[1.02] cursor-grabbing'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-md cursor-grab'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {!isMapped && (
                        <div className="text-gray-400 cursor-grab">
                          <GripVertical size={18} />
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isMapped ? 'bg-green-100' : 'bg-orange-100'
                      }`}>
                        {isMapped ? (
                          <Check size={20} className="text-green-600" />
                        ) : (
                          <Building size={20} className="text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{company.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
                            {company.external_id}
                          </span>
                          {company.cnpj && (
                            <span>{formatCnpj(company.cnpj)}</span>
                          )}
                        </div>
                      </div>
                      {isMapped && (
                        <div className="text-green-600">
                          <Link2 size={18} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {paginatedExternalCompanies.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <Building size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhuma empresa externa</p>
                  <p className="text-sm">Sincronize os dados do Power BI primeiro</p>
                </div>
              )}
            </div>

            {/* Paginação */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredExternalCompanies.length > 0 ? (
                  <>Mostrando {startIndexExternal + 1} a {Math.min(endIndexExternal, filteredExternalCompanies.length)} de {filteredExternalCompanies.length} empresas</>
                ) : (
                  <>Nenhuma empresa encontrada</>
                )}
              </div>
              {totalPagesExternal > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPageExternal(prev => Math.max(1, prev - 1))}
                    disabled={currentPageExternal === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPageExternal} de {totalPagesExternal}
                  </span>
                  <button
                    onClick={() => setCurrentPageExternal(prev => Math.min(totalPagesExternal, prev + 1))}
                    disabled={currentPageExternal === totalPagesExternal}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dica flutuante quando arrastar */}
      {draggedCompany && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
          <Link2 size={18} />
          <span>Solte na empresa do sistema para vincular</span>
        </div>
      )}
    </div>
  );
}