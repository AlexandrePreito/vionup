'use client';

import { useState, useEffect, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, Loader2, CheckCircle, Link2, ChevronLeft, ChevronRight, ArrowLeft, Boxes, X, GripVertical, Check, Pencil, Trash2, Weight } from 'lucide-react';
import { Button } from '@/components/ui';
import { RawMaterial, CompanyGroup, ExternalProduct, ExternalStock, Company, CompanyMapping, ExternalCompany } from '@/types';
import { useGroupFilter } from '@/hooks/useGroupFilter';

const ITEMS_PER_PAGE = 20;

export default function ConciliacaoMateriasPrimasPage() {
  const router = useRouter();
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [externalProducts, setExternalProducts] = useState<ExternalProduct[]>([]);
  const [externalStock, setExternalStock] = useState<ExternalStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyMappings, setCompanyMappings] = useState<CompanyMapping[]>([]);
  const [externalCompanies, setExternalCompanies] = useState<ExternalCompany[]>([]);
  
  // Filtros e busca - Matérias-Primas
  const [searchMP, setSearchMP] = useState('');
  const [filterMPStatus, setFilterMPStatus] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [currentPageMP, setCurrentPageMP] = useState(1);
  
  // Filtros e busca - Produtos Externos
  const [searchProduct, setSearchProduct] = useState('');
  const [filterProductStatus, setFilterProductStatus] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [currentPageProduct, setCurrentPageProduct] = useState(1);

  // Drag and Drop
  const [draggedProduct, setDraggedProduct] = useState<ExternalProduct | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // Modal de quantidade
  const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);
  const [selectedMP, setSelectedMP] = useState<RawMaterial | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ExternalProduct | null>(null);
  const [linkQty, setLinkQty] = useState('');
  const [linking, setLinking] = useState(false);

  // Modal de detalhes do N2
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailMP, setDetailMP] = useState<RawMaterial | null>(null);
  const [detailLinkedProducts, setDetailLinkedProducts] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [editQtyValue, setEditQtyValue] = useState('');

  // Buscar matérias-primas
  const fetchRawMaterials = async (groupId: string) => {
    try {
      const res = await fetch(`/api/raw-materials?group_id=${groupId}&include_products=true`);
      if (!res.ok) {
        console.error('Erro ao buscar matérias-primas:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      setRawMaterials(data.rawMaterials || []);
    } catch (error) {
      console.error('Erro ao buscar matérias-primas:', error);
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
      // Filtrar produtos: excluir aqueles com category = 'subproduto'
      const filteredProducts = (data.externalProducts || []).filter(
        (product: ExternalProduct) => product.category !== 'subproduto'
      );
      setExternalProducts(filteredProducts);
    } catch (error) {
      console.error('Erro ao buscar produtos externos:', error);
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
      if (!res.ok) {
        console.error('Erro ao buscar empresas:', res.status, res.statusText);
        return;
      }
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

  // Carregar dados
  const loadData = async (groupId: string) => {
    if (!groupId) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchRawMaterials(groupId),
        fetchExternalProducts(groupId),
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
      setExternalProducts([]);
      setExternalStock([]);
      setCompanies([]);
      setCompanyMappings([]);
      setExternalCompanies([]);
      setLoading(false);
    }
  }, [selectedGroupId]);

  // Verificar se produto está vinculado
  const isProductLinked = (externalProductId: string): boolean => {
    return rawMaterials.some(mp => 
      mp.raw_material_products?.some(p => p.external_product_id === externalProductId)
    );
  };

  // Obter MP vinculada ao produto
  const getProductLinkedMP = (externalProductId: string): RawMaterial | null => {
    for (const mp of rawMaterials) {
      const linked = mp.raw_material_products?.find(p => p.external_product_id === externalProductId);
      if (linked) return mp;
    }
    return null;
  };

  // Obter mapeamentos de uma MP
  const getMPMappings = (mpId: string) => {
    const mp = rawMaterials.find(m => m.id === mpId);
    return mp?.raw_material_products || [];
  };

  // Obter estoque do produto
  const getProductStock = (externalProductId: string): ExternalStock | undefined => {
    return externalStock.find(s => s.external_product_id === externalProductId);
  };

  // Obter empresa interna pelo external_company_id do produto externo
  // O external_company_id no produto é o external_id da empresa externa (ex: "01", "81")
  // Precisamos: external_company_id -> external_companies (pelo external_id) -> company_mappings -> companies
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

  // Criar mapeamento via drag and drop
  const handleCreateMapping = async (mpId: string, externalProductId: string) => {
    const mp = rawMaterials.find(m => m.id === mpId);
    if (!mp) return;

    // Verificar se já está vinculado
    const alreadyLinked = mp.raw_material_products?.some(
      p => p.external_product_id === externalProductId
    );
    
    if (alreadyLinked) {
      alert('Este produto já está vinculado a esta matéria-prima');
      return;
    }
    
    // Abrir modal para informar quantidade
    setSelectedMP(mp);
    const product = externalProducts.find(p => p.external_id === externalProductId);
    if (product) {
      setSelectedProduct(product);
      setLinkQty('');
      setIsQtyModalOpen(true);
    }
  };

  // Vincular produto
  const handleLink = async () => {
    if (!selectedMP || !selectedProduct) return;
    
    const qty = parseFloat(linkQty);
    if (!qty || qty <= 0) {
      alert('Informe uma quantidade válida');
      return;
    }

    try {
      setLinking(true);
      const res = await fetch(`/api/raw-materials/${selectedMP.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          external_product_id: selectedProduct.external_id,
          quantity_per_unit: qty
        })
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao vincular');
        return;
      }

      setIsQtyModalOpen(false);
      setSelectedMP(null);
      setSelectedProduct(null);
      setDraggedProduct(null);
      if (selectedGroupId) {
        await fetchRawMaterials(selectedGroupId);
      }
    } catch (error) {
      console.error('Erro ao vincular:', error);
      alert('Erro ao vincular produto');
    } finally {
      setLinking(false);
    }
  };

  // Remover mapeamento
  const handleRemoveMapping = async (mpId: string, linkId: string) => {
    try {
      const res = await fetch(`/api/raw-materials/${mpId}/products?product_id=${linkId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        alert('Erro ao remover mapeamento');
        return;
      }

      if (selectedGroupId) {
        await fetchRawMaterials(selectedGroupId);
      }
    } catch (error) {
      console.error('Erro ao remover mapeamento:', error);
      alert('Erro ao remover mapeamento');
    }
  };

  // Abrir modal de detalhes do N2
  const handleOpenDetail = async (mp: RawMaterial) => {
    setDetailMP(mp);
    setIsDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/raw-materials/${mp.id}/products`);
      if (res.ok) {
        const data = await res.json();
        setDetailLinkedProducts(data.products || []);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos vinculados:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Remover vínculo pelo modal de detalhes
  const handleDetailUnlink = async (linkId: string) => {
    if (!detailMP) return;
    try {
      const res = await fetch(`/api/raw-materials/${detailMP.id}/products?product_id=${linkId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        alert('Erro ao desvincular');
        return;
      }
      // Recarregar produtos do modal
      const res2 = await fetch(`/api/raw-materials/${detailMP.id}/products`);
      if (res2.ok) {
        const data = await res2.json();
        setDetailLinkedProducts(data.products || []);
      }
      // Recarregar lista geral
      if (selectedGroupId) {
        await fetchRawMaterials(selectedGroupId);
      }
    } catch (error) {
      console.error('Erro ao desvincular:', error);
    }
  };

  // Atualizar gramatura/quantidade de um vínculo
  const handleDetailUpdateQty = async (linkId: string, newQty: number) => {
    if (!detailMP) return;
    try {
      const res = await fetch(`/api/raw-materials/${detailMP.id}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: linkId,
          quantity_per_unit: newQty
        })
      });
      if (!res.ok) {
        alert('Erro ao atualizar quantidade');
        return;
      }
      // Recarregar produtos do modal
      const res2 = await fetch(`/api/raw-materials/${detailMP.id}/products`);
      if (res2.ok) {
        const data = await res2.json();
        setDetailLinkedProducts(data.products || []);
      }
      setEditingQtyId(null);
      // Recarregar lista geral
      if (selectedGroupId) {
        await fetchRawMaterials(selectedGroupId);
      }
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
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
    
    if (draggedProduct) {
      await handleCreateMapping(mpId, draggedProduct.external_id);
    }
    
    setDraggedProduct(null);
  };

  // Filtrar matérias-primas
  const filteredMPs = rawMaterials.filter(mp => {
    // Mostrar apenas nível 2 (sub-matérias-primas, ex: Coração de Frango, Coxa e Sobre Coxa)
    if ((mp.level || 1) !== 2) return false;

    const matchesSearch = mp.name.toLowerCase().includes(searchMP.toLowerCase()) ||
      mp.category?.toLowerCase().includes(searchMP.toLowerCase());
    
    if (!matchesSearch) return false;
    
    const hasMappings = getMPMappings(mp.id).length > 0;
    if (filterMPStatus === 'mapped' && !hasMappings) return false;
    if (filterMPStatus === 'unmapped' && hasMappings) return false;
    
    return true;
  });

  // Produtos cuja category contém "venda" (ex: "Produtos para Venda") — só esses no painel
  const productsForVenda = externalProducts.filter(
    p => (p.category || '').toLowerCase().includes('venda')
  );

  // Filtrar produtos externos (busca + status)
  const filteredProducts = productsForVenda.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchProduct.toLowerCase()) ||
      product.external_id?.toLowerCase().includes(searchProduct.toLowerCase());
    
    if (!matchesSearch) return false;
    
    const isLinked = isProductLinked(product.external_id);
    if (filterProductStatus === 'mapped' && !isLinked) return false;
    if (filterProductStatus === 'unmapped' && isLinked) return false;
    
    return true;
  });

  // Paginação para MPs
  const totalPagesMP = Math.ceil(filteredMPs.length / ITEMS_PER_PAGE);
  const startIndexMP = (currentPageMP - 1) * ITEMS_PER_PAGE;
  const endIndexMP = startIndexMP + ITEMS_PER_PAGE;
  const paginatedMPs = filteredMPs.slice(startIndexMP, endIndexMP);

  // Paginação para produtos
  const totalPagesProduct = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndexProduct = (currentPageProduct - 1) * ITEMS_PER_PAGE;
  const endIndexProduct = startIndexProduct + ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndexProduct, endIndexProduct);

  // Resetar páginas quando filtrar
  useEffect(() => {
    setCurrentPageMP(1);
  }, [searchMP, filterMPStatus]);

  useEffect(() => {
    setCurrentPageProduct(1);
  }, [searchProduct, filterProductStatus]);

  // Estatísticas
  const n2Materials = rawMaterials?.filter(mp => (mp.level || 1) === 2) || [];
  const totalMPs = n2Materials.length;
  const mappedMPs = n2Materials.filter(mp => getMPMappings(mp.id).length > 0).length;
  const totalProducts = productsForVenda.length;
  const mappedProducts = productsForVenda.filter(p => isProductLinked(p.external_id)).length;

  // Se não há grupo selecionado, mostrar mensagem
  if (!selectedGroupId && groups.length > 0) {
    return (
      <div className="flex flex-col p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Conciliação Produtos para Vendas</h1>
            <p className="text-gray-500 text-sm">Arraste os produtos externos para vincular com as matérias-primas do sistema</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/compras/materias-primas')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Matérias-Primas
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
          <Package size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium">Selecione um grupo</p>
          <p className="text-sm text-gray-400 mt-2">Escolha um grupo acima para visualizar a conciliação</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conciliação Produtos para Vendas</h1>
          <p className="text-gray-500 text-sm">Arraste os produtos externos para vincular com as matérias-primas do sistema</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push('/compras/materias-primas')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Matérias-Primas
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
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          <span className="text-gray-700 font-medium">{mappedMPs}/{totalMPs}</span>
          <span className="text-gray-600 text-sm ml-2">matérias-primas vinculadas</span>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          <span className="text-gray-700 font-medium">{mappedProducts}/{totalProducts}</span>
          <span className="text-gray-600 text-sm ml-2">produtos externos mapeados</span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
          {/* Lado Esquerdo - Matérias-Primas do Sistema */}
          <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-blue-600" />
                  <h2 className="font-semibold text-gray-900">Matérias-Primas do Sistema</h2>
                </div>
                <span className="text-gray-600 text-sm">{filteredMPs.length} matérias-primas</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar matéria-prima..."
                    value={searchMP}
                    onChange={(e) => setSearchMP(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterMPStatus}
                  onChange={(e) => setFilterMPStatus(e.target.value as any)}
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
              {paginatedMPs.map((mp) => {
                const mpMappings = getMPMappings(mp.id);
                const isDropTarget = dropTargetId === mp.id;
                
                return (
                  <div
                    key={mp.id}
                    onDragOver={(e) => handleDragOver(e, mp.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, mp.id)}
                    className={`rounded-xl border-2 transition-all duration-200 ${
                      isDropTarget 
                        ? 'border-blue-500 scale-[1.02] shadow-lg' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Card da MP - clicável */}
                    <div className="p-3 cursor-pointer" onClick={() => handleOpenDetail(mp)}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          mpMappings.length > 0 ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <Package size={20} className={mpMappings.length > 0 ? 'text-green-600' : 'text-blue-600'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{mp.name}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {mp.parent_id && (() => {
                              const parent = rawMaterials.find(m => m.id === mp.parent_id);
                              return parent ? (
                                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                                  {parent.name}
                                </span>
                              ) : null;
                            })()}
                            {mp.category && (
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                {mp.category}
                              </span>
                            )}
                            <span className="text-xs">{mp.unit}</span>
                          </div>
                        </div>
                        {mpMappings.length > 0 && (
                          <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                            <Check size={12} />
                            {mpMappings.length}
                          </div>
                        )}
                      </div>

                      {/* Área de drop / Mapeamentos existentes */}
                      {mpMappings.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {mpMappings.map((link) => {
                            const product = externalProducts.find(p => p.external_id === link.external_product_id);
                            return (
                              <div
                                key={link.id}
                                className="flex items-center gap-2 border border-green-200 rounded-lg p-2"
                              >
                                <Link2 size={14} className="text-green-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-green-800 truncate">
                                    {product?.name || link.external_product_id}
                                  </p>
                                  <p className="text-xs text-green-600">
                                    {link.quantity_per_unit} {mp.unit}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleRemoveMapping(mp.id, link.id)}
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
                {filteredMPs.length > 0 ? (
                  <>Mostrando {startIndexMP + 1} a {Math.min(endIndexMP, filteredMPs.length)} de {filteredMPs.length} matérias-primas</>
                ) : (
                  <>Nenhuma matéria-prima encontrada</>
                )}
              </div>
              {totalPagesMP > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPageMP(prev => Math.max(1, prev - 1))}
                    disabled={currentPageMP === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPageMP} de {totalPagesMP}
                  </span>
                  <button
                    onClick={() => setCurrentPageMP(prev => Math.min(totalPagesMP, prev + 1))}
                    disabled={currentPageMP === totalPagesMP}
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
                  <h2 className="font-semibold text-gray-900">Produtos para Venda (banco de dados)</h2>
                </div>
                <span className="text-gray-600 text-sm">{filteredProducts.length} produtos</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar produto..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterProductStatus}
                  onChange={(e) => setFilterProductStatus(e.target.value as any)}
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
              {paginatedProducts.map((product) => {
                const isLinked = isProductLinked(product.external_id);
                const linkedMP = getProductLinkedMP(product.external_id);
                const isDragging = draggedProduct?.external_id === product.external_id;
                const internalCompany = getInternalCompanyByExternalCompanyId(product.external_company_id);
                
                return (
                  <div
                    key={product.id}
                    draggable={!isLinked}
                    onDragStart={(e) => handleDragStart(e, product)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-xl border-2 p-3 transition-all duration-200 ${
                      isLinked 
                        ? 'border-green-200 opacity-60 cursor-not-allowed' 
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
                            {product.external_id}
                          </span>
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

              {paginatedProducts.length === 0 && (
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
                {filteredProducts.length > 0 ? (
                  <>Mostrando {startIndexProduct + 1} a {Math.min(endIndexProduct, filteredProducts.length)} de {filteredProducts.length} produtos</>
                ) : (
                  <>Nenhum produto encontrado</>
                )}
              </div>
              {totalPagesProduct > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPageProduct(prev => Math.max(1, prev - 1))}
                    disabled={currentPageProduct === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPageProduct} de {totalPagesProduct}
                  </span>
                  <button
                    onClick={() => setCurrentPageProduct(prev => Math.min(totalPagesProduct, prev + 1))}
                    disabled={currentPageProduct === totalPagesProduct}
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
          <span>Solte na matéria-prima do sistema para vincular</span>
        </div>
      )}

      {/* Modal de Quantidade */}
      {isQtyModalOpen && selectedMP && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Vincular Produto</h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Matéria-Prima:</strong> {selectedMP.name}
                </p>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-sm text-orange-800">
                  <strong>Produto:</strong> {selectedProduct.name}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade por unidade vendida ({selectedMP.unit}) *
                </label>
                <input
                  type="number"
                  value={linkQty}
                  onChange={(e) => setLinkQty(e.target.value)}
                  placeholder={`Ex: 0.150 (para 150g de ${selectedMP.name} por unidade)`}
                  step="0.001"
                  min="0.001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Quantos {selectedMP.unit} de "{selectedMP.name}" são usados em cada "{selectedProduct.name}" vendido?
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6 justify-end">
              <button
                onClick={() => {
                  setIsQtyModalOpen(false);
                  setSelectedMP(null);
                  setSelectedProduct(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <Button onClick={handleLink} isLoading={linking}>
                Vincular
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do N2 */}
      {isDetailModalOpen && detailMP && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsDetailModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Package size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{detailMP.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      {detailMP.parent_id && (() => {
                        const parent = rawMaterials.find(m => m.id === detailMP.parent_id);
                        return parent ? (
                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                            {parent.name}
                          </span>
                        ) : null;
                      })()}
                      <span className="text-xs text-gray-500">Nível 2 · {detailMP.unit}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 hover:bg-white/80 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Info do N2 */}
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="flex items-center gap-6">
                {detailMP.loss_factor > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Fator de Correção:</span>
                    <span className="inline-flex items-center gap-1 text-orange-700 bg-orange-100 px-2.5 py-1 rounded-lg text-sm font-semibold">
                      {detailMP.loss_factor}%
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Produtos vinculados:</span>
                  <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg text-sm font-semibold">
                    {detailLinkedProducts.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Lista de produtos vinculados */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingDetail ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                </div>
              ) : detailLinkedProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Package size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">Nenhum produto vinculado</p>
                  <p className="text-gray-400 text-sm mt-1">Arraste um produto da lista para vincular</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Produtos Conciliados</p>
                  {detailLinkedProducts.map((link: any) => {
                    const product = externalProducts.find(p => p.id === link.external_product_id || p.external_id === link.external_product_id);
                    const isEditing = editingQtyId === link.id;
                    const qtyInGrams = (link.quantity_per_unit || 0) * 1000;

                    return (
                      <div key={link.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-200 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {product?.name || link.external_product_id}
                            </p>
                            {product?.external_id && (
                              <p className="text-xs text-gray-400 font-mono mt-0.5">{product.external_id}</p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`Desvincular "${product?.name || link.external_product_id}"?`)) {
                                handleDetailUnlink(link.id);
                              }
                            }}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            title="Desvincular produto"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Gramatura / Quantidade */}
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            <Weight size={14} className="text-gray-400" />
                            {isEditing ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  type="number"
                                  value={editQtyValue}
                                  onChange={(e) => setEditQtyValue(e.target.value)}
                                  step="0.001"
                                  min="0.001"
                                  className="w-24 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <span className="text-xs text-gray-500">{detailMP.unit}</span>
                                <button
                                  onClick={() => {
                                    const val = parseFloat(editQtyValue);
                                    if (val > 0) {
                                      handleDetailUpdateQty(link.id, val);
                                    }
                                  }}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => setEditingQtyId(null)}
                                  className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1 -mx-2 transition-colors"
                                onClick={() => {
                                  setEditingQtyId(link.id);
                                  setEditQtyValue(String(link.quantity_per_unit || 0));
                                }}
                                title="Clique para editar"
                              >
                                <span className="text-sm font-semibold text-gray-900">
                                  {link.quantity_per_unit} {detailMP.unit}
                                </span>
                                <span className="text-xs text-gray-400">
                                  ({qtyInGrams.toFixed(0)}g)
                                </span>
                                <Pencil size={12} className="text-gray-300" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
