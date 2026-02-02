'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Package, Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight, Link2, Percent, Boxes } from 'lucide-react';
import { Button } from '@/components/ui';
import { RawMaterial, CompanyGroup, Company, ExternalProduct } from '@/types';
import { useGroupFilter } from '@/hooks/useGroupFilter';

const ITEMS_PER_PAGE = 20;

export default function MateriasPrimasPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [externalProducts, setExternalProducts] = useState<ExternalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal de Cadastro/Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RawMaterial | null>(null);
  const [modalTab, setModalTab] = useState<'dados' | 'venda' | 'estoque'>('dados');
  const [formData, setFormData] = useState({
    company_group_id: '',
    company_id: '',
    name: '',
    unit: 'kg',
    loss_factor: 0,
    min_stock: 0,
    current_stock: 0,
    category: '',
    is_resale: false
  });
  const [saving, setSaving] = useState(false);
  
  // Vínculos no modal de edição
  const [modalLinkedVendas, setModalLinkedVendas] = useState<any[]>([]);
  const [modalLinkedEstoque, setModalLinkedEstoque] = useState<any[]>([]);
  const [searchVenda, setSearchVenda] = useState('');
  const [searchEstoque, setSearchEstoque] = useState('');
  const [externalStock, setExternalStock] = useState<any[]>([]);

  // Modal de Vincular Produtos (antigo - manter por compatibilidade)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedRawMaterial, setSelectedRawMaterial] = useState<RawMaterial | null>(null);
  const [linkedProducts, setLinkedProducts] = useState<any[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [linkingProduct, setLinkingProduct] = useState(false);

  // Buscar empresas
  const fetchCompanies = async (groupId: string) => {
    try {
      const res = await fetch(`/api/companies?group_id=${groupId}`);
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  // Buscar matérias-primas
  const fetchRawMaterials = async () => {
    if (!selectedGroupId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/raw-materials?group_id=${selectedGroupId}&include_products=true`);
      const data = await res.json();
      setRawMaterials(data.rawMaterials || []);
    } catch (error) {
      console.error('Erro ao buscar matérias-primas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar produtos externos
  const fetchExternalProducts = async (groupId: string) => {
    try {
      const res = await fetch(`/api/external-products?group_id=${groupId}`);
      const data = await res.json();
      setExternalProducts(data.externalProducts || []);
    } catch (error) {
      console.error('Erro ao buscar produtos externos:', error);
    }
  };

  // Buscar produtos vinculados
  const fetchLinkedProducts = async (rawMaterialId: string) => {
    try {
      const res = await fetch(`/api/raw-materials/${rawMaterialId}/products`);
      const data = await res.json();
      setLinkedProducts(data.products || []);
    } catch (error) {
      console.error('Erro ao buscar produtos vinculados:', error);
    }
  };

  // Buscar estoque externo
  const fetchExternalStock = async (groupId: string) => {
    try {
      const res = await fetch(`/api/external-stock?group_id=${groupId}`);
      const data = await res.json();
      setExternalStock(data.stock || []);
    } catch (error) {
      console.error('Erro ao buscar estoque externo:', error);
    }
  };

  // Buscar vínculos de venda para o modal
  const fetchModalLinkedVendas = async (rawMaterialId: string) => {
    try {
      const res = await fetch(`/api/raw-materials/${rawMaterialId}/products`);
      const data = await res.json();
      setModalLinkedVendas(data.products || []);
    } catch (error) {
      console.error('Erro ao buscar vínculos de venda:', error);
    }
  };

  // Buscar vínculos de estoque para o modal
  const fetchModalLinkedEstoque = async (rawMaterialId: string) => {
    try {
      const res = await fetch(`/api/raw-materials/${rawMaterialId}/stock`);
      const data = await res.json();
      setModalLinkedEstoque(data.stockLinks || []);
    } catch (error) {
      console.error('Erro ao buscar vínculos de estoque:', error);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      fetchCompanies(selectedGroupId);
      fetchRawMaterials();
      fetchExternalProducts(selectedGroupId);
      fetchExternalStock(selectedGroupId);
    }
  }, [selectedGroupId]);

  // Filtrar matérias-primas
  const filteredItems = rawMaterials.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !filterCategory || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Paginação
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Resetar página quando filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedGroupId, filterCategory]);

  // Categorias únicas
  const categories = [...new Set(rawMaterials.map(r => r.category).filter(Boolean))];

  // Calcular estoque total vinculado (soma dos estoques externos)
  const getLinkedStockTotal = (item: RawMaterial): number => {
    if (!item.raw_material_stock || item.raw_material_stock.length === 0) {
      return 0;
    }
    return item.raw_material_stock.reduce((total: number, link: any) => {
      const qty = link.external_stock?.quantity || 0;
      return total + qty;
    }, 0);
  };

  // Abrir modal para criar
  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      company_group_id: selectedGroupId,
      company_id: '',
      name: '',
      unit: 'kg',
      loss_factor: 0,
      min_stock: 0,
      current_stock: 0,
      category: '',
      is_resale: false
    });
    setModalTab('dados');
    setModalLinkedVendas([]);
    setModalLinkedEstoque([]);
    setSearchVenda('');
    setSearchEstoque('');
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleEdit = (item: RawMaterial) => {
    setEditingItem(item);
    setFormData({
      company_group_id: item.company_group_id,
      company_id: item.company_id || '',
      name: item.name,
      unit: item.unit,
      loss_factor: item.loss_factor,
      min_stock: item.min_stock,
      current_stock: item.current_stock,
      category: item.category || '',
      is_resale: item.is_resale
    });
    setModalTab('dados');
    setSearchVenda('');
    setSearchEstoque('');
    // Carregar vínculos existentes
    fetchModalLinkedVendas(item.id);
    fetchModalLinkedEstoque(item.id);
    setIsModalOpen(true);
  };

  // Salvar (criar ou editar)
  const handleSave = async () => {
    if (!formData.company_group_id || !formData.name) {
      alert('Nome é obrigatório');
      return;
    }

    try {
      setSaving(true);
      const url = editingItem
        ? `/api/raw-materials/${editingItem.id}`
        : '/api/raw-materials';

      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao salvar');
        return;
      }

      setIsModalOpen(false);
      fetchRawMaterials();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar matéria-prima');
    } finally {
      setSaving(false);
    }
  };

  // Excluir
  const handleDelete = async (item: RawMaterial) => {
    if (!confirm(`Deseja excluir "${item.name}"?`)) return;

    try {
      const res = await fetch(`/api/raw-materials/${item.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
        return;
      }

      fetchRawMaterials();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir matéria-prima');
    }
  };

  // Abrir modal de vincular produtos
  const handleOpenLinkModal = async (item: RawMaterial) => {
    setSelectedRawMaterial(item);
    setSearchProduct('');
    await fetchLinkedProducts(item.id);
    setIsLinkModalOpen(true);
  };

  // Vincular produto
  const handleLinkProduct = async (externalProductId: string, quantityPerUnit: number) => {
    if (!selectedRawMaterial) return;

    try {
      setLinkingProduct(true);
      const res = await fetch(`/api/raw-materials/${selectedRawMaterial.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          external_product_id: externalProductId,
          quantity_per_unit: quantityPerUnit
        })
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao vincular');
        return;
      }

      await fetchLinkedProducts(selectedRawMaterial.id);
      fetchRawMaterials();
    } catch (error) {
      console.error('Erro ao vincular:', error);
    } finally {
      setLinkingProduct(false);
    }
  };

  // Desvincular produto
  const handleUnlinkProduct = async (productId: string) => {
    if (!selectedRawMaterial) return;

    try {
      const res = await fetch(`/api/raw-materials/${selectedRawMaterial.id}/products?product_id=${productId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        alert('Erro ao desvincular');
        return;
      }

      await fetchLinkedProducts(selectedRawMaterial.id);
      fetchRawMaterials();
    } catch (error) {
      console.error('Erro ao desvincular:', error);
    }
  };

  // Produtos filtrados para vincular
  const filteredProducts = externalProducts.filter(p =>
    p.name?.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.external_id?.toLowerCase().includes(searchProduct.toLowerCase())
  );

  // Verificar se produto já está vinculado
  const isProductLinked = (productId: string) => {
    return linkedProducts.some(lp => lp.external_product_id === productId);
  };

  // Obter nome do produto externo
  const getExternalProductName = (externalProductId: string) => {
    // Buscar por id ou external_id
    const product = externalProducts.find(p => p.id === externalProductId || p.external_id === externalProductId);
    return product?.name || externalProductId;
  };

  // Obter informações completas do produto externo (nome e empresa)
  const getExternalProductInfo = (externalProductId: string) => {
    const product = externalProducts.find(p => p.id === externalProductId || p.external_id === externalProductId);
    return {
      name: product?.name || externalProductId,
      company: product?.external_company_id || ''
    };
  };

  // Funções para o modal com abas
  
  // Vincular produto de venda no modal
  const handleModalLinkVenda = async (externalProductId: string, quantityPerUnit: number) => {
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/raw-materials/${editingItem.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          external_product_id: externalProductId,
          quantity_per_unit: quantityPerUnit
        })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao vincular');
        return;
      }
      await fetchModalLinkedVendas(editingItem.id);
      fetchRawMaterials();
    } catch (error) {
      console.error('Erro ao vincular produto de venda:', error);
    }
  };

  // Desvincular produto de venda no modal
  const handleModalUnlinkVenda = async (productId: string) => {
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/raw-materials/${editingItem.id}/products?product_id=${productId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        alert('Erro ao desvincular');
        return;
      }
      await fetchModalLinkedVendas(editingItem.id);
      fetchRawMaterials();
    } catch (error) {
      console.error('Erro ao desvincular produto de venda:', error);
    }
  };

  // Atualizar quantidade de produto de venda
  const handleModalUpdateVendaQty = async (productId: string, newQty: number) => {
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/raw-materials/${editingItem.id}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          quantity_per_unit: newQty
        })
      });
      if (!res.ok) {
        alert('Erro ao atualizar');
        return;
      }
      await fetchModalLinkedVendas(editingItem.id);
      fetchRawMaterials();
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
    }
  };

  // Vincular estoque no modal
  const handleModalLinkEstoque = async (externalStockId: string) => {
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/raw-materials/${editingItem.id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ external_stock_id: externalStockId })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao vincular');
        return;
      }
      await fetchModalLinkedEstoque(editingItem.id);
      fetchRawMaterials();
    } catch (error) {
      console.error('Erro ao vincular estoque:', error);
    }
  };

  // Desvincular estoque no modal
  const handleModalUnlinkEstoque = async (linkId: string) => {
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/raw-materials/${editingItem.id}/stock?link_id=${linkId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        alert('Erro ao desvincular');
        return;
      }
      await fetchModalLinkedEstoque(editingItem.id);
      fetchRawMaterials();
    } catch (error) {
      console.error('Erro ao desvincular estoque:', error);
    }
  };

  // Filtrar produtos de venda disponíveis
  const filteredVendaProducts = externalProducts.filter(p =>
    p.name?.toLowerCase().includes(searchVenda.toLowerCase()) ||
    p.external_id?.toLowerCase().includes(searchVenda.toLowerCase())
  );

  // Filtrar estoque disponível
  const filteredEstoqueItems = externalStock.filter(s =>
    s.product_name?.toLowerCase().includes(searchEstoque.toLowerCase()) ||
    s.external_product_id?.toLowerCase().includes(searchEstoque.toLowerCase())
  );

  // Verificar se produto de venda já está vinculado
  const isVendaLinked = (productId: string) => {
    return modalLinkedVendas.some(lp => lp.external_product_id === productId);
  };

  // Verificar se estoque já está vinculado
  const isEstoqueLinked = (stockId: string) => {
    return modalLinkedEstoque.some(ls => ls.external_stock_id === stockId);
  };

  if (loading && rawMaterials.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Matérias-Primas</h1>
            <p className="text-gray-500 mt-1">Gerencie as matérias-primas e vincule aos produtos</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => window.location.href = '/compras/materias-primas/conciliacao'}>
              <Link2 size={18} className="mr-2" />
              Prod. Venda
            </Button>
            <Button variant="secondary" onClick={() => window.location.href = '/compras/materias-primas/conciliacao-estoque'}>
              <Link2 size={18} className="mr-2" />
              Estoque
            </Button>
            <Button onClick={handleCreate}>
              <Plus size={20} className="mr-2" />
              Nova Matéria-Prima
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {isGroupReadOnly ? (
            <input
              type="text"
              value={groupName}
              disabled
              className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
            />
          ) : (
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos os grupos</option>
              {groups.map((group: any) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          )}

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Tabela */}
        {paginatedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Package size={48} className="mb-4 text-gray-300" />
            <p className="text-lg font-medium">Nenhuma matéria-prima encontrada</p>
            <p className="text-sm text-gray-400">
              {search || filterCategory
                ? 'Tente ajustar os filtros'
                : 'Crie sua primeira matéria-prima'
              }
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Categoria</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Unidade</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Perda</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estoque Mín.</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estoque Atual</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Produtos</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.is_resale ? 'bg-purple-100' : 'bg-blue-100'}`}>
                          <Package size={20} className={item.is_resale ? 'text-purple-600' : 'text-blue-600'} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          {item.is_resale && (
                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Revenda</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.category || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center">{item.unit}</td>
                    <td className="px-6 py-4 text-center">
                      {item.loss_factor > 0 ? (
                        <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-sm">
                          <Percent size={14} />
                          {item.loss_factor}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">{item.min_stock} {item.unit}</td>
                    <td className="px-6 py-4 text-right">
                      {(() => {
                        const linkedStock = getLinkedStockTotal(item);
                        return (
                          <span className={`font-medium ${linkedStock < item.min_stock ? 'text-red-600' : 'text-green-600'}`}>
                            {linkedStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleOpenLinkModal(item)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                      >
                        <Link2 size={16} />
                        <span className="text-sm font-medium">
                          {item.raw_material_products?.length || 0}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.is_active ? (
                        <CheckCircle size={20} className="inline text-green-500" />
                      ) : (
                        <XCircle size={20} className="inline text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-600"
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
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredItems.length)} de {filteredItems.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </span>
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

      {/* Modal de Cadastro/Edição com Abas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingItem ? 'Editar Matéria-Prima' : 'Nova Matéria-Prima'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Abas */}
              <div className="flex gap-1 mt-4">
                <button
                  onClick={() => setModalTab('dados')}
                  className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
                    modalTab === 'dados'
                      ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Dados
                </button>
                {editingItem && (
                  <>
                    <button
                      onClick={() => setModalTab('venda')}
                      className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                        modalTab === 'venda'
                          ? 'bg-green-100 text-green-700 border-b-2 border-green-600'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Prod. Venda
                      <span className="bg-green-200 text-green-800 px-1.5 py-0.5 rounded text-xs">
                        {modalLinkedVendas.length}
                      </span>
                    </button>
                    <button
                      onClick={() => setModalTab('estoque')}
                      className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                        modalTab === 'estoque'
                          ? 'bg-orange-100 text-orange-700 border-b-2 border-orange-600'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Prod. Estoque
                      <span className="bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded text-xs">
                        {modalLinkedEstoque.length}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Conteúdo da aba */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Aba Dados */}
              {modalTab === 'dados' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                  {/* Nome e Categoria */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ex: Picanha"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ex: Carnes"
                        list="categories-list"
                      />
                      <datalist id="categories-list">
                        {categories.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Unidade e Perda */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="kg">Quilograma (kg)</option>
                        <option value="g">Grama (g)</option>
                        <option value="un">Unidade (un)</option>
                        <option value="lt">Litro (lt)</option>
                        <option value="ml">Mililitro (ml)</option>
                        <option value="cx">Caixa (cx)</option>
                        <option value="pc">Pacote (pc)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fator de Perda (%)</label>
                      <input
                        type="number"
                        value={formData.loss_factor}
                        onChange={(e) => setFormData({ ...formData, loss_factor: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ex: 20"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                  </div>

                  {/* Estoque Mínimo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Mínimo</label>
                    <input
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 10"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Botões */}
                  <div className="flex gap-2 pt-4 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <Button type="submit" isLoading={saving}>
                      {editingItem ? 'Salvar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Aba Prod. Venda */}
              {modalTab === 'venda' && editingItem && (
                <div className="space-y-4">
                  {/* Produtos Vinculados */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Produtos Vinculados ({modalLinkedVendas.length})</h3>
                    <p className="text-xs text-gray-500 mb-3">Use a tela de Conciliação para adicionar novos vínculos</p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {modalLinkedVendas.length === 0 ? (
                        <p className="text-gray-400 text-sm py-4 text-center">Nenhum produto vinculado</p>
                      ) : (
                        modalLinkedVendas.map((lp) => {
                          const productInfo = getExternalProductInfo(lp.external_product_id);
                          return (
                            <div
                              key={lp.id}
                              className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {productInfo.name}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>{lp.external_product_id}</span>
                                  {productInfo.company && (
                                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                      Emp: {productInfo.company}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    defaultValue={lp.quantity_per_unit}
                                    onBlur={(e) => {
                                      const newQty = parseFloat(e.target.value) || 0;
                                      if (newQty > 0 && newQty !== lp.quantity_per_unit) {
                                        handleModalUpdateVendaQty(lp.id, newQty);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const newQty = parseFloat((e.target as HTMLInputElement).value) || 0;
                                        if (newQty > 0 && newQty !== lp.quantity_per_unit) {
                                          handleModalUpdateVendaQty(lp.id, newQty);
                                        }
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }}
                                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                    step="0.001"
                                    min="0.001"
                                  />
                                  <span className="text-sm text-gray-600">{formData.unit}</span>
                                </div>
                                <button
                                  onClick={() => handleModalUnlinkVenda(lp.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors"
                                  title="Desvincular"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Aba Prod. Estoque */}
              {modalTab === 'estoque' && editingItem && (
                <div className="space-y-4">
                  {/* Estoques Vinculados */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Estoques Vinculados ({modalLinkedEstoque.length})</h3>
                    <p className="text-xs text-gray-500 mb-3">Use a tela de Conciliação para adicionar novos vínculos</p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {modalLinkedEstoque.length === 0 ? (
                        <p className="text-gray-400 text-sm py-4 text-center">Nenhum estoque vinculado</p>
                      ) : (
                        modalLinkedEstoque.map((ls) => (
                          <div
                            key={ls.id}
                            className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {ls.external_stock?.product_name || ls.external_stock?.external_product_id || 'N/A'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{ls.external_stock?.external_product_id}</span>
                                {ls.external_stock?.product_group && (
                                  <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                    {ls.external_stock?.product_group}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-sm font-medium ${
                                (ls.external_stock?.quantity || 0) < 0 ? 'text-red-600' : 'text-teal-600'
                              }`}>
                                {(ls.external_stock?.quantity || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} {ls.external_stock?.unit || formData.unit}
                              </span>
                              <button
                                onClick={() => handleModalUnlinkEstoque(ls.id)}
                                className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors"
                                title="Desvincular"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer com botões para abas de vínculo */}
            {(modalTab === 'venda' || modalTab === 'estoque') && (
              <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Fechar
                </Button>
                <Button onClick={handleSave} isLoading={saving}>
                  Salvar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Vincular Produtos */}
      {isLinkModalOpen && selectedRawMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-4xl mx-4 p-6 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Vincular Produtos</h2>
                <p className="text-gray-500 text-sm">
                  Matéria-Prima: <span className="font-medium text-gray-700">{selectedRawMaterial.name}</span>
                </p>
              </div>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
              {/* Produtos Vinculados */}
              <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-green-50 border-b border-gray-200">
                  <h3 className="font-semibold text-green-800">Produtos Vinculados ({linkedProducts.length})</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {linkedProducts.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      Nenhum produto vinculado
                    </div>
                  ) : (
                    linkedProducts.map((lp) => (
                      <div
                        key={lp.id}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {getExternalProductName(lp.external_product_id)}
                          </p>
                          <p className="text-sm text-green-700">
                            {lp.quantity_per_unit} {selectedRawMaterial.unit} por unidade
                          </p>
                        </div>
                        <button
                          onClick={() => handleUnlinkProduct(lp.id)}
                          className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors"
                          title="Desvincular"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Produtos Disponíveis */}
              <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-700 mb-2">Produtos Disponíveis</h3>
                  <div className="relative">
                    <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar produto..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {filteredProducts.slice(0, 50).map((product) => {
                    const linked = isProductLinked(product.external_id);
                    return (
                      <div
                        key={product.id}
                        className={`p-3 rounded-lg border ${
                          linked
                            ? 'bg-gray-100 border-gray-200 opacity-50'
                            : 'bg-white border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.external_id}</p>
                          </div>
                          {!linked && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="Qtd"
                                step="0.001"
                                min="0.001"
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                id={`qty-${product.id}`}
                              />
                              <button
                                onClick={() => {
                                  const input = document.getElementById(`qty-${product.id}`) as HTMLInputElement;
                                  const qty = parseFloat(input?.value || '0');
                                  if (qty > 0) {
                                    handleLinkProduct(product.id, qty);
                                    input.value = '';
                                  } else {
                                    alert('Informe a quantidade por unidade');
                                  }
                                }}
                                disabled={linkingProduct}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
                                title="Vincular"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          )}
                          {linked && (
                            <span className="text-green-600">
                              <CheckCircle size={18} />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
              <Button onClick={() => setIsLinkModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
