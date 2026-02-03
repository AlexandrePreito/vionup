'use client';

import { useState, useEffect } from 'react';
import { Play, Loader2, Clock, Building, Users, Package, ShoppingCart, Wallet, TrendingUp, FolderTree, Settings, Plus, Trash2, CheckCircle, AlertCircle, Calendar, Power, PowerOff, Boxes, Square } from 'lucide-react';
import { Button, Modal, Input, Select } from '@/components/ui';
import { PowerBIConnection, PowerBISyncConfig, PowerBISyncSchedule } from '@/types';
import { toast } from '@/lib/toast';

interface FieldConfig {
  key: string;
  label: string;
  required: boolean;
  placeholder: string;
  isDax?: boolean;
}

interface EntityConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  fields: FieldConfig[];
  supportsIncremental: boolean;
  dateFieldKey?: string;
}

const entityTypeConfig: Record<string, EntityConfig> = {
  companies: {
    label: 'Empresas',
    icon: <Building size={24} />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    supportsIncremental: false,
    fields: [
      { key: 'external_id', label: 'ID/Código *', required: true, placeholder: 'Ex: Codigo' },
      { key: 'name', label: 'Razão Social', required: false, placeholder: 'Ex: RazaoSocial' },
      { key: 'fantasy_name', label: 'Nome Fantasia', required: false, placeholder: 'Ex: Filial' },
      { key: 'cnpj', label: 'CNPJ', required: false, placeholder: 'Ex: CNPJ' },
      { key: 'status', label: 'Status', required: false, placeholder: 'Ex: Status' },
    ]
  },
  employees: {
    label: 'Funcionários',
    icon: <Users size={24} />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    supportsIncremental: false,
    fields: [
      { key: 'external_id', label: 'ID/Código *', required: true, placeholder: 'Ex: Codigo' },
      { key: 'external_company_id', label: 'ID Empresa *', required: true, placeholder: 'Ex: CodigoEmpresa' },
      { key: 'name', label: 'Nome', required: false, placeholder: 'Ex: Nome' },
      { key: 'external_code', label: 'Matrícula', required: false, placeholder: 'Ex: Matricula' },
      { key: 'email', label: 'Email', required: false, placeholder: 'Ex: Email' },
      { key: 'department', label: 'Departamento', required: false, placeholder: 'Ex: Departamento' },
      { key: 'position', label: 'Cargo', required: false, placeholder: 'Ex: Cargo' },
      { key: 'status', label: 'Status', required: false, placeholder: 'Ex: Status' },
    ]
  },
  products: {
    label: 'Produtos',
    icon: <Package size={24} />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    supportsIncremental: false,
    fields: [
      { key: 'external_id', label: 'ID/Código *', required: true, placeholder: 'Ex: Codigo' },
      { key: 'external_company_id', label: 'ID Empresa', required: false, placeholder: 'Ex: CodigoEmpresa' },
      { key: 'name', label: 'Nome', required: false, placeholder: 'Ex: Descricao' },
      { key: 'type', label: 'Tipo', required: false, placeholder: 'Ex: Tipo' },
      { key: 'category', label: 'Categoria', required: false, placeholder: 'Ex: Categoria' },
      { key: 'product_group', label: 'Grupo', required: false, placeholder: 'Ex: Grupo' },
    ]
  },
  sales: {
    label: 'Vendas',
    icon: <ShoppingCart size={24} />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    supportsIncremental: true,
    dateFieldKey: 'sale_date',
    fields: [
      { key: 'external_id', label: 'ID/Código *', required: true, placeholder: 'Ex: IdVenda' },
      { key: 'external_product_id', label: 'ID Produto *', required: true, placeholder: 'Ex: CodigoProduto' },
      { key: 'external_employee_id', label: 'ID Funcionário', required: false, placeholder: 'Ex: CodigoVendedor' },
      { key: 'external_company_id', label: 'ID Empresa *', required: true, placeholder: 'Ex: CodigoEmpresa' },
      { key: 'sale_date', label: 'Data *', required: true, placeholder: 'Ex: DataVenda' },
      { key: 'sale_mode', label: 'Modo', required: false, placeholder: 'Ex: ModoVenda' },
      { key: 'period', label: 'Período', required: false, placeholder: 'Ex: Almoço, Jantar' },
      { key: 'quantity', label: 'Quantidade *', required: true, placeholder: 'Ex: [Quantidades] ou SUM(Qtd)', isDax: true },
      { key: 'total_value', label: 'Valor Total *', required: true, placeholder: 'Ex: [Vendas Valor] ou SUM(Valor)', isDax: true },
      { key: 'cost', label: 'Custo', required: false, placeholder: 'Ex: [CMV] ou SUM(Custo)', isDax: true },
    ]
  },
  cash_flow: {
    label: 'Caixa',
    icon: <Wallet size={24} />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    supportsIncremental: true,
    dateFieldKey: 'transaction_date',
    fields: [
      { key: 'external_id', label: 'ID/Código *', required: true, placeholder: 'Ex: IdMovimentacao' },
      { key: 'external_employee_id', label: 'ID Funcionário', required: false, placeholder: 'Ex: CodigoOperador' },
      { key: 'external_company_id', label: 'ID Empresa', required: false, placeholder: 'Ex: CodigoEmpresa' },
      { key: 'transaction_date', label: 'Data *', required: true, placeholder: 'Ex: DataMovimentacao' },
      { key: 'payment_method', label: 'Meio Pagamento', required: false, placeholder: 'Ex: MeioPagamento' },
      { key: 'transaction_type', label: 'Tipo', required: false, placeholder: 'Ex: Tipo' },
      { key: 'transaction_mode', label: 'Modo', required: false, placeholder: 'Ex: Modo' },
      { key: 'period', label: 'Período', required: false, placeholder: 'Ex: Almoço, Jantar' },
      { key: 'amount', label: 'Valor *', required: true, placeholder: 'Ex: [ValorCaixa] ou SUM(Valor)', isDax: true },
    ]
  },
  cash_flow_statement: {
    label: 'Fluxo de Caixa',
    icon: <TrendingUp size={24} />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    supportsIncremental: true,
    dateFieldKey: 'transaction_date',
    fields: [
      { key: 'category_id', label: 'ID Categoria *', required: true, placeholder: 'Ex: idCategoria' },
      { key: 'external_company_id', label: 'ID Empresa', required: false, placeholder: 'Ex: idEmpresa' },
      { key: 'transaction_date', label: 'Data *', required: true, placeholder: 'Ex: Data' },
      { key: 'amount', label: 'Valor *', required: true, placeholder: 'Ex: [Valor] ou SUM(Valor)', isDax: true },
    ]
  },
  categories: {
    label: 'Categorias',
    icon: <FolderTree size={24} />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    supportsIncremental: false,
    fields: [
      { key: 'external_id', label: 'ID Categoria *', required: true, placeholder: 'Ex: idCategoria' },
      { key: 'layer_01', label: 'Camada 01', required: false, placeholder: 'Ex: Camada01' },
      { key: 'layer_02', label: 'Camada 02', required: false, placeholder: 'Ex: Camada02' },
      { key: 'layer_03', label: 'Camada 03', required: false, placeholder: 'Ex: Camada03' },
      { key: 'layer_04', label: 'Camada 04', required: false, placeholder: 'Ex: Camada04' },
      { key: 'external_company_id', label: 'ID Filial', required: false, placeholder: 'Ex: idFilial' },
    ]
  },
  stock: {
    label: 'Estoque',
    icon: <Boxes size={24} />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    supportsIncremental: false,
    fields: [
      { key: 'external_product_id', label: 'ID Produto *', required: true, placeholder: 'Ex: idProduto' },
      { key: 'product_name', label: 'Nome Produto', required: false, placeholder: 'Ex: nomeProduto' },
      { key: 'product_group', label: 'Grupo', required: false, placeholder: 'Ex: grupo' },
      { key: 'external_company_id', label: 'ID Empresa', required: false, placeholder: 'Ex: idEmpresa' },
      { key: 'unit', label: 'Unidade', required: false, placeholder: 'Ex: und_estq' },
      { key: 'purchase_unit', label: 'UN Compra', required: false, placeholder: 'Ex: und_compra' },
      { key: 'conversion_factor', label: 'Conversão', required: false, placeholder: 'Ex: fator_conversao' },
      { key: 'min_quantity', label: 'Qtd Mínima', required: false, placeholder: 'Ex: qtd_min' },
      { key: 'max_quantity', label: 'Qtd Máxima', required: false, placeholder: 'Ex: qtd_max' },
      { key: 'quantity', label: 'Quantidade *', required: true, placeholder: 'Ex: Quantidade' },
      { key: 'last_cost', label: 'Custo Último', required: false, placeholder: 'Ex: custo_ultimo' },
      { key: 'average_cost', label: 'Custo Médio', required: false, placeholder: 'Ex: custo_medio' },
      { key: 'updated_at_external', label: 'Data Alteração', required: false, placeholder: 'Ex: dt_alt' }
    ]
  }
};

const daysOfWeek = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

export default function PowerBISincronizacaoPage() {
  const [connections, setConnections] = useState<PowerBIConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [configs, setConfigs] = useState<Record<string, PowerBISyncConfig | null>>({
    companies: null,
    employees: null,
    products: null,
    sales: null,
    cash_flow: null,
    cash_flow_statement: null,
    categories: null,
    stock: null
  });
  const [schedules, setSchedules] = useState<Record<string, PowerBISyncSchedule[]>>({
    companies: [],
    employees: [],
    products: [],
    sales: [],
    cash_flow: [],
    cash_flow_statement: [],
    categories: [],
    stock: []
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [datasets, setDatasets] = useState<{ id: string; name: string }[]>([]);

  // Modal de configuração
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingEntityType, setEditingEntityType] = useState<string>('');
  const [configForm, setConfigForm] = useState({
    dataset_id: '',
    table_name: '',
    field_mappings: {} as Record<string, string>,
    // Campos incrementais
    date_field: '',
    initial_date: '',
    incremental_days: 7,
    is_incremental: false
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Modal de agendamento
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleEntityType, setScheduleEntityType] = useState<string>('');
  const [scheduleForm, setScheduleForm] = useState({
    schedule_type: 'daily' as 'daily' | 'weekly',
    day_of_week: 1,
    time_of_day: '08:00'
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Buscar conexões
  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/powerbi/connections');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Resposta não é JSON');
      }
      const data = await res.json();
      const activeConnections = (data.connections || []).filter((c: PowerBIConnection) => c.is_active);
      setConnections(activeConnections);
      if (activeConnections.length > 0 && !selectedConnection) {
        setSelectedConnection(activeConnections[0].id);
      }
    } catch (error) {
      console.error('Erro ao buscar conexões:', error);
    }
  };

  // Buscar datasets
  const fetchDatasets = async (connectionId: string) => {
    if (!connectionId) return;
    try {
      const res = await fetch(`/api/powerbi/connections/${connectionId}/test`, { method: 'POST' });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Resposta não é JSON');
      }
      const data = await res.json();
      if (data.success && data.datasets) {
        setDatasets(data.datasets);
      }
    } catch (error) {
      console.error('Erro ao buscar datasets:', error);
    }
  };

  // Buscar configurações
  const fetchConfigs = async (connectionId: string) => {
    if (!connectionId) return;
    try {
      const res = await fetch(`/api/powerbi/sync-configs?connection_id=${connectionId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Resposta não é JSON');
      }
      const data = await res.json();
      
      const configMap: Record<string, PowerBISyncConfig | null> = {
        companies: null,
        employees: null,
        products: null,
        sales: null,
        cash_flow: null,
        cash_flow_statement: null,
        categories: null,
        stock: null
      };
      
      (data.configs || []).forEach((config: PowerBISyncConfig) => {
        configMap[config.entity_type] = config;
      });
      
      setConfigs(configMap);

      // Buscar agendamentos para cada config
      for (const config of data.configs || []) {
        await fetchSchedules(config.id, config.entity_type);
      }
    } catch (error) {
      console.error('Erro ao buscar configs:', error);
    }
  };

  // Buscar agendamentos
  const fetchSchedules = async (configId: string, entityType: string) => {
    try {
      const res = await fetch(`/api/powerbi/schedules?config_id=${configId}`);
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;
      const data = await res.json();
      setSchedules(prev => ({
        ...prev,
        [entityType]: data.schedules || []
      }));
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchConnections();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedConnection) {
      fetchDatasets(selectedConnection);
      fetchConfigs(selectedConnection);
    }
  }, [selectedConnection]);

  // Gerar Query DAX
  const generateDaxQuery = (tableName: string, fieldMappings: Record<string, string>, entityType: string) => {
    const config = entityTypeConfig[entityType];
    const daxFields = config.fields.filter(f => f.isDax).map(f => f.key);
    const hasDaxFields = daxFields.some(key => fieldMappings[key]?.trim());
    
    // Campos normais (não-DAX) - colunas da tabela
    const normalFieldEntries = Object.entries(fieldMappings)
      .filter(([key, pbiField]) => pbiField.trim() !== '' && !daxFields.includes(key));
    
    const normalFields = normalFieldEntries
      .map(([_, pbiField]) => `"${pbiField}", ${tableName}[${pbiField}]`)
      .join(',\n    ');

    // Campos DAX (medidas/agregações)
    const daxFieldEntries = Object.entries(fieldMappings)
      .filter(([key, pbiField]) => pbiField.trim() !== '' && daxFields.includes(key));

    const daxFieldsStr = daxFieldEntries
      .map(([dbField, pbiField]) => {
        const trimmedField = pbiField.trim();
        
        // Se já é uma medida (começa com [), usa direto
        if (trimmedField.startsWith('[') && trimmedField.endsWith(']')) {
          return `"${dbField}", ${trimmedField}`;
        }
        
        // Se contém colchetes [...], é uma medida DAX - extrair apenas a parte entre colchetes
        if (trimmedField.includes('[') && trimmedField.includes(']')) {
          const bracketMatch = trimmedField.match(/\[([^\]]+)\]/);
          if (bracketMatch) {
            // Extrair apenas o conteúdo entre colchetes
            const measureName = bracketMatch[1];
            console.log(`[DAX] Campo ${dbField}: ${trimmedField} -> [${measureName}]`);
            return `"${dbField}", [${measureName}]`;
          }
          // Se não conseguir extrair, usa o campo original
          console.warn(`[DAX] Não foi possível extrair medida de: ${trimmedField}`);
          return `"${dbField}", ${trimmedField}`;
        }
        
        // Se é uma expressão DAX (contém parênteses), usa direto
        if (trimmedField.includes('(')) {
          return `"${dbField}", ${trimmedField}`;
        }
        
        // Caso contrário, é uma coluna - aplica SUM
        console.log(`[DAX] Campo ${dbField}: ${trimmedField} -> SUM(${tableName}[${trimmedField}])`);
        return `"${dbField}", SUM(${tableName}[${trimmedField}])`;
      })
      .join(',\n    ');

    if (!normalFields && !daxFieldsStr) return '';

    // Se tem campos DAX, usa SUMMARIZECOLUMNS para agrupar
    if (hasDaxFields && (entityType === 'sales' || entityType === 'cash_flow' || entityType === 'cash_flow_statement')) {
      const groupByFields = normalFieldEntries
        .map(([_, pbiField]) => `${tableName}[${pbiField}]`)
        .join(',\n    ');

      // Encontrar primeiro campo DAX obrigatório para filtro NOT ISBLANK
      const firstRequiredDaxField = daxFieldEntries.find(([key]) => 
        config.fields.find(f => f.key === key)?.required
      );
      const filterField = firstRequiredDaxField ? firstRequiredDaxField[0] : daxFieldEntries[0]?.[0] || 'amount';

      return `EVALUATE
FILTER(
  SUMMARIZECOLUMNS(
    ${groupByFields},
    ${daxFieldsStr}
  ),
  NOT ISBLANK([${filterField}])
)`;
    }

    // Query simples para cadastros
    const allFields = [normalFields, daxFieldsStr].filter(Boolean).join(',\n    ');
    return `EVALUATE
SELECTCOLUMNS(
    ${tableName},
    ${allFields}
)`;
  };

  // Gerar mapeamento de campos
  const generateFieldMapping = (fieldMappings: Record<string, string>, entityType: string) => {
    const config = entityTypeConfig[entityType];
    const daxFields = config.fields.filter(f => f.isDax).map(f => f.key);
    
    const mapping: Record<string, string> = {};
    Object.entries(fieldMappings)
      .filter(([_, pbiField]) => pbiField.trim() !== '')
      .forEach(([dbField, pbiField]) => {
        // Para campos DAX que são medidas (começam com [) ou expressões
        if (daxFields.includes(dbField) && (pbiField.startsWith('[') || pbiField.includes('('))) {
          mapping[pbiField] = dbField;
        } else {
          mapping[pbiField] = dbField;
        }
      });
    return mapping;
  };

  // Abrir modal de configuração
  const openConfigModal = (entityType: string) => {
    setEditingEntityType(entityType);
    const existingConfig = configs[entityType];
    const entityConfig = entityTypeConfig[entityType];
    
    if (existingConfig) {
      // Inverter mapeamento para exibir no form
      const invertedMapping: Record<string, string> = {};
      Object.entries(existingConfig.field_mapping).forEach(([pbiField, dbField]) => {
        invertedMapping[dbField as string] = pbiField;
      });
      
      // Extrair nome da tabela da query
      const tableMatch = existingConfig.dax_query.match(/(?:SELECTCOLUMNS|SUMMARIZECOLUMNS)\(\s*(\w+)[\[,]/);
      
      setConfigForm({
        dataset_id: existingConfig.dataset_id,
        table_name: tableMatch ? tableMatch[1] : '',
        field_mappings: invertedMapping,
        date_field: existingConfig.date_field || '',
        initial_date: existingConfig.initial_date || '',
        incremental_days: existingConfig.incremental_days || 7,
        is_incremental: existingConfig.is_incremental || false
      });
    } else {
      setConfigForm({
        dataset_id: '',
        table_name: '',
        field_mappings: {},
        date_field: '',
        initial_date: '',
        incremental_days: 7,
        is_incremental: entityConfig.supportsIncremental
      });
    }
    
    setIsConfigModalOpen(true);
  };

  // Salvar configuração
  const saveConfig = async () => {
    const entityConfig = entityTypeConfig[editingEntityType];
    const requiredFields = entityConfig.fields.filter(f => f.required).map(f => f.key);
    
    const missingFields = requiredFields.filter(key => !configForm.field_mappings[key]?.trim());
    if (!configForm.dataset_id || !configForm.table_name || missingFields.length > 0) {
      const missingLabels = missingFields.map(key => 
        entityConfig.fields.find(f => f.key === key)?.label || key
      );
      toast.warning(`Preencha: Dataset, Nome da Tabela e campos: ${missingLabels.join(', ')}`);
      return;
    }

    // Validar campos incrementais se habilitado
    if (configForm.is_incremental) {
      if (!configForm.date_field) {
        toast.warning('Para sincronização incremental, informe o campo de data');
        return;
      }
      if (!configForm.initial_date) {
        toast.warning('Para sincronização incremental, informe a data inicial');
        return;
      }
    }

    setSavingConfig(true);
    try {
      const existingConfig = configs[editingEntityType];
      const url = existingConfig 
        ? `/api/powerbi/sync-configs/${existingConfig.id}`
        : '/api/powerbi/sync-configs';
      const method = existingConfig ? 'PUT' : 'POST';

      const daxQuery = generateDaxQuery(configForm.table_name, configForm.field_mappings, editingEntityType);
      const fieldMapping = generateFieldMapping(configForm.field_mappings, editingEntityType);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_id: selectedConnection,
          entity_type: editingEntityType,
          dataset_id: configForm.dataset_id,
          dax_query: daxQuery,
          field_mapping: fieldMapping,
          is_active: true,
          sync_interval_minutes: 60,
          // Campos incrementais
          date_field: configForm.is_incremental ? configForm.date_field : null,
          initial_date: configForm.is_incremental ? configForm.initial_date : null,
          incremental_days: configForm.incremental_days,
          is_incremental: configForm.is_incremental
        })
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao salvar');
        return;
      }

      toast.success('Configuração salva com sucesso!');
      setIsConfigModalOpen(false);
      fetchConfigs(selectedConnection);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSavingConfig(false);
    }
  };

  // Executar sincronização
  const handleSync = async (entityType: string, forceFullSync: boolean = false) => {
    const config = configs[entityType];
    if (!config) return;

    // Criar AbortController para permitir cancelamento
    const controller = new AbortController();
    setAbortController(controller);
    setSyncing(entityType);
    
    try {
      const res = await fetch('/api/powerbi/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          config_id: config.id,
          force_full_sync: forceFullSync
        }),
        signal: controller.signal
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(`Erro: ${data.error}`);
      } else {
        const syncTypeLabel = data.sync_type === 'incremental' ? '(incremental)' : 
                             data.sync_type === 'initial' ? '(inicial)' : '(completa)';
        toast.success(`${data.records_synced} registros sincronizados ${syncTypeLabel}!`);
      }
      fetchConfigs(selectedConnection);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Sincronização cancelada pelo usuário');
        toast.info('Sincronização cancelada');
      } else {
        console.error('Erro:', error);
        toast.error('Erro na sincronização');
      }
    } finally {
      setSyncing(null);
      setAbortController(null);
    }
  };

  // Cancelar sincronização
  const handleStopSync = () => {
    if (abortController) {
      abortController.abort();
      setSyncing(null);
      setAbortController(null);
    }
  };

  // Abrir modal de agendamento
  const openScheduleModal = (entityType: string) => {
    setScheduleEntityType(entityType);
    setScheduleForm({
      schedule_type: 'daily',
      day_of_week: 1,
      time_of_day: '08:00'
    });
    setIsScheduleModalOpen(true);
  };

  // Salvar agendamento
  const saveSchedule = async () => {
    const config = configs[scheduleEntityType];
    if (!config) return;

    setSavingSchedule(true);
    try {
      const res = await fetch('/api/powerbi/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sync_config_id: config.id,
          schedule_type: scheduleForm.schedule_type,
          day_of_week: scheduleForm.schedule_type === 'weekly' ? scheduleForm.day_of_week : null,
          time_of_day: scheduleForm.time_of_day
        })
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao salvar');
        return;
      }

      toast.success('Agendamento salvo com sucesso!');
      setIsScheduleModalOpen(false);
      fetchSchedules(config.id, scheduleEntityType);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar agendamento');
    } finally {
      setSavingSchedule(false);
    }
  };

  // Excluir agendamento
  const deleteSchedule = async (scheduleId: string, entityType: string) => {
    if (!confirm('Excluir este agendamento?')) return;

    try {
      await fetch(`/api/powerbi/schedules/${scheduleId}`, { method: 'DELETE' });
      const config = configs[entityType];
      if (config) {
        fetchSchedules(config.id, entityType);
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  // Ativar/Desativar configuração
  const toggleConfigActive = async (entityType: string) => {
    const config = configs[entityType];
    if (!config) return;

    const newActiveState = !config.is_active;

    try {
      const res = await fetch(`/api/powerbi/sync-configs/${config.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActiveState })
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao atualizar');
        return;
      }

      toast.success(`Configuração ${newActiveState ? 'ativada' : 'desativada'} com sucesso!`);
      fetchConfigs(selectedConnection);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  // Excluir configuração
  const deleteConfig = async (entityType: string) => {
    const config = configs[entityType];
    if (!config) return;

    if (!confirm(`Tem certeza que deseja excluir a configuração de ${entityTypeConfig[entityType]?.label}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/powerbi/sync-configs/${config.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao excluir');
        return;
      }

      toast.success('Configuração excluída com sucesso!');
      fetchConfigs(selectedConnection);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir configuração');
    }
  };

  const connectionOptions = connections.map(c => ({ value: c.id, label: c.name }));
  const datasetOptions = datasets.map(d => ({ value: d.id, label: d.name }));

  const formatSchedule = (schedule: PowerBISyncSchedule) => {
    const time = schedule.time_of_day.slice(0, 5);
    if (schedule.schedule_type === 'daily') {
      return `Diário às ${time}`;
    }
    const day = daysOfWeek.find(d => d.value === schedule.day_of_week)?.label || '';
    return `${day} às ${time}`;
  };

  const currentEntityConfig = entityTypeConfig[editingEntityType];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sincronização Power BI</h1>
          <p className="text-gray-600">Configure a importação de dados do Power BI</p>
        </div>
        <div className="w-64">
          <Select
            options={connectionOptions}
            value={selectedConnection}
            onChange={(e) => setSelectedConnection(e.target.value)}
            placeholder="Selecione a conexão"
          />
        </div>
      </div>

      {connections.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conexão ativa</h3>
          <p className="text-gray-500 mb-4">Configure uma conexão Power BI primeiro</p>
          <Button onClick={() => window.location.href = '/powerbi/conexoes'}>
            Ir para Conexões
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dataset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Sync</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registros</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agendamentos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(entityTypeConfig).map(([entityType, config]) => {
                const syncConfig = configs[entityType];
                const entitySchedules = schedules[entityType] || [];
                const isConfigured = !!syncConfig;
                const isSyncing = syncing === entityType;

                return (
                  <tr
                    key={entityType}
                    className="hover:bg-blue-50 transition-colors"
                  >
                    {/* Tipo */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="text-blue-600">
                          {config.icon}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{config.label}</div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isConfigured ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="text-green-500" size={20} />
                          <span className="text-sm text-gray-600">Configurado</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Não configurado</span>
                      )}
                    </td>

                    {/* Dataset */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {isConfigured ? (
                          datasets.find(d => d.id === syncConfig?.dataset_id)?.name || 'N/A'
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>

                    {/* Última Sync */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {syncConfig?.last_sync_at ? (
                          new Date(syncConfig.last_sync_at).toLocaleString('pt-BR')
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>

                    {/* Registros */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {syncConfig?.last_sync_count !== undefined ? (
                          syncConfig.last_sync_count.toLocaleString('pt-BR')
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>

                    {/* Agendamentos */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {entitySchedules.length === 0 ? (
                          <span className="text-xs text-gray-400">Nenhum</span>
                        ) : (
                          entitySchedules.map((schedule) => (
                            <div
                              key={schedule.id}
                              className="flex items-center justify-between text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                            >
                              <div className="flex items-center gap-1.5">
                                <Clock size={12} />
                                <span>{formatSchedule(schedule)}</span>
                              </div>
                              <button
                                onClick={() => deleteSchedule(schedule.id, entityType)}
                                className="text-red-500 hover:text-red-600 ml-2"
                                title="Excluir agendamento"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))
                        )}
                        {isConfigured && (
                          <button
                            onClick={() => openScheduleModal(entityType)}
                            className="text-blue-600 hover:text-blue-700 text-xs mt-1 flex items-center gap-1"
                            title="Adicionar agendamento"
                          >
                            <Plus size={14} />
                            <span>Adicionar</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 justify-end">
                        {isConfigured ? (
                          <>
                            {/* Badge incremental */}
                            {syncConfig?.is_incremental && (
                              <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                <Calendar size={12} />
                                {syncConfig.incremental_days}d
                              </span>
                            )}
                            
                            {/* Botão Sincronizar (verde, só ícone) ou Stop (vermelho) */}
                            {isSyncing ? (
                              <button
                                onClick={handleStopSync}
                                className="text-red-600 hover:text-red-700 transition-colors"
                                title="Parar sincronização"
                              >
                                <Square size={18} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSync(entityType, false)}
                                disabled={!syncConfig?.is_active}
                                className="text-green-600 hover:text-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Sincronizar"
                              >
                                <Play size={18} />
                              </button>
                            )}

                            {/* Botão Forçar Sync Completa (azul, só ícone) */}
                            {syncConfig?.is_incremental && (
                              <button
                                onClick={() => handleSync(entityType, true)}
                                disabled={isSyncing || !syncConfig?.is_active}
                                className="text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Forçar sincronização completa"
                              >
                                <Play size={18} />
                              </button>
                            )}

                            {/* Botão Ativar/Desativar */}
                            <button
                              onClick={() => toggleConfigActive(entityType)}
                              className="text-gray-600 hover:text-gray-700 transition-colors"
                              title={syncConfig?.is_active ? 'Desativar' : 'Ativar'}
                            >
                              {syncConfig?.is_active ? (
                                <Power size={18} />
                              ) : (
                                <PowerOff size={18} />
                              )}
                            </button>

                            {/* Botão Configurar */}
                            <button
                              onClick={() => openConfigModal(entityType)}
                              className="text-gray-600 hover:text-gray-700 transition-colors"
                              title="Configurar"
                            >
                              <Settings size={18} />
                            </button>

                            {/* Botão Excluir */}
                            <button
                              onClick={() => deleteConfig(entityType)}
                              className="text-gray-600 hover:text-gray-700 transition-colors"
                              title="Excluir configuração"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openConfigModal(entityType)}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                          >
                            <Settings size={16} />
                            <span>Configurar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Configuração */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title={`Configurar ${currentEntityConfig?.label || ''}`}
        size="xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <Select
            label="Dataset *"
            options={datasetOptions}
            value={configForm.dataset_id}
            onChange={(e) => setConfigForm({ ...configForm, dataset_id: e.target.value })}
            placeholder="Selecione o dataset"
          />

          <Input
            label="Nome da Tabela no Power BI *"
            value={configForm.table_name}
            onChange={(e) => setConfigForm({ ...configForm, table_name: e.target.value })}
            placeholder="Ex: Empresa, Funcionario, Produto, Vendas, Caixa"
          />

          {/* Mapeamento de Campos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mapeamento de Campos
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Digite o nome da coluna no Power BI. Campos com 📊 aceitam medidas ou expressões DAX.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {currentEntityConfig?.fields.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="w-1/3">
                    <span className={`text-sm ${field.required ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      {field.label} {field.isDax && '📊'}
                    </span>
                  </div>
                  <div className="w-2/3">
                    <input
                      type="text"
                      value={configForm.field_mappings[field.key] || ''}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        field_mappings: { ...configForm.field_mappings, [field.key]: e.target.value }
                      })}
                      placeholder={field.placeholder}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        field.required && !configForm.field_mappings[field.key]
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      } ${field.isDax ? 'font-mono text-xs' : ''}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configuração Incremental */}
          {currentEntityConfig?.supportsIncremental && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="is_incremental"
                  checked={configForm.is_incremental}
                  onChange={(e) => setConfigForm({ ...configForm, is_incremental: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="is_incremental" className="text-sm font-medium text-gray-700">
                  Sincronização Incremental
                </label>
              </div>

              {configForm.is_incremental && (
                <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                  <p className="text-xs text-blue-700">
                    A primeira sincronização importará dados a partir da data inicial. 
                    As próximas sincronizações importarão apenas os últimos X dias.
                  </p>

                  <Input
                    label="Campo de Data no Power BI *"
                    value={configForm.date_field}
                    onChange={(e) => setConfigForm({ ...configForm, date_field: e.target.value })}
                    placeholder="Ex: DataVenda, DataMovimentacao"
                  />

                  <Input
                    label="Data Inicial *"
                    type="date"
                    value={configForm.initial_date}
                    onChange={(e) => setConfigForm({ ...configForm, initial_date: e.target.value })}
                  />

                  <Input
                    label="Dias para Atualização Incremental"
                    type="number"
                    value={configForm.incremental_days}
                    onChange={(e) => setConfigForm({ ...configForm, incremental_days: parseInt(e.target.value) || 7 })}
                    min={1}
                    max={365}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={() => setIsConfigModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveConfig} isLoading={savingConfig}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Agendamento */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title={`Agendar ${entityTypeConfig[scheduleEntityType]?.label || ''}`}
      >
        <div className="space-y-4">
          <Select
            label="Frequência"
            options={[
              { value: 'daily', label: 'Diário' },
              { value: 'weekly', label: 'Semanal' }
            ]}
            value={scheduleForm.schedule_type}
            onChange={(e) => setScheduleForm({ ...scheduleForm, schedule_type: e.target.value as 'daily' | 'weekly' })}
          />

          {scheduleForm.schedule_type === 'weekly' && (
            <Select
              label="Dia da Semana"
              options={daysOfWeek.map(d => ({ value: String(d.value), label: d.label }))}
              value={String(scheduleForm.day_of_week)}
              onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: parseInt(e.target.value) })}
            />
          )}

          <Input
            label="Horário"
            type="time"
            value={scheduleForm.time_of_day}
            onChange={(e) => setScheduleForm({ ...scheduleForm, time_of_day: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={() => setIsScheduleModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveSchedule} isLoading={savingSchedule}>
              Adicionar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}