'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Package, Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight, Link2, Percent, Boxes, ChevronDown, ChevronUp, FolderTree, X, Folder, Layers, GitBranch, Circle, Weight, Check } from 'lucide-react';
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
  const [filterN1Id, setFilterN1Id] = useState<string>('');
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
    parent_id: null as string | null
  });
  const [saving, setSaving] = useState(false);

  // Abas do modal
  const [modalTab, setModalTab] = useState<'dados' | 'vendas' | 'estoque'>('dados');
  
  // Vínculos no modal de edição
  const [modalLinkedVendas, setModalLinkedVendas] = useState<any[]>([]);
  const [modalLinkedEstoque, setModalLinkedEstoque] = useState<any[]>([]);
  const [searchVenda, setSearchVenda] = useState('');
  const [searchEstoque, setSearchEstoque] = useState('');
  const [externalStock, setExternalStock] = useState<any[]>([]);
  const [editingVendaQtyId, setEditingVendaQtyId] = useState<string | null>(null);
  const [editVendaQtyValue, setEditVendaQtyValue] = useState('');

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

  // N1 (nível 1) para filtro
  const n1List = rawMaterials.filter(m => (m.level || 1) === 1);
  const treeByN1 = filterN1Id ? tree.filter(n => n.id === filterN1Id) : tree;

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

  const filteredTree = filterTree(treeByN1, search);

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
      parent_id: null
    });
    setModalTab('dados');
    setModalLinkedVendas([]);
    setModalLinkedEstoque([]);
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
      parent_id: parent.id
    });
    setModalTab('dados');
    setModalLinkedVendas([]);
    setModalLinkedEstoque([]);
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
      parent_id: item.parent_id || null
    });
    setModalTab('dados');
    // Se for N2, carregar vínculos
    if ((item.level || 1) === 2) {
      fetchModalLinkedVendas(item.id);
      fetchModalLinkedEstoque(item.id);
    }
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

      const { gramatura, ...cleanPayload } = {
        ...formData,
        parent_id: (formData.parent_id && formData.parent_id.trim() !== '') ? formData.parent_id : null,
        company_id: (formData.company_id && formData.company_id.trim() !== '') ? formData.company_id : null,
        category: (formData.category && formData.category.trim() !== '') ? formData.category : null
      } as typeof formData & { gramatura?: number };

      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload)
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
    const canAddChild = node.level < 2;
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
              'bg-blue-100'
            }`}>
              {node.level === 1 ? (
                <FolderTree size={18} className="text-purple-600" />
              ) : (
                <Layers size={18} className="text-blue-600" />
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
            </div>

            {/* Badge nível - coluna separada */}
            <div className="w-16 flex justify-center items-center">
              <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                node.level === 1 ? 'bg-purple-100 text-purple-700' :
                'bg-blue-100 text-blue-700'
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

          {n1List.length > 0 && (
            <select
              value={filterN1Id}
              onChange={(e) => setFilterN1Id(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">N1: Todos</option>
              {n1List.map((n1) => (
                <option key={n1.id} value={n1.id}>N1: {n1.name}</option>
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
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
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

            {/* Abas - só mostrar se editando N2 */}
            {editingItem && (editingItem.level || 1) === 2 && (
              <div className="flex border-b border-gray-200 px-6">
                <button
                  onClick={() => setModalTab('dados')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    modalTab === 'dados'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Dados
                </button>
                <button
                  onClick={() => setModalTab('vendas')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    modalTab === 'vendas'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Vendas
                  {modalLinkedVendas.length > 0 && (
                    <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                      {modalLinkedVendas.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setModalTab('estoque')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    modalTab === 'estoque'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Estoque
                  {modalLinkedEstoque.length > 0 && (
                    <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                      {modalLinkedEstoque.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* === ABA DADOS === */}
              {modalTab === 'dados' && (
                (() => {
                  let currentLevel = 1;
                  if (parentMaterial) {
                    currentLevel = (parentMaterial.level || 1) + 1;
                  } else if (editingItem) {
                    currentLevel = editingItem.level || 1;
                  }

                  return (
                    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                      {/* Nome */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={currentLevel === 1 ? "Ex: Aves" : "Ex: Coração de Frango"}
                          required
                          autoFocus
                        />
                      </div>

                      {/* Pai - apenas ao editar nível 2 */}
                      {editingItem && currentLevel === 2 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Matéria-Prima Pai
                          </label>
                          <select
                            value={formData.parent_id || ''}
                            onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Nenhuma (raiz - Nível 1)</option>
                            {rawMaterials
                              .filter(m => m.id !== editingItem.id)
                              .filter(m => m.parent_id !== editingItem.id)
                              .filter(m => (m.level || 1) === 1)
                              .map((mat) => (
                                <option key={mat.id} value={mat.id}>
                                  {mat.name} {mat.loss_factor > 0 ? `(${mat.loss_factor}%)` : ''}
                                </option>
                              ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Selecione uma matéria-prima de nível 1 como pai
                          </p>
                        </div>
                      )}

                      {/* Fator de Correção + Estoque Mínimo - apenas nível 2, lado a lado */}
                      {currentLevel === 2 && (
                        <div className="grid grid-cols-2 gap-4">
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
                            <p className="text-xs text-gray-500 mt-1">Perda/correção (%)</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Estoque Mínimo (kg)
                            </label>
                            <input
                              type="number"
                              value={formData.min_stock}
                              onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Ex: 50"
                              min="0"
                              step="0.1"
                            />
                            <p className="text-xs text-gray-500 mt-1">Alerta quando abaixo</p>
                          </div>
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
                })()
              )}

              {/* === ABA PRODUTOS VENDAS === */}
              {modalTab === 'vendas' && editingItem && (
                <div className="space-y-4">
                  {/* Lista de produtos vinculados */}
                  {modalLinkedVendas.length === 0 ? (
                    <div className="text-center py-8">
                      <Package size={40} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">Nenhum produto de venda vinculado</p>
                      <p className="text-gray-400 text-sm mt-1">Use a tela de Conciliação para vincular produtos</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                        {modalLinkedVendas.length} produto(s) vinculado(s)
                      </p>
                      {modalLinkedVendas.map((link: any) => {
                        const product = externalProducts.find(
                          (p: any) => p.id === link.external_product_id || p.external_id === link.external_product_id
                        );
                        const qtyInGrams = (link.quantity_per_unit || 0) * 1000;
                        const isEditingQty = editingVendaQtyId === link.id;

                        return (
                          <div key={link.id} className="border border-blue-200 bg-blue-50 rounded-xl p-4 hover:border-blue-300 transition-colors">
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
                                    handleModalUnlinkVenda(link.id);
                                  }
                                }}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                title="Desvincular"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            {/* Quantidade / Gramatura - edição inline */}
                            <div className="mt-3 flex items-center gap-2">
                              <Weight size={14} className="text-gray-400" />
                              {isEditingQty ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="number"
                                    value={editVendaQtyValue}
                                    onChange={(e) => setEditVendaQtyValue(e.target.value)}
                                    step="0.001"
                                    min="0.001"
                                    className="w-24 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                  />
                                  <span className="text-xs text-gray-500">{editingItem.unit}</span>
                                  <button
                                    onClick={() => {
                                      const val = parseFloat(editVendaQtyValue);
                                      if (val > 0) {
                                        handleModalUpdateVendaQty(link.id, val);
                                        setEditingVendaQtyId(null);
                                      }
                                    }}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    title="Salvar"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => setEditingVendaQtyId(null)}
                                    className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                                    title="Cancelar"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div
                                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1 -mx-2 transition-colors"
                                  onClick={() => {
                                    setEditingVendaQtyId(link.id);
                                    setEditVendaQtyValue(String(link.quantity_per_unit || 0));
                                  }}
                                  title="Clique para editar"
                                >
                                  <span className="text-sm font-semibold text-gray-900">
                                    {link.quantity_per_unit} {editingItem.unit}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    ({qtyInGrams.toFixed(0)}g)
                                  </span>
                                  <Pencil size={12} className="text-gray-300" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* === ABA ESTOQUE === */}
              {modalTab === 'estoque' && editingItem && (
                <div className="space-y-4">
                  {/* Estoques vinculados */}
                  {modalLinkedEstoque.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                        {modalLinkedEstoque.length} estoque(s) vinculado(s)
                      </p>
                      {modalLinkedEstoque.map((link: any) => {
                        const stockItem = externalStock.find((s: any) => s.id === link.external_stock_id);
                        return (
                          <div key={link.id} className="flex items-center gap-3 border border-green-200 bg-green-50 rounded-xl p-3">
                            <Boxes size={18} className="text-green-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-green-900 truncate">
                                {stockItem?.product_name || link.external_stock_id}
                              </p>
                              {stockItem && (
                                <p className="text-xs text-green-600">
                                  {stockItem.quantity} {stockItem.unit || 'un'}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                if (confirm('Desvincular este estoque?')) {
                                  handleModalUnlinkEstoque(link.id);
                                }
                              }}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                              title="Desvincular"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Conciliação de estoque apenas na tela dedicada */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      A conciliação de estoque é feita na tela <strong>Conciliação Estoque</strong> (menu Compras).
                    </p>
                  </div>
                </div>
              )}
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
