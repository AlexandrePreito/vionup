'use client';

import { useState, useEffect } from 'react';
import { useGroupFilter } from '@/hooks/useGroupFilter';
import {
  Plus,
  Loader2,
  Search,
  Edit2,
  Trash2,
  Power,
  X,
  FileText,
  Users,
  UserSearch,
  MessageSquare,
  CheckSquare,
  Square,
  ChevronUp,
  ChevronDown,
  GripVertical
} from 'lucide-react';

interface Pesquisa {
  id: string;
  nome: string;
  tipo: 'cliente' | 'cliente_misterioso';
  descricao: string;
  ativo: boolean;
  created_at: string;
  company_group?: {
    id: string;
    name: string;
  };
  nps_pesquisa_perguntas: {
    id: string;
    ordem: number;
    obrigatoria: boolean;
    pergunta: {
      id: string;
      texto: string;
      categoria: string;
    };
  }[];
  nps_links: {
    id: string;
    total_respostas: number;
  }[];
}

interface Pergunta {
  id: string;
  texto: string;
  tipo_resposta: string;
  categoria: string;
}

export default function PesquisasNPSPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showPerguntasModal, setShowPerguntasModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'cliente' as 'cliente' | 'cliente_misterioso',
    descricao: '',
    perguntasSelecionadas: [] as { pergunta_id: string; ordem: number; obrigatoria: boolean }[]
  });
  const [searchPergunta, setSearchPergunta] = useState('');
  const [selectedCategoriaFilter, setSelectedCategoriaFilter] = useState('');
  
  // Drag and Drop states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Carregar pesquisas e perguntas
  useEffect(() => {
    if (selectedGroupId) {
      fetchPesquisas();
      fetchPerguntas();
    } else {
      setPesquisas([]);
      setPerguntas([]);
    }
  }, [selectedGroupId]);

  const fetchPesquisas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/nps/pesquisas?group_id=${selectedGroupId}`);
      if (res.ok) {
        const data = await res.json();
        setPesquisas(data.pesquisas || []);
      }
    } catch (err) {
      console.error('Erro ao buscar pesquisas:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerguntas = async () => {
    try {
      const res = await fetch(`/api/nps/perguntas?group_id=${selectedGroupId}`);
      if (res.ok) {
        const data = await res.json();
        setPerguntas(data.perguntas || []);
      }
    } catch (err) {
      console.error('Erro ao buscar perguntas:', err);
    }
  };

  // Abrir modal para nova pesquisa
  const handleNew = () => {
    setEditingId(null);
    setFormData({
      nome: '',
      tipo: 'cliente',
      descricao: '',
      perguntasSelecionadas: []
    });
    setShowModal(true);
  };

  // Abrir modal para editar
  const handleEdit = (pesquisa: Pesquisa) => {
    setEditingId(pesquisa.id);
    setFormData({
      nome: pesquisa.nome,
      tipo: pesquisa.tipo,
      descricao: pesquisa.descricao || '',
      perguntasSelecionadas: pesquisa.nps_pesquisa_perguntas.map(pp => ({
        pergunta_id: pp.pergunta.id,
        ordem: pp.ordem,
        obrigatoria: pp.obrigatoria
      }))
    });
    setShowModal(true);
  };

  // Salvar pesquisa
  const handleSave = async () => {
    if (!formData.nome.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...(editingId ? { id: editingId } : { company_group_id: selectedGroupId }),
        nome: formData.nome.trim(),
        tipo: formData.tipo,
        descricao: formData.descricao.trim(),
        perguntas: formData.perguntasSelecionadas
      };

      const res = await fetch('/api/nps/pesquisas', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }

      setShowModal(false);
      fetchPesquisas();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle ativo
  const handleToggleAtivo = async (pesquisa: Pesquisa) => {
    try {
      const res = await fetch('/api/nps/pesquisas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pesquisa.id, ativo: !pesquisa.ativo })
      });

      if (res.ok) {
        fetchPesquisas();
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  // Excluir pesquisa
  const handleDelete = async (pesquisa: Pesquisa) => {
    const totalRespostas = pesquisa.nps_links.reduce((sum, l) => sum + (l.total_respostas || 0), 0);
    
    const msg = totalRespostas > 0
      ? `Esta pesquisa tem ${totalRespostas} respostas. Ela será desativada (não excluída). Continuar?`
      : 'Tem certeza que deseja excluir esta pesquisa?';

    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/nps/pesquisas?id=${pesquisa.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchPesquisas();
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  // Toggle pergunta selecionada (no modal de seleção)
  const togglePergunta = (perguntaId: string) => {
    const exists = formData.perguntasSelecionadas.find(p => p.pergunta_id === perguntaId);
    
    if (exists) {
      // Remover e reordenar
      const novasPerguntas = formData.perguntasSelecionadas
        .filter(p => p.pergunta_id !== perguntaId)
        .map((p, index) => ({ ...p, ordem: index + 1 }));
      setFormData({
        ...formData,
        perguntasSelecionadas: novasPerguntas
      });
    } else {
      // Adicionar no final
      setFormData({
        ...formData,
        perguntasSelecionadas: [
          ...formData.perguntasSelecionadas,
          { pergunta_id: perguntaId, ordem: formData.perguntasSelecionadas.length + 1, obrigatoria: true }
        ]
      });
    }
  };

  // Toggle obrigatória
  const toggleObrigatoria = (perguntaId: string) => {
    setFormData({
      ...formData,
      perguntasSelecionadas: formData.perguntasSelecionadas.map(p =>
        p.pergunta_id === perguntaId ? { ...p, obrigatoria: !p.obrigatoria } : p
      )
    });
  };

  // Mover pergunta para cima
  const movePerguntaUp = (index: number) => {
    if (index === 0) return;
    const novasPerguntas = [...formData.perguntasSelecionadas];
    [novasPerguntas[index - 1], novasPerguntas[index]] = [novasPerguntas[index], novasPerguntas[index - 1]];
    // Reordenar
    const reordenadas = novasPerguntas.map((p, i) => ({ ...p, ordem: i + 1 }));
    setFormData({ ...formData, perguntasSelecionadas: reordenadas });
  };

  // Mover pergunta para baixo
  const movePerguntaDown = (index: number) => {
    if (index === formData.perguntasSelecionadas.length - 1) return;
    const novasPerguntas = [...formData.perguntasSelecionadas];
    [novasPerguntas[index], novasPerguntas[index + 1]] = [novasPerguntas[index + 1], novasPerguntas[index]];
    // Reordenar
    const reordenadas = novasPerguntas.map((p, i) => ({ ...p, ordem: i + 1 }));
    setFormData({ ...formData, perguntasSelecionadas: reordenadas });
  };

  // Remover pergunta da lista
  const removePergunta = (perguntaId: string) => {
    const novasPerguntas = formData.perguntasSelecionadas
      .filter(p => p.pergunta_id !== perguntaId)
      .map((p, index) => ({ ...p, ordem: index + 1 }));
    setFormData({ ...formData, perguntasSelecionadas: novasPerguntas });
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const sortedPerguntas = [...formData.perguntasSelecionadas].sort((a, b) => a.ordem - b.ordem);
    const draggedItem = sortedPerguntas[draggedIndex];
    
    // Remover o item da posição original
    sortedPerguntas.splice(draggedIndex, 1);
    
    // Inserir na nova posição
    sortedPerguntas.splice(dropIndex, 0, draggedItem);
    
    // Reordenar com novas ordens
    const reordenadas = sortedPerguntas.map((p, i) => ({ ...p, ordem: i + 1 }));
    setFormData({ ...formData, perguntasSelecionadas: reordenadas });
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Filtrar pesquisas
  const filteredPesquisas = pesquisas.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar perguntas por categoria
  const perguntasPorCategoria = perguntas.reduce((acc, p) => {
    const cat = p.categoria || 'Sem categoria';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, Pergunta[]>);

  // Filtrar perguntas para o modal de seleção
  const perguntasFiltradas = perguntas.filter(p => {
    const matchSearch = p.texto.toLowerCase().includes(searchPergunta.toLowerCase());
    const matchCategoria = !selectedCategoriaFilter || p.categoria === selectedCategoriaFilter;
    return matchSearch && matchCategoria;
  });

  const categoriasDisponiveis = [...new Set(perguntas.map(p => p.categoria).filter(Boolean))].sort();

  // Obter detalhes da pergunta pelo ID
  const getPerguntaById = (id: string) => perguntas.find(p => p.id === id);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pesquisas NPS</h1>
          <p className="text-gray-500">Gerencie suas pesquisas de satisfação</p>
        </div>
        <button
          onClick={handleNew}
          disabled={!selectedGroupId}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Nova Pesquisa
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4">
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
              value={selectedGroupId || ''}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {(groups || []).map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Buscar */}
        <div className="flex-1 max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">Carregando dados...</p>
        </div>
      )}

      {/* Sem grupo selecionado */}
      {!loading && !selectedGroupId && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <FileText size={48} className="mx-auto text-blue-500 mb-4" />
          <p className="text-blue-800 font-medium">Selecione um grupo para visualizar as pesquisas</p>
        </div>
      )}

      {/* Tabela */}
      {!loading && selectedGroupId && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nome</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Grupo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tipo</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Perguntas</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Respostas</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPesquisas.length > 0 ? (
                filteredPesquisas.map((pesquisa) => {
                  const totalRespostas = pesquisa.nps_links.reduce((sum, l) => sum + (l.total_respostas || 0), 0);
                  return (
                    <tr key={pesquisa.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            pesquisa.tipo === 'cliente' ? 'bg-blue-100' : 'bg-purple-100'
                          }`}>
                            {pesquisa.tipo === 'cliente' 
                              ? <Users size={20} className="text-blue-600" />
                              : <UserSearch size={20} className="text-purple-600" />
                            }
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{pesquisa.nome}</p>
                            {pesquisa.descricao && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">{pesquisa.descricao}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {pesquisa.company_group?.name || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          pesquisa.tipo === 'cliente'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {pesquisa.tipo === 'cliente' ? 'Cliente' : 'Cliente Misterioso'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <MessageSquare size={16} />
                          {pesquisa.nps_pesquisa_perguntas.length}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <FileText size={16} />
                          {totalRespostas}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          pesquisa.ativo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {pesquisa.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(pesquisa)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleAtivo(pesquisa)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title={pesquisa.ativo ? 'Desativar' : 'Ativar'}
                          >
                            <Power size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(pesquisa)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'Nenhuma pesquisa encontrada' : 'Nenhuma pesquisa cadastrada'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}


      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Editar Pesquisa' : 'Nova Pesquisa'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome da Pesquisa *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Pesquisa de Satisfação 2025"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo *</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'cliente' })}
                    className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                      formData.tipo === 'cliente'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Users size={24} className={formData.tipo === 'cliente' ? 'text-blue-600' : 'text-gray-400'} />
                    <div className="text-left">
                      <p className="font-medium">Cliente</p>
                      <p className="text-xs text-gray-500">QR Code por garçom</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'cliente_misterioso' })}
                    className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                      formData.tipo === 'cliente_misterioso'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <UserSearch size={24} className={formData.tipo === 'cliente_misterioso' ? 'text-purple-600' : 'text-gray-400'} />
                    <div className="text-left">
                      <p className="font-medium">Cliente Misterioso</p>
                      <p className="text-xs text-gray-500">QR Code por unidade</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Perguntas Selecionadas */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Perguntas ({formData.perguntasSelecionadas.length} selecionadas)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPerguntasModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {formData.perguntasSelecionadas.length === 0 ? 'Selecionar Perguntas' : 'Gerenciar Perguntas'}
                  </button>
                </div>
                
                {formData.perguntasSelecionadas.length > 0 ? (
                  <div className="border border-gray-300 rounded-lg divide-y divide-gray-200">
                    {formData.perguntasSelecionadas
                      .sort((a, b) => a.ordem - b.ordem)
                      .map((item, index) => {
                        const pergunta = getPerguntaById(item.pergunta_id);
                        if (!pergunta) return null;
                        
                        const isDragging = draggedIndex === index;
                        const isDragOver = dragOverIndex === index;
                        
                        return (
                          <div
                            key={item.pergunta_id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`px-4 py-3 flex items-center gap-3 transition-all ${
                              isDragging 
                                ? 'opacity-50 bg-blue-50 cursor-grabbing' 
                                : isDragOver 
                                  ? 'bg-blue-100 border-t-2 border-blue-500' 
                                  : 'hover:bg-gray-50 cursor-move'
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <GripVertical 
                                size={18} 
                                className="text-gray-400 cursor-grab active:cursor-grabbing" 
                              />
                              <button
                                type="button"
                                onClick={() => movePerguntaUp(index)}
                                disabled={index === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Mover para cima"
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => movePerguntaDown(index)}
                                disabled={index === formData.perguntasSelecionadas.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Mover para baixo"
                              >
                                <ChevronDown size={16} />
                              </button>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500 w-6">{item.ordem}.</span>
                                <span className="text-sm text-gray-700">{pergunta.texto}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  item.obrigatoria
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {item.obrigatoria ? 'Obrigatória' : 'Opcional'}
                                </span>
                              </div>
                              {pergunta.categoria && (
                                <p className="text-xs text-gray-500 mt-1 ml-8">{pergunta.categoria}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removePergunta(item.pergunta_id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Remover"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg p-6 text-center">
                    <MessageSquare size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500 mb-3">Nenhuma pergunta selecionada</p>
                    <button
                      type="button"
                      onClick={() => setShowPerguntasModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Selecionar Perguntas
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.nome.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                {editingId ? 'Salvar Alterações' : 'Criar Pesquisa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Perguntas */}
      {showPerguntasModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Selecionar Perguntas</h2>
              <button
                onClick={() => setShowPerguntasModal(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filtros */}
            <div className="px-6 py-4 border-b border-gray-200 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchPergunta}
                    onChange={(e) => setSearchPergunta(e.target.value)}
                    placeholder="Buscar pergunta..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="w-48">
                  <select
                    value={selectedCategoriaFilter}
                    onChange={(e) => setSelectedCategoriaFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todas as categorias</option>
                    {categoriasDisponiveis.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Lista de Perguntas */}
            <div className="flex-1 overflow-y-auto p-6">
              {perguntasFiltradas.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(
                    perguntasFiltradas.reduce((acc, p) => {
                      const cat = p.categoria || 'Sem categoria';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(p);
                      return acc;
                    }, {} as Record<string, Pergunta[]>)
                  ).map(([categoria, pergs]) => (
                    <div key={categoria} className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-700">{categoria}</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {pergs.map((pergunta) => {
                          const selecionada = formData.perguntasSelecionadas.find(p => p.pergunta_id === pergunta.id);
                          return (
                            <div
                              key={pergunta.id}
                              className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                            >
                              <button
                                type="button"
                                onClick={() => togglePergunta(pergunta.id)}
                                className="flex-shrink-0"
                              >
                                {selecionada
                                  ? <CheckSquare size={20} className="text-blue-600" />
                                  : <Square size={20} className="text-gray-400" />
                                }
                              </button>
                              <div className="flex-1">
                                <span className="text-sm text-gray-700">{pergunta.texto}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    pergunta.tipo_resposta === 'estrelas'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {pergunta.tipo_resposta === 'estrelas' ? 'Estrelas' : 'Texto'}
                                  </span>
                                </div>
                              </div>
                              {selecionada && (
                                <button
                                  type="button"
                                  onClick={() => toggleObrigatoria(pergunta.id)}
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    selecionada.obrigatoria
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {selecionada.obrigatoria ? 'Obrigatória' : 'Opcional'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {searchPergunta || selectedCategoriaFilter
                    ? 'Nenhuma pergunta encontrada com os filtros aplicados'
                    : 'Nenhuma pergunta cadastrada. Crie perguntas primeiro.'}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {formData.perguntasSelecionadas.length} pergunta(s) selecionada(s)
              </span>
              <button
                onClick={() => setShowPerguntasModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
