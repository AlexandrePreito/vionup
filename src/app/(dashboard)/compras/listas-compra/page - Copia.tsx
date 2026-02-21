'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ClipboardList, Plus, Trash2, Pencil, Search, Loader2, 
  Calendar, Package, Download, X, Save, ChevronRight
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

  // Detail view
  const [selectedList, setSelectedList] = useState<PurchaseListDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQtyValue, setEditQtyValue] = useState('');
  const [editNoteValue, setEditNoteValue] = useState('');

  // Edit list modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editListName, setEditListName] = useState('');
  const [editListDate, setEditListDate] = useState('');
  const [editListNotes, setEditListNotes] = useState('');
  const [editListStatus, setEditListStatus] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchLists = async () => {
    if (!selectedGroupId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-lists?group_id=${selectedGroupId}`);
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
      fetchLists();
      setSelectedList(null);
    } else {
      setLists([]);
    }
  }, [selectedGroupId]);

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

  const handleUpdateItem = async (itemId: string, adjustedQty: number, notes?: string) => {
    if (!selectedList) return;
    try {
      const res = await fetch(`/api/purchase-lists/${selectedList.id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, adjusted_quantity: adjustedQty, notes })
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
        body: JSON.stringify({
          name: editListName,
          target_date: editListDate,
          status: editListStatus,
          notes: editListNotes
        })
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

  const exportListCSV = () => {
    if (!selectedList) return;
    const headers = ['Matéria-Prima', 'Grupo', 'Unidade', 'Qtd. Projetada', 'Qtd. Ajustada', 'Estoque Atual', 'Est. Mín.', 'Observação'];
    const rows = selectedList.purchase_list_items.map(item => [
      item.raw_material_name,
      item.parent_name || '',
      item.unit,
      item.projected_quantity,
      item.adjusted_quantity,
      item.current_stock,
      item.min_stock,
      item.notes || ''
    ]);

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lista-compra-${selectedList.name.replace(/\s/g, '-')}-${selectedList.target_date}.csv`;
    link.click();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'finalizada':
        return 'bg-green-100 text-green-700';
      case 'cancelada':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const filteredLists = lists.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!selectedGroupId && groups.length > 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Listas de Compra</h1>
            <p className="text-gray-500 text-sm">Gerencie suas listas de compra de matérias-primas</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
          <ClipboardList size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium">Selecione um grupo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listas de Compra</h1>
          <p className="text-gray-500 text-sm">Gerencie suas listas de compra de matérias-primas</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/compras/projecao-mp')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Plus size={18} />
            Nova Lista (via Projeção)
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="w-48">
          {isGroupReadOnly ? (
            <input type="text" value={groupName} disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed" />
          ) : (
            <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione o grupo</option>
              {groups.map((group: any) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex-1 max-w-md relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar lista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Lista de listas - Coluna esquerda */}
          <div className="col-span-4 space-y-3">
            {filteredLists.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Nenhuma lista</p>
                <p className="text-gray-400 text-sm mt-1">Crie uma lista na tela de Projeção</p>
              </div>
            ) : (
              filteredLists.map((list) => {
                const itemCount = list.purchase_list_items?.[0]?.count ?? (Array.isArray(list.purchase_list_items) ? list.purchase_list_items.length : 0);
                const isSelected = selectedList?.id === list.id;

                return (
                  <div
                    key={list.id}
                    onClick={() => fetchListDetail(list.id)}
                    className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{list.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar size={12} />
                            {formatDate(list.target_date)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Package size={12} />
                            {itemCount} itens
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(list.status)}`}>
                          {list.status}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {list.notes && (
                      <p className="text-xs text-gray-400 mt-2 truncate">{list.notes}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Detalhe da lista - Coluna direita */}
          <div className="col-span-8">
            {!selectedList ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <ChevronRight size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Selecione uma lista</p>
                <p className="text-gray-400 text-sm mt-1">Clique em uma lista para ver os itens</p>
              </div>
            ) : loadingDetail ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 flex justify-center">
                <Loader2 size={32} className="animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header da lista */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{selectedList.name}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar size={14} />
                          {formatDate(selectedList.target_date)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(selectedList.status)}`}>
                          {selectedList.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          {selectedList.purchase_list_items.length} itens
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={openEditModal} className="p-2 hover:bg-white/80 rounded-lg transition-colors" title="Editar lista">
                        <Pencil size={18} className="text-gray-500" />
                      </button>
                      <button onClick={exportListCSV} className="p-2 hover:bg-white/80 rounded-lg transition-colors" title="Exportar CSV">
                        <Download size={18} className="text-gray-500" />
                      </button>
                    </div>
                  </div>
                  {selectedList.notes && (
                    <p className="text-sm text-gray-500 mt-2">{selectedList.notes}</p>
                  )}
                </div>

                {/* Tabela de itens */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Matéria-Prima</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Projetado</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Qtd. Compra</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Estoque</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Est. Mín.</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Obs.</th>
                        <th className="w-[60px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedList.purchase_list_items.map((item) => {
                        const isEditing = editingItemId === item.id;
                        const diff = item.adjusted_quantity - item.projected_quantity;

                        return (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{item.raw_material_name}</p>
                              <div className="flex items-center gap-2">
                                {item.parent_name && (
                                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">{item.parent_name}</span>
                                )}
                                <span className="text-xs text-gray-500">{item.unit}</span>
                                {item.loss_factor > 0 && (
                                  <span className="text-xs text-orange-500">Perda: {item.loss_factor}%</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm text-gray-500">{formatNumber(item.projected_quantity)}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    value={editQtyValue}
                                    onChange={(e) => setEditQtyValue(e.target.value)}
                                    className="w-24 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-right"
                                    step="0.001"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const val = parseFloat(editQtyValue);
                                        if (val >= 0) handleUpdateItem(item.id, val, editNoteValue);
                                      }
                                      if (e.key === 'Escape') setEditingItemId(null);
                                    }}
                                  />
                                </div>
                              ) : (
                                <span
                                  className="font-semibold text-blue-600 cursor-pointer hover:underline"
                                  onClick={() => {
                                    setEditingItemId(item.id);
                                    setEditQtyValue(String(item.adjusted_quantity));
                                    setEditNoteValue(item.notes || '');
                                  }}
                                  title="Clique para editar"
                                >
                                  {formatNumber(item.adjusted_quantity)}
                                  {diff !== 0 && (
                                    <span className={`text-xs ml-1 ${diff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      ({diff > 0 ? '+' : ''}{formatNumber(diff)})
                                    </span>
                                  )}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm text-gray-600">{formatNumber(item.current_stock)}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm text-gray-500">{formatNumber(item.min_stock)}</span>
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editNoteValue}
                                    onChange={(e) => setEditNoteValue(e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg"
                                    placeholder="Observação..."
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const val = parseFloat(editQtyValue);
                                        if (val >= 0) handleUpdateItem(item.id, val, editNoteValue);
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      const val = parseFloat(editQtyValue);
                                      if (val >= 0) handleUpdateItem(item.id, val, editNoteValue);
                                    }}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  >
                                    <Save size={16} />
                                  </button>
                                  <button onClick={() => setEditingItemId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                item.notes && <span className="text-xs text-gray-400 truncate block max-w-[120px]" title={item.notes}>{item.notes}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remover item"
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

                {/* Footer com total */}
                <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">
                      Total: {selectedList.purchase_list_items.length} itens
                    </span>
                    <span className="text-sm font-bold text-blue-700">
                      Soma ajustada: {formatNumber(selectedList.purchase_list_items.reduce((acc, i) => acc + (i.adjusted_quantity || 0), 0))} kg
                    </span>
                  </div>
                </div>
              </div>
            )}
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
