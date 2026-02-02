'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, Search, Target, Loader2, 
  ChevronLeft, ChevronRight, Building, UserCircle, 
  Clock, ShoppingCart, Hash, Download, Copy, GitBranch, Upload, FileSpreadsheet
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

  // Modal de Cadastro/Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesGoal | null>(null);
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


  // Derivar valor
  const [showDeriveOption, setShowDeriveOption] = useState(false);
  const [deriveFromGoalId, setDeriveFromGoalId] = useState('');
  const [deriveReferenceType, setDeriveReferenceType] = useState<'company_revenue' | 'shift'>('company_revenue');
  const [availableGoalsForDerive, setAvailableGoalsForDerive] = useState<SalesGoal[]>([]);

  // Múltiplos funcionários (para employee_revenue)
  const [selectedEmployees, setSelectedEmployees] = useState<{ id: string; name: string; value: number }[]>([]);

  // Múltiplos turnos (para shift)
  const [selectedShifts, setSelectedShifts] = useState<{ id: string; name: string; value: number }[]>([]);

  // Múltiplos modos de venda (para sale_mode)
  const [selectedSaleModes, setSelectedSaleModes] = useState<{ id: string; name: string; value: number }[]>([]);
  
  // Estados para valores formatados dos inputs (turnos e modos)
  const [shiftDisplayValues, setShiftDisplayValues] = useState<Record<string, string>>({});
  const [saleModeDisplayValues, setSaleModeDisplayValues] = useState<Record<string, string>>({});

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
      setCompanies(data.companies || []);
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
    setIsModalOpen(true);
  };

  // Salvar meta
  const handleSave = async () => {
    // Para employee_revenue com múltiplos funcionários
    if (formData.goal_type === 'employee_revenue' && !editingItem && selectedEmployees.length > 0) {
      // Verificar se todos têm valor
      const hasInvalidValue = selectedEmployees.some((emp: any) => !emp.value || emp.value <= 0);
      if (hasInvalidValue) {
        alert('Todos os funcionários devem ter um valor de meta válido');
        return;
      }

      setSaving(true);
      try {
        let successCount = 0;
        let errorCount = 0;

        for (const emp of selectedEmployees) {
          const payload = {
            ...formData,
            employee_id: emp.id,
            goal_value: emp.value,
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
      
      // Verificar se todos têm valor
      const hasInvalidValue = selectedShifts.some((shift: any) => !shift.value || shift.value <= 0);
      if (hasInvalidValue) {
        alert('Todos os turnos devem ter um valor de meta válido');
        return;
      }

      setSaving(true);
      try {
        let successCount = 0;
        let errorCount = 0;

        for (const shift of selectedShifts) {
          const payload = {
            ...formData,
            shift_id: shift.id,
            goal_value: shift.value,
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
      
      // Verificar se todos têm valor
      const hasInvalidValue = selectedSaleModes.some((mode: any) => !mode.value || mode.value <= 0);
      if (hasInvalidValue) {
        alert('Todos os modos de venda devem ter um valor de meta válido');
        return;
      }

      setSaving(true);
      try {
        let successCount = 0;
        let errorCount = 0;

        for (const mode of selectedSaleModes) {
          const payload = {
            ...formData,
            sale_mode_id: mode.id,
            goal_value: mode.value,
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
              {/* Linha 1: Tipo + Filial */}
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filial {(formData.goal_type === 'company_revenue' || formData.goal_type === 'shift' || formData.goal_type === 'sale_mode') ? '*' : '(opcional)'}
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


              {/* FATURAMENTO EMPRESA - Valor da Meta */}
              {formData.goal_type === 'company_revenue' && (
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

              {/* FATURAMENTO MODO - Seção com valor de referência */}
              {formData.goal_type === 'sale_mode' && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  {/* Opção de usar referência - Radio buttons */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Usar valor de referência</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="saleModeReference"
                          checked={!showDeriveOption}
                          onChange={() => {
                            setShowDeriveOption(false);
                            setDeriveFromGoalId('');
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Nenhum</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="saleModeReference"
                          checked={showDeriveOption && deriveReferenceType === 'company_revenue'}
                          onChange={() => {
                            setShowDeriveOption(true);
                            setDeriveReferenceType('company_revenue');
                            setDeriveFromGoalId('');
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Faturamento Empresa</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="saleModeReference"
                          checked={showDeriveOption && deriveReferenceType === 'shift'}
                          onChange={() => {
                            setShowDeriveOption(true);
                            setDeriveReferenceType('shift');
                            setDeriveFromGoalId('');
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Faturamento Turno</span>
                      </label>
                    </div>

                    {showDeriveOption && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Meta de referência</label>
                          <select
                            value={deriveFromGoalId}
                            onChange={(e) => setDeriveFromGoalId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Selecione...</option>
                            {availableGoalsForDerive
                              .filter((goal) => goal.goal_type === deriveReferenceType)
                              .map((goal) => (
                                <option key={goal.id} value={goal.id}>
                                  {getGoalDescription(goal)} - {formatValue(goal.goal_value, goal.goal_unit)}
                                </option>
                              ))}
                          </select>
                        </div>
                        {deriveFromGoalId && (
                          <Button variant="secondary" onClick={handleApplyDerivedValue} className="w-full">
                            Aplicar Valor
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Valor base para distribuir */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor Base da Meta *</label>
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
                    <p className="text-xs text-gray-500 mt-1">Este valor será dividido igualmente entre os modos de venda selecionados</p>
                  </div>

                  {/* Botões de seleção de modos de venda */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Modos de Venda</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          // Adicionar todos os modos de venda ativos
                          const availableModes = filteredSaleModesForForm
                            .filter((mode: any) => !selectedSaleModes.find((sm: any) => sm.id === mode.id));
                          
                          if (availableModes.length === 0) return;
                          
                          // Calcular valor dividido para todos (incluindo os já selecionados)
                          const totalModes = selectedSaleModes.length + availableModes.length;
                          const valuePerMode = formData.goal_value > 0 ? formData.goal_value / totalModes : 0;
                          
                          // Atualizar os já selecionados com o novo valor
                          const updatedExisting = selectedSaleModes.map((mode: any) => ({
                            ...mode,
                            value: valuePerMode
                          }));
                          
                          // Adicionar os novos com o valor dividido
                          const newModes = availableModes.map((mode: any) => ({
                            id: mode.id,
                            name: mode.name,
                            value: valuePerMode
                          }));
                          
                          setSelectedSaleModes([...updatedExisting, ...newModes]);
                          
                          // Atualizar valores de display
                          const newDisplayValues: Record<string, string> = {};
                          [...updatedExisting, ...newModes].forEach((mode: any) => {
                            newDisplayValues[mode.id] = formatInputValue(valuePerMode, formData.goal_unit);
                          });
                          setSaleModeDisplayValues(prev => ({ ...prev, ...newDisplayValues }));
                        }}
                        className="text-sm"
                      >
                        <Plus size={16} className="mr-1" />
                        Adicionar Todos
                      </Button>
                      {selectedSaleModes.length > 0 && (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              // Recalcular - redistribuir o valor base entre os modos de venda
                              if (formData.goal_value > 0 && selectedSaleModes.length > 0) {
                                const valuePerMode = formData.goal_value / selectedSaleModes.length;
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
                            }}
                            className="text-sm"
                          >
                            <Hash size={16} className="mr-1" />
                            Recalcular
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedSaleModes([])}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={16} className="mr-1" />
                            Limpar
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Select para adicionar modo de venda individual */}
                    <select
                      value=""
                      onChange={(e) => {
                        const modeId = e.target.value;
                        if (!modeId) return;
                        const mode = filteredSaleModesForForm.find((m: any) => m.id === modeId);
                        if (mode && !selectedSaleModes.find((sm: any) => sm.id === modeId)) {
                          // Recalcular valor dividido para todos (incluindo o novo)
                          const totalModes = selectedSaleModes.length + 1;
                          const valuePerMode = formData.goal_value > 0 ? formData.goal_value / totalModes : 0;
                          
                          // Atualizar os já selecionados
                          const updatedExisting = selectedSaleModes.map((existing: any) => ({
                            ...existing,
                            value: valuePerMode
                          }));
                          
                          const newMode = {
                            id: mode.id,
                            name: mode.name,
                            value: valuePerMode
                          };
                          
                          setSelectedSaleModes([...updatedExisting, newMode]);
                          
                          // Atualizar valores de display
                          const newDisplayValues: Record<string, string> = {};
                          [...updatedExisting, newMode].forEach((m: any) => {
                            newDisplayValues[m.id] = formatInputValue(valuePerMode, formData.goal_unit);
                          });
                          setSaleModeDisplayValues(prev => ({ ...prev, ...newDisplayValues }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
                    >
                      <option value="">+ Adicionar modo de venda...</option>
                      {filteredSaleModesForForm
                        .filter((mode: any) => !selectedSaleModes.find((sm: any) => sm.id === mode.id))
                        .map((mode) => (
                          <option key={mode.id} value={mode.id}>{mode.name}</option>
                        ))}
                    </select>

                    {/* Lista de modos de venda selecionados com valores editáveis */}
                    {selectedSaleModes.length > 0 && (
                      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">
                        {selectedSaleModes.map((mode, index) => {
                          const displayValue = saleModeDisplayValues[mode.id] ?? formatInputValue(mode.value, formData.goal_unit);
                          
                          return (
                          <div key={mode.id} className="flex items-center gap-2 p-3">
                            <span className="flex-1 text-sm text-gray-700 truncate">{mode.name}</span>
                            <input
                              type="text"
                              value={displayValue}
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                // Permite apenas números, vírgula e ponto
                                const cleanInput = rawValue.replace(/[^\d.,]/g, '');
                                
                                // Formata enquanto digita
                                const formatted = formatValueWhileTyping(cleanInput);
                                setSaleModeDisplayValues(prev => ({ ...prev, [mode.id]: formatted }));
                                
                                // Atualiza o valor numérico
                                const numericValue = parseFormattedValue(formatted, formData.goal_unit);
                                const updated = [...selectedSaleModes];
                                updated[index] = { ...mode, value: numericValue };
                                setSelectedSaleModes(updated);
                              }}
                              onBlur={(e) => {
                                const value = parseFormattedValue(e.target.value, formData.goal_unit);
                                const updated = [...selectedSaleModes];
                                updated[index] = { ...mode, value };
                                setSelectedSaleModes(updated);
                                setSaleModeDisplayValues(prev => ({ ...prev, [mode.id]: formatInputValue(value, formData.goal_unit) }));
                              }}
                              onFocus={(e) => {
                                // Ao focar, mostra o valor formatado
                                setSaleModeDisplayValues(prev => ({ ...prev, [mode.id]: formatInputValue(mode.value, formData.goal_unit) }));
                              }}
                              className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-right bg-white"
                            />
                            <button
                              onClick={() => {
                                setSelectedSaleModes(selectedSaleModes.filter((sm: any) => sm.id !== mode.id));
                                setSaleModeDisplayValues(prev => {
                                  const newValues = { ...prev };
                                  delete newValues[mode.id];
                                  return newValues;
                                });
                              }}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedSaleModes.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{selectedSaleModes.length}</span> modo(s) selecionado(s)
                        </div>
                        <div className="text-sm text-gray-600">
                          Total: <span className="font-bold text-gray-900">{formatValue(selectedSaleModes.reduce((sum: number, m: any) => sum + m.value, 0), formData.goal_unit)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FATURAMENTO VENDEDOR - Seção especial com múltiplos funcionários */}
              {formData.goal_type === 'employee_revenue' && !editingItem && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  {/* Opção de usar referência - ACIMA do valor */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showDeriveOption}
                        onChange={(e) => setShowDeriveOption(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Usar valor de referência (Faturamento Empresa)</span>
                    </label>

                    {showDeriveOption && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Meta de referência</label>
                          <select
                            value={deriveFromGoalId}
                            onChange={(e) => setDeriveFromGoalId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Selecione...</option>
                            {availableGoalsForDerive
                              .filter((goal) => goal.goal_type === 'company_revenue' && (!formData.company_id || goal.company_id === formData.company_id))
                              .map((goal) => (
                                <option key={goal.id} value={goal.id}>
                                  {goal.company?.name || 'Empresa'} - {formatValue(goal.goal_value, goal.goal_unit)}
                                </option>
                              ))}
                          </select>
                        </div>
                        {deriveFromGoalId && (
                          <Button variant="secondary" onClick={handleApplyDerivedValue} className="w-full">
                            Aplicar Valor
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Valor base para distribuir */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor Base da Meta *</label>
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
                    <p className="text-xs text-gray-500 mt-1">Este valor será dividido igualmente entre os funcionários selecionados</p>
                  </div>

                  {/* Botões de seleção de funcionários */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Funcionários</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          // Adicionar todos os funcionários (filtrados pela filial)
                          const availableEmployees = filteredEmployeesForForm
                            .filter((emp: any) => !selectedEmployees.find((se: any) => se.id === emp.id));
                          
                          if (availableEmployees.length === 0) return;
                          
                          // Calcular valor dividido para todos (incluindo os já selecionados)
                          const totalEmployees = selectedEmployees.length + availableEmployees.length;
                          const valuePerEmployee = formData.goal_value > 0 ? formData.goal_value / totalEmployees : 0;
                          
                          // Atualizar os já selecionados com o novo valor
                          const updatedExisting = selectedEmployees.map((emp: any) => ({
                            ...emp,
                            value: valuePerEmployee
                          }));
                          
                          // Adicionar os novos com o valor dividido
                          const newEmployees = availableEmployees.map((emp: any) => ({
                            id: emp.id,
                            name: emp.name,
                            value: valuePerEmployee
                          }));
                          
                          setSelectedEmployees([...updatedExisting, ...newEmployees]);
                        }}
                        className="text-sm"
                      >
                        <Plus size={16} className="mr-1" />
                        Adicionar Todos {formData.company_id ? 'da Filial' : ''}
                      </Button>
                      {selectedEmployees.length > 0 && (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              // Recalcular - redistribuir o valor base entre os funcionários
                              if (formData.goal_value > 0 && selectedEmployees.length > 0) {
                                const valuePerEmployee = formData.goal_value / selectedEmployees.length;
                                setSelectedEmployees(selectedEmployees.map((emp: any) => ({
                                  ...emp,
                                  value: valuePerEmployee
                                })));
                              }
                            }}
                            className="text-sm"
                          >
                            <Hash size={16} className="mr-1" />
                            Recalcular
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
                          // Recalcular valor dividido para todos (incluindo o novo)
                          const totalEmployees = selectedEmployees.length + 1;
                          const valuePerEmployee = formData.goal_value > 0 ? formData.goal_value / totalEmployees : 0;
                          
                          // Atualizar os já selecionados
                          const updatedExisting = selectedEmployees.map((existing: any) => ({
                            ...existing,
                            value: valuePerEmployee
                          }));
                          
                          setSelectedEmployees([...updatedExisting, {
                            id: emp.id,
                            name: emp.name,
                            value: valuePerEmployee
                          }]);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
                    >
                      <option value="">+ Adicionar funcionário...</option>
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
                            <input
                              type="text"
                              value={formatInputValue(emp.value, formData.goal_unit)}
                              onChange={(e) => {
                                const newValue = parseFormattedValue(e.target.value, formData.goal_unit);
                                const updated = [...selectedEmployees];
                                updated[index] = { ...emp, value: newValue };
                                setSelectedEmployees(updated);
                              }}
                              onBlur={(e) => {
                                const value = parseFormattedValue(e.target.value, formData.goal_unit);
                                const updated = [...selectedEmployees];
                                updated[index] = { ...emp, value };
                                setSelectedEmployees(updated);
                              }}
                              className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-right"
                            />
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
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{selectedEmployees.length}</span> funcionário(s) selecionado(s)
                        </div>
                        <div className="text-sm text-gray-600">
                          Total: <span className="font-bold text-gray-900">{formatValue(selectedEmployees.reduce((sum: number, e: any) => sum + e.value, 0), formData.goal_unit)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Funcionário único - para edição ou employee_product */}
              {(formData.goal_type === 'employee_revenue' && editingItem) && (
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

              {/* FATURAMENTO TURNO - Seção especial com múltiplos turnos */}
              {formData.goal_type === 'shift' && !editingItem && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  {/* Opção de usar referência - ACIMA do valor */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showDeriveOption}
                        onChange={(e) => setShowDeriveOption(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Usar valor de referência (Faturamento Empresa)</span>
                    </label>

                    {showDeriveOption && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Meta de referência</label>
                          <select
                            value={deriveFromGoalId}
                            onChange={(e) => setDeriveFromGoalId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Selecione...</option>
                            {availableGoalsForDerive
                              .filter((goal) => goal.goal_type === 'company_revenue')
                              .map((goal) => (
                                <option key={goal.id} value={goal.id}>
                                  {goal.company?.name || 'Empresa'} - {formatValue(goal.goal_value, goal.goal_unit)}
                                </option>
                              ))}
                          </select>
                        </div>
                        {deriveFromGoalId && (
                          <Button variant="secondary" onClick={handleApplyDerivedValue} className="w-full">
                            Aplicar Valor
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Valor base para distribuir */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor Base da Meta *</label>
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
                    <p className="text-xs text-gray-500 mt-1">Este valor será dividido igualmente entre os turnos selecionados</p>
                  </div>

                  {/* Botões de seleção de turnos */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Turnos</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          // Adicionar todos os turnos ativos
                          const availableShifts = filteredShiftsForForm
                            .filter((shift: any) => !selectedShifts.find((ss: any) => ss.id === shift.id));
                          
                          if (availableShifts.length === 0) return;
                          
                          // Calcular valor dividido para todos (incluindo os já selecionados)
                          const totalShifts = selectedShifts.length + availableShifts.length;
                          const valuePerShift = formData.goal_value > 0 ? formData.goal_value / totalShifts : 0;
                          
                          // Atualizar os já selecionados com o novo valor
                          const updatedExisting = selectedShifts.map((shift: any) => ({
                            ...shift,
                            value: valuePerShift
                          }));
                          
                          // Adicionar os novos com o valor dividido
                          const newShifts = availableShifts.map((shift: any) => ({
                            id: shift.id,
                            name: shift.name,
                            value: valuePerShift
                          }));
                          
                          setSelectedShifts([...updatedExisting, ...newShifts]);
                          
                          // Atualizar valores de display
                          const newDisplayValues: Record<string, string> = {};
                          [...updatedExisting, ...newShifts].forEach((shift: any) => {
                            newDisplayValues[shift.id] = formatInputValue(valuePerShift, formData.goal_unit);
                          });
                          setShiftDisplayValues(prev => ({ ...prev, ...newDisplayValues }));
                        }}
                        className="text-sm"
                      >
                        <Plus size={16} className="mr-1" />
                        Adicionar Todos
                      </Button>
                      {selectedShifts.length > 0 && (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              // Recalcular - redistribuir o valor base entre os turnos
                              if (formData.goal_value > 0 && selectedShifts.length > 0) {
                                const valuePerShift = formData.goal_value / selectedShifts.length;
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
                            }}
                            className="text-sm"
                          >
                            <Hash size={16} className="mr-1" />
                            Recalcular
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedShifts([])}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={16} className="mr-1" />
                            Limpar
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Select para adicionar turno individual */}
                    <select
                      value=""
                      onChange={(e) => {
                        const shiftId = e.target.value;
                        if (!shiftId) return;
                        const shift = filteredShiftsForForm.find((s: any) => s.id === shiftId);
                        if (shift && !selectedShifts.find((ss: any) => ss.id === shiftId)) {
                          // Recalcular valor dividido para todos (incluindo o novo)
                          const totalShifts = selectedShifts.length + 1;
                          const valuePerShift = formData.goal_value > 0 ? formData.goal_value / totalShifts : 0;
                          
                          // Atualizar os já selecionados
                          const updatedExisting = selectedShifts.map((existing: any) => ({
                            ...existing,
                            value: valuePerShift
                          }));
                          
                          const newShift = {
                            id: shift.id,
                            name: shift.name,
                            value: valuePerShift
                          };
                          
                          setSelectedShifts([...updatedExisting, newShift]);
                          
                          // Atualizar valores de display
                          const newDisplayValues: Record<string, string> = {};
                          [...updatedExisting, newShift].forEach((s: any) => {
                            newDisplayValues[s.id] = formatInputValue(valuePerShift, formData.goal_unit);
                          });
                          setShiftDisplayValues(prev => ({ ...prev, ...newDisplayValues }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
                    >
                      <option value="">+ Adicionar turno...</option>
                      {filteredShiftsForForm
                        .filter((shift: any) => !selectedShifts.find((ss: any) => ss.id === shift.id))
                        .map((shift) => (
                          <option key={shift.id} value={shift.id}>{shift.name}</option>
                        ))}
                    </select>

                    {/* Lista de turnos selecionados com valores editáveis */}
                    {selectedShifts.length > 0 && (
                      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">
                        {selectedShifts.map((shift, index) => {
                          const displayValue = shiftDisplayValues[shift.id] ?? formatInputValue(shift.value, formData.goal_unit);
                          
                          return (
                          <div key={shift.id} className="flex items-center gap-2 p-3">
                            <span className="flex-1 text-sm text-gray-700 truncate">{shift.name}</span>
                            <input
                              type="text"
                              value={displayValue}
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                // Permite apenas números, vírgula e ponto
                                const cleanInput = rawValue.replace(/[^\d.,]/g, '');
                                
                                // Formata enquanto digita
                                const formatted = formatValueWhileTyping(cleanInput);
                                setShiftDisplayValues(prev => ({ ...prev, [shift.id]: formatted }));
                                
                                // Atualiza o valor numérico
                                const numericValue = parseFormattedValue(formatted, formData.goal_unit);
                                const updated = [...selectedShifts];
                                updated[index] = { ...shift, value: numericValue };
                                setSelectedShifts(updated);
                              }}
                              onBlur={(e) => {
                                const value = parseFormattedValue(e.target.value, formData.goal_unit);
                                const updated = [...selectedShifts];
                                updated[index] = { ...shift, value };
                                setSelectedShifts(updated);
                                setShiftDisplayValues(prev => ({ ...prev, [shift.id]: formatInputValue(value, formData.goal_unit) }));
                              }}
                              onFocus={(e) => {
                                // Ao focar, mostra o valor formatado
                                setShiftDisplayValues(prev => ({ ...prev, [shift.id]: formatInputValue(shift.value, formData.goal_unit) }));
                              }}
                              className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-right bg-white"
                            />
                            <button
                              onClick={() => {
                                setSelectedShifts(selectedShifts.filter((ss: any) => ss.id !== shift.id));
                                setShiftDisplayValues(prev => {
                                  const newValues = { ...prev };
                                  delete newValues[shift.id];
                                  return newValues;
                                });
                              }}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedShifts.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{selectedShifts.length}</span> turno(s) selecionado(s)
                        </div>
                        <div className="text-sm text-gray-600">
                          Total: <span className="font-bold text-gray-900">{formatValue(selectedShifts.reduce((sum: number, s: any) => sum + s.value, 0), formData.goal_unit)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Turno único - para edição */}
              {formData.goal_type === 'shift' && editingItem && (
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
                {editingItem ? 'Salvar' : 'Criar Meta'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
