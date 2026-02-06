'use client';

import { useState, useEffect, useMemo, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, Loader2, Link2, ChevronLeft, ChevronRight, ArrowLeft, Boxes, X, GripVertical, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { RawMaterial, CompanyGroup, ExternalStock, Company, CompanyMapping, ExternalCompany } from '@/types';
import { useGroupFilter } from '@/hooks/useGroupFilter';

const ITEMS_PER_PAGE = 20;

export default function ConciliacaoEstoquePage() {
  const router = useRouter();
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [externalStock, setExternalStock] = useState<ExternalStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyMappings, setCompanyMappings] = useState<CompanyMapping[]>([]);
  const [externalCompanies, setExternalCompanies] = useState<ExternalCompany[]>([]);
  
  // Filtros e busca - Matérias-Primas
  const [searchMP, setSearchMP] = useState('');
  const [filterMPStatus, setFilterMPStatus] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [currentPageMP, setCurrentPageMP] = useState(1);
  
  // Filtros e busca - Estoque
  const [searchStock, setSearchStock] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [filterStockGroup, setFilterStockGroup] = useState<string>('all');
  const [currentPageStock, setCurrentPageStock] = useState(1);

  // Drag and Drop
  const [draggedStock, setDraggedStock] = useState<ExternalStock | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // Linking
  const [linking, setLinking] = useState(false);


  // Buscar matérias-primas com vínculos de estoque
  const fetchRawMaterials = async (groupId: string) => {
    try {
      const res = await fetch(`/api/raw-materials?group_id=${groupId}&include_products=true`);
      if (!res.ok) return;
      const data = await res.json();
      setRawMaterials(data.rawMaterials || []);
    } catch (error) {
      console.error('Erro ao buscar matérias-primas:', error);
    }
  };

  // Buscar estoque externo
  const fetchExternalStock = async (groupId: string) => {
    try {
      const res = await fetch(`/api/external-stock?group_id=${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setExternalStock(data.stock || []);
      } else {
        setExternalStock([]);
      }
    } catch (error) {
      console.error('Erro ao buscar estoque:', error);
      setExternalStock([]);
    }
  };

  // Buscar empresas
  const fetchCompanies = async (groupId: string) => {
    try {
      const res = await fetch(`/api/companies?group_id=${groupId}`);
      if (!res.ok) return;
      const data = await res.json();
      const companiesList = data.companies || [];
      // Filtro de segurança: garantir que apenas empresas do grupo selecionado sejam exibidas
      const filteredCompanies = companiesList.filter((c: any) => c.company_group_id === groupId);
      setCompanies(filteredCompanies);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  // Buscar mapeamentos de empresas
  const fetchCompanyMappings = async (groupId: string) => {
    try {
      const res = await fetch(`/api/mappings/companies?group_id=${groupId}`);
      if (!res.ok) return;
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
      if (!res.ok) return;
      const data = await res.json();
      setExternalCompanies(data.externalCompanies || []);
    } catch (error) {
      console.error('Erro ao buscar empresas externas:', error);
    }
  };

  // Carregar dados
  const loadData = async (groupId: string) => {
    if (!groupId) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchRawMaterials(groupId),
        fetchExternalStock(groupId),
        fetchCompanies(groupId),
        fetchCompanyMappings(groupId),
        fetchExternalCompanies(groupId)
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      loadData(selectedGroupId);
    } else {
      // Se não há grupo selecionado, limpar dados
      setRawMaterials([]);
      setExternalStock([]);
      setCompanies([]);
      setCompanyMappings([]);
      setExternalCompanies([]);
      setLoading(false);
    }
  }, [selectedGroupId]);

  // Verificar se estoque está vinculado
  const isStockLinked = (stockId: string): boolean => {
    return rawMaterials.some(mp => 
      mp.raw_material_stock?.some(s => s.external_stock_id === stockId)
    );
  };

  // Obter MP vinculada ao estoque
  const getStockLinkedMP = (stockId: string): RawMaterial | null => {
    for (const mp of rawMaterials) {
      const linked = mp.raw_material_stock?.find(s => s.external_stock_id === stockId);
      if (linked) return mp;
    }
    return null;
  };

  // Obter vínculos de estoque de uma MP
  const getMPStockLinks = (mpId: string) => {
    const mp = rawMaterials.find(m => m.id === mpId);
    return mp?.raw_material_stock || [];
  };

  // Obter empresa interna pelo external_company_id do estoque
  const getInternalCompanyByExternalCompanyId = (externalCompanyIdCode?: string) => {
    if (!externalCompanyIdCode) return null;
    
    // 1. Encontrar a empresa externa pelo código (external_id ou external_code)
    const externalCompany = externalCompanies.find(
      ec => ec.external_id === externalCompanyIdCode || ec.external_code === externalCompanyIdCode
    );
    if (!externalCompany) return null;
    
    // 2. Encontrar o mapeamento usando o UUID da empresa externa
    const mapping = companyMappings.find(m => m.external_company_id === externalCompany.id);
    if (!mapping) return null;
    
    // 3. Retornar a empresa interna
    return companies.find(c => c.id === mapping.company_id);
  };

  // Formatar número no padrão brasileiro (1.000,25)
  const formatNumberBR = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '-';
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Vincular estoque
  const handleLink = async (mpId: string, stockId: string) => {
    try {
      setLinking(true);
      const res = await fetch(`/api/raw-materials/${mpId}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ external_stock_id: stockId })
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao vincular');
        return;
      }

      if (selectedGroupId) {
        await fetchRawMaterials(selectedGroupId);
      }
    } catch (error) {
      console.error('Erro ao vincular:', error);
      alert('Erro ao vincular estoque');
    } finally {
      setLinking(false);
    }
  };

  // Remover vínculo
  const handleRemoveLink = async (mpId: string, linkId: string) => {
    try {
      const res = await fetch(`/api/raw-materials/${mpId}/stock?link_id=${linkId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        alert('Erro ao remover vínculo');
        return;
      }

      if (selectedGroupId) {
        await fetchRawMaterials(selectedGroupId);
      }
    } catch (error) {
      console.error('Erro ao remover vínculo:', error);
      alert('Erro ao remover vínculo');
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, stock: ExternalStock) => {
    setDraggedStock(stock);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', stock.id);
  };

  const handleDragEnd = () => {
    setDraggedStock(null);
    setDropTargetId(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, mpId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetId(mpId);
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, mpId: string) => {
    e.preventDefault();
    setDropTargetId(null);
    
    if (draggedStock) {
      const mp = rawMaterials.find(m => m.id === mpId);
      const alreadyLinked = mp?.raw_material_stock?.some(
        s => s.external_stock_id === draggedStock.id
      );
      
      if (alreadyLinked) {
        alert('Este estoque já está vinculado a esta matéria-prima');
        setDraggedStock(null);
        return;
      }
      
      await handleLink(mpId, draggedStock.id);
    }
    
    setDraggedStock(null);
  };

  // Filtrar matérias-primas
  const filteredMPs = rawMaterials.filter(mp => {
    const matchesSearch = mp.name.toLowerCase().includes(searchMP.toLowerCase()) ||
      mp.category?.toLowerCase().includes(searchMP.toLowerCase());
    
    if (!matchesSearch) return false;
    
    const hasLinks = getMPStockLinks(mp.id).length > 0;
    if (filterMPStatus === 'mapped' && !hasLinks) return false;
    if (filterMPStatus === 'unmapped' && hasLinks) return false;
    
    return true;
  });

  // Obter grupos únicos do estoque (usando product_group)
  const stockGroups = useMemo(() => {
    return Array.from(
      new Set(
        externalStock
          .map(s => s.product_group)
          .filter(Boolean) as string[]
      )
    ).sort();
  }, [externalStock]);

  // Filtrar estoque
  const filteredStock = useMemo(() => {
    return externalStock.filter(stock => {
      // Filtro por grupo do produto
      if (filterStockGroup !== 'all' && stock.product_group !== filterStockGroup) {
        return false;
      }

      // Buscar por ID do produto, nome do produto ou código
      const matchesSearch = searchStock === '' || 
        stock.external_product_id?.toLowerCase().includes(searchStock.toLowerCase()) ||
        stock.product_name?.toLowerCase().includes(searchStock.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Verificar se está vinculado
      const isLinked = rawMaterials.some(mp => 
        mp.raw_material_stock?.some(s => s.external_stock_id === stock.id)
      );
      
      if (filterStockStatus === 'mapped' && !isLinked) return false;
      if (filterStockStatus === 'unmapped' && isLinked) return false;
      
      return true;
    });
  }, [externalStock, filterStockGroup, searchStock, filterStockStatus, rawMaterials]);

  // Paginação para MPs
  const totalPagesMP = Math.ceil(filteredMPs.length / ITEMS_PER_PAGE);
  const startIndexMP = (currentPageMP - 1) * ITEMS_PER_PAGE;
  const endIndexMP = startIndexMP + ITEMS_PER_PAGE;
  const paginatedMPs = filteredMPs.slice(startIndexMP, endIndexMP);

  // Paginação para estoque
  const totalPagesStock = Math.ceil(filteredStock.length / ITEMS_PER_PAGE);
  const startIndexStock = (currentPageStock - 1) * ITEMS_PER_PAGE;
  const endIndexStock = startIndexStock + ITEMS_PER_PAGE;
  const paginatedStock = filteredStock.slice(startIndexStock, endIndexStock);

  // Resetar páginas quando filtrar
  useEffect(() => {
    setCurrentPageMP(1);
  }, [searchMP, filterMPStatus]);

  useEffect(() => {
    setCurrentPageStock(1);
  }, [searchStock, filterStockStatus, filterStockGroup]);

  // Estatísticas
  const totalMPs = rawMaterials?.length || 0;
  const mappedMPs = rawMaterials?.filter(mp => getMPStockLinks(mp.id).length > 0).length || 0;
  const totalStock = externalStock?.length || 0;
  const mappedStock = externalStock?.filter(s => isStockLinked(s.id)).length || 0;

  // Se não há grupo selecionado, mostrar mensagem
  if (!selectedGroupId && groups.length > 0) {
    return (
      <div className="flex flex-col p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Conciliação de Estoque</h1>
            <p className="text-gray-500 text-sm">Arraste o estoque externo para vincular com as matérias-primas do sistema</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => router.push('/compras/materias-primas')}
            >
              <ArrowLeft size={18} className="mr-2" />
              Voltar
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
          <Package size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium">Selecione um grupo</p>
          <p className="text-sm text-gray-400 mt-2">Escolha um grupo acima para visualizar a conciliação de estoque</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conciliação de Estoque</h1>
          <p className="text-gray-500 text-sm">Arraste o estoque externo para vincular com as matérias-primas do sistema</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            onClick={() => router.push('/compras/materias-primas')}
          >
            <ArrowLeft size={18} className="mr-2" />
            Voltar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-4">
        <div className="w-48">
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
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
          <Package size={20} className="text-blue-600" />
          <span className="text-sm text-gray-700">
            MPs: <strong>{mappedMPs}</strong>/{totalMPs} vinculadas
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-lg">
          <Boxes size={20} className="text-orange-600" />
          <span className="text-sm text-gray-700">
            Estoque: <strong>{mappedStock}</strong>/{totalStock} vinculados
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Lado Esquerdo - Matérias-Primas */}
          <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-blue-600" />
                  <h2 className="font-semibold text-gray-900">Matérias-Primas</h2>
                </div>
                <span className="text-gray-600 text-sm">{filteredMPs.length} itens</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar MP..."
                    value={searchMP}
                    onChange={(e) => setSearchMP(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={filterMPStatus}
                  onChange={(e) => setFilterMPStatus(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">Todas</option>
                  <option value="unmapped">Não vinculadas</option>
                  <option value="mapped">Vinculadas</option>
                </select>
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ height: '600px' }}>
              {paginatedMPs.map((mp) => {
                const stockLinks = getMPStockLinks(mp.id);
                const isDropTarget = dropTargetId === mp.id;
                
                return (
                  <div
                    key={mp.id}
                    onDragOver={(e) => handleDragOver(e, mp.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, mp.id)}
                    className={`rounded-xl border-2 p-3 transition-all duration-200 ${
                      isDropTarget 
                        ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02]' 
                        : stockLinks.length > 0
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        stockLinks.length > 0 ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <Package size={20} className={stockLinks.length > 0 ? 'text-green-600' : 'text-blue-600'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 truncate">{mp.name}</p>
                          {stockLinks.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                              <Link2 size={12} />
                              {stockLinks.length}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {mp.category || 'Sem categoria'} • {mp.unit}
                        </p>
                        
                        {/* Estoques vinculados */}
                        {stockLinks.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {stockLinks.map((link) => {
                              const linkedStock = externalStock.find(s => s.id === link.external_stock_id);
                              const internalCompany = linkedStock ? getInternalCompanyByExternalCompanyId(linkedStock.external_company_id) : null;
                              
                              return (
                                <div
                                  key={link.id}
                                  className="flex items-center justify-between text-xs bg-white rounded px-2 py-1.5 border border-green-200"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Boxes size={14} className="text-orange-600 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-gray-700 truncate block font-medium">
                                        {linkedStock?.product_name || linkedStock?.external_product_id || 'N/A'}
                                      </span>
                                      <div className="flex items-center gap-2 text-gray-500">
                                        <span className="font-mono">{linkedStock?.external_product_id}</span>
                                        {internalCompany && (
                                          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">
                                            {internalCompany.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                    <span className="text-teal-600 font-medium whitespace-nowrap">
                                      {formatNumberBR(linkedStock?.quantity)} {linkedStock?.unit || mp.unit}
                                    </span>
                                    <button
                                      onClick={() => handleRemoveLink(mp.id, link.id)}
                                      className="text-red-500 hover:text-red-700 p-0.5"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {paginatedMPs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <Package size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhuma matéria-prima</p>
                  <p className="text-sm">Cadastre matérias-primas primeiro</p>
                </div>
              )}
            </div>

            {/* Paginação */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredMPs.length > 0 ? (
                  <>Mostrando {startIndexMP + 1} a {Math.min(endIndexMP, filteredMPs.length)} de {filteredMPs.length} MPs</>
                ) : (
                  <>Nenhuma MP encontrada</>
                )}
              </div>
              {totalPagesMP > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPageMP(prev => Math.max(1, prev - 1))}
                    disabled={currentPageMP === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPageMP} de {totalPagesMP}
                  </span>
                  <button
                    onClick={() => setCurrentPageMP(prev => Math.min(totalPagesMP, prev + 1))}
                    disabled={currentPageMP === totalPagesMP}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Lado Direito - Estoque Externo */}
          <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Boxes size={20} className="text-orange-600" />
                  <h2 className="font-semibold text-gray-900">Estoque Externo</h2>
                </div>
                <span className="text-gray-600 text-sm">{filteredStock.length} itens</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou código..."
                    value={searchStock}
                    onChange={(e) => setSearchStock(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={filterStockGroup}
                  onChange={(e) => setFilterStockGroup(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">Todos os grupos</option>
                  {stockGroups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
                <select
                  value={filterStockStatus}
                  onChange={(e) => setFilterStockStatus(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="unmapped">Não vinculados</option>
                  <option value="mapped">Vinculados</option>
                </select>
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ height: '600px' }}>
              {paginatedStock.map((stock) => {
                const isLinked = isStockLinked(stock.id);
                const linkedMP = getStockLinkedMP(stock.id);
                const isDragging = draggedStock?.id === stock.id;
                const internalCompany = getInternalCompanyByExternalCompanyId(stock.external_company_id);
                
                return (
                  <div
                    key={stock.id}
                    draggable={!isLinked}
                    onDragStart={(e) => handleDragStart(e, stock)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-xl border-2 p-3 transition-all duration-200 ${
                      isLinked 
                        ? 'border-green-200 bg-green-50 opacity-60 cursor-not-allowed' 
                        : isDragging
                        ? 'border-blue-500 shadow-lg scale-[1.02] cursor-grabbing'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-md cursor-grab'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {!isLinked && (
                        <div className="text-gray-400 cursor-grab">
                          <GripVertical size={18} />
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isLinked ? 'bg-green-100' : 'bg-orange-100'
                      }`}>
                        {isLinked ? (
                          <Check size={20} className="text-green-600" />
                        ) : (
                          <Boxes size={20} className="text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {stock.product_name || stock.external_product_id}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                          {internalCompany && (
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                              {internalCompany.name}
                            </span>
                          )}
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
                            {stock.external_product_id}
                          </span>
                          {stock.product_group && (
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                              {stock.product_group}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="text-teal-600 font-medium">
                            Qtd: {formatNumberBR(stock.quantity)} {stock.unit || 'un'}
                          </span>
                          {stock.min_quantity !== undefined && stock.min_quantity > 0 && (
                            <span className="text-orange-600">
                              Mín: {formatNumberBR(stock.min_quantity)}
                            </span>
                          )}
                        </div>
                        {linkedMP && (
                          <p className="text-xs text-green-600 mt-1">
                            → {linkedMP.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {paginatedStock.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <Boxes size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum estoque</p>
                  <p className="text-sm">Sincronize os dados do Power BI primeiro</p>
                </div>
              )}
            </div>

            {/* Paginação */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredStock.length > 0 ? (
                  <>Mostrando {startIndexStock + 1} a {Math.min(endIndexStock, filteredStock.length)} de {filteredStock.length} itens</>
                ) : (
                  <>Nenhum item encontrado</>
                )}
              </div>
              {totalPagesStock > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPageStock(prev => Math.max(1, prev - 1))}
                    disabled={currentPageStock === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPageStock} de {totalPagesStock}
                  </span>
                  <button
                    onClick={() => setCurrentPageStock(prev => Math.min(totalPagesStock, prev + 1))}
                    disabled={currentPageStock === totalPagesStock}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
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
      {draggedStock && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
          <Link2 size={18} />
          <span>Solte na matéria-prima do sistema para vincular</span>
        </div>
      )}
    </div>
  );
}
