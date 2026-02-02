'use client';

import { useState, useEffect, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Link2, Unlink, User, GripVertical, Check, X, Filter, ChevronDown, Plus } from 'lucide-react';
import { Button, Select, Modal, Input } from '@/components/ui';
import { Employee, ExternalEmployee, EmployeeMapping, CompanyGroup, Company, CompanyMapping, ExternalCompany } from '@/types';

export default function ConciliacaoFuncionariosPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filterCompany, setFilterCompany] = useState('');
  const [searchCompany, setSearchCompany] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [externalEmployees, setExternalEmployees] = useState<ExternalEmployee[]>([]);
  const [mappings, setMappings] = useState<EmployeeMapping[]>([]);
  const [companyMappings, setCompanyMappings] = useState<CompanyMapping[]>([]);
  const [externalCompanies, setExternalCompanies] = useState<ExternalCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInternal, setSearchInternal] = useState('');
  const [searchExternal, setSearchExternal] = useState('');
  
  // Drag and Drop
  const [draggedEmployee, setDraggedEmployee] = useState<ExternalEmployee | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  
  // Filtros
  const [filterInternal, setFilterInternal] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [filterExternal, setFilterExternal] = useState<'all' | 'mapped' | 'unmapped'>('all');
  
  // Paginação
  const ITEMS_PER_PAGE = 20;
  const [currentPageInternal, setCurrentPageInternal] = useState(1);
  const [currentPageExternal, setCurrentPageExternal] = useState(1);

  // Modal para adicionar funcionário
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [selectedExternalEmployee, setSelectedExternalEmployee] = useState<ExternalEmployee | null>(null);
  const [newEmployeeForm, setNewEmployeeForm] = useState({
    company_id: '',
    name: '',
    code: '',
    email: '',
    phone: '',
    position: ''
  });
  const [creatingEmployee, setCreatingEmployee] = useState(false);

  // Buscar grupos
  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      if (!res.ok) {
        console.error('Erro ao buscar grupos:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      setGroups(data.groups || []);
      if (data.groups?.length > 0) {
        setSelectedGroup(data.groups[0].id);
      }
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
    }
  };

  // Buscar empresas
  const fetchCompanies = async (groupId: string) => {
    try {
      const res = await fetch(`/api/companies?group_id=${groupId}`);
      if (!res.ok) {
        console.error('Erro ao buscar empresas:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    }
  };

  // Buscar funcionários internos
  const fetchEmployees = async (groupId: string, companyId?: string) => {
    try {
      let url = `/api/employees?include_inactive=true`;
      if (companyId) {
        url += `&company_id=${companyId}`;
      } else if (groupId) {
        url += `&group_id=${groupId}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        console.error('Erro ao buscar funcionários:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
    }
  };

  // Buscar funcionários externos
  const fetchExternalEmployees = async (groupId: string) => {
    try {
      const res = await fetch(`/api/external-employees?group_id=${groupId}`);
      if (!res.ok) {
        console.error('Erro ao buscar funcionários externos:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      setExternalEmployees(data.externalEmployees || []);
    } catch (error) {
      console.error('Erro ao buscar funcionários externos:', error);
    }
  };

  // Buscar mapeamentos de funcionários
  const fetchMappings = async (groupId: string) => {
    try {
      const res = await fetch(`/api/mappings/employees?group_id=${groupId}`);
      if (!res.ok) {
        console.error('Erro ao buscar mapeamentos:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      setMappings(data.mappings || []);
    } catch (error) {
      console.error('Erro ao buscar mapeamentos:', error);
    }
  };

  // Buscar mapeamentos de empresas
  const fetchCompanyMappings = async (groupId: string) => {
    try {
      const res = await fetch(`/api/mappings/companies?group_id=${groupId}`);
      if (!res.ok) {
        console.error('Erro ao buscar mapeamentos de empresas:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      setCompanyMappings(data.mappings || []);
    } catch (error) {
      console.error('Erro ao buscar mapeamentos de empresas:', error);
    }
  };

  // Buscar empresas externas
  const fetchExternalCompanies = async (groupId: string) => {
    try {
      const res = await fetch(`/api/external-companies?group_id=${groupId}`);
      if (!res.ok) {
        console.error('Erro ao buscar empresas externas:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      setExternalCompanies(data.externalCompanies || []);
    } catch (error) {
      console.error('Erro ao buscar empresas externas:', error);
    }
  };

  // Carregar dados quando selecionar grupo
  const loadData = async (groupId: string, companyId?: string) => {
    if (!groupId) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchEmployees(groupId, companyId),
        fetchExternalEmployees(groupId),
        fetchMappings(groupId),
        fetchCompanyMappings(groupId),
        fetchExternalCompanies(groupId)
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchCompanies(selectedGroup);
      setFilterCompany('');
      setSearchCompany('');
      loadData(selectedGroup);
    }
  }, [selectedGroup]);

  // Atualizar campo de busca quando empresa for selecionada via filtro
  useEffect(() => {
    if (filterCompany) {
      const selected = companies.find(c => c.id === filterCompany);
      if (selected) {
        setSearchCompany(selected.name);
      }
    } else {
      setSearchCompany('');
    }
  }, [filterCompany, companies]);

  useEffect(() => {
    if (selectedGroup) {
      fetchEmployees(selectedGroup, filterCompany || undefined);
    }
  }, [filterCompany]);

  // Verificar se funcionário externo está mapeado
  const isExternalMapped = (externalId: string) => {
    return mappings.some(m => m.external_employee_id === externalId);
  };

  // Obter mapeamentos de um funcionário interno
  const getEmployeeMappings = (employeeId: string) => {
    return mappings.filter(m => m.employee_id === employeeId);
  };

  // Obter funcionário externo pelo ID
  const getExternalEmployeeById = (externalId: string) => {
    return externalEmployees.find(e => e.id === externalId);
  };

  // Obter empresa interna pelo external_company_id do funcionário externo
  // O external_company_id no funcionário é o external_id da empresa externa (ex: "01", "81")
  // Precisamos: external_company_id -> external_companies (pelo external_id) -> company_mappings -> companies
  const getInternalCompanyByExternalCompanyId = (externalCompanyIdCode?: string) => {
    if (!externalCompanyIdCode) return null;
    
    // 1. Encontrar a empresa externa pelo código (external_id ou external_code)
    const externalCompany = externalCompanies.find(
      ec => ec.external_id === externalCompanyIdCode || ec.external_code === externalCompanyIdCode
    );
    if (!externalCompany) return null;
    
    // 2. Encontrar o mapeamento usando o UUID da empresa externa
    const mapping = companyMappings.find(m => m.external_company_id === externalCompany.id);
    if (!mapping) return null;
    
    // 3. Retornar a empresa interna
    return companies.find(c => c.id === mapping.company_id);
  };

  // Criar mapeamento via drag and drop
  const handleCreateMapping = async (employeeId: string, externalEmployeeId: string) => {
    if (!selectedGroup) return;

    try {
      const res = await fetch('/api/mappings/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_group_id: selectedGroup,
          employee_id: employeeId,
          external_employee_id: externalEmployeeId
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao criar mapeamento');
        return;
      }

      await fetchMappings(selectedGroup);
    } catch (error) {
      console.error('Erro ao criar mapeamento:', error);
      alert('Erro ao criar mapeamento');
    }
  };

  // Remover mapeamento
  const handleRemoveMapping = async (mappingId: string) => {
    try {
      const res = await fetch(`/api/mappings/employees?id=${mappingId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        alert('Erro ao remover mapeamento');
        return;
      }

      await fetchMappings(selectedGroup);
    } catch (error) {
      console.error('Erro ao remover mapeamento:', error);
      alert('Erro ao remover mapeamento');
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, employee: ExternalEmployee) => {
    setDraggedEmployee(employee);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', employee.id);
  };

  const handleDragEnd = () => {
    setDraggedEmployee(null);
    setDropTargetId(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, employeeId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetId(employeeId);
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, employeeId: string) => {
    e.preventDefault();
    setDropTargetId(null);
    
    if (draggedEmployee) {
      await handleCreateMapping(employeeId, draggedEmployee.id);
    }
    
    setDraggedEmployee(null);
  };

  // Filtrar funcionários internos
  const filteredEmployees = (employees || []).filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchInternal.toLowerCase()) ||
      employee.code?.toLowerCase().includes(searchInternal.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchInternal.toLowerCase());
    
    if (!matchesSearch) return false;
    
    const hasMappings = getEmployeeMappings(employee.id).length > 0;
    if (filterInternal === 'mapped' && !hasMappings) return false;
    if (filterInternal === 'unmapped' && hasMappings) return false;
    
    return true;
  });

  // Filtrar funcionários externos (não mapeados)
  const filteredExternalEmployees = (externalEmployees || []).filter(employee => {
    const matchesSearch = employee.name?.toLowerCase().includes(searchExternal.toLowerCase()) ||
      employee.external_id?.toLowerCase().includes(searchExternal.toLowerCase()) ||
      employee.external_code?.toLowerCase().includes(searchExternal.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchExternal.toLowerCase());
    
    if (!matchesSearch) return false;
    
    const isMapped = isExternalMapped(employee.id);
    if (filterExternal === 'mapped' && !isMapped) return false;
    if (filterExternal === 'unmapped' && isMapped) return false;
    
    return true;
  });

  // Paginação para funcionários internos
  const totalPagesInternal = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const startIndexInternal = (currentPageInternal - 1) * ITEMS_PER_PAGE;
  const endIndexInternal = startIndexInternal + ITEMS_PER_PAGE;
  const paginatedEmployees = filteredEmployees.slice(startIndexInternal, endIndexInternal);

  // Paginação para funcionários externos
  const totalPagesExternal = Math.ceil(filteredExternalEmployees.length / ITEMS_PER_PAGE);
  const startIndexExternal = (currentPageExternal - 1) * ITEMS_PER_PAGE;
  const endIndexExternal = startIndexExternal + ITEMS_PER_PAGE;
  const paginatedExternalEmployees = filteredExternalEmployees.slice(startIndexExternal, endIndexExternal);

  // Resetar páginas quando filtrar
  useEffect(() => {
    setCurrentPageInternal(1);
  }, [searchInternal, filterInternal]);

  useEffect(() => {
    setCurrentPageExternal(1);
  }, [searchExternal, filterExternal]);

  // Abrir modal para adicionar funcionário
  const handleOpenAddEmployee = (externalEmployee: ExternalEmployee) => {
    setSelectedExternalEmployee(externalEmployee);
    
    // Buscar empresa interna pelo mapeamento
    const internalCompany = getInternalCompanyByExternalCompanyId(externalEmployee.external_company_id);
    
    setNewEmployeeForm({
      company_id: internalCompany?.id || filterCompany || '',
      name: externalEmployee.name || '',
      code: externalEmployee.external_code || externalEmployee.external_id || '',
      email: externalEmployee.email || '',
      phone: '',
      position: externalEmployee.position || ''
    });
    setIsAddEmployeeModalOpen(true);
  };

  // Criar funcionário a partir do externo
  const handleCreateEmployee = async () => {
    if (!newEmployeeForm.company_id || !newEmployeeForm.name) {
      alert('Empresa e nome são obrigatórios');
      return;
    }

    try {
      setCreatingEmployee(true);
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployeeForm)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erro ao criar funcionário');
        return;
      }

      // Criar mapeamento automaticamente se tiver grupo selecionado
      if (selectedGroup && selectedExternalEmployee) {
        try {
          await fetch('/api/mappings/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              company_group_id: selectedGroup,
              employee_id: data.employee.id,
              external_employee_id: selectedExternalEmployee.id
            })
          });
        } catch (error) {
          console.error('Erro ao criar mapeamento:', error);
        }
      }

      alert('Funcionário criado com sucesso!');
      setIsAddEmployeeModalOpen(false);
      setSelectedExternalEmployee(null);
      
      // Recarregar dados
      if (selectedGroup) {
        await loadData(selectedGroup, filterCompany || undefined);
      }
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      alert('Erro ao criar funcionário');
    } finally {
      setCreatingEmployee(false);
    }
  };

  // Estatísticas
  const totalInternal = employees?.length || 0;
  const mappedInternal = employees?.filter(e => getEmployeeMappings(e.id).length > 0).length || 0;
  const totalExternal = externalEmployees?.length || 0;
  const mappedExternal = externalEmployees?.filter(e => isExternalMapped(e.id)).length || 0;

  return (
    <div className="flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conciliação de Funcionários</h1>
          <p className="text-gray-500 text-sm">Arraste os funcionários externos para vincular com os funcionários do sistema</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push('/cadastros/funcionarios')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Funcionários
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-4">
        <div className="w-48">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Selecione o grupo</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 max-w-md relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
          <input
            type="text"
            placeholder={!selectedGroup && groups.length > 0 ? "Selecione um grupo primeiro" : "Buscar empresa..."}
            value={searchCompany}
            onChange={(e) => {
              setSearchCompany(e.target.value);
              if (!e.target.value) {
                setFilterCompany('');
              }
            }}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={!selectedGroup && groups.length > 0}
          />
          {searchCompany && selectedGroup && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {companies
                .filter(c => c.name.toLowerCase().includes(searchCompany.toLowerCase()))
                .map((company) => (
                  <div
                    key={company.id}
                    onClick={() => {
                      setFilterCompany(company.id);
                      setSearchCompany(company.name);
                    }}
                    className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                      filterCompany === company.id ? 'bg-blue-100 font-medium' : ''
                    }`}
                  >
                    {company.name}
                  </div>
                ))}
              {companies.filter(c => c.name.toLowerCase().includes(searchCompany.toLowerCase())).length === 0 && (
                <div className="px-4 py-2 text-gray-500 text-sm">Nenhuma empresa encontrada</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="flex gap-4 mb-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          <span className="text-gray-700 font-medium">{mappedInternal}/{totalInternal}</span>
          <span className="text-gray-600 text-sm ml-2">funcionários vinculados</span>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          <span className="text-gray-700 font-medium">{mappedExternal}/{totalExternal}</span>
          <span className="text-gray-600 text-sm ml-2">externos mapeados</span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
          {/* Lado Esquerdo - Funcionários do Sistema */}
          <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User size={20} className="text-blue-600" />
                  <h2 className="font-semibold text-gray-900">Funcionários do Sistema</h2>
                </div>
                <span className="text-gray-600 text-sm">{filteredEmployees.length} funcionários</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar funcionário..."
                    value={searchInternal}
                    onChange={(e) => setSearchInternal(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterInternal}
                  onChange={(e) => setFilterInternal(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">Todas</option>
                  <option value="mapped">Vinculados</option>
                  <option value="unmapped">Não vinculados</option>
                </select>
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ height: '1200px' }}>
              {paginatedEmployees.map((employee) => {
                const employeeMappings = getEmployeeMappings(employee.id);
                const isDropTarget = dropTargetId === employee.id;
                
                return (
                  <div
                    key={employee.id}
                    onDragOver={(e) => handleDragOver(e, employee.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, employee.id)}
                    className={`rounded-xl border-2 transition-all duration-200 ${
                      isDropTarget 
                        ? 'border-blue-500 scale-[1.02] shadow-lg' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Card do funcionário */}
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        {employee.photo_url ? (
                          <img src={employee.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            employeeMappings.length > 0 ? 'bg-green-100' : 'bg-blue-100'
                          }`}>
                            <User size={20} className={employeeMappings.length > 0 ? 'text-green-600' : 'text-blue-600'} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{employee.name}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {employee.code && (
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
                                {employee.code}
                              </span>
                            )}
                            {employee.email && (
                              <span className="truncate">{employee.email}</span>
                            )}
                          </div>
                        </div>
                        {employeeMappings.length > 0 && (
                          <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                            <Check size={12} />
                            {employeeMappings.length}
                          </div>
                        )}
                      </div>

                      {/* Área de drop / Mapeamentos existentes */}
                      {employeeMappings.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {employeeMappings.map((mapping) => {
                            const extEmployee = getExternalEmployeeById(mapping.external_employee_id);
                            return (
                              <div
                                key={mapping.id}
                                className="flex items-center gap-2 border border-green-200 rounded-lg p-2"
                              >
                                <Link2 size={14} className="text-green-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-green-800 truncate">
                                    {extEmployee?.name || 'N/A'}
                                  </p>
                                  <p className="text-xs text-green-600">
                                    {extEmployee?.external_id || extEmployee?.external_code}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleRemoveMapping(mapping.id)}
                                  className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                                  title="Desvincular"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={`mt-3 border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
                          isDropTarget 
                            ? 'border-blue-400' 
                            : 'border-gray-300'
                        }`}>
                          <p className={`text-sm ${isDropTarget ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                            {isDropTarget ? '✓ Solte aqui para vincular' : 'Arraste um funcionário externo aqui'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginação */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredEmployees.length > 0 ? (
                  <>Mostrando {startIndexInternal + 1} a {Math.min(endIndexInternal, filteredEmployees.length)} de {filteredEmployees.length} funcionários</>
                ) : (
                  <>Nenhum funcionário encontrado</>
                )}
              </div>
              {totalPagesInternal > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPageInternal(prev => Math.max(1, prev - 1))}
                    disabled={currentPageInternal === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPageInternal} de {totalPagesInternal}
                  </span>
                  <button
                    onClick={() => setCurrentPageInternal(prev => Math.min(totalPagesInternal, prev + 1))}
                    disabled={currentPageInternal === totalPagesInternal}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Lado Direito - Funcionários Externos */}
          <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User size={20} className="text-orange-600" />
                  <h2 className="font-semibold text-gray-900">Funcionários (Banco de Dados)</h2>
                </div>
                <span className="text-gray-600 text-sm">{filteredExternalEmployees.length} funcionários</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar funcionário..."
                    value={searchExternal}
                    onChange={(e) => setSearchExternal(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterExternal}
                  onChange={(e) => setFilterExternal(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">Todas</option>
                  <option value="unmapped">Não mapeadas</option>
                  <option value="mapped">Mapeadas</option>
                </select>
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ height: '1200px' }}>
              {paginatedExternalEmployees.map((employee) => {
                const isMapped = isExternalMapped(employee.id);
                const isDragging = draggedEmployee?.id === employee.id;
                const internalCompany = getInternalCompanyByExternalCompanyId(employee.external_company_id);
                
                return (
                  <div
                    key={employee.id}
                    draggable={!isMapped}
                    onDragStart={(e) => handleDragStart(e, employee)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-xl border-2 p-3 transition-all duration-200 ${
                      isMapped 
                        ? 'border-green-200 opacity-60 cursor-not-allowed' 
                        : isDragging
                        ? 'border-blue-500 shadow-lg scale-[1.02] cursor-grabbing'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-md cursor-grab'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {!isMapped && (
                        <div className="text-gray-400 cursor-grab">
                          <GripVertical size={18} />
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isMapped ? 'bg-green-100' : 'bg-orange-100'
                      }`}>
                        {isMapped ? (
                          <Check size={20} className="text-green-600" />
                        ) : (
                          <User size={20} className="text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{employee.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                          {internalCompany && (
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                              {internalCompany.name}
                            </span>
                          )}
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
                            {employee.external_id || employee.external_code}
                          </span>
                          {employee.email && (
                            <span className="truncate">{employee.email}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isMapped && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddEmployee(employee);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Adicionar ao sistema"
                          >
                            <Plus size={18} />
                          </button>
                        )}
                        {isMapped && (
                          <div className="text-green-600">
                            <Link2 size={18} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {paginatedExternalEmployees.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <User size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum funcionário externo</p>
                  <p className="text-sm">Sincronize os dados do Power BI primeiro</p>
                </div>
              )}
            </div>

            {/* Paginação */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredExternalEmployees.length > 0 ? (
                  <>Mostrando {startIndexExternal + 1} a {Math.min(endIndexExternal, filteredExternalEmployees.length)} de {filteredExternalEmployees.length} funcionários</>
                ) : (
                  <>Nenhum funcionário encontrado</>
                )}
              </div>
              {totalPagesExternal > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPageExternal(prev => Math.max(1, prev - 1))}
                    disabled={currentPageExternal === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPageExternal} de {totalPagesExternal}
                  </span>
                  <button
                    onClick={() => setCurrentPageExternal(prev => Math.min(totalPagesExternal, prev + 1))}
                    disabled={currentPageExternal === totalPagesExternal}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dica flutuante quando arrastar */}
      {draggedEmployee && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
          <Link2 size={18} />
          <span>Solte no funcionário do sistema para vincular</span>
        </div>
      )}

      {/* Modal para adicionar funcionário */}
      <Modal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => {
          setIsAddEmployeeModalOpen(false);
          setSelectedExternalEmployee(null);
        }}
        title="Adicionar Funcionário ao Sistema"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Empresa *
            </label>
            <select
              value={newEmployeeForm.company_id}
              onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, company_id: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Selecione a empresa</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome *
            </label>
            <Input
              type="text"
              value={newEmployeeForm.name}
              onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, name: e.target.value })}
              placeholder="Nome do funcionário"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código
            </label>
            <Input
              type="text"
              value={newEmployeeForm.code}
              onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, code: e.target.value })}
              placeholder="Código do funcionário"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <Input
              type="email"
              value={newEmployeeForm.email}
              onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone
            </label>
            <Input
              type="text"
              value={newEmployeeForm.phone}
              onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cargo
            </label>
            <Input
              type="text"
              value={newEmployeeForm.position}
              onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, position: e.target.value })}
              placeholder="Cargo do funcionário"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddEmployeeModalOpen(false);
                setSelectedExternalEmployee(null);
              }}
              disabled={creatingEmployee}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateEmployee}
              isLoading={creatingEmployee}
              disabled={!newEmployeeForm.company_id || !newEmployeeForm.name}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
