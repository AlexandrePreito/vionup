'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, Search, Loader2, 
  ChevronLeft, ChevronRight, Building, UserCircle, 
  Copy, ClipboardCheck, RefreshCw, Hash
} from 'lucide-react';
import { Button } from '@/components/ui';
import { CompanyGroup, Company } from '@/types';
import { useGroupFilter } from '@/hooks/useGroupFilter';

interface ResearchGoal {
  id: string;
  company_group_id: string;
  goal_type: string;
  year: number;
  month: number;
  company_id: string | null;
  employee_id: string | null;
  goal_value: number;
  goal_unit: string;
  is_active: boolean;
  created_at: string;
  // Relacionamentos
  company?: { id: string; name: string };
  employee?: { id: string; name: string };
}

const ITEMS_PER_PAGE = 20;

const GOAL_TYPES = [
  { value: 'research_note_company', label: 'Meta de Nota por Empresa', icon: Building, color: 'blue' },
  { value: 'research_note_employee', label: 'Meta de Nota por Funcionário', icon: UserCircle, color: 'green' },
  { value: 'research_quantity_company', label: 'Meta de Quantidade por Empresa', icon: Building, color: 'purple' },
  { value: 'research_quantity_employee', label: 'Meta de Quantidade por Funcionário', icon: UserCircle, color: 'orange' }
];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function MetasPesquisasPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [goals, setGoals] = useState<ResearchGoal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterCompany, setFilterCompany] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Modal de Cadastro/Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResearchGoal | null>(null);
  const [formData, setFormData] = useState({
    company_group_id: '',
    goal_type: 'research_note_company',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    company_id: '',
    employee_id: '',
    goal_value: 0,
    goal_unit: 'note' // 'note' ou 'quantity'
  });
  const [saving, setSaving] = useState(false);
  const [refreshingEmployees, setRefreshingEmployees] = useState(false);

  // Empresas selecionadas (múltiplas)
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  // Múltiplos funcionários (para tipos employee)
  const [selectedEmployees, setSelectedEmployees] = useState<{ id: string; name: string; value: number }[]>([]);

  // Funcionários filtrados pelas empresas selecionadas no formulário (apenas ativos)
  const filteredEmployeesForForm = employees
    .filter((emp: any) => emp.is_active !== false)
    .filter((emp: any) => {
      if (selectedCompanies.length === 0) return true;
      return selectedCompanies.includes(emp.company_id);
    });

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

  // Atualizar lista de funcionários (sem fechar modal)
  const handleRefreshEmployees = async () => {
    if (!selectedGroupId) return;
    
    setRefreshingEmployees(true);
    try {
      await fetchEmployees(selectedGroupId);
    } catch (error) {
      console.error('Erro ao atualizar funcionários:', error);
      alert('Erro ao atualizar lista de funcionários');
    } finally {
      setRefreshingEmployees(false);
    }
  };

  // Buscar metas (filtrar apenas tipos de pesquisa)
  const fetchGoals = async () => {
    if (!selectedGroupId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        group_id: selectedGroupId,
        year: filterYear.toString()
      });
      if (filterMonth !== null) {
        params.append('month', filterMonth.toString());
      }
      if (filterType) params.append('type', filterType);

      const res = await fetch(`/api/goals?${params}`);
      const data = await res.json();
      // Filtrar apenas metas de pesquisa
      const researchGoals = (data.goals || []).filter((goal: any) => 
        goal.goal_type.startsWith('research_')
      );
      setGoals(researchGoals);
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
      fetchGoals();
    }
  }, [selectedGroupId, filterYear, filterMonth, filterType]);

  // Filtrar metas
  const filteredItems = goals.filter((item: any) => {
    // Filtro por busca
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      item.company?.name?.toLowerCase().includes(searchLower) ||
      item.employee?.name?.toLowerCase().includes(searchLower);
    
    if (search !== '' && !matchesSearch) return false;

    // Filtro por filial
    if (filterCompany && item.company_id !== filterCompany) return false;
    
    return true;
  });

  // Paginação
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedGroupId, filterType, filterYear, filterMonth]);

  // Abrir modal de nova meta
  const handleNew = () => {
    setEditingItem(null);
    setFormData({
      company_group_id: selectedGroupId || '',
      goal_type: 'research_note_company',
      year: filterYear,
      month: filterMonth ?? new Date().getMonth() + 1,
      company_id: '',
      employee_id: '',
      goal_value: 0,
      goal_unit: 'note'
    });
    setSelectedCompanies([]);
    setSelectedEmployees([]);
    setIsModalOpen(true);
  };

  // Abrir modal de edição
  const handleEdit = (item: ResearchGoal) => {
    setEditingItem(item);
    const isNoteType = item.goal_type.includes('note');
    setFormData({
      company_group_id: item.company_group_id,
      goal_type: item.goal_type,
      year: item.year,
      month: item.month,
      company_id: item.company_id || '',
      employee_id: item.employee_id || '',
      goal_value: item.goal_value,
      goal_unit: isNoteType ? 'note' : 'quantity'
    });
    // Limpar seleções múltiplas (edição é sempre única)
    setSelectedCompanies(item.company_id ? [item.company_id] : []);
    setSelectedEmployees([]);
    setIsModalOpen(true);
  };

  // Salvar meta
  const handleSave = async () => {
    // Validações
    const isCompanyType = formData.goal_type.includes('company');
    const isEmployeeType = formData.goal_type.includes('employee');
    const isNoteType = formData.goal_type.includes('note');
    const isQuantityType = formData.goal_type.includes('quantity');

    // Para tipos employee: empresa é obrigatória
    if (isEmployeeType && selectedCompanies.length === 0) {
      alert('Selecione pelo menos uma empresa');
      return;
    }

    // Para tipos company: empresa é obrigatória
    if (isCompanyType && selectedCompanies.length === 0) {
      alert('Selecione pelo menos uma empresa');
      return;
    }

    // Para tipos employee: funcionários são obrigatórios (múltiplos)
    if (isEmployeeType && !editingItem && selectedEmployees.length === 0) {
      alert('Selecione pelo menos um funcionário');
      return;
    }

    // Validar valores dos funcionários
    if (isEmployeeType && !editingItem && selectedEmployees.length > 0) {
      const hasInvalidValue = selectedEmployees.some((emp: any) => {
        if (isNoteType) {
          return emp.value < 0 || emp.value > 5;
        }
        return emp.value <= 0;
      });
      if (hasInvalidValue) {
        alert(isNoteType 
          ? 'Todas as notas devem estar entre 0 e 5' 
          : 'Todas as quantidades devem ser maiores que 0');
        return;
      }
    }

    // Para edição ou tipos company: validar valor único
    if ((editingItem || isCompanyType) && !isEmployeeType) {
      if (isNoteType) {
        if (formData.goal_value < 0 || formData.goal_value > 5) {
          alert('A nota deve estar entre 0 e 5');
          return;
        }
      }
      if (isQuantityType) {
        if (formData.goal_value <= 0) {
          alert('A quantidade deve ser maior que 0');
          return;
        }
      }
    }

    setSaving(true);
    try {
      // Para tipos employee com múltiplos funcionários (criação)
      if (isEmployeeType && !editingItem && selectedEmployees.length > 0) {
        let successCount = 0;
        let errorCount = 0;
        let skipCount = 0;
        let firstErrorMessage = '';

        const alreadyExists = (eid: string, cid: string) =>
          goals.some(
            (g: ResearchGoal) =>
              g.goal_type === formData.goal_type &&
              g.year === formData.year &&
              g.month === formData.month &&
              g.employee_id === eid &&
              (g.company_id || '') === cid
          );

        // Criar uma meta para cada combinação empresa + funcionário
        for (const companyId of selectedCompanies) {
          for (const emp of selectedEmployees) {
            if (alreadyExists(emp.id, companyId)) {
              skipCount++;
              continue;
            }
            const payload = {
              ...formData,
              company_id: companyId,
              employee_id: emp.id,
              goal_value: emp.value,
              goal_unit: isNoteType ? 'note' : 'quantity'
            };

            const res = await fetch('/api/goals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (res.ok) {
              successCount++;
            } else {
              errorCount++;
              if (!firstErrorMessage) {
                try {
                  const errData = await res.json();
                  firstErrorMessage = errData.error || '';
                } catch (_) {}
              }
            }
          }
        }

        if (skipCount > 0 || errorCount > 0) {
          const parts = [];
          if (successCount > 0) parts.push(`${successCount} meta(s) criada(s).`);
          if (skipCount > 0) parts.push(`${skipCount} não criada(s): já existe meta deste tipo para o mesmo mês, ano e funcionário.`);
          if (errorCount > 0) parts.push(firstErrorMessage ? `${errorCount} erro(s): ${firstErrorMessage}` : `${errorCount} erro(s).`);
          alert(parts.join(' '));
        }

        setIsModalOpen(false);
        fetchGoals();
        return;
      }

      // Para tipos company com múltiplas empresas (criação)
      if (isCompanyType && !editingItem && selectedCompanies.length > 0) {
        let successCount = 0;
        let errorCount = 0;
        let skipCount = 0;
        let firstErrorMessage = '';

        const companyAlreadyExists = (cid: string) =>
          goals.some(
            (g: ResearchGoal) =>
              g.goal_type === formData.goal_type &&
              g.year === formData.year &&
              g.month === formData.month &&
              (g.company_id || '') === cid
          );

        for (const companyId of selectedCompanies) {
          if (companyAlreadyExists(companyId)) {
            skipCount++;
            continue;
          }
          const payload = {
            ...formData,
            company_id: companyId,
            employee_id: null,
            goal_unit: isNoteType ? 'note' : 'quantity'
          };

          const res = await fetch('/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
            if (!firstErrorMessage) {
              try {
                const errData = await res.json();
                firstErrorMessage = errData.error || '';
              } catch (_) {}
            }
          }
        }

        if (skipCount > 0 || errorCount > 0) {
          const parts = [];
          if (successCount > 0) parts.push(`${successCount} meta(s) criada(s).`);
          if (skipCount > 0) parts.push(`${skipCount} não criada(s): já existe meta deste tipo para o mesmo mês, ano e empresa.`);
          if (errorCount > 0) parts.push(firstErrorMessage ? `${errorCount} erro(s): ${firstErrorMessage}` : `${errorCount} erro(s).`);
          alert(parts.join(' '));
        }

        setIsModalOpen(false);
        fetchGoals();
        return;
      }

      // Fluxo normal (edição ou meta única)
      const url = editingItem 
        ? `/api/goals/${editingItem.id}` 
        : '/api/goals';
      
      const payload = {
        ...formData,
        goal_unit: isNoteType ? 'note' : 'quantity'
      };
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao salvar');
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

  // Clonar meta
  const handleClone = async (item: ResearchGoal) => {
    try {
      const payload = {
        company_group_id: item.company_group_id,
        goal_type: item.goal_type,
        year: item.year,
        month: item.month,
        company_id: item.company_id || '',
        employee_id: item.employee_id || '',
        goal_value: item.goal_value,
        goal_unit: item.goal_unit
      };

      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao clonar');
      }

      fetchGoals();
    } catch (error: any) {
      alert(error.message || 'Erro ao clonar meta');
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

  // Limpar seleção ao mudar filtros
  useEffect(() => {
    setSelectedIds([]);
  }, [selectedGroupId, filterYear, filterMonth, filterType, filterCompany, search]);

  // Obter info do tipo de meta
  const getGoalTypeInfo = (type: string) => {
    return GOAL_TYPES.find((t: any) => t.value === type) || { 
      value: type, 
      label: type, 
      icon: Building, 
      color: 'gray' 
    };
  };

  // Formatar valor para exibição
  const formatValue = (value: number, unit: string) => {
    if (unit === 'note') {
      return value.toFixed(1);
    }
    return value.toLocaleString('pt-BR') + ' pesquisas';
  };

  // Obter descrição da meta
  const getGoalDescription = (goal: ResearchGoal) => {
    if (goal.goal_type.includes('company')) {
      return goal.company?.name || 'Empresa não definida';
    }
    if (goal.goal_type.includes('employee')) {
      return goal.employee?.name || 'Funcionário não definido';
    }
    return 'Meta';
  };

  // Anos disponíveis para filtro (2025 a 2030)
  const years = [2025, 2026, 2027, 2028, 2029, 2030];

  // Atualizar goal_unit quando goal_type muda
  useEffect(() => {
    const isNoteType = formData.goal_type.includes('note');
    setFormData(prev => ({
      ...prev,
      goal_unit: isNoteType ? 'note' : 'quantity',
      goal_value: 0 // Resetar valor ao mudar tipo
    }));
  }, [formData.goal_type]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .no-spin-input::-webkit-outer-spin-button,
        .no-spin-input::-webkit-inner-spin-button { -webkit-appearance: none; appearance: none; margin: 0; opacity: 0; pointer-events: none; height: 0; width: 0; }
        .no-spin-input { -moz-appearance: textfield; appearance: textfield; }
      ` }} />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Metas de Pesquisas</h1>
            <p className="text-gray-500 text-sm mt-1">
              Gerencie as metas de notas e quantidade de pesquisas
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <Button
                variant="secondary"
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 size={18} className="mr-2" />
                Excluir ({selectedIds.length})
              </Button>
            )}
            <Button onClick={handleNew}>
              <Plus size={18} className="mr-2" />
              Nova Meta
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

          {/* Tipo */}
          <div className="w-52">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os tipos</option>
              {GOAL_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
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
                placeholder="Buscar por nome..."
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
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Tipo</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Período</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Empresa/Funcionário</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Meta</th>
                    <th className="w-24 text-center px-4 py-3 text-sm font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                        <ClipboardCheck size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="font-medium">Nenhuma meta encontrada</p>
                        <p className="text-sm">Clique em "Nova Meta" para começar</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      const typeInfo = getGoalTypeInfo(item.goal_type);
                      const TypeIcon = typeInfo.icon;
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
                              <div className={`w-8 h-8 rounded-lg bg-${typeInfo.color}-100 flex items-center justify-center`}>
                                <TypeIcon size={16} className={`text-${typeInfo.color}-600`} />
                              </div>
                              <span className="text-sm font-medium text-gray-700">{typeInfo.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-600">{MONTHS[item.month - 1]}/{item.year}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-900">{getGoalDescription(item)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-gray-900">
                              {formatValue(item.goal_value, item.goal_unit)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleClone(item)}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Clonar"
                              >
                                <Copy size={16} />
                              </button>
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

      {/* Modal Nova/Editar Meta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Editar Meta' : 'Nova Meta'}
              </h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Linha 1: Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Meta *</label>
                <select
                  value={formData.goal_type}
                  onChange={(e) => {
                    setFormData({ ...formData, goal_type: e.target.value, company_id: '', employee_id: '' });
                    setSelectedCompanies([]);
                    setSelectedEmployees([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!!editingItem}
                >
                  {GOAL_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Empresas - Seleção múltipla com checkbox */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.goal_type.includes('employee') || formData.goal_type.includes('company') ? 'Empresas *' : 'Empresas (opcional)'}
                </label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {companies.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhuma empresa disponível</p>
                  ) : (
                    <div className="space-y-2">
                      {companies.map((company) => (
                        <label key={company.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedCompanies.includes(company.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCompanies(prev => [...prev, company.id]);
                              } else {
                                setSelectedCompanies(prev => prev.filter(id => id !== company.id));
                                // Remover funcionários das empresas desmarcadas
                                setSelectedEmployees(prev => prev.filter(emp => {
                                  const empObj = employees.find((e: any) => e.id === emp.id);
                                  return empObj?.company_id !== company.id;
                                }));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{company.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {selectedCompanies.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{selectedCompanies.length} empresa(s) selecionada(s)</p>
                )}
              </div>

              {/* Funcionários - Apenas para tipos employee (criação) */}
              {formData.goal_type.includes('employee') && !editingItem && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  {/* Valor base para distribuir */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.goal_type.includes('note') ? 'Nota Base da Meta *' : 'Quantidade Base da Meta *'}
                    </label>
                    {formData.goal_type.includes('note') ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.goal_value === 0 ? '' : formData.goal_value}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9,.]/g, '').replace(',', '.');
                          const newValue = raw === '' ? 0 : Math.min(5, Math.max(0, parseFloat(raw) || 0));
                          setFormData({ ...formData, goal_value: newValue });
                          if (selectedEmployees.length > 0) {
                            setSelectedEmployees(selectedEmployees.map(emp => ({ ...emp, value: newValue })));
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 4.5"
                      />
                    ) : (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formData.goal_value === 0 ? '' : formData.goal_value}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          const newValue = raw === '' ? 0 : parseInt(raw, 10) || 0;
                          setFormData({ ...formData, goal_value: newValue });
                          if (selectedEmployees.length > 0) {
                            setSelectedEmployees(selectedEmployees.map(emp => ({ ...emp, value: newValue })));
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 100"
                      />
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.goal_type.includes('note') 
                        ? 'Esta nota será aplicada a todos os funcionários selecionados (você pode editar individualmente depois)'
                        : 'Esta quantidade será aplicada a todos os funcionários selecionados (você pode editar individualmente depois)'}
                    </p>
                  </div>

                  {/* Botões de seleção de funcionários */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Funcionários *</label>
                      <button
                        type="button"
                        onClick={handleRefreshEmployees}
                        disabled={refreshingEmployees}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Atualizar lista de funcionários"
                      >
                        <RefreshCw size={16} className={refreshingEmployees ? 'animate-spin' : ''} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          // Adicionar todos os funcionários (filtrados pelas empresas selecionadas)
                          const availableEmployees = filteredEmployeesForForm
                            .filter((emp: any) => !selectedEmployees.find((se: any) => se.id === emp.id));
                          
                          if (availableEmployees.length === 0) return;
                          
                          // Usar o valor base para todos
                          const newEmployees = availableEmployees.map((emp: any) => ({
                            id: emp.id,
                            name: emp.name,
                            value: formData.goal_value
                          }));
                          
                          setSelectedEmployees([...selectedEmployees, ...newEmployees]);
                        }}
                        className="text-sm"
                        disabled={selectedCompanies.length === 0}
                      >
                        <Plus size={16} className="mr-1" />
                        Adicionar Todos {selectedCompanies.length > 0 ? 'das Empresas' : ''}
                      </Button>
                      {selectedEmployees.length > 0 && (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              // Aplicar valor base a todos os funcionários selecionados
                              setSelectedEmployees(selectedEmployees.map((emp: any) => ({
                                ...emp,
                                value: formData.goal_value
                              })));
                            }}
                            className="text-sm"
                          >
                            <Hash size={16} className="mr-1" />
                            Aplicar Valor Base
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedEmployees([])}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={16} className="mr-1" />
                            Limpar
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Select para adicionar funcionário individual */}
                    <select
                      value=""
                      onChange={(e) => {
                        const empId = e.target.value;
                        if (!empId) return;
                        const emp = filteredEmployeesForForm.find((em: any) => em.id === empId);
                        if (emp && !selectedEmployees.find((se: any) => se.id === empId)) {
                          setSelectedEmployees([...selectedEmployees, {
                            id: emp.id,
                            name: emp.name,
                            value: formData.goal_value
                          }]);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
                      disabled={selectedCompanies.length === 0}
                    >
                      <option value="">{selectedCompanies.length > 0 ? '+ Adicionar funcionário...' : 'Selecione empresas primeiro'}</option>
                      {filteredEmployeesForForm
                        .filter((emp: any) => !selectedEmployees.find((se: any) => se.id === emp.id))
                        .map((employee) => (
                          <option key={employee.id} value={employee.id}>{employee.name}</option>
                        ))}
                    </select>

                    {/* Lista de funcionários selecionados com valores editáveis */}
                    {selectedEmployees.length > 0 && (
                      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">
                        {selectedEmployees.map((emp, index) => (
                          <div key={emp.id} className="flex items-center gap-2 p-3">
                            <span className="flex-1 text-sm text-gray-700 truncate">{emp.name}</span>
                            {formData.goal_type.includes('note') ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={emp.value === 0 ? '' : emp.value}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9,.]/g, '').replace(',', '.');
                                  const newValue = raw === '' ? 0 : Math.min(5, Math.max(0, parseFloat(raw) || 0));
                                  const updated = [...selectedEmployees];
                                  updated[index] = { ...emp, value: newValue };
                                  setSelectedEmployees(updated);
                                }}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-right"
                              />
                            ) : (
                              <input
                                type="text"
                                inputMode="numeric"
                                value={emp.value === 0 ? '' : emp.value}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/\D/g, '');
                                  const newValue = raw === '' ? 0 : parseInt(raw, 10) || 0;
                                  const updated = [...selectedEmployees];
                                  updated[index] = { ...emp, value: newValue };
                                  setSelectedEmployees(updated);
                                }}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-right"
                              />
                            )}
                            <button
                              onClick={() => {
                                setSelectedEmployees(selectedEmployees.filter((se: any) => se.id !== emp.id));
                              }}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedEmployees.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{selectedEmployees.length}</span> funcionário(s) selecionado(s)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Valor da Meta - Para tipos company ou edição */}
              {(!formData.goal_type.includes('employee') || editingItem) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.goal_type.includes('note') ? 'Nota da Meta *' : 'Quantidade da Meta *'}
                  </label>
                  {formData.goal_type.includes('note') ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.goal_value === 0 ? '' : formData.goal_value}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9,.]/g, '').replace(',', '.');
                        const newValue = raw === '' ? 0 : Math.min(5, Math.max(0, parseFloat(raw) || 0));
                        setFormData({ ...formData, goal_value: newValue });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 4.5"
                    />
                  ) : (
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.goal_value === 0 ? '' : formData.goal_value}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, goal_value: raw === '' ? 0 : parseInt(raw, 10) || 0 });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 100"
                    />
                  )}
                  {formData.goal_type.includes('note') && (
                    <p className="text-xs text-gray-500 mt-1">Valor entre 0 e 5</p>
                  )}
                  {formData.goal_type.includes('quantity') && (
                    <p className="text-xs text-gray-500 mt-1">Quantidade de pesquisas (número inteiro)</p>
                  )}
                </div>
              )}

              {/* Linha 2: Ano + Mês */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano *</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {MONTHS.map((month, index) => (
                      <option key={index} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} isLoading={saving}>
                {editingItem ? 'Salvar' : 'Criar Meta'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
