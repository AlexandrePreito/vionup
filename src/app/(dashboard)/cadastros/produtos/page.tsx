'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Package, Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight, GitCompare, Link2, X, Power } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { Product, CompanyGroup, ProductMapping } from '@/types';
import { useGroupFilter } from '@/hooks/useGroupFilter';
import { useAuth } from '@/contexts/AuthContext';

const ITEMS_PER_PAGE = 20;

export default function ProdutosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    company_group_id: '',
    name: '',
    code: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [productMappings, setProductMappings] = useState<ProductMapping[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);

  // Buscar produtos
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = selectedGroupId
        ? `/api/products?group_id=${selectedGroupId}&include_inactive=true`
        : '/api/products?include_inactive=true';
      console.log('ProdutosPage - Buscando produtos:', url);
      
      const headers: HeadersInit = {};
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }
      
      const res = await fetch(url, { headers });
      console.log('ProdutosPage - Status da resposta:', res.status);
      if (!res.ok) {
        const errorData = await res.json();
        console.error('ProdutosPage - Erro na resposta:', errorData);
        setProducts([]);
        return;
      }
      const data = await res.json();
      console.log('ProdutosPage - Dados recebidos:', data);
      const productsList = data.products || data || [];
      console.log('ProdutosPage - Produtos encontrados:', productsList.length);
      
      // Filtro de segurança: garantir que apenas produtos do grupo selecionado sejam exibidos
      const filteredProducts = selectedGroupId 
        ? productsList.filter((p: any) => p.company_group_id === selectedGroupId)
        : productsList;
      console.log('ProdutosPage - Produtos filtrados:', filteredProducts.length);
      setProducts(filteredProducts);
    } catch (error) {
      console.error('ProdutosPage - Erro ao buscar produtos:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Só buscar produtos se houver grupo selecionado OU se o usuário for master
    // Para usuários não-master, o grupo é fixo e já está definido pelo hook
    if (selectedGroupId || !isGroupReadOnly) {
      fetchProducts();
    } else {
      // Se não há grupo e usuário não pode mudar, limpar produtos
      setProducts([]);
      setLoading(false);
    }
  }, [selectedGroupId, isGroupReadOnly]);

  // Filtrar produtos
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  // Paginação
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Resetar página quando filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedGroupId]);

  // Buscar mapeamentos de um produto
  const fetchProductMappings = async (productId: string) => {
    try {
      setLoadingMappings(true);
      const headers: HeadersInit = {};
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }
      const res = await fetch(`/api/mappings/products?product_id=${productId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProductMappings(data.mappings || []);
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
      const headers: HeadersInit = {};
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }
      const res = await fetch(`/api/mappings/products?id=${mappingId}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok && editingProduct) {
        // Recarregar mapeamentos
        await fetchProductMappings(editingProduct.id);
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
    setEditingProduct(null);
    setProductMappings([]);
    setFormData({
      company_group_id: selectedGroupId || '',
      name: '',
      code: '',
      description: ''
    });
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      company_group_id: product.company_group_id,
      name: product.name,
      code: product.code || '',
      description: product.description || ''
    });
    setIsModalOpen(true);
    // Buscar mapeamentos do produto
    await fetchProductMappings(product.id);
  };

  // Salvar (criar ou editar)
  const handleSave = async () => {
    if (!formData.company_group_id || !formData.name) {
      alert('Grupo e nome são obrigatórios');
      return;
    }

    try {
      setSaving(true);
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : '/api/products';

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }
      
      const res = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          code: formData.code || null,
          description: formData.description || null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao salvar');
        return;
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  // Excluir
  const handleDelete = async (product: Product) => {
    if (!confirm(`Deseja excluir o produto "${product.name}"?`)) return;

    try {
      const headers: HeadersInit = {};
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
        headers
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao excluir');
        return;
      }

      fetchProducts();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir produto');
    }
  };

  // Alternar status ativo/inativo
  const handleToggleStatus = async (product: Product) => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...product,
          is_active: !product.is_active
        })
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao alterar status');
        return;
      }

      fetchProducts();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status');
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
            <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
            <p className="text-gray-500 mt-1">Gerencie os produtos para controle de metas</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => router.push('/conciliacao/produtos')}>
              <GitCompare size={18} className="mr-2" />
              Conciliação
            </Button>
            <Button onClick={handleCreate}>
              <Plus size={20} className="mr-2" />
              Novo Produto
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
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto</h2>
            <p className="text-gray-500 mb-4">
              {search || selectedGroupId 
                ? `Nenhum produto encontrado para "${search || groupName}"`
                : 'Crie seu primeiro produto no sistema'
              }
            </p>
            {!search && !selectedGroupId && (
              <Button onClick={handleCreate}>
                Criar Produto
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Descrição</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Grupo</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {product.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.company_group?.name || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      {product.is_active ? (
                        <CheckCircle size={20} className="inline text-green-500" />
                      ) : (
                        <XCircle size={20} className="inline text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(product)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          title={product.is_active ? 'Desativar produto' : 'Ativar produto'}
                        >
                          <Power size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
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
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length} produtos
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
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
              {/* Linha 1: Grupo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
                <select
                  value={formData.company_group_id}
                  onChange={(e) => setFormData({ ...formData, company_group_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Selecione um grupo</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              {/* Linha 2: Código e Nome */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="Ex: PROD001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nome do produto"
                    required
                  />
                </div>
              </div>

              {/* Linha 3: Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descrição opcional"
                  rows={3}
                />
              </div>

              {/* Conciliações (apenas no modo edição) */}
              {editingProduct && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Link2 size={16} className="text-green-600" />
                      Conciliações ({productMappings.length})
                    </div>
                  </label>
                  
                  {loadingMappings ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : productMappings.length === 0 ? (
                    <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 text-center">
                      Nenhum produto externo vinculado
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {productMappings.map((mapping) => (
                        <div
                          key={mapping.id}
                          className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                              <Package size={16} className="text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {mapping.external_product?.name || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Código: {mapping.external_product?.external_code || mapping.external_product?.external_id || '-'}
                                {(mapping.external_product?.product_group || mapping.external_product?.category) && 
                                  ` • ${mapping.external_product.product_group || mapping.external_product.category}`}
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
                  {editingProduct ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
