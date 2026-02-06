'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Loader2,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  ChevronUp,
  ChevronDown,
  Settings,
  Smile
} from 'lucide-react';

interface OpcaoOrigem {
  id: string;
  texto: string;
  icone: string;
  ordem: number;
  ativo: boolean;
}

const EMOJIS_SUGERIDOS = [
  { emoji: '📱', label: 'Celular' },
  { emoji: '📸', label: 'Instagram' },
  { emoji: '🎵', label: 'TikTok' },
  { emoji: '👍', label: 'Facebook' },
  { emoji: '🔍', label: 'Google' },
  { emoji: '🗣️', label: 'Indicação' },
  { emoji: '🍔', label: 'iFood/Delivery' },
  { emoji: '📺', label: 'TV' },
  { emoji: '📻', label: 'Rádio' },
  { emoji: '📰', label: 'Jornal' },
  { emoji: '🚗', label: 'Passando' },
  { emoji: '🏠', label: 'Vizinho' },
  { emoji: '💼', label: 'Trabalho' },
  { emoji: '🎉', label: 'Evento' },
  { emoji: '🎁', label: 'Promoção' },
  { emoji: '⭐', label: 'Avaliação' },
  { emoji: '💬', label: 'WhatsApp' },
  { emoji: '🐦', label: 'Twitter/X' },
  { emoji: '▶️', label: 'YouTube' },
  { emoji: '📍', label: 'Maps' },
  { emoji: '🏪', label: 'Fachada' },
  { emoji: '📧', label: 'E-mail' },
  { emoji: '🎯', label: 'Anúncio' },
  { emoji: '❓', label: 'Outro' }
];

export default function ConfiguracoesNPSPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [opcoes, setOpcoes] = useState<OpcaoOrigem[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    texto: '',
    icone: '📌'
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Carregar grupos
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/groups');
        if (res.ok) {
          const data = await res.json();
          setGroups(data.groups || data || []);
        }
      } catch (err) {
        console.error('Erro ao buscar grupos:', err);
      }
    };
    fetchGroups();
  }, []);

  // Carregar opções
  useEffect(() => {
    if (selectedGroupId) {
      fetchOpcoes();
    } else {
      setOpcoes([]);
    }
  }, [selectedGroupId]);

  const fetchOpcoes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/nps/opcoes-origem?group_id=${selectedGroupId}&apenas_ativos=false`);
      if (res.ok) {
        const data = await res.json();
        setOpcoes(data.opcoes || []);
      }
    } catch (err) {
      console.error('Erro ao buscar opções:', err);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para nova opção
  const handleNew = () => {
    setEditingId(null);
    setFormData({
      texto: '',
      icone: '📌'
    });
    setShowModal(true);
  };

  // Abrir modal para editar
  const handleEdit = (opcao: OpcaoOrigem) => {
    setEditingId(opcao.id);
    setFormData({
      texto: opcao.texto,
      icone: opcao.icone
    });
    setShowModal(true);
  };

  // Salvar opção
  const handleSave = async () => {
    if (!formData.texto.trim()) {
      alert('Texto é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const payload = editingId
        ? { id: editingId, texto: formData.texto.trim(), icone: formData.icone }
        : { company_group_id: selectedGroupId, texto: formData.texto.trim(), icone: formData.icone };

      const res = await fetch('/api/nps/opcoes-origem', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }

      setShowModal(false);
      fetchOpcoes();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle ativo
  const handleToggleAtivo = async (opcao: OpcaoOrigem) => {
    try {
      const res = await fetch('/api/nps/opcoes-origem', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: opcao.id, ativo: !opcao.ativo })
      });

      if (res.ok) {
        fetchOpcoes();
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  // Excluir opção
  const handleDelete = async (opcao: OpcaoOrigem) => {
    if (!confirm('Tem certeza que deseja excluir esta opção?')) return;

    try {
      const res = await fetch(`/api/nps/opcoes-origem?id=${opcao.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      
      if (data.softDelete) {
        alert('Opção desativada pois está em uso em respostas.');
      }

      fetchOpcoes();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  // Mover opção (reordenar)
  const handleMove = async (opcao: OpcaoOrigem, direction: 'up' | 'down') => {
    const currentIndex = opcoes.findIndex(o => o.id === opcao.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= opcoes.length) return;

    const otherOpcao = opcoes[newIndex];

    try {
      // Trocar ordens
      await fetch('/api/nps/opcoes-origem', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: opcao.id, ordem: otherOpcao.ordem })
      });

      await fetch('/api/nps/opcoes-origem', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: otherOpcao.id, ordem: opcao.ordem })
      });

      fetchOpcoes();
    } catch (err) {
      console.error('Erro ao reordenar:', err);
    }
  };

  // Selecionar emoji
  const selectEmoji = (emoji: string) => {
    setFormData({ ...formData, icone: emoji });
    setShowEmojiPicker(false);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações NPS</h1>
          <p className="text-gray-500 mt-1">Gerencie as opções de "Como Conheceu"</p>
        </div>
        <button
          onClick={handleNew}
          disabled={!selectedGroupId}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
          Nova Opção
        </button>
      </div>

      {/* Filtro */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Grupo</label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione...</option>
            {groups.map((g: any) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Explicação */}
      {selectedGroupId && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Settings size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium">Opções de "Como Conheceu"</p>
              <p className="text-sm text-blue-700 mt-1">
                Estas opções aparecem no formulário de resposta NPS. O cliente escolhe como conheceu seu estabelecimento.
                Você pode personalizar com emojis e reordenar conforme preferir.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 size={40} className="animate-spin text-blue-600" />
        </div>
      )}

      {/* Lista de Opções */}
      {!loading && selectedGroupId && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {opcoes.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {opcoes.map((opcao, index) => (
                <div
                  key={opcao.id}
                  className={`px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${
                    !opcao.ativo ? 'opacity-50' : ''
                  }`}
                >
                  {/* Ordem */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMove(opcao, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      onClick={() => handleMove(opcao, 'down')}
                      disabled={index === opcoes.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown size={18} />
                    </button>
                  </div>

                  {/* Emoji e Texto */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-3xl">
                      {opcao.icone}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{opcao.texto}</p>
                      <p className="text-xs text-gray-500">Ordem: {opcao.ordem}</p>
                    </div>
                  </div>

                  {/* Status */}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    opcao.ativo
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {opcao.ativo ? 'Ativo' : 'Inativo'}
                  </span>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(opcao)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleToggleAtivo(opcao)}
                      className={`p-2 rounded-lg transition-colors ${
                        opcao.ativo
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={opcao.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {opcao.ativo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button
                      onClick={() => handleDelete(opcao)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 text-center">
              <Smile size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma opção cadastrada</h3>
              <p className="text-gray-500 mb-6">
                Adicione opções como: Instagram, TikTok, Indicação de amigo, etc.
              </p>
              <button
                onClick={handleNew}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
              >
                <Plus size={20} />
                Criar Primeira Opção
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sem grupo selecionado */}
      {!loading && !selectedGroupId && (
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
          <Settings size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Selecione um grupo</h3>
          <p className="text-gray-500">Escolha um grupo para configurar as opções</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Editar Opção' : 'Nova Opção'}
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
              {/* Emoji */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Emoji</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-3xl">{formData.icone}</span>
                    <span className="text-gray-500 flex-1 text-left">Clique para alterar</span>
                    <Smile size={20} className="text-gray-400" />
                  </button>

                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
                      <p className="text-xs text-gray-500 mb-3">Sugestões:</p>
                      <div className="grid grid-cols-6 gap-2">
                        {EMOJIS_SUGERIDOS.map(({ emoji, label }) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => selectEmoji(emoji)}
                            className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-gray-100 rounded-lg transition-colors"
                            title={label}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <label className="block text-xs text-gray-500 mb-1">Ou digite um emoji:</label>
                        <input
                          type="text"
                          value={formData.icone}
                          onChange={(e) => setFormData({ ...formData, icone: e.target.value.slice(-2) })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-center text-2xl"
                          maxLength={2}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Texto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Texto *</label>
                <input
                  type="text"
                  value={formData.texto}
                  onChange={(e) => setFormData({ ...formData, texto: e.target.value })}
                  placeholder="Ex: Instagram"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Preview</label>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-2xl">{formData.icone}</span>
                    <span className="font-medium text-gray-700">{formData.texto || 'Digite o texto...'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.texto.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                {editingId ? 'Salvar Alterações' : 'Criar Opção'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close emoji picker */}
      {showEmojiPicker && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  );
}
