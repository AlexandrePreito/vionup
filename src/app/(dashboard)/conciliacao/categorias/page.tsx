'use client';

import { useState, useEffect } from 'react';
import { FolderTree, Leaf, Search, Loader2, Link2, ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { Category, ExternalCategory, CategoryMapping, CompanyGroup } from '@/types';
import { useGroupFilter } from '@/hooks/useGroupFilter';

const ITEMS_PER_PAGE = 20;

export default function ConciliacaoCategoriasPage() {
  const router = useRouter();
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [externalCategories, setExternalCategories] = useState<ExternalCategory[]>([]);
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInternal, setSearchInternal] = useState('');
  const [searchExternal, setSearchExternal] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'entrada' | 'saida'>('all');
  
  // Paginação
  const [internalPage, setInternalPage] = useState(1);
  const [externalPage, setExternalPage] = useState(1);
  
  // Drag and drop
  const [draggingCategory, setDraggingCategory] = useState<Category | null>(null);

  // Buscar categorias internas (apenas analíticas)
  const fetchCategories = async () => {
    if (!selectedGroupId) return;
    
    try {
      const res = await fetch(`/api/categories?group_id=${selectedGroupId}&analytical_only=true&include_inactive=true`);
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  // Buscar categorias externas
  const fetchExternalCategories = async () => {
    if (!selectedGroupId) return;
    
    try {
      const res = await fetch(`/api/external-categories?group_id=${selectedGroupId}`);
      const data = await res.json();
      setExternalCategories(data.externalCategories || []);
    } catch (error) {
      console.error('Erro ao buscar categorias externas:', error);
    }
  };

  // Buscar mapeamentos
  const fetchMappings = async () => {
    if (!selectedGroupId) return;
    
    try {
      const res = await fetch(`/api/mappings/categories?group_id=${selectedGroupId}`);
      const data = await res.json();
      setMappings(data.mappings || []);
    } catch (error) {
      console.error('Erro ao buscar mapeamentos:', error);
    }
  };

  // Carregar dados
  const loadData = async () => {
    if (!selectedGroupId) return;
    
    setLoading(true);
    await Promise.all([
      fetchCategories(),
      fetchExternalCategories(),
      fetchMappings()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedGroupId) {
      loadData();
    }
  }, [selectedGroupId]);

  // Filtrar categorias internas
  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchInternal.toLowerCase()) ||
                          (cat.code && cat.code.toLowerCase().includes(searchInternal.toLowerCase()));
    const matchesType = filterType === 'all' || cat.type === filterType;
    return matchesSearch && matchesType;
  });

  // Filtrar categorias externas
  const filteredExternalCategories = externalCategories.filter(cat => {
    const fullPath = [cat.layer_01, cat.layer_02, cat.layer_03, cat.layer_04]
      .filter(Boolean)
      .join(' > ')
      .toLowerCase();
    return fullPath.includes(searchExternal.toLowerCase()) ||
           cat.external_id.toLowerCase().includes(searchExternal.toLowerCase());
  });

  // Paginação interna
  const totalInternalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE);
  const paginatedCategories = filteredCategories.slice(
    (internalPage - 1) * ITEMS_PER_PAGE,
    internalPage * ITEMS_PER_PAGE
  );

  // Paginação externa
  const totalExternalPages = Math.ceil(filteredExternalCategories.length / ITEMS_PER_PAGE);
  const paginatedExternalCategories = filteredExternalCategories.slice(
    (externalPage - 1) * ITEMS_PER_PAGE,
    externalPage * ITEMS_PER_PAGE
  );

  // Verificar se categoria externa está mapeada
  const isExternalMapped = (externalCategoryId: string) => {
    return mappings.some(m => m.external_category_id === externalCategoryId);
  };

  // Obter mapeamento de categoria interna
  const getCategoryMappings = (categoryId: string) => {
    return mappings.filter(m => m.category_id === categoryId);
  };

  // Criar mapeamento via drag and drop
  const handleDrop = async (externalCategory: ExternalCategory) => {
    if (!draggingCategory) return;

    try {
      const res = await fetch('/api/mappings/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_group_id: selectedGroupId,
          category_id: draggingCategory.id,
          external_category_id: externalCategory.id
        })
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao criar mapeamento');
        return;
      }

      fetchMappings();
    } catch (error) {
      console.error('Erro ao criar mapeamento:', error);
      alert('Erro ao criar mapeamento');
    } finally {
      setDraggingCategory(null);
    }
  };

  // Remover mapeamento
  const handleRemoveMapping = async (mappingId: string) => {
    try {
      const res = await fetch(`/api/mappings/categories?id=${mappingId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        alert('Erro ao remover mapeamento');
        return;
      }

      fetchMappings();
    } catch (error) {
      console.error('Erro ao remover mapeamento:', error);
      alert('Erro ao remover mapeamento');
    }
  };

  // Formatar caminho da categoria externa
  const formatExternalPath = (cat: ExternalCategory) => {
    return [cat.layer_01, cat.layer_02, cat.layer_03, cat.layer_04]
      .filter(Boolean)
      .join(' > ');
  };

  // Estatísticas
  const totalInternal = categories.length;
  const totalExternal = externalCategories.length;
  const mappedExternal = new Set(mappings.map(m => m.external_category_id)).size;
  const unmappedExternal = totalExternal - mappedExternal;

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conciliação de Categorias</h1>
          <p className="text-gray-500 mt-1">Vincule categorias analíticas às categorias importadas</p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/cadastros/categorias')}>
          <ArrowLeft size={18} className="mr-2" />
          Categorias
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
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
              <option value="">Selecione um grupo</option>
              {groups.map((group: any) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Tipo */}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'entrada' | 'saida')}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todas</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
        </div>
      </div>

      {/* Estatísticas */}
      {selectedGroupId && !loading && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-gray-900">{totalInternal}</div>
            <div className="text-sm text-gray-500">Categorias Internas</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-gray-900">{totalExternal}</div>
            <div className="text-sm text-gray-500">Categorias Externas</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-green-600">{mappedExternal}</div>
            <div className="text-sm text-gray-500">Mapeadas</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-orange-600">{unmappedExternal}</div>
            <div className="text-sm text-gray-500">Não Mapeadas</div>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <Loader2 size={48} className="mx-auto text-gray-300 mb-4 animate-spin" />
          <p className="text-gray-500">Carregando categorias...</p>
        </div>
      ) : !selectedGroupId ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <FolderTree size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Selecione um grupo</h2>
            <p className="text-gray-500">Escolha um grupo para iniciar a conciliação</p>
          </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Coluna Esquerda - Categorias Internas */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Leaf size={20} className="text-blue-600" />
                  Categorias Analíticas ({filteredCategories.length})
                </h3>
              </div>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar categoria..."
                  value={searchInternal}
                  onChange={(e) => { setSearchInternal(e.target.value); setInternalPage(1); }}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-4 space-y-2" style={{ minHeight: '500px', maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
              {paginatedCategories.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma categoria analítica encontrada
                </div>
              ) : (
                paginatedCategories.map((category) => {
                  const catMappings = getCategoryMappings(category.id);
                  
                  return (
                    <div
                      key={category.id}
                      draggable
                      onDragStart={() => setDraggingCategory(category)}
                      onDragEnd={() => setDraggingCategory(null)}
                      className={`p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-all ${
                        draggingCategory?.id === category.id
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          category.type === 'entrada' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <Leaf size={16} className={category.type === 'entrada' ? 'text-green-600' : 'text-red-600'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{category.name}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {category.code && (
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
                                {category.code}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              category.type === 'entrada' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {category.type === 'entrada' ? 'Entrada' : 'Saída'}
                            </span>
                          </div>
                          
                          {/* Mapeamentos */}
                          {catMappings.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {catMappings.map((mapping) => (
                                <div key={mapping.id} className="flex items-center justify-between bg-green-50 rounded px-2 py-1 text-xs">
                                  <span className="text-green-700 truncate flex-1">
                                    {mapping.external_category ? formatExternalPath(mapping.external_category) : 'N/A'}
                                  </span>
                                  <button
                                    onClick={() => handleRemoveMapping(mapping.id)}
                                    className="p-0.5 text-red-500 hover:bg-red-100 rounded ml-2"
                                    title="Remover vínculo"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {catMappings.length > 0 && (
                          <div className="text-green-600">
                            <Link2 size={18} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Paginação Interna */}
            {totalInternalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {(internalPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(internalPage * ITEMS_PER_PAGE, filteredCategories.length)} de {filteredCategories.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInternalPage(p => Math.max(1, p - 1))}
                    disabled={internalPage === 1}
                    className="p-1 rounded border border-gray-300 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>{internalPage}/{totalInternalPages}</span>
                  <button
                    onClick={() => setInternalPage(p => Math.min(totalInternalPages, p + 1))}
                    disabled={internalPage === totalInternalPages}
                    className="p-1 rounded border border-gray-300 disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita - Categorias Externas */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FolderTree size={20} className="text-orange-600" />
                  Categorias Externas ({filteredExternalCategories.length})
                </h3>
              </div>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar categoria externa..."
                  value={searchExternal}
                  onChange={(e) => { setSearchExternal(e.target.value); setExternalPage(1); }}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-4 space-y-2" style={{ minHeight: '500px', maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
              {paginatedExternalCategories.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma categoria externa encontrada
                </div>
              ) : (
                paginatedExternalCategories.map((extCat) => {
                  const isMapped = isExternalMapped(extCat.id);
                  
                  return (
                    <div
                      key={extCat.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                        handleDrop(extCat);
                      }}
                      className={`p-3 rounded-lg border transition-all ${
                        isMapped
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isMapped ? 'bg-green-100' : 'bg-orange-100'
                        }`}>
                          <FolderTree size={16} className={isMapped ? 'text-green-600' : 'text-orange-600'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">
                            {formatExternalPath(extCat)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            ID: {extCat.external_id}
                          </p>
                        </div>
                        {isMapped && (
                          <div className="text-green-600">
                            <Link2 size={18} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Paginação Externa */}
            {totalExternalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {(externalPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(externalPage * ITEMS_PER_PAGE, filteredExternalCategories.length)} de {filteredExternalCategories.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExternalPage(p => Math.max(1, p - 1))}
                    disabled={externalPage === 1}
                    className="p-1 rounded border border-gray-300 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>{externalPage}/{totalExternalPages}</span>
                  <button
                    onClick={() => setExternalPage(p => Math.min(totalExternalPages, p + 1))}
                    disabled={externalPage === totalExternalPages}
                    className="p-1 rounded border border-gray-300 disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instrução de uso */}
      {selectedGroupId && !loading && categories.length > 0 && externalCategories.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <strong>Dica:</strong> Arraste uma categoria analítica da esquerda e solte sobre uma categoria externa da direita para criar o vínculo.
        </div>
      )}
    </div>
  );
}
