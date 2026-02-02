'use client';

import { useState, useEffect, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Link2, Package, GripVertical, Check, X, Plus, ChevronDown } from 'lucide-react';
import { Button, Modal, Input } from '@/components/ui';
import { Product, ExternalProduct, ProductMapping, CompanyGroup, Company, CompanyMapping, ExternalCompany } from '@/types';
import { useGroupFilter } from '@/hooks/useGroupFilter';

export default function ConciliacaoProdutosPage() {
  const router = useRouter();
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [externalProducts, setExternalProducts] = useState<ExternalProduct[]>([]);
  const [mappings, setMappings] = useState<ProductMapping[]>([]);
  const [companyMappings, setCompanyMappings] = useState<CompanyMapping[]>([]);
  const [externalCompanies, setExternalCompanies] = useState<ExternalCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInternal, setSearchInternal] = useState('');
  const [searchExternal, setSearchExternal] = useState('');
  
  // Drag and Drop
  const [draggedProduct, setDraggedProduct] = useState<ExternalProduct | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  
  // Filtros
  const [filterInternal, setFilterInternal] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [filterExternal, setFilterExternal] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [selectedProductGroups, setSelectedProductGroups] = useState<string[]>([]);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [selectedCompanyFilters, setSelectedCompanyFilters] = useState<string[]>([]);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  
  // Paginação
  const ITEMS_PER_PAGE = 20;
  const [currentPageInternal, setCurrentPageInternal] = useState(1);
  const [currentPageExternal, setCurrentPageExternal] = useState(1);

  // Modal para adicionar produto
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [selectedExternalProduct, setSelectedExternalProduct] = useState<ExternalProduct | null>(null);
  const [newProductForm, setNewProductForm] = useState({
    company_group_id: '',
    name: '',
    code: '',
    category: '',
    description: ''
  });
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Buscar empresas
  const fetchCompanies = async (groupId: string) => {
    try {
      const res = await fetch(`/api/companies?group_id=${groupId}`);
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

  // Buscar produtos internos
  const fetchProducts = async (groupId: string) => {
    try {
      const res = await fetch(`/api/products?group_id=${groupId}&include_inactive=true`);
      if (!res.ok) {
        console.error('Erro ao buscar produtos:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  // Buscar produtos externos
  const fetchExternalProducts = async (groupId: string) => {
    try {
      const res = await fetch(`/api/external-products?group_id=${groupId}`);
      if (!res.ok) {
        console.error('Erro ao buscar produtos externos:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      setExternalProducts(data.externalProducts || []);
    } catch (error) {
      console.error('Erro ao buscar produtos externos:', error);
    }
  };

  // Buscar mapeamentos de produtos
  const fetchMappings = async (groupId: string) => {
    try {
      const res = await fetch(`/api/mappings/products?group_id=${groupId}`);
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

  // Buscar mapeamentos de empresas
  const fetchCompanyMappings = async (groupId: string) => {
    try {
      const res = await fetch(`/api/mappings/companies?group_id=${groupId}`);
      if (!res.ok) {
        console.error('Erro ao buscar mapeamentos de empresas:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      setCompanyMappings(data.mappings || []);
    } catch (error) {
      console.error('Erro ao buscar mapeamentos de empresas:', error);
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

  // Carregar dados quando selecionar grupo
  const loadData = async (groupId: string) => {
    if (!groupId) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchProducts(groupId),
        fetchExternalProducts(groupId),
        fetchMappings(groupId),
        fetchCompanyMappings(groupId),
        fetchExternalCompanies(groupId),
        fetchCompanies(groupId)
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

  // Verificar se produto externo está mapeado
  const isExternalMapped = (externalId: string) => {
    return mappings.some(m => m.external_product_id === externalId);
  };

  // Obter mapeamentos de um produto interno
  const getProductMappings = (productId: string) => {
    return mappings.filter(m => m.product_id === productId);
  };

  // Obter produto externo pelo ID
  const getExternalProductById = (externalId: string) => {
    return externalProducts.find(e => e.id === externalId);
  };

  // Obter empresa interna pelo external_company_id do produto externo
  const getInternalCompanyByExternalCompanyId = (externalCompanyIdCode?: string) => {
    if (!externalCompanyIdCode) return null;
    
    const externalCompany = externalCompanies.find(
      ec => ec.external_id === externalCompanyIdCode || ec.external_code === externalCompanyIdCode
    );
    if (!externalCompany) return null;
    
    const mapping = companyMappings.find(m => m.external_company_id === externalCompany.id);
    if (!mapping) return null;
    
    return companies.find(c => c.id === mapping.company_id);
  };

  // Criar mapeamento via drag and drop
  const handleCreateMapping = async (productId: string, externalProductId: string) => {
    if (!selectedGroupId) return;

    try {
      const res = await fetch('/api/mappings/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_group_id: selectedGroupId,
          product_id: productId,
          external_product_id: externalProductId
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
      const res = await fetch(`/api/mappings/products?id=${mappingId}`, {
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
  const handleDragStart = (e: DragEvent<HTMLDivElement>, product: ExternalProduct) => {
    setDraggedProduct(product);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', product.id);
  };

  const handleDragEnd = () => {
    setDraggedProduct(null);
    setDropTargetId(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, productId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetId(productId);
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, productId: string) => {
    e.preventDefault();
    setDropTargetId(null);
    
    if (draggedProduct) {
      await handleCreateMapping(productId, draggedProduct.id);
    }
    
    setDraggedProduct(null);
  };

  // Filtrar produtos internos
  const filteredProducts = (products || []).filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchInternal.toLowerCase()) ||
      product.code?.toLowerCase().includes(searchInternal.toLowerCase());
    
    if (!matchesSearch) return false;
    
    const hasMappings = getProductMappings(product.id).length > 0;
    if (filterInternal === 'mapped' && !hasMappings) return false;
    if (filterInternal === 'unmapped' && hasMappings) return false;
    
    return true;
  });

  // Extrair grupos únicos dos produtos externos
  const uniqueProductGroups = Array.from(
    new Set(
      (externalProducts || [])
        .map(p => p.product_group)
        .filter((g): g is string => !!g && g.trim() !== '')
    )
  ).sort();

  // Filtrar grupos pelo termo de busca
  const filteredUniqueGroups = uniqueProductGroups.filter(g =>
    g.toLowerCase().includes(groupSearchTerm.toLowerCase())
  );

  // Toggle grupo selecionado
  const toggleProductGroup = (group: string) => {
    setSelectedProductGroups(prev => 
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  // Extrair empresas únicas dos produtos externos (usando external_company_id)
  const uniqueCompanyIds = Array.from(
    new Set(
      (externalProducts || [])
        .map(p => p.external_company_id)
        .filter((c): c is string => !!c && c.trim() !== '')
    )
  ).sort();

  // Mapear IDs de empresa para nomes (usando externalCompanies ou companies)
  const getCompanyDisplayName = (externalCompanyId: string) => {
    const extCompany = externalCompanies.find(
      ec => ec.external_id === externalCompanyId || ec.external_code === externalCompanyId
    );
    if (extCompany) {
      const mapping = companyMappings.find(m => m.external_company_id === extCompany.id);
      if (mapping) {
        const internalCompany = companies.find(c => c.id === mapping.company_id);
        if (internalCompany) return internalCompany.name;
      }
      return extCompany.name || externalCompanyId;
    }
    return externalCompanyId;
  };

  // Filtrar empresas pelo termo de busca
  const filteredUniqueCompanies = uniqueCompanyIds.filter(c =>
    getCompanyDisplayName(c).toLowerCase().includes(companySearchTerm.toLowerCase())
  );

  // Toggle empresa selecionada
  const toggleCompanyFilter = (companyId: string) => {
    setSelectedCompanyFilters(prev => 
      prev.includes(companyId)
        ? prev.filter(c => c !== companyId)
        : [...prev, companyId]
    );
  };

  // Filtrar produtos externos
  const filteredExternalProducts = (externalProducts || []).filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchExternal.toLowerCase()) ||
      product.external_id?.toLowerCase().includes(searchExternal.toLowerCase()) ||
      product.external_code?.toLowerCase().includes(searchExternal.toLowerCase()) ||
      product.product_group?.toLowerCase().includes(searchExternal.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Filtro de grupos selecionados
    if (selectedProductGroups.length > 0) {
      if (!product.product_group || !selectedProductGroups.includes(product.product_group)) {
        return false;
      }
    }

    // Filtro de empresas selecionadas
    if (selectedCompanyFilters.length > 0) {
      if (!product.external_company_id || !selectedCompanyFilters.includes(product.external_company_id)) {
        return false;
      }
    }
    
    const isMapped = isExternalMapped(product.id);
    if (filterExternal === 'mapped' && !isMapped) return false;
    if (filterExternal === 'unmapped' && isMapped) return false;
    
    return true;
  });

  // Paginação para produtos internos
  const totalPagesInternal = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndexInternal = (currentPageInternal - 1) * ITEMS_PER_PAGE;
  const endIndexInternal = startIndexInternal + ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndexInternal, endIndexInternal);

  // Paginação para produtos externos
  const totalPagesExternal = Math.ceil(filteredExternalProducts.length / ITEMS_PER_PAGE);
  const startIndexExternal = (currentPageExternal - 1) * ITEMS_PER_PAGE;
  const endIndexExternal = startIndexExternal + ITEMS_PER_PAGE;
  const paginatedExternalProducts = filteredExternalProducts.slice(startIndexExternal, endIndexExternal);

  // Resetar páginas quando filtrar
  useEffect(() => {
    setCurrentPageInternal(1);
  }, [searchInternal, filterInternal]);

  useEffect(() => {
    setCurrentPageExternal(1);
  }, [searchExternal, filterExternal, selectedProductGroups, selectedCompanyFilters]);

  // Abrir modal para adicionar produto
  const handleOpenAddProduct = (externalProduct: ExternalProduct) => {
    setSelectedExternalProduct(externalProduct);
    setNewProductForm({
      company_group_id: selectedGroupId || '',
      name: externalProduct.name || '',
      code: externalProduct.external_code || externalProduct.external_id || '',
      category: externalProduct.product_group || externalProduct.category || '',
      description: ''
    });
    setIsAddProductModalOpen(true);
  };

  // Criar produto a partir do externo
  const handleCreateProduct = async () => {
    if (!newProductForm.company_group_id || !newProductForm.name) {
      alert('Grupo e nome são obrigatórios');
      return;
    }

    try {
      setCreatingProduct(true);
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProductForm)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao criar produto');
        return;
      }

      // Criar mapeamento automaticamente
      if (selectedGroupId && selectedExternalProduct) {
        try {
          await fetch('/api/mappings/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              company_group_id: selectedGroupId,
              product_id: data.product.id,
              external_product_id: selectedExternalProduct.id
            })
          });
        } catch (error) {
          console.error('Erro ao criar mapeamento:', error);
        }
      }

      alert('Produto criado com sucesso!');
      setIsAddProductModalOpen(false);
      setSelectedExternalProduct(null);
      
      // Recarregar dados
      if (selectedGroupId) {
        await loadData(selectedGroupId);
      }
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      alert('Erro ao criar produto');
    } finally {
      setCreatingProduct(false);
    }
  };

  // Estatísticas
  const totalInternal = products?.length || 0;
  const mappedInternal = products?.filter(p => getProductMappings(p.id).length > 0).length || 0;
  const totalExternal = externalProducts?.length || 0;
  const mappedExternal = externalProducts?.filter(p => isExternalMapped(p.id)).length || 0;

  return (
    <div className="flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conciliação de Produtos</h1>
          <p className="text-gray-500 text-sm">Arraste os produtos externos para vincular com os produtos do sistema</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push('/cadastros/produtos')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Produtos
          </Button>
        </div>
      </div>

      {/* Filtros */}
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
      </div>

      {/* Estatísticas */}
      <div className="flex gap-4 mb-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          <span className="text-gray-700 font-medium">{mappedInternal}/{totalInternal}</span>
          <span className="text-gray-600 text-sm ml-2">produtos vinculados</span>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          <span className="text-gray-700 font-medium">{mappedExternal}/{totalExternal}</span>
          <span className="text-gray-600 text-sm ml-2">externos mapeados</span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
          {/* Lado Esquerdo - Produtos do Sistema */}
          <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-blue-600" />
                  <h2 className="font-semibold text-gray-900">Produtos do Sistema</h2>
                </div>
                <span className="text-gray-600 text-sm">{filteredProducts.length} produtos</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar produto..."
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
                  <option value="all">Todos</option>
                  <option value="mapped">Vinculados</option>
                  <option value="unmapped">Não vinculados</option>
                </select>
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ height: '1200px' }}>
              {paginatedProducts.map((product) => {
                const productMappings = getProductMappings(product.id);
                const isDropTarget = dropTargetId === product.id;
                
                return (
                  <div
                    key={product.id}
                    onDragOver={(e) => handleDragOver(e, product.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, product.id)}
                    className={`rounded-xl border-2 transition-all duration-200 ${
                      isDropTarget 
                        ? 'border-blue-500 scale-[1.02] shadow-lg' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Card do produto */}
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          productMappings.length > 0 ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <Package size={20} className={productMappings.length > 0 ? 'text-green-600' : 'text-blue-600'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {product.code && (
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
                                {product.code}
                              </span>
                            )}
                          </div>
                        </div>
                        {productMappings.length > 0 && (
                          <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                            <Check size={12} />
                            {productMappings.length}
                          </div>
                        )}
                      </div>

                      {/* Área de drop / Mapeamentos existentes */}
                      {productMappings.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {productMappings.map((mapping) => {
                            const extProduct = getExternalProductById(mapping.external_product_id);
                            return (
                              <div
                                key={mapping.id}
                                className="flex items-center gap-2 border border-green-200 rounded-lg p-2"
                              >
                                <Link2 size={14} className="text-green-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-green-800 truncate">
                                    {extProduct?.name || 'N/A'}
                                  </p>
                                  <p className="text-xs text-green-600">
                                    {extProduct?.external_id || extProduct?.external_code}
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
                            {isDropTarget ? '✓ Solte aqui para vincular' : 'Arraste um produto externo aqui'}
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
                {filteredProducts.length > 0 ? (
                  <>Mostrando {startIndexInternal + 1} a {Math.min(endIndexInternal, filteredProducts.length)} de {filteredProducts.length} produtos</>
                ) : (
                  <>Nenhum produto encontrado</>
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

          {/* Lado Direito - Produtos Externos */}
          <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-orange-600" />
                  <h2 className="font-semibold text-gray-900">Produtos (Banco de Dados)</h2>
                </div>
                <span className="text-gray-600 text-sm">{filteredExternalProducts.length} produtos</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar produto..."
                    value={searchExternal}
                    onChange={(e) => setSearchExternal(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Dropdown de Grupos */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsGroupDropdownOpen(!isGroupDropdownOpen);
                      setIsCompanyDropdownOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer min-w-[130px]"
                  >
                    <span className="truncate">
                      {selectedProductGroups.length === 0 
                        ? 'Grupos' 
                        : `${selectedProductGroups.length} grupo${selectedProductGroups.length > 1 ? 's' : ''}`}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${isGroupDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isGroupDropdownOpen && (
                    <>
                      {/* Overlay para fechar ao clicar fora */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => {
                          setIsGroupDropdownOpen(false);
                          setGroupSearchTerm('');
                        }} 
                      />
                      
                      {/* Dropdown menu */}
                      <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                        {/* Campo de busca */}
                        <div className="p-2 border-b border-gray-100">
                          <input
                            type="text"
                            placeholder="Buscar grupo..."
                            value={groupSearchTerm}
                            onChange={(e) => setGroupSearchTerm(e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>
                        
                        {/* Botão limpar */}
                        {selectedProductGroups.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedProductGroups([])}
                            className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 border-b border-gray-100"
                          >
                            Limpar seleção
                          </button>
                        )}
                        
                        <div className="max-h-52 overflow-y-auto">
                          {filteredUniqueGroups.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              Nenhum grupo encontrado
                            </div>
                          ) : (
                            filteredUniqueGroups.map((group) => (
                              <label
                                key={group}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedProductGroups.includes(group)}
                                  onChange={() => toggleProductGroup(group)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 truncate">{group}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Dropdown de Empresas */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCompanyDropdownOpen(!isCompanyDropdownOpen);
                      setIsGroupDropdownOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer min-w-[130px]"
                  >
                    <span className="truncate">
                      {selectedCompanyFilters.length === 0 
                        ? 'Empresas' 
                        : `${selectedCompanyFilters.length} empresa${selectedCompanyFilters.length > 1 ? 's' : ''}`}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isCompanyDropdownOpen && (
                    <>
                      {/* Overlay para fechar ao clicar fora */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => {
                          setIsCompanyDropdownOpen(false);
                          setCompanySearchTerm('');
                        }} 
                      />
                      
                      {/* Dropdown menu */}
                      <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                        {/* Campo de busca */}
                        <div className="p-2 border-b border-gray-100">
                          <input
                            type="text"
                            placeholder="Buscar empresa..."
                            value={companySearchTerm}
                            onChange={(e) => setCompanySearchTerm(e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>
                        
                        {/* Botão limpar */}
                        {selectedCompanyFilters.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedCompanyFilters([])}
                            className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 border-b border-gray-100"
                          >
                            Limpar seleção
                          </button>
                        )}
                        
                        <div className="max-h-52 overflow-y-auto">
                          {filteredUniqueCompanies.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              Nenhuma empresa encontrada
                            </div>
                          ) : (
                            filteredUniqueCompanies.map((companyId) => (
                              <label
                                key={companyId}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCompanyFilters.includes(companyId)}
                                  onChange={() => toggleCompanyFilter(companyId)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 truncate">{getCompanyDisplayName(companyId)}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <select
                  value={filterExternal}
                  onChange={(e) => setFilterExternal(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">Todos</option>
                  <option value="unmapped">Não mapeados</option>
                  <option value="mapped">Mapeados</option>
                </select>
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ height: '1200px' }}>
              {paginatedExternalProducts.map((product) => {
                const isMapped = isExternalMapped(product.id);
                const isDragging = draggedProduct?.id === product.id;
                const internalCompany = getInternalCompanyByExternalCompanyId(product.external_company_id);
                
                return (
                  <div
                    key={product.id}
                    draggable={!isMapped}
                    onDragStart={(e) => handleDragStart(e, product)}
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
                          <Package size={20} className="text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                          {internalCompany && (
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                              {internalCompany.name}
                            </span>
                          )}
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
                            {product.external_id || product.external_code}
                          </span>
                          {product.product_group && (
                            <span className="truncate">{product.product_group}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isMapped && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddProduct(product);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Adicionar ao sistema"
                          >
                            <Plus size={18} />
                          </button>
                        )}
                        {isMapped && (
                          <div className="text-green-600">
                            <Link2 size={18} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {paginatedExternalProducts.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <Package size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum produto externo</p>
                  <p className="text-sm">Sincronize os dados do Power BI primeiro</p>
                </div>
              )}
            </div>

            {/* Paginação */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredExternalProducts.length > 0 ? (
                  <>Mostrando {startIndexExternal + 1} a {Math.min(endIndexExternal, filteredExternalProducts.length)} de {filteredExternalProducts.length} produtos</>
                ) : (
                  <>Nenhum produto encontrado</>
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
      {draggedProduct && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
          <Link2 size={18} />
          <span>Solte no produto do sistema para vincular</span>
        </div>
      )}

      {/* Modal para adicionar produto */}
      <Modal
        isOpen={isAddProductModalOpen}
        onClose={() => {
          setIsAddProductModalOpen(false);
          setSelectedExternalProduct(null);
        }}
        title="Adicionar Produto ao Sistema"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome *
            </label>
            <Input
              type="text"
              value={newProductForm.name}
              onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
              placeholder="Nome do produto"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código
            </label>
            <Input
              type="text"
              value={newProductForm.code}
              onChange={(e) => setNewProductForm({ ...newProductForm, code: e.target.value })}
              placeholder="Código do produto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria
            </label>
            <Input
              type="text"
              value={newProductForm.category}
              onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
              placeholder="Categoria do produto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={newProductForm.description}
              onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
              placeholder="Descrição do produto"
              rows={3}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddProductModalOpen(false);
                setSelectedExternalProduct(null);
              }}
              disabled={creatingProduct}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateProduct}
              isLoading={creatingProduct}
              disabled={!newProductForm.name}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
