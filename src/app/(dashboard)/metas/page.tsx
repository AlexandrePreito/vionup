'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, Search, Target, Loader2, 
  ChevronLeft, ChevronRight, Building, UserCircle, 
  Clock, ShoppingCart, Hash, Download, Copy, GitBranch, Upload, FileSpreadsheet, RefreshCw, Layers
} from 'lucide-react';
import { Button } from '@/components/ui';
import { CompanyGroup, Company } from '@/types';
import { useGroupFilter } from '@/hooks/useGroupFilter';

interface SalesGoal {
  id: string;
  company_group_id: string;
  goal_type: string;
  year: number;
  month: number;
  company_id: string | null;
  employee_id: string | null;
  external_product_id: string | null;
  shift_id: string | null;
  sale_mode_id: string | null;
  custom_name: string | null;
  custom_description: string | null;
  goal_value: number;
  goal_unit: string;
  is_active: boolean;
  created_at: string;
  parent_goal_id: string | null;
  // Relacionamentos
  company?: { id: string; name: string };
  employee?: { id: string; name: string };
  shift?: { id: string; name: string };
  sale_mode?: { id: string; name: string };
  parent_goal?: { id: string; goal_type: string; goal_value: number; name: string };
}

const ITEMS_PER_PAGE = 20;

const GOAL_TYPES = [
  { value: 'company_revenue', label: 'Faturamento Empresa', icon: Building, color: 'blue' },
  { value: 'employee_revenue', label: 'Faturamento Vendedor', icon: UserCircle, color: 'green' },
  { value: 'shift', label: 'Faturamento Turno', icon: Clock, color: 'orange' },
  { value: 'sale_mode', label: 'Faturamento Modo', icon: ShoppingCart, color: 'teal' }
];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function MetasPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [saleModes, setSaleModes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | null>(null); // null = todos
  const [filterCompany, setFilterCompany] = useState(''); // filtro por filial
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // itens selecionados para ação em lote
  const [deleting, setDeleting] = useState(false);

  // Modal de Importação
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importCompany, setImportCompany] = useState('');
  const [importYear, setImportYear] = useState(new Date().getFullYear());
  const [importMonth, setImportMonth] = useState(new Date().getMonth() + 1);
  const [importing, setImporting] = useState(false);

  // Modal de Cadastro/Edição (meta simples)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesGoal | null>(null);
  
  // Modo do modal: 'simple' (Nova Meta) ou 'composite' (Nova Meta Composta)
  const [modalMode, setModalMode] = useState<'simple' | 'composite'>('simple');
  const [formData, setFormData] = useState({
    company_group_id: '',
    goal_type: 'company_revenue',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    company_id: '',
    employee_id: '',
    external_product_id: '',
    shift_id: '',
    sale_mode_id: '',
    custom_name: '',
    custom_description: '',
    goal_value: 0,
    goal_unit: 'currency'
  });
  const [saving, setSaving] = useState(false);
  const [refreshingEmployees, setRefreshingEmployees] = useState(false);


  // Derivar valor
  const [showDeriveOption, setShowDeriveOption] = useState(false);
  const [deriveFromGoalId, setDeriveFromGoalId] = useState('');
  const [deriveReferenceType, setDeriveReferenceType] = useState<'company_revenue' | 'shift'>('company_revenue');
  const [availableGoalsForDerive, setAvailableGoalsForDerive] = useState<SalesGoal[]>([]);

  // Múltiplos funcionários (para employee_revenue)
  const [selectedEmployees, setSelectedEmployees] = useState<{ id: string; name: string; value: number; percent?: number }[]>([]);

  // Múltiplos turnos (para shift)
  const [selectedShifts, setSelectedShifts] = useState<{ id: string; name: string; value: number; percent?: number }[]>([]);

  // Múltiplos modos de venda (para sale_mode)
  const [selectedSaleModes, setSelectedSaleModes] = useState<{ id: string; name: string; value: number; percent?: number }[]>([]);
  
  // Estados para valores formatados dos inputs (turnos e modos)
  const [shiftDisplayValues, setShiftDisplayValues] = useState<Record<string, string>>({});
  const [saleModeDisplayValues, setSaleModeDisplayValues] = useState<Record<string, string>>({});
  
  // Modo de rateio: R$ (valor absoluto) ou % (porcentagem)
  const [rateioMode, setRateioMode] = useState<'value' | 'percent'>('value');
  
  // Valores de % para exibição nos inputs (quando rateioMode === 'percent')
  const [employeePercentDisplayValues, setEmployeePercentDisplayValues] = useState<Record<string, string>>({});
  const [shiftPercentDisplayValues, setShiftPercentDisplayValues] = useState<Record<string, string>>({});
  const [saleModePercentDisplayValues, setSaleModePercentDisplayValues] = useState<Record<string, string>>({});

  // Funcionários filtrados pela filial selecionada no formulário (apenas ativos)
  const filteredEmployeesForForm = employees
    .filter((emp: any) => emp.is_active !== false) // Garantir apenas ativos
    .filter((emp: any) => !formData.company_id || emp.company_id === formData.company_id);

  // Turnos filtrados (apenas ativos)
  const filteredShiftsForForm = shifts.filter((shift: any) => shift.is_active !== false);

  // Modos de venda filtrados (apenas ativos)
  const filteredSaleModesForForm = saleModes.filter((mode: any) => mode.is_active !== false);

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
      // Filtrar apenas funcionários ativos
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

  // Buscar turnos (apenas ativos)
  const fetchShifts = async (groupId: string) => {
    try {
      const res = await fetch(`/api/shifts?group_id=${groupId}`);
      const data = await res.json();
      // Filtrar apenas turnos ativos
      const activeShifts = (data.shifts || []).filter((shift: any) => shift.is_active !== false);
      setShifts(activeShifts);
    } catch (error) {
      console.error('Erro ao buscar turnos:', error);
    }
  };

  // Buscar modos de venda (apenas ativos)
  const fetchSaleModes = async (groupId: string) => {
    try {
      const res = await fetch(`/api/sale-modes?group_id=${groupId}`);
      const data = await res.json();
      // Filtrar apenas modos de venda ativos
      const activeSaleModes = (data.saleModes || []).filter((mode: any) => mode.is_active !== false);
      setSaleModes(activeSaleModes);
    } catch (error) {
      console.error('Erro ao buscar modos de venda:', error);
    }
  };

  // Buscar metas
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
      setGoals(data.goals || []);
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
      fetchShifts(selectedGroupId);
      fetchSaleModes(selectedGroupId);
      fetchGoals();
    }
  }, [selectedGroupId, filterYear, filterMonth, filterType]);

  // Filtrar metas
  const filteredItems = goals.filter((item: any) => {
    // Excluir metas de produtos (aparecem em /metas/produtos)
    if (item.goal_type === 'employee_product') return false;
    
    // Excluir metas de pesquisa de quantidade de funcionário (aparecem em /metas/pesquisas)
    if (item.goal_type === 'research_quantity_employee') return false;
    
    // Filtro por busca
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      item.company?.name?.toLowerCase().includes(searchLower) ||
      item.employee?.name?.toLowerCase().includes(searchLower) ||
      item.custom_name?.toLowerCase().includes(searchLower) ||
      item.shift?.name?.toLowerCase().includes(searchLower) ||
      item.sale_mode?.name?.toLowerCase().includes(searchLower);
    
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
      company_group_id: selectedGroupId,
      goal_type: 'company_revenue',
      year: filterYear,
      month: filterMonth ?? new Date().getMonth() + 1, // Se filtro "Todos", usa mês atual
      company_id: '',
      employee_id: '',
      external_product_id: '',
      shift_id: '',
      sale_mode_id: '',
      custom_name: '',
      custom_description: '',
      goal_value: 0,
      goal_unit: 'currency'
    });
    setInputDisplayValue('');
    setShowDeriveOption(false);
    setDeriveFromGoalId('');
    setDeriveReferenceType('company_revenue');
    setSelectedEmployees([]);
    setSelectedShifts([]);
    setSelectedSaleModes([]);
    setRateioMode('value');
    setEmployeePercentDisplayValues({});
    setShiftPercentDisplayValues({});
    setSaleModePercentDisplayValues({});
    setModalMode('simple');
    setIsModalOpen(true);
  };

  // Abrir modal de meta composta (rateio)
  const handleNewComposite = () => {
    setFormData({
      company_group_id: selectedGroupId,
      goal_type: 'employee_revenue',
      year: filterYear,
      month: filterMonth ?? new Date().getMonth() + 1,
      company_id: '',
      employee_id: '',
      external_product_id: '',
      shift_id: '',
      sale_mode_id: '',
      custom_name: '',
      custom_description: '',
      goal_value: 0,
      goal_unit: 'currency'
    });
    setInputDisplayValue('');
    setShowDeriveOption(false);
    setDeriveFromGoalId('');
    setDeriveReferenceType('company_revenue');
    setSelectedEmployees([]);
    setSelectedShifts([]);
    setSelectedSaleModes([]);
    setRateioMode('value');
    setEmployeePercentDisplayValues({});
    setShiftPercentDisplayValues({});
    setSaleModePercentDisplayValues({});
    setModalMode('composite');
    setIsModalOpen(true);
  };

  // Abrir modal de edição
  const handleEdit = (item: SalesGoal) => {
    setEditingItem(item);
    setFormData({
      company_group_id: item.company_group_id,
      goal_type: item.goal_type,
      year: item.year,
      month: item.month,
      company_id: item.company_id || '',
      employee_id: item.employee_id || '',
      external_product_id: item.external_product_id || '',
      shift_id: item.shift_id || '',
      sale_mode_id: item.sale_mode_id || '',
      custom_name: item.custom_name || '',
      custom_description: item.custom_description || '',
      goal_value: item.goal_value,
      goal_unit: item.goal_unit
    });
    setInputDisplayValue(formatInputValue(item.goal_value, item.goal_unit));
    setShowDeriveOption(false);
    setModalMode('simple');
    setIsModalOpen(true);
  };

  // Salvar meta
  const handleSave = async () => {
    // Meta composta: sequência fixa Empresa → Modo → Turno
    if (modalMode === 'composite') {
      if (!formData.company_id) {
        alert('Selecione uma filial');
        return;
      }
      if (!formData.goal_value || formData.goal_value <= 0) {
        alert('Informe o Faturamento Empresa');
        return;
      }
      if (selectedSaleModes.length === 0 && selectedShifts.length === 0) {
        alert('Adicione ao menos um Modo de Venda ou um Turno para ratear');
        return;
      }

      setSaving(true);
      try {
        let totalSuccess = 0;
        let totalErrors = 0;

        // 1. Criar meta Faturamento Empresa
        const companyPayload = {
          company_group_id: formData.company_group_id,
          goal_type: 'company_revenue',
          year: formData.year,
          month: formData.month,
          company_id: formData.company_id,
          goal_value: formData.goal_value,
          goal_unit: 'currency'
        };
        const resCompany = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(companyPayload)
        });
        if (resCompany.ok) totalSuccess++;
        else totalErrors++;

        // 2. Criar metas Modo de Venda (rateio)
        if (selectedSaleModes.length > 0) {
          const saleModeTotalPercent = selectedSaleModes.reduce((s: number, m: any) => s + (m.percent ?? 0), 0);
          if (rateioMode === 'percent' && saleModeTotalPercent > 100) {
            alert(`Soma dos modos (${saleModeTotalPercent.toFixed(1)}%) não pode ultrapassar 100%`);
            setSaving(false);
            return;
          }
          for (const mode of selectedSaleModes) {
            const valueToSave = rateioMode === 'percent'
              ? formData.goal_value * ((mode.percent ?? 0) / 100)
              : mode.value;
            if (valueToSave <= 0) continue;
            const payload = {
              ...formData,
              goal_type: 'sale_mode',
              sale_mode_id: mode.id,
              goal_value: valueToSave
            };
            const res = await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) totalSuccess++;
            else totalErrors++;
          }
        }

        // 3. Criar metas Turno (rateio)
        if (selectedShifts.length > 0) {
          const shiftTotalPercent = selectedShifts.reduce((s: number, x: any) => s + (x.percent ?? 0), 0);
          if (rateioMode === 'percent' && shiftTotalPercent > 100) {
            alert(`Soma dos turnos (${shiftTotalPercent.toFixed(1)}%) não pode ultrapassar 100%`);
            setSaving(false);
            return;
          }
          for (const shift of selectedShifts) {
            const valueToSave = rateioMode === 'percent'
              ? formData.goal_value * ((shift.percent ?? 0) / 100)
              : shift.value;
            if (valueToSave <= 0) continue;
            const payload = {
              ...formData,
              goal_type: 'shift',
              shift_id: shift.id,
              goal_value: valueToSave
            };
            const res = await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) totalSuccess++;
            else totalErrors++;
          }
        }

        if (totalErrors > 0) {
          alert(`${totalSuccess} meta(s) criada(s). ${totalErrors} erro(s).`);
        }
        setIsModalOpen(false);
        fetchGoals();
      } catch (error: any) {
        alert(error.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    // Para employee_revenue com múltiplos funcionários
    if (formData.goal_type === 'employee_revenue' && !editingItem && selectedEmployees.length > 0) {
      // Modo %: validar soma e valor total
      if (rateioMode === 'percent') {
        if (!formData.goal_value || formData.goal_value <= 0) {
          alert('Informe o valor total da meta antes de usar o modo porcentagem');
          return;
        }
        const totalPercent = selectedEmployees.reduce((sum: number, e: any) => sum + (e.percent ?? 0), 0);
        if (totalPercent > 100) {
          alert(`A soma das porcentagens (${totalPercent.toFixed(1)}%) não pode ultrapassar 100%`);
          return;
        }
        const hasInvalidPercent = selectedEmployees.some((e: any) => (e.percent ?? 0) > 100 || (e.percent ?? 0) < 0);
        if (hasInvalidPercent) {
          alert('Cada porcentagem deve estar entre 0 e 100');
          return;
        }
      } else {
        // Modo R$: verificar se todos têm valor
        const hasInvalidValue = selectedEmployees.some((emp: any) => !emp.value || emp.value <= 0);
        if (hasInvalidValue) {
          alert('Todos os funcionários devem ter um valor de meta válido');
          return;
        }
      }

      setSaving(true);
      try {
        let successCount = 0;
        let errorCount = 0;

        for (const emp of selectedEmployees) {
          const valueToSave = rateioMode === 'percent'
            ? formData.goal_value * ((emp.percent ?? 0) / 100)
            : emp.value;
          const payload = {
            ...formData,
            employee_id: emp.id,
            goal_value: valueToSave,
            parent_goal_id: deriveFromGoalId || undefined
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
          }
        }

        if (errorCount > 0) {
          alert(`${successCount} metas criadas com sucesso. ${errorCount} erros (possível duplicidade).`);
        }

        setIsModalOpen(false);
        fetchGoals();
      } catch (error: any) {
        alert(error.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    // Para shift com múltiplos turnos
    if (formData.goal_type === 'shift' && !editingItem && selectedShifts.length > 0) {
      // Verificar se filial foi selecionada
      if (!formData.company_id) {
        alert('Selecione uma filial');
        return;
      }
      
      if (rateioMode === 'percent') {
        if (!formData.goal_value || formData.goal_value <= 0) {
          alert('Informe o valor total da meta antes de usar o modo porcentagem');
          return;
        }
        const totalPercent = selectedShifts.reduce((sum: number, s: any) => sum + (s.percent ?? 0), 0);
        if (totalPercent > 100) {
          alert(`A soma das porcentagens (${totalPercent.toFixed(1)}%) não pode ultrapassar 100%`);
          return;
        }
        const hasInvalidPercent = selectedShifts.some((s: any) => (s.percent ?? 0) > 100 || (s.percent ?? 0) < 0);
        if (hasInvalidPercent) {
          alert('Cada porcentagem deve estar entre 0 e 100');
          return;
        }
      } else {
        const hasInvalidValue = selectedShifts.some((shift: any) => !shift.value || shift.value <= 0);
        if (hasInvalidValue) {
          alert('Todos os turnos devem ter um valor de meta válido');
          return;
        }
      }

      setSaving(true);
      try {
        let successCount = 0;
        let errorCount = 0;

        for (const shift of selectedShifts) {
          const valueToSave = rateioMode === 'percent'
            ? formData.goal_value * ((shift.percent ?? 0) / 100)
            : shift.value;
          const payload = {
            ...formData,
            shift_id: shift.id,
            goal_value: valueToSave,
            parent_goal_id: deriveFromGoalId || undefined
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
          }
        }

        if (errorCount > 0) {
          alert(`${successCount} metas criadas com sucesso. ${errorCount} erros (possível duplicidade).`);
        }

        setIsModalOpen(false);
        fetchGoals();
      } catch (error: any) {
        alert(error.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    // Para sale_mode com múltiplos modos de venda
    if (formData.goal_type === 'sale_mode' && !editingItem && selectedSaleModes.length > 0) {
      // Verificar se filial foi selecionada
      if (!formData.company_id) {
        alert('Selecione uma filial');
        return;
      }
      
      if (rateioMode === 'percent') {
        if (!formData.goal_value || formData.goal_value <= 0) {
          alert('Informe o valor total da meta antes de usar o modo porcentagem');
          return;
        }
        const totalPercent = selectedSaleModes.reduce((sum: number, m: any) => sum + (m.percent ?? 0), 0);
        if (totalPercent > 100) {
          alert(`A soma das porcentagens (${totalPercent.toFixed(1)}%) não pode ultrapassar 100%`);
          return;
        }
        const hasInvalidPercent = selectedSaleModes.some((m: any) => (m.percent ?? 0) > 100 || (m.percent ?? 0) < 0);
        if (hasInvalidPercent) {
          alert('Cada porcentagem deve estar entre 0 e 100');
          return;
        }
      } else {
        const hasInvalidValue = selectedSaleModes.some((mode: any) => !mode.value || mode.value <= 0);
        if (hasInvalidValue) {
          alert('Todos os modos de venda devem ter um valor de meta válido');
          return;
        }
      }

      setSaving(true);
      try {
        let successCount = 0;
        let errorCount = 0;

        for (const mode of selectedSaleModes) {
          const valueToSave = rateioMode === 'percent'
            ? formData.goal_value * ((mode.percent ?? 0) / 100)
            : mode.value;
          const payload = {
            ...formData,
            sale_mode_id: mode.id,
            goal_value: valueToSave,
            parent_goal_id: deriveFromGoalId || undefined
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
          }
        }

        if (errorCount > 0) {
          alert(`${successCount} metas criadas com sucesso. ${errorCount} erros (possível duplicidade).`);
        }

        setIsModalOpen(false);
        fetchGoals();
      } catch (error: any) {
        alert(error.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    // Fluxo normal (meta única)
    if (!formData.goal_value || formData.goal_value <= 0) {
      alert('Informe o valor da meta');
      return;
    }

    setSaving(true);
    try {
      const url = editingItem 
        ? `/api/goals/${editingItem.id}` 
        : '/api/goals';
      
      // Incluir parent_goal_id se estiver derivando de outra meta
      const payload = {
        ...formData,
        parent_goal_id: deriveFromGoalId || undefined
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
  const handleClone = async (item: SalesGoal) => {
    try {
      const payload = {
        company_group_id: item.company_group_id,
        goal_type: item.goal_type,
        year: item.year,
        month: item.month,
        company_id: item.company_id || '',
        employee_id: item.employee_id || '',
        external_product_id: item.external_product_id || '',
        shift_id: item.shift_id || '',
        sale_mode_id: item.sale_mode_id || '',
        custom_name: item.custom_name || '',
        custom_description: item.custom_description || '',
        goal_value: item.goal_value,
        goal_unit: item.goal_unit,
        parent_goal_id: item.parent_goal_id || ''
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

  // Recalcular valores em R$ quando goal_value muda no modo %
  useEffect(() => {
    if (rateioMode !== 'percent' || !formData.goal_value || formData.goal_value <= 0) return;
    setSelectedEmployees(prev => prev.map((e: any) => ({
      ...e,
      value: formData.goal_value * ((e.percent ?? 0) / 100)
    })));
    setSelectedShifts(prev => prev.map((s: any) => ({
      ...s,
      value: formData.goal_value * ((s.percent ?? 0) / 100)
    })));
    setSelectedSaleModes(prev => prev.map((m: any) => ({
      ...m,
      value: formData.goal_value * ((m.percent ?? 0) / 100)
    })));
  }, [formData.goal_value, rateioMode]);


  // Buscar metas disponíveis para derivar (filtrado pela filial quando selecionada)
  useEffect(() => {
    if (showDeriveOption && selectedGroupId) {
      const fetchAvailableGoals = async () => {
        try {
          const res = await fetch(`/api/goals?group_id=${selectedGroupId}&year=${formData.year}&month=${formData.month}`);
          const data = await res.json();
          // Filtrar pela filial selecionada se houver
          let goals = data.goals || [];
          if (formData.company_id) {
            goals = goals.filter((g: SalesGoal) => g.company_id === formData.company_id);
          }
          setAvailableGoalsForDerive(goals);
        } catch (error) {
          console.error('Erro ao buscar metas para derivar:', error);
        }
      };
      fetchAvailableGoals();
    }
  }, [showDeriveOption, selectedGroupId, formData.year, formData.month, formData.company_id]);

  // Aplicar valor derivado
  const handleApplyDerivedValue = () => {
    const sourceGoal = availableGoalsForDerive.find((g: any) => g.id === deriveFromGoalId);
    if (sourceGoal) {
      setFormData({ ...formData, goal_value: sourceGoal.goal_value });
      setInputDisplayValue(formatInputValue(sourceGoal.goal_value, formData.goal_unit));
      
      // Se for employee_revenue, distribuir o valor entre os funcionários selecionados
      if (formData.goal_type === 'employee_revenue' && selectedEmployees.length > 0) {
        const valuePerEmployee = sourceGoal.goal_value / selectedEmployees.length;
        setSelectedEmployees(selectedEmployees.map((emp: any) => ({
          ...emp,
          value: valuePerEmployee
        })));
      }

      // Se for shift, distribuir o valor entre os turnos selecionados
      if (formData.goal_type === 'shift' && selectedShifts.length > 0) {
        const valuePerShift = sourceGoal.goal_value / selectedShifts.length;
        setSelectedShifts(selectedShifts.map((shift: any) => ({
          ...shift,
          value: valuePerShift
        })));
        // Atualizar valores de display
        const newDisplayValues: Record<string, string> = {};
        selectedShifts.forEach((shift: any) => {
          newDisplayValues[shift.id] = formatInputValue(valuePerShift, formData.goal_unit);
        });
        setShiftDisplayValues(prev => ({ ...prev, ...newDisplayValues }));
      }

      // Se for sale_mode, distribuir o valor entre os modos de venda selecionados
      if (formData.goal_type === 'sale_mode' && selectedSaleModes.length > 0) {
        const valuePerMode = sourceGoal.goal_value / selectedSaleModes.length;
        setSelectedSaleModes(selectedSaleModes.map((mode: any) => ({
          ...mode,
          value: valuePerMode
        })));
        // Atualizar valores de display
        const newDisplayValues: Record<string, string> = {};
        selectedSaleModes.forEach((mode: any) => {
          newDisplayValues[mode.id] = formatInputValue(valuePerMode, formData.goal_unit);
        });
        setSaleModeDisplayValues(prev => ({ ...prev, ...newDisplayValues }));
      }
    }
  };

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
    if (unit === 'currency') {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    return value.toLocaleString('pt-BR') + ' un';
  };

  // Formatar valor para input (1.000,00 para R$ e 1.000 para quantidade)
  const formatInputValue = (value: number, unit: string) => {
    if (unit === 'currency') {
      return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Converter valor formatado para número
  const parseFormattedValue = (value: string, unit: string) => {
    // Remove pontos de milhar e substitui vírgula por ponto
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Parse e format para porcentagem (0-100)
  const parsePercent = (value: string): number => {
    const clean = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
  };
  const formatPercent = (value: number): string => {
    if (value === 0) return '';
    return value % 1 === 0 ? String(Math.round(value)) : value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  // Formatar valor enquanto digita (formato brasileiro - sempre moeda)
  const formatValueWhileTyping = (value: string): string => {
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length === 0) return '';
    
    // Converte para número e divide por 100 para ter centavos
    const numericValue = parseInt(numbers) / 100;
    
    // Formata no padrão brasileiro (1.000,00) - sempre como moeda
    return numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Handler para mudança de valor com formatação
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Permite apenas números, vírgula e ponto
    const cleanInput = rawValue.replace(/[^\d.,]/g, '');
    const numericValue = parseFormattedValue(cleanInput, formData.goal_unit);
    setFormData({ ...formData, goal_value: numericValue });
  };

  // Estado para valor exibido no input
  const [inputDisplayValue, setInputDisplayValue] = useState('');

  // Atualizar valor exibido quando formData muda
  useEffect(() => {
    if (formData.goal_value > 0) {
      setInputDisplayValue(formatInputValue(formData.goal_value, formData.goal_unit));
    } else {
      setInputDisplayValue('');
    }
  }, [formData.goal_unit]);

  // Handler para input de valor
  const handleValueInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInputDisplayValue(rawValue);
    
    // Converte para número
    const numericValue = parseFormattedValue(rawValue, formData.goal_unit);
    setFormData(prev => ({ ...prev, goal_value: numericValue }));
  };

  // Handler para blur - formata o valor
  const handleValueBlur = () => {
    if (formData.goal_value > 0) {
      setInputDisplayValue(formatInputValue(formData.goal_value, formData.goal_unit));
    }
  };

  // Obter descrição da meta
  const getGoalDescription = (goal: SalesGoal) => {
    switch (goal.goal_type) {
      case 'company_revenue':
        return goal.company?.name || 'Empresa não definida';
      case 'employee_revenue':
        return goal.employee?.name || 'Funcionário não definido';
      case 'shift':
        return goal.shift?.name || 'Turno não definido';
      case 'sale_mode':
        return goal.sale_mode?.name || 'Modo de venda não definido';
      default:
        return 'Meta';
    }
  };

  // Anos disponíveis para filtro (2025 a 2030)
  const years = [2025, 2026, 2027, 2028, 2029, 2030];

  // Exportar para CSV/Excel
  const handleExport = () => {
    if (filteredItems.length === 0) return;

    const headers = ['Tipo', 'Descrição', 'Filial', 'Mês', 'Ano', 'Valor'];
    const rows = filteredItems.map((item: any) => [
      getGoalTypeInfo(item.goal_type).label,
      getGoalDescription(item),
      item.company?.name || '-',
      MONTHS[item.month - 1],
      item.year,
      item.goal_unit === 'currency' 
        ? item.goal_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        : item.goal_value.toLocaleString('pt-BR')
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((row: any) => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `metas-faturamento-${filterYear}-${filterMonth ? MONTHS[filterMonth - 1] : 'todos'}.csv`;
    link.click();
  };

  // Download do modelo de planilha
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/goals/template');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'modelo-metas.xlsx';
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Erro ao baixar modelo');
      }
    } catch (error) {
      console.error('Erro ao baixar modelo:', error);
      alert('Erro ao baixar modelo');
    }
  };

  // Importar planilha
  const handleImport = async () => {
    if (!importFile || !importCompany || !selectedGroupId) {
      alert('Selecione o arquivo e a empresa');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('company_id', importCompany);
      formData.append('company_group_id', selectedGroupId);
      formData.append('year', importYear.toString());
      formData.append('month', importMonth.toString());

      const res = await fetch('/api/goals/import', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        alert(`${data.message}\n\nDetalhes:\n${data.details.join('\n')}`);
        setIsImportModalOpen(false);
        setImportFile(null);
        fetchGoals();
      } else {
        alert(`Erro: ${data.error || 'Erro ao importar'}`);
      }
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      alert(`Erro ao importar: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meta Faturamento</h1>
            <p className="text-gray-500 text-sm mt-1">
              Gerencie as metas de faturamento por empresa, vendedor, turno e modo de venda
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
            <button
              onClick={handleExport}
              disabled={filteredItems.length === 0}
              className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Exportar para Excel"
            >
              <Download size={18} />
            </button>
            <Button variant="secondary" onClick={handleNew}>
              <Plus size={18} className="mr-2" />
              Nova Meta
            </Button>
            <Button onClick={handleNewComposite}>
              <Layers size={18} className="mr-2" />
              Nova Meta Composta
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
                            // Selecionar todos da página atual
                            const pageIds = paginatedItems.map((item: any) => item.id);
                            setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
                          } else {
                            // Desmarcar todos da página atual
                            const pageIds = paginatedItems.map((item: any) => item.id);
                            setSelectedIds(prev => prev.filter((id: any) => !pageIds.includes(id)));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Tipo</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Descrição</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Filial</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Período</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Valor Meta</th>
                    <th className="w-24 text-center px-4 py-3 text-sm font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        <Target size={48} className="mx-auto mb-4 text-gray-300" />
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
                            <div className="flex flex-col gap-1">
                              <span className="text-gray-900">{getGoalDescription(item)}</span>
                              {item.parent_goal && (
                                <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full w-fit">
                                  <GitBranch size={10} />
                                  Derivado de: {item.parent_goal.name || 'Meta Pai'}
                                </span>
                              )}
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

      {/* Modal Nova/Editar Meta ou Nova Meta Composta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {modalMode === 'composite' ? 'Nova Meta Composta' : (editingItem ? 'Editar Meta' : 'Nova Meta')}
              </h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Linha 1: Tipo (apenas modal simples) + Filial */}
              <div className={`grid gap-4 ${modalMode === 'composite' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {modalMode === 'simple' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Meta *</label>
                    <select
                      value={formData.goal_type}
                      onChange={(e) => setFormData({ ...formData, goal_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={!!editingItem}
                    >
                      {GOAL_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filial {modalMode === 'composite' || formData.goal_type === 'company_revenue' || formData.goal_type === 'shift' || formData.goal_type === 'sale_mode' ? '*' : '(opcional)'}
                  </label>
                  <select
                    value={formData.company_id}
                    onChange={(e) => {
                      const newCompanyId = e.target.value;
                      setFormData({ ...formData, company_id: newCompanyId, employee_id: '', shift_id: '', sale_mode_id: '' });
                      // Limpar funcionários/turnos/modos selecionados e meta de referência se mudar a filial
                      if (formData.goal_type === 'employee_revenue' && selectedEmployees.length > 0) {
                        setSelectedEmployees([]);
                      }
                      if (formData.goal_type === 'shift' && selectedShifts.length > 0) {
                        setSelectedShifts([]);
                      }
                      if (formData.goal_type === 'sale_mode' && selectedSaleModes.length > 0) {
                        setSelectedSaleModes([]);
                      }
                      setDeriveFromGoalId('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">
                      {(formData.goal_type === 'company_revenue' || formData.goal_type === 'shift' || formData.goal_type === 'sale_mode') ? 'Selecione...' : 'Todas as filiais'}
                    </option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
              </div>

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


              {/* FATURAMENTO EMPRESA - Valor da Meta (apenas modal simples) */}
              {modalMode === 'simple' && formData.goal_type === 'company_revenue' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Meta *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <input
                      type="text"
                      value={inputDisplayValue}
                      onChange={handleValueInputChange}
                      onBlur={handleValueBlur}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              )}

              {/* FATURAMENTO MODO - Formulário simples (apenas modal simples) */}
              {modalMode === 'simple' && formData.goal_type === 'sale_mode' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modo de Venda *</label>
                    <select
                      value={formData.sale_mode_id}
                      onChange={(e) => setFormData({ ...formData, sale_mode_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {filteredSaleModesForForm.map((mode) => (
                        <option key={mode.id} value={mode.id}>{mode.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Meta *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                      <input
                        type="text"
                        value={inputDisplayValue}
                        onChange={handleValueInputChange}
                        onBlur={handleValueBlur}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* RATEIO COMPOSTA - Sequência fixa: 1. Faturamento Empresa, 2. Modo, 3. Turno */}
              {modalMode === 'composite' && (
                <>
                  {/* 1. Faturamento Empresa */}
                  <div className="border-t border-gray-200 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">1. Faturamento Empresa *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                      <input
                        type="text"
                        value={inputDisplayValue}
                        onChange={handleValueInputChange}
                        onBlur={handleValueBlur}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0,00"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Valor total que será rateado entre Modo e Turno</p>
                  </div>
                </>
              )}

              {/* Funcionário único (modal simples) */}
              {modalMode === 'simple' && formData.goal_type === 'employee_revenue' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário *</label>
                    <select
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {filteredEmployeesForForm.map((employee) => (
                        <option key={employee.id} value={employee.id}>{employee.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Meta *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                      <input
                        type="text"
                        value={inputDisplayValue}
                        onChange={handleValueInputChange}
                        onBlur={handleValueBlur}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* 2. Modo de Venda - rateio (sequência fixa: Empresa → Modo → Turno) */}
              {modalMode === 'composite' && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <label className="block text-sm font-medium text-gray-700">2. Modo de Venda (rateio)</label>
                  <p className="text-xs text-gray-500">Usa o Faturamento Empresa informado acima</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Modos de Venda</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Button variant="secondary" onClick={() => {
                        const availableModes = filteredSaleModesForForm.filter((m: any) => !selectedSaleModes.find((sm: any) => sm.id === m.id));
                        if (availableModes.length === 0) return;
                        const totalModes = selectedSaleModes.length + availableModes.length;
                        if (rateioMode === 'percent') {
                          const pct = 100 / totalModes;
                          setSelectedSaleModes([...selectedSaleModes.map((m: any) => ({ ...m, percent: pct, value: formData.goal_value > 0 ? formData.goal_value * pct / 100 : 0 })), ...availableModes.map((m: any) => ({ id: m.id, name: m.name, value: formData.goal_value > 0 ? formData.goal_value * pct / 100 : 0, percent: pct }))]);
                          setSaleModePercentDisplayValues(prev => ({ ...prev, ...Object.fromEntries([...selectedSaleModes.map((m: any) => m.id), ...availableModes.map((m: any) => m.id)].map((id) => [id, formatPercent(100 / totalModes)])) }));
                        } else {
                          const val = formData.goal_value > 0 ? formData.goal_value / totalModes : 0;
                          setSelectedSaleModes([...selectedSaleModes.map((m: any) => ({ ...m, value: val })), ...availableModes.map((m: any) => ({ id: m.id, name: m.name, value: val }))]);
                          setSaleModeDisplayValues(prev => ({ ...prev, ...Object.fromEntries([...selectedSaleModes, ...availableModes].map((m: any) => [m.id, formatInputValue(val, formData.goal_unit)])) }));
                        }
                      }} className="text-sm"><Plus size={16} className="mr-1" />Adicionar Todos</Button>
                      {selectedSaleModes.length > 0 && (
                        <>
                          <Button variant="secondary" onClick={() => {
                            if (rateioMode === 'percent') {
                              const pct = 100 / selectedSaleModes.length;
                              setSelectedSaleModes(selectedSaleModes.map((m: any) => ({ ...m, percent: pct, value: formData.goal_value > 0 ? formData.goal_value * pct / 100 : 0 })));
                              setSaleModePercentDisplayValues(Object.fromEntries(selectedSaleModes.map((m: any) => [m.id, formatPercent(pct)])));
                            } else if (formData.goal_value > 0) {
                              const val = formData.goal_value / selectedSaleModes.length;
                              setSelectedSaleModes(selectedSaleModes.map((m: any) => ({ ...m, value: val })));
                              setSaleModeDisplayValues(prev => ({ ...prev, ...Object.fromEntries(selectedSaleModes.map((m: any) => [m.id, formatInputValue(val, formData.goal_unit)])) }));
                            }
                          }} className="text-sm"><Hash size={16} className="mr-1" />Recalcular</Button>
                          <Button variant="secondary" onClick={() => setSelectedSaleModes([])} className="text-sm text-red-600 hover:text-red-700"><Trash2 size={16} className="mr-1" />Limpar</Button>
                        </>
                      )}
                    </div>
                    <select value="" onChange={(e) => {
                      const modeId = e.target.value;
                      if (!modeId) return;
                      const mode = filteredSaleModesForForm.find((m: any) => m.id === modeId);
                      if (mode && !selectedSaleModes.find((sm: any) => sm.id === modeId)) {
                        const total = selectedSaleModes.length + 1;
                        if (rateioMode === 'percent') {
                          const pct = 100 / total;
                          setSelectedSaleModes([...selectedSaleModes.map((m: any) => ({ ...m, percent: pct, value: formData.goal_value > 0 ? formData.goal_value * pct / 100 : 0 })), { id: mode.id, name: mode.name, value: formData.goal_value > 0 ? formData.goal_value * pct / 100 : 0, percent: pct }]);
                          setSaleModePercentDisplayValues(prev => ({ ...prev, [mode.id]: formatPercent(pct) }));
                        } else {
                          const val = formData.goal_value > 0 ? formData.goal_value / total : 0;
                          setSelectedSaleModes([...selectedSaleModes.map((m: any) => ({ ...m, value: val })), { id: mode.id, name: mode.name, value: val }]);
                          setSaleModeDisplayValues(prev => ({ ...prev, [mode.id]: formatInputValue(val, formData.goal_unit) }));
                        }
                      }
                      e.target.value = '';
                    }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3">
                      <option value="">+ Adicionar modo de venda...</option>
                      {filteredSaleModesForForm.filter((m: any) => !selectedSaleModes.find((sm: any) => sm.id === m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    {selectedSaleModes.length > 1 && (
                      <div className="space-y-2 mb-3">
                        <label className="block text-sm font-medium text-gray-700">Tipo de rateio</label>
                        <div className="flex rounded-lg border border-gray-300 overflow-hidden w-fit">
                          <button type="button" onClick={() => { setRateioMode('value'); if (formData.goal_value > 0) setSelectedSaleModes(selectedSaleModes.map((m: any) => ({ ...m, value: formData.goal_value * ((m.percent ?? 0) / 100), percent: undefined }))); }} className={`px-4 py-2 text-sm font-medium ${rateioMode === 'value' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>R$</button>
                          <button
                            type="button"
                            onClick={() => {
                              setRateioMode('percent');
                              if (formData.goal_value > 0) {
                                setSelectedSaleModes(selectedSaleModes.map((m: any) => ({ ...m, percent: m.value > 0 ? (m.value / formData.goal_value) * 100 : 0 })));
                                setSaleModePercentDisplayValues(Object.fromEntries(selectedSaleModes.map((m: any) => [m.id, formatPercent(m.value > 0 ? (m.value / formData.goal_value) * 100 : 0)])));
                              } else {
                                alert('Informe o valor total da meta');
                              }
                            }}
                            className={`px-4 py-2 text-sm font-medium ${rateioMode === 'percent' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                          >
                            %
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedSaleModes.length > 0 && (
                      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">
                        {selectedSaleModes.map((mode, index) => (
                          <div key={mode.id} className="flex items-center gap-2 p-3">
                            <span className="flex-1 text-sm text-gray-700 truncate">{mode.name}</span>
                            {rateioMode === 'percent' ? (
                              <>
                                <input type="text" value={saleModePercentDisplayValues[mode.id] ?? formatPercent(mode.percent ?? 0)} onChange={(e) => { const raw = e.target.value.replace(/[^\d,.]/g, ''); setSaleModePercentDisplayValues(prev => ({ ...prev, [mode.id]: raw })); const pct = parsePercent(raw); const up = [...selectedSaleModes]; up[index] = { ...mode, percent: pct, value: formData.goal_value > 0 ? formData.goal_value * pct / 100 : 0 }; setSelectedSaleModes(up); }} onBlur={() => setSaleModePercentDisplayValues(prev => ({ ...prev, [mode.id]: formatPercent(mode.percent ?? 0) }))} placeholder="0" className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-right" />
                                <span className="text-sm text-gray-500">%</span>
                                {formData.goal_value > 0 && <span className="text-xs text-gray-500">= {formatValue(formData.goal_value * ((mode.percent ?? 0) / 100), formData.goal_unit)}</span>}
                              </>
                            ) : (
                              <input type="text" value={saleModeDisplayValues[mode.id] ?? formatInputValue(mode.value, formData.goal_unit)} onChange={(e) => { const raw = e.target.value.replace(/[^\d.,]/g, ''); const fmt = formatValueWhileTyping(raw); setSaleModeDisplayValues(prev => ({ ...prev, [mode.id]: fmt })); const up = [...selectedSaleModes]; up[index] = { ...mode, value: parseFormattedValue(fmt, formData.goal_unit) }; setSelectedSaleModes(up); }} onBlur={(e) => { const v = parseFormattedValue(e.target.value, formData.goal_unit); const up = [...selectedSaleModes]; up[index] = { ...mode, value: v }; setSelectedSaleModes(up); setSaleModeDisplayValues(prev => ({ ...prev, [mode.id]: formatInputValue(v, formData.goal_unit) })); }} className="w-32 px-2 py-1 text-sm border border-gray-300 rounded text-right" />
                            )}
                            <button onClick={() => { setSelectedSaleModes(selectedSaleModes.filter((sm: any) => sm.id !== mode.id)); setSaleModeDisplayValues(prev => { const n = { ...prev }; delete n[mode.id]; return n; }); setSaleModePercentDisplayValues(prev => { const n = { ...prev }; delete n[mode.id]; return n; }); }} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedSaleModes.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between flex-wrap gap-2">
                        <div className="text-sm text-gray-600"><span className="font-medium">{selectedSaleModes.length}</span> modo(s)</div>
                        <div className="flex gap-4 text-sm text-gray-600">
                          {rateioMode === 'percent' && <span>Soma: <span className={selectedSaleModes.reduce((s, m) => s + (m.percent ?? 0), 0) > 100 ? 'text-red-600 font-bold' : 'font-bold text-gray-900'}>{selectedSaleModes.reduce((s, m) => s + (m.percent ?? 0), 0).toFixed(1)}%</span></span>}
                          <span>Total: <span className="font-bold text-gray-900">{formatValue(selectedSaleModes.reduce((sum: number, m: any) => sum + (rateioMode === 'percent' && formData.goal_value > 0 ? formData.goal_value * ((m.percent ?? 0) / 100) : m.value), 0), formData.goal_unit)}</span></span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Turno - rateio (sequência fixa: Empresa → Modo → Turno) */}
              {modalMode === 'composite' && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <label className="block text-sm font-medium text-gray-700">3. Turno (rateio)</label>
                  <p className="text-xs text-gray-500">Usa o Faturamento Empresa informado acima</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Turnos</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const availableShifts = filteredShiftsForForm.filter((shift: any) => !selectedShifts.find((ss: any) => ss.id === shift.id));
                          if (availableShifts.length === 0) return;
                          const totalShifts = selectedShifts.length + availableShifts.length;
                          if (rateioMode === 'percent') {
                            const percentPerShift = 100 / totalShifts;
                            const updatedExisting = selectedShifts.map((shift: any) => ({ ...shift, percent: percentPerShift, value: formData.goal_value > 0 ? formData.goal_value * percentPerShift / 100 : 0 }));
                            const newShifts = availableShifts.map((shift: any) => ({ id: shift.id, name: shift.name, value: formData.goal_value > 0 ? formData.goal_value * percentPerShift / 100 : 0, percent: percentPerShift }));
                            setSelectedShifts([...updatedExisting, ...newShifts]);
                            const newDisplay: Record<string, string> = {};
                            [...updatedExisting, ...newShifts].forEach((s: any) => { newDisplay[s.id] = formatPercent(percentPerShift); });
                            setShiftPercentDisplayValues(prev => ({ ...prev, ...newDisplay }));
                          } else {
                            const valuePerShift = formData.goal_value > 0 ? formData.goal_value / totalShifts : 0;
                            const updatedExisting = selectedShifts.map((shift: any) => ({ ...shift, value: valuePerShift }));
                            const newShifts = availableShifts.map((shift: any) => ({ id: shift.id, name: shift.name, value: valuePerShift }));
                            setSelectedShifts([...updatedExisting, ...newShifts]);
                            const newDisplayValues: Record<string, string> = {};
                            [...updatedExisting, ...newShifts].forEach((s: any) => { newDisplayValues[s.id] = formatInputValue(valuePerShift, formData.goal_unit); });
                            setShiftDisplayValues(prev => ({ ...prev, ...newDisplayValues }));
                          }
                        }}
                        className="text-sm"
                      >
                        <Plus size={16} className="mr-1" />Adicionar Todos
                      </Button>
                      {selectedShifts.length > 0 && (
                        <>
                          <Button variant="secondary" onClick={() => {
                            if (selectedShifts.length > 0) {
                              if (rateioMode === 'percent') {
                                const percentPerShift = 100 / selectedShifts.length;
                                setSelectedShifts(selectedShifts.map((shift: any) => ({ ...shift, percent: percentPerShift, value: formData.goal_value > 0 ? formData.goal_value * percentPerShift / 100 : 0 })));
                                const newDisplay: Record<string, string> = {};
                                selectedShifts.forEach((s: any) => { newDisplay[s.id] = formatPercent(percentPerShift); });
                                setShiftPercentDisplayValues(newDisplay);
                              } else if (formData.goal_value > 0) {
                                const valuePerShift = formData.goal_value / selectedShifts.length;
                                setSelectedShifts(selectedShifts.map((shift: any) => ({ ...shift, value: valuePerShift })));
                                const newDisplayValues: Record<string, string> = {};
                                selectedShifts.forEach((s: any) => { newDisplayValues[s.id] = formatInputValue(valuePerShift, formData.goal_unit); });
                                setShiftDisplayValues(prev => ({ ...prev, ...newDisplayValues }));
                              }
                            }
                          }} className="text-sm"><Hash size={16} className="mr-1" />Recalcular</Button>
                          <Button variant="secondary" onClick={() => setSelectedShifts([])} className="text-sm text-red-600 hover:text-red-700"><Trash2 size={16} className="mr-1" />Limpar</Button>
                        </>
                      )}
                    </div>
                    <select value="" onChange={(e) => {
                      const shiftId = e.target.value;
                      if (!shiftId) return;
                      const shift = filteredShiftsForForm.find((s: any) => s.id === shiftId);
                      if (shift && !selectedShifts.find((ss: any) => ss.id === shiftId)) {
                        const totalShifts = selectedShifts.length + 1;
                        if (rateioMode === 'percent') {
                          const percentPerShift = 100 / totalShifts;
                          const updatedExisting = selectedShifts.map((existing: any) => ({ ...existing, percent: percentPerShift, value: formData.goal_value > 0 ? formData.goal_value * percentPerShift / 100 : 0 }));
                          const newShift = { id: shift.id, name: shift.name, value: formData.goal_value > 0 ? formData.goal_value * percentPerShift / 100 : 0, percent: percentPerShift };
                          setSelectedShifts([...updatedExisting, newShift]);
                          setShiftPercentDisplayValues(prev => ({ ...prev, [shift.id]: formatPercent(percentPerShift) }));
                        } else {
                          const valuePerShift = formData.goal_value > 0 ? formData.goal_value / totalShifts : 0;
                          const updatedExisting = selectedShifts.map((existing: any) => ({ ...existing, value: valuePerShift }));
                          const newShift = { id: shift.id, name: shift.name, value: valuePerShift };
                          setSelectedShifts([...updatedExisting, newShift]);
                          const newDisplayValues: Record<string, string> = {};
                          [...updatedExisting, newShift].forEach((s: any) => { newDisplayValues[s.id] = formatInputValue(valuePerShift, formData.goal_unit); });
                          setShiftDisplayValues(prev => ({ ...prev, ...newDisplayValues }));
                        }
                      }
                    }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3">
                      <option value="">+ Adicionar turno...</option>
                      {filteredShiftsForForm.filter((shift: any) => !selectedShifts.find((ss: any) => ss.id === shift.id)).map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
                    </select>
                    {selectedShifts.length > 1 && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Tipo de rateio</label>
                        <div className="flex rounded-lg border border-gray-300 overflow-hidden w-fit">
                          <button type="button" onClick={() => { setRateioMode('value'); if (formData.goal_value > 0) { setSelectedShifts(selectedShifts.map((s: any) => ({ ...s, value: formData.goal_value * ((s.percent ?? 0) / 100), percent: undefined }))); const newDisplay: Record<string, string> = {}; selectedShifts.forEach((s: any) => { newDisplay[s.id] = formatInputValue(formData.goal_value * ((s.percent ?? 0) / 100), formData.goal_unit); }); setShiftDisplayValues(newDisplay); } }} className={`px-4 py-2 text-sm font-medium ${rateioMode === 'value' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>R$</button>
                          <button type="button" onClick={() => { setRateioMode('percent'); if (formData.goal_value > 0) { setSelectedShifts(selectedShifts.map((s: any) => ({ ...s, percent: s.value > 0 ? (s.value / formData.goal_value) * 100 : 0 }))); const newDisplay: Record<string, string> = {}; selectedShifts.forEach((s: any) => { const pct = s.value > 0 ? (s.value / formData.goal_value) * 100 : 0; newDisplay[s.id] = formatPercent(pct); }); setShiftPercentDisplayValues(newDisplay); } else { alert('Informe o valor total da meta antes de usar o modo porcentagem'); } }} className={`px-4 py-2 text-sm font-medium ${rateioMode === 'percent' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>%</button>
                        </div>
                        {rateioMode === 'percent' && (!formData.goal_value || formData.goal_value <= 0) && <p className="text-amber-600 text-sm">Preencha o valor total da meta para usar porcentagem</p>}
                      </div>
                    )}
                    {selectedShifts.length > 0 && (
                      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">
                        {selectedShifts.map((shift, index) => {
                          const calculatedValue = rateioMode === 'percent' && formData.goal_value > 0 ? formData.goal_value * ((shift.percent ?? 0) / 100) : shift.value;
                          const displayValue = rateioMode === 'percent' ? (shiftPercentDisplayValues[shift.id] ?? formatPercent(shift.percent ?? 0)) : (shiftDisplayValues[shift.id] ?? formatInputValue(shift.value, formData.goal_unit));
                          return (
                            <div key={shift.id} className="flex items-center gap-2 p-3">
                              <span className="flex-1 text-sm text-gray-700 truncate">{shift.name}</span>
                              {rateioMode === 'percent' ? (
                                <>
                                  <div className="flex items-center gap-1">
                                    <input type="text" value={displayValue} onChange={(e) => { const raw = e.target.value.replace(/[^\d,.]/g, ''); setShiftPercentDisplayValues(prev => ({ ...prev, [shift.id]: raw })); const pct = parsePercent(raw); const updated = [...selectedShifts]; updated[index] = { ...shift, percent: pct, value: formData.goal_value > 0 ? formData.goal_value * pct / 100 : 0 }; setSelectedShifts(updated); }} onBlur={() => setShiftPercentDisplayValues(prev => ({ ...prev, [shift.id]: formatPercent(shift.percent ?? 0) }))} placeholder="0" className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-right bg-white" />
                                    <span className="text-sm text-gray-500">%</span>
                                  </div>
                                  {formData.goal_value > 0 && <span className="text-xs text-gray-500 whitespace-nowrap">= {formatValue(calculatedValue, formData.goal_unit)}</span>}
                                </>
                              ) : (
                                <input type="text" value={displayValue} onChange={(e) => { const rawValue = e.target.value.replace(/[^\d.,]/g, ''); const formatted = formatValueWhileTyping(rawValue); setShiftDisplayValues(prev => ({ ...prev, [shift.id]: formatted })); const numericValue = parseFormattedValue(formatted, formData.goal_unit); const updated = [...selectedShifts]; updated[index] = { ...shift, value: numericValue }; setSelectedShifts(updated); }} onBlur={(e) => { const value = parseFormattedValue(e.target.value, formData.goal_unit); const updated = [...selectedShifts]; updated[index] = { ...shift, value }; setSelectedShifts(updated); setShiftDisplayValues(prev => ({ ...prev, [shift.id]: formatInputValue(value, formData.goal_unit) })); }} onFocus={() => setShiftDisplayValues(prev => ({ ...prev, [shift.id]: formatInputValue(shift.value, formData.goal_unit) }))} className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-right bg-white" />
                              )}
                              <button onClick={() => { setSelectedShifts(selectedShifts.filter((ss: any) => ss.id !== shift.id)); setShiftDisplayValues(prev => { const n = { ...prev }; delete n[shift.id]; return n; }); setShiftPercentDisplayValues(prev => { const n = { ...prev }; delete n[shift.id]; return n; }); }} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {selectedShifts.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between flex-wrap gap-2">
                        <div className="text-sm text-gray-600"><span className="font-medium">{selectedShifts.length}</span> turno(s) selecionado(s)</div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {rateioMode === 'percent' && <span>Soma: <span className={`font-bold ${selectedShifts.reduce((s, x) => s + (x.percent ?? 0), 0) > 100 ? 'text-red-600' : 'text-gray-900'}`}>{selectedShifts.reduce((s, x) => s + (x.percent ?? 0), 0).toFixed(1)}%</span></span>}
                          <span>Total: <span className="font-bold text-gray-900">{formatValue(selectedShifts.reduce((sum: number, s: any) => sum + (rateioMode === 'percent' && formData.goal_value > 0 ? formData.goal_value * ((s.percent ?? 0) / 100) : s.value), 0), formData.goal_unit)}</span></span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Turno único (modal simples) */}
              {modalMode === 'simple' && formData.goal_type === 'shift' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Turno *</label>
                    <select
                      value={formData.shift_id}
                      onChange={(e) => setFormData({ ...formData, shift_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {filteredShiftsForForm.map((shift) => (
                        <option key={shift.id} value={shift.id}>{shift.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Meta *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                      <input
                        type="text"
                        value={inputDisplayValue}
                        onChange={handleValueInputChange}
                        onBlur={handleValueBlur}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </>
              )}

            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} isLoading={saving}>
                {modalMode === 'composite' ? 'Criar Meta Composta' : (editingItem ? 'Salvar' : 'Criar Meta')}
              </Button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
