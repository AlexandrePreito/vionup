'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, FolderTree, Loader2, Leaf, GitCompare, X, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { Category, CompanyGroup, CategoryMapping } from '@/types';
import { useGroupFilter } from '@/hooks/useGroupFilter';

interface CategoryNode extends Category {
  children: CategoryNode[];
  mappingsCount?: number;
}

export default function CategoriasPage() {
  const router = useRouter();
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);

  // Buscar categorias
  const fetchCategories = async () => {
    if (!selectedGroupId) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/categories?group_id=${selectedGroupId}&include_inactive=true`);
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar mapeamentos para mostrar contador
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

  useEffect(() => {
    if (selectedGroupId) {
      fetchCategories();
      fetchMappings();
    }
  }, [selectedGroupId]);

  // Expandir automaticamente quando carregar categorias
  useEffect(() => {
    if (categories.length > 0) {
      // Expandir todos os nós por padrão
      const allIds = new Set(categories.map(c => c.id));
      setExpandedNodes(allIds);
    }
  }, [categories]);

  // Montar árvore de categorias
  const buildTree = (categories: Category[]): CategoryNode[] => {
    const categoryMap = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    // Primeiro, criar todos os nós
    categories.forEach(cat => {
      categoryMap.set(cat.id, { 
        ...cat, 
        children: [],
        mappingsCount: mappings.filter(m => m.category_id === cat.id).length
      });
    });

    // Depois, construir a árvore
    categories.forEach(cat => {
      const node = categoryMap.get(cat.id)!;
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    // Ordenar: Entradas primeiro, depois Saídas
    roots.sort((a: any, b: any) => {
      if (a.type === 'entrada' && b.type === 'saida') return -1;
      if (a.type === 'saida' && b.type === 'entrada') return 1;
      return a.name.localeCompare(b.name);
    });

    // Ordenar filhos por nome
    const sortChildren = (nodes: CategoryNode[]) => {
      nodes.sort((a: any, b: any) => a.name.localeCompare(b.name));
      nodes.forEach(node => sortChildren(node.children));
    };
    roots.forEach(root => sortChildren(root.children));

    return roots;
  };

  const tree = buildTree(categories);

  // Filtrar árvore por termo de busca
  const filterTree = (nodes: CategoryNode[], term: string): CategoryNode[] => {
    if (!term.trim()) return nodes;
    
    const searchLower = term.toLowerCase();
    
    const filterNode = (node: CategoryNode): CategoryNode | null => {
      const nameMatches = node.name.toLowerCase().includes(searchLower);
      const codeMatches = node.code?.toLowerCase().includes(searchLower);
      const descMatches = node.description?.toLowerCase().includes(searchLower);
      
      const filteredChildren = node.children
        .map(child => filterNode(child))
        .filter((child): child is CategoryNode => child !== null);
      
      // Incluir se o próprio nó corresponde ou tem filhos que correspondem
      if (nameMatches || codeMatches || descMatches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      
      return null;
    };
    
    return nodes
      .map(node => filterNode(node))
      .filter((node): node is CategoryNode => node !== null);
  };

  const filteredTree = filterTree(tree, searchTerm);

  // Destacar termo de busca no texto
  const highlightMatch = (text: string, term: string) => {
    if (!term.trim()) return text;
    
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === term.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
        : part
    );
  };

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
    const allIds = new Set(categories.map(c => c.id));
    setExpandedNodes(allIds);
  };

  // Colapsar todos
  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Criar categoria raiz
  const handleCreateRoot = (type: 'entrada' | 'saida') => {
    setEditingCategory(null);
    setParentCategory(null);
    setFormData({
      name: type === 'entrada' ? 'Entradas' : 'Saídas',
      code: '',
      description: ''
    });
    setIsModalOpen(true);
  };

  // Criar subcategoria
  const handleCreateChild = (parent: Category) => {
    setEditingCategory(null);
    setParentCategory(parent);
    setFormData({
      name: '',
      code: '',
      description: ''
    });
    setIsModalOpen(true);
  };

  // Editar categoria
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setParentCategory(null);
    setFormData({
      name: category.name,
      code: category.code || '',
      description: category.description || ''
    });
    setIsModalOpen(true);
  };

  // Salvar
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    try {
      setSaving(true);
      
      if (editingCategory) {
        // Editar
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            code: formData.code || null,
            description: formData.description || null
          })
        });

        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Erro ao atualizar categoria');
          return;
        }
      } else {
        // Criar
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_group_id: selectedGroupId,
            parent_id: parentCategory?.id || null,
            name: formData.name,
            code: formData.code || null,
            description: formData.description || null
          })
        });

        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Erro ao criar categoria');
          return;
        }
      }

      setIsModalOpen(false);
      fetchCategories();
      fetchMappings();
      
      // Expandir pai se estava criando filho
      if (parentCategory) {
        setExpandedNodes(prev => new Set([...prev, parentCategory.id]));
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar categoria');
    } finally {
      setSaving(false);
    }
  };

  // Excluir
  const handleDelete = async (category: Category) => {
    if (!confirm(`Deseja excluir a categoria "${category.name}"?`)) return;

    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir categoria');
        return;
      }

      fetchCategories();
      fetchMappings();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir categoria');
    }
  };

  // Renderizar nó da árvore
  const renderTreeNode = (node: CategoryNode, depth: number = 0, isLast: boolean = false) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const canAddChild = node.level < 4;
    
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
          className={`flex items-center gap-2 py-2.5 px-3 hover:bg-blue-50 rounded-lg group border border-transparent hover:border-blue-100 transition-all ${
            !node.is_active ? 'opacity-50' : ''
          }`}
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

          {/* Ícone */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            node.type === 'entrada' 
              ? (node.is_analytical ? 'bg-green-100' : 'bg-green-50') 
              : (node.is_analytical ? 'bg-red-100' : 'bg-red-50')
          }`}>
            {node.is_analytical ? (
              <Leaf size={18} className={node.type === 'entrada' ? 'text-green-600' : 'text-red-600'} />
            ) : (
              <FolderTree size={18} className={node.type === 'entrada' ? 'text-green-600' : 'text-red-600'} />
            )}
          </div>

          {/* Nome e Info */}
          <div className="flex-1 min-w-0">
            <span className="font-medium text-gray-900">
              {searchTerm ? highlightMatch(node.name, searchTerm) : node.name}
            </span>
            {node.description && (
              <p className="text-xs text-gray-500 truncate">{node.description}</p>
            )}
          </div>

          {/* Código */}
          {node.code && (
            <span className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded flex-shrink-0">
              {node.code}
            </span>
          )}

          {/* Badge de mapeamentos */}
          {node.is_analytical && node.mappingsCount && node.mappingsCount > 0 && (
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full flex-shrink-0 font-medium">
              {node.mappingsCount} mapeada{node.mappingsCount > 1 ? 's' : ''}
            </span>
          )}

          {/* Badge nível */}
          <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
            node.level === 1 ? 'bg-purple-100 text-purple-700' :
            node.level === 2 ? 'bg-blue-100 text-blue-700' :
            node.level === 3 ? 'bg-amber-100 text-amber-700' :
            'bg-emerald-100 text-emerald-700'
          }`}>
            N{node.level}
          </span>

          {/* Ações - sempre visíveis */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {canAddChild && (
              <button
                onClick={() => handleCreateChild(node)}
                className="p-1.5 rounded-lg text-green-600 hover:bg-green-100 transition-colors"
                title="Adicionar subcategoria"
              >
                <Plus size={18} />
              </button>
            )}
            <button
              onClick={() => handleEdit(node)}
              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
              title="Editar"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => handleDelete(node)}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 transition-colors"
              title="Excluir"
            >
              <Trash2 size={16} />
            </button>
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

  // Verificar se já existem categorias raiz (usar tree original, não filtrada)
  const hasEntradas = tree.some(c => c.type === 'entrada');
  const hasSaidas = tree.some(c => c.type === 'saida');
  
  // Verificar se há resultados na busca
  const hasSearchResults = filteredTree.length > 0;

  return (
    <>
      <div className="space-y-6 pt-4">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
            <p className="text-gray-500 mt-1">Gerencie a estrutura hierárquica de categorias</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => router.push('/conciliacao/categorias')}>
              <GitCompare size={18} className="mr-2" />
              Conciliação
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-4 items-center flex-wrap">
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

          {/* Buscar */}
          {selectedGroupId && (
            <div className="flex-1 max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {selectedGroupId && categories.length > 0 && (
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
            <p className="text-gray-500">Escolha um grupo para visualizar e gerenciar as categorias</p>
          </div>
        ) : tree.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <FolderTree size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Nenhuma categoria</h2>
            <p className="text-gray-500 mb-6">Crie as categorias raiz para começar</p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => handleCreateRoot('entrada')} className="bg-green-600 hover:bg-green-700">
                <Plus size={20} className="mr-2" />
                Criar "Entradas"
              </Button>
              <Button onClick={() => handleCreateRoot('saida')} className="bg-red-600 hover:bg-red-700">
                <Plus size={20} className="mr-2" />
                Criar "Saídas"
              </Button>
            </div>
          </div>
        ) : searchTerm && !hasSearchResults ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Search size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Nenhum resultado</h2>
            <p className="text-gray-500">Nenhuma categoria encontrada para "{searchTerm}"</p>
            <button 
              onClick={() => setSearchTerm('')}
              className="mt-4 text-blue-600 hover:underline"
            >
              Limpar busca
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Botões para criar raiz se não existir */}
            {(!hasEntradas || !hasSaidas) && (
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex gap-4">
                {!hasEntradas && (
                  <Button onClick={() => handleCreateRoot('entrada')} size="sm" className="bg-green-600 hover:bg-green-700">
                    <Plus size={16} className="mr-1" />
                    Criar "Entradas"
                  </Button>
                )}
                {!hasSaidas && (
                  <Button onClick={() => handleCreateRoot('saida')} size="sm" className="bg-red-600 hover:bg-red-700">
                    <Plus size={16} className="mr-1" />
                    Criar "Saídas"
                  </Button>
                )}
              </div>
            )}

            {/* Árvore */}
            <div className="p-4 space-y-1">
              {filteredTree.map((node, index) => renderTreeNode(node, 0, index === filteredTree.length - 1))}
            </div>
            
            {/* Total de categorias */}
            <div className="px-6 py-2 bg-blue-50 border-t border-blue-100 text-sm text-blue-700">
              Total: <strong>{categories.length}</strong> categorias
            </div>

            {/* Legenda */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <FolderTree size={16} className="text-green-500" />
                <span>Entrada (sintética)</span>
              </div>
              <div className="flex items-center gap-2">
                <FolderTree size={16} className="text-red-500" />
                <span>Saída (sintética)</span>
              </div>
              <div className="flex items-center gap-2">
                <Leaf size={16} className="text-green-500" />
                <span>Entrada (analítica)</span>
              </div>
              <div className="flex items-center gap-2">
                <Leaf size={16} className="text-red-500" />
                <span>Saída (analítica)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h2>
                {parentCategory && (
                  <p className="text-sm text-gray-500 mt-1">
                    Subcategoria de: <span className="font-medium">{parentCategory.name}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Receitas Operacionais"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ex: 1.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição opcional"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} isLoading={saving}>
                {editingCategory ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
