'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ClipboardList, Trash2, Search, Loader2, 
  Calendar, Package, Download, X,
  ChevronLeft, Printer, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useGroupFilter } from '@/hooks/useGroupFilter';

interface PurchaseList {
  id: string;
  name: string;
  target_date: string;
  status: string;
  projection_days: number;
  notes: string;
  created_at: string;
  updated_at: string;
  purchase_list_items: { count: number }[];
  company_ids?: string[];
}

interface PurchaseListItem {
  id: string;
  raw_material_id: string;
  raw_material_name: string;
  parent_name: string;
  unit: string;
  projected_quantity: number;
  adjusted_quantity: number;
  current_stock: number;
  min_stock: number;
  loss_factor: number;
  notes: string;
}

interface PurchaseListDetail {
  id: string;
  name: string;
  target_date: string;
  status: string;
  projection_days: number;
  notes: string;
  created_at: string;
  purchase_list_items: PurchaseListItem[];
}

export default function ListasCompraPage() {
  const router = useRouter();
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [lists, setLists] = useState<PurchaseList[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Filtro de data
  type FiltroData = 'hoje' | 'esta_semana' | 'este_mes' | 'periodo';
  const [filtroData, setFiltroData] = useState<FiltroData>('este_mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Filtro de status
  const [filtroStatus, setFiltroStatus] = useState<string>('');

  // Filiais (empresas) do grupo para filtro e exibição
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [filtroCompanyId, setFiltroCompanyId] = useState<string>('');

  // Detail view
  const [selectedList, setSelectedList] = useState<PurchaseListDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Inline edit
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQtyValue, setEditQtyValue] = useState('');

  // Lista Revenda: sempre exibir e salvar quantidade como inteiro (arredondar para cima)
  const isRevendaList = selectedList?.name?.includes('Revenda') ?? false;
  const getDisplayQty = (qty: number) => (isRevendaList ? Math.ceil(Number(qty)) : Number(qty));

  // Edit list header
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editListName, setEditListName] = useState('');
  const [editListDate, setEditListDate] = useState('');
  const [editListStatus, setEditListStatus] = useState('');
  const [editListNotes, setEditListNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Print ref
  const printRef = useRef<HTMLDivElement>(null);

  const fetchLists = async () => {
    if (!selectedGroupId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ group_id: selectedGroupId });
      if (filtroCompanyId) params.set('company_id', filtroCompanyId);
      const res = await fetch(`/api/purchase-lists?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLists(data.lists || []);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    if (!selectedGroupId) return;
    try {
      const res = await fetch(`/api/companies?group_id=${selectedGroupId}`);
      if (res.ok) {
        const data = await res.json();
        const list = (data.companies || []).filter((c: any) => c.company_group_id === selectedGroupId);
        setCompanies(list.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch (e) {
      console.error('Erro ao buscar empresas:', e);
    }
  };

  const fetchListDetail = async (listId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/purchase-lists/${listId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedList(data.list);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      setFiltroCompanyId('');
      fetchCompanies();
      fetchLists();
      setSelectedList(null);
    } else {
      setLists([]);
      setCompanies([]);
      setFiltroCompanyId('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId) fetchLists();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroCompanyId]);

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Excluir esta lista de compra? Esta ação não pode ser desfeita.')) return;
    try {
      const res = await fetch(`/api/purchase-lists/${listId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLists();
        if (selectedList?.id === listId) setSelectedList(null);
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleUpdateListStatus = async (listId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/purchase-lists/${listId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchLists();
        if (selectedList?.id === listId) {
          await fetchListDetail(listId);
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleUpdateItemQty = async (itemId: string, newQty: number) => {
    if (!selectedList) return;
    const qtyToSave = isRevendaList ? Math.ceil(newQty) : newQty;
    try {
      const res = await fetch(`/api/purchase-lists/${selectedList.id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, adjusted_quantity: qtyToSave })
      });
      if (res.ok) {
        await fetchListDetail(selectedList.id);
        setEditingItemId(null);
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedList) return;
    if (!confirm('Remover este item da lista?')) return;
    try {
      const res = await fetch(`/api/purchase-lists/${selectedList.id}/items?item_id=${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchListDetail(selectedList.id);
        fetchLists();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleEditList = async () => {
    if (!selectedList) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/purchase-lists/${selectedList.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editListName, target_date: editListDate, status: editListStatus, notes: editListNotes })
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        fetchLists();
        await fetchListDetail(selectedList.id);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setSavingEdit(false);
    }
  };

  const openEditModal = () => {
    if (!selectedList) return;
    setEditListName(selectedList.name);
    setEditListDate(selectedList.target_date);
    setEditListNotes(selectedList.notes || '');
    setEditListStatus(selectedList.status);
    setIsEditModalOpen(true);
  };

  // Exportar Excel via API interna
  const exportExcel = async () => {
    if (!selectedList) return;
    try {
      const res = await fetch('/api/purchase-lists/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedList.name,
          target_date: selectedList.target_date,
          items: selectedList.purchase_list_items.map(item => ({
            raw_material_name: item.raw_material_name,
            parent_name: item.parent_name || '',
            unit: item.unit,
            adjusted_quantity: getDisplayQty(item.adjusted_quantity),
          }))
        })
      });
      
      if (!res.ok) {
        alert('Erro ao gerar Excel');
        return;
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lista-compra-${selectedList.name.replace(/\s+/g, '-')}-${selectedList.target_date}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      // Fallback CSV
      exportCSV();
    }
  };

  // Fallback CSV
  const exportCSV = () => {
    if (!selectedList) return;
    const headers = ['Matéria-Prima', 'Grupo', 'Unidade', 'Quantidade'];
    const rows = selectedList.purchase_list_items.map(item => [
      item.raw_material_name,
      item.parent_name || '',
      item.unit,
      getDisplayQty(item.adjusted_quantity)
    ]);
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lista-compra-${selectedList.name.replace(/\s+/g, '-')}.csv`;
    link.click();
  };

  // Imprimir
  const handlePrint = () => {
    if (!selectedList) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const items = selectedList.purchase_list_items;
    const totalQty = items.reduce((acc, i) => acc + getDisplayQty(i.adjusted_quantity || 0), 0);

    printWindow.document.write(`
      <html>
      <head>
        <title>Lista de Compra - ${selectedList.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          .header { border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
          .header h1 { font-size: 18px; font-weight: bold; }
          .header p { font-size: 12px; color: #666; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid #ddd; }
          th.right { text-align: right; }
          td { padding: 7px 10px; font-size: 12px; border-bottom: 1px solid #eee; }
          td.right { text-align: right; }
          td.name { font-weight: 500; }
          .group-badge { background: #f3e8ff; color: #7c3aed; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 500; margin-left: 6px; }
          .footer { margin-top: 16px; padding-top: 12px; border-top: 2px solid #333; display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; }
          .print-date { font-size: 10px; color: #999; margin-top: 20px; text-align: right; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${selectedList.name}</h1>
          <p>Data: ${formatDate(selectedList.target_date)} • ${items.length} itens</p>
          ${selectedList.notes ? `<p>${selectedList.notes}</p>` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:40px">#</th>
              <th>Matéria-Prima</th>
              <th style="width:80px">Unidade</th>
              <th class="right" style="width:100px">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td class="name">${item.raw_material_name}${item.parent_name ? `<span class="group-badge">${item.parent_name}</span>` : ''}</td>
                <td>${item.unit}</td>
                <td class="right" style="font-weight:600">${formatNumber(getDisplayQty(item.adjusted_quantity))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <span>Total: ${items.length} itens</span>
          <span>${formatNumber(totalQty)} kg</span>
        </div>
        <p class="print-date">Impresso em ${new Date().toLocaleString('pt-BR')}</p>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const formatNumber = (value: number): string => {
    return (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'finalizada': return 'bg-green-100 text-green-700';
      case 'cancelada': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  // Helpers de período para o filtro de data
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getStartOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Segunda = início da semana
    const monday = new Date(d);
    monday.setDate(diff);
    return monday.toISOString().split('T')[0];
  };
  const getEndOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 6; // Domingo = fim
    const sunday = new Date(d);
    sunday.setDate(diff);
    return sunday.toISOString().split('T')[0];
  };
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  };
  const getLastDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  };

  const listPassaFiltroData = (targetDate: string): boolean => {
    if (!targetDate) return true;
    if (filtroData === 'hoje') {
      return targetDate === getTodayStr();
    }
    if (filtroData === 'esta_semana') {
      const start = getStartOfWeek();
      const end = getEndOfWeek();
      return targetDate >= start && targetDate <= end;
    }
    if (filtroData === 'este_mes') {
      return targetDate >= getFirstDayOfMonth() && targetDate <= getLastDayOfMonth();
    }
    if (filtroData === 'periodo') {
      if (dataInicio && targetDate < dataInicio) return false;
      if (dataFim && targetDate > dataFim) return false;
      return true;
    }
    return true;
  };

  const filteredLists = lists
    .filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
    .filter(l => listPassaFiltroData(l.target_date))
    .filter(l => !filtroStatus || l.status === filtroStatus);

  // ======================
  // VIEW: Lista de listas
  // ======================
  if (!selectedList) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Listas de Compra</h1>
            <p className="text-gray-500 text-sm">Gerencie suas listas de compra de matérias-primas</p>
          </div>
          <button
            onClick={() => router.push('/compras/projecao-mp')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
          >
            Nova Lista (via Projeção)
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            {isGroupReadOnly ? (
              <input type="text" value={groupName} disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed text-sm" />
            ) : (
              <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="">Selecione o grupo</option>
                {groups.map((group: any) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Filtro de filial */}
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filial</label>
            <select
              value={filtroCompanyId}
              onChange={(e) => setFiltroCompanyId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={!selectedGroupId}
            >
              <option value="">Todas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Filtro de status */}
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Todos</option>
              <option value="rascunho">Rascunho</option>
              <option value="finalizada">Finalizada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          {/* Filtro de data */}
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
            <select
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value as FiltroData)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="hoje">Hoje</option>
              <option value="esta_semana">Esta semana</option>
              <option value="este_mes">Este mês</option>
              <option value="periodo">Período</option>
            </select>
          </div>
          {filtroData === 'periodo' && (
            <>
              <div className="w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">Data início</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">Data fim</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </>
          )}

          <div className="flex-1 min-w-[200px] max-w-sm relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar lista..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        )}

        {/* Lista */}
        {!loading && filteredLists.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <ClipboardList size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma lista de compra</p>
            <p className="text-gray-400 text-sm mt-1">Crie uma lista na tela de Projeção de MP</p>
          </div>
        )}

        {!loading && filteredLists.length > 0 && (
          <div className="space-y-3">
            {filteredLists.map((list) => {
              const itemCount = list.purchase_list_items?.[0]?.count || 0;
              return (
                <div
                  key={list.id}
                  onClick={() => fetchListDetail(list.id)}
                  className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer transition-all hover:shadow-md hover:border-blue-300 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      list.name.includes('Revenda') 
                        ? 'bg-orange-50' 
                        : 'bg-blue-50'
                    }`}>
                      <ClipboardList size={20} className={
                        list.name.includes('Revenda') 
                          ? 'text-orange-600' 
                          : 'text-blue-600'
                      } />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {list.name}
                        {list.name.includes('MP') && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">MP</span>
                        )}
                        {list.name.includes('Revenda') && (
                          <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Revenda</span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar size={12} />
                          {formatDate(list.target_date)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Package size={12} />
                          {itemCount} itens
                        </span>
                        <span className="text-xs text-gray-500">
                          Filial: {list.company_ids?.length
                            ? list.company_ids.map((id: string) => companies.find((c) => c.id === id)?.name).filter(Boolean).join(', ') || '—'
                            : 'Todas'}
                        </span>
                        {list.notes && (
                          <span className="text-xs text-gray-400 truncate max-w-[200px]">{list.notes}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleUpdateListStatus(list.id, 'rascunho')}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                          list.status === 'rascunho'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-white text-gray-400 hover:bg-yellow-50 hover:text-yellow-600'
                        }`}
                        title="Rascunho"
                      >
                        Rascunho
                      </button>
                      <button
                        onClick={() => handleUpdateListStatus(list.id, 'finalizada')}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 ${
                          list.status === 'finalizada'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-white text-gray-400 hover:bg-green-50 hover:text-green-600'
                        }`}
                        title="Finalizada"
                      >
                        Finalizada
                      </button>
                      <button
                        onClick={() => handleUpdateListStatus(list.id, 'cancelada')}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 ${
                          list.status === 'cancelada'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-white text-gray-400 hover:bg-red-50 hover:text-red-600'
                        }`}
                        title="Cancelada"
                      >
                        Cancelada
                      </button>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ======================
  // VIEW: Detalhe da lista
  // ======================
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{selectedList.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusBadge(selectedList.status)}`}>
              {selectedList.status}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Data: {formatDate(selectedList.target_date)} • {selectedList.purchase_list_items.length} itens
            {selectedList.notes && ` • ${selectedList.notes}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedList(null)}
            className="flex items-center gap-2 px-3 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
            title="Voltar"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
          <button
            onClick={handlePrint}
            className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Imprimir"
          >
            <Printer size={18} className="text-gray-500" />
          </button>
          <button
            onClick={exportExcel}
            className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            title="Exportar Excel"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Tabela de itens */}
      {loadingDetail ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <div ref={printRef} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase w-[50px]">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Matéria-Prima</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase w-[80px]">Unidade</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase w-[120px]">Antes</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase w-[120px]">Depois</th>
                  <th className="w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedList.purchase_list_items.map((item, idx) => {
                  const isEditing = editingItemId === item.id;
                  const wasAdjusted = item.adjusted_quantity !== item.projected_quantity;

                  return (
                    <tr key={item.id} className={`transition-colors ${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3 text-sm text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{item.raw_material_name}</span>
                          {item.parent_name && (
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                              {item.parent_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{item.unit}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-600">{formatNumber(getDisplayQty(item.projected_quantity))}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={editQtyValue}
                              onChange={(e) => setEditQtyValue(e.target.value)}
                              className="w-28 px-2 py-1.5 text-sm border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 text-right font-medium"
                              step={isRevendaList ? '1' : '0.001'}
                              min="0"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = parseFloat(editQtyValue);
                                  if (!isNaN(val) && val >= 0) handleUpdateItemQty(item.id, val);
                                }
                                if (e.key === 'Escape') setEditingItemId(null);
                              }}
                              onBlur={() => {
                                const val = parseFloat(editQtyValue);
                                if (!isNaN(val) && val >= 0) {
                                  const toSave = isRevendaList ? Math.ceil(val) : val;
                                  if (toSave !== getDisplayQty(item.adjusted_quantity)) handleUpdateItemQty(item.id, val);
                                }
                                setEditingItemId(null);
                              }}
                            />
                          </div>
                        ) : (
                          <span
                            className={`font-semibold cursor-pointer hover:bg-blue-50 px-2 py-1 rounded-lg border border-transparent hover:border-blue-300 transition-all ${wasAdjusted ? 'text-orange-600' : 'text-blue-600'}`}
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditQtyValue(String(getDisplayQty(item.adjusted_quantity)));
                            }}
                            title="Clique para alterar a quantidade"
                          >
                            {formatNumber(getDisplayQty(item.adjusted_quantity))}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedList.purchase_list_items.length} itens
            </span>
            <span className="text-sm font-bold text-gray-900">
              Total: {formatNumber(selectedList.purchase_list_items.reduce((acc, i) => acc + getDisplayQty(i.adjusted_quantity || 0), 0))} kg
            </span>
          </div>
        </div>
      )}

      {/* Modal editar lista */}
      {isEditModalOpen && selectedList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Editar Lista</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={editListName} onChange={(e) => setEditListName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Alvo</label>
                  <input type="date" value={editListDate} onChange={(e) => setEditListDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={editListStatus} onChange={(e) => setEditListStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="rascunho">Rascunho</option>
                    <option value="finalizada">Finalizada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={editListNotes} onChange={(e) => setEditListNotes(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows={2} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-2 justify-end">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100">Cancelar</button>
              <Button onClick={handleEditList} isLoading={savingEdit}>Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}