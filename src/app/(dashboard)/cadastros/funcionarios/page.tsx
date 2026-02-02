'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Search, Upload, User, Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight, GitCompare, Download, FileSpreadsheet, FileUp, Link2, X, Power } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { Employee, Company, CompanyGroup, EmployeeMapping } from '@/types';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 20;

export default function FuncionariosPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    company_id: '',
    name: '',
    code: '',
    email: '',
    phone: '',
    position: '',
    photo_url: ''
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [employeeMappings, setEmployeeMappings] = useState<EmployeeMapping[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);

  // Buscar funcionários
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      let url = '/api/employees?include_inactive=true';
      if (filterCompany) {
        url += `&company_id=${filterCompany}`;
      } else if (filterGroup) {
        url += `&group_id=${filterGroup}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar grupos
  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
    }
  };

  // Buscar empresas
  const fetchCompanies = async (groupId?: string) => {
    try {
      const url = groupId ? `/api/companies?group_id=${groupId}` : '/api/companies';
      const res = await fetch(url);
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (filterGroup) {
      fetchCompanies(filterGroup);
      setFilterCompany('');
    } else {
      fetchCompanies();
    }
  }, [filterGroup]);

  useEffect(() => {
    fetchEmployees();
  }, [filterGroup, filterCompany]);

  // Filtrar funcionários
  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(search.toLowerCase()) ||
    (employee.code && employee.code.toLowerCase().includes(search.toLowerCase())) ||
    (employee.email && employee.email.toLowerCase().includes(search.toLowerCase()))
  );

  // Paginação
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  // Resetar página quando filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterGroup, filterCompany]);

  // Upload de foto
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('employees-photos')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('employees-photos')
        .getPublicUrl(filePath);

      setFormData({ ...formData, photo_url: publicUrl });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da foto');
    } finally {
      setUploading(false);
    }
  };

  // Buscar mapeamentos de um funcionário
  const fetchEmployeeMappings = async (employeeId: string) => {
    try {
      setLoadingMappings(true);
      const res = await fetch(`/api/mappings/employees?employee_id=${employeeId}`);
      if (res.ok) {
        const data = await res.json();
        setEmployeeMappings(data.mappings || []);
      }
    } catch (error) {
      console.error('Erro ao buscar mapeamentos:', error);
    } finally {
      setLoadingMappings(false);
    }
  };

  // Remover mapeamento
  const handleRemoveMapping = async (mappingId: string) => {
    try {
      const res = await fetch(`/api/mappings/employees?id=${mappingId}`, {
        method: 'DELETE'
      });

      if (res.ok && editingEmployee) {
        // Recarregar mapeamentos
        await fetchEmployeeMappings(editingEmployee.id);
      } else {
        alert('Erro ao remover mapeamento');
      }
    } catch (error) {
      console.error('Erro ao remover mapeamento:', error);
      alert('Erro ao remover mapeamento');
    }
  };

  // Abrir modal para criar
  const handleCreate = () => {
    setEditingEmployee(null);
    setEmployeeMappings([]);
    setFormData({
      company_id: filterCompany || '',
      name: '',
      code: '',
      email: '',
      phone: '',
      position: '',
      photo_url: ''
    });
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleEdit = async (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      company_id: employee.company_id,
      name: employee.name,
      code: employee.code || '',
      email: employee.email || '',
      phone: employee.phone || '',
      position: employee.position || '',
      photo_url: employee.photo_url || ''
    });
    setIsModalOpen(true);
    // Buscar mapeamentos do funcionário
    await fetchEmployeeMappings(employee.id);
  };

  // Salvar (criar ou editar)
  const handleSave = async () => {
    if (!formData.company_id || !formData.name) {
      alert('Empresa e nome são obrigatórios');
      return;
    }

    try {
      setSaving(true);
      const url = editingEmployee
        ? `/api/employees/${editingEmployee.id}`
        : '/api/employees';

      const res = await fetch(url, {
        method: editingEmployee ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          code: formData.code || null,
          email: formData.email || null,
          phone: formData.phone || null,
          position: formData.position || null,
          photo_url: formData.photo_url || null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao salvar');
        return;
      }

      setIsModalOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar funcionário');
    } finally {
      setSaving(false);
    }
  };

  // Excluir
  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Deseja excluir o funcionário "${employee.name}"?`)) return;

    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao excluir');
        return;
      }

      fetchEmployees();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir funcionário');
    }
  };

  // Alternar status ativo/inativo
  const handleToggleStatus = async (employee: Employee) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...employee,
          is_active: !employee.is_active
        })
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao alterar status');
        return;
      }

      fetchEmployees();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status');
    }
  };

  // Formatar telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15);
  };

  // Download do modelo de planilha
  const handleDownloadTemplate = () => {
    // Criar dados do modelo
    const headers = ['Empresa', 'Nome', 'Código', 'Email', 'Telefone', 'Cargo'];
    const exampleRow = ['Nome da Empresa', 'João Silva', 'FUNC001', 'joao@empresa.com', '(11) 99999-9999', 'Desenvolvedor'];
    
    // Criar workbook
    const wb = XLSX.utils.book_new();
    
    // Criar worksheet com dados
    const wsData = [headers, exampleRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Ajustar largura das colunas
    const colWidths = [
      { wch: 20 }, // Empresa
      { wch: 25 }, // Nome
      { wch: 15 }, // Código
      { wch: 30 }, // Email
      { wch: 18 }, // Telefone
      { wch: 20 }  // Cargo
    ];
    ws['!cols'] = colWidths;
    
    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Funcionários');
    
    // Gerar arquivo e fazer download
    XLSX.writeFile(wb, 'modelo_importacao_funcionarios.xlsx');
  };

  // Abrir modal de importação
  const handleOpenImport = () => {
    setIsImportModalOpen(true);
  };

  // Processar importação
  const handleImport = async () => {
    const file = importFileInputRef.current?.files?.[0];
    if (!file) {
      alert('Selecione um arquivo para importar');
      return;
    }

    try {
      setImporting(true);
      let dataLines: string[][] = [];

      // Verificar se é XLSX ou CSV
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Processar arquivo Excel
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        dataLines = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
      } else {
        // Processar arquivo CSV
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        dataLines = lines.map(line => line.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
      }

      if (dataLines.length < 2) {
        alert('Arquivo inválido. Deve conter pelo menos o cabeçalho e uma linha de dados.');
        return;
      }

      // Pular cabeçalho
      const rows = dataLines.slice(1);
      const employees = [];

      for (const row of rows) {
        const [companyName, name, code, email, phone, position] = row;
        
        if (!name || !companyName) continue;

        // Buscar empresa pelo nome
        const company = companies.find(c => c.name === companyName);
        if (!company) {
          console.warn(`Empresa não encontrada: ${companyName}`);
          continue;
        }

        employees.push({
          company_id: company.id,
          name: String(name || '').trim(),
          code: code ? String(code).trim() : null,
          email: email ? String(email).trim() : null,
          phone: phone ? String(phone).trim() : null,
          position: position ? String(position).trim() : null
        });
      }

      if (employees.length === 0) {
        alert('Nenhum funcionário válido encontrado no arquivo');
        return;
      }

      // Importar funcionários
      let successCount = 0;
      let errorCount = 0;

      for (const employee of employees) {
        try {
          const res = await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(employee)
          });

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      alert(`${successCount} funcionário(s) importado(s) com sucesso${errorCount > 0 ? `. ${errorCount} erro(s).` : '.'}`);
      setIsImportModalOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error('Erro ao importar:', error);
      alert('Erro ao importar funcionários');
    } finally {
      setImporting(false);
    }
  };

  const groupOptions = groups.map(g => ({ value: g.id, label: g.name }));
  const companyOptions = companies.map(c => ({ value: c.id, label: c.name }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Funcionários</h1>
            <p className="text-gray-500 mt-1">Gerencie os funcionários das empresas</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => router.push('/conciliacao/funcionarios')}>
              <GitCompare size={18} className="mr-2" />
              Conciliação
            </Button>
            <Button onClick={handleCreate}>
              <Plus size={20} className="mr-2" />
              Novo Funcionário
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, código ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="w-48">
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos os grupos</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>
          <div className="w-48">
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!filterGroup && groups.length > 0}
            >
              <option value="">Todas as empresas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <User size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Nenhum funcionário</h2>
            <p className="text-gray-500 mb-4">
              {search || filterGroup || filterCompany
                ? `Nenhum funcionário encontrado para "${search || groups.find(g => g.id === filterGroup)?.name || companies.find(c => c.id === filterCompany)?.name}"`
                : 'Crie seu primeiro funcionário no sistema'
              }
            </p>
            {!search && !filterGroup && !filterCompany && (
              <Button onClick={handleCreate}>
                Criar Funcionário
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Foto</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Código</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cargo</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Empresa</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {employee.photo_url ? (
                        <img
                          src={employee.photo_url}
                          alt={employee.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User size={20} className="text-gray-500" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {employee.code || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{employee.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {employee.position || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{employee.company?.name || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      {employee.is_active ? (
                        <CheckCircle size={20} className="inline text-green-500" />
                      ) : (
                        <XCircle size={20} className="inline text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(employee)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          title={employee.is_active ? 'Desativar funcionário' : 'Ativar funcionário'}
                        >
                          <Power size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(employee)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(employee)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Paginação */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredEmployees.length)} de {filteredEmployees.length} funcionários
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded-lg text-sm ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="text-gray-400">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
            </h2>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
              {/* Foto */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {formData.photo_url ? (
                    <img
                      src={formData.photo_url}
                      alt="Foto"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                      <User size={40} className="text-gray-500" />
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={uploading}
                  >
                    <Upload size={18} className="mr-2" />
                    {uploading ? 'Enviando...' : 'Enviar Foto'}
                  </Button>
                  {formData.photo_url && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, photo_url: '' })}
                      className="ml-2 text-sm text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>

              {/* Empresa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Selecione uma empresa</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>

              {/* Linha 1: Código e Nome */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código/Matrícula</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="Ex: 001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nome completo"
                    required
                  />
                </div>
              </div>

              {/* Linha 2: Email e Telefone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={formatPhone(formData.phone)}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              {/* Cargo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Vendedor"
                />
              </div>

              {/* Conciliações (apenas no modo edição) */}
              {editingEmployee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Link2 size={16} className="text-green-600" />
                      Conciliações ({employeeMappings.length})
                    </div>
                  </label>
                  
                  {loadingMappings ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : employeeMappings.length === 0 ? (
                    <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 text-center">
                      Nenhum funcionário externo vinculado
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {employeeMappings.map((mapping) => (
                        <div
                          key={mapping.id}
                          className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                              <User size={16} className="text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {mapping.external_employee?.name || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Código: {mapping.external_employee?.external_code || mapping.external_employee?.external_id || '-'}
                                {mapping.external_employee?.position && ` • ${mapping.external_employee.position}`}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMapping(mapping.id)}
                            className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                            title="Remover vínculo"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <Button
                  type="submit"
                  isLoading={saving}
                >
                  {editingEmployee ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
        {/* Modal de Importação */}
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="Importar Funcionários"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Selecione um arquivo Excel (XLSX) ou CSV com os funcionários. Use o modelo disponível para garantir o formato correto.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arquivo Excel ou CSV
              </label>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleImport} isLoading={importing}>
                Importar
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }
