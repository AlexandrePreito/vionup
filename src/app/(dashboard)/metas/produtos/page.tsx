'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, Search, Package, Loader2, 
  ChevronLeft, ChevronRight, Users, Download, X
} from 'lucide-react';
import { Button } from '@/components/ui';
import { CompanyGroup, Company, Product } from '@/types';
import { useGroupFilter } from '@/hooks/useGroupFilter';

interface ProductGoal {
  id: string;
  company_group_id: string;
  goal_type: string;
  year: number;
  month: number;
  company_id: string | null;
  employee_id: string | null;
  product_id: string | null;
  goal_value: number;
  goal_unit: string;
  is_active: boolean;
  created_at: string;
  // Relacionamentos
  company?: { id: string; name: string };
  employee?: { id: string; name: string };
  product?: { id: string; name: string };
}

interface SelectedProduct {
  id: string;
  name: string;
  quantity: number;
}

const ITEMS_PER_PAGE = 20;

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function MetaProdutosPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [goals, setGoals] = useState<ProductGoal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterCompany, setFilterCompany] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Modal de Cadastro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    company_group_id: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Produtos selecionados
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  
  // Busca de produtos no modal
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  
  // Funcionários selecionados para distribuição (inclui company_id)
  const [selectedEmployeesForDist, setSelectedEmployeesForDist] = useState<{id: string; name: string; company_id: string}[]>([]);
  const [showDistribution, setShowDistribution] = useState(false);

  // Modal de edição individual
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ProductGoal | null>(null);
  const [editQuantity, setEditQuantity] = useState(0);

  // Modal de edição em massa
  const [isMassEditModalOpen, setIsMassEditModalOpen] = useState(false);
  const [massEditQuantity, setMassEditQuantity] = useState(0);

  // Funcionários filtrados pelas filiais selecionadas (apenas ativos)
  const filteredEmployees = employees
    .filter((emp: any) => emp.is_active !== false)
    .filter((emp: any) => selectedCompanyIds.length === 0 || selectedCompanyIds.includes(emp.company_id));

  // Produtos disponíveis filtrados pela busca
  const filteredAvailableProducts = products
    .filter((p: any) => !selectedProducts.find((sp: any) => sp.id === p.id))
    .filter((p: any) => productSearch === '' || p.name.toLowerCase().includes(productSearch.toLowerCase()));

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

  // Buscar funcionários (apenas ativos)
  const fetchEmployees = async (groupId: string) => {
    try {
      const res = await fetch(`/api/employees?group_id=${groupId}`);
      const data = await res.json();
      const activeEmployees = (data.employees || []).filter((emp: any) => emp.is_active !== false);
      setEmployees(activeEmployees);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
    }
  };

  // Buscar produtos (apenas ativos)
  const fetchProducts = async (groupId: string) => {
    try {
      const res = await fetch(`/api/products?group_id=${groupId}`);
      const data = await res.json();
      const activeProducts = (data.products || []).filter((prod: any) => prod.is_active !== false);
      setProducts(activeProducts);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  // Buscar metas de produtos
  const fetchGoals = async () => {
    if (!selectedGroupId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        group_id: selectedGroupId,
        year: filterYear.toString(),
        type: 'employee_product'
      });
      if (filterMonth !== null) {
        params.append('month', filterMonth.toString());
      }

      const res = await fetch(`/api/goals?${params}`);
      const data = await res.json();
      
      // Buscar informações dos produtos para cada meta
      const goalsWithProducts = await Promise.all(
        (data.goals || []).map(async (goal: any) => {
          if (goal.product_id) {
            const product = products.find((p: any) => p.id === goal.product_id);
            return { ...goal, product: product ? { id: product.id, name: product.name } : null };
          }
          return goal;
        })
      );
      
      setGoals(goalsWithProducts);
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      fetchCompanies(selectedGroupId);
      fetchEmployees(selectedGroupId);
      fetchProducts(selectedGroupId);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId && products.length > 0) {
      fetchGoals();
    }
  }, [selectedGroupId, filterYear, filterMonth, products]);

  // Filtrar metas
  const filteredItems = goals.filter((item: any) => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      item.employee?.name?.toLowerCase().includes(searchLower) ||
      item.product?.name?.toLowerCase().includes(searchLower);
    
    if (search !== '' && !matchesSearch) return false;
    if (filterCompany && item.company_id !== filterCompany) return false;
    
    return true;
  });

  // Paginação
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedGroupId, filterYear, filterMonth, filterCompany]);

  // Abrir modal
  const handleNew = () => {
    if (!selectedGroupId) {
      alert('Selecione um grupo primeiro');
      return;
    }
    setFormData({
      company_group_id: selectedGroupId,
      year: filterYear,
      month: filterMonth ?? new Date().getMonth() + 1
    });
    setSelectedCompanyIds([]);
    setSelectedProducts([]);
    setSelectedEmployeesForDist([]);
    setShowDistribution(false);
    setProductSearch('');
    setIsModalOpen(true);
  };

  // Adicionar produto
  const handleAddProduct = (productId: string) => {
    if (!productId) return;
    const product = products.find((p: any) => p.id === productId);
    if (product && !selectedProducts.find((sp: any) => sp.id === productId)) {
      setSelectedProducts([...selectedProducts, {
        id: product.id,
        name: product.name,
        quantity: 1
      }]);
    }
    // Resetar distribuição quando adicionar produto
    setShowDistribution(false);
    setSelectedEmployeesForDist([]);
  };

  // Remover produto
  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((sp: any) => sp.id !== productId));
    setShowDistribution(false);
    setSelectedEmployeesForDist([]);
  };

  // Atualizar quantidade do produto
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setSelectedProducts(selectedProducts.map((sp: any) => 
      sp.id === productId ? { ...sp, quantity: Math.max(1, quantity) } : sp
    ));
    setShowDistribution(false);
    setSelectedEmployeesForDist([]);
  };

  // Distribuir para funcionários - adiciona todos os funcionários ativos das filiais selecionadas
  const handleDistribute = () => {
    if (selectedCompanyIds.length === 0) {
      alert('Selecione pelo menos uma filial');
      return;
    }
    if (selectedProducts.length === 0) {
      alert('Adicione pelo menos um produto');
      return;
    }
    if (filteredEmployees.length === 0) {
      alert('Não há funcionários ativos nas filiais selecionadas');
      return;
    }

    // Adiciona todos os funcionários ativos das filiais selecionadas
    setSelectedEmployeesForDist(filteredEmployees.map((emp: any) => ({
      id: emp.id,
      name: emp.name,
      company_id: emp.company_id
    })));
    setShowDistribution(true);
  };

  // Remover funcionário da distribuição
  const handleRemoveEmployeeFromDist = (employeeId: string) => {
    setSelectedEmployeesForDist(selectedEmployeesForDist.filter((emp: any) => emp.id !== employeeId));
  };

  // Salvar metas
  const handleSave = async () => {
    if (!showDistribution || selectedEmployeesForDist.length === 0) {
      alert('Distribua os produtos entre os funcionários antes de salvar');
      return;
    }

    if (selectedProducts.length === 0) {
      alert('Adicione pelo menos um produto');
      return;
    }

    setSaving(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      // Para cada funcionário, criar uma meta para cada produto
      for (const emp of selectedEmployeesForDist) {
        for (const product of selectedProducts) {
          const payload = {
            company_group_id: formData.company_group_id,
            goal_type: 'employee_product',
            year: formData.year,
            month: formData.month,
            company_id: emp.company_id, // Usa a filial do funcionário
            employee_id: emp.id,
            product_id: product.id,
            goal_value: product.quantity,
            goal_unit: 'quantity'
          };

          const res = await fetch('/api/goals/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        }
      }

      if (errorCount > 0) {
        alert(`${successCount} metas criadas com sucesso. ${errorCount} erros (possível duplicidade).`);
      } else {
        alert(`${successCount} metas criadas com sucesso!`);
      }

      setIsModalOpen(false);
      fetchGoals();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Excluir meta
  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta meta?')) return;

    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      fetchGoals();
    } catch (error) {
      alert('Erro ao excluir meta');
    }
  };

  // Excluir múltiplas metas
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Deseja excluir ${selectedIds.length} meta(s) selecionada(s)?`)) return;

    setDeleting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const id of selectedIds) {
        try {
          const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      if (errorCount > 0) {
        alert(`${successCount} meta(s) excluída(s). ${errorCount} erro(s).`);
      }

      setSelectedIds([]);
      fetchGoals();
    } catch (error) {
      alert('Erro ao excluir metas');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    setSelectedIds([]);
  }, [selectedGroupId, filterYear, filterMonth, filterCompany, search]);

  // Abrir modal de edição individual
  const handleEdit = (goal: ProductGoal) => {
    setEditingGoal(goal);
    setEditQuantity(goal.goal_value);
    setIsEditModalOpen(true);
  };

  // Salvar edição individual
  const handleSaveEdit = async () => {
    if (!editingGoal) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/goals/${editingGoal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_value: editQuantity })
      });

      if (!res.ok) {
        throw new Error('Erro ao atualizar');
      }

      setIsEditModalOpen(false);
      setEditingGoal(null);
      fetchGoals();
    } catch (error) {
      alert('Erro ao atualizar meta');
    } finally {
      setSaving(false);
    }
  };

  // Abrir modal de edição em massa
  const handleMassEdit = () => {
    if (selectedIds.length === 0) return;
    setMassEditQuantity(0);
    setIsMassEditModalOpen(true);
  };

  // Salvar edição em massa
  const handleSaveMassEdit = async () => {
    if (selectedIds.length === 0 || massEditQuantity <= 0) {
      alert('Informe uma quantidade válida');
      return;
    }

    setSaving(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const id of selectedIds) {
        try {
          const res = await fetch(`/api/goals/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal_value: massEditQuantity })
          });

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      if (errorCount > 0) {
        alert(`${successCount} meta(s) atualizada(s). ${errorCount} erro(s).`);
      } else {
        alert(`${successCount} meta(s) atualizada(s) com sucesso!`);
      }

      setIsMassEditModalOpen(false);
      setSelectedIds([]);
      fetchGoals();
    } catch (error) {
      alert('Erro ao atualizar metas');
    } finally {
      setSaving(false);
    }
  };

  // Anos disponíveis
  const years = [2025, 2026, 2027, 2028, 2029, 2030];

  // Total de itens selecionados
  const totalQuantity = selectedProducts.reduce((sum: number, p: any) => sum + p.quantity, 0);

  // Exportar para CSV
  const handleExport = () => {
    if (filteredItems.length === 0) return;

    const headers = ['Funcionário', 'Produto', 'Filial', 'Mês', 'Ano', 'Quantidade'];
    const rows = filteredItems.map((item: any) => [
      item.employee?.name || '-',
      item.product?.name || '-',
      item.company?.name || '-',
      MONTHS[item.month - 1],
      item.year,
      item.goal_value
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((row: any) => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `metas-produtos-${filterYear}-${filterMonth ? MONTHS[filterMonth - 1] : 'todos'}.csv`;
    link.click();
  };

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meta Produtos</h1>
            <p className="text-gray-500 text-sm mt-1">
              Defina metas de produtos por quantidade para cada funcionário
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleMassEdit}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Pencil size={18} className="mr-2" />
                  Editar ({selectedIds.length})
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 size={18} className="mr-2" />
                  Excluir ({selectedIds.length})
                </Button>
              </>
            )}
            <button
              onClick={handleExport}
              disabled={filteredItems.length === 0}
              className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Exportar para CSV"
            >
              <Download size={18} />
            </button>
            <Button onClick={handleNew}>
              <Plus size={18} className="mr-2" />
              Nova Distribuição
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4">
          {/* Grupo */}
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
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                {groups.map((group: any) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Filial */}
          <div className="w-44">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filial</label>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>

          {/* Mês */}
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
            <select
              value={filterMonth ?? ''}
              onChange={(e) => setFilterMonth(e.target.value === '' ? null : Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {MONTHS.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>

          {/* Ano */}
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Busca */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por funcionário ou produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        )}

        {/* Tabela */}
        {!loading && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={paginatedItems.length > 0 && paginatedItems.every((item: any) => selectedIds.includes(item.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const pageIds = paginatedItems.map((item: any) => item.id);
                            setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
                          } else {
                            const pageIds = paginatedItems.map((item: any) => item.id);
                            setSelectedIds(prev => prev.filter((id: any) => !pageIds.includes(id)));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Funcionário</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Produto</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Filial</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Período</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Quantidade</th>
                    <th className="w-20 text-center px-4 py-3 text-sm font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        <Package size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="font-medium">Nenhuma meta encontrada</p>
                        <p className="text-sm">Clique em "Nova Distribuição" para começar</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(prev => [...prev, item.id]);
                                } else {
                                  setSelectedIds(prev => prev.filter((id: any) => id !== item.id));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <Users size={16} className="text-green-600" />
                              </div>
                              <span className="text-gray-900">{item.employee?.name || '-'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Package size={16} className="text-blue-600" />
                              </div>
                              <span className="text-gray-900">{item.product?.name || '-'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-600 text-sm">
                              {item.company?.name || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-600">{MONTHS[item.month - 1]}/{item.year}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-gray-900">
                              {item.goal_value.toLocaleString('pt-BR')} un
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredItems.length)} de {filteredItems.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm text-gray-700">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Nova Distribuição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Nova Distribuição de Metas por Produto</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Seção 1: Período e Filiais */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">1. Período e Filiais</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ano *</label>
                    <select
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mês *</label>
                    <select
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {MONTHS.map((month, index) => (
                        <option key={index} value={index + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Seleção de múltiplas filiais */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filiais * (selecione uma ou mais)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCompanyIds(companies.map((c: any) => c.id));
                        setShowDistribution(false);
                        setSelectedEmployeesForDist([]);
                      }}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Selecionar Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCompanyIds([]);
                        setShowDistribution(false);
                        setSelectedEmployeesForDist([]);
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-lg bg-white max-h-40 overflow-y-auto">
                    {companies.map((company) => (
                      <label 
                        key={company.id} 
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCompanyIds.includes(company.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCompanyIds([...selectedCompanyIds, company.id]);
                            } else {
                              setSelectedCompanyIds(selectedCompanyIds.filter((id: any) => id !== company.id));
                            }
                            setShowDistribution(false);
                            setSelectedEmployeesForDist([]);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900">{company.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {selectedCompanyIds.length > 0 && (
                  <p className="text-sm text-blue-600">
                    <Users size={14} className="inline mr-1" />
                    {filteredEmployees.length} funcionário(s) ativo(s) em {selectedCompanyIds.length} filial(is)
                  </p>
                )}
              </div>

              {/* Seção 2: Produtos */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">2. Produtos e Quantidades</h3>
                
                {/* Adicionar produto com busca */}
                <div className="relative">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder="Buscar e adicionar produto..."
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Dropdown de produtos */}
                  {showProductDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredAvailableProducts.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          {productSearch ? 'Nenhum produto encontrado' : 'Todos os produtos já foram adicionados'}
                        </div>
                      ) : (
                        filteredAvailableProducts.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => {
                              handleAddProduct(product.id);
                              setProductSearch('');
                              setShowProductDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-2 transition-colors"
                          >
                            <Package size={16} className="text-blue-600" />
                            <span className="text-gray-900">{product.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                {/* Fechar dropdown ao clicar fora */}
                {showProductDropdown && (
                  <div 
                    className="fixed inset-0 z-[5]" 
                    onClick={() => setShowProductDropdown(false)}
                  />
                )}

                {/* Lista de produtos selecionados */}
                {selectedProducts.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
                    {selectedProducts.map((product) => (
                      <div key={product.id} className="flex items-center gap-4 p-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Package size={16} className="text-blue-600" />
                        </div>
                        <span className="flex-1 text-gray-900 font-medium">{product.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateQuantity(product.id, product.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={product.quantity}
                            onChange={(e) => handleUpdateQuantity(product.id, parseInt(e.target.value) || 1)}
                            className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            min="1"
                          />
                          <button
                            onClick={() => handleUpdateQuantity(product.id, product.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveProduct(product.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-3 bg-gray-50">
                      <span className="text-sm text-gray-600">
                        {selectedProducts.length} produto(s)
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        Total: {totalQuantity} unidade(s)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Package size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum produto adicionado</p>
                  </div>
                )}
              </div>

              {/* Seção 3: Distribuição */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">3. Funcionários</h3>
                  <Button 
                    onClick={handleDistribute}
                    disabled={selectedCompanyIds.length === 0 || selectedProducts.length === 0}
                    className="text-sm"
                  >
                    <Users size={16} className="mr-1" />
                    Adicionar Todos
                  </Button>
                </div>

                {showDistribution && selectedEmployeesForDist.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg bg-white divide-y divide-gray-100 max-h-60 overflow-y-auto">
                    {selectedEmployeesForDist.map((emp) => {
                      const companyName = companies.find((c: any) => c.id === emp.company_id)?.name || '';
                      return (
                        <div key={emp.id} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                              <Users size={14} className="text-green-600" />
                            </div>
                            <div>
                              <span className="text-sm text-gray-900">{emp.name}</span>
                              {selectedCompanyIds.length > 1 && companyName && (
                                <span className="text-xs text-gray-500 ml-2">({companyName})</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveEmployeeFromDist(emp.id)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Remover funcionário"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Clique em "Adicionar Todos" para selecionar os funcionários</p>
                  </div>
                )}

                {showDistribution && selectedEmployeesForDist.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>{selectedEmployeesForDist.length}</strong> funcionário(s) receberão os produtos: {selectedProducts.map((p: any) => `${p.quantity}x ${p.name}`).join(', ')}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Total de metas a criar: {selectedEmployeesForDist.length * selectedProducts.length}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                isLoading={saving}
                disabled={!showDistribution || selectedEmployeesForDist.length === 0 || selectedProducts.length === 0}
              >
                Salvar Metas
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição Individual */}
      {isEditModalOpen && editingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Editar Meta</h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingGoal(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Funcionário:</span>
                  <span className="text-sm text-gray-900">{editingGoal.employee?.name || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Produto:</span>
                  <span className="text-sm text-gray-900">{editingGoal.product?.name || '-'}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {MONTHS[editingGoal.month - 1]}/{editingGoal.year} • {editingGoal.company?.name || '-'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade *</label>
                <input
                  type="number"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => {
                setIsEditModalOpen(false);
                setEditingGoal(null);
              }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveEdit} 
                isLoading={saving}
                disabled={editQuantity <= 0}
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição em Massa */}
      {isMassEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Editar em Massa</h2>
              <button
                onClick={() => setIsMassEditModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>{selectedIds.length}</strong> meta(s) selecionada(s) serão atualizadas com a nova quantidade.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Quantidade *</label>
                <input
                  type="number"
                  value={massEditQuantity}
                  onChange={(e) => setMassEditQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1"
                  placeholder="Digite a nova quantidade"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsMassEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveMassEdit} 
                isLoading={saving}
                disabled={massEditQuantity <= 0}
              >
                Atualizar Todas
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
