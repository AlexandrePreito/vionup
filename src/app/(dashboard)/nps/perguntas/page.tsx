'use client';

import { useState, useEffect } from 'react';
import { useGroupFilter } from '@/hooks/useGroupFilter';
import {
  Plus,
  Loader2,
  Search,
  Edit2,
  Trash2,
  X,
  MessageSquare,
  Star,
  FileText,
  Tag,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface Pergunta {
  id: string;
  texto: string;
  tipo_resposta: 'estrelas' | 'texto';
  categoria: string;
  ativo: boolean;
  created_at: string;
  requer_confirmacao_uso?: boolean;
  texto_confirmacao_uso?: string;
}

const CATEGORIAS_SUGERIDAS = [
  'Comida',
  'Atendimento',
  'Ambiente',
  'Tempo de Espera',
  'Limpeza',
  'Preço',
  'Bebidas',
  'Recepção',
  'Delivery',
  'Brinquedoteca',
  'Geral'
];

export default function PerguntasNPSPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    texto: '',
    categoria: '',
    tipo_resposta: 'estrelas' as 'estrelas' | 'texto',
    requer_confirmacao_uso: false,
    texto_confirmacao_uso: ''
  });
  const [showCategoriaDropdown, setShowCategoriaDropdown] = useState(false);

  // Carregar perguntas
  useEffect(() => {
    if (selectedGroupId) {
      fetchPerguntas();
    } else {
      setPerguntas([]);
      setCategorias([]);
    }
  }, [selectedGroupId]);

  const fetchPerguntas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/nps/perguntas?group_id=${selectedGroupId}`);
      if (res.ok) {
        const data = await res.json();
        setPerguntas(data.perguntas || []);
        setCategorias(data.categorias || []);
        // Expandir todas as categorias por padrão
        setExpandedCategories(new Set(data.categorias || []));
      }
    } catch (err) {
      console.error('Erro ao buscar perguntas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para nova pergunta
  const handleNew = () => {
    setEditingId(null);
    setFormData({
      texto: '',
      categoria: '',
      tipo_resposta: 'estrelas',
      requer_confirmacao_uso: false,
      texto_confirmacao_uso: ''
    });
    setShowModal(true);
  };

  // Abrir modal para editar
  const handleEdit = (pergunta: Pergunta) => {
    setEditingId(pergunta.id);
    setFormData({
      texto: pergunta.texto,
      categoria: pergunta.categoria || '',
      tipo_resposta: pergunta.tipo_resposta,
      requer_confirmacao_uso: pergunta.requer_confirmacao_uso || false,
      texto_confirmacao_uso: pergunta.texto_confirmacao_uso || ''
    });
    setShowModal(true);
  };

  // Salvar pergunta
  const handleSave = async () => {
    if (!formData.texto.trim()) {
      alert('Texto da pergunta é obrigatório');
      return;
    }

    if (!formData.categoria.trim()) {
      alert('Categoria é obrigatória');
      return;
    }

    if (formData.requer_confirmacao_uso && !formData.texto_confirmacao_uso.trim()) {
      alert('Texto da confirmação de uso é obrigatório quando a opção está marcada');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...(editingId ? { id: editingId } : { company_group_id: selectedGroupId }),
        texto: formData.texto.trim(),
        categoria: formData.categoria.trim(),
        tipo_resposta: formData.tipo_resposta,
        requer_confirmacao_uso: formData.requer_confirmacao_uso,
        texto_confirmacao_uso: formData.requer_confirmacao_uso ? formData.texto_confirmacao_uso.trim() : null
      };

      const res = await fetch('/api/nps/perguntas', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }

      setShowModal(false);
      fetchPerguntas();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Excluir pergunta
  const handleDelete = async (pergunta: Pergunta) => {
    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) return;

    try {
      const res = await fetch(`/api/nps/perguntas?id=${pergunta.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      
      if (data.softDelete) {
        alert('Pergunta desativada pois está vinculada a pesquisas.');
      }

      fetchPerguntas();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  // Toggle categoria expandida
  const toggleCategoria = (cat: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(cat)) {
      newExpanded.delete(cat);
    } else {
      newExpanded.add(cat);
    }
    setExpandedCategories(newExpanded);
  };

  // Filtrar perguntas
  const filteredPerguntas = perguntas.filter(p => {
    const matchSearch = p.texto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = !selectedCategoria || p.categoria === selectedCategoria;
    return matchSearch && matchCategoria;
  });

  // Agrupar por categoria
  const perguntasPorCategoria = filteredPerguntas.reduce((acc, p) => {
    const cat = p.categoria || 'Sem categoria';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, Pergunta[]>);

  // Categorias para dropdown (combina existentes + sugeridas)
  const todasCategorias = [...new Set([...categorias, ...CATEGORIAS_SUGERIDAS])].sort();
  const categoriasFiltradas = todasCategorias.filter(c => 
    c.toLowerCase().includes(formData.categoria.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banco de Perguntas</h1>
          <p className="text-gray-500">Gerencie perguntas reutilizáveis para suas pesquisas</p>
        </div>
        <button
          onClick={handleNew}
          disabled={!selectedGroupId}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Nova Pergunta
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

        {/* Categoria */}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={!selectedGroupId}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
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
              placeholder="Buscar pergunta..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      {selectedGroupId && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <MessageSquare size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{perguntas.length}</p>
                <p className="text-sm text-gray-500">Total de Perguntas</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Tag size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{categorias.length}</p>
                <p className="text-sm text-gray-500">Categorias</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Star size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {perguntas.filter(p => p.tipo_resposta === 'estrelas').length}
                </p>
                <p className="text-sm text-gray-500">Tipo Estrelas</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <FileText size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {perguntas.filter(p => p.tipo_resposta === 'texto').length}
                </p>
                <p className="text-sm text-gray-500">Tipo Texto</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">Carregando dados...</p>
        </div>
      )}

      {/* Sem grupo selecionado */}
      {!loading && !selectedGroupId && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <MessageSquare size={48} className="mx-auto text-blue-500 mb-4" />
          <p className="text-blue-800 font-medium">Selecione um grupo para visualizar as perguntas</p>
        </div>
      )}

      {/* Lista de Perguntas por Categoria */}
      {!loading && selectedGroupId && (
        <div className="space-y-4">
          {Object.keys(perguntasPorCategoria).length > 0 ? (
            Object.entries(perguntasPorCategoria).map(([categoria, pergs]) => (
              <div key={categoria} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header da Categoria */}
                <button
                  onClick={() => toggleCategoria(categoria)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Tag size={16} className="text-purple-600" />
                    </div>
                    <span className="font-semibold text-gray-900">{categoria}</span>
                    <span className="text-sm text-gray-500">({pergs.length})</span>
                  </div>
                  {expandedCategories.has(categoria) 
                    ? <ChevronDown size={20} className="text-gray-400" />
                    : <ChevronRight size={20} className="text-gray-400" />
                  }
                </button>

                {/* Lista de Perguntas */}
                {expandedCategories.has(categoria) && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {pergs.map((pergunta) => (
                      <div
                        key={pergunta.id}
                        className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            pergunta.tipo_resposta === 'estrelas' ? 'bg-yellow-100' : 'bg-blue-100'
                          }`}>
                            {pergunta.tipo_resposta === 'estrelas' 
                              ? <Star size={20} className="text-yellow-600" />
                              : <FileText size={20} className="text-blue-600" />
                            }
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-900">{pergunta.texto}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Tipo: {pergunta.tipo_resposta === 'estrelas' ? 'Estrelas (1-5)' : 'Texto livre'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(pergunta)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(pergunta)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
              <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || selectedCategoria ? 'Nenhuma pergunta encontrada' : 'Nenhuma pergunta cadastrada'}
              </h3>
              <p className="text-gray-500">
                {searchTerm || selectedCategoria ? 'Tente ajustar os filtros' : 'Clique em "Nova Pergunta" para começar'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Editar Pergunta' : 'Nova Pergunta'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Texto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Texto da Pergunta *</label>
                <textarea
                  value={formData.texto}
                  onChange={(e) => setFormData({ ...formData, texto: e.target.value })}
                  placeholder="Ex: Como você avalia a qualidade da comida?"
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  autoFocus
                />
              </div>

              {/* Categoria */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.categoria}
                  onChange={(e) => {
                    setFormData({ ...formData, categoria: e.target.value });
                    setShowCategoriaDropdown(true);
                  }}
                  onFocus={() => setShowCategoriaDropdown(true)}
                  placeholder="Digite ou selecione uma categoria..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                
                {/* Dropdown de categorias */}
                {showCategoriaDropdown && categoriasFiltradas.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {categoriasFiltradas.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, categoria: cat });
                          setShowCategoriaDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tipo de Resposta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Resposta</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_resposta: 'estrelas' })}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.tipo_resposta === 'estrelas'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Star size={28} className={formData.tipo_resposta === 'estrelas' ? 'text-yellow-500' : 'text-gray-400'} />
                    <div className="text-center">
                      <p className="font-medium text-sm">Estrelas</p>
                      <p className="text-xs text-gray-500">Nota de 1 a 5</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_resposta: 'texto' })}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.tipo_resposta === 'texto'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <FileText size={28} className={formData.tipo_resposta === 'texto' ? 'text-blue-500' : 'text-gray-400'} />
                    <div className="text-center">
                      <p className="font-medium text-sm">Texto</p>
                      <p className="text-xs text-gray-500">Resposta livre</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Requer Confirmação de Uso */}
              <div>
                <label className="flex items-center gap-2 mb-1.5">
                  <input
                    type="checkbox"
                    checked={formData.requer_confirmacao_uso}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      requer_confirmacao_uso: e.target.checked,
                      texto_confirmacao_uso: e.target.checked ? formData.texto_confirmacao_uso : ''
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Requer confirmação de uso do serviço/produto
                  </span>
                </label>
                {formData.requer_confirmacao_uso && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Pergunta de confirmação <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.texto_confirmacao_uso}
                      onChange={(e) => setFormData({ ...formData, texto_confirmacao_uso: e.target.value })}
                      placeholder="Ex: Você utilizou a brinquedoteca?"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Se o cliente responder "Não", esta pergunta será pulada automaticamente
                    </p>
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
                disabled={saving || !formData.texto.trim() || !formData.categoria.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                {editingId ? 'Salvar Alterações' : 'Criar Pergunta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showCategoriaDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowCategoriaDropdown(false)}
        />
      )}
    </div>
  );
}
