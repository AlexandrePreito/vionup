'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Target, Loader2, X, Search, DollarSign, Percent, Copy } from 'lucide-react';
import { Button } from '@/components/ui';
import { useGroupFilter } from '@/hooks/useGroupFilter';

interface Category {
  id: string;
  name: string;
  code: string | null;
  type: string;
  level: number;
  is_analytical: boolean;
  parent_id: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface Responsible {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
}

interface FinancialGoal {
  id: string;
  company_group_id: string;
  category_id: string;
  company_id: string | null;
  year: number;
  month: number;
  goal_type: 'value' | 'percentage';
  goal_value: number;
  description: string | null;
  is_active: boolean;
  category: Category;
  company: Company | null;
  responsibles: { id: string; responsible: Responsible }[];
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function MetaFinanceiroPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();

  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [loading, setLoading] = useState(true);

  const currentDate = new Date();
  const [filterYear, setFilterYear] = useState(currentDate.getFullYear());
  const [filterMonth, setFilterMonth] = useState(currentDate.getMonth() + 1);
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResponsibleModalOpen, setIsResponsibleModalOpen] = useState(false);
  const [responsibleSearch, setResponsibleSearch] = useState('');
  const [editingItem, setEditingItem] = useState<FinancialGoal | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    category_id: '',
    company_ids: [] as string[],
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
    goal_type: 'value' as 'value' | 'percentage',
    goal_value: 0,
    description: '',
    responsible_ids: [] as string[],
  });
  const [inputDisplayValue, setInputDisplayValue] = useState('');

  const fetchGoals = async () => {
    if (!selectedGroupId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        group_id: selectedGroupId,
        year: String(filterYear),
        month: String(filterMonth),
        include_inactive: 'true',
      });
      if (filterCompanyId) params.set('company_id', filterCompanyId);

      const res = await fetch('/api/financial-goals?' + params.toString());
      const data = await res.json();
      setGoals(data.goals || []);
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!selectedGroupId) return;
    try {
      const res = await fetch('/api/categories?group_id=' + selectedGroupId + '&analytical_only=true');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const fetchCompanies = async () => {
    if (!selectedGroupId) return;
    try {
      const res = await fetch('/api/companies?group_id=' + selectedGroupId);
      const data = await res.json();
      setCompanies(data.companies || data || []);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  const fetchResponsibles = async () => {
    if (!selectedGroupId) return;
    try {
      const res = await fetch('/api/financial-responsibles?group_id=' + selectedGroupId);
      const data = await res.json();
      setResponsibles(data.responsibles || []);
    } catch (error) {
      console.error('Erro ao buscar responsáveis:', error);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      fetchCategories();
      fetchCompanies();
      fetchResponsibles();
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGoals();
    }
  }, [selectedGroupId, filterYear, filterMonth, filterCompanyId]);

  const analyticalCategories = useMemo(() =>
    categories.filter(c => c.is_analytical),
    [categories]
  );

  const categoriesForSelect = useMemo(() => {
    const entradas = analyticalCategories.filter(c => c.type === 'entrada');
    const saidas = analyticalCategories.filter(c => c.type === 'saida');
    return { entradas, saidas };
  }, [analyticalCategories]);

  const getCategoryPath = (catId: string): string => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return '';
    const parts: string[] = [cat.name];
    let parentId = cat.parent_id;
    while (parentId) {
      const parent = categories.find(c => c.id === parentId);
      if (!parent) break;
      parts.unshift(parent.name);
      parentId = parent.parent_id;
    }
    return parts.join(' > ');
  };

  const filteredGoals = useMemo(() => {
    if (!searchTerm.trim()) return goals;
    const term = searchTerm.toLowerCase();
    return goals.filter(g =>
      g.category?.name.toLowerCase().includes(term) ||
      g.company?.name.toLowerCase().includes(term) ||
      g.description?.toLowerCase().includes(term) ||
      g.responsibles?.some(r => r.responsible?.name.toLowerCase().includes(term))
    );
  }, [goals, searchTerm]);

  const groupedGoals = useMemo(() => {
    const entradas = filteredGoals.filter(g => g.category?.type === 'entrada');
    const saidas = filteredGoals.filter(g => g.category?.type === 'saida');
    return { entradas, saidas };
  }, [filteredGoals]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatGoalValue = (goal: FinancialGoal) => {
    if (goal.goal_type === 'percentage') {
      return goal.goal_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%';
    }
    return formatCurrency(goal.goal_value);
  };

  const parseFormattedValue = (value: string): number => {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const formatInputValue = (value: number): string => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      category_id: '',
      company_ids: [],
      year: filterYear,
      month: filterMonth,
      goal_type: 'value',
      goal_value: 0,
      description: '',
      responsible_ids: [],
    });
    setInputDisplayValue('');
    setIsModalOpen(true);
  };

  const handleEdit = (goal: FinancialGoal) => {
    setEditingItem(goal);
    setFormData({
      category_id: goal.category_id,
      company_ids: goal.company_id ? [goal.company_id] : [],
      year: goal.year,
      month: goal.month,
      goal_type: goal.goal_type,
      goal_value: goal.goal_value,
      description: goal.description || '',
      responsible_ids: goal.responsibles?.map(r => r.responsible?.id).filter(Boolean) as string[] || [],
    });
    setInputDisplayValue(formatInputValue(goal.goal_value));
    setIsModalOpen(true);
  };

  const toggleCompany = (id: string) => {
    setFormData(prev => ({
      ...prev,
      company_ids: prev.company_ids.includes(id)
        ? prev.company_ids.filter(c => c !== id)
        : [...prev.company_ids, id]
    }));
  };

  const selectAllCompanies = () => {
    setFormData(prev => ({ ...prev, company_ids: companies.map(c => c.id) }));
  };

  const deselectAllCompanies = () => {
    setFormData(prev => ({ ...prev, company_ids: [] }));
  };

  const handleSave = async () => {
    if (!formData.category_id) {
      alert('Selecione uma categoria');
      return;
    }
    if (formData.goal_value <= 0) {
      alert('Informe um valor para a meta');
      return;
    }

    try {
      setSaving(true);

      const basePayload = {
        company_group_id: selectedGroupId,
        category_id: formData.category_id,
        year: formData.year,
        month: formData.month,
        goal_type: formData.goal_type,
        goal_value: formData.goal_value,
        description: formData.description || null,
        responsible_ids: formData.responsible_ids,
      };

      if (editingItem) {
        const payload = {
          ...basePayload,
          company_id: formData.company_ids[0] || null,
        };
        const res = await fetch('/api/financial-goals/' + editingItem.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Erro ao salvar meta');
          return;
        }
      } else {
        const idsToCreate = formData.company_ids.length > 0 ? formData.company_ids : [null];
        for (const companyId of idsToCreate) {
          const payload = { ...basePayload, company_id: companyId };
          const res = await fetch('/api/financial-goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const data = await res.json();
            alert(data.error || 'Erro ao salvar meta');
            return;
          }
        }
      }

      setIsModalOpen(false);
      fetchGoals();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar meta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goal: FinancialGoal) => {
    if (!confirm('Excluir meta de "' + (goal.category?.name || '') + '"?')) return;
    try {
      const res = await fetch('/api/financial-goals/' + goal.id, { method: 'DELETE' });
      if (!res.ok) {
        alert('Erro ao excluir meta');
        return;
      }
      fetchGoals();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const handleClone = async (goal: FinancialGoal) => {
    const nextMonth = goal.month === 12 ? 1 : goal.month + 1;
    const nextYear = goal.month === 12 ? goal.year + 1 : goal.year;
    try {
      const res = await fetch('/api/financial-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_group_id: selectedGroupId,
          category_id: goal.category_id,
          company_id: goal.company_id || null,
          year: nextYear,
          month: nextMonth,
          goal_type: goal.goal_type,
          goal_value: goal.goal_value,
          description: goal.description || null,
          responsible_ids: goal.responsibles?.map((r) => r.responsible?.id).filter(Boolean) || [],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          alert(`Já existe meta para esta categoria e empresa em ${MONTHS[nextMonth - 1]}/${nextYear}.`);
        } else {
          alert(data.error || 'Erro ao clonar meta');
        }
        return;
      }
      fetchGoals();
    } catch (error) {
      console.error('Erro ao clonar:', error);
      alert('Erro ao clonar meta');
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d,.-]/g, '');
    setInputDisplayValue(raw);
    setFormData({ ...formData, goal_value: parseFormattedValue(raw) });
  };

  const handleValueBlur = () => {
    setInputDisplayValue(formatInputValue(formData.goal_value));
  };

  const addResponsible = (id: string) => {
    setFormData(prev => ({
      ...prev,
      responsible_ids: prev.responsible_ids.includes(id) ? prev.responsible_ids : [...prev.responsible_ids, id],
    }));
  };

  const removeResponsible = (id: string) => {
    setFormData(prev => ({
      ...prev,
      responsible_ids: prev.responsible_ids.filter(r => r !== id),
    }));
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 1 + i);

  const renderGoalSection = (title: string, goalsArray: FinancialGoal[], type: 'entrada' | 'saida') => {
    if (goalsArray.length === 0) return null;

    const sectionTotal = goalsArray
      .filter(g => g.goal_type === 'value')
      .reduce((sum, g) => sum + g.goal_value, 0);

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">
            {title} ({goalsArray.length})
          </h3>
          <span className="font-semibold text-gray-900">
            {formatCurrency(sectionTotal)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Categoria</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Empresa</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Tipo</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Valor</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Responsáveis</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {goalsArray.map((goal) => (
                <tr key={goal.id} className={'hover:bg-gray-50 transition-colors ' + (!goal.is_active ? 'opacity-50' : '')}>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{goal.category?.name}</div>
                    {goal.category?.code && (
                      <div className="text-xs text-gray-400 font-mono">{goal.category.code}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {goal.company?.name || 'Todas'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ' + (goal.goal_type === 'value' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
                      {goal.goal_type === 'value' ? 'R$' : '%'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-gray-900">
                      {formatGoalValue(goal)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {goal.responsibles && goal.responsibles.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {goal.responsibles.map((r) => (
                          <span key={r.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                            {r.responsible?.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleClone(goal)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100" title="Clonar para próximo mês">
                        <Copy size={16} />
                      </button>
                      <button onClick={() => handleEdit(goal)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100" title="Editar">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(goal)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meta Financeiro</h1>
            <p className="text-gray-500 text-sm mt-1">Defina metas por categoria do fluxo de caixa</p>
          </div>
          {selectedGroupId && (
            <Button onClick={handleCreate}>
              <Plus size={20} className="mr-2" />
              Nova Meta
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
            {isGroupReadOnly ? (
              <input type="text" value={groupName} disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed" />
            ) : (
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                {groups.map((g: { id: string; name: string }) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>

          <div className="w-44">
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <select
              value={filterCompanyId}
              onChange={(e) => setFilterCompanyId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {selectedGroupId && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por categoria, empresa, responsável..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        )}

        {!loading && !selectedGroupId && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-12 text-center text-gray-500">
              <Target size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="font-medium">Selecione um grupo</p>
              <p className="text-sm">Escolha um grupo para gerenciar as metas financeiras</p>
            </div>
          </div>
        )}

        {!loading && selectedGroupId && filteredGoals.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-12 text-center text-gray-500">
              <Target size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="font-medium">
                {searchTerm ? 'Nenhum resultado' : 'Nenhuma meta'}
              </p>
              <p className="text-sm mb-6">
                {searchTerm
                  ? 'Nenhuma meta encontrada para "' + searchTerm + '"'
                  : 'Nenhuma meta para ' + MONTHS[filterMonth - 1] + ' ' + filterYear
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleCreate}>
                  <Plus size={18} className="mr-2" />
                  Nova Meta
                </Button>
              )}
            </div>
          </div>
        )}

        {!loading && selectedGroupId && filteredGoals.length > 0 && (
          <div className="space-y-6">
            {renderGoalSection('Entradas', groupedGoals.entradas, 'entrada')}
            {renderGoalSection('Saídas', groupedGoals.saidas, 'saida')}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setIsModalOpen(false); setIsResponsibleModalOpen(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Editar Meta' : 'Nova Meta Financeira'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); setIsResponsibleModalOpen(false); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria <span className="text-red-500">*</span></label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione uma categoria...</option>
                  {categoriesForSelect.entradas.length > 0 && (
                    <optgroup label="Entradas">
                      {categoriesForSelect.entradas.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.code ? c.code + ' - ' : ''}{getCategoryPath(c.id)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {categoriesForSelect.saidas.length > 0 && (
                    <optgroup label="Saídas">
                      {categoriesForSelect.saidas.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.code ? c.code + ' - ' : ''}{getCategoryPath(c.id)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresas</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={selectAllCompanies}
                    className="text-sm px-3 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100"
                  >
                    Marcar todas
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllCompanies}
                    className="text-sm px-3 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100"
                  >
                    Desmarcar todas
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {formData.company_ids.length === 0
                    ? 'Nenhuma empresa = meta para Todas as empresas'
                    : `${formData.company_ids.length} empresa(s) selecionada(s) — será criada uma linha para cada uma`}
                </p>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1.5">
                  {companies.map(c => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1">
                      <input
                        type="checkbox"
                        checked={formData.company_ids.includes(c.id)}
                        onChange={() => toggleCompany(c.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Meta</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, goal_type: 'value' });
                      setInputDisplayValue(formatInputValue(formData.goal_value));
                    }}
                    className={'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ' + (formData.goal_type === 'value' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300')}
                  >
                    <DollarSign size={20} />
                    <span className="font-medium">Valor (R$)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, goal_type: 'percentage' });
                      setInputDisplayValue(formatInputValue(formData.goal_value));
                    }}
                    className={'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ' + (formData.goal_type === 'percentage' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300')}
                  >
                    <Percent size={20} />
                    <span className="font-medium">Percentual (%)</span>
                  </button>
                </div>
                {formData.goal_type === 'percentage' && (
                  <p className="text-xs text-gray-500 mt-2">Percentual sobre o faturamento total do período</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Meta <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {formData.goal_type === 'value' ? 'R$' : '%'}
                  </span>
                  <input
                    type="text"
                    value={inputDisplayValue}
                    onChange={handleValueChange}
                    onBlur={handleValueBlur}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Observações opcionais..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Responsáveis</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.responsible_ids.map(id => {
                    const r = responsibles.find(x => x.id === id);
                    if (!r) return null;
                    return (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {r.name}
                        <button
                          type="button"
                          onClick={() => removeResponsible(r.id)}
                          className="p-0.5 rounded-full hover:bg-blue-200"
                          aria-label="Remover"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    );
                  })}
                </div>
                {responsibles.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Nenhum responsável cadastrado. Cadastre em Cadastros &gt; Responsáveis.</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setResponsibleSearch(''); setIsResponsibleModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Plus size={18} />
                    Adicionar responsável
                  </button>
                )}

                {isResponsibleModalOpen && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setIsResponsibleModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Buscar responsável</h3>
                        <div className="mt-3 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                          <input
                            type="text"
                            value={responsibleSearch}
                            onChange={(e) => setResponsibleSearch(e.target.value)}
                            placeholder="Digite nome, e-mail ou cargo..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 max-h-64">
                        {(() => {
                          const term = responsibleSearch.toLowerCase().trim();
                          const available = responsibles.filter(r =>
                            !formData.responsible_ids.includes(r.id) &&
                            (!term || r.name.toLowerCase().includes(term) ||
                              (r.email?.toLowerCase().includes(term)) ||
                              (r.role?.toLowerCase().includes(term)))
                          );
                          if (available.length === 0) {
                            return (
                              <p className="py-6 text-center text-gray-500 text-sm">
                                {term ? 'Nenhum responsável encontrado.' : 'Todos já foram adicionados.'}
                              </p>
                            );
                          }
                          return (
                            <div className="space-y-0.5">
                              {available.map(r => (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => addResponsible(r.id)}
                                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 hover:text-blue-800 transition-colors"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900">{r.name}</div>
                                    {r.role && <div className="text-xs text-gray-500">{r.role}</div>}
                                  </div>
                                  <Plus size={16} className="text-blue-500 shrink-0" />
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="px-6 py-3 border-t border-gray-200">
                        <Button variant="secondary" onClick={() => setIsResponsibleModalOpen(false)} className="w-full">
                          Fechar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <Button variant="secondary" onClick={() => { setIsModalOpen(false); setIsResponsibleModalOpen(false); }}>Cancelar</Button>
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
