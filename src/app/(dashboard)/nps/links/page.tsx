'use client';

import { useState, useEffect } from 'react';
import { useGroupFilter } from '@/hooks/useGroupFilter';
import {
  Plus,
  Loader2,
  Search,
  Copy,
  Check,
  Trash2,
  Power,
  X,
  QrCode,
  Link as LinkIcon,
  Building2,
  User,
  Eye,
  MessageSquare,
  ExternalLink,
  Download
} from 'lucide-react';

interface NPSLink {
  id: string;
  hash_link: string;
  tipo: 'unidade' | 'garcom';
  ativo: boolean;
  total_acessos: number;
  total_respostas: number;
  created_at: string;
  company: { id: string; name: string } | null;
  employee: { id: string; name: string } | null;
}

interface Pesquisa {
  id: string;
  nome: string;
  tipo: string;
  ativo?: boolean;
}

interface Company {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  company_id: string;
}

export default function LinksNPSPage() {
  const { groups, selectedGroupId, setSelectedGroupId, isGroupReadOnly, groupName } = useGroupFilter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  const [selectedPesquisaId, setSelectedPesquisaId] = useState('');
  const [links, setLinks] = useState<NPSLink[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [formData, setFormData] = useState({
    pesquisa_id: '',
    tipo: 'unidade' as 'unidade' | 'garcom',
    selectedCompanies: [] as string[],
    selectedEmployees: [] as string[]
  });

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Carregar pesquisas e empresas do grupo
  useEffect(() => {
    if (selectedGroupId) {
      fetchPesquisas();
      fetchCompanies();
    } else {
      setPesquisas([]);
      setCompanies([]);
      setEmployees([]);
      setSelectedPesquisaId('');
      setSelectedCompanyId('');
      setSelectedEmployeeId('');
    }
  }, [selectedGroupId]);

  // Carregar funcionários quando empresa for selecionada
  useEffect(() => {
    if (selectedCompanyId) {
      fetchEmployeesByCompany();
    } else {
      setEmployees([]);
      setSelectedEmployeeId('');
    }
  }, [selectedCompanyId]);

  // Carregar links da pesquisa
  useEffect(() => {
    if (selectedPesquisaId) {
      fetchLinks();
    } else {
      setLinks([]);
    }
  }, [selectedPesquisaId]);

  // Carregar funcionários das empresas
  useEffect(() => {
    if (formData.selectedCompanies.length > 0 && formData.tipo === 'garcom') {
      fetchEmployees();
    } else {
      setEmployees([]);
    }
  }, [formData.selectedCompanies, formData.tipo]);

  const fetchPesquisas = async () => {
    try {
      const res = await fetch(`/api/nps/pesquisas?group_id=${selectedGroupId}`);
      if (res.ok) {
        const data = await res.json();
        setPesquisas(data.pesquisas || []);
      }
    } catch (err) {
      console.error('Erro ao buscar pesquisas:', err);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`/api/companies?group_id=${selectedGroupId}`);
      if (res.ok) {
        const data = await res.json();
        const companiesList = data.companies || data || [];
        // Filtro de segurança: garantir que apenas empresas do grupo selecionado sejam exibidas
        const filteredCompanies = companiesList.filter((c: any) => c.company_group_id === selectedGroupId);
        setCompanies(filteredCompanies);
      }
    } catch (err) {
      console.error('Erro ao buscar empresas:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      // Buscar funcionários de todas as empresas selecionadas
      const allEmployees: Employee[] = [];
      for (const companyId of formData.selectedCompanies) {
        const res = await fetch(`/api/employees?company_id=${companyId}`);
        if (res.ok) {
          const data = await res.json();
          allEmployees.push(...(data.employees || data || []));
        }
      }
      setEmployees(allEmployees);
    } catch (err) {
      console.error('Erro ao buscar funcionários:', err);
    }
  };

  const fetchEmployeesByCompany = async () => {
    try {
      const res = await fetch(`/api/employees?company_id=${selectedCompanyId}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar funcionários:', err);
    }
  };

  const fetchLinks = async () => {
    if (!selectedPesquisaId) {
      setLinks([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/nps/links?pesquisa_id=${selectedPesquisaId}`);
      if (res.ok) {
        const data = await res.json();
        console.log('Links carregados:', data);
        // A API retorna { links: [...] } ou pode retornar o array diretamente
        const linksArray = Array.isArray(data) ? data : (data.links || []);
        setLinks(linksArray);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Erro ao buscar links:', res.statusText, errorData);
        setLinks([]);
      }
    } catch (err) {
      console.error('Erro ao buscar links:', err);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal
  const handleNew = () => {
    setFormData({
      pesquisa_id: selectedPesquisaId || '',
      tipo: 'unidade',
      selectedCompanies: [],
      selectedEmployees: []
    });
    setModalStep(1);
    setShowModal(true);
  };

  // Gerar links
  const handleGenerate = async () => {
    setSaving(true);
    try {
      const linksToCreate: { pesquisa_id: string; company_id?: string; employee_id?: string; tipo: string }[] = [];

      if (formData.tipo === 'unidade') {
        // Um link por unidade
        for (const companyId of formData.selectedCompanies) {
          linksToCreate.push({
            pesquisa_id: formData.pesquisa_id,
            company_id: companyId,
            tipo: 'unidade'
          });
        }
      } else {
        // Um link por garçom
        for (const employeeId of formData.selectedEmployees) {
          const employee = employees.find(e => e.id === employeeId);
          linksToCreate.push({
            pesquisa_id: formData.pesquisa_id,
            company_id: employee?.company_id,
            employee_id: employeeId,
            tipo: 'garcom'
          });
        }
      }

      // Criar links
      for (const linkData of linksToCreate) {
        await fetch('/api/nps/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(linkData)
        });
      }

      setShowModal(false);
      if (formData.pesquisa_id === selectedPesquisaId) {
        fetchLinks();
      } else {
        setSelectedPesquisaId(formData.pesquisa_id);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar links');
    } finally {
      setSaving(false);
    }
  };

  // Copiar URL
  const handleCopy = async (link: NPSLink) => {
    const url = `${baseUrl}/nps/${link.hash_link}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle ativo
  const handleToggleAtivo = async (link: NPSLink) => {
    try {
      const res = await fetch('/api/nps/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: link.id, ativo: !link.ativo })
      });

      if (res.ok) {
        fetchLinks();
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  // Excluir link
  const handleDelete = async (link: NPSLink) => {
    const msg = link.total_respostas > 0
      ? `Este link tem ${link.total_respostas} respostas. Ele será desativado. Continuar?`
      : 'Tem certeza que deseja excluir este link?';

    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/nps/links?id=${link.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchLinks();
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  // Gerar URL do QR code (usando API pública)
  const getQRCodeUrl = (hash: string) => {
    const url = encodeURIComponent(`${baseUrl}/nps/${hash}`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${url}`;
  };

  // Filtrar links
  const filteredLinks = links.filter(l => {
    // Filtro por empresa
    if (selectedCompanyId && l.company?.id !== selectedCompanyId) {
      return false;
    }
    
    // Filtro por funcionário
    if (selectedEmployeeId && l.employee?.id !== selectedEmployeeId) {
      return false;
    }
    
    // Filtro por busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        l.hash_link.toLowerCase().includes(searchLower) ||
        l.company?.name.toLowerCase().includes(searchLower) ||
        l.employee?.name.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Toggle seleção
  const toggleCompany = (id: string) => {
    const selected = formData.selectedCompanies.includes(id)
      ? formData.selectedCompanies.filter(c => c !== id)
      : [...formData.selectedCompanies, id];
    setFormData({ ...formData, selectedCompanies: selected, selectedEmployees: [] });
  };

  const toggleEmployee = (id: string) => {
    const selected = formData.selectedEmployees.includes(id)
      ? formData.selectedEmployees.filter(e => e !== id)
      : [...formData.selectedEmployees, id];
    setFormData({ ...formData, selectedEmployees: selected });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Codes & Links</h1>
          <p className="text-gray-500">Gerencie os links das pesquisas NPS</p>
        </div>
        <button
          onClick={handleNew}
          disabled={!selectedGroupId}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Gerar Links
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
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setSelectedPesquisaId('');
                setSelectedCompanyId('');
                setSelectedEmployeeId('');
              }}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {(groups || []).map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Empresa */}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => {
              setSelectedCompanyId(e.target.value);
              setSelectedEmployeeId('');
            }}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={!selectedGroupId}
          >
            <option value="">Todas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Pesquisa */}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Pesquisa</label>
          <select
            value={selectedPesquisaId}
            onChange={(e) => setSelectedPesquisaId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={!selectedGroupId}
          >
            <option value="">Selecione...</option>
            {pesquisas.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        {/* Funcionário */}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário</label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={!selectedCompanyId}
          >
            <option value="">Todos</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
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
              placeholder="Buscar por unidade ou garçom..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && selectedPesquisaId && (
        <div className="flex justify-center py-12">
          <Loader2 size={40} className="animate-spin text-blue-600" />
        </div>
      )}

      {/* Tabela de Links */}
      {!loading && selectedPesquisaId && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tipo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nome</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Acessos</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Respostas</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">URL</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLinks.length > 0 ? (
                filteredLinks.map((link) => (
                  <tr 
                    key={link.id} 
                    className={`hover:bg-gray-50 transition-colors ${
                      !link.ativo ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Tipo */}
                    <td className="px-6 py-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        link.tipo === 'unidade' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        {link.tipo === 'unidade'
                          ? <Building2 size={20} className="text-blue-600" />
                          : <User size={20} className="text-purple-600" />
                        }
                      </div>
                    </td>

                    {/* Nome */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {link.tipo === 'unidade'
                            ? link.company?.name || 'Unidade'
                            : link.employee?.name || 'Garçom'
                          }
                        </p>
                        {link.tipo === 'garcom' && link.company && (
                          <p className="text-xs text-gray-500">{link.company.name}</p>
                        )}
                      </div>
                    </td>

                    {/* Acessos */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                        <Eye size={16} />
                        <span>{link.total_acessos}</span>
                      </div>
                    </td>

                    {/* Respostas */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                        <MessageSquare size={16} />
                        <span>{link.total_respostas}</span>
                      </div>
                    </td>

                    {/* URL */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 max-w-xs">
                        <LinkIcon size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-600 truncate">
                          /nps/{link.hash_link}
                        </span>
                        <button
                          onClick={() => handleCopy(link)}
                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                          title="Copiar URL"
                        >
                          {copiedId === link.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        link.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {link.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href={`/nps/${link.hash_link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Abrir"
                        >
                          <ExternalLink size={16} />
                        </a>
                        <a
                          href={getQRCodeUrl(link.hash_link)}
                          download={`qrcode-${link.hash_link}.png`}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Baixar QR Code"
                        >
                          <Download size={16} />
                        </a>
                        <button
                          onClick={() => handleToggleAtivo(link)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title={link.ativo ? 'Desativar' : 'Ativar'}
                        >
                          <Power size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(link)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <QrCode size={48} className="text-gray-300 mb-3" />
                      <p className="text-gray-500">
                        {searchTerm ? 'Nenhum link encontrado' : 'Nenhum link gerado'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sem pesquisa selecionada */}
      {!loading && !selectedPesquisaId && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <QrCode size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Selecione um grupo e uma pesquisa para visualizar os links</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Gerar Links</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Step 1: Pesquisa e Tipo */}
              {modalStep === 1 && (
                <>
                  {/* Pesquisa */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Pesquisa *</label>
                    <select
                      value={formData.pesquisa_id}
                      onChange={(e) => setFormData({ ...formData, pesquisa_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {pesquisas.filter(p => p.ativo !== false).map((p) => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tipo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Link *</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo: 'unidade', selectedEmployees: [] })}
                        className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                          formData.tipo === 'unidade'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Building2 size={24} className={formData.tipo === 'unidade' ? 'text-blue-600' : 'text-gray-400'} />
                        <div className="text-left">
                          <p className="font-medium">Por Unidade</p>
                          <p className="text-xs text-gray-500">1 QR code por loja</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo: 'garcom' })}
                        className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                          formData.tipo === 'garcom'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <User size={24} className={formData.tipo === 'garcom' ? 'text-purple-600' : 'text-gray-400'} />
                        <div className="text-left">
                          <p className="font-medium">Por Garçom</p>
                          <p className="text-xs text-gray-500">1 QR code por funcionário</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Seleção */}
              {modalStep === 2 && (
                <>
                  {/* Selecionar Unidades */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Selecionar Unidades {formData.tipo === 'unidade' ? '*' : '(para filtrar garçons)'}
                    </label>
                    <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                      {companies.length > 0 ? (
                        companies.map((company) => (
                          <label
                            key={company.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={formData.selectedCompanies.includes(company.id)}
                              onChange={() => toggleCompany(company.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <Building2 size={18} className="text-gray-400" />
                            <span className="text-sm text-gray-700">{company.name}</span>
                          </label>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          Nenhuma unidade encontrada
                        </div>
                      )}
                    </div>
                    {formData.selectedCompanies.length > 0 && (
                      <p className="text-sm text-blue-600 mt-2">
                        {formData.selectedCompanies.length} unidade(s) selecionada(s)
                      </p>
                    )}
                  </div>

                  {/* Selecionar Garçons (se tipo = garcom) */}
                  {formData.tipo === 'garcom' && formData.selectedCompanies.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Selecionar Garçons *
                      </label>
                      <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                        {employees.length > 0 ? (
                          employees.map((employee) => {
                            const company = companies.find(c => c.id === employee.company_id);
                            return (
                              <label
                                key={employee.id}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.selectedEmployees.includes(employee.id)}
                                  onChange={() => toggleEmployee(employee.id)}
                                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                />
                                <User size={18} className="text-gray-400" />
                                <div>
                                  <span className="text-sm text-gray-700">{employee.name}</span>
                                  {company && (
                                    <span className="text-xs text-gray-500 ml-2">({company.name})</span>
                                  )}
                                </div>
                              </label>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            Nenhum funcionário encontrado nas unidades selecionadas
                          </div>
                        )}
                      </div>
                      {formData.selectedEmployees.length > 0 && (
                        <p className="text-sm text-purple-600 mt-2">
                          {formData.selectedEmployees.length} garçom(s) selecionado(s)
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div>
                {modalStep === 2 && (
                  <button
                    onClick={() => setModalStep(1)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Voltar
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                {modalStep === 1 ? (
                  <button
                    onClick={() => setModalStep(2)}
                    disabled={!formData.pesquisa_id}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    onClick={handleGenerate}
                    disabled={
                      saving ||
                      (formData.tipo === 'unidade' && formData.selectedCompanies.length === 0) ||
                      (formData.tipo === 'garcom' && formData.selectedEmployees.length === 0)
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving && <Loader2 size={18} className="animate-spin" />}
                    Gerar {formData.tipo === 'unidade' 
                      ? `${formData.selectedCompanies.length} Link(s)`
                      : `${formData.selectedEmployees.length} Link(s)`
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
