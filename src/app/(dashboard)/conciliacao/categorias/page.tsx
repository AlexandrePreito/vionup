'use client';

import { useState, useEffect, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Link2, FolderTree, Leaf, GripVertical, Check, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Category, ExternalCategory, CategoryMapping, Company, CompanyMapping, ExternalCompany } from '@/types';
import { useGroupFilter } from '@/hooks/useGroupFilter';

const ITEMS_PER_PAGE = 20;

export default function ConciliacaoCategoriasPage() {
  const router = useRouter();
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [externalCategories, setExternalCategories] = useState<ExternalCategory[]>([]);
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyMappings, setCompanyMappings] = useState<CompanyMapping[]>([]);
  const [externalCompanies, setExternalCompanies] = useState<ExternalCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInternal, setSearchInternal] = useState('');
  const [searchExternal, setSearchExternal] = useState('');
  const [filterInternal, setFilterInternal] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [filterExternal, setFilterExternal] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [filterType, setFilterType] = useState<'all' | 'entrada' | 'saida'>('all');

  const [currentPageInternal, setCurrentPageInternal] = useState(1);
  const [currentPageExternal, setCurrentPageExternal] = useState(1);

  const [draggedCategory, setDraggedCategory] = useState<ExternalCategory | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const fetchCategories = async (groupId: string) => {
    try {
      const res = await fetch(`/api/categories?group_id=${groupId}&analytical_only=true&include_inactive=true`);
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const fetchExternalCategories = async (groupId: string) => {
    try {
      const res = await fetch(`/api/external-categories?group_id=${groupId}`);
      const data = await res.json();
      setExternalCategories(data.externalCategories || []);
    } catch (error) {
      console.error('Erro ao buscar categorias externas:', error);
    }
  };

  const fetchMappings = async (groupId: string) => {
    try {
      const res = await fetch(`/api/mappings/categories?group_id=${groupId}`);
      const data = await res.json();
      setMappings(data.mappings || []);
    } catch (error) {
      console.error('Erro ao buscar mapeamentos:', error);
    }
  };

  const fetchCompanies = async (groupId: string) => {
    try {
      const res = await fetch(`/api/companies?group_id=${groupId}`);
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  const fetchCompanyMappings = async (groupId: string) => {
    try {
      const res = await fetch(`/api/mappings/companies?group_id=${groupId}`);
      const data = await res.json();
      setCompanyMappings(data.mappings || []);
    } catch (error) {
      console.error('Erro ao buscar mapeamentos de empresas:', error);
    }
  };

  const fetchExternalCompanies = async (groupId: string) => {
    try {
      const res = await fetch(`/api/external-companies?group_id=${groupId}`);
      const data = await res.json();
      setExternalCompanies(data.externalCompanies || []);
    } catch (error) {
      console.error('Erro ao buscar empresas externas:', error);
    }
  };

  const loadData = async (groupId: string) => {
    if (!groupId) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchCategories(groupId),
        fetchExternalCategories(groupId),
        fetchMappings(groupId),
        fetchCompanies(groupId),
        fetchCompanyMappings(groupId),
        fetchExternalCompanies(groupId)
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) loadData(selectedGroupId);
  }, [selectedGroupId]);

  const isExternalMapped = (externalId: string) =>
    mappings.some(m => m.external_category_id === externalId);

  const getCategoryMappings = (categoryId: string) =>
    mappings.filter(m => m.category_id === categoryId);

  const getExternalCategoryById = (externalId: string) =>
    externalCategories.find(e => e.id === externalId);

  const formatExternalPath = (cat: ExternalCategory) =>
    [cat.layer_01, cat.layer_02, cat.layer_03, cat.layer_04].filter(Boolean).join(' > ');

  /** Apenas Layer 02 e Layer 04 */
  const formatExternalPathTwoLayers = (cat: ExternalCategory) =>
    [cat.layer_02, cat.layer_04].filter(Boolean).join(' - ') || formatExternalPath(cat);

  /** Receita = azul, Despesa = laranja (baseado no primeiro layer) */
  const getTipoFromExternalCategory = (cat: ExternalCategory): 'receita' | 'despesa' => {
    const first = (cat.layer_01 || '').toLowerCase();
    if (first.includes('receita')) return 'receita';
    return 'despesa';
  };

  const getCompanyDisplayName = (externalCompanyId?: string): string => {
    if (!externalCompanyId) return '';
    const ext = externalCompanies.find(
      ec => ec.id === externalCompanyId || ec.external_id === externalCompanyId || (ec as any).external_code === externalCompanyId
    );
    if (!ext) return externalCompanyId;
    const mapping = companyMappings.find(m => m.external_company_id === ext.id);
    if (mapping) {
      const internal = companies.find(c => c.id === mapping.company_id);
      if (internal) return internal.name;
    }
    return ext.name || ext.external_id || externalCompanyId;
  };

  const handleCreateMapping = async (categoryId: string, externalCategoryId: string) => {
    if (!selectedGroupId) return;
    try {
      const res = await fetch('/api/mappings/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_group_id: selectedGroupId,
          category_id: categoryId,
          external_category_id: externalCategoryId
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

  const handleRemoveMapping = async (mappingId: string) => {
    try {
      const res = await fetch(`/api/mappings/categories?id=${mappingId}`, { method: 'DELETE' });
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

  const handleDragStart = (e: DragEvent<HTMLDivElement>, extCat: ExternalCategory) => {
    setDraggedCategory(extCat);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', extCat.id);
  };

  const handleDragEnd = () => {
    setDraggedCategory(null);
    setDropTargetId(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, categoryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetId(categoryId);
  };

  const handleDragLeave = () => setDropTargetId(null);

  const handleDrop = async (e: DragEvent<HTMLDivElement>, categoryId: string) => {
    e.preventDefault();
    setDropTargetId(null);
    if (draggedCategory) {
      await handleCreateMapping(categoryId, draggedCategory.id);
    }
    setDraggedCategory(null);
  };

  const filteredCategories = (categories || []).filter(cat => {
    const matchesSearch =
      cat.name.toLowerCase().includes(searchInternal.toLowerCase()) ||
      (cat.code && cat.code.toLowerCase().includes(searchInternal.toLowerCase()));
    const matchesType = filterType === 'all' || cat.type === filterType;
    if (!matchesSearch || !matchesType) return false;
    const hasMappings = getCategoryMappings(cat.id).length > 0;
    if (filterInternal === 'mapped' && !hasMappings) return false;
    if (filterInternal === 'unmapped' && hasMappings) return false;
    return true;
  });

  const filteredExternalCategories = (externalCategories || []).filter(ext => {
    const path = formatExternalPath(ext).toLowerCase();
    const pathTwo = formatExternalPathTwoLayers(ext).toLowerCase();
    const id = (ext.external_id || '').toLowerCase();
    const companyName = getCompanyDisplayName(ext.external_company_id).toLowerCase();
    const search = searchExternal.toLowerCase();
    const matchesSearch =
      path.includes(search) || pathTwo.includes(search) || id.includes(search) || companyName.includes(search);
    if (!matchesSearch) return false;
    const isMapped = isExternalMapped(ext.id);
    if (filterExternal === 'mapped' && !isMapped) return false;
    if (filterExternal === 'unmapped' && isMapped) return false;
    return true;
  });

  const totalPagesInternal = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE);
  const startIndexInternal = (currentPageInternal - 1) * ITEMS_PER_PAGE;
  const endIndexInternal = startIndexInternal + ITEMS_PER_PAGE;
  const paginatedCategories = filteredCategories.slice(startIndexInternal, endIndexInternal);

  const totalPagesExternal = Math.ceil(filteredExternalCategories.length / ITEMS_PER_PAGE);
  const startIndexExternal = (currentPageExternal - 1) * ITEMS_PER_PAGE;
  const endIndexExternal = startIndexExternal + ITEMS_PER_PAGE;
  const paginatedExternalCategories = filteredExternalCategories.slice(startIndexExternal, endIndexExternal);

  useEffect(() => {
    setCurrentPageInternal(1);
  }, [searchInternal, filterInternal, filterType]);

  useEffect(() => {
    setCurrentPageExternal(1);
  }, [searchExternal, filterExternal]);

  const totalInternal = categories?.length || 0;
  const mappedInternal = categories?.filter(c => getCategoryMappings(c.id).length > 0).length || 0;
  const totalExternal = externalCategories?.length || 0;
  const mappedExternal = externalCategories?.filter(c => isExternalMapped(c.id)).length || 0;

  return (
    <div className="flex flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conciliação de Categorias</h1>
          <p className="text-gray-500 text-sm">Arraste as categorias externas para vincular com as categorias analíticas do sistema</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push('/cadastros/categorias')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Categorias
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
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
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione o grupo</option>
              {groups.map((group: any) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="w-40">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'entrada' | 'saida')}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          <span className="text-gray-700 font-medium">{mappedInternal}/{totalInternal}</span>
          <span className="text-gray-600 text-sm ml-2">categorias vinculadas</span>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          <span className="text-gray-700 font-medium">{mappedExternal}/{totalExternal}</span>
          <span className="text-gray-600 text-sm ml-2">externas mapeadas</span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : !selectedGroupId ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <FolderTree size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Selecione um grupo</h2>
          <p className="text-gray-500">Escolha um grupo para iniciar a conciliação</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
          {/* Coluna esquerda - Categorias do sistema */}
          <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Leaf size={20} className="text-blue-600" />
                  <h2 className="font-semibold text-gray-900">Categorias Analíticas</h2>
                </div>
                <span className="text-gray-600 text-sm">{filteredCategories.length} categorias</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar categoria..."
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

            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ height: '1200px' }}>
              {paginatedCategories.map((category) => {
                const catMappings = getCategoryMappings(category.id);
                const isDropTarget = dropTargetId === category.id;
                return (
                  <div
                    key={category.id}
                    onDragOver={(e) => handleDragOver(e, category.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, category.id)}
                    className={`rounded-xl border-2 transition-all duration-200 ${
                      isDropTarget
                        ? 'border-blue-500 scale-[1.02] shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            category.type === 'entrada' ? 'bg-green-100' : 'bg-red-100'
                          } ${catMappings.length > 0 ? 'ring-2 ring-green-300' : ''}`}
                        >
                          <Leaf
                            size={20}
                            className={category.type === 'entrada' ? 'text-green-600' : 'text-red-600'}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{category.name}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {category.code && (
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
                                {category.code}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                category.type === 'entrada' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {category.type === 'entrada' ? 'Entrada' : 'Saída'}
                            </span>
                          </div>
                        </div>
                        {catMappings.length > 0 && (
                          <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                            <Check size={12} />
                            {catMappings.length}
                          </div>
                        )}
                      </div>

                      {catMappings.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {catMappings.map((mapping) => {
                            const extCat = getExternalCategoryById(mapping.external_category_id);
                            const companyName = extCat ? getCompanyDisplayName(extCat.external_company_id) : '';
                            return (
                              <div
                                key={mapping.id}
                                className="flex items-center gap-2 border border-green-200 rounded-lg p-2"
                              >
                                <Link2 size={14} className="text-green-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-green-800 truncate">
                                    {extCat ? formatExternalPathTwoLayers(extCat) : 'N/A'}
                                  </p>
                                  {companyName && (
                                    <p className="text-xs text-green-600">{companyName}</p>
                                  )}
                                  {extCat?.external_id && (
                                    <p className="text-xs text-gray-500">ID: {extCat.external_id}</p>
                                  )}
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
                        <div
                          className={`mt-3 border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
                            isDropTarget ? 'border-blue-400' : 'border-gray-300'
                          }`}
                        >
                          <p
                            className={`text-sm ${
                              isDropTarget ? 'text-blue-600 font-medium' : 'text-gray-400'
                            }`}
                          >
                            {isDropTarget
                              ? '✓ Solte aqui para vincular'
                              : 'Arraste uma categoria externa aqui'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredCategories.length > 0 ? (
                  <>
                    Mostrando {startIndexInternal + 1} a{' '}
                    {Math.min(endIndexInternal, filteredCategories.length)} de{' '}
                    {filteredCategories.length} categorias
                  </>
                ) : (
                  <>Nenhuma categoria encontrada</>
                )}
              </div>
              {totalPagesInternal > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPageInternal((p) => Math.max(1, p - 1))}
                    disabled={currentPageInternal === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPageInternal} de {totalPagesInternal}
                  </span>
                  <button
                    onClick={() => setCurrentPageInternal((p) => Math.min(totalPagesInternal, p + 1))}
                    disabled={currentPageInternal === totalPagesInternal}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Coluna direita - Categorias externas */}
          <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FolderTree size={20} className="text-orange-600" />
                  <h2 className="font-semibold text-gray-900">Categorias (Banco de Dados)</h2>
                </div>
                <span className="text-gray-600 text-sm">{filteredExternalCategories.length} categorias</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar categoria..."
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

            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ height: '1200px' }}>
              {paginatedExternalCategories.map((extCat) => {
                const isMapped = isExternalMapped(extCat.id);
                const isDragging = draggedCategory?.id === extCat.id;
                const tipo = getTipoFromExternalCategory(extCat);
                const companyName = getCompanyDisplayName(extCat.external_company_id);
                return (
                  <div
                    key={extCat.id}
                    draggable={!isMapped}
                    onDragStart={(e) => handleDragStart(e, extCat)}
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
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isMapped
                            ? 'bg-green-100'
                            : tipo === 'receita'
                            ? 'bg-blue-100'
                            : 'bg-orange-100'
                        }`}
                      >
                        {isMapped ? (
                          <Check size={20} className="text-green-600" />
                        ) : (
                          <FolderTree
                            size={20}
                            className={tipo === 'receita' ? 'text-blue-600' : 'text-orange-600'}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate text-sm">
                          {formatExternalPathTwoLayers(extCat)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                          {companyName && (
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">
                              {companyName}
                            </span>
                          )}
                          <span>ID: {extCat.external_id}</span>
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

              {paginatedExternalCategories.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <FolderTree size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhuma categoria externa</p>
                  <p className="text-sm">Sincronize os dados do Power BI primeiro</p>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredExternalCategories.length > 0 ? (
                  <>
                    Mostrando {startIndexExternal + 1} a{' '}
                    {Math.min(endIndexExternal, filteredExternalCategories.length)} de{' '}
                    {filteredExternalCategories.length} categorias
                  </>
                ) : (
                  <>Nenhuma categoria encontrada</>
                )}
              </div>
              {totalPagesExternal > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPageExternal((p) => Math.max(1, p - 1))}
                    disabled={currentPageExternal === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPageExternal} de {totalPagesExternal}
                  </span>
                  <button
                    onClick={() => setCurrentPageExternal((p) => Math.min(totalPagesExternal, p + 1))}
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

      {draggedCategory && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
          <Link2 size={18} />
          <span>Solte na categoria analítica para vincular</span>
        </div>
      )}
    </div>
  );
}
