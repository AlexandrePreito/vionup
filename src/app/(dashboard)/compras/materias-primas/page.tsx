'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Package, Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight, Link2, Percent, Boxes, ChevronDown, ChevronUp, FolderTree, X, Folder, Layers, GitBranch, Circle } from 'lucide-react';
import { Button } from '@/components/ui';
import { RawMaterial, CompanyGroup, Company, ExternalProduct } from '@/types';
import { useGroupFilter } from '@/hooks/useGroupFilter';

interface RawMaterialNode extends RawMaterial {
  children: RawMaterialNode[];
}

export default function MateriasPrimasPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [externalProducts, setExternalProducts] = useState<ExternalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Modal de Cadastro/Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RawMaterial | null>(null);
  const [parentMaterial, setParentMaterial] = useState<RawMaterial | null>(null);
  const [formData, setFormData] = useState({
    company_group_id: '',
    company_id: '',
    name: '',
    unit: 'kg',
    loss_factor: 0,
    min_stock: 0,
    current_stock: 0,
    category: '',
    is_resale: false,
    parent_id: null as string | null,
    gramatura: 0
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
      const companiesList = data.companies || [];
      // Filtro de segurança: garantir que apenas empresas do grupo selecionado sejam exibidas
      const filteredCompanies = companiesList.filter((c: any) => c.company_group_id === groupId);
      setCompanies(filteredCompanies);
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
    } else {
      // Se não há grupo selecionado, limpar dados e parar loading
      setRawMaterials([]);
      setCompanies([]);
      setExternalProducts([]);
      setExternalStock([]);
      setLoading(false);
    }
  }, [selectedGroupId]);

  // Expandir automaticamente quando carregar matérias-primas
  useEffect(() => {
    if (rawMaterials.length > 0) {
      // Expandir todos os nós por padrão
      const allIds = new Set(rawMaterials.map(r => r.id));
      setExpandedNodes(allIds);
    }
  }, [rawMaterials]);

  // Montar árvore de matérias-primas
  const buildTree = (materials: RawMaterial[]): RawMaterialNode[] => {
    const materialMap = new Map<string, RawMaterialNode>();
    const roots: RawMaterialNode[] = [];

    // Primeiro, criar todos os nós
    materials.forEach(mat => {
      materialMap.set(mat.id, { 
        ...mat, 
        children: []
      });
    });

    // Depois, construir a árvore e adicionar informações do pai
    materials.forEach(mat => {
      const node = materialMap.get(mat.id)!;
      if (mat.parent_id) {
        const parent = materialMap.get(mat.parent_id);
        if (parent) {
          parent.children.push(node);
          // Se o nó é nível 3, adicionar o loss_factor do pai (nível 2)
          if (node.level === 3 && parent.level === 2) {
            (node as any).parent_loss_factor = parent.loss_factor;
          }
        }
      } else {
        roots.push(node);
      }
    });

    // Ordenar filhos por nome
    const sortChildren = (nodes: RawMaterialNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(node => sortChildren(node.children));
    };
    roots.forEach(root => sortChildren(root.children));

    return roots;
  };

  const tree = buildTree(rawMaterials);

  // Filtrar árvore por termo de busca
  const filterTree = (nodes: RawMaterialNode[], term: string): RawMaterialNode[] => {
    if (!term.trim()) return nodes;
    
    const searchLower = term.toLowerCase();
    
    const filterNode = (node: RawMaterialNode): RawMaterialNode | null => {
      const nameMatches = node.name.toLowerCase().includes(searchLower);
      const categoryMatches = node.category?.toLowerCase().includes(searchLower);
      
      const filteredChildren = node.children
        .map(child => filterNode(child))
        .filter((child): child is RawMaterialNode => child !== null);
      
      // Incluir se o próprio nó corresponde ou tem filhos que correspondem
      if (nameMatches || categoryMatches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      
      return null;
    };
    
    return nodes
      .map(node => filterNode(node))
      .filter((node): node is RawMaterialNode => node !== null);
  };

  const filteredTree = filterTree(tree, search);

  // Toggle expandir/colapsar
  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  // Expandir todos
  const expandAll = () => {
    const allIds = new Set(rawMaterials.map(r => r.id));
    setExpandedNodes(allIds);
  };

  // Colapsar todos
  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

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

  // Criar matéria-prima raiz
  const handleCreateRoot = () => {
    setEditingItem(null);
    setParentMaterial(null);
    setFormData({
      company_group_id: selectedGroupId,
      company_id: '',
      name: '',
      unit: 'kg',
      loss_factor: 0,
      min_stock: 0,
      current_stock: 0,
      category: '',
      is_resale: false,
      parent_id: null,
      gramatura: 0
    });
    setIsModalOpen(true);
  };

  // Criar sub-matéria-prima
  const handleCreateChild = (parent: RawMaterial) => {
    setEditingItem(null);
    setParentMaterial(parent);
    const nextLevel = (parent.level || 1) + 1;
    setFormData({
      company_group_id: selectedGroupId,
      company_id: '',
      name: '',
      unit: 'kg',
      loss_factor: nextLevel === 2 ? 0 : 0,
      min_stock: 0,
      current_stock: 0,
      category: parent.category || '',
      is_resale: false,
      parent_id: parent.id,
      gramatura: nextLevel === 3 ? 0 : 0
    });
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleEdit = (item: RawMaterial) => {
    setEditingItem(item);
    setParentMaterial(null);
    setFormData({
      company_group_id: item.company_group_id,
      company_id: item.company_id || '',
      name: item.name,
      unit: 'kg',
      loss_factor: item.loss_factor,
      min_stock: item.min_stock,
      current_stock: item.current_stock,
      category: item.category || '',
      is_resale: item.is_resale,
      parent_id: item.parent_id || null,
      gramatura: item.gramatura || 0
    });
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

      const payload = {
        ...formData,
        parent_id: (formData.parent_id && formData.parent_id.trim() !== '') ? formData.parent_id : null,
        company_id: (formData.company_id && formData.company_id.trim() !== '') ? formData.company_id : null,
        category: (formData.category && formData.category.trim() !== '') ? formData.category : null
      };

      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao salvar');
        return;
      }

      setIsModalOpen(false);
      fetchRawMaterials();
      
      // Expandir pai se estava criando filho
      if (parentMaterial) {
        setExpandedNodes(prev => new Set([...prev, parentMaterial.id]));
      }
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

  // Renderizar nó da árvore
  const renderTreeNode = (node: RawMaterialNode, depth: number = 0, isLast: boolean = false) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const canAddChild = node.level < 3;
    const linkedStock = getLinkedStockTotal(node);
    
    return (
      <div key={node.id} className="relative">
        {/* Linha vertical conectando aos irmãos */}
        {depth > 0 && (
          <div 
            className="absolute left-0 top-0 w-px bg-gray-200"
            style={{ 
              left: `${(depth - 1) * 28 + 20}px`,
              height: isLast ? '20px' : '100%'
            }}
          />
        )}
        
        {/* Linha horizontal */}
        {depth > 0 && (
          <div 
            className="absolute top-5 h-px bg-gray-200"
            style={{ 
              left: `${(depth - 1) * 28 + 20}px`,
              width: '16px'
            }}
          />
        )}

        <div 
          className={`relative flex items-center py-2.5 px-3 hover:bg-blue-50 rounded-lg group border border-transparent hover:border-blue-100 transition-all ${
            !node.is_active ? 'opacity-50' : ''
          }`}
        >
          {/* Parte esquerda com indentação */}
          <div 
            className="flex items-center gap-2 flex-1 min-w-0"
            style={{ marginLeft: `${depth * 28}px` }}
          >
            {/* Botão expandir/colapsar */}
            <button
              onClick={() => toggleNode(node.id)}
              className={`p-1 rounded hover:bg-gray-200 flex-shrink-0 ${hasChildren ? '' : 'invisible'}`}
            >
              {isExpanded ? (
                <ChevronDown size={18} className="text-gray-600" />
              ) : (
                <ChevronRight size={18} className="text-gray-600" />
              )}
            </button>

            {/* Ícone - diferente por nível (hierarquia) */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              node.level === 1 ? 'bg-purple-100' :
              node.level === 2 ? 'bg-blue-100' :
              'bg-amber-100'
            }`}>
              {node.level === 1 ? (
                <FolderTree size={18} className="text-purple-600" />
              ) : node.level === 2 ? (
                <Layers size={18} className="text-blue-600" />
              ) : (
                <Package size={18} className="text-amber-600" />
              )}
            </div>

            {/* Nome e Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{node.name}</span>
                {node.is_resale && (
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Revenda</span>
                )}
              </div>
              {node.category && (
                <p className="text-xs text-gray-500 truncate">{node.category}</p>
              )}
            </div>
          </div>

          {/* Colunas fixas à direita (sem indentação) */}
          <div className="flex items-center gap-4 flex-shrink-0 pr-2">
            {/* Fator de Correção - coluna separada */}
            <div className="w-28 flex justify-center items-center">
              {node.level === 2 && (
                <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs whitespace-nowrap">
                  <Percent size={12} />
                  {node.loss_factor}%
                </span>
              )}
              {node.level === 3 && (node as any).parent_loss_factor !== undefined && (
                <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs whitespace-nowrap">
                  <Percent size={12} />
                  {(node as any).parent_loss_factor}%
                </span>
              )}
            </div>

            {/* Gramatura - coluna separada */}
            <div className="w-24 flex justify-center items-center">
              {node.level === 3 && node.gramatura && (
                <span className="text-xs text-gray-700 font-medium whitespace-nowrap">
                  {node.gramatura}g
                </span>
              )}
            </div>

            {/* Badge nível - coluna separada */}
            <div className="w-16 flex justify-center items-center">
              <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                node.level === 1 ? 'bg-purple-100 text-purple-700' :
                node.level === 2 ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                N{node.level}
              </span>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {canAddChild && (
                <button
                  onClick={() => handleCreateChild(node)}
                  className="p-1.5 rounded-lg text-green-600 hover:bg-green-100 transition-colors"
                  title="Adicionar sub-matéria-prima"
                >
                  <Plus size={16} />
                </button>
              )}
              <button
                onClick={() => handleEdit(node)}
                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                title="Editar"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => handleDelete(node)}
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 transition-colors"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Filhos */}
        {hasChildren && isExpanded && (
          <div className="relative">
            {node.children.map((child, index) => 
              renderTreeNode(child, depth + 1, index === node.children.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading && rawMaterials.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Se não há grupo selecionado, mostrar mensagem
  if (!selectedGroupId && groups.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Matérias-Primas</h1>
            <p className="text-gray-500 mt-1">Gerencie as matérias-primas e vincule aos produtos</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
          <Package size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium">Selecione um grupo</p>
          <p className="text-sm text-gray-400 mt-2">Escolha um grupo acima para visualizar as matérias-primas</p>
        </div>
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
            <Button onClick={handleCreateRoot}>
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

          {rawMaterials.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="text-sm text-blue-600 hover:underline"
              >
                Expandir todos
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-blue-600 hover:underline"
              >
                Colapsar todos
              </button>
            </div>
          )}
        </div>

        {/* Árvore de Matérias-Primas */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Loader2 size={48} className="mx-auto text-gray-300 mb-4 animate-spin" />
            <p className="text-gray-500">Carregando matérias-primas...</p>
          </div>
        ) : !selectedGroupId ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Selecione um grupo</h2>
            <p className="text-gray-500">Escolha um grupo para visualizar e gerenciar as matérias-primas</p>
          </div>
        ) : search && filteredTree.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Search size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Nenhum resultado</h2>
            <p className="text-gray-500">Nenhuma matéria-prima encontrada para "{search}"</p>
            <button 
              onClick={() => setSearch('')}
              className="mt-4 text-blue-600 hover:underline"
            >
              Limpar busca
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Árvore */}
            <div className="p-4 space-y-1">
              {filteredTree.map((node, index) => renderTreeNode(node, 0, index === filteredTree.length - 1))}
            </div>
            
            {/* Total de matérias-primas */}
            <div className="px-6 py-2 bg-blue-50 border-t border-blue-100 text-sm text-blue-700">
              Total: <strong>{rawMaterials.length}</strong> matérias-primas
            </div>
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingItem ? 'Editar Matéria-Prima' : 'Nova Matéria-Prima'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              {parentMaterial && (
                <p className="text-sm text-gray-500 mt-2">
                  Sub-matéria-prima de: <span className="font-medium">{parentMaterial.name}</span>
                </p>
              )}
            </div>

            {/* Conteúdo */}
            <div className="px-6 py-4">
              {(() => {
                // Determinar o nível atual
                let currentLevel = 1;
                
                if (parentMaterial) {
                  // Criando filho de um pai específico
                  currentLevel = (parentMaterial.level || 1) + 1;
                } else if (editingItem) {
                  // Editando item existente
                  currentLevel = editingItem.level || 1;
                } else {
                  // Criando item raiz (nível 1) - sempre quando clicar em "Nova Matéria-Prima"
                  currentLevel = 1;
                }

                return (
                  <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                    {/* Nome - todos os níveis */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={
                          currentLevel === 1 ? "Ex: Bovino" :
                          currentLevel === 2 ? "Ex: Cupim" :
                          "Ex: CUPIM 300g"
                        }
                        required
                        autoFocus
                      />
                    </div>

                    {/* Pai - apenas ao editar nível 2 ou 3 */}
                    {editingItem && (currentLevel === 2 || currentLevel === 3) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Matéria-Prima Pai
                        </label>
                        <select
                          value={formData.parent_id || ''}
                          onChange={(e) => {
                            const newParentId = e.target.value || null;
                            setFormData({ 
                              ...formData, 
                              parent_id: newParentId
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Nenhuma (raiz - Nível 1)</option>
                          {rawMaterials
                            .filter(m => m.id !== editingItem.id)
                            .filter(m => m.parent_id !== editingItem.id)
                            .filter(m => {
                              // Para nível 2, só pode ter pai nível 1
                              // Para nível 3, só pode ter pai nível 2
                              if (currentLevel === 2) {
                                return (m.level || 1) === 1;
                              } else if (currentLevel === 3) {
                                return (m.level || 1) === 2;
                              }
                              return false;
                            })
                            .map((mat) => (
                              <option key={mat.id} value={mat.id}>
                                {mat.name} {mat.level === 2 && mat.loss_factor > 0 ? `(${mat.loss_factor}%)` : ''} {mat.level === 3 && mat.gramatura ? `(${mat.gramatura}g)` : ''}
                              </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          {currentLevel === 2 
                            ? "Selecione uma matéria-prima de nível 1 como pai" 
                            : "Selecione uma matéria-prima de nível 2 como pai"}
                        </p>
                      </div>
                    )}

                    {/* Nível 2: Fator de Correção */}
                    {currentLevel === 2 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          % Fator de Correção
                        </label>
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
                        <p className="text-xs text-gray-500 mt-1">Percentual de perda/correção (apenas nível 2)</p>
                      </div>
                    )}

                    {/* Nível 3: Gramatura */}
                    {currentLevel === 3 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gramatura (g)
                        </label>
                        <input
                          type="number"
                          value={formData.gramatura}
                          onChange={(e) => setFormData({ ...formData, gramatura: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ex: 300"
                          min="0"
                          step="1"
                        />
                        <p className="text-xs text-gray-500 mt-1">Peso em gramas (apenas nível 3). Tudo será convertido para kg automaticamente.</p>
                      </div>
                    )}

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
                );
              })()}
            </div>
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
                  <X size={20} className="text-gray-500" />
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
